import { getAcwrRiskZone } from "../types/index";
import type { AcwrRiskZone } from "../types/index";

export interface AcwrInput {
  date: string;   // ISO date YYYY-MM-DD
  srpe: number;   // session RPE × duration
}

export interface AcwrResult {
  acuteLoad: number;
  chronicLoad: number;
  acwrRatio: number;
  riskZone: AcwrRiskZone;
  /** Days with data in the acute window (0-7) */
  acuteDaysWithData: number;
  /** Days with data in the chronic window (0-28) */
  chronicDaysWithData: number;
  /** True when chronic window has < 7 days — ratio is less reliable */
  insufficientHistory: boolean;
  /** Human-readable caveat for the UI */
  caveat: string | null;
}

/**
 * Safe ACWR calculation with full edge-case protection.
 *
 * Edge cases handled:
 * - Empty sessions array → returns zone "low" with 0 loads, no NaN
 * - 0 chronic load (athlete just started) → ratio = 0, zone = "low"
 * - NaN sRPE values → filtered out before sum
 * - Invalid dates → filtered out (Date.isNaN guard)
 * - Gaps of multiple days → accounted via insufficientHistory flag
 * - Negative sRPE values → clamped to 0 (data entry error)
 *
 * Formula (SMA method — Gabbett 2016):
 *   Acute  = Σ sRPE last 7 days
 *   Chronic = Σ sRPE last 28 days ÷ 4  (weekly average)
 *   ACWR   = Acute / Chronic
 */
export function calculateAcwr(
  sessions: AcwrInput[],
  referenceDate: Date = new Date()
): AcwrResult {
  const DAY_MS = 86_400_000;

  // ── 1. Sanitize inputs ─────────────────────────────────────────
  // Use UTC midnight of the reference date to avoid timezone drift
  const refDay = new Date(referenceDate);
  refDay.setUTCHours(23, 59, 59, 999); // end of reference day
  const refMs = refDay.getTime();

  const clean = sessions.filter((s) => {
    if (!s || !s.date) return false;
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return false;       // invalid date
    if (typeof s.srpe !== "number") return false; // non-numeric sRPE
    if (isNaN(s.srpe)) return false;             // NaN sRPE
    return true;
  }).map((s) => ({
    ...s,
    srpe: Math.max(0, s.srpe), // clamp negative to 0
  }));

  // ── 2. Window filtering ───────────────────────────────────────
  const acuteSessions = clean.filter((s) => {
    const diff = refMs - new Date(s.date).getTime();
    return diff >= 0 && diff < 7 * DAY_MS;
  });

  const chronicSessions = clean.filter((s) => {
    const diff = refMs - new Date(s.date).getTime();
    return diff >= 0 && diff < 28 * DAY_MS;
  });

  // ── 3. Load calculation ───────────────────────────────────────
  const acuteLoad  = acuteSessions.reduce((sum, s) => sum + s.srpe, 0);
  const chronicSum = chronicSessions.reduce((sum, s) => sum + s.srpe, 0);

  // Chronic load = average weekly load = total 28d / 4
  // If no chronic data at all → 0 (athlete just started)
  const chronicLoad = chronicSum / 4;

  // ── 4. ACWR ratio with div-by-zero protection ─────────────────
  let acwrRatio: number;
  if (chronicLoad <= 0) {
    // No chronic baseline yet — cannot compute a meaningful ratio.
    // Return 0 so we stay in "low" zone instead of NaN/Infinity.
    acwrRatio = 0;
  } else {
    acwrRatio = acuteLoad / chronicLoad;
    // Final NaN/Infinity safety net (should never hit, but just in case)
    if (!isFinite(acwrRatio) || isNaN(acwrRatio)) {
      acwrRatio = 0;
    }
  }

  // Round to 4 decimal places to avoid floating-point noise
  acwrRatio = Math.round(acwrRatio * 10_000) / 10_000;

  // ── 5. History quality flags ──────────────────────────────────
  const acuteDaysWithData   = new Set(acuteSessions.map((s) => s.date)).size;
  const chronicDaysWithData = new Set(chronicSessions.map((s) => s.date)).size;

  // Ratio is considered unreliable if chronic window has < 7 days of real data
  const insufficientHistory = chronicDaysWithData < 7;

  let caveat: string | null = null;
  if (chronicDaysWithData === 0) {
    caveat = "Sin historial de carga. Registra al menos 1 semana para ver el ACWR.";
  } else if (chronicDaysWithData < 7) {
    caveat = `Solo ${chronicDaysWithData} día${chronicDaysWithData !== 1 ? "s" : ""} de historial. El ACWR será más preciso tras 4 semanas de registros.`;
  } else if (acuteDaysWithData === 0) {
    caveat = "Sin registros esta semana. El ACWR refleja carga pasada pero no la actual.";
  }

  const riskZone = getAcwrRiskZone(acwrRatio);

  return {
    acuteLoad,
    chronicLoad,
    acwrRatio,
    riskZone,
    acuteDaysWithData,
    chronicDaysWithData,
    insufficientHistory,
    caveat,
  };
}

/**
 * Formats an ACWR ratio for display.
 * Returns "—" for invalid/zero-history scenarios.
 */
export function formatAcwr(ratio: number, insufficientHistory = false): string {
  if (isNaN(ratio) || !isFinite(ratio)) return "—";
  if (insufficientHistory && ratio === 0) return "—";
  return ratio.toFixed(2);
}

/**
 * Validates an RPE value.
 * Borg scale: 6–20 for original, or CR-10: 0–10.
 * Returns a sanitized value and an error message if invalid.
 */
export function validateRpe(
  value: number | string,
  scale: "borg" | "cr10" = "borg"
): { value: number; error: string | null } {
  const [min, max] = scale === "borg" ? [6, 20] : [0, 10];
  const parsed = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(parsed)) {
    return { value: scale === "borg" ? 13 : 5, error: "El RPE debe ser un número." };
  }
  if (parsed < min) {
    return { value: min, error: `El RPE mínimo es ${min}.` };
  }
  if (parsed > max) {
    return { value: max, error: `El RPE máximo es ${max}.` };
  }
  return { value: Math.round(parsed), error: null };
}

/**
 * Validates and sanitizes sRPE.
 * sRPE = RPE × duration. Both must be positive.
 */
export function calculateSrpe(rpe: number, durationMin: number): {
  srpe: number;
  error: string | null;
} {
  const { value: cleanRpe, error: rpeErr } = validateRpe(rpe, "borg");
  if (rpeErr) return { srpe: 0, error: rpeErr };

  if (!durationMin || isNaN(durationMin) || durationMin <= 0) {
    return { srpe: 0, error: "La duración debe ser mayor a 0 minutos." };
  }
  if (durationMin > 480) {
    return { srpe: 0, error: "La duración máxima es 480 minutos (8 horas)." };
  }

  return { srpe: Math.round(cleanRpe * durationMin), error: null };
}
