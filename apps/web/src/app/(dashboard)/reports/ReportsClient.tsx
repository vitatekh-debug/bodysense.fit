"use client";

import { useState } from "react";
import type { Prescription } from "@vitatekh/shared";

interface AthleteReport {
  id: string;
  full_name: string;
  email: string;
  sport?: string;
  latest_acwr?: { acwr_ratio: number; risk_zone: string; acute_load: number; chronic_load: number; date: string } | null;
  latest_poms?: { tmd_score: number; date: string } | null;
  latest_pain?: { eva_score: number; traffic_light: string; body_region: string; date: string } | null;
  latest_hq?:   { hq_ratio: number; ratio_type: string; risk_flag: boolean; side: string; date: string } | null;
  latest_biomech?: { fms_total: number; fms_injury_risk: boolean; date: string } | null;
  latest_wellness?: { fatigue: number; sleep_hours: number; mood: number; date: string } | null;
  prescriptions: Prescription[];
}

interface TeamReport {
  id: string;
  name: string;
  sport: string;
  athletes: AthleteReport[];
}

interface Props {
  teamsWithAthletes: TeamReport[];
  generatedAt: string;
  acwrZones: Record<string, { label: string; color: string }>;
  sportLabels: Record<string, string>;
}

export default function ReportsClient({ teamsWithAthletes, generatedAt, acwrZones, sportLabels }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const teams = selectedTeam === "all"
    ? teamsWithAthletes
    : teamsWithAthletes.filter((t) => t.id === selectedTeam);

  const totalAthletes = teams.reduce((s, t) => s + t.athletes.length, 0);
  const atRisk  = teams.flatMap((t) => t.athletes).filter(
    (a) => a.latest_acwr?.risk_zone === "high" || a.latest_acwr?.risk_zone === "very_high"
  );
  const redAlerts = teams.flatMap((t) =>
    t.athletes.flatMap((a) => a.prescriptions.filter((p) => p.alert_level === "red"))
  );

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-100">Informes</h1>
          <p className="text-slate-400 text-sm mt-1">
            Generado el {generatedAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Team filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-surface border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">Todos los equipos</option>
            {teamsWithAthletes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white text-sm font-bold px-4 py-2 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Print header (only shown when printing) */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b border-gray-300 pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Bodysense — Informe SMCP</h1>
            <p className="text-gray-500 text-sm mt-1">Generado el {generatedAt}</p>
          </div>
          <p className="text-gray-400 text-sm">Sistema de Monitoreo de Carga y Prevención</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Atletas" value={totalAthletes} color="text-slate-100" />
        <SummaryCard label="En Riesgo ACWR" value={atRisk.length} color="text-amber-400" />
        <SummaryCard label="Alertas Rojas" value={redAlerts.length} color="text-red-400" />
        <SummaryCard
          label="Con datos completos"
          value={teams.flatMap((t) => t.athletes).filter((a) =>
            a.latest_acwr && a.latest_poms && a.latest_pain
          ).length}
          color="text-green-400"
        />
      </div>

      {/* Teams */}
      {teams.map((team) => (
        <div key={team.id} className="space-y-4 print:break-before-page print:pt-4">
          {/* Team header */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-brand rounded-full" />
            <div>
              <h2 className="text-xl font-black text-slate-100">{team.name}</h2>
              <p className="text-slate-500 text-sm">
                {sportLabels[team.sport] ?? team.sport} · {team.athletes.length} atleta{team.athletes.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Athletes table */}
          <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden print:border-gray-300 print:rounded-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 print:border-gray-300">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold print:text-gray-500">Atleta</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">ACWR</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">Zona</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">EVA</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">TMD</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">H/Q</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">FMS</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-semibold print:text-gray-500">Alertas</th>
                </tr>
              </thead>
              <tbody>
                {team.athletes.map((athlete) => {
                  const zone = athlete.latest_acwr
                    ? (acwrZones[athlete.latest_acwr.risk_zone] ?? null)
                    : null;
                  const redCount  = athlete.prescriptions.filter((p) => p.alert_level === "red").length;
                  const oreCount  = athlete.prescriptions.filter((p) => p.alert_level === "orange").length;
                  const topAlert  = athlete.prescriptions[0];
                  const alertColor =
                    redCount  > 0 ? "#EF4444" :
                    oreCount > 0 ? "#F97316" :
                    athlete.prescriptions.length > 0 ? "#EAB308" : "#22C55E";

                  return (
                    <tr
                      key={athlete.id}
                      className="border-b border-slate-800 print:border-gray-200"
                    >
                      <td className="px-4 py-3">
                        <p className="text-slate-100 font-semibold print:text-gray-900">{athlete.full_name}</p>
                        <p className="text-slate-500 text-xs">{athlete.email}</p>
                      </td>
                      <td className="px-3 py-3 text-center font-black" style={{ color: zone?.color ?? "#94a3b8" }}>
                        {athlete.latest_acwr?.acwr_ratio.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {zone ? (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: zone.color, backgroundColor: zone.color + "22" }}
                          >
                            {zone.label}
                          </span>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {athlete.latest_pain ? (
                          <EvaChip
                            score={athlete.latest_pain.eva_score}
                            light={athlete.latest_pain.traffic_light}
                          />
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {athlete.latest_poms != null ? (
                          <span className={`text-xs font-bold ${
                            athlete.latest_poms.tmd_score > 7
                              ? "text-red-400"
                              : athlete.latest_poms.tmd_score > 0
                              ? "text-yellow-400"
                              : "text-green-400"
                          }`}>
                            {athlete.latest_poms.tmd_score > 0
                              ? `+${athlete.latest_poms.tmd_score}`
                              : athlete.latest_poms.tmd_score}
                          </span>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {athlete.latest_hq ? (
                          <span className={`text-xs font-bold ${
                            athlete.latest_hq.risk_flag ? "text-red-400" : "text-green-400"
                          }`}>
                            {athlete.latest_hq.hq_ratio.toFixed(3)}
                            {athlete.latest_hq.risk_flag ? " ⚠" : " ✓"}
                          </span>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {athlete.latest_biomech ? (
                          <span className={`text-xs font-bold ${
                            athlete.latest_biomech.fms_injury_risk ? "text-orange-400" : "text-green-400"
                          }`}>
                            {athlete.latest_biomech.fms_total}/21
                            {athlete.latest_biomech.fms_injury_risk ? " ⚠" : " ✓"}
                          </span>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {athlete.prescriptions.length > 0 ? (
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ color: alertColor, backgroundColor: alertColor + "22" }}
                          >
                            {athlete.prescriptions.length}
                          </span>
                        ) : (
                          <span className="text-green-400 text-xs">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Per-athlete prescriptions (for print) */}
          <div className="hidden print:block space-y-4 mt-4">
            {team.athletes
              .filter((a) => a.prescriptions.length > 0)
              .map((athlete) => (
                <div key={athlete.id} className="border border-gray-200 rounded p-4">
                  <h3 className="font-bold text-gray-900 mb-2">
                    {athlete.full_name} — Prescripciones Automáticas
                  </h3>
                  <ul className="space-y-2">
                    {athlete.prescriptions.map((p) => (
                      <li key={p.rule_id} className="flex items-start gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded mt-0.5" style={{
                          color: p.alert_level === "red" ? "#DC2626" : p.alert_level === "orange" ? "#EA580C" : "#CA8A04",
                          backgroundColor: p.alert_level === "red" ? "#FEE2E2" : p.alert_level === "orange" ? "#FFEDD5" : "#FEF9C3",
                        }}>
                          {p.alert_level.toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.protocol_name}</p>
                          <p className="text-xs text-gray-500">{p.short_message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Disclaimer */}
      <p className="text-slate-700 text-xs print:text-gray-400">
        * Las prescripciones son generadas automáticamente por el Motor de Reglas de Bodysense basado en evidencia
        científica. No sustituyen el criterio clínico del profesional.
      </p>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface rounded-xl p-5 border border-slate-700 print:border-gray-200">
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1 print:text-gray-500">{label}</p>
    </div>
  );
}

function EvaChip({ score, light }: { score: number; light: string }) {
  const colors: Record<string, string> = {
    green: "#22C55E", yellow: "#F59E0B", red: "#EF4444",
  };
  const color = colors[light] ?? "#6B7280";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: color + "22" }}>
      {score}/10
    </span>
  );
}
