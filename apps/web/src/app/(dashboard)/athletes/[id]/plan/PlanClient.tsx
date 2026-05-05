"use client";

/**
 * PlanClient — Client Component
 *
 * Responsabilidades:
 *   • Gestiona el estado optimista de planned_sessions (add / remove)
 *   • Calcula dayLoads proyectados y los pasa a TrainingPlanner
 *   • Muestra notificaciones Toast al estilo Bodysense
 *   • Maneja errores de red con rollback automático
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { X, CheckCircle2, AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import TrainingPlanner from "@/components/planning/TrainingPlanner";
import type { PlannedSession, DayLoad } from "@/components/planning/TrainingPlanner";
import type { SessionType, SessionPhase } from "@vitatekh/shared";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string;
  sport: string | null;
  email: string | null;
}

interface RawPlannedSession {
  id: string;
  date: string;
  session_type: string;
  phase: string;
  duration_min: number;
  description: string | null;
  rpe_target: number | null;
  srpe_projected: number | null;
}

interface PlanClientProps {
  athleteId:       string;
  teamId:          string;
  profile:         Profile;
  plannedSessions: RawPlannedSession[];
  currentAcwr:     number | null;
  acuteLoad:       number | null;
  chronicLoad:     number | null;
}

// ─── Toast system ─────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "warning";

interface Toast {
  id:      string;
  variant: ToastVariant;
  title:   string;
  message: string;
}

const TOAST_DURATION = 4500; // ms before auto-dismiss

const TOAST_STYLES: Record<
  ToastVariant,
  { border: string; icon: React.ReactNode; glow: string }
> = {
  success: {
    border: "border-[#818cf8]/40",
    glow:   "shadow-[0_0_14px_rgba(129,140,248,0.18)]",
    icon:   <CheckCircle2 size={16} className="text-[#818cf8] shrink-0 mt-0.5" />,
  },
  error: {
    border: "border-[#ef4444]/40",
    glow:   "shadow-[0_0_14px_rgba(239,68,68,0.15)]",
    icon:   <AlertTriangle size={16} className="text-[#ef4444] shrink-0 mt-0.5" />,
  },
  warning: {
    border: "border-[#f59e0b]/40",
    glow:   "shadow-[0_0_14px_rgba(245,158,11,0.15)]",
    icon:   <AlertTriangle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />,
  },
};

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(
    (variant: ToastVariant, title: string, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

// ─── ToastStack component ─────────────────────────────────────────────────────

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notificaciones"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto",
              "flex items-start gap-3",
              "rounded-xl border bg-[#111111]/95 backdrop-blur-md",
              "px-4 py-3",
              "animate-in slide-in-from-right-4 fade-in duration-300",
              style.border,
              style.glow
            )}
          >
            {style.icon}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/80 mb-0.5">
                {toast.title}
              </p>
              <p className="text-[13px] text-white/60 leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── sRPE / ACWR projection helpers ──────────────────────────────────────────

/**
 * Dado un conjunto de sesiones planificadas y las cargas base del atleta,
 * calcula el DayLoad proyectado para cada día con sesiones.
 *
 * Proyección simplificada del ACWR:
 *   acute_projected  = acuteLoad  + (srpe_day / 7)   — añade la carga del día a la media de 7 días
 *   chronic_projected = chronicLoad (no cambia significativamente en 1 día)
 *   acwr_projected   = acute_projected / chronic_projected
 *
 * Esta es una estimación conservadora para dar feedback visual al coach.
 */
function computeDayLoads(
  sessions: PlannedSession[],
  acuteLoad: number | null,
  chronicLoad: number | null
): DayLoad[] {
  // Agrupar sRPE proyectado por fecha
  const srpeByDate = new Map<string, number>();
  for (const s of sessions) {
    if (s.rpe_target != null) {
      const srpe = s.rpe_target * s.duration_min;
      srpeByDate.set(s.date, (srpeByDate.get(s.date) ?? 0) + srpe);
    }
  }

  const dayLoads: DayLoad[] = [];
  const base_acute   = acuteLoad   ?? 0;
  const base_chronic = chronicLoad ?? 1; // evitar división por 0

  for (const [date, srpe] of srpeByDate) {
    // Modelo simplificado de 7-day EWMA
    const acute_projected   = base_acute   + srpe / 7;
    const acwr_projected    =
      base_chronic > 0 ? acute_projected / base_chronic : 0;

    dayLoads.push({ date, srpe_projected: srpe, acwr_projected });
  }

  return dayLoads;
}

// ─── Normalize raw DB row to PlannedSession ───────────────────────────────────

