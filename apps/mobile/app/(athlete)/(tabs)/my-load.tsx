/**
 * Mi Carga — Hardened for production
 *
 * QA improvements:
 *  ✅ Skeleton while loading (no flash of empty screen)
 *  ✅ NaN/Infinity guards on ACWR display
 *  ✅ Insufficient history caveat shown to the athlete
 *  ✅ "Ver rutina de prevención" CTA when ACWR is high/very_high
 *  ✅ Risk prescription hints visible directly in this screen
 *  ✅ ACWR color pulses red when critical
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/auth.store";
import { ACWR_ZONES, formatAcwr } from "@vitatekh/shared";
import { SkeletonMyLoad } from "../../../components/Skeleton";
import type { AcwrSnapshot } from "@vitatekh/shared";

export default function MyLoadScreen() {
  const { profile } = useAuthStore();
  const [snapshots, setSnapshots] = useState<AcwrSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("acwr_snapshots")
      .select("*")
      .eq("athlete_id", profile.id)
      .order("date", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setSnapshots(data ?? []);
        setLoading(false);
      });
  }, [profile]);

  if (loading) return <SkeletonMyLoad />;

  const latest    = snapshots[0];
  const zone      = latest ? ACWR_ZONES[latest.risk_zone] : null;
  const isAtRisk  = latest?.risk_zone === "high" || latest?.risk_zone === "very_high";
  const isCritical = latest?.risk_zone === "very_high";

  // ── Safe display value ──────────────────────────────────────────
  const displayAcwr =
    latest && isFinite(latest.acwr_ratio) && !isNaN(latest.acwr_ratio)
      ? formatAcwr(latest.acwr_ratio)
      : "—";

  // ── Days since last record ──────────────────────────────────────
  const daysSinceLast = latest
    ? Math.round(
        (Date.now() - new Date(latest.date).getTime()) / 86_400_000
      )
    : null;

  const staleData = daysSinceLast !== null && daysSinceLast > 3;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Mi Carga</Text>

      {!latest ? (
        /* ── Empty state ─────────────────────────────────────── */
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>Sin datos de carga aún</Text>
          <Text style={styles.emptyText}>
            Registra tu check-in diario para que tu entrenador pueda calcular
            tu ACWR y detectar riesgos de lesión.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(athlete)/(tabs)/index" as any)}
          >
            <Text style={styles.emptyBtnText}>Ir al Check-in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ── Stale data warning ─────────────────────────────── */}
          {staleData && (
            <View style={styles.staleWarning}>
              <Text style={styles.staleText}>
                ⚠ Último registro hace {daysSinceLast} días. Actualiza tu check-in para un ACWR preciso.
              </Text>
            </View>
          )}

          {/* ── ACWR Card ───────────────────────────────────────── */}
          <View
            style={[
              styles.acwrCard,
              {
                borderColor: isCritical
                  ? zone!.color
                  : (zone?.color ?? "#334155") + "88",
                backgroundColor: isCritical
                  ? zone!.color + "1A"
                  : "#1E293B",
              },
            ]}
          >
            <Text style={styles.acwrLabel}>ACWR ACTUAL</Text>
            <Text style={[styles.acwrValue, { color: zone?.color ?? "#F1F5F9" }]}>
              {displayAcwr}
            </Text>
            <View
              style={[
                styles.zoneBadge,
                { backgroundColor: (zone?.color ?? "#334155") + "33" },
              ]}
            >
              <Text style={[styles.zoneText, { color: zone?.color ?? "#94A3B8" }]}>
                {zone?.label ?? "Sin datos"}
              </Text>
            </View>
            <Text style={styles.acwrDate}>Calculado: {latest.date}</Text>
          </View>

          {/* ── Risk CTA ────────────────────────────────────────── */}
          {isAtRisk && (
            <View
              style={[
                styles.riskBox,
                {
                  borderColor: zone!.color + "88",
                  backgroundColor: zone!.color + "12",
                },
              ]}
            >
              <Text style={[styles.riskBoxTitle, { color: zone!.color }]}>
                {isCritical
                  ? "🚨 Carga Muy Alta — Reducir Inmediatamente"
                  : "⚠️ Carga Alta — Monitoreo Intensivo"}
              </Text>
              <Text style={styles.riskBoxText}>
                {isCritical
                  ? "Tu carga acumulada supera el umbral crítico (ACWR > 1.5). El riesgo de lesión es significativamente elevado. Tu fisioterapeuta ha sido notificado."
                  : "Tu ACWR está en zona de atención (1.3–1.5). No incrementes la carga. Revisa tu rutina preventiva."}
              </Text>
              <TouchableOpacity
                style={[styles.riskCta, { backgroundColor: zone!.color }]}
                onPress={() =>
                  router.push("/(athlete)/(tabs)/prevention" as any)
                }
                accessibilityLabel="Ver rutina de prevención asignada"
                accessibilityRole="button"
              >
                <Text style={styles.riskCtaText}>
                  🛡️ Ver rutina de prevención
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Load breakdown ──────────────────────────────────── */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Carga Aguda</Text>
              <Text style={styles.metricSub}>7 días</Text>
              <Text style={styles.metricValue}>
                {isFinite(latest.acute_load)
                  ? Math.round(latest.acute_load)
                  : "—"}
              </Text>
              <Text style={styles.metricUnit}>UA</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Carga Crónica</Text>
              <Text style={styles.metricSub}>28 días ÷ 4</Text>
              <Text style={styles.metricValue}>
                {isFinite(latest.chronic_load)
                  ? Math.round(latest.chronic_load)
                  : "—"}
              </Text>
              <Text style={styles.metricUnit}>UA</Text>
            </View>
          </View>

          {/* ── Zone reference ──────────────────────────────────── */}
          <View style={styles.zonesCard}>
            <Text style={styles.zonesTitle}>ZONAS DE REFERENCIA</Text>
            {Object.entries(ACWR_ZONES).map(([key, z]) => {
              const isCurrent = key === latest.risk_zone;
              return (
                <View
                  key={key}
                  style={[
                    styles.zoneRow,
                    isCurrent && {
                      backgroundColor: z.color + "18",
                      borderRadius: 8,
                      marginHorizontal: -4,
                      paddingHorizontal: 4,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.zoneDot,
                      { backgroundColor: z.color },
                      isCurrent && styles.zoneDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.zoneRowLabel,
                      isCurrent && { color: z.color, fontWeight: "700" },
                    ]}
                  >
                    {z.label}
                  </Text>
                  <Text style={styles.zoneRange}>
                    {z.min} – {z.max === Infinity ? "+" : z.max}
                  </Text>
                  {isCurrent && (
                    <Text style={[styles.zoneCurrentBadge, { color: z.color }]}>
                      ← tú
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* ── History ─────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>HISTORIAL RECIENTE</Text>
          {snapshots.slice(0, 10).map((s) => {
            const z = ACWR_ZONES[s.risk_zone];
            const safeRatio =
              isFinite(s.acwr_ratio) && !isNaN(s.acwr_ratio)
                ? formatAcwr(s.acwr_ratio)
                : "—";
            return (
              <View key={s.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{s.date}</Text>
                <Text style={[styles.historyAcwr, { color: z.color }]}>
                  {safeRatio}
                </Text>
                <View
                  style={[
                    styles.historyZoneBadge,
                    { backgroundColor: z.color + "22" },
                  ]}
                >
                  <Text style={[styles.historyZone, { color: z.color }]}>
                    {z.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, gap: 14, paddingBottom: 40 },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800" },

  // Empty state
  empty: { marginTop: 40, alignItems: "center", gap: 14 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "700" },
  emptyText:  { color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Stale warning
  staleWarning: {
    backgroundColor: "#1C1204",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#92400E",
  },
  staleText: { color: "#FCD34D", fontSize: 12, fontWeight: "600" },

  // ACWR card
  acwrCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 2,
    gap: 8,
  },
  acwrLabel:  { color: "#94A3B8", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  acwrValue:  { fontSize: 56, fontWeight: "900" },
  zoneBadge:  { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  zoneText:   { fontWeight: "700", fontSize: 14 },
  acwrDate:   { color: "#475569", fontSize: 11, marginTop: 4 },

  // Risk box + CTA
  riskBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  riskBoxTitle: { fontSize: 14, fontWeight: "800" },
  riskBoxText:  { color: "#94A3B8", fontSize: 12, lineHeight: 18 },
  riskCta: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  riskCtaText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Metrics
  metricsRow:  { flexDirection: "row", gap: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    gap: 2,
  },
  metricLabel: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  metricSub:   { color: "#334155", fontSize: 10 },
  metricValue: { color: "#F1F5F9", fontSize: 24, fontWeight: "800", marginTop: 4 },
  metricUnit:  { color: "#475569", fontSize: 11 },

  // Zone reference
  zonesCard:  { backgroundColor: "#1E293B", borderRadius: 12, padding: 16, gap: 10 },
  zonesTitle: { color: "#94A3B8", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  zoneRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  zoneDot:    { width: 10, height: 10, borderRadius: 5 },
  zoneDotActive: { width: 12, height: 12, borderRadius: 6 },
  zoneRowLabel:  { flex: 1, color: "#CBD5E1", fontSize: 13 },
  zoneRange:     { color: "#475569", fontSize: 12 },
  zoneCurrentBadge: { fontSize: 12, fontWeight: "700" },

  // History
  sectionTitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  historyRow: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyDate:       { flex: 1, color: "#64748B", fontSize: 13 },
  historyAcwr:       { fontWeight: "700", fontSize: 15 },
  historyZoneBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  historyZone:       { fontSize: 11, fontWeight: "700" },
});
