"use client";

/**
 * MetricTrendChart — línea temporal genérica para la evolución de una métrica
 * (WBLT, RSI de Bosco, T-Test, etc.) a lo largo de las semanas.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface TrendPoint {
  date: string;    // ISO
  value: number | null;
}

interface Props {
  title: string;
  unit: string;
  color: string;
  data: TrendPoint[];
  /** Umbral clínico opcional (línea de referencia punteada) */
  benchmark?: { value: number; label: string };
  /** true = valores más altos son mejores (para el tinte de la última medición) */
  higherIsBetter?: boolean;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export default function MetricTrendChart({
  title,
  unit,
  color,
  data,
  benchmark,
}: Props) {
  const clean = data.filter((d) => d.value != null);

  const latest = clean.length > 0 ? clean[clean.length - 1]!.value : null;
  const previous = clean.length > 1 ? clean[clean.length - 2]!.value : null;
  const delta =
    latest != null && previous != null ? latest - previous : null;

  return (
    <div className="rounded-2xl border border-[#e4d8c4] bg-[#fdf9f2] p-5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7660]">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-black tabular-nums" style={{ color }}>
            {latest != null ? latest.toFixed(latest % 1 === 0 ? 0 : 2) : "—"}
            <span className="ml-1 text-xs font-medium text-[#b0a08c]">{unit}</span>
          </p>
        </div>
        {delta != null && delta !== 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
            style={{
              color: delta > 0 ? "#6f9c4a" : "#c0492f",
              backgroundColor: (delta > 0 ? "#6f9c4a" : "#c0492f") + "1a",
            }}
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>

      {clean.length < 2 ? (
        <div className="h-[140px] flex items-center justify-center">
          <p className="text-[#b0a08c] text-xs text-center max-w-[200px]">
            Registra al menos 2 evaluaciones para ver la tendencia.
          </p>
        </div>
      ) : (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={clean} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fill: "#b0a08c", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#b0a08c", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              {benchmark && (
                <ReferenceLine
                  y={benchmark.value}
                  stroke="#8a7660"
                  strokeDasharray="4 4"
                  label={{
                    value: benchmark.label,
                    fill: "#8a7660",
                    fontSize: 9,
                    position: "insideTopRight",
                  }}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "#fdf9f2",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(l) => fmtDate(String(l))}
                formatter={(v: any) => [`${v} ${unit}`, title]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color, stroke: "#fdf9f2", strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive
                animationDuration={700}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
