"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  acwr_ratio: number;
  acute_load: number;
  chronic_load: number;
  risk_zone: string;
}

interface Props {
  data: DataPoint[];
}

function zoneColor(ratio: number): string {
  if (ratio < 0.8) return "#64748b";
  if (ratio <= 1.3) return "#22c55e";
  if (ratio <= 1.5) return "#f59e0b";
  return "#ef4444";
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = zoneColor(payload.acwr_ratio);
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#1e293b" strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DataPoint;
  const color = zoneColor(d.acwr_ratio);
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-2">{d.date}</p>
      <p style={{ color }} className="font-bold text-base">ACWR {d.acwr_ratio.toFixed(2)}</p>
      <p className="text-slate-400 mt-1">Carga aguda: <span className="text-slate-200">{d.acute_load.toFixed(0)} UA</span></p>
      <p className="text-slate-400">Carga crónica: <span className="text-slate-200">{d.chronic_load.toFixed(0)} UA</span></p>
    </div>
  );
};

export default function AcwrHistoryChart({ data }: Props) {
  // Color dinámico del área basado en la zona del último punto
  const lastRatio = data.at(-1)?.acwr_ratio ?? 0;
  const areaColor =
    lastRatio > 1.5 ? "#ef4444"
    : lastRatio > 1.3 ? "#f59e0b"
    : lastRatio > 0.8 ? "#6366f1"
    : "#64748b";

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="acwrh-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={areaColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
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
        <YAxis
          domain={[0, 2.2]}
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickCount={6}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Zone reference lines */}
        <ReferenceLine y={0.8} stroke="#64748b" strokeDasharray="4 4" label={{ value: "0.8", fill: "#64748b", fontSize: 10 }} />
        <ReferenceLine y={1.3} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "1.3", fill: "#22c55e", fontSize: 10 }} />
        <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "1.5", fill: "#f59e0b", fontSize: 10 }} />

        <Area
          type="monotone"
          dataKey="acwr_ratio"
          stroke={areaColor}
          strokeWidth={3}
          fill="url(#acwrh-grad)"
          dot={<CustomDot />}
          activeDot={{ r: 6, fill: areaColor, stroke: "#0a0a0a", strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1200}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
