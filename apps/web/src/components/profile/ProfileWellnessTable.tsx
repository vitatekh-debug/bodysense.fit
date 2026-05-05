/**
 * ProfileWellnessTable — Bodysense
 *
 * Glass-morphism table for the last 7 wellness check-ins.
 * Design tokens: backdrop-blur-md, inset top-highlight, text-white/35 labels.
 */

import { formatDate } from "@vitatekh/shared";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WellnessRow {
  date: string;
  fatigue: number;
  sleep_hours: number;
  sleep_quality: number;
  mood: number;
}

interface ProfileWellnessTableProps {
  rows: WellnessRow[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Colour-coded thin bar for fatigue (1–10). */
function FatigueBar({ value }: { value: number }) {
  const color =
    value <= 3
      ? "#22c55e"
      : value <= 5
        ? "#84cc16"
        : value <= 7
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div
      className="flex items-center justify-center gap-2"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={1}
      aria-valuemax={10}
      aria-label={`Fatiga: ${value}/10`}
    >
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-4 text-right text-[11px] tabular-nums text-white/40">
        {value}
      </span>
    </div>
  );
}

/** Sleep quality as filled / empty stars (1–5). */
function SleepQuality({ value }: { value: number }) {
  return (
    <span
      aria-label={`Calidad de sueño: ${value}/5`}
      className="text-[12px] tracking-tight"
    >
      <span className="text-yellow-400/80">{"★".repeat(Math.max(0, value))}</span>
      <span className="text-white/15">{"☆".repeat(Math.max(0, 5 - value))}</span>
    </span>
  );
}

const MOOD_EMOJI = ["😰", "😟", "😐", "😊", "😄"] as const;

// ─── Column header ────────────────────────────────────────────────────────────

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25",
        align === "center" ? "text-center" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileWellnessTable({
  rows,
}: ProfileWellnessTableProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.09] bg-white/[0.025] overflow-hidden",
        "backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_3px_rgba(0,0,0,0.4)]",
        "bs-fade-up bs-d0"
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          Wellness Reciente
        </h2>
        <span className="text-[11px] font-medium text-white/20">
          {rows.length} check-in{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.04]">
            <Th>Fecha</Th>
            <Th align="center">Fatiga</Th>
            <Th align="center">Sueño</Th>
            <Th align="center">Calidad</Th>
            <Th align="center">Ánimo</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-[13px] text-white/20"
              >
                Sin check-ins registrados
              </td>
            </tr>
          ) : (
            rows.map((w) => (
              <tr
                key={w.date}
                className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 text-white/45 tabular-nums">
                  {formatDate(w.date)}
                </td>
                <td className="px-4 py-3">
                  <FatigueBar value={w.fatigue} />
                </td>
                <td className="px-4 py-3 text-center text-white/60 tabular-nums">
                  {w.sleep_hours}h
                </td>
                <td className="px-4 py-3 text-center">
                  <SleepQuality value={w.sleep_quality ?? 0} />
                </td>
                <td className="px-4 py-3 text-center text-base leading-none">
                  {MOOD_EMOJI[Math.min(Math.max((w.mood ?? 1) - 1, 0), 4)]}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
