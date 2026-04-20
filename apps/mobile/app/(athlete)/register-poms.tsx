/**
 * Pantalla: Cuestionario POMS Breve (6 dimensiones × 4 niveles)
 * Navegación: /(athlete)/register-poms
 *
 * Dimensiones (escala 0-4):
 *   Tensión (tension), Depresión (depression), Ira (anger),
 *   Vigor (vigor), Fatiga (fatigue_poms), Confusión (confusion)
 *
 * TMD = tension + depression + anger + fatigue_poms + confusion - vigor
 * Rango: -4 (excelente) a +20 (burnout severo)
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
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth.store";

// ── POMS dimensions ──────────────────────────────────────────
interface PomsDimension {
  key: "tension" | "depression" | "anger" | "vigor" | "fatigue_poms" | "confusion";
  label: string;
  emoji: string;
  color: string;
  isPositive: boolean; // vigor es positivo, el resto negativo
  levels: [string, string, string, string, string]; // 0, 1, 2, 3, 4
}

const DIMENSIONS: PomsDimension[] = [
  {
    key: "tension",
    label: "Tensión / Ansiedad",
    emoji: "😬",
    color: "#F59E0B",
    isPositive: false,
    levels: ["Nada", "Un poco", "Moderada", "Bastante", "Mucha"],
  },
  {
    key: "depression",
    label: "Depresión / Melancolía",
    emoji: "😞",
    color: "#6366F1",
    isPositive: false,
    levels: ["Nada", "Un poco", "Moderada", "Bastante", "Mucha"],
  },
  {
    key: "anger",
    label: "Ira / Hostilidad",
    emoji: "😤",
    color: "#EF4444",
    isPositive: false,
    levels: ["Nada", "Un poco", "Moderada", "Bastante", "Mucha"],
  },
  {
    key: "vigor",
    label: "Vigor / Actividad",
    emoji: "⚡",
    color: "#22C55E",
    isPositive: true,
    levels: ["Ninguno", "Poco", "Moderado", "Bastante", "Mucho"],
  },
  {
    key: "fatigue_poms",
    label: "Fatiga / Inercia",
    emoji: "🥱",
    color: "#F97316",
    isPositive: false,
    levels: ["Nada", "Un poco", "Moderada", "Bastante", "Mucha"],
  },
  {
    key: "confusion",
    label: "Confusión / Desorientación",
    emoji: "😵",
    color: "#EC4899",
    isPositive: false,
    levels: ["Nada", "Un poco", "Moderada", "Bastante", "Mucha"],
  },
];

type PomsScores = Record<PomsDimension["key"], number>;

function tmdColor(tmd: number): string {
  if (tmd <= 0) return "#22C55E";
  if (tmd <= 7) return "#F59E0B";
  return "#EF4444";
}

function tmdLabel(tmd: number): string {
  if (tmd <= 0) return "Estado de ánimo óptimo";
  if (tmd <= 7) return "Precaución — vigilar carga";
  return "⚠ Riesgo de sobreentrenamiento";
}

export default function RegisterPomsScreen() {
  const { profile } = useAuthStore();
  const today = new Date().toISOString().split("T")[0] as string;

  const [scores, setScores] = useState<PomsScores>({
    tension: 0, depression: 0, anger: 0,
    vigor: 2, fatigue_poms: 0, confusion: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const tmd =
    scores.tension + scores.depression + scores.anger +
    scores.fatigue_poms + scores.confusion - scores.vigor;

  function setScore(key: PomsDimension["key"], value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!profile) return;
    setSubmitting(true);

    const { error } = await supabase.from("poms_assessments").upsert(
      {
        athlete_id:   profile.id,
        date:         today,
        tension:      scores.tension,
        depression:   scores.depression,
        anger:        scores.anger,
        vigor:        scores.vigor,
        fatigue_poms: scores.fatigue_poms,
        confusion:    scores.confusion,
        // tmd_score is a generated column in DB — no need to send it
      },
      { onConflict: "athlete_id,date" }
    );

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", `No se pudo guardar: ${error.message}`);
      return;
    }

    Alert.alert(
      "✅ POMS registrado",
      `TMD ${tmd > 0 ? "+" : ""}${tmd} — ${tmdLabel(tmd)}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Estado de Ánimo</Text>
      <Text style={styles.subtitle}>Cuestionario POMS Breve — hoy, {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long" })}</Text>

      {/* Live TMD display */}
      <View style={[styles.tmdCard, { borderColor: tmdColor(tmd) + "66" }]}>
        <Text style={styles.tmdLabel}>TMD (Total Mood Disturbance)</Text>
        <Text style={[styles.tmdScore, { color: tmdColor(tmd) }]}>
          {tmd > 0 ? "+" : ""}{tmd}
        </Text>
        <Text style={[styles.tmdDesc, { color: tmdColor(tmd) }]}>{tmdLabel(tmd)}</Text>
        <Text style={styles.tmdFormula}>
          (Tensión + Depresión + Ira + Fatiga + Confusión) − Vigor
        </Text>
      </View>

      {/* Dimension sliders */}
      {DIMENSIONS.map((dim) => (
        <View key={dim.key} style={styles.dimCard}>
          <View style={styles.dimHeader}>
            <Text style={styles.dimEmoji}>{dim.emoji}</Text>
            <View style={styles.dimHeaderText}>
              <Text style={styles.dimLabel}>{dim.label}</Text>
              <Text style={[styles.dimValue, { color: dim.color }]}>
                {scores[dim.key]}/4 — {dim.levels[scores[dim.key]]}
              </Text>
            </View>
          </View>

          {/* 0–4 button row */}
          <View style={styles.levelRow}>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelBtn,
                  scores[dim.key] === level && {
                    backgroundColor: dim.color + "33",
                    borderColor: dim.color,
                  },
                ]}
                onPress={() => setScore(dim.key, level)}
              >
                <Text style={[
                  styles.levelBtnNumber,
                  scores[dim.key] === level && { color: dim.color, fontWeight: "800" },
                ]}>
                  {level}
                </Text>
                <Text style={[
                  styles.levelBtnLabel,
                  scores[dim.key] === level && { color: dim.color },
                ]}>
                  {dim.levels[level]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Registrar Estado de Ánimo</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 16 },
  backBtn:   { marginBottom: 4 },
  backText:  { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800" },
  subtitle:  { color: "#64748B", fontSize: 14, marginTop: -8, textTransform: "capitalize" },

  tmdCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tmdLabel:   { color: "#94A3B8", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  tmdScore:   { fontSize: 52, fontWeight: "900" },
  tmdDesc:    { fontSize: 14, fontWeight: "700", textAlign: "center" },
  tmdFormula: { color: "#475569", fontSize: 11, textAlign: "center", marginTop: 4, fontStyle: "italic" },

  dimCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  dimHeader:     { flexDirection: "row", alignItems: "center", gap: 12 },
  dimEmoji:      { fontSize: 24 },
  dimHeaderText: { flex: 1 },
  dimLabel:      { color: "#CBD5E1", fontSize: 14, fontWeight: "600" },
  dimValue:      { fontSize: 12, fontWeight: "700", marginTop: 2 },

  levelRow: { flexDirection: "row", gap: 6 },
  levelBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 3,
  },
  levelBtnNumber: { color: "#64748B", fontSize: 16, fontWeight: "600" },
  levelBtnLabel:  { color: "#475569", fontSize: 9, textAlign: "center" },

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
