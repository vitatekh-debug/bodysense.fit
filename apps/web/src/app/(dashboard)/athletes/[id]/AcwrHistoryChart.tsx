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
import { useThemeColors, type ThemeColors } from "@/components/theme/useThemeColors";

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

/** Color de zona ACWR según el tema activo (los datos son semánticos). */
function zoneColor(ratio: number, c: ThemeColors): string {
  if (ratio < 0.8) return c.inkSoft;
  if (ratio <= 1.3) return c.success;
  if (ratio <= 1.5) return c.warning;
  return c.danger;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const c = useThemeColors();
  const color = zoneColor(payload.acwr_ratio, c);
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke={c.surfaceHigh} strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  const c = useThemeColors();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DataPoint;
  const color = zoneColor(d.acwr_ratio, c);
  return (
    <div className="bg-surface-high border border-line-strong rounded-lg p-3 text-xs shadow-xl">
      <p className="text-ink-body font-semibold mb-2">{d.date}</p>
      <p style={{ color }} className="font-bold text-base">ACWR {d.acwr_ratio.toFixed(2)}</p>
      <p className="text-ink-soft mt-1">Carga aguda: <span className="text-ink">{d.acute_load.toFixed(0)} UA</span></p>
      <p className="text-ink-soft">Carga crónica: <span className="text-ink">{d.chronic_load.toFixed(0)} UA</span></p>
    </div>
  );
};

export default function AcwrHistoryChart({ data }: Props) {
  const c = useThemeColors();

  // Color dinámico del área basado en la zona del último punto
  const lastRatio = data.at(-1)?.acwr_ratio ?? 0;
  const areaColor =
    lastRatio > 1.5 ? c.danger
    : lastRatio > 1.3 ? c.warning
    : lastRatio > 0.8 ? c.brand
    : c.inkSoft;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="acwrh-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={areaColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.line} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: c.inkSoft, fontSize: 10 }}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 2.2]}
          tick={{ fill: c.inkSoft, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickCount={6}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Zone reference lines */}
        <ReferenceLine y={0.8} stroke={c.inkSoft} strokeDasharray="4 4" label={{ value: "0.8", fill: c.inkSoft, fontSize: 10 }} />
        <ReferenceLine y={1.3} stroke={c.success} strokeDasharray="4 4" label={{ value: "1.3", fill: c.success, fontSize: 10 }} />
        <ReferenceLine y={1.5} stroke={c.warning} strokeDasharray="4 4" label={{ value: "1.5", fill: c.warning, fontSize: 10 }} />

        <Area
          type="monotone"
          dataKey="acwr_ratio"
          stroke={areaColor}
          strokeWidth={3}
          fill="url(#acwrh-grad)"
          dot={<CustomDot />}
          activeDot={{ r: 6, fill: areaColor, stroke: c.surface, strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1200}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
