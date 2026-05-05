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

// ─── Base Card ────────────────────────────────────────────────────────────────

function BentoCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.09] bg-white/[0.025]",
        "p-5 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Generic metric ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <BentoCard>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-600">{unit}</p>
    </BentoCard>
  );
}

// ─── ACWR Hero Card ───────────────────────────────────────────────────────────

function AcwrHeroCard({ acwr }: { acwr: AcwrSummary | null }) {
  const zone = acwr ? ACWR_ZONES[acwr.risk_zone] : null;
  const ratio = acwr?.acwr_ratio;

  return (
    <BentoCard className="col-span-2 sm:col-span-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        ACWR
      </p>

      <p
        className="mt-2 text-5xl font-black leading-none"
        style={{ color: zone?.color ?? "#475569" }}
      >
        {ratio != null && isFinite(ratio) ? ratio.toFixed(2) : "—"}
      </p>

      {zone ? (
        <span
          className="mt-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            color: zone.color,
            backgroundColor: zone.color + "20",
          }}
        >
          {zone.label}
        </span>
      ) : (
        <span className="mt-3 inline-block text-[11px] text-slate-600">
          Sin datos
        </span>
      )}

      {/* Zone band strip */}
      <div className="mt-4 flex gap-0.5 overflow-hidden rounded-full">
        {Object.values(ACWR_ZONES).map((z) => (
          <div
            key={z.label}
            className="h-1 flex-1 rounded-full opacity-30 transition-opacity"
            style={{
              backgroundColor: z.color,
              opacity: zone?.label === z.label ? 1 : 0.2,
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
      <AcwrHeroCard acwr={latestAcwr} />
      <MetricCard
        label="Carga Aguda (7d)"
        value={latestAcwr ? Math.round(latestAcwr.acute_load).toString() : "—"}
        unit="UA"
      />
      <MetricCard
        label="Carga Crónica (28d)"
        value={
          latestAcwr ? Math.round(latestAcwr.chronic_load).toString() : "—"
        }
        unit="UA"
      />
      <MetricCard
        label="Sesiones recientes"
        value={String(sessionCount)}
        unit="registradas"
      />
    </div>
  );
}
