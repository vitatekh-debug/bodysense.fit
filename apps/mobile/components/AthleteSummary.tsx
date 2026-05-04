/**
 * AthleteSummary — Bodysense Mobile
 *
 * Native single-column version of the web DashboardCommandCenter.
 * Uses react-native-svg for the ACWR sparkline (no Skia dependency needed).
 *
 * Props:
 *   snapshots  — up to 30 AcwrSnapshot rows ordered DESC by date
 *   wellness   — today's DailyWellness row (optional)
 *   name       — athlete display name
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line as SvgLine,
  Text as SvgText,
} from "react-native-svg";
import { ACWR_ZONES } from "@vitatekh/shared";
import type { AcwrSnapshot, DailyWellness } from "@vitatekh/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AthleteSummaryProps {
  snapshots: AcwrSnapshot[];
  wellness?: DailyWellness | null;
  name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_WIDTH  = 320;
const CHART_HEIGHT = 120;
const CHART_PAD_L  = 8;
const CHART_PAD_R  = 8;
const CHART_PAD_T  = 8;
const CHART_PAD_B  = 20;

const INNER_W = CHART_WIDTH  - CHART_PAD_L - CHART_PAD_R;
const INNER_H = CHART_HEIGHT - CHART_PAD_T  - CHART_PAD_B;

// Y-axis range: 0 → 2.0 (covers all zones comfortably)
const Y_MIN = 0;
const Y_MAX = 2.0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toX(index: number, total: number): number {
  if (total <= 1) return CHART_PAD_L + INNER_W / 2;
  return CHART_PAD_L + (index / (total - 1)) * INNER_W;
}

function toY(value: number): number {
  const clamped = Math.min(Math.max(value, Y_MIN), Y_MAX);
  const ratio   = (clamped - Y_MIN) / (Y_MAX - Y_MIN);
  return CHART_PAD_T + INNER_H * (1 - ratio);
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    // Smooth cubic bezier between adjacent points
    const prev = points[i - 1];
    const curr = points[i];
    const cpX  = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function buildAreaPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const bottom = CHART_PAD_T + INNER_H;
  const line   = buildPath(points);
  const first  = points[0];
  const last   = points[points.length - 1];
  return `${line} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}

function zoneColorForRatio(ratio: number): string {
  if (ratio < 0.8)  return ACWR_ZONES.low.color;
  if (ratio < 1.3)  return ACWR_ZONES.optimal.color;
  if (ratio < 1.5)  return ACWR_ZONES.high.color;
  return ACWR_ZONES.very_high.color;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecoveryBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = Math.min(Math.max(value / maxValue, 0), 1);
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>
        {value}/{maxValue}
      </Text>
    </View>
  );
}

function MiniStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>
        {value}
        {unit ? <Text style={styles.miniStatUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ─── ACWR Sparkline ───────────────────────────────────────────────────────────

function AcwrSparkline({ snapshots }: { snapshots: AcwrSnapshot[] }) {
  // snapshots arrive DESC; reverse for left-to-right
  const ordered = useMemo(
    () => [...snapshots].reverse().slice(-30),
    [snapshots]
  );

  const points = useMemo(
    () =>
      ordered.map((s, i) => ({
        x: toX(i, ordered.length),
        y: toY(s.acwr_ratio),
      })),
    [ordered]
  );

  const linePath = useMemo(() => buildPath(points), [points]);
  const areaPath = useMemo(() => buildAreaPath(points), [points]);

  // Zone reference lines (y positions)
  const yLow     = toY(0.8);
  const yOptimal = toY(1.3);
  const yHigh    = toY(1.5);

  const xStart = CHART_PAD_L;
  const xEnd   = CHART_PAD_L + INNER_W;

  return (
    <View style={styles.sparklineWrap}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="acwrGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#818cf8" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#818cf8" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Zone reference lines */}
        <SvgLine x1={xStart} y1={yLow}     x2={xEnd} y2={yLow}     stroke={ACWR_ZONES.low.color}       strokeWidth={0.7} strokeDasharray="4,3" opacity={0.5} />
        <SvgLine x1={xStart} y1={yOptimal} x2={xEnd} y2={yOptimal} stroke={ACWR_ZONES.optimal.color}   strokeWidth={0.7} strokeDasharray="4,3" opacity={0.5} />
        <SvgLine x1={xStart} y1={yHigh}    x2={xEnd} y2={yHigh}    stroke={ACWR_ZONES.high.color}      strokeWidth={0.7} strokeDasharray="4,3" opacity={0.5} />

        {/* Zone labels */}
        <SvgText x={xEnd + 2} y={yLow - 2}     fontSize="7" fill={ACWR_ZONES.low.color}     opacity={0.7}>0.8</SvgText>
        <SvgText x={xEnd + 2} y={yOptimal - 2} fontSize="7" fill={ACWR_ZONES.optimal.color} opacity={0.7}>1.3</SvgText>
        <SvgText x={xEnd + 2} y={yHigh - 2}    fontSize="7" fill={ACWR_ZONES.high.color}    opacity={0.7}>1.5</SvgText>

        {/* Area fill */}
        {areaPath ? (
          <Path d={areaPath} fill="url(#acwrGrad)" />
        ) : null}

        {/* Line */}
        {linePath ? (
          <Path d={linePath} stroke="#818cf8" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* Latest dot */}
        {points.length > 0 && (
          <Path
            d={`M ${points[points.length - 1].x} ${points[points.length - 1].y} a 3 3 0 1 0 0.001 0`}
            fill={zoneColorForRatio(ordered[ordered.length - 1]?.acwr_ratio ?? 0)}
            stroke="#0F172A"
            strokeWidth={1.5}
          />
        )}

        {/* X-axis date labels (first + last) */}
        {ordered.length > 0 && (
          <>
            <SvgText x={CHART_PAD_L} y={CHART_HEIGHT - 4} fontSize="8" fill="#64748B" textAnchor="start">
              {formatDate(ordered[0].date)}
            </SvgText>
            <SvgText x={CHART_PAD_L + INNER_W} y={CHART_HEIGHT - 4} fontSize="8" fill="#64748B" textAnchor="end">
              {formatDate(ordered[ordered.length - 1].date)}
            </SvgText>
          </>
        )}
      </Svg>

      {/* Legend */}
      <View style={styles.legendRow}>
        {Object.entries(ACWR_ZONES).map(([key, zone]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: zone.color }]} />
            <Text style={styles.legendText}>{zone.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AthleteSummary({ snapshots, wellness, name }: AthleteSummaryProps) {
  const latest   = snapshots[0] ?? null;
  const zone     = latest ? ACWR_ZONES[latest.risk_zone] : null;

  const displayAcwr =
    latest && isFinite(latest.acwr_ratio) && !isNaN(latest.acwr_ratio)
      ? latest.acwr_ratio.toFixed(2)
      : "—";

  const acuteDisplay   = latest ? Math.round(latest.acute_load).toString()   : "—";
  const chronicDisplay = latest ? Math.round(latest.chronic_load).toString() : "—";

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{name ?? "Atleta"}</Text>
        <Text style={styles.headerDate}>{today}</Text>
      </View>

      {/* ── ACWR Hero ── */}
      <View style={[styles.card, styles.heroCard]}>
        <Text style={styles.sectionLabel}>ÍNDICE ACWR</Text>

        <View style={styles.heroRow}>
          {/* Big number */}
          <View>
            <Text style={[styles.heroValue, { color: zone?.color ?? "#94A3B8" }]}>
              {displayAcwr}
            </Text>
            <Text style={styles.heroSub}>Ratio Agudo/Crónico</Text>
          </View>

          {/* Zone badge */}
          {zone && (
            <View style={[styles.zoneBadge, { borderColor: zone.color, backgroundColor: zone.color + "20" }]}>
              <Text style={[styles.zoneBadgeText, { color: zone.color }]}>
                {zone.label.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Zone band description */}
        <View style={styles.zoneBandRow}>
          {Object.entries(ACWR_ZONES).map(([key, z]) => (
            <View
              key={key}
              style={[
                styles.zoneBand,
                latest?.risk_zone === key && { backgroundColor: z.color + "30", borderColor: z.color },
              ]}
            >
              <View style={[styles.zoneBandDot, { backgroundColor: z.color }]} />
              <Text style={styles.zoneBandLabel}>{z.min === 0 ? `<${z.max}` : z.max === Infinity ? `>${z.min}` : `${z.min}–${z.max}`}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Sparkline Chart ── */}
      {snapshots.length > 1 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>HISTORIAL (ÚLTIMOS {Math.min(snapshots.length, 30)} DÍAS)</Text>
          <AcwrSparkline snapshots={snapshots} />
        </View>
      ) : null}

      {/* ── Recovery Card ── */}
      {wellness && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>RECUPERACIÓN HOY</Text>
          <RecoveryBar
            label="Fatiga"
            value={wellness.fatigue}
            maxValue={10}
            color="#EF4444"
          />
          <RecoveryBar
            label="Sueño"
            value={wellness.sleep_hours}
            maxValue={9}
            color="#22C55E"
          />
          <RecoveryBar
            label="Calidad sueño"
            value={wellness.sleep_quality}
            maxValue={5}
            color="#6366F1"
          />
          <RecoveryBar
            label="Ánimo"
            value={wellness.mood}
            maxValue={5}
            color="#F59E0B"
          />
        </View>
      )}

      {/* ── Load Mini-Stats ── */}
      <View style={[styles.card, styles.statsRow]}>
        <MiniStat label="Carga Aguda (7d)" value={acuteDisplay} unit="UA" />
        <View style={styles.statsDivider} />
        <MiniStat label="Carga Crónica (28d)" value={chronicDisplay} unit="UA" />
      </View>

      {/* ── Recent History ── */}
      {snapshots.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ÚLTIMOS REGISTROS</Text>
          {snapshots.slice(0, 7).map((s) => {
            const z = ACWR_ZONES[s.risk_zone];
            return (
              <View key={s.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{formatDate(s.date)}</Text>
                <View style={[styles.historyBadge, { backgroundColor: z.color + "25" }]}>
                  <Text style={[styles.historyBadgeText, { color: z.color }]}>
                    {s.acwr_ratio.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.historyZone, { color: z.color }]}>{z.label}</Text>
                <View style={styles.historyBarWrap}>
                  <View
                    style={[
                      styles.historyBar,
                      {
                        width: `${Math.min((s.acwr_ratio / 2) * 100, 100)}%`,
                        backgroundColor: z.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* bottom breathing room */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    padding: 16,
    gap: 12,
  },

  // ── Header ──
  header: {
    marginBottom: 4,
  },
  headerName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F1F5F9",
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 13,
    color: "#64748B",
    textTransform: "capitalize",
    marginTop: 2,
  },

  // ── Cards ──
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1.5,
  },

  // ── Hero ACWR ──
  heroCard: {
    gap: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroValue: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 60,
  },
  heroSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  zoneBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  zoneBandRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  zoneBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  zoneBandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  zoneBandLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },

  // ── Sparkline ──
  sparklineWrap: {
    alignItems: "center",
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: "#64748B",
  },

  // ── Recovery bars ──
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    width: 96,
    fontSize: 12,
    color: "#94A3B8",
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#0F172A",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barValue: {
    width: 32,
    fontSize: 11,
    color: "#64748B",
    textAlign: "right",
  },

  // ── Mini stats ──
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  miniStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  miniStatValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  miniStatUnit: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  miniStatLabel: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  statsDivider: {
    width: 1,
    height: 48,
    backgroundColor: "#334155",
  },

  // ── History ──
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  historyDate: {
    width: 36,
    fontSize: 11,
    color: "#64748B",
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 44,
    alignItems: "center",
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyZone: {
    fontSize: 10,
    fontWeight: "600",
    width: 80,
  },
  historyBarWrap: {
    flex: 1,
    height: 4,
    backgroundColor: "#0F172A",
    borderRadius: 2,
    overflow: "hidden",
  },
  historyBar: {
    height: "100%",
    borderRadius: 2,
  },
});
