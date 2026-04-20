/**
 * Pantalla: Evaluación H/Q (Hamstring/Quadriceps)
 * Navegación: /(professional)/register-hq?athlete_id=xxx&athlete_name=Nombre
 *
 * Registra en hq_evaluations:
 *  - Lado evaluado (left/right)
 *  - Tipo de ratio (conventional = 60°/s | functional = 180°/s)
 *  - Velocidad angular (speed_deg_per_sec)
 *  - Torque pico cuádriceps y isquiotibiales (Nm)
 *  - Ratio H/Q calculado en tiempo real
 *  - risk_flag se computa como columna generada en BD
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth.store";

type RatioType = "conventional" | "functional";
type Side = "left" | "right" | "bilateral";

const RATIO_TYPES: { value: RatioType; label: string; desc: string; threshold: string }[] = [
  {
    value: "conventional",
    label: "Convencional",
    desc: "60°/s — Isométrico a baja velocidad",
    threshold: "Umbral: H/Q ≥ 0.60",
  },
  {
    value: "functional",
    label: "Funcional",
    desc: "180°/s — Concéntrico a alta velocidad",
    threshold: "Umbral: H/Q ≥ 1.00",
  },
];

const SPEEDS: Record<RatioType, number[]> = {
  conventional: [60, 90, 120],
  functional:   [180, 240, 300],
};

const SIDES: { value: Side; label: string; emoji: string }[] = [
  { value: "right",     label: "Derecho",    emoji: "👉" },
  { value: "left",      label: "Izquierdo",  emoji: "👈" },
  { value: "bilateral", label: "Bilateral",  emoji: "🤝" },
];

function hqColor(ratio: number, type: RatioType): string {
  const threshold = type === "conventional" ? 0.60 : 1.00;
  const warning   = type === "conventional" ? 0.65 : 1.10;
  if (ratio >= warning) return "#22C55E";
  if (ratio >= threshold) return "#F59E0B";
  return "#EF4444";
}

function hqLabel(ratio: number, type: RatioType): string {
  const threshold = type === "conventional" ? 0.60 : 1.00;
  if (ratio === 0) return "Ingresa los torques";
  if (ratio >= threshold) return "✓ Dentro del rango";
  return "⚠ Déficit — riesgo de lesión";
}

export default function RegisterHqScreen() {
  const { athlete_id, athlete_name } = useLocalSearchParams<{
    athlete_id: string;
    athlete_name: string;
  }>();
  const { profile } = useAuthStore();
  const today = new Date().toISOString().split("T")[0] as string;

  const [ratioType, setRatioType] = useState<RatioType>("conventional");
  const [side, setSide]           = useState<Side>("right");
  const [speed, setSpeed]         = useState(60);
  const [quadTorque, setQuadTorque] = useState("");
  const [hamTorque, setHamTorque]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const quad = parseFloat(quadTorque) || 0;
  const ham  = parseFloat(hamTorque)  || 0;
  const ratio = quad > 0 ? parseFloat((ham / quad).toFixed(3)) : 0;

  // Sync speed when ratioType changes
  function handleRatioTypeChange(type: RatioType) {
    setRatioType(type);
    setSpeed(SPEEDS[type][0] ?? (type === "conventional" ? 60 : 180));
  }

  async function handleSubmit() {
    if (!profile || !athlete_id) return;

    if (quad <= 0 || ham <= 0) {
      Alert.alert("Datos incompletos", "Ingresa los torques pico de ambos grupos musculares.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("hq_evaluations").insert({
      athlete_id:         athlete_id,
      evaluated_by:       profile.id,
      date:               today,
      side:               side,
      ratio_type:         ratioType,
      speed_deg_per_sec:  speed,
      peak_quad_torque:   quad,
      peak_ham_torque:    ham,
      hq_ratio:           ratio,
      // risk_flag is a generated column — omit
    });

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", `No se pudo guardar: ${error.message}`);
      return;
    }

    Alert.alert(
      "✅ Evaluación guardada",
      `H/Q ${ratioType === "conventional" ? "Conv." : "Func."} ${side}: ${ratio.toFixed(3)}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Evaluación H/Q</Text>
      <Text style={styles.subtitle}>
        {athlete_name ?? "Atleta"} · {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
      </Text>

      {/* Live ratio display */}
      {quad > 0 && ham > 0 && (
        <View style={[styles.ratioCard, { borderColor: hqColor(ratio, ratioType) + "88" }]}>
          <Text style={styles.ratioCardLabel}>Ratio H/Q calculado</Text>
          <Text style={[styles.ratioValue, { color: hqColor(ratio, ratioType) }]}>
            {ratio.toFixed(3)}
          </Text>
          <Text style={[styles.ratioDesc, { color: hqColor(ratio, ratioType) }]}>
            {hqLabel(ratio, ratioType)}
          </Text>
          <Text style={styles.ratioFormula}>
            {ham.toFixed(1)} Nm (Isquio) ÷ {quad.toFixed(1)} Nm (Cuádriceps)
          </Text>
        </View>
      )}

      {/* Ratio type */}
      <Text style={styles.sectionLabel}>Tipo de Evaluación</Text>
      <View style={styles.typeRow}>
        {RATIO_TYPES.map((rt) => (
          <TouchableOpacity
            key={rt.value}
            style={[styles.typeCard, ratioType === rt.value && styles.typeCardActive]}
            onPress={() => handleRatioTypeChange(rt.value)}
          >
            <Text style={[styles.typeCardTitle, ratioType === rt.value && styles.typeCardTitleActive]}>
              {rt.label}
            </Text>
            <Text style={styles.typeCardDesc}>{rt.desc}</Text>
            <Text style={[styles.typeCardThreshold, ratioType === rt.value && { color: "#818CF8" }]}>
              {rt.threshold}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Side */}
      <Text style={styles.sectionLabel}>Lado Evaluado</Text>
      <View style={styles.chipRow}>
        {SIDES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, side === s.value && styles.chipActive]}
            onPress={() => setSide(s.value)}
          >
            <Text style={styles.chipEmoji}>{s.emoji}</Text>
            <Text style={[styles.chipText, side === s.value && styles.chipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Speed */}
      <Text style={styles.sectionLabel}>Velocidad Angular (°/s)</Text>
      <View style={styles.chipRow}>
        {SPEEDS[ratioType].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, speed === s && styles.chipActive]}
            onPress={() => setSpeed(s)}
          >
            <Text style={[styles.chipText, speed === s && styles.chipTextActive]}>
              {s}°/s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Torques */}
      <Text style={styles.sectionLabel}>Torques Pico (Nm)</Text>
      <View style={styles.torqueRow}>
        <View style={styles.torqueField}>
          <Text style={styles.torqueLabel}>Cuádriceps</Text>
          <TextInput
            style={styles.input}
            value={quadTorque}
            onChangeText={setQuadTorque}
            keyboardType="decimal-pad"
            placeholder="ej. 180.5"
            placeholderTextColor="#475569"
          />
        </View>
        <View style={styles.torqueField}>
          <Text style={styles.torqueLabel}>Isquiotibiales</Text>
          <TextInput
            style={styles.input}
            value={hamTorque}
            onChangeText={setHamTorque}
            keyboardType="decimal-pad"
            placeholder="ej. 112.0"
            placeholderTextColor="#475569"
          />
        </View>
      </View>

      {/* Reference */}
      <View style={styles.refCard}>
        <Text style={styles.refTitle}>Referencias clínicas</Text>
        <Text style={styles.refRow}>
          <Text style={styles.refKey}>Convencional (60°/s):</Text>
          <Text style={styles.refVal}> H/Q {"≥"} 0.60 = seguro  ·  {"<"} 0.60 = déficit</Text>
        </Text>
        <Text style={styles.refRow}>
          <Text style={styles.refKey}>Funcional (180°/s):</Text>
          <Text style={styles.refVal}> H/Q {"≥"} 1.00 = seguro  ·  {"<"} 1.00 = déficit</Text>
        </Text>
        <Text style={styles.refNote}>
          Déficit excéntrico {"<"} 0.60 (conv.) = riesgo de lesión de isquiotibiales.
          Protocolo: Nordic Hamstring + HSR.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Guardar Evaluación H/Q</Text>
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

  ratioCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: "center",
    gap: 6,
  },
  ratioCardLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  ratioValue:     { fontSize: 52, fontWeight: "900" },
  ratioDesc:      { fontSize: 14, fontWeight: "700" },
  ratioFormula:   { color: "#475569", fontSize: 11, marginTop: 4, fontStyle: "italic" },

  sectionLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: -8 },

  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  typeCardActive:      { borderColor: "#6366F1", backgroundColor: "#1E1B4B" },
  typeCardTitle:       { color: "#94A3B8", fontSize: 14, fontWeight: "700" },
  typeCardTitleActive: { color: "#818CF8" },
  typeCardDesc:        { color: "#475569", fontSize: 11 },
  typeCardThreshold:   { color: "#475569", fontSize: 11, fontWeight: "600", marginTop: 2 },

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

  torqueRow:   { flexDirection: "row", gap: 12 },
  torqueField: { flex: 1, gap: 8 },
  torqueLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#334155",
    textAlign: "center",
  },

  refCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  refTitle: { color: "#64748B", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  refRow:   { color: "#94A3B8", fontSize: 12 },
  refKey:   { fontWeight: "700" },
  refVal:   { color: "#64748B" },
  refNote:  { color: "#475569", fontSize: 11, marginTop: 4, fontStyle: "italic" },

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
