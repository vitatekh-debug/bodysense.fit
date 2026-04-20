/**
 * Pantalla: Evaluación FMS (Functional Movement Screen)
 * Navegación: /(professional)/register-fms?athlete_id=xxx&athlete_name=Nombre
 *
 * 7 patrones de movimiento, cada uno puntuado 0–3:
 *  0 = Dolor durante la prueba (requiere derivación médica)
 *  1 = No puede realizar el movimiento
 *  2 = Compensación — realiza el movimiento con limitación
 *  3 = Movimiento correcto sin compensaciones
 *
 * Total ≤14 = riesgo de lesión
 * Cualquier score 0 = patrón doloroso (flag inmediato)
 *
 * También registra superficie y calzado (contexto biomecánico).
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth.store";

// ── FMS patterns ─────────────────────────────────────────────
interface FmsPattern {
  key: string;
  label: string;
  short: string;
  desc: string;
  emoji: string;
}

const FMS_PATTERNS: FmsPattern[] = [
  {
    key:   "fms_deep_squat",
    label: "Deep Squat",
    short: "Sentadilla profunda",
    desc:  "Evalúa la movilidad bilateral simétrica de cadera, rodillas y tobillos.",
    emoji: "🏋️",
  },
  {
    key:   "fms_hurdle_step",
    label: "Hurdle Step",
    short: "Paso de valla",
    desc:  "Evalúa el control motor y la estabilidad de cadera al montar un obstáculo.",
    emoji: "🚧",
  },
  {
    key:   "fms_inline_lunge",
    label: "Inline Lunge",
    short: "Zancada en línea",
    desc:  "Evalúa la estabilidad de cadera y rodilla en plano sagital.",
    emoji: "🦵",
  },
  {
    key:   "fms_shoulder_mobility",
    label: "Shoulder Mobility",
    short: "Movilidad de hombro",
    desc:  "Evalúa la movilidad bilateral del complejo hombro (rotación + aducción).",
    emoji: "💪",
  },
  {
    key:   "fms_aslr",
    label: "Active Straight Leg Raise",
    short: "Elevación activa de pierna",
    desc:  "Evalúa la movilidad activa de isquiotibiales y estabilización del core.",
    emoji: "🦿",
  },
  {
    key:   "fms_trunk_stability",
    label: "Trunk Stability Push-Up",
    short: "Estabilidad de tronco",
    desc:  "Evalúa la estabilidad refleja del tronco en extensión de empuje.",
    emoji: "🤸",
  },
  {
    key:   "fms_rotary_stability",
    label: "Rotary Stability",
    short: "Estabilidad rotatoria",
    desc:  "Evalúa la estabilidad multiplanar del tronco durante la movilidad de extremidades.",
    emoji: "🔄",
  },
];

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Dolor",    color: "#EF4444", bg: "#EF444422" },
  1: { label: "No puede", color: "#F97316", bg: "#F9731622" },
  2: { label: "Comp.",    color: "#F59E0B", bg: "#F59E0B22" },
  3: { label: "Correcto", color: "#22C55E", bg: "#22C55E22" },
};

const SURFACES = [
  { value: "natural_grass",     label: "Césped natural" },
  { value: "artificial_grass_3g", label: "Césped artificial 3G" },
  { value: "artificial_grass_4g", label: "Césped artificial 4G" },
  { value: "hard_court",        label: "Pista dura" },
  { value: "parquet",           label: "Parqué" },
  { value: "gym_floor",         label: "Gimnasio" },
];

const FOOTWEAR = [
  { value: "cleats_fg",    label: "Tacos FG" },
  { value: "cleats_ag",    label: "Tacos AG" },
  { value: "basketball",   label: "Baloncesto" },
  { value: "volleyball",   label: "Voleibol" },
  { value: "training",     label: "Entrenamiento" },
  { value: "barefoot",     label: "Descalzo" },
];

type FmsScores = Record<string, number>;

export default function RegisterFmsScreen() {
  const { athlete_id, athlete_name } = useLocalSearchParams<{
    athlete_id: string;
    athlete_name: string;
  }>();
  const { profile } = useAuthStore();
  const today = new Date().toISOString().split("T")[0] as string;

  const [scores, setScores] = useState<FmsScores>(() =>
    Object.fromEntries(FMS_PATTERNS.map((p) => [p.key, 3]))
  );
  const [surface,  setSurface]  = useState<string | null>(null);
  const [footwear, setFootwear] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const hasPain = Object.values(scores).some((v) => v === 0);
  const isAtRisk = total <= 14 || hasPain;

  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function totalColor(): string {
    if (hasPain) return "#EF4444";
    if (total <= 14) return "#F97316";
    return "#22C55E";
  }

  async function handleSubmit() {
    if (!profile || !athlete_id) return;
    setSubmitting(true);

    const payload: Record<string, any> = {
      athlete_id:    athlete_id,
      evaluated_by:  profile.id,
      date:          today,
      surface_type:  surface,
      footwear_type: footwear,
      ...scores,
      // fms_total, fms_injury_risk, fms_has_pain_pattern are generated columns in DB
    };

    const { error } = await supabase.from("biomechanical_evaluations").insert(payload);

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", `No se pudo guardar: ${error.message}`);
      return;
    }

    Alert.alert(
      "✅ FMS guardado",
      `Total: ${total}/21${hasPain ? " ⚠ Patrón doloroso detectado" : ""}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>FMS</Text>
      <Text style={styles.subtitle}>
        {athlete_name ?? "Atleta"} · Functional Movement Screen
      </Text>

      {/* Live total */}
      <View style={[styles.totalCard, { borderColor: totalColor() + "88" }]}>
        <Text style={styles.totalLabel}>Puntuación Total</Text>
        <Text style={[styles.totalScore, { color: totalColor() }]}>{total}<Text style={styles.totalMax}>/21</Text></Text>
        <Text style={[styles.totalDesc, { color: totalColor() }]}>
          {hasPain
            ? "⚠ Patrón doloroso — derivar a evaluación médica"
            : total <= 14
            ? "Zona de riesgo — trabajo correctivo indicado"
            : "Sin riesgo aumentado"}
        </Text>
        {hasPain && (
          <View style={styles.painAlert}>
            <Text style={styles.painAlertText}>
              Score 0 detectado: detener y derivar antes de continuar entrenamiento
            </Text>
          </View>
        )}
      </View>

      {/* Pattern scoring */}
      {FMS_PATTERNS.map((pattern) => {
        const score = scores[pattern.key] ?? 3;
        const cfg = SCORE_LABELS[score] ?? SCORE_LABELS[3]!;
        return (
          <View key={pattern.key} style={styles.patternCard}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternEmoji}>{pattern.emoji}</Text>
              <View style={styles.patternHeaderText}>
                <Text style={styles.patternLabel}>{pattern.short}</Text>
                <Text style={styles.patternName}>{pattern.label}</Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + "55" }]}>
                <Text style={[styles.scoreBadgeNum, { color: cfg.color }]}>{score}</Text>
              </View>
            </View>
            <Text style={styles.patternDesc}>{pattern.desc}</Text>
            <View style={styles.scoreRow}>
              {[0, 1, 2, 3].map((v) => {
                const c = SCORE_LABELS[v]!;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.scoreBtn,
                      score === v && { backgroundColor: c.bg, borderColor: c.color },
                    ]}
                    onPress={() => setScore(pattern.key, v)}
                  >
                    <Text style={[
                      styles.scoreBtnNum,
                      score === v && { color: c.color, fontWeight: "800" },
                    ]}>
                      {v}
                    </Text>
                    <Text style={[
                      styles.scoreBtnLabel,
                      score === v && { color: c.color },
                    ]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Surface */}
      <Text style={styles.sectionLabel}>Superficie de Entrenamiento</Text>
      <View style={styles.chipRow}>
        {SURFACES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, surface === s.value && styles.chipActive]}
            onPress={() => setSurface(surface === s.value ? null : s.value)}
          >
            <Text style={[styles.chipText, surface === s.value && styles.chipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footwear */}
      <Text style={styles.sectionLabel}>Calzado</Text>
      <View style={styles.chipRow}>
        {FOOTWEAR.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, footwear === f.value && styles.chipActive]}
            onPress={() => setFootwear(footwear === f.value ? null : f.value)}
          >
            <Text style={[styles.chipText, footwear === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Guardar Evaluación FMS</Text>
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

  totalCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: "center",
    gap: 6,
  },
  totalLabel:   { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  totalScore:   { fontSize: 52, fontWeight: "900" },
  totalMax:     { fontSize: 24, color: "#475569", fontWeight: "600" },
  totalDesc:    { fontSize: 13, fontWeight: "700", textAlign: "center" },
  painAlert: {
    backgroundColor: "#EF444422",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  painAlertText: { color: "#EF4444", fontSize: 12, fontWeight: "600", textAlign: "center" },

  patternCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  patternHeader:     { flexDirection: "row", alignItems: "center", gap: 12 },
  patternEmoji:      { fontSize: 24 },
  patternHeaderText: { flex: 1 },
  patternLabel:      { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  patternName:       { color: "#475569", fontSize: 11, marginTop: 2 },
  patternDesc:       { color: "#64748B", fontSize: 12, lineHeight: 17 },
  scoreBadge: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2,
  },
  scoreBadgeNum: { fontSize: 18, fontWeight: "900" },

  scoreRow: { flexDirection: "row", gap: 6 },
  scoreBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 3,
  },
  scoreBtnNum:   { color: "#64748B", fontSize: 18, fontWeight: "600" },
  scoreBtnLabel: { color: "#475569", fontSize: 9, textAlign: "center" },

  sectionLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: -8 },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive:     { backgroundColor: "#312E81", borderColor: "#6366F1" },
  chipText:       { color: "#64748B", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#818CF8" },

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
