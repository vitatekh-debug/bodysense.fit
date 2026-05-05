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
  session_rpe: SessionRpeRow[] | unknown; // Supabase joined array
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
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, backgroundColor: color + "18" }}
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
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

/** sRPE intensity indicator — green → red gradient badge. */
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
      style={{ color, backgroundColor: color + "18" }}
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
    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] backdrop-blur-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Sesiones Recientes
        </h2>
        <span className="text-[11px] text-slate-700">
          {rows.length} sesión{rows.length !== 1 ? "es" : ""}
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.05]">
            <Th>Fecha</Th>
            <Th>Tipo</Th>
            <Th align="center">Duración</Th>
            <Th align="center">RPE</Th>
            <Th align="center">sRPE</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-[13px] text-slate-700"
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
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(s.date)}
                  </td>
                  <td className="px-4 py-3">
                    <SessionTypeBadge type={s.session_type} />
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400">
                    {s.duration_min}&thinsp;min
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300 tabular-nums">
                    {rpe ? rpe.rpe : <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rpe ? (
                      <SrpeBadge srpe={rpe.srpe} />
                    ) : (
                      <span className="text-slate-700">—</span>
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
