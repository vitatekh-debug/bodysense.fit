"use client";

import { useRouter } from "next/navigation";
import {
  AreaChart, Area,
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
  const ratio   = d.acwr_ratio   as number | null;
  const acute   = d.acute_load   as number | null;
  const chronic = d.chronic_load as number | null;
  const loadColor =
    (ratio ?? 0) > 1.5 ? "#c0492f"
    : (ratio ?? 0) > 1.3 ? "#d9902a"
    : "#4a86b0";
  return (
    <div className="rounded-xl border border-[#e4d8c4] bg-[#fdf9f2] p-3 text-xs shadow-2xl">
      <p className="text-[#8a7660] mb-2 font-medium">
        {new Date(String(d.date)).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
      </p>
      {ratio != null && (
        <p className="font-bold">
          ACWR <span style={{ color: "#c65f3f" }}>{ratio.toFixed(2)}</span>
        </p>
      )}
      {acute != null && (
        <p className="text-[#8a7660] mt-0.5">
          Aguda <span style={{ color: loadColor }}>{acute.toFixed(0)} UA</span>
        </p>
      )}
      {chronic != null && (
        <p className="text-[#8a7660]">
          Crónica <span className="text-teal-400">{chronic.toFixed(0)} UA</span>
        </p>
      )}
    </div>
  );
};

const WeeklyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#f7efe2] border border-[#d6c6ac] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[#5d4c3a] font-semibold mb-1">Semana del {label}</p>
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

  // Color dinámico de la línea de Carga Aguda según el último ACWR
  const lastAcwr = acwrHistory.at(-1)?.acwr_ratio ?? 0;
  const acuteColor =
    lastAcwr > 1.5 ? "#c0492f"
    : lastAcwr > 1.3 ? "#d9902a"
    : "#4a86b0";

  // Pre-procesar: reemplazar 0 → null para que connectNulls salte huecos suavemente
  const acwrChartData = acwrHistory.map((p) => ({
    ...p,
    acwr_ratio:   p.acwr_ratio   > 0 ? p.acwr_ratio   : null,
    acute_load:   p.acute_load   > 0 ? p.acute_load   : null,
    chronic_load: p.chronic_load > 0 ? p.chronic_load : null,
  }));

  // Techo del eje derecho (UA): nearest-500 con 15% de headroom, mínimo 1000
  const maxAcuteLoad  = Math.max(0, ...acwrHistory.map((p) => p.acute_load));
  const loadAxisCeil  = Math.max(1000, Math.ceil((maxAcuteLoad * 1.15) / 500) * 500);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#3a2c1e]">Análisis de Carga</h1>
        <p className="text-[#8a7660] text-sm mt-1">
          ACWR, volumen e intensidad · últimos 60 días
        </p>
      </div>

      {/* Athlete selector */}
      {athletes.length === 0 ? (
        <div className="bg-surface border border-[#e4d8c4] rounded-xl p-8 text-center text-[#8a7660]">
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
                    : "bg-[#f7efe2] border-[#e4d8c4] text-[#8a7660] hover:text-[#3a2c1e]"
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
            <div className="bg-surface border border-[#e4d8c4] rounded-xl p-8 text-center text-[#8a7660]">
              Sin datos para este atleta en los últimos 60 días. Registra sesiones y sRPE.
            </div>
          ) : hasData ? (
            <div className="space-y-6">
              {/* ACWR trend */}
              {acwrHistory.length > 0 && (
                <div className="bg-surface border border-[#e4d8c4] rounded-xl p-6">
                  <h2 className="text-xs font-bold text-[#8a7660] uppercase tracking-widest mb-4">
                    Evolución ACWR
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={acwrChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="la-acwr-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#c65f3f" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#c65f3f" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="la-acute-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={acuteColor} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={acuteColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#8a7660", fontSize: 10 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      {/* Eje izquierdo — Ratio ACWR (0–3) */}
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        domain={[0, 3]}
                        ticks={[0, 0.8, 1.3, 1.5, 2.0, 3.0]}
                        tick={{ fill: "#c65f3f", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v.toFixed(1)}
                        width={30}
                      />

                      {/* Eje derecho — Carga Aguda en UA */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, loadAxisCeil]}
                        tick={{ fill: acuteColor, fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        tickCount={5}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                        width={34}
                      />

                      <Tooltip content={<AcwrTooltip />} />

                      {/* Líneas de referencia ligadas al eje izquierdo (ACWR) */}
                      <ReferenceLine yAxisId="left" y={0.8} stroke="#b0a08c" strokeDasharray="3 3" />
                      <ReferenceLine yAxisId="left" y={1.3} stroke="#6f9c4a" strokeDasharray="3 3" />
                      <ReferenceLine yAxisId="left" y={1.5} stroke="#d9902a" strokeDasharray="3 3" />

                      {/* Ratio ACWR → eje izquierdo */}
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="acwr_ratio"
                        name="ACWR"
                        stroke="#c65f3f"
                        strokeWidth={3}
                        fill="url(#la-acwr-grad)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#c65f3f", stroke: "#fdf9f2", strokeWidth: 2 }}
                        connectNulls
                        isAnimationActive
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      />

                      {/* Carga Aguda → eje derecho */}
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="acute_load"
                        name="Aguda"
                        stroke={acuteColor}
                        strokeWidth={2}
                        fill="url(#la-acute-grad)"
                        dot={false}
                        strokeOpacity={0.85}
                        connectNulls
                        isAnimationActive
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  {/* Zone legend */}
                  <div className="mt-3 flex gap-4 text-xs text-[#8a7660] justify-end">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#efe4d2] inline-block"/>&lt;0.8 Bajo</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#6f9c4a] inline-block"/>0.8–1.3 Óptimo</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#d9902a] inline-block"/>1.3–1.5 Alto</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#c0492f] inline-block"/>&gt;1.5 Muy Alto</span>
                  </div>
                </div>
              )}

              {/* Weekly load */}
              {weeklyLoads.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Volume (duration minutes) */}
                  <div className="bg-surface border border-[#e4d8c4] rounded-xl p-6">
                    <h2 className="text-xs font-bold text-[#8a7660] uppercase tracking-widest mb-4">
                      Volumen Semanal (min)
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weeklyLoads} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="la-vol-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#c65f3f" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#c65f3f" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fill: "#8a7660", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#8a7660", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<WeeklyTooltip />} />
                        <Bar
                          dataKey="volume"
                          name="Volumen (min)"
                          fill="url(#la-vol-grad)"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive
                          animationDuration={1200}
                          animationEasing="ease-in-out"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* sRPE (internal load) */}
                  <div className="bg-surface border border-[#e4d8c4] rounded-xl p-6">
                    <h2 className="text-xs font-bold text-[#8a7660] uppercase tracking-widest mb-4">
                      Carga Interna Semanal (sRPE)
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weeklyLoads} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="la-srpe-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fill: "#8a7660", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#8a7660", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<WeeklyTooltip />} />
                        <Bar
                          dataKey="srpe"
                          name="sRPE"
                          fill="url(#la-srpe-grad)"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive
                          animationDuration={1200}
                          animationEasing="ease-in-out"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Wellness trend */}
              {wellnessTrend.length > 0 && (
                <div className="bg-surface border border-[#e4d8c4] rounded-xl p-6">
                  <h2 className="text-xs font-bold text-[#8a7660] uppercase tracking-widest mb-4">
                    Tendencia Wellness
                  </h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={wellnessTrend} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="la-fatigue-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="la-mood-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6f9c4a" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6f9c4a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#8a7660", fontSize: 10 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 10]} tick={{ fill: "#8a7660", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#fdf9f2", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                        labelStyle={{ color: "#8a7660" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, color: "#8a7660" }} />
                      <Area
                        type="monotone"
                        dataKey="fatigue"
                        name="Fatiga"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        fill="url(#la-fatigue-grad)"
                        dot={false}
                        isAnimationActive
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      />
                      <Area
                        type="monotone"
                        dataKey="mood"
                        name="Ánimo"
                        stroke="#6f9c4a"
                        strokeWidth={3}
                        fill="url(#la-mood-grad)"
                        dot={false}
                        isAnimationActive
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      />
                      <Line
                        type="monotone"
                        dataKey="sleep_hours"
                        name="Horas sueño"
                        stroke="#9b6bbf"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 2"
                        isAnimationActive
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
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
