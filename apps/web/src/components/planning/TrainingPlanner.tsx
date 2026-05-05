"use client";

/**
 * TrainingPlanner — Bodysense
 *
 * Weekly session planning grid with projected ACWR load indicators.
 *
 * Layout:
 *   - 7-column grid (Mon–Sun), horizontally scrollable on small screens
 *   - Each day column: impact side-bar + session cards + inline add form
 *   - Impact bar: 4px left strip + proportional fill bar, colour-coded by ACWR zone
 *   - Session cards: coloured left border, uppercase 10px labels, sRPE chip
 *
 * Data model:
 *   - Component is purely presentational; all mutations via callback props
 *   - Parent page handles Supabase queries and passes sessions + dayLoads
 *
 * @example
 * <TrainingPlanner
 *   sessions={sessions}
 *   dayLoads={dayLoads}
 *   currentAcwr={1.12}
 *   onAddSession={(date, draft) => supabase.from("training_sessions").insert(...)}
 *   onRemoveSession={(id) => supabase.from("training_sessions").delete().eq("id", id)}
 * />
 */

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Zap, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACWR_ZONES } from "@vitatekh/shared";
import type { SessionType, SessionPhase, AcwrRiskZone } from "@vitatekh/shared";

// ─── Public types (re-exported for parent page) ───────────────────────────────

export interface PlannedSession {
  id: string;
  date: string;                    // YYYY-MM-DD
  session_type: SessionType;
  phase: SessionPhase;
  duration_min: number;
  description?: string;
  /** Borg scale 6–20 */
  rpe_target?: number;
}

/** Projected workload for a single day, used to drive the ACWR impact bar. */
export interface DayLoad {
  date: string;                    // YYYY-MM-DD
  /** Sum of (rpe_target × duration_min) for all sessions on this day */
  srpe_projected: number;
  /** Projected ACWR if this day's sessions are executed */
  acwr_projected: number;
}

export interface TrainingPlannerProps {
  sessions?: PlannedSession[];
  dayLoads?: DayLoad[];
  /** Latest known ACWR ratio (for contextual reference in legend) */
  currentAcwr?: number;
  onAddSession?: (
    date: string,
    draft: Omit<PlannedSession, "id" | "date">
  ) => void | Promise<void>;
  onRemoveSession?: (id: string) => void | Promise<void>;
}

// ─── Internal draft type ──────────────────────────────────────────────────────

interface DraftSession {
  session_type: SessionType;
  phase: SessionPhase;
  duration_min: number;
  rpe_target: number;
  description: string;
}

const DEFAULT_DRAFT: DraftSession = {
  session_type: "physical",
  phase:        "competition",
  duration_min: 60,
  rpe_target:   13,
  description:  "",
};

// ─── Static config ────────────────────────────────────────────────────────────

const SESSION_TYPE_CONFIG: Record<
  SessionType,
  { label: string; abbr: string; color: string }
> = {
  technical:  { label: "Técnica",       abbr: "TEC", color: "#818cf8" },
  tactical:   { label: "Táctica",       abbr: "TAC", color: "#34d399" },
  physical:   { label: "Física",        abbr: "FIS", color: "#f59e0b" },
  match:      { label: "Partido",       abbr: "PAR", color: "#ef4444" },
  recovery:   { label: "Recuperación",  abbr: "REC", color: "#22d3ee" },
  prevention: { label: "Prevención",    abbr: "PRE", color: "#a78bfa" },
};

const PHASE_LABELS: Record<SessionPhase, string> = {
  preseason:   "Pretemporada",
  competition: "Competición",
  transition:  "Transición",
};

const DAY_NAMES_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"] as const;

// ─── Date utilities ───────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();                        // 0=Sun…6=Sat
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const startStr = start.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
  });
  const endStr = end.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

function isToday(date: Date): boolean {
  return toISODate(date) === toISODate(new Date());
}

// ─── ACWR helpers ─────────────────────────────────────────────────────────────

/**
 * Maps a projected ACWR ratio to the neon colour spectrum:
 * indigo (#818cf8) → green → amber → red
 */
