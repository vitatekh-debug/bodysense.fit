import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import {
  ACWR_ZONES,
  SPORT_LABELS,
  formatAcwr,
  getRpeLabel,
} from "@vitatekh/shared";
import type {
  Profile,
  AcwrSnapshot,
  DailyWellness,
  TrainingSession,
} from "@vitatekh/shared";

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [athlete, setAthlete] = useState<Profile | null>(null);
  const [latestAcwr, setLatestAcwr] = useState<AcwrSnapshot | null>(null);
  const [recentWellness, setRecentWellness] = useState<DailyWellness[]>([]);
  const [recentSessions, setRecentSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthleteData();
  }, [id]);

  async function loadAthleteData() {
    if (!id) return;

    const [
      { data: profileData },
      { data: acwrData },
      { data: wellnessData },
      { data: sessionsData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase
        .from("acwr_snapshots")
        .select("*")
        .eq("athlete_id", id)
        .order("date", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("daily_wellness")
        .select("*")
        .eq("athlete_id", id)
        .order("date", { ascending: false })
        .limit(7),
      supabase
        .from("training_sessions")
        .select("*")
        .eq("athlete_id", id)
        .order("date", { ascending: false })
        .limit(5),
    ]);

    setAthlete(profileData);
    setLatestAcwr(acwrData);
    setRecentWellness(wellnessData ?? []);
    setRecentSessions(sessionsData ?? []);
    setLoading(false);
  }

  async function recalculateAcwr() {
    Alert.alert(
      "Recalcular ACWR",
      "Se recalculará el ACWR del atleta con los datos actuales.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recalcular",
          onPress: async () => {
            const { error } = await supabase.functions.invoke("calculate-acwr", {
              body: { athlete_id: id },
            });
            if (error) {
              Alert.alert("Error", "No se pudo recalcular el ACWR.");
            } else {
              await loadAthleteData();
              Alert.alert("✅", "ACWR actualizado correctamente.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!athlete) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Atleta no encontrado.</Text>
      </View>
    );
  }

  const zone = latestAcwr ? ACWR_ZONES[latestAcwr.risk_zone] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {athlete.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.athleteName}>{athlete.full_name}</Text>
          <Text style={styles.athleteSport}>
            {athlete.sport ? SPORT_LABELS[athlete.sport] : "Sin deporte"}
          </Text>
        </View>
      </View>

      {/* ACWR card */}
      <View style={[styles.acwrCard, { borderColor: zone?.color ?? "#334155" }]}>
        <Text style={styles.acwrLabel}>ACWR Actual</Text>
        {latestAcwr ? (
          <>
            <Text style={[styles.acwrValue, { color: zone?.color }]}>
              {formatAcwr(latestAcwr.acwr_ratio)}
            </Text>
            <View style={[styles.zoneBadge, { backgroundColor: (zone?.color ?? "#334155") + "22" }]}>
              <Text style={[styles.zoneText, { color: zone?.color }]}>{zone?.label}</Text>
            </View>
            <View style={styles.acwrMetrics}>
              <View style={styles.acwrMetric}>
                <Text style={styles.acwrMetricLabel}>Carga Aguda 7d</Text>
                <Text style={styles.acwrMetricValue}>{Math.round(latestAcwr.acute_load)} UA</Text>
              </View>
              <View style={styles.acwrMetric}>
                <Text style={styles.acwrMetricLabel}>Carga Crónica 28d</Text>
                <Text style={styles.acwrMetricValue}>{Math.round(latestAcwr.chronic_load)} UA</Text>
              </View>
            </View>
            <Text style={styles.acwrDate}>Calculado: {latestAcwr.date}</Text>
          </>
        ) : (
          <Text style={styles.noData}>Sin datos ACWR</Text>
        )}
        <TouchableOpacity style={styles.recalcBtn} onPress={recalculateAcwr}>
          <Text style={styles.recalcText}>↻ Recalcular</Text>
        </TouchableOpacity>
      </View>

      {/* Recent wellness */}
      <Text style={styles.sectionTitle}>BIENESTAR RECIENTE</Text>
      {recentWellness.length === 0 ? (
        <Text style={styles.noData}>El atleta no ha registrado check-ins.</Text>
      ) : (
        <View style={styles.wellnessTable}>
          <View style={styles.wellnessHeader}>
            <Text style={[styles.wellnessCell, styles.wellnessHead]}>Fecha</Text>
            <Text style={[styles.wellnessCell, styles.wellnessHead]}>Fatiga</Text>
            <Text style={[styles.wellnessCell, styles.wellnessHead]}>Sueño</Text>
            <Text style={[styles.wellnessCell, styles.wellnessHead]}>Ánimo</Text>
          </View>
          {recentWellness.map((w) => (
            <View key={w.id} style={styles.wellnessRow}>
              <Text style={styles.wellnessCell}>{w.date}</Text>
              <Text style={[styles.wellnessCell, { color: w.fatigue >= 7 ? "#EF4444" : "#22C55E" }]}>
                {w.fatigue}/10
              </Text>
              <Text style={styles.wellnessCell}>{w.sleep_hours}h</Text>
              <Text style={styles.wellnessCell}>{"⭐".repeat(w.mood)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent sessions */}
      <Text style={styles.sectionTitle}>ÚLTIMAS SESIONES</Text>
      {recentSessions.length === 0 ? (
        <Text style={styles.noData}>Sin sesiones registradas.</Text>
      ) : (
        recentSessions.map((s) => (
          <View key={s.id} style={styles.sessionRow}>
            <View>
              <Text style={styles.sessionDate}>{s.date}</Text>
              <Text style={styles.sessionType}>{s.session_type} · {s.phase}</Text>
            </View>
            <Text style={styles.sessionDuration}>{s.duration_min} min</Text>
          </View>
        ))
      )}

      {/* Evaluaciones SMCP */}
      <Text style={styles.sectionTitle}>EVALUACIONES CLÍNICAS</Text>
      <View style={styles.evalGrid}>
        <TouchableOpacity
          style={[styles.evalCard, { borderColor: "#6366F155" }]}
          onPress={() =>
            router.push({
              pathname: "/(professional)/register-hq",
              params: { athlete_id: id, athlete_name: athlete.full_name },
            })
          }
        >
          <Text style={styles.evalEmoji}>⚡</Text>
          <Text style={styles.evalLabel}>Ratio H/Q</Text>
          <Text style={styles.evalSub}>Dinamometría isocinética</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.evalCard, { borderColor: "#22C55E55" }]}
          onPress={() =>
            router.push({
              pathname: "/(professional)/register-fms",
              params: { athlete_id: id, athlete_name: athlete.full_name },
            })
          }
        >
          <Text style={styles.evalEmoji}>🦵</Text>
          <Text style={styles.evalLabel}>FMS</Text>
          <Text style={styles.evalSub}>Functional Movement Screen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 20 },
  centered:  { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  errorText: { color: "#94A3B8" },
  backBtn:   { marginBottom: 4 },
  backText:  { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  header:    { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#312E81",
    justifyContent: "center", alignItems: "center",
  },
  avatarText:   { color: "#818CF8", fontWeight: "800", fontSize: 20 },
  athleteName:  { color: "#F1F5F9", fontSize: 20, fontWeight: "800" },
  athleteSport: { color: "#6366F1", fontSize: 13, marginTop: 2 },
  acwrCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    gap: 10,
  },
  acwrLabel:   { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  acwrValue:   { fontSize: 44, fontWeight: "900" },
  zoneBadge:   { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, alignSelf: "flex-start" },
  zoneText:    { fontWeight: "700", fontSize: 13 },
  acwrMetrics: { flexDirection: "row", gap: 20, marginTop: 4 },
  acwrMetric:  { gap: 2 },
  acwrMetricLabel: { color: "#64748B", fontSize: 11 },
  acwrMetricValue: { color: "#F1F5F9", fontWeight: "700", fontSize: 15 },
  acwrDate:    { color: "#475569", fontSize: 11 },
  recalcBtn:   { alignSelf: "flex-end" },
  recalcText:  { color: "#6366F1", fontSize: 13, fontWeight: "600" },
  noData:      { color: "#475569", fontSize: 13 },
  sectionTitle: { color: "#475569", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginTop: 4 },
  wellnessTable: { backgroundColor: "#1E293B", borderRadius: 12, overflow: "hidden" },
  wellnessHeader: { flexDirection: "row", backgroundColor: "#0F172A", paddingVertical: 8 },
  wellnessRow:    { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#0F172A", paddingVertical: 10 },
  wellnessCell:   { flex: 1, color: "#CBD5E1", fontSize: 12, textAlign: "center" },
  wellnessHead:   { color: "#475569", fontWeight: "700" },
  sessionRow: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionDate:     { color: "#94A3B8", fontSize: 12 },
  sessionType:     { color: "#F1F5F9", fontSize: 14, fontWeight: "600", marginTop: 2, textTransform: "capitalize" },
  sessionDuration: { color: "#6366F1", fontWeight: "700" },

  evalGrid: { flexDirection: "row", gap: 12 },
  evalCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  evalEmoji: { fontSize: 28 },
  evalLabel: { color: "#F1F5F9", fontSize: 14, fontWeight: "700", textAlign: "center" },
  evalSub:   { color: "#475569", fontSize: 11, textAlign: "center" },
});
