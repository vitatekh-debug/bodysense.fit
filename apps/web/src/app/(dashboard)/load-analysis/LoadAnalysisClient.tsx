"use client";

import { useRouter } from "next/navigation";
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  athletes: { id: string; full_name: string; sport: string | null }[];
  selectedId: string | null;
  acwrHistory: {
    date: string;
    acwr_ratio: number;
    acute_load: number;
    chronic_load: number;
    risk_zone: string;
  }[];
  weeklyLoads: {
    week: string;
    volume: number;
    srpe: number;
    avgIntensity: number;
    count: number;
  }[];
  wellnessTrend: {
    date: string;
    fatigue: number;
    sleep_hours: number;
    mood: number;
  }[];
  sportLabels: Record<string, string>;
}

const AcwrTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-1">{d.date}</p>
      <p className="text-indigo-400 font-bold">ACWR: {d.acwr_ratio.toFixed(2)}</p>
      <p className="text-blue-400">Aguda: {d.acute_load.toFixed(0)} UA</p>
      <p className="text-teal-400">Crónica: {d.chronic_load.toFixed(0)} UA</p>
    </div>
  );
};

const WeeklyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-1">Semana del {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(0) : p.value}
        </p>
      ))}
    </div>
  );
};

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function LoadAnalysisClient({
  athletes,
  selectedId,
  acwrHistory,
  weeklyLoads,
  wellnessTrend,
  sportLabels,
}: Props) {
  const router = useRouter();

  function selectAthlete(id: string) {
    router.push(`/load-analysis?athlete=${id}`);
  }

  const hasData = acwrHistory.length > 0 || weeklyLoads.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-100">Análisis de Carga</h1>
        <p className="text-slate-400 text-sm mt-1">
          ACWR, volumen e intensidad · últimos 60 días
        </p>
      </div>

      {/* Athlete selector */}
      {athletes.length === 0 ? (
        <div className="bg-surface border border-slate-700 rounded-xl p-8 text-center text-slate-500">
          No tienes atletas registrados en tus equipos.
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {athletes.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAthlete(a.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                  selectedId === a.id
                    ? "bg-brand/20 border-brand/40 text-brand-light"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {a.full_name}
                {a.sport && (
                  <span className="ml-1.5 text-xs opacity-60">
                    · {sportLabels[a.sport] ?? a.sport}
                  </span>
                )}
              </button>
            ))}
          </div>

          {!hasData && selectedId ? (
            <div className="bg-surface border border-slate-700 rounded-xl p-8 text-center text-slate-500">
              Sin datos para este atleta en los últimos 60 días. Registra sesiones y sRPE.
            </div>
          ) : hasData ? (
            <div className="space-y-6">
              {/* ACWR trend */}
              {acwrHistory.length > 0 && (
                <div className="bg-surface border border-slate-700 rounded-xl p-6">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Evolución ACWR
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={acwrHistory} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 2.2]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<AcwrTooltip />} />
                      <ReferenceLine y={0.8} stroke="#475569" strokeDasharray="3 3" />
                      <ReferenceLine y={1.3} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="acwr_ratio" name="ACWR" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="acute_load" name="Aguda" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeOpacity={0.5} />
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Zone legend */}
                  <div className="mt-3 flex gap-4 text-xs text-slate-500 justify-end">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-500 inline-block"/>&lt;0.8 Bajo</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block"/>0.8–1.3 Óptimo</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block"/>1.3–1.5 Alto</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block"/>&gt;1.5 Muy Alto</span>
                  </div>
                </div>
              )}

              {/* Weekly load */}
              {weeklyLoads.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Volume (duration minutes) */}
                  <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Volumen Semanal (min)
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weeklyLoads} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<WeeklyTooltip />} />
                        <Bar dataKey="volume" name="Volumen (min)" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* sRPE (internal load) */}
                  <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Carga Interna Semanal (sRPE)
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weeklyLoads} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<WeeklyTooltip />} />
                        <Bar dataKey="srpe" name="sRPE" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Wellness trend */}
              {wellnessTrend.length > 0 && (
                <div className="bg-surface border border-slate-700 rounded-xl p-6">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Tendencia Wellness
                  </h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={wellnessTrend} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#94a3b8" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                      <Line type="monotone" dataKey="fatigue" name="Fatiga" stroke="#f43f5e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="mood" name="Ánimo" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="sleep_hours" name="Horas sueño" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