function acwrZoneColor(acwrProjected: number | undefined): string {
  if (acwrProjected === undefined) return "rgba(129,140,248,0.35)";
  if (acwrProjected < 0.8)  return ACWR_ZONES.low.color;       // #3B82F6
  if (acwrProjected < 1.3)  return ACWR_ZONES.optimal.color;   // #22C55E
  if (acwrProjected < 1.5)  return ACWR_ZONES.high.color;      // #F59E0B
  return ACWR_ZONES.very_high.color;                             // #EF4444
}

function acwrZoneLabel(acwrProjected: number | undefined): string {
  if (acwrProjected === undefined) return "Sin proyección";
  if (acwrProjected < 0.8)  return ACWR_ZONES.low.label;
  if (acwrProjected < 1.3)  return ACWR_ZONES.optimal.label;
  if (acwrProjected < 1.5)  return ACWR_ZONES.high.label;
  return ACWR_ZONES.very_high.label;
}

// ─── Sub-component: LoadImpactBar ─────────────────────────────────────────────

interface LoadImpactBarProps {
  srpe: number;
  maxSrpe: number;
  acwr?: number;
}

function LoadImpactBar({ srpe, maxSrpe, acwr }: LoadImpactBarProps) {
  const fillPct  = maxSrpe > 0 ? Math.min((srpe / maxSrpe) * 100, 100) : 0;
  const color    = acwrZoneColor(acwr);
  const label    = acwrZoneLabel(acwr);
  const srpeDisp = srpe > 0 ? `${Math.round(srpe)} UA` : "Descanso";

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {/* Horizontal fill bar */}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
        role="meter"
        aria-valuenow={Math.round(srpe)}
        aria-valuemin={0}
        aria-valuemax={Math.round(maxSrpe)}
        aria-label={`Carga proyectada: ${srpeDisp}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${fillPct}%`, backgroundColor: color }}
        />
      </div>

      {/* sRPE + zone label row */}
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-[9px] font-bold tabular-nums"
          style={{ color }}
        >
          {srpeDisp}
        </span>
        {acwr !== undefined && (
          <span className="text-[9px] text-slate-600 truncate">{label}</span>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: SessionCard ───────────────────────────────────────────────

interface SessionCardProps {
  session: PlannedSession;
  onRemove?: (id: string) => void | Promise<void>;
}

function SessionCard({ session, onRemove }: SessionCardProps) {
  const cfg  = SESSION_TYPE_CONFIG[session.session_type];
  const srpe =
    session.rpe_target != null
      ? Math.round(session.rpe_target * session.duration_min)
      : null;

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-white/[0.09] bg-[#0f0f0f]",
        "overflow-hidden transition-colors hover:border-white/[0.15]"
      )}
      aria-label={`Sesión: ${cfg.label}`}
    >
      {/* Left accent strip — 3px, session type colour */}
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: cfg.color }}
        aria-hidden
      />

      <div className="pl-4 pr-3 pt-3 pb-3 flex flex-col gap-2.5">
        {/* Type + phase header */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span
              className="text-[9px] font-black tracking-[0.16em] uppercase"
              style={{ color: cfg.color }}
            >
              {cfg.abbr}
            </span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {PHASE_LABELS[session.phase]}
            </span>
          </div>

          {/* Remove button — visible on hover */}
          {onRemove && (
            <button
              onClick={() => onRemove(session.id)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                "text-slate-700 opacity-0 transition-all",
                "hover:bg-red-950/60 hover:text-red-400",
                "group-hover:opacity-100",
                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
              )}
              aria-label="Eliminar sesión"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Description */}
        {session.description && (
          <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Data grid: Objetivo / RPE Est. / Volumen */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 border-t border-white/[0.05] pt-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Objetivo
            </span>
            <span className="text-[11px] font-semibold text-slate-200">
              {cfg.label}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              RPE Est.
            </span>
            <span className="text-[11px] font-semibold text-slate-200">
              {session.rpe_target != null ? `${session.rpe_target} Borg` : "—"}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Volumen
            </span>
            <span className="text-[11px] font-semibold text-slate-200">
              {session.duration_min}&thinsp;min
            </span>
          </div>
        </div>

        {/* sRPE chip */}
        {srpe != null && (
          <div className="flex items-center gap-1">
            <Zap size={9} className="text-[#818cf8]" aria-hidden />
            <span className="text-[9px] font-bold text-[#818cf8] tabular-nums">
              sRPE {srpe} UA
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Sub-component: AddSessionForm ────────────────────────────────────────────

interface AddSessionFormProps {
  onSubmit: (draft: DraftSession) => void;
  onCancel: () => void;
}

function AddSessionForm({ onSubmit, onCancel }: AddSessionFormProps) {
  const [draft, setDraft] = useState<DraftSession>(DEFAULT_DRAFT);
  const [busy, setBusy]   = useState(false);

  const srpeProjected = Math.round(draft.rpe_target * draft.duration_min);

  const set = useCallback(
    <K extends keyof DraftSession>(key: K, value: DraftSession[K]) =>
      setDraft((prev) => ({ ...prev, [key]: value })),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSubmit(draft);
    setBusy(false);
  }

  const inputCls = cn(
    "w-full rounded-lg border border-white/[0.09] bg-black/40",
    "px-2.5 py-1.5 text-[12px] text-slate-100",
    "focus:border-[#818cf8] focus:outline-none focus:ring-1 focus:ring-[#818cf8]/20",
    "transition-all duration-150"
  );

  const labelCls =
    "text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600 mb-0.5";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-xl border border-[#818cf8]/30 bg-[#0a0a0f]",
        "p-3 flex flex-col gap-3"
      )}
      aria-label="Nueva sesión"
    >
      {/* Form header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#818cf8]">
          Nueva Sesión
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-0.5 text-slate-600 hover:text-slate-300 transition-colors"
          aria-label="Cancelar"
        >
          <X size={12} />
        </button>
      </div>

      {/* Tipo + Fase */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <label className={labelCls}>Tipo</label>
          <select
            value={draft.session_type}
            onChange={(e) => set("session_type", e.target.value as SessionType)}
            className={inputCls}
          >
            {Object.entries(SESSION_TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className={labelCls}>Fase</label>
          <select
            value={draft.phase}
            onChange={(e) => set("phase", e.target.value as SessionPhase)}
            className={inputCls}
          >
            {Object.entries(PHASE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Duración */}
      <div className="flex flex-col">
        <label className={labelCls}>Duración (min)</label>
        <input
          type="number"
          min={15}
          max={300}
          step={15}
          value={draft.duration_min}
          onChange={(e) => set("duration_min", Math.max(15, Number(e.target.value)))}
          className={inputCls}
        />
      </div>

      {/* RPE Objetivo */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className={labelCls}>RPE Objetivo (Borg)</label>
          <span className="text-[10px] font-bold text-slate-300">
            {draft.rpe_target}
          </span>
        </div>
        <input
          type="range"
          min={6}
          max={20}
          step={1}
          value={draft.rpe_target}
          onChange={(e) => set("rpe_target", Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-[#818cf8]"
          aria-label={`RPE: ${draft.rpe_target}`}
        />
        <div className="flex justify-between text-[8px] text-slate-700">
          <span>6 — Muy suave</span>
          <span>20 — Máximo</span>
        </div>
      </div>

      {/* Descripción */}
      <div className="flex flex-col">
        <label className={labelCls}>Descripción (opcional)</label>
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="Ej. Trabajo de presión y pase corto"
          className={cn(inputCls, "resize-none placeholder-slate-700")}
        />
      </div>

      {/* sRPE preview */}
      <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
        <Zap size={10} className="text-[#818cf8]" aria-hidden />
        <span className="text-[10px] text-slate-500">sRPE proyectado:</span>
        <span className="text-[10px] font-bold text-[#818cf8] tabular-nums">
          {srpeProjected} UA
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex-1 rounded-lg border border-white/[0.09] py-2",
            "text-[11px] font-semibold text-slate-500",
            "hover:border-white/[0.15] hover:text-slate-300 transition-colors"
          )}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "flex-1 rounded-lg py-2",
            "bg-[#818cf8] text-[11px] font-bold text-white",
            "hover:bg-[#6366F1] active:bg-[#4F46E5]",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/50"
          )}
        >
          {busy ? "Añadiendo…" : "Añadir Sesión"}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-component: DayColumn ─────────────────────────────────────────────────

interface DayColumnProps {
  date: Date;
  sessions: PlannedSession[];
  dayLoad?: DayLoad;
  maxSrpe: number;
  isAddingHere: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onSubmitAdd: (draft: DraftSession) => void;
  onRemoveSession?: (id: string) => void | Promise<void>;
}

function DayColumn({
  date,
  sessions,
  dayLoad,
  maxSrpe,
  isAddingHere,
  onStartAdd,
  onCancelAdd,
  onSubmitAdd,
  onRemoveSession,
}: DayColumnProps) {
  const isoDate   = toISODate(date);
  const today     = isToday(date);
  const isSunday  = date.getDay() === 0;
  const srpe      = dayLoad?.srpe_projected ?? 0;
  const acwr      = dayLoad?.acwr_projected;
  const barColor  = acwrZoneColor(acwr);
  const isRest    = sessions.length === 0 && srpe === 0;

  return (
    <div
      className={cn(
        "relative flex flex-col min-h-[420px] rounded-2xl",
        "border border-white/[0.09] overflow-hidden",
        today && "border-[#818cf8]/40",
        "bg-[#080808]"
      )}
      aria-label={`${DAY_NAMES_SHORT[(date.getDay() + 6) % 7]} ${formatMonthDay(date)}`}
    >
      {/* ── Left ACWR impact strip (4px) ── */}
      <div
        className="absolute inset-y-0 left-0 w-1 transition-colors duration-500"
        style={{ backgroundColor: barColor }}
        aria-hidden
      />

      {/* ── Day header ── */}
      <div
        className={cn(
          "px-3 pt-3 pb-0 ml-1",
          "border-b border-white/[0.05]"
        )}
      >
        {/* Day name */}
        <div className="flex items-center justify-between mb-1">
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.18em]",
              today ? "text-[#818cf8]" : "text-slate-600"
            )}
          >
            {DAY_NAMES_SHORT[(date.getDay() + 6) % 7]}
          </span>
          {today && (
            <span className="rounded-full bg-[#818cf8]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#818cf8]">
              hoy
            </span>
          )}
        </div>

        {/* Day number */}
        <span
          className={cn(
            "text-xl font-black leading-none",
            today ? "text-white" : "text-slate-400"
          )}
        >
          {date.getDate()}
        </span>

        {/* Load impact bar */}
        <LoadImpactBar srpe={srpe} maxSrpe={maxSrpe} acwr={acwr} />
      </div>

      {/* ── Session cards ── */}
      <div className="ml-1 flex flex-1 flex-col gap-2 p-2 pt-2">
        {sessions.length === 0 && !isAddingHere && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4">
            {isSunday ? (
              <>
                <Moon size={18} className="text-slate-800" aria-hidden />
                <span className="text-[9px] uppercase tracking-widest text-slate-800">
                  Descanso
                </span>
              </>
            ) : (
              <span className="text-[10px] text-slate-800">Sin sesiones</span>
            )}
          </div>
        )}

        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            onRemove={onRemoveSession}
          />
        ))}

        {/* ── Add form (inline) ── */}
        {isAddingHere && (
          <AddSessionForm
            onSubmit={onSubmitAdd}
            onCancel={onCancelAdd}
          />
        )}

        {/* ── Add button ── */}
        {!isAddingHere && (
          <button
            onClick={onStartAdd}
            className={cn(
              "mt-auto flex items-center justify-center gap-1.5",
              "rounded-xl border border-dashed border-white/[0.08] py-2.5",
              "text-[10px] font-semibold text-slate-700",
              "hover:border-[#818cf8]/40 hover:text-[#818cf8]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#818cf8]/40"
            )}
            aria-label={`Añadir sesión el ${formatMonthDay(date)}`}
          >
            <Plus size={11} aria-hidden />
            Añadir
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: ZoneLegend ────────────────────────────────────────────────

function ZoneLegend({ currentAcwr }: { currentAcwr?: number }) {
  return (
    <footer
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
      aria-label="Leyenda de zonas ACWR"
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-700">
        Impacto de carga
      </span>
      {Object.entries(ACWR_ZONES).map(([key, zone]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div
            className="h-1.5 w-3 rounded-full"
            style={{ backgroundColor: zone.color }}
            aria-hidden
          />
          <span className="text-[9px] text-slate-600">{zone.label}</span>
        </div>
      ))}
      {currentAcwr != null && (
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] text-slate-600">ACWR actual:</span>
          <span
            className="text-[10px] font-bold tabular-nums"
            style={{ color: acwrZoneColor(currentAcwr) }}
          >
            {currentAcwr.toFixed(2)}
          </span>
        </div>
      )}
    </footer>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrainingPlanner({
  sessions    = [],
  dayLoads    = [],
  currentAcwr,
  onAddSession,
  onRemoveSession,
}: TrainingPlannerProps) {
  // Week navigation state — defaults to current week (Mon)
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMondayOf(new Date())
  );

  // Which day column has the add-form open (ISO date string or null)
  const [addingToDate, setAddingToDate] = useState<string | null>(null);

  // Build array of 7 Date objects for the visible week
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Index sessions by ISO date
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, PlannedSession[]>();
    for (const s of sessions) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return map;
  }, [sessions]);

  // Index day loads by ISO date
  const loadByDate = useMemo(() => {
    const map = new Map<string, DayLoad>();
    for (const d of dayLoads) map.set(d.date, d);
    return map;
  }, [dayLoads]);

  // Max sRPE in the week (for proportional bar scaling)
  const maxSrpe = useMemo(() => {
    let max = 1;
    for (const d of weekDays) {
      const load = loadByDate.get(toISODate(d));
      if (load && load.srpe_projected > max) max = load.srpe_projected;
    }
    return max;
  }, [weekDays, loadByDate]);

  // Navigation handlers
  const prevWeek = useCallback(() => {
    setWeekStart((d) => addDays(d, -7));
    setAddingToDate(null);
  }, []);

  const nextWeek = useCallback(() => {
    setWeekStart((d) => addDays(d, 7));
    setAddingToDate(null);
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(getMondayOf(new Date()));
    setAddingToDate(null);
  }, []);

  // Add session handler
  const handleAddSession = useCallback(
    async (date: string, draft: DraftSession) => {
      await onAddSession?.(date, {
        session_type: draft.session_type,
        phase:        draft.phase,
        duration_min: draft.duration_min,
        rpe_target:   draft.rpe_target,
        description:  draft.description || undefined,
      });
      setAddingToDate(null);
    },
    [onAddSession]
  );

  // Check if the current week contains today (for "Go to today" button)
  const weekContainsToday = weekDays.some(isToday);

  return (
    <section
      className="flex flex-col gap-6"
      aria-label="Planificador de entrenamiento semanal"
    >
      {/* ── Planner header ── */}
      <header
        className={cn(
          "auth-grid-bg relative overflow-hidden rounded-2xl",
          "bg-[#080808] px-6 py-5",
          "border border-white/[0.07]"
        )}
      >
        {/* Bottom gradient bleed */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#0F172A]/60"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          {/* Title + range */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Bodysense · Planificación
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              {formatWeekRange(weekStart)}
            </h2>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            {!weekContainsToday && (
              <button
                onClick={goToCurrentWeek}
                className={cn(
                  "rounded-lg border border-[#818cf8]/30 bg-[#818cf8]/8",
                  "px-3 py-1.5 text-[11px] font-semibold text-[#818cf8]",
                  "hover:border-[#818cf8]/60 hover:bg-[#818cf8]/15",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40"
                )}
              >
                Semana actual
              </button>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={prevWeek}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "border border-white/[0.09] text-slate-500",
                  "hover:border-white/[0.18] hover:text-white",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40"
                )}
                aria-label="Semana anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextWeek}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "border border-white/[0.09] text-slate-500",
                  "hover:border-white/[0.18] hover:text-white",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/40"
                )}
                aria-label="Semana siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Weekly grid ── */}
      <div
        className="overflow-x-auto pb-2"
        role="grid"
        aria-label="Cuadrícula semanal"
      >
        <div className="grid min-w-[840px] grid-cols-7 gap-3">
          {weekDays.map((date) => {
            const isoDate = toISODate(date);
            return (
              <DayColumn
                key={isoDate}
                date={date}
                sessions={sessionsByDate.get(isoDate) ?? []}
                dayLoad={loadByDate.get(isoDate)}
                maxSrpe={maxSrpe}
                isAddingHere={addingToDate === isoDate}
                onStartAdd={() => setAddingToDate(isoDate)}
                onCancelAdd={() => setAddingToDate(null)}
                onSubmitAdd={(draft) => handleAddSession(isoDate, draft)}
                onRemoveSession={onRemoveSession}
              />
            );
          })}
        </div>
      </div>

      {/* ── Zone legend ── */}
      <ZoneLegend currentAcwr={currentAcwr} />
    </section>
  );
}
