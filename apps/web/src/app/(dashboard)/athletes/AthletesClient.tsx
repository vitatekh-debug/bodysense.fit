"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { AthleteWithAcwr, AcwrRiskZone } from "@vitatekh/shared";
import { Search, ChevronRight, Users, Activity, ClipboardPlus, AlertTriangle } from "lucide-react";
import { staggerContainer, fadeUpItem, springPop } from "@/components/motion/primitives";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AthleteRow extends AthleteWithAcwr {
  team_name?: string;
  latest_srpe: number | null;
  wellness_fatigue: number | null;
  wellness_soreness: number | null;
  alert_count: number;
}

type AcwrZoneInfo = { label: string; color: string; min: number; max: number };

interface Props {
  athletes:    AthleteRow[];
  acwrZones:   Record<AcwrRiskZone, AcwrZoneInfo>;
  sportLabels: Record<string, string>;
}

// ─── Wellness colour ──────────────────────────────────────────────────────────

/** Combina fatiga (1-10) y dolor muscular (1-10) en un semáforo de bienestar. */
function wellnessStatus(fatigue: number | null, soreness: number | null): {
  color: string; label: string;
} {
  if (fatigue == null && soreness == null) return { color: "#475569", label: "Sin check-in" };
  const worst = Math.max(fatigue ?? 0, soreness ?? 0);
  if (worst <= 4) return { color: "#22c55e", label: "Óptimo" };
  if (worst <= 7) return { color: "#f59e0b", label: "Moderado" };
  return { color: "#ef4444", label: "Comprometido" };
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const SPORT_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "basketball", label: "Baloncesto" },
  { key: "football", label: "Fútbol" },
  { key: "volleyball", label: "Voleibol" },
];

const ZONE_FILTERS = [
  { key: "all", label: "Todas las zonas" },
  { key: "low", label: "Bajo" },
  { key: "optimal", label: "Óptimo" },
  { key: "high", label: "Alto" },
  { key: "very_high", label: "Muy Alto" },
];

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  return (
    <>
      {name.split(" ").map((n) => n[0] ?? "").slice(0, 2).join("").toUpperCase()}
    </>
  );
}

function WellnessDot({ fatigue, soreness }: { fatigue: number | null; soreness: number | null }) {
  const w = wellnessStatus(fatigue, soreness);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
      <span className="text-[11px] font-medium" style={{ color: w.color }}>{w.label}</span>
    </span>
  );
}

function NewEvalButton({ athleteId }: { athleteId: string }) {
  return (
    <Link href={`/athletes/${athleteId}?tab=evaluacion`} onClick={(e) => e.stopPropagation()}>
      <motion.span
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={springPop}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#818cf8] px-3 py-1.5 text-xs font-bold text-[#0a0a0a]"
      >
        <ClipboardPlus size={13} />
        Nueva Evaluación
      </motion.span>
    </Link>
  );
}

// ─── Mobile health card ───────────────────────────────────────────────────────

