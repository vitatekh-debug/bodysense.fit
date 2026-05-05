/**
 * ProfileSessionsTable — Bodysense
 *
 * Glass-morphism table of the last 10 training sessions.
 * Design tokens: backdrop-blur-md, inset top-highlight, text-white/35 labels.
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
};

const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  technical:  "#818cf8",
  tactical:   "#34d399",
  physical:   "#f59e0b",
  match:      "#ef4444",
  recovery:   "#22d3ee",
  prevention: "#a78bfa",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SessionTypeBadge({ type }: { type: SessionType }) {
  const label = SESSION_TYPE_LABELS[type] ?? type;
  const color = SESSION_TYPE_COLORS[type] ?? "#64748b";
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
        "px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25",
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
      ? "#22c55e"
      : srpe < 700
        ? "#84cc16"
        : srpe < 1000
          ? "#f59e0b"
          : "#ef4444";
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
        "rounded-2xl border border-white/[0.09] bg-white/[0.025] overflow-hidden",
        "backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_3px_rgba(0,0,0,0.4)]",
        "bs-fade-up bs-d1"
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          Sesiones Recientes
        </h2>
        <span className="text-[11px] font-medium text-white/20">
          {rows.length} sesión{rows.length !== 1 ? "es" : ""}
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.04]">
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
                className="py-10 text-center text-[13px] text-white/20"
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
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-white/45 tabular-nums">
                    {formatDate(s.date)}
                  </td>
                  <td className="px-4 py-3">
                    <SessionTypeBadge type={s.session_type} />
                  </td>
                  <td className="px-4 py-3 text-center text-white/45 tabular-nums">
                    {s.duration_min}<span className="text-white/20">&thinsp;min</span>
                  </td>
                  <td className="px-4 py-3 text-center text-white/60 tabular-nums">
                    {rpe ? rpe.rpe : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rpe ? (
                      <SrpeBadge srpe={rpe.srpe} />
                    ) : (
                      <span className="text-white/20">—</span>
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
