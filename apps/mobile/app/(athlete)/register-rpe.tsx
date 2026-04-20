/**
 * Registrar RPE post-sesión — Hardened for production
 *
 * QA improvements:
 *  ✅ Slider bounded to valid Borg range 6–20 (impossible to enter 0 or 21)
 *  ✅ Duration validation (0, negative, NaN, >480 min all rejected)
 *  ✅ Missing session_id guard with friendly error message
 *  ✅ sRPE clamped and validated via shared utility
 *  ✅ Offline-first: queued locally if no network
 *  ✅ Toast instead of Alert dialogs
 *  ✅ No double-submit (disabled during request)
 *  ✅ ACWR recalc triggered after successful save
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth.store";
import { useToast } from "../../components/Toast";
import { writeWithFallback } from "../../lib/offline-queue";
import { getRpeLabel, calculateSrpe, validateRpe } from "@vitatekh/shared";
import Slider from "@react-native-community/slider";

// ─── Borg scale reference rows ────────────────────────────────────────────────

const BORG_ROWS = [
  { min: 6,  max: 7,  label: "Muy Fácil" },
  { min: 8,  max: 9,  label: "Fácil" },
  { min: 10, max: 11, label: "Moderado" },
  { min: 12, max: 13, label: "Algo Difícil" },
  { min: 14, max: 15, label: "Difícil" },
  { min: 16, max: 17, label: "Muy Difícil" },
  { min: 18, max: 20, label: "Máximo" },
];

export default function RegisterRpeScreen() {
  const { session_id, duration } = useLocalSearchParams<{
    session_id: string;
    duration: string;
  }>();
  const { profile } = useAuthStore();
  const toast = useToast();

  // ── Default RPE to 13 (algo difícil — typical training session) ─
  const [rpe, setRpe] = useState(13);
  const [submitting, setSubmitting] = useState(false);

  // ── Validate duration from query params ─────────────────────────
  const rawDuration = parseInt(duration ?? "0");
  const durationMin =
    isNaN(rawDuration) || rawDuration <= 0 || rawDuration > 480 ? null : rawDuration;

  // ── Safe RPE handler ────────────────────────────────────────────
  const handleRpeChange = (v: number) => {
    const { value } = validateRpe(v, "borg");
    setRpe(value);
  };

  // ── Live sRPE calculation with error ───────────────────────────
  const srpeResult = durationMin
    ? calculateSrpe(rpe, durationMin)
    : { srpe: 0, error: "Duración de sesión no válida." };

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!profile) {
      toast.error("Sesión no encontrada", "Por favor inicia sesión de nuevo.");
      return;
    }

    if (!session_id) {
      toast.error(
        "Sin sesión de entrenamiento",
        "Selecciona una sesión desde 'Mis Sesiones' antes de registrar el RPE."
      );
      return;
    }

    if (!durationMin) {
      toast.error(
        "Duración inválida",
        "La duración de la sesión debe ser entre 1 y 480 minutos."
      );
      return;
    }

    if (srpeResult.error) {
      toast.error("Error de validación", srpeResult.error);
      return;
    }

    setSubmitting(true);

    const payload = {
      session_id,
      athlete_id: profile.id,
      rpe,
      srpe: srpeResult.srpe,
    };

    const { queued, error } = await writeWithFallback(
      "rpe",
      payload,
      () =>
        supabase
          .from("session_rpe")
          .upsert(payload as any, { onConflict: "session_id,athlete_id" })
    );

    if (error) {
      setSubmitting(false);
      toast.error("No se pudo guardar el RPE", "Revisa tu conexión.");
      return;
    }

    // ── Trigger ACWR recalculation ──────────────────────────────
    if (!queued) {
      supabase.functions
        .invoke("calculate-acwr", { body: { athlete_id: profile.id } })
        .catch(() => {});
    }

    setSubmitting(false);

    if (queued) {
      toast.warning(
        "RPE guardado localmente",
        `sRPE = ${srpeResult.srpe} UA — se sincronizará con conexión.`
      );
    } else {
      toast.success(
        "✅ RPE registrado",
        `sRPE = ${srpeResult.srpe} UA — carga actualizada.`
      );
    }

    // Brief delay so the toast is visible before navigating back
    setTimeout(() => router.back(), 1200);
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        accessibilityLabel="Volver"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>RPE Post-Sesión</Text>
      <Text style={styles.subtitle}>Escala de Borg 6–20</Text>

      {/* Missing session warning */}
      {!session_id && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            ⚠ No se detectó una sesión de entrenamiento. Regresa y selecciona una sesión para registrar el RPE.
          </Text>
        </View>
      )}

      {/* Invalid duration warning */}
      {session_id && !durationMin && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            ⚠ La duración de la sesión no es válida ({duration ?? "vacío"} min). Contacta a tu entrenador.
          </Text>
        </View>
      )}

      {/* ── RPE display ──────────────────────────────────────── */}
      <View style={styles.rpeCard}>
        <Text style={styles.rpeNumber}>{rpe}</Text>
        <Text style={styles.rpeLabel}>{getRpeLabel(rpe)}</Text>
      </View>

      {/* ── Slider — bounded 6–20, step 1 ────────────────────── */}
      <Slider
        style={styles.slider}
        minimumValue={6}
        maximumValue={20}
        step={1}
        value={rpe}
        onValueChange={handleRpeChange}
        minimumTrackTintColor="#F59E0B"
        maximumTrackTintColor="#334155"
        thumbTintColor="#FCD34D"
        accessibilityLabel={`Intensidad RPE: ${rpe}`}
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>6 — Reposo</Text>
        <Text style={styles.sliderLabel}>20 — Máximo</Text>
      </View>

      {/* ── Borg reference — tap to select ───────────────────── */}
      <View style={styles.borgCard}>
        <Text style={styles.borgTitle}>ESCALA DE BORG</Text>
        {BORG_ROWS.map(({ min, max, label }) => {
          const isActive = rpe >= min && rpe <= max;
          return (
            <TouchableOpacity
              key={min}
              style={[styles.borgRow, isActive && styles.borgRowActive]}
              onPress={() => setRpe(min)}
              accessibilityLabel={`Seleccionar ${label}: RPE ${min} a ${max}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.borgRange, isActive && styles.borgRangeActive]}>
                {min}–{max}
              </Text>
              <Text style={[styles.borgLabel, isActive && styles.borgLabelActive]}>
                {label}
              </Text>
              {isActive && <Text style={styles.borgCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── sRPE summary ─────────────────────────────────────── */}
      {durationMin && (
        <View style={styles.srpeCard}>
          <Text style={styles.srpeLabel}>CARGA DE SESIÓN (sRPE)</Text>
          <Text style={styles.srpeFormula}>
            RPE {rpe} × {durationMin} min ={" "}
            <Text style={styles.srpeValue}>{srpeResult.srpe} UA</Text>
          </Text>
          <Text style={styles.srpeHint}>
            UA = Unidades Arbitrarias de carga interna
          </Text>
        </View>
      )}

      {/* ── Submit ───────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          (submitting || !session_id || !durationMin) && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting || !session_id || !durationMin}
        accessibilityLabel="Registrar RPE de la sesión"
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Registrar RPE</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 16 },

  backBtn:   { paddingVertical: 8 },
  backText:  { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800" },
  subtitle:  { color: "#64748B", fontSize: 14, marginTop: -8 },

  errorBanner: {
    backgroundColor: "#1C0A0A",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#991B1B",
  },
  errorBannerText: { color: "#FCA5A5", fontSize: 13, fontWeight: "600", lineHeight: 18 },

  rpeCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#F59E0B55",
  },
  rpeNumber: { fontSize: 72, fontWeight: "900", color: "#FCD34D" },
  rpeLabel:  { color: "#F59E0B", fontWeight: "700", fontSize: 18 },

  // Min 44px height for accessibility
  slider: { width: "100%", height: 44 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  sliderLabel:  { color: "#475569", fontSize: 11 },

  borgCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    overflow: "hidden",
  },
  borgTitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 8,
  },
  borgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 13,   // min ~48px total for fat-finger targets
    borderTopWidth: 1,
    borderTopColor: "#0F172A",
  },
  borgRowActive: { backgroundColor: "#1C1A0F" },
  borgRange:     { color: "#64748B", width: 36, fontSize: 12, fontWeight: "700" },
  borgRangeActive: { color: "#FCD34D" },
  borgLabel:     { color: "#CBD5E1", fontSize: 13, flex: 1 },
  borgLabelActive: { color: "#FCD34D", fontWeight: "700" },
  borgCheck:     { color: "#FCD34D", fontWeight: "800", fontSize: 14 },

  srpeCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  srpeLabel:   { color: "#64748B", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  srpeFormula: { color: "#94A3B8", fontSize: 15 },
  srpeValue:   { color: "#F59E0B", fontWeight: "800", fontSize: 20 },
  srpeHint:    { color: "#475569", fontSize: 11 },

  submitBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
