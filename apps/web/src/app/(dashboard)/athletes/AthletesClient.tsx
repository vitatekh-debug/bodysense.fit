"use client";

import { useState } from "react";
import Link from "next/link";
import type { AthleteWithAcwr, AcwrRiskZone } from "@vitatekh/shared";
import { Search, ChevronRight, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AcwrZoneInfo = { label: string; color: string; min: number; max: number };

interface Props {
  athletes:    AthleteWithAcwr[];
  acwrZones:   Record<AcwrRiskZone, AcwrZoneInfo>;
  sportLabels: Record<string, string>;
}

// ─── Filter data ──────────────────────────────────────────────────────────────

const SPORT_FILTERS = [
  { key: "all",        label: "Todos"      },
  { key: "basketball", label: "Baloncesto" },
  { key: "football",   label: "Fútbol"     },
  { key: "volleyball", label: "Voleibol"   },
];

const ZONE_FILTERS = [
  { key: "all",       label: "Todas las zonas" },
  { key: "low",       label: "Bajo"            },
  { key: "optimal",   label: "Óptimo"          },
  { key: "high",      label: "Alto"            },
  { key: "very_high", label: "Muy Alto"        },
];

// ─── AthleteCard — vista de tarjeta cristal para móvil ───────────────────────

interface CardProps {
  athlete:     AthleteWithAcwr;
  zone:        AcwrZoneInfo | null;
  sportLabels: Record<string, string>;
}

function AthleteCard({ athlete, zone, sportLabels }: CardProps) {
  const initials = athlete.full_name
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sport    = athlete.sport ? (sportLabels[athlete.sport] ?? athlete.sport) : null;
  const teamName = (athlete as any).team_name as string | undefined;
  const acwr     = athlete.latest_acwr;
  const color    = zone?.color ?? "#818cf8";

  return (
    <Link href={`/athletes/${athlete.id}`}>
      <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.025] backdrop-blur-md p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.4)] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-150 active:scale-[0.985]">

        {/* ── Avatar ── */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            backgroundColor: color + "1a",
            color,
            border: `1.5px solid ${color}40`,
          }}
        >
          {initials}
        </div>

        {/* ── Identidad ── */}
        <div className="flex-1 min-w-0">
          <p className="text-slate-100 font-semibold text-sm leading-tight truncate">
            {athlete.full_name}
          </p>
          <p className="text-slate-500 text-xs truncate mt-0.5">
            {[teamName, sport].filter(Boolean).join(" · ") || athlete.email}
          </p>

          {/* Mini stats row */}
          {acwr && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Aguda
              </span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                {acwr.acute_load.toFixed(0)}
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Crónica
              </span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                {acwr.chronic_load.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        {/* ── ACWR + Zona ── */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {acwr && zone ? (
            <>
              <span
                className="text-xl font-black leading-none tabular-nums"
                style={{ color: zone.color }}
              >
                {acwr.acwr_ratio.toFixed(2)}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ color: zone.color, backgroundColor: zone.color + "22" }}
              >
                {zone.label}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-600">Sin datos</span>
          )}
        </div>

        {/* ── Chevron ── */}
        <ChevronRight
          size={15}
          className="shrink-0 text-slate-700 group-hover:text-slate-400 transition-colors"
        />
      </div>
    </Link>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AthletesClient({ athletes, acwrZones, sportLabels }: Props) {
  const [search,      setSearch]      = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [zoneFilter,  setZoneFilter]  = useState("all");

  const filtered = athletes.filter((a) => {
    const matchesSearch = a.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesSport  = sportFilter === "all" || a.sport === sportFilter;
    const matchesZone   = zoneFilter  === "all" || a.latest_acwr?.risk_zone === zoneFilter;
    return matchesSearch && matchesSport && matchesZone;
  });

  const atRiskCount = athletes.filter(
    (a) => a.latest_acwr?.risk_zone === "high" || a.latest_acwr?.risk_zone === "very_high"
  ).length;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Atletas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {athletes.length} atleta{athletes.length !== 1 ? "s" : ""} en tus equipos
            {atRiskCount > 0 && (
              <span className="ml-2 text-red-400 font-semibold">
                · {atRiskCount} en riesgo
              </span>
            )}
          </p>
        </div>
        <Users size={20} className="shrink-0 text-slate-600 mt-1" />
      </div>

      {/* ── Filtros ── */}
      <div className="space-y-3">

        {/* Búsqueda */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#818cf8]/60 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* ── Filtros de deporte — scroll horizontal sin scrollbar (#3) ── */}
        {/* -mx-4 + px-4 extiende hasta el borde en móvil para permitir scroll edge-to-edge */}
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

        {/* ── Filtros de zona — scroll horizontal sin scrollbar (#3) ── */}
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

      {/* ── Vista móvil: tarjetas cristal (#2) — ocultas en md+ ── */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState hasAthletes={athletes.length > 0} />
        ) : (
          filtered.map((athlete) => {
            const zone = athlete.latest_acwr
              ? acwrZones[athlete.latest_acwr.risk_zone]
              : null;
            return (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                zone={zone}
                sportLabels={sportLabels}
              />
            );
          })
        )}
      </div>

      {/* ── Vista desktop: tabla — oculta en móvil (#2) ── */}
      <div className="hidden md:block rounded-2xl overflow-hidden border border-white/[0.09] bg-white/[0.025] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80">
              <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                Atleta
              </th>
              <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                Equipo
              </th>
              <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                Deporte
              </th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                ACWR
              </th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                Aguda
              </th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                Crónica
              </th>
              <th className="text-center px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                Zona
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState hasAthletes={athletes.length > 0} />
                </td>
              </tr>
            ) : (
              filtered.map((athlete) => {
                const zone = athlete.latest_acwr
                  ? acwrZones[athlete.latest_acwr.risk_zone]
                  : null;

                return (
                  <tr
                    key={athlete.id}
                    className="border-b border-slate-800/50 hover:bg-white/[0.02] transition group"
                  >
                    {/* Nombre + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: (zone?.color ?? "#818cf8") + "1a",
                            color: zone?.color ?? "#818cf8",
                          }}
                        >
                          {athlete.full_name
                            .split(" ")
                            .map((n: string) => n[0] ?? "")
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-slate-100 font-medium leading-tight">
                            {athlete.full_name}
                          </p>
                          <p className="text-slate-500 text-xs">{athlete.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {(athlete as any).team_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {athlete.sport ? sportLabels[athlete.sport] ?? athlete.sport : "—"}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-bold tabular-nums"
                      style={{ color: zone?.color }}
                    >
                      {athlete.latest_acwr?.acwr_ratio.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300 tabular-nums">
                      {athlete.latest_acwr?.acute_load.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300 tabular-nums">
                      {athlete.latest_acwr?.chronic_load.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {zone ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            color: zone.color,
                            backgroundColor: zone.color + "22",
                          }}
                        >
                          {zone.label}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">Sin datos</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/athletes/${athlete.id}`}
                        className="text-slate-600 group-hover:text-[#818cf8] transition-colors"
                      >
                        <ChevronRight size={17} />
                      </Link>
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
