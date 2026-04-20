"use client";

import { useState } from "react";
import Link from "next/link";
import type { AthleteWithAcwr, AcwrRiskZone } from "@vitatekh/shared";
import { Search, ChevronRight, Users } from "lucide-react";

type AcwrZoneInfo = { label: string; color: string; min: number; max: number };

interface Props {
  athletes: AthleteWithAcwr[];
  acwrZones: Record<AcwrRiskZone, AcwrZoneInfo>;
  sportLabels: Record<string, string>;
}

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

export default function AthletesClient({ athletes, acwrZones, sportLabels }: Props) {
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  const filtered = athletes.filter((a) => {
    const matchesSearch = a.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesSport = sportFilter === "all" || a.sport === sportFilter;
    const matchesZone =
      zoneFilter === "all" || a.latest_acwr?.risk_zone === zoneFilter;
    return matchesSearch && matchesSport && matchesZone;
  });

  const atRiskCount = athletes.filter(
    (a) => a.latest_acwr?.risk_zone === "high" || a.latest_acwr?.risk_zone === "very_high"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-100">Atletas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {athletes.length} atleta{athletes.length !== 1 ? "s" : ""} en tus equipos
            {atRiskCount > 0 && (
              <span className="ml-2 text-red-400 font-semibold">
                · {atRiskCount} en riesgo
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Users size={20} />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Sport filter */}
          <div className="flex gap-1.5 flex-wrap">
            {SPORT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setSportFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  sportFilter === f.key
                    ? "bg-brand/20 text-brand-light border border-brand/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Zone filter */}
          <div className="flex gap-1.5 flex-wrap ml-auto">
            {ZONE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setZoneFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  zoneFilter === f.key
                    ? "bg-slate-700 text-slate-100 border border-slate-500"
                    : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl overflow-hidden border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Equipo</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Deporte</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">ACWR</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Carga Aguda</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Carga Crónica</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Zona</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-slate-500">
                  {athletes.length === 0
                    ? "No tienes atletas registrados. Crea un equipo e invita atletas."
                    : "No hay atletas que coincidan con los filtros."}
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
                    className="border-b border-slate-800 hover:bg-slate-800/40 transition group"
                  >
                    {/* Name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand-light text-xs font-bold flex-shrink-0">
                          {athlete.full_name
                            .split(" ")
                            .map((n: string) => n[0] ?? "")
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-slate-100 font-medium">{athlete.full_name}</p>
                          <p className="text-slate-500 text-xs">{athlete.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {(athlete as any).team_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {athlete.sport ? sportLabels[athlete.sport] ?? athlete.sport : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: zone?.color }}>
                      {athlete.latest_acwr?.acwr_ratio.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {athlete.latest_acwr?.acute_load.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {athlete.latest_acwr?.chronic_load.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {zone ? (
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-full"
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
                        className="text-slate-600 group-hover:text-brand-light transition"
                      >
                        <ChevronRight size={18} />
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
