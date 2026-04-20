"use client";

import { useState } from "react";
import {
  getEvaTrafficLight,
  getHqRiskLevel,
  getPomsAlertLevel,
  getFmsRiskLevel,
  formatTmd,
  EVA_TRAFFIC_LIGHT_CONFIG,
  HQ_RISK_CONFIG,
  POMS_ALERT_CONFIG,
  FMS_PATTERNS,
  FMS_SCORE_LABELS,
  SPORT_LABELS,
} from "@vitatekh/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AthleteSmcp {
  id: string;
  full_name: string;
  sport?: string;
  latest_pain: any | null;
  latest_poms: any | null;
  latest_hq: any | null;
  latest_biomech: any | null;
}

interface Alerts {
  redPain: AthleteSmcp[];
  yellowPain: AthleteSmcp[];
  hqRisk: AthleteSmcp[];
  fmsRisk: AthleteSmcp[];
  pomsRisk: AthleteSmcp[];
}

interface Props {
  athletes: AthleteSmcp[];
  preventionSessions: any[];
  alerts: Alerts;
  initialTab: string;
}

const TABS = [
  { id: "overview", label: "Resumen SMCP" },
  { id: "pain",     label: "EVA Dolor" },
  { id: "poms",     label: "POMS" },
  { id: "hq",       label: "Ratio H/Q" },
  { id: "fms",      label: "FMS" },
  { id: "sessions", label: "Sesiones" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function NoData({ message = "Sin evaluación registrada" }: { message?: string }) {
  return <span className="text-slate-600 text-xs italic">{message}</span>;
}

// ─── EVA Traffic Light Badge ──────────────────────────────────────────────────

function EvaBadge({ score }: { score: number }) {
  const light = getEvaTrafficLight(score);
  const cfg   = EVA_TRAFFIC_LIGHT_CONFIG[light];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
    >
      <span>{score}/10</span>
      <span>•</span>
      <span>{light === "green" ? "Verde" : light === "yellow" ? "Amarillo" : "Rojo"}</span>
    </span>
  );
}

// ─── HQ Risk Badge ────────────────────────────────────────────────────────────

function HqBadge({ ratio, type }: { ratio: number; type: "conventional" | "functional" }) {
  const level = getHqRiskLevel(ratio, type);
  const cfg   = HQ_RISK_CONFIG[level];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.color + "22" }}
    >
      {ratio.toFixed(2)} {type === "conventional" ? "(conv)" : "(func)"}
    </span>
  );
}

// ─── POMS Badge ──────────────────────────────────────────────────────────────

