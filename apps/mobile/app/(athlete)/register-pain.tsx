/**
 * Pantalla: Registro de Dolor EVA
 * Navegación: /(athlete)/register-pain
 *
 * Registra un pain_record con:
 *  - Región corporal (body_region)
 *  - Score EVA 0–10
 *  - Timing (pre_session, post_session, rest, next_morning)
 *  - Tipo de dolor (acute, chronic, exercise_induced, referred)
 *  - ¿Limita el rendimiento?
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Slider from "@react-native-community/slider";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth.store";

// ── Opciones de región corporal ─────────────────────────────
const BODY_REGIONS: { value: string; label: string; group: string }[] = [
  // Tren inferior
  { value: "hamstring_right",  label: "Isquio Der.",     group: "Pierna" },
  { value: "hamstring_left",   label: "Isquio Izq.",     group: "Pierna" },
  { value: "quadriceps_right", label: "Cuádriceps Der.", group: "Pierna" },
  { value: "quadriceps_left",  label: "Cuádriceps Izq.", group: "Pierna" },
  { value: "knee_right",       label: "Rodilla Der.",    group: "Pierna" },
  { value: "knee_left",        label: "Rodilla Izq.",    group: "Pierna" },
  { value: "ankle_right",      label: "Tobillo Der.",    group: "Pierna" },
  { value: "ankle_left",       label: "Tobillo Izq.",    group: "Pierna" },
  { value: "calf_right",       label: "Gemelo Der.",     group: "Pierna" },
  { value: "calf_left",        label: "Gemelo Izq.",     group: "Pierna" },
  { value: "foot_right",       label: "Pie Der.",        group: "Pierna" },
  { value: "foot_left",        label: "Pie Izq.",        group: "Pierna" },
  // Tren superior
  { value: "shoulder_right",   label: "Hombro Der.",     group: "Tronco" },
  { value: "shoulder_left",    label: "Hombro Izq.",     group: "Tronco" },
  { value: "lower_back",       label: "Lumbar",          group: "Tronco" },
  { value: "upper_back",       label: "Dorsal",          group: "Tronco" },
  { value: "groin_right",      label: "Ingle Der.",      group: "Tronco" },
  { value: "groin_left",       label: "Ingle Izq.",      group: "Tronco" },
  { value: "hip_right",        label: "Cadera Der.",     group: "Tronco" },
  { value: "hip_left",         label: "Cadera Izq.",     group: "Tronco" },
];

const TIMINGS: { value: string; label: string; emoji: string }[] = [
  { value: "rest",          label: "En reposo",         emoji: "🛋️" },
  { value: "pre_session",   label: "Pre-sesión",        emoji: "🌅" },
  { value: "post_session",  label: "Post-sesión",       emoji: "🏁" },
  { value: "next_morning",  label: "Mañana siguiente",  emoji: "🌄" },
];

const PAIN_TYPES: { value: string; label: string }[] = [
  { value: "acute",             label: "Agudo" },
  { value: "chronic",          label: "Crónico" },
  { value: "exercise_induced", label: "Inducido por ej." },
  { value: "referred",         label: "Referido" },
];

function evaColor(score: number): string {
  if (score <= 3) return "#22C55E";
  if (score <= 6) return "#F59E0B";
  return "#EF4444";
}

function evaLabel(score: number): string {
  if (score === 0) return "Sin dolor";
  if (score <= 3) return "Leve";
  if (score <= 6) return "Moderado";
  if (score <= 8) return "Severo";
  return "Máximo";
}

export default function RegisterPainScreen() {
  const { profile } = useAuthStore();
  const today = new Date().toISOString().split("T")[0] as string;

  const [bodyRegion, setBodyRegion] = useState<string | null>(null);
  const [evaScore, setEvaScore]     = useState(0);
  const [timing, setTiming]         = useState<string>("post_session");
  const [painType, setPainType]     = useState<string>("acute");
  const [limitsPerf, setLimitsPerf] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!profile) return;
    if (!bodyRegion) {
      Alert.alert("Selecciona", "Elige la región corporal afectada.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("pain_records").insert({
      athlete_id:        profile.id,
      date:              today,
      body_region:       bodyRegion,
      eva_score:         evaScore,
      timing:            timing,
      pain_type:         painType,
      limits_performance: limitsPerf,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", `No se pudo guardar: ${error.message}`);
      return;
    }

    Alert.alert(
      "✅ Dolor registrado",
      `EVA ${evaScore}/10 · ${evaLabel(evaScore)}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Registro de Dolor</Text>
      <Text style={styles.subtitle}>Escala Visual Analógica (EVA 0–10)</Text>

      {/* EVA Score */}
      <View style={[styles.evaCard, { borderColor: evaColor(evaScore) + "88" }]}>
        <Text style={styles.evaLabelTxt}>Intensidad del Dolor</Text>
        <Text style={[styles.evaScore, { color: evaColor(evaScore) }]}>{evaScore}/10</Text>
        <Text style={[styles.evaDesc, { color: evaColor(evaScore) }]}>{evaLabel(evaScore)}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={evaScore}
          onValueChange={setEvaScore}
          minimumTrackTintColor={evaColor(evaScore)}
          maximumTrackTintColor="#334155"
          thumbTintColor={evaColor(evaScore)}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>0 — Sin dolor</Text>
          <Text style={styles.sliderLabel}>10 — Insoportable</Text>
        </View>

        {/* Traffic light visual */}
        <View style={styles.trafficRow}>
          {[
            { range: "0–3", label: "Verde", color: "#22C55E" },
            { range: "4–6", label: "Amarillo", color: "#F59E0B" },
            { range: "7–10", label: "Rojo", color: "#EF4444" },
          ].map((z) => (
            <View key={z.range} style={[styles.trafficBadge, { borderColor: z.color + "55" }]}>
              <View style={[styles.trafficDot, { backgroundColor: z.color }]} />
              <Text style={[styles.trafficText, { color: z.color }]}>{z.range}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Body region */}
      <Text style={styles.sectionLabel}>Región Corporal</Text>
      <View style={styles.regionGrid}>
        {BODY_REGIONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.regionChip, bodyRegion === r.value && styles.regionChipActive]}
            onPress={() => setBodyRegion(r.value)}
          >
            <Text style={[styles.regionChipText, bodyRegion === r.value && styles.regionChipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timing */}
      <Text style={styles.sectionLabel}>¿Cuándo aparece?</Text>
      <View style={styles.chipRow}>
        {TIMINGS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, timing === t.value && styles.chipActive]}
            onPress={() => setTiming(t.value)}
          >
            <Text style={styles.chipEmoji}>{t.emoji}</Text>
            <Text style={[styles.chipText, timing === t.value && styles.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pain type */}
      <Text style={styles.sectionLabel}>Tipo de Dolor</Text>
      <View style={styles.chipRow}>
        {PAIN_TYPES.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.chip, painType === p.value && styles.chipActive]}
            onPress={() => setPainType(p.value)}
          >
            <Text style={[styles.chipText, painType === p.value && styles.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Limits performance */}
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>¿Limita el rendimiento?</Text>
          <Text style={styles.switchSub}>El dolor afecta la técnica o la intensidad</Text>
        </View>
        <Switch
          value={limitsPerf}
          onValueChange={setLimitsPerf}
          trackColor={{ false: "#334155", true: "#6366F1" }}
          thumbColor={limitsPerf ? "#818CF8" : "#64748B"}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Registrar Dolor</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 20 },
  backBtn:   { marginBottom: 4 },
  backText:  { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800" },
  subtitle:  { color: "#64748B", fontSize: 14, marginTop: -12 },

  evaCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    gap: 10,
  },
  evaLabelTxt: { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  evaScore:    { fontSize: 56, fontWeight: "900", textAlign: "center" },
  evaDesc:     { fontSize: 18, fontWeight: "700", textAlign: "center", marginTop: -8 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabel:  { color: "#475569", fontSize: 11 },
  trafficRow:   { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 4 },
  trafficBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  trafficDot:  { width: 8, height: 8, borderRadius: 4 },
  trafficText: { fontSize: 11, fontWeight: "700" },

  sectionLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: -8 },

  regionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  regionChip: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#334155",
  },
  regionChipActive: { backgroundColor: "#312E81", borderColor: "#6366F1" },
  regionChipText:   { color: "#64748B", fontSize: 12, fontWeight: "600" },
  regionChipTextActive: { color: "#818CF8" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipActive:     { backgroundColor: "#312E81", borderColor: "#6366F1" },
  chipEmoji:      { fontSize: 16 },
  chipText:       { color: "#64748B", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#818CF8" },

  switchRow: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: { color: "#CBD5E1", fontSize: 14, fontWeight: "600" },
  switchSub:   { color: "#475569", fontSize: 12, marginTop: 2 },

  submitBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
