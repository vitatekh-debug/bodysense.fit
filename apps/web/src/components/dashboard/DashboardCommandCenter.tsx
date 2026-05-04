"use client";

/**
 * DashboardCommandCenter — Bodysense
 *
 * Bento Grid 4-col para el Command Center del entrenador.
 * Requiere recharts (ya instalado en @vitatekh/web).
 *
 * Layout (md):
 * ┌──────────────────┬────────────┬────────────┐
 * │                  │ Recovery   │ NextSession │
 * │  ACWR Chart 2×2  ├────────────┼────────────┤
 * │                  │ Atletas    │ En Riesgo  │
 * └──────────────────┴────────────┴────────────┘
 */

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import { clsx } from "clsx";
import {
  Moon,
  Calendar,
  Users,
  AlertTriangle,
  Flame,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AcwrPoint {
  /** ISO date string: "2026-04-28" */
  date: string;
  /** ACWR ratio — null/undefined treated as no data */
  acwr: number | null;
  acuteLoad: number;
  chronicLoad: number;
}

export interface RecoverySnapshot {
  sleepHours: number;    // 0–12
  sleepQuality: number;  // 1–5
  fatigue: number;       // 1–10 (higher = more fatigued)
  mood: number;          // 1–5
}

export interface UpcomingSession {
  title: string;
  sessionType: "technical" | "tactical" | "physical" | "match" | "recovery" | "prevention";
  scheduledAt: string;  // ISO date string
  durationMin: number;
  phase: string;
}

export interface DashboardCommandCenterProps {
  /** Ordered oldest → newest ACWR snapshots for the chart */
  acwrHistory: AcwrPoint[];
  /** Most recent ACWR ratio for the primary number display */
  currentAcwr: number | null;
  /** Most recent risk zone */
  currentZone: "low" | "optimal" | "high" | "very_high" | null;
  /** Today's wellness check-in (averaged across team or individual) */
  recovery: RecoverySnapshot | null;
  /** Nearest upcoming training session */
  nextSession: UpcomingSession | null;
  /** Summary counts */
  athleteCount: number;
  optimalCount: number;
  atRiskCount: number;
  criticalAlerts: number;
}

// ─── Zone config ──────────────────────────────────────────────────────────────

const ZONE_CONFIG = {
  low:       { label: "Carga Baja",      color: "#3B82F6", neon: "#60A5FA" },
  optimal:   { label: "Zona Óptima",     color: "#22C55E", neon: "#4ADE80" },
  high:      { label: "Riesgo Alto",     color: "#EAB308", neon: "#FDE047" },
  very_high: { label: "Riesgo Muy Alto", color: "#EF4444", neon: "#F87171" },
} as const;

const SESSION_LABELS: Record<UpcomingSession["sessionType"], string> = {
  technical:  "Técnico",
  tactical:   "Táctico",
  physical:   "Físico",
  match:      "Partido",
  recovery:   "Recuperación",
  prevention: "Prevención",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

function fmtSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function AcwrTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const acwrVal = payload.find((p) => p.dataKey === "acwr")?.value;
  const acuteVal = payload.find((p) => p.dataKey === "acuteLoad")?.value;
  return (
    <div
      role="tooltip"
      className="rounded-xl border border-white/10 p-3 text-xs shadow-2xl"
      style={{ background: "#0a0a0a" }}
    >
      <p className="text-slate-400 mb-2 font-medium">{fmtDate(String(label))}</p>
      <p className="text-white font-bold">
        ACWR{" "}
        <span style={{ color: "#818cf8" }}>
          {typeof acwrVal === "number" ? acwrVal.toFixed(2) : "—"}
        </span>
      </p>
      {typeof acuteVal === "number" && (
        <p className="text-slate-400 mt-0.5">
          Carga aguda:{" "}
          <span className="text-slate-300">{Math.round(acuteVal)} UA</span>
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardCommandCenter({
  acwrHistory,
  currentAcwr,
  currentZone,
  recovery,
  nextSession,
  athleteCount,
  optimalCount,
  atRiskCount,
  criticalAlerts,
}: DashboardCommandCenterProps) {
  const zone = currentZone ? ZONE_CONFIG[currentZone] : null;

  return (
    <section
      aria-label="Command Center de Carga Bodysense"
      className="grid grid-cols-1 md:grid-cols-4 gap-6"
    >
      {/* ── ACWR Chart 2×2 ─────────────────────────────────────────── */}
      <div
        className={clsx(
          "md:col-span-2 md:row-span-2",
          "rounded-2xl border border-white/10 p-6 flex flex-col",
          "bg-[#0f0f0f]"
        )}
      >
        {/* Card header */}
        <header className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">
              Acute:Chronic Workload Ratio
            </p>
            <h2 className="text-slate-100 text-xl font-black leading-tight">
              ACWR del Equipo
            </h2>
          </div>

          {currentAcwr !== null && zone ? (
            <div className="text-right" aria-label={`ACWR actual: ${currentAcwr.toFixed(2)}, ${zone.label}`}>
              <p
                className="text-4xl font-black tabular-nums"
                style={{ color: zone.neon }}
              >
                {currentAcwr.toFixed(2)}
              </p>
              <p
                className="text-xs font-bold mt-0.5 uppercase tracking-wider"
                style={{ color: zone.color }}
              >
                {zone.label}
              </p>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">Sin datos</p>
          )}
        </header>

        {/* Chart */}
        <div className="flex-1 min-h-[200px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={acwrHistory}
              margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="bs-acwr-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* ACWR risk zone bands */}
              <ReferenceArea y1={0}   y2={0.8}  fill="#3B82F6" fillOpacity={0.05} strokeWidth={0} />
              <ReferenceArea y1={0.8} y2={1.3}  fill="#22C55E" fillOpacity={0.05} strokeWidth={0} />
              <ReferenceArea y1={1.3} y2={1.5}  fill="#EAB308" fillOpacity={0.08} strokeWidth={0} />
              <ReferenceArea y1={1.5} y2={3}    fill="#EF4444" fillOpacity={0.08} strokeWidth={0} />

              <CartesianGrid
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="4 6"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 2.5]}
                ticks={[0, 0.8, 1.3, 1.5, 2.0, 2.5]}
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<AcwrTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="acwr"
                stroke="#818cf8"
                strokeWidth={2.5}
                fill="url(#bs-acwr-gradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "#818cf8",
                  stroke: "#0f0f0f",
                  strokeWidth: 2,
                }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Zone legend */}
        <footer
          className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-white/5"
          aria-label="Leyenda de zonas ACWR"
        >
          {(Object.entries(ZONE_CONFIG) as [string, typeof ZONE_CONFIG.low][]).map(
            ([key, z]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: z.color }}
                  aria-hidden="true"
                />
                <span className="text-[10px] text-slate-500">{z.label}</span>
              </div>
            )
          )}
        </footer>
      </div>

      {/* ── Recovery Card ──────────────────────────────────────────── */}
      <BentoCard
        icon={<Moon size={15} aria-hidden="true" />}
        iconBg="bg-indigo-500/10"
        iconColor="text-indigo-400"
        label="Estado de Recuperación"
      >
        {recovery ? (
          <div className="space-y-3.5">
            <RecoveryBar
              label="Sueño"
              value={recovery.sleepHours}
              max={12}
              unit="h"
              color="#818cf8"
              aria={`${recovery.sleepHours} horas de sueño`}
            />
            <RecoveryBar
              label="Calidad sueño"
              value={recovery.sleepQuality}
              max={5}
              unit="/5"
              color="#22d3ee"
              aria={`Calidad de sueño ${recovery.sleepQuality} de 5`}
            />
            <RecoveryBar
              label="Recuperación"
              value={10 - recovery.fatigue}
              max={10}
              unit=""
              color="#4ade80"
              aria={`Nivel de recuperación ${10 - recovery.fatigue} de 10`}
            />
            <RecoveryBar
              label="Ánimo"
              value={recovery.mood}
              max={5}
              unit="/5"
              color="#f59e0b"
              aria={`Ánimo ${recovery.mood} de 5`}
            />
          </div>
        ) : (
          <EmptyMetric message="Sin check-in de hoy" />
        )}
      </BentoCard>

      {/* ── Next Session Card ──────────────────────────────────────── */}
      <BentoCard
        icon={<Calendar size={15} aria-hidden="true" />}
        iconBg="bg-cyan-500/10"
        iconColor="text-cyan-400"
        label="Próxima Sesión"
      >
        {nextSession ? (
          <div className="space-y-3">
            <p className="text-slate-100 font-bold text-sm leading-snug">
              {nextSession.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip color="cyan">
                {SESSION_LABELS[nextSession.sessionType]}
              </Chip>
              <Chip color="indigo">{nextSession.phase}</Chip>
            </div>
            <dl className="text-xs text-slate-400 space-y-1 pt-1">
              <div className="flex gap-1.5">
                <dt aria-hidden="true">📅</dt>
                <dd>{fmtSessionDate(nextSession.scheduledAt)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt aria-hidden="true">⏱</dt>
                <dd>{nextSession.durationMin} min</dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyMetric message="Sin sesión programada" />
        )}
      </BentoCard>

      {/* ── Mini Stat: Atletas ─────────────────────────────────────── */}
      <MiniStat
        icon={<Users size={14} aria-hidden="true" />}
        label="Atletas"
        value={athleteCount}
        accentColor="#818cf8"
        sub={`${optimalCount} en zona óptima`}
      />

      {/* ── Mini Stat: En Riesgo ───────────────────────────────────── */}
      <MiniStat
        icon={<AlertTriangle size={14} aria-hidden="true" />}
        label="En Riesgo"
        value={atRiskCount}
        accentColor={atRiskCount > 0 ? "#ef4444" : "#4ade80"}
        sub={
          criticalAlerts > 0
            ? `${criticalAlerts} alerta${criticalAlerts > 1 ? "s" : ""} crítica${criticalAlerts > 1 ? "s" : ""}`
            : "Sin alertas críticas"
        }
      />
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BentoCard({
  icon,
  iconBg,
  iconColor,
  label,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 flex flex-col gap-4">
      <header className="flex items-center gap-2.5">
        <div
          className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            iconBg,
            iconColor
          )}
        >
          {icon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function RecoveryBar({
  label,
  value,
  max,
  unit,
  color,
  aria,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  aria: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div role="meter" aria-label={aria} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-semibold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Chip({
  color,
  children,
}: {
  color: "cyan" | "indigo";
  children: React.ReactNode;
}) {
  const styles = {
    cyan:   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
        styles[color]
      )}
    >
      {children}
    </span>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accentColor,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accentColor: string;
  sub: string;
}) {
  return (
    <article
      className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 flex flex-col justify-between gap-4"
      aria-label={`${label}: ${value}`}
    >
      <header className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
      </header>
      <div>
        <p
          className="text-4xl font-black tabular-nums leading-none"
          style={{ color: accentColor }}
        >
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
      </div>
    </article>
  );
}

function EmptyMetric({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center py-4">
      <p className="text-slate-600 text-xs text-center">{message}</p>
    </div>
  );
}
