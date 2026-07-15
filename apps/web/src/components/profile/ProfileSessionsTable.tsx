/**
 * ProfileSessionsTable — Bodysense
 *
 * Glass-morphism table of the last 10 training sessions.
 * Design tokens: backdrop-blur-md, inset top-highlight, text-ink-soft labels.
 */

import { formatDate } from "@vitatekh/shared";
import type { SessionType, SessionPhase } from "@vitatekh/shared";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRpeRow {
  rpe: number;
  srpe: number;
}

interface SessionRow {
  id: string;
  date: string;
  duration_min: number;
  session_type: SessionType;
  phase: SessionPhase;
  session_rpe: SessionRpeRow[] | unknown;
}

interface ProfileSessionsTableProps {
  rows: SessionRow[];
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  technical:  "Técnica",
  tactical:   "Táctica",
  physical:   "Física",
  match:      "Partido",
  recovery:   "Recuperación",
  prevention: "Prevención",
  rehabilitation: "Rehabilitación",
};

const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  technical:  "#c65f3f",
  tactical:   "#5aa07a",
  physical:   "#d9902a",
  match:      "#c0492f",
  recovery:   "#3f9aa8",
  prevention: "#9b6bbf",
  rehabilitation: "#3aa99a",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SessionTypeBadge({ type }: { type: SessionType }) {
  const label = SESSION_TYPE_LABELS[type] ?? type;
  const color = SESSION_TYPE_COLORS[type] ?? "#8a7660";
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide"
      style={{
        color,
        backgroundColor: color + "18",
        border: `1px solid ${color}25`,
      }}
    >
      {label}
    </span>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

/** sRPE intensity chip — green → amber → red by load. */
function SrpeBadge({ srpe }: { srpe: number }) {
  const color =
    srpe < 400
      ? "#6f9c4a"
      : srpe < 700
        ? "#84cc16"
        : srpe < 1000
          ? "#d9902a"
          : "#c0492f";
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
      style={{
        color,
        backgroundColor: color + "18",
        border: `1px solid ${color}25`,
      }}
    >
      {Math.round(srpe)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileSessionsTable({
  rows,
}: ProfileSessionsTableProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface overflow-hidden",
        "backdrop-blur-md",
        "shadow-[inset_0_1px_0_var(--bs-card-inset),0_1px_3px_var(--bs-card-shadow)]",
        "bs-fade-up bs-d1"
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
          Sesiones Recientes
        </h2>
        <span className="text-[11px] font-medium text-ink-muted">
          {rows.length} sesión{rows.length !== 1 ? "es" : ""}
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line">
            <Th>Fecha</Th>
            <Th>Tipo</Th>
            <Th align="center">Dur.</Th>
            <Th align="center">RPE</Th>
            <Th align="center">sRPE</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-[13px] text-ink-muted"
              >
                Sin sesiones registradas
              </td>
            </tr>
          ) : (
            rows.map((s) => {
              const rpe = (s.session_rpe as SessionRpeRow[] | null)?.[0] ?? null;
              return (
                <tr
                  key={s.id}
                  className="border-b border-line transition-colors hover:bg-surface"
                >
                  <td className="px-4 py-3 text-ink/45 tabular-nums">
                    {formatDate(s.date)}
                  </td>
                  <td className="px-4 py-3">
                    <SessionTypeBadge type={s.session_type} />
                  </td>
                  <td className="px-4 py-3 text-center text-ink/45 tabular-nums">
                    {s.duration_min}<span className="text-ink-muted">&thinsp;min</span>
                  </td>
                  <td className="px-4 py-3 text-center text-ink-body tabular-nums">
                    {rpe ? rpe.rpe : <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rpe ? (
                      <SrpeBadge srpe={rpe.srpe} />
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