function AthleteCard({ athlete, zone, sportLabels }: {
  athlete: AthleteRow; zone: AcwrZoneInfo | null; sportLabels: Record<string, string>;
}) {
  const sport = athlete.sport ? (sportLabels[athlete.sport] ?? athlete.sport) : null;
  const acwr = athlete.latest_acwr;
  const color = zone?.color ?? "#818cf8";

  return (
    <motion.div variants={fadeUpItem}>
      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] backdrop-blur-md p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.4)]">
        <Link href={`/athletes/${athlete.id}`} className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ backgroundColor: color + "1a", color, border: `1.5px solid ${color}40` }}
          >
            <Initials name={athlete.full_name} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-semibold text-sm leading-tight truncate">{athlete.full_name}</p>
            <p className="text-slate-500 text-xs truncate mt-0.5">
              {[athlete.team_name, sport].filter(Boolean).join(" · ") || athlete.email}
            </p>
          </div>
          {acwr && zone ? (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xl font-black leading-none tabular-nums" style={{ color: zone.color }}>
                {acwr.acwr_ratio.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">ACWR</span>
            </div>
          ) : (
            <span className="text-xs text-slate-600">Sin datos</span>
          )}
        </Link>

        {/* Health strip */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Activity size={12} className="text-slate-600" />
              <span className="tabular-nums font-medium">{athlete.latest_srpe ?? "—"}</span>
              <span className="text-slate-600">sRPE</span>
            </span>
            <WellnessDot fatigue={athlete.wellness_fatigue} soreness={athlete.wellness_soreness} />
            {athlete.alert_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-400">
                <AlertTriangle size={11} />
                {athlete.alert_count}
              </span>
            )}
          </div>
          <NewEvalButton athleteId={athlete.id} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasAthletes }: { hasAthletes: boolean }) {
  return (
    <div className="py-16 text-center text-slate-500 text-sm">
      {hasAthletes
        ? "No hay atletas que coincidan con los filtros."
        : "No tienes atletas registrados. Crea un equipo e invita atletas."}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AthletesClient({ athletes, acwrZones, sportLabels }: Props) {
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  const filtered = athletes.filter((a) => {
    const matchesSearch = a.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesSport = sportFilter === "all" || a.sport === sportFilter;
    const matchesZone = zoneFilter === "all" || a.latest_acwr?.risk_zone === zoneFilter;
    return matchesSearch && matchesSport && matchesZone;
  });

  const atRiskCount = athletes.filter(
    (a) => a.latest_acwr?.risk_zone === "high" || a.latest_acwr?.risk_zone === "very_high"
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">Atletas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {athletes.length} atleta{athletes.length !== 1 ? "s" : ""} en tus equipos
            {atRiskCount > 0 && <span className="ml-2 text-red-400 font-semibold">· {atRiskCount} en riesgo</span>}
          </p>
        </div>
        <Users size={20} className="shrink-0 text-slate-600 mt-1" />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#818cf8]/60 focus:bg-white/[0.06] transition-all"
          />
        </div>

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-nowrap">
            {SPORT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setSportFilter(f.key)}
                className={[
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                  sportFilter === f.key
                    ? "bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/35"
                    : "bg-white/[0.04] text-slate-400 border border-slate-700/80 hover:text-slate-200 hover:border-slate-600",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-nowrap">
            {ZONE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setZoneFilter(f.key)}
                className={[
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                  zoneFilter === f.key
                    ? "bg-slate-700 text-slate-100 border border-slate-500"
                    : "bg-white/[0.04] text-slate-500 border border-slate-700/80 hover:text-slate-300 hover:border-slate-600",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: health cards */}
      <motion.div
        className="md:hidden space-y-2.5"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {filtered.length === 0 ? (
          <EmptyState hasAthletes={athletes.length > 0} />
        ) : (
          filtered.map((athlete) => {
            const zone = athlete.latest_acwr ? acwrZones[athlete.latest_acwr.risk_zone] : null;
            return <AthleteCard key={athlete.id} athlete={athlete} zone={zone} sportLabels={sportLabels} />;
          })
        )}
      </motion.div>

      {/* Desktop: scannable table */}
      <div className="hidden md:block rounded-2xl overflow-hidden border border-white/[0.09] bg-white/[0.025] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80">
              <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Atleta</th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">ACWR</th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Último sRPE</th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Wellness</th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Alertas</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6}><EmptyState hasAthletes={athletes.length > 0} /></td></tr>
            ) : (
              filtered.map((athlete) => {
                const zone = athlete.latest_acwr ? acwrZones[athlete.latest_acwr.risk_zone] : null;
                return (
                  <tr key={athlete.id} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition group">
                    <td className="px-4 py-3">
                      <Link href={`/athletes/${athlete.id}`} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: (zone?.color ?? "#818cf8") + "1a", color: zone?.color ?? "#818cf8" }}
                        >
                          <Initials name={athlete.full_name} />
                        </div>
                        <div>
                          <p className="text-slate-100 font-medium leading-tight">{athlete.full_name}</p>
                          <p className="text-slate-500 text-xs">
                            {[athlete.team_name, athlete.sport ? sportLabels[athlete.sport] ?? athlete.sport : null].filter(Boolean).join(" · ") || athlete.email}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums" style={{ color: zone?.color }}>
                      {athlete.latest_acwr?.acwr_ratio.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300 tabular-nums">
                      {athlete.latest_srpe ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <WellnessDot fatigue={athlete.wellness_fatigue} soreness={athlete.wellness_soreness} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {athlete.alert_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-400">
                          <AlertTriangle size={11} /> {athlete.alert_count}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <NewEvalButton athleteId={athlete.id} />
                        <Link href={`/athletes/${athlete.id}`} className="text-slate-600 group-hover:text-[#818cf8] transition-colors">
                          <ChevronRight size={17} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