function PomsBadge({ tmd }: { tmd: number }) {
  const level = getPomsAlertLevel(tmd);
  const cfg   = POMS_ALERT_CONFIG[level];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.color + "22" }}
    >
      TMD {formatTmd(tmd)}
    </span>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({
  count, label, color, names,
}: { count: number; label: string; color: string; names: string[] }) {
  if (count === 0) return null;
  return (
    <div
      className="border rounded-xl p-4"
      style={{ borderColor: color + "66", backgroundColor: color + "11" }}
    >
      <p className="font-semibold text-sm" style={{ color }}>
        ⚠️ {count} atleta{count > 1 ? "s" : ""} — {label}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {names.map((n) => (
          <span
            key={n}
            className="text-xs px-2 py-1 rounded-full"
            style={{ color, backgroundColor: color + "22" }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PreventionClient({
  athletes,
  preventionSessions,
  alerts,
  initialTab,
}: Props) {
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");

  const filtered = athletes.filter((a) =>
    a.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-100">
          Prevención & Monitoreo
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          SMCP — Sistema de Monitoreo de Carga y Prevención
        </p>
      </div>

      {/* Alert banners */}
      <div className="space-y-3">
        <AlertBanner
          count={alerts.redPain.length}
          label="Dolor severo (EVA ≥ 7) — detener actividad"
          color="#EF4444"
          names={alerts.redPain.map((a) => a.full_name)}
        />
        <AlertBanner
          count={alerts.pomsRisk.length}
          label="Riesgo de sobreentrenamiento (TMD > 20)"
          color="#F97316"
          names={alerts.pomsRisk.map((a) => a.full_name)}
        />
        <AlertBanner
          count={alerts.hqRisk.length}
          label="Desequilibrio H/Q — riesgo lesión isquiotibial"
          color="#F59E0B"
          names={alerts.hqRisk.map((a) => a.full_name)}
        />
        <AlertBanner
          count={alerts.fmsRisk.length}
          label="FMS ≤ 14 — riesgo de lesión por movimiento"
          color="#A78BFA"
          names={alerts.fmsRisk.map((a) => a.full_name)}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "text-indigo-400 border-indigo-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== "sessions" && (
        <input
          type="text"
          placeholder="Buscar atleta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-surface border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}

      {/* ── Tab: Resumen SMCP ─────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">EVA Dolor</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">POMS TMD</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Ratio H/Q</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">FMS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const hqLevel = a.latest_hq
                  ? getHqRiskLevel(a.latest_hq.hq_ratio, a.latest_hq.ratio_type)
                  : null;
                const fmsResult = a.latest_biomech
                  ? getFmsRiskLevel(a.latest_biomech.fms_total)
                  : null;

                return (
                  <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 text-xs font-bold flex-shrink-0">
                          {getInitials(a.full_name)}
                        </div>
                        <div>
                          <p className="text-slate-100 font-medium">{a.full_name}</p>
                          <p className="text-slate-500 text-xs">
                            {a.sport ? (SPORT_LABELS[a.sport] ?? a.sport) : "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.latest_pain
                        ? <EvaBadge score={a.latest_pain.eva_score} />
                        : <NoData />
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.latest_poms != null
                        ? <PomsBadge tmd={a.latest_poms.tmd_score} />
                        : <NoData />
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.latest_hq
                        ? <HqBadge ratio={a.latest_hq.hq_ratio} type={a.latest_hq.ratio_type} />
                        : <NoData />
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.latest_biomech ? (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            color: fmsResult?.isRisk ? "#EF4444" : "#22C55E",
                            backgroundColor: fmsResult?.isRisk ? "#EF444422" : "#22C55E22",
                          }}
                        >
                          {a.latest_biomech.fms_total}/21
                          {fmsResult?.isRisk && " ⚠"}
                        </span>
                      ) : <NoData />}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-sm">
                    No hay atletas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: EVA Dolor ────────────────────────────────────────── */}
      {tab === "pain" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {(["green", "yellow", "red"] as const).map((light) => {
              const cfg = EVA_TRAFFIC_LIGHT_CONFIG[light];
              const count = filtered.filter(
                (a) => (a.latest_pain?.traffic_light ?? "green") === light
              ).length;
              return (
                <div
                  key={light}
                  className="rounded-xl p-4 border"
                  style={{ borderColor: cfg.color + "55", backgroundColor: cfg.bgColor }}
                >
                  <p className="text-2xl font-black" style={{ color: cfg.color }}>{count}</p>
                  <p className="text-xs mt-1" style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className="text-slate-500 text-xs mt-1">{cfg.action}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">EVA</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Semáforo</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Región</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Momento</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 text-slate-100 font-medium">{a.full_name}</td>
                    <td className="px-4 py-3 text-center">
                      {a.latest_pain
                        ? <span className="text-lg font-black text-slate-100">{a.latest_pain.eva_score}</span>
                        : <NoData />
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.latest_pain ? <EvaBadge score={a.latest_pain.eva_score} /> : <NoData />}
                    </td>
                    <td className="px-4 py-3 text-slate-300 capitalize">
                      {a.latest_pain?.body_region?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">
                      {a.latest_pain?.timing?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {a.latest_pain ? formatDate(a.latest_pain.date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: POMS ─────────────────────────────────────────────── */}
      {tab === "poms" && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="grid grid-cols-3 gap-3">
            {(["normal", "warning", "overtraining_risk"] as const).map((level) => {
              const cfg = POMS_ALERT_CONFIG[level];
              return (
                <div
                  key={level}
                  className="rounded-xl p-3 border"
                  style={{ borderColor: cfg.color + "55", backgroundColor: cfg.color + "11" }}
                >
                  <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className="text-slate-500 text-xs mt-1">{cfg.description}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">TMD</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Tensión</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Depresión</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Vigor</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Fatiga</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Confusión</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const p = a.latest_poms;
                  return (
                    <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-100 font-medium">{a.full_name}</td>
                      <td className="px-4 py-3 text-center">
                        {p ? <PomsBadge tmd={p.tmd_score} /> : <NoData />}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{p?.tension ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{p?.depression ?? "—"}</td>
                      <td className="px-4 py-3 text-center font-bold"
                        style={{ color: p ? (p.vigor >= 3 ? "#22C55E" : "#F59E0B") : undefined }}>
                        {p?.vigor ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{p?.fatigue_poms ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{p?.confusion ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p ? formatDate(p.date) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-slate-600 text-xs">
            * TMD (Total Mood Disturbance) = Tensión + Depresión + Ira + Fatiga + Confusión − Vigor.
            Perfil iceberg saludable: TMD negativo con Vigor elevado.
          </p>
        </div>
      )}

      {/* ── Tab: Ratio H/Q ────────────────────────────────────────── */}
      {tab === "hq" && (
        <div className="space-y-4">
          {/* Thresholds info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-slate-700 rounded-xl p-4">
              <p className="text-slate-200 font-bold text-sm">Ratio Convencional (60°/s)</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span className="text-slate-400">≥ 0.65 — Sin riesgo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                  <span className="text-slate-400">0.60–0.65 — Límite</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span className="text-slate-400">&lt; 0.60 — En riesgo (Kannus 1994)</span>
                </div>
              </div>
            </div>
            <div className="bg-surface border border-slate-700 rounded-xl p-4">
              <p className="text-slate-200 font-bold text-sm">Ratio Funcional (180°/s)</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span className="text-slate-400">≥ 1.10 — Sin riesgo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                  <span className="text-slate-400">1.00–1.10 — Límite</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span className="text-slate-400">&lt; 1.00 — En riesgo (Croisier 2008)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Lado</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Tipo</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Cuádriceps (Nm/kg)</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Isquiotibial (Nm/kg)</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Ratio H/Q</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const h = a.latest_hq;
                  return (
                    <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-100 font-medium">{a.full_name}</td>
                      <td className="px-4 py-3 text-center text-slate-300 capitalize">{h?.side ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {h ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                            {h.ratio_type === "conventional" ? "Conv." : "Func."}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {h?.quadriceps_peak_nm_kg?.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {h?.hamstring_peak_nm_kg?.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {h ? (
                          <HqBadge ratio={h.hq_ratio} type={h.ratio_type} />
                        ) : <NoData />}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {h ? formatDate(h.date) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: FMS ──────────────────────────────────────────────── */}
      {tab === "fms" && (
        <div className="space-y-4">
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4 text-sm">
            <p className="text-amber-300 font-semibold">Sobre el FMS (Functional Movement Screen)</p>
            <p className="text-slate-400 mt-1">
              7 patrones de movimiento, cada uno puntuado 0-3 (máx. 21).
              Puntuación total <strong className="text-amber-200">≤ 14</strong> = riesgo elevado de lesión.
              Puntuación <strong className="text-amber-200">0</strong> en cualquier patrón (dolor) = señal de alerta inmediata.
            </p>
          </div>

          <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Atleta</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Riesgo</th>
                  {FMS_PATTERNS.map((p) => (
                    <th key={p.key} className="text-center px-2 py-3 text-slate-500 font-medium text-xs">
                      {p.label.split(" ").slice(0, 2).join(" ")}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const b = a.latest_biomech;
                  const patterns = b
                    ? FMS_PATTERNS.map((p) => (b as any)[p.key] as number)
                    : null;
                  const fmsResult = b ? getFmsRiskLevel(b.fms_total, patterns ?? undefined) : null;
                  return (
                    <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-slate-100 font-medium">{a.full_name}</td>
                      <td className="px-4 py-3 text-center font-black text-lg"
                        style={{ color: b ? (fmsResult?.isRisk ? "#EF4444" : "#22C55E") : undefined }}>
                        {b ? `${b.fms_total}/21` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fmsResult ? (
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-full"
                            style={{
                              color: fmsResult.isRisk ? "#EF4444" : "#22C55E",
                              backgroundColor: fmsResult.isRisk ? "#EF444422" : "#22C55E22",
                            }}
                          >
                            {fmsResult.isRisk ? "⚠ En riesgo" : "✓ OK"}
                          </span>
                        ) : <NoData />}
                      </td>
                      {FMS_PATTERNS.map((p) => {
                        const score = b ? (b as any)[p.key] as number : null;
                        const scoreColor =
                          score === null ? "#6B7280"
                          : score === 0 ? "#EF4444"
                          : score === 1 ? "#F59E0B"
                          : score === 2 ? "#3B82F6"
                          : "#22C55E";
                        return (
                          <td key={p.key} className="px-2 py-3 text-center">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                              style={{ backgroundColor: scoreColor + "33", color: scoreColor }}
                            >
                              {score ?? "—"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {b ? formatDate(b.date) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FMS Score Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(FMS_SCORE_LABELS).map(([score, label]) => {
              const colors = ["#EF4444", "#F59E0B", "#3B82F6", "#22C55E"];
              const color = colors[Number(score)] ?? "#6B7280";
              return (
                <div key={score} className="flex items-center gap-1 text-xs text-slate-400">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: color + "33", color }}
                  >
                    {score}
                  </span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Sesiones Preventivas ─────────────────────────────── */}
      {tab === "sessions" && (
        <div className="space-y-4">
          {preventionSessions.length === 0 ? (
            <div className="bg-surface border border-slate-700 rounded-xl p-12 text-center">
              <p className="text-slate-500 text-sm">
                No hay sesiones preventivas registradas aún.
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Crea sesiones desde la app móvil para asignar protocolos de ejercicio a tus atletas.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {preventionSessions.map((s) => {
                const paList: any[] = s.prevention_athletes ?? [];
                const total     = paList.length;
                const completed = paList.filter((pa: any) => !!pa.completed_at).length;
                const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
                const allDone   = total > 0 && completed === total;

                return (
                  <div
                    key={s.id}
                    className={`bg-surface border rounded-xl p-4 transition ${
                      allDone ? "border-green-800/60" : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {allDone && <span className="text-green-400 text-sm">✅</span>}
                          <p className={`font-semibold ${allDone ? "text-green-300" : "text-slate-100"}`}>
                            {s.title}
                          </p>
                        </div>
                        {s.description && (
                          <p className="text-slate-400 text-sm mt-1">{s.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-900/50 text-indigo-300">
                            {s.type === "group" ? "Grupal" : "Individual"}
                          </span>
                          {s.sport && (
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                              {SPORT_LABELS[s.sport] ?? s.sport}
                            </span>
                          )}
                        </div>

                        {/* Completion progress */}
                        {total > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-400">
                                Completado por {completed}/{total} atleta{total !== 1 ? "s" : ""}
                              </span>
                              <span className={`text-xs font-bold ${allDone ? "text-green-400" : "text-indigo-400"}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${allDone ? "bg-green-500" : "bg-indigo-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            {/* Athlete chips */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {paList.map((pa: any) => {
                                const name: string = pa.profiles?.full_name ?? "Atleta";
                                const done = !!pa.completed_at;
                                return (
                                  <span
                                    key={pa.id}
                                    title={done ? `Completado` : "Pendiente"}
                                    className="text-xs px-2 py-0.5 rounded-full border"
                                    style={{
                                      borderColor: done ? "#166534" : "#334155",
                                      backgroundColor: done ? "#0F2117" : "#1E293B",
                                      color: done ? "#4ADE80" : "#64748B",
                                    }}
                                  >
                                    {done ? "✓ " : ""}{name.split(" ")[0]}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-400 text-xs">{formatDate(s.date)}</p>
                        {total > 0 && (
                          <p className={`text-sm font-black mt-1 ${allDone ? "text-green-400" : "text-indigo-400"}`}>
                            {pct}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
