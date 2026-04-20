/**
 * Vitatekh — Offline Queue
 *
 * Persists critical athlete registrations to AsyncStorage when there is no
 * network connection, then replays them automatically when connectivity is
 * restored.
 *
 * Supported operations:
 *   - "wellness"  → daily_wellness upsert
 *   - "rpe"       → session_rpe upsert
 *   - "pain"      → pain_records insert
 *   - "poms"      → poms_assessments upsert
 *
 * Architecture:
 *   1. Before any Supabase write, call enqueue() to persist locally.
 *   2. After a successful online write, call dequeue(id) to remove from queue.
 *   3. Call flushQueue() on app focus / network reconnect — it replays all
 *      pending items in order and removes those that succeed.
 *   4. Call getPendingCount() to show a badge in the UI.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "./supabase";
import { toast } from "../components/Toast";

// ─── Types ─────────────────────────────────────────────────────────────────

type QueuedOperation =
  | {
      id: string;
      type: "wellness";
      payload: {
        athlete_id: string;
        date: string;
        fatigue: number;
        sleep_hours: number;
        sleep_quality: number;
        mood: number;
      };
      createdAt: string;
      retries: number;
    }
  | {
      id: string;
      type: "rpe";
      payload: {
        session_id: string;
        athlete_id: string;
        rpe: number;
        srpe: number;
      };
      createdAt: string;
      retries: number;
    }
  | {
      id: string;
      type: "pain";
      payload: {
        athlete_id: string;
        date: string;
        body_region: string;
        eva_score: number;
        timing: string;
        pain_type: string;
        limits_performance: boolean;
      };
      createdAt: string;
      retries: number;
    }
  | {
      id: string;
      type: "poms";
      payload: {
        athlete_id: string;
        date: string;
        tension: number;
        depression: number;
        anger: number;
        vigor: number;
        fatigue_poms: number;
        confusion: number;
      };
      createdAt: string;
      retries: number;
    };

const QUEUE_KEY = "vitatekh_offline_queue";
const MAX_RETRIES = 3;

// ─── Internal helpers ───────────────────────────────────────────────────────

async function readQueue(): Promise<QueuedOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Adds an operation to the offline queue.
 * Call this BEFORE attempting the Supabase write.
 * Returns the generated ID so you can dequeue on success.
 */
export async function enqueue(
  type: QueuedOperation["type"],
  payload: QueuedOperation["payload"]
): Promise<string> {
  const queue = await readQueue();
  const id = makeId();
  const item = {
    id,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  } as QueuedOperation;
  await writeQueue([...queue, item]);
  return id;
}

/**
 * Removes a successfully-synced item from the queue.
 */
export async function dequeue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== id));
}

/**
 * Returns how many items are waiting to sync.
 */
export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Executes one queued operation against Supabase.
 * Returns true on success, false on failure.
 */
async function executeOperation(op: QueuedOperation): Promise<boolean> {
  try {
    let error: any = null;

    if (op.type === "wellness") {
      const { error: e } = await supabase
        .from("daily_wellness")
        .upsert(op.payload as any, { onConflict: "athlete_id,date" });
      error = e;
    } else if (op.type === "rpe") {
      const { error: e } = await supabase
        .from("session_rpe")
        .upsert(op.payload as any, { onConflict: "session_id,athlete_id" });
      error = e;
    } else if (op.type === "pain") {
      const { error: e } = await supabase
        .from("pain_records")
        .insert(op.payload as any);
      error = e;
    } else if (op.type === "poms") {
      const { error: e } = await supabase
        .from("poms_assessments")
        .upsert(op.payload as any, { onConflict: "athlete_id,date" });
      error = e;
    }

    return !error;
  } catch {
    return false;
  }
}

/**
 * Replays all pending operations.
 * Should be called when the app comes to foreground or network reconnects.
 *
 * Flow:
 * 1. Check connectivity
 * 2. For each pending item (in order), attempt the Supabase write
 * 3. On success → dequeue
 * 4. On failure → increment retries; remove if > MAX_RETRIES (to avoid stuck queue)
 * 5. Trigger ACWR recalculation for any successfully synced RPE/wellness
 */
export async function flushQueue(athleteId?: string): Promise<{
  synced: number;
  failed: number;
  dropped: number;
}> {
  // Check connectivity first
  const net = await NetInfo.fetch();
  if (!net.isConnected || !net.isInternetReachable) {
    return { synced: 0, failed: 0, dropped: 0 };
  }

  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, dropped: 0 };

  let synced = 0;
  let failed  = 0;
  let dropped = 0;
  const remaining: QueuedOperation[] = [];
  let needsAcwrRecalc = false;

  for (const op of queue) {
    const ok = await executeOperation(op);
    if (ok) {
      synced++;
      if (op.type === "rpe" || op.type === "wellness") {
        needsAcwrRecalc = true;
      }
    } else {
      const updatedRetries = op.retries + 1;
      if (updatedRetries >= MAX_RETRIES) {
        dropped++;
        // Operation permanently failed after MAX_RETRIES — drop it
        // In production, you'd log this to an error monitoring service
      } else {
        failed++;
        remaining.push({ ...op, retries: updatedRetries });
      }
    }
  }

  await writeQueue(remaining);

  // Re-trigger ACWR calculation for synced data
  if (needsAcwrRecalc && athleteId) {
    try {
      await supabase.functions.invoke("calculate-acwr", {
        body: { athlete_id: athleteId },
      });
    } catch {
      // non-critical
    }
  }

  // Notify the user about sync results
  if (synced > 0) {
    toast.success(
      `${synced} registro${synced > 1 ? "s" : ""} sincronizado${synced > 1 ? "s" : ""}`,
      "Los datos guardados sin conexión fueron enviados."
    );
  }
  if (dropped > 0) {
    toast.error(
      `${dropped} registro${dropped > 1 ? "s" : ""} no se pudieron sincronizar`,
      "Revisa tu conexión e intenta de nuevo."
    );
  }

  return { synced, failed, dropped };
}

/**
 * Checks connectivity and returns a boolean.
 * Use to decide whether to attempt direct Supabase write or queue.
 */
export async function isOnline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  return !!(net.isConnected && net.isInternetReachable);
}

/**
 * High-level helper: try to write directly, fall back to queue.
 *
 * Example:
 *   const result = await writeWithFallback("wellness", payload, () =>
 *     supabase.from("daily_wellness").upsert(payload, { onConflict: "athlete_id,date" })
 *   );
 */
export async function writeWithFallback(
  type: QueuedOperation["type"],
  payload: QueuedOperation["payload"],
  supabaseWrite: () => Promise<{ error: any }>
): Promise<{ queued: boolean; error: string | null }> {
  const online = await isOnline();

  if (online) {
    const { error } = await supabaseWrite();
    if (!error) return { queued: false, error: null };
    // If Supabase write fails online, fall through to queue
  }

  // Offline or online-write-failed → queue locally
  await enqueue(type, payload);
  return { queued: true, error: null };
}
