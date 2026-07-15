/**
 * ProfileMetricCards — Bodysense
 *
 * 4-card bento grid:
 *   [1] ACWR Hero  — large ratio display + zone band + glow
 *   [2] Carga Aguda
 *   [3] Carga Crónica
 *   [4] Sesiones recientes
 *
 * Design:
 *   • backdrop-blur-md glass surface
 *   • Inset top-edge highlight simulates gradient border
 *   • ACWR hero card emits a soft zone-coloured glow on #f1e6d4 bg
 *   • Staggered bs-fade-up on each card
 */

import { cn } from "@/lib/utils";
import { ACWR_ZONES } from "@vitatekh/shared";
import type { AcwrRiskZone } from "@vitatekh/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcwrSummary {
  acwr_ratio: number;
  acute_load: number;
  chronic_load: number;
  risk_zone: AcwrRiskZone;
}

interface ProfileMetricCardsProps {
  latestAcwr: AcwrSummary | null;
  sessionCount: number;
}

// ─── Glow helper ──────────────────────────────────────────────────────────────

/** Returns a zone-specific box-shadow value for the ACWR hero card. */
function acwrGlow(zone: AcwrRiskZone | undefined): React.CSSProperties["boxShadow"] {
  if (!zone) return undefined;
  const glowMap: Record<AcwrRiskZone, string> = {
    low:       "0 0 22px rgba(59,  130, 246, 0.20), 0 0 60px rgba(59,  130, 246, 0.07)",
    optimal:   "0 0 22px rgba(34,  197,  94, 0.22), 0 0 60px rgba(34,  197,  94, 0.08)",
    high:      "0 0 22px rgba(245, 158,  11, 0.25), 0 0 60px rgba(245, 158,  11, 0.08)",
    very_high: "0 0 22px rgba(239,  68,  68, 0.28), 0 0 60px rgba(239,  68,  68, 0.09)",
  };
  return glowMap[zone];
}

// ─── Base Bento Card ──────────────────────────────────────────────────────────

function BentoCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface",
        "p-5 backdrop-blur-md",
        // Inset top highlight → subtle gradient-border feel
        "shadow-[inset_0_1px_0_var(--bs-card-inset),0_1px_3px_var(--bs-card-shadow)]",
        "transition-shadow duration-300",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

// ─── Generic metric card ──────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  className?: string;
}) {
  return (
    <BentoCard className={className}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-muted">{unit}</p>
    </BentoCard>
  );
}

// ─── ACWR Hero Card ───────────────────────────────────────────────────────────

function AcwrHeroCard({ acwr }: { acwr: AcwrSummary | null }) {
  const zone  = acwr ? ACWR_ZONES[acwr.risk_zone] : null;
  const ratio = acwr?.acwr_ratio;

  return (
    <BentoCard
      className={cn(
        "col-span-2 sm:col-span-1",
        // Brand-tinted border when data is present
        acwr
          ? "border-line-strong hover:border-line-strong"
          : "border-line"
      )}
      style={{
        boxShadow: [
          "inset 0 1px 0 var(--bs-card-inset)",
          "0 1px 3px var(--bs-card-shadow)",
          acwrGlow(acwr?.risk_zone),
        ]
          .filter(Boolean)
          .join(", "),
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
        ACWR
      </p>

      {/* Large ratio number */}
      <p
        className="mt-2 text-5xl font-black leading-none tabular-nums transition-colors duration-500 text-ink-muted"
        style={zone ? { color: zone.color } : undefined}
      >
        {ratio != null && isFinite(ratio) ? ratio.toFixed(2) : "—"}
      </p>

      {/* Zone pill */}
      {zone ? (
        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide"
          style={{
            color: zone.color,
            backgroundColor: zone.color + "1a",
            border: `1px solid ${zone.color}30`,
          }}
        >
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              (acwr?.risk_zone === "high" || acwr?.risk_zone === "very_high") &&
                "animate-pulse"
            )}
            style={{ backgroundColor: zone.color }}
          />
          {zone.label}
        </span>
      ) : (
        <span className="mt-3 inline-block text-[11px] text-ink-muted">
          Sin datos
        </span>
      )}

      {/* Zone band strip */}
      <div className="mt-4 flex gap-0.5 overflow-hidden rounded-full">
        {Object.entries(ACWR_ZONES).map(([key, z]) => (
          <div
            key={key}
            className="h-1 flex-1 rounded-full transition-opacity duration-500"
            style={{
              backgroundColor: z.color,
              opacity: zone?.label === z.label ? 0.9 : 0.15,
            }}
          />
        ))}
      </div>
    </BentoCard>
  );
}

// ─── Exported Grid ────────────────────────────────────────────────────────────

export default function ProfileMetricCards({
  latestAcwr,
  sessionCount,
}: ProfileMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="contents">
        {/* Each card staggers independently */}
        <div className="col-span-2 sm:col-span-1 bs-fade-up bs-d0">
          <AcwrHeroCard acwr={latestAcwr} />
        </div>

        <div className="bs-fade-up bs-d1">
          <MetricCard
            label="Carga Aguda"
            value={latestAcwr ? Math.round(latestAcwr.acute_load).toString() : "—"}
            unit="7 días · UA"
          />
        </div>

        <div className="bs-fade-up bs-d2">
          <MetricCard
            label="Carga Crónica"
            value={
              latestAcwr ? Math.round(latestAcwr.chronic_load).toString() : "—"
            }
            unit="28 días · UA"
          />
        </div>

        <div className="bs-fade-up bs-d3">
          <MetricCard
            label="Sesiones"
            value={String(sessionCount)}
            unit="registradas"
          />
        </div>
      </div>
    </div>
  );
}
