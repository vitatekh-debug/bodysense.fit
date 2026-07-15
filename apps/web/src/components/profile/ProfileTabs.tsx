"use client";

/**
 * ProfileTabs — La gran ficha técnica del atleta.
 * 3 pestañas: Resumen Clínico · Centro de Evaluación · Evolución.
 * Transición lateral suave entre pestañas con framer-motion.
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Activity, ClipboardList, LineChart as LineChartIcon } from "lucide-react";
import { ACWR_ZONES } from "@vitatekh/shared";
import type { Profile, AcwrRiskZone, Prescription } from "@vitatekh/shared";
import { ALERT_LEVEL_CONFIG } from "@vitatekh/shared";

import ProfileHeader from "./ProfileHeader";
import AcwrHistoryChart from "@/app/(dashboard)/athletes/[id]/AcwrHistoryChart";
import MetricTrendChart, { type TrendPoint } from "./MetricTrendChart";
import EvaluationCenter, { type EvalCardData } from "./EvaluationCenter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcwrSummary {
  date: string;
  acwr_ratio: number;
  acute_load: number;
  chronic_load: number;
  risk_zone: AcwrRiskZone;
}

export interface WeaknessItem {
  label: string;
  severity: "high" | "medium" | "low";
}

export interface InjuryItem {
  region: string;
  eva: number;
  date: string;
}

export interface ProfileTabsProps {
  profile: Profile;
  athleteId: string;
  latestAcwr: AcwrSummary | null;
  acwrHistory: AcwrSummary[];
  sessionCount: number;
  latestSrpe: number | null;
  weaknesses: WeaknessItem[];
  injuries: InjuryItem[];
  prescriptions: Prescription[];
  // Evaluation center
  evalAnkleFoot: EvalCardData;
  evalFms: EvalCardData;
  evalLoad: EvalCardData;
  // Evolution trends
  wbltTrend: TrendPoint[];
  rsiTrend: TrendPoint[];
  tTestTrend: TrendPoint[];
  fmsTrend: TrendPoint[];
}

type TabKey = "resumen" | "evaluacion" | "evolucion";

const TABS: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: "resumen",    label: "Resumen Clínico",     icon: Activity },
  { key: "evaluacion", label: "Centro de Evaluación", icon: ClipboardList },
  { key: "evolucion",  label: "Evolución",            icon: LineChartIcon },
];

const SEVERITY_COLOR: Record<WeaknessItem["severity"], string> = {
  high:   "#c0492f",
  medium: "#d9902a",
  low:    "#c65f3f",
};

// ─── Small presentational helpers ─────────────────────────────────────────────

function StatTile({ label, value, unit, color }: {
  label: string; value: string; unit?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 backdrop-blur-md shadow-[inset_0_1px_0_var(--bs-card-inset)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-ink" style={color ? { color } : undefined}>
        {value}
      </p>
      {unit && <p className="mt-0.5 text-[11px] font-medium text-ink-muted">{unit}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
      {children}
    </h2>
  );
}

// ─── Tab panels ────────────────────────────────────────────────────────────────

function ResumenTab(p: ProfileTabsProps) {
  const zone = p.latestAcwr ? ACWR_ZONES[p.latestAcwr.risk_zone] : null;

  return (
    <div className="space-y-8">
      {/* Indicadores clave */}
      <section>
        <SectionHeading>Estado actual</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="ACWR"
            value={p.latestAcwr ? p.latestAcwr.acwr_ratio.toFixed(2) : "—"}
            unit={zone?.label ?? "Sin datos"}
            color={zone?.color}
          />
          <StatTile
            label="Carga Aguda"
            value={p.latestAcwr ? Math.round(p.latestAcwr.acute_load).toString() : "—"}
            unit="7 días · UA"
          />
          <StatTile
            label="Carga Crónica"
            value={p.latestAcwr ? Math.round(p.latestAcwr.chronic_load).toString() : "—"}
            unit="28 días · UA"
          />
          <StatTile
            label="Último sRPE"
            value={p.latestSrpe != null ? p.latestSrpe.toString() : "—"}
            unit="última sesión · UA"
            color="#c65f3f"
          />
        </div>
      </section>

      {/* Debilidades + Lesiones */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeading>Debilidades principales</SectionHeading>
          <div className="rounded-2xl border border-line bg-surface p-4 backdrop-blur-md space-y-2 min-h-[120px]">
            {p.weaknesses.length === 0 ? (
              <p className="text-ink-muted text-xs py-6 text-center">
                Sin debilidades detectadas en las últimas evaluaciones.
              </p>
            ) : (
              p.weaknesses.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                  style={{
                    borderColor: SEVERITY_COLOR[w.severity] + "40",
                    backgroundColor: SEVERITY_COLOR[w.severity] + "0f",
                  }}
                >
                  <AlertTriangle size={14} style={{ color: SEVERITY_COLOR[w.severity] }} />
                  <span className="text-ink text-sm">{w.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionHeading>Historial de lesiones activo</SectionHeading>
          <div className="rounded-2xl border border-line bg-surface p-4 backdrop-blur-md space-y-2 min-h-[120px]">
            {p.injuries.length === 0 ? (
              <p className="text-ink-muted text-xs py-6 text-center">
                Sin dolor activo registrado.
              </p>
            ) : (
              p.injuries.map((inj, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface-high px-3 py-2"
                >
                  <span className="text-ink text-sm">{inj.region}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
                      style={{
                        color: inj.eva >= 7 ? "#c0492f" : inj.eva >= 4 ? "#d9902a" : "#6f9c4a",
                        backgroundColor: (inj.eva >= 7 ? "#c0492f" : inj.eva >= 4 ? "#d9902a" : "#6f9c4a") + "1a",
                      }}
                    >
                      EVA {inj.eva}
                    </span>
                    <span className="text-ink-muted text-xs">
                      {new Date(inj.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ACWR chart */}
      <section>
        <SectionHeading>Evolución ACWR — últimos 30 días</SectionHeading>
        {p.acwrHistory.length > 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-6 backdrop-blur-md">
            <AcwrHistoryChart data={p.acwrHistory} />
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center backdrop-blur-md">
            <p className="text-ink-muted text-[13px]">
              Sin datos de ACWR todavía. Registra sesiones y sRPE para calcular.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function EvolucionTab(p: ProfileTabsProps) {
  return (
    <div className="space-y-6">
      <SectionHeading>Evolución de rendimiento y movilidad</SectionHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricTrendChart
          title="WBLT — Movilidad de tobillo"
          unit="cm"
          color="#c65f3f"
          data={p.wbltTrend}
          benchmark={{ value: 10, label: "≥ 10 cm" }}
          higherIsBetter
        />
        <MetricTrendChart
          title="Drop Jump — RSI (Bosco)"
          unit="RSI"
          color="#6f9c4a"
          data={p.rsiTrend}
          benchmark={{ value: 1.0, label: "≥ 1.0" }}
          higherIsBetter
        />
        <MetricTrendChart
          title="T-Test de agilidad"
          unit="s"
          color="#3f9aa8"
          data={p.tTestTrend}
          benchmark={{ value: 11.5, label: "≤ 11.5 s" }}
        />
        <MetricTrendChart
          title="FMS total"
          unit="/21"
          color="#d9902a"
          data={p.fmsTrend}
          benchmark={{ value: 14, label: "> 14" }}
          higherIsBetter
        />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0 }),
};

export default function ProfileTabs(props: ProfileTabsProps) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "resumen";
  const validInitial = TABS.some((t) => t.key === initialTab) ? initialTab : "resumen";

  const [tab, setTab] = useState<TabKey>(validInitial);
  const [dir, setDir] = useState(0);

  function switchTo(next: TabKey) {
    const from = TABS.findIndex((t) => t.key === tab);
    const to = TABS.findIndex((t) => t.key === next);
    setDir(to > from ? 1 : -1);
    setTab(next);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <ProfileHeader
        profile={props.profile}
        athleteId={props.athleteId}
        latestAcwr={props.latestAcwr}
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => switchTo(t.key)}
              className="relative flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors"
              style={{ color: active ? "#fdf3ea" : "#8a7660" }}
            >
              {active && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl bg-brand"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "resumen" && <ResumenTab {...props} />}
            {tab === "evaluacion" && (
              <EvaluationCenter
                athleteId={props.athleteId}
                ankleFoot={props.evalAnkleFoot}
                fms={props.evalFms}
                load={props.evalLoad}
              />
            )}
            {tab === "evolucion" && <EvolucionTab {...props} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