function normalize(raw: RawPlannedSession): PlannedSession {
  return {
    id:           raw.id,
    date:         raw.date,
    session_type: raw.session_type as SessionType,
    phase:        raw.phase as SessionPhase,
    duration_min: raw.duration_min,
    description:  raw.description ?? undefined,
    rpe_target:   raw.rpe_target ?? undefined,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlanClient({
  athleteId,
  teamId,
  profile,
  plannedSessions: initialSessions,
  currentAcwr,
  acuteLoad,
  chronicLoad,
}: PlanClientProps) {
  // ── Supabase browser client ─────────────────────────────────────────────────
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // ── State ───────────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<PlannedSession[]>(
    () => initialSessions.map(normalize)
  );
  const { toasts, push, dismiss } = useToast();

  // ── Projected loads ─────────────────────────────────────────────────────────
  const dayLoads = useMemo(
    () => computeDayLoads(sessions, acuteLoad, chronicLoad),
    [sessions, acuteLoad, chronicLoad]
  );

  // ── handleAddSession ────────────────────────────────────────────────────────
  const handleAddSession = useCallback(
    async (date: string, draft: Omit<PlannedSession, "id" | "date">) => {
      // 1. Optimistic update con ID temporal
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: PlannedSession = { id: tempId, date, ...draft };

      setSessions((prev) => [...prev, optimistic]);

      // 2. Persistir en Supabase
      const { data, error } = await supabase
        .from("planned_sessions")
        .insert({
          athlete_id:   athleteId,
          team_id:      teamId,
          date,
          session_type: draft.session_type,
          phase:        draft.phase,
          duration_min: draft.duration_min,
          description:  draft.description ?? null,
          rpe_target:   draft.rpe_target ?? null,
        })
        .select(
          "id, date, session_type, phase, duration_min, description, rpe_target, srpe_projected"
        )
        .single();

      if (error || !data) {
        // Rollback optimistic update
        setSessions((prev) => prev.filter((s) => s.id !== tempId));

        const isOffline =
          !navigator.onLine || error?.message?.toLowerCase().includes("fetch");

        push(
          "error",
          isOffline ? "Sin conexión" : "Error al guardar",
          isOffline
            ? "Comprueba tu conexión a internet e intenta de nuevo."
            : "No se pudo guardar la sesión. Por favor intenta de nuevo."
        );
        return;
      }

      // 3. Reemplazar ID temporal con el ID real de la BD
      setSessions((prev) =>
        prev.map((s) => (s.id === tempId ? normalize(data) : s))
      );

      push(
        "success",
        "Sesión planificada",
        `${draft.session_type === "match" ? "Partido" : "Entrenamiento"} del ${date} guardado correctamente.`
      );
    },
    [athleteId, teamId, supabase, push]
  );

  // ── handleRemoveSession ─────────────────────────────────────────────────────
  const handleRemoveSession = useCallback(
    async (id: string) => {
      // No eliminar IDs temporales aún no confirmados
      if (id.startsWith("temp-")) return;

      // 1. Snapshot para rollback
      const snapshot = sessions.find((s) => s.id === id);

      // 2. Optimistic delete
      setSessions((prev) => prev.filter((s) => s.id !== id));

      // 3. Persistir en Supabase
      const { error } = await supabase
        .from("planned_sessions")
        .delete()
        .eq("id", id);

      if (error) {
        // Rollback: restaurar sesión eliminada
        if (snapshot) {
          setSessions((prev) => [...prev, snapshot]);
        }

        push(
          "error",
          "Error al eliminar",
          "No se pudo eliminar la sesión. Por favor intenta de nuevo."
        );
        return;
      }

      push("warning", "Sesión eliminada", "La sesión ha sido eliminada del plan.");
    },
    [sessions, supabase, push]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-4 border-b border-white/[0.06]">
        <Link
          href={`/athletes/${athleteId}`}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase",
            "text-white/40 hover:text-[#818cf8] transition-colors"
          )}
        >
          <ChevronLeft size={14} />
          Perfil
        </Link>

        <div className="h-4 w-px bg-white/[0.08]" />

        <div>
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/40 leading-none mb-1">
            Planificación
          </p>
          <p className="text-[15px] font-bold text-white/90 leading-none">
            {profile.full_name}
          </p>
        </div>

        {currentAcwr != null && (
          <div className="ml-auto hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
              ACWR actual
            </span>
            <span
              className={cn(
                "text-[13px] font-bold tabular-nums",
                currentAcwr < 0.8
                  ? "text-[#3B82F6]"
                  : currentAcwr < 1.3
                  ? "text-[#22C55E]"
                  : currentAcwr < 1.5
                  ? "text-[#F59E0B]"
                  : "text-[#EF4444]"
              )}
            >
              {currentAcwr.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ── Planner ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <TrainingPlanner
          sessions={sessions}
          dayLoads={dayLoads}
          currentAcwr={currentAcwr ?? undefined}
          onAddSession={handleAddSession}
          onRemoveSession={handleRemoveSession}
        />
      </div>

      {/* ── Toast notifications ──────────────────────────────────────────────── */}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
