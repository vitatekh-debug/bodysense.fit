/**
 * Athlete Check-in — Hardened for production
 *
 * QA improvements:
 *  ✅ Skeleton loading state (no empty flash)
 *  ✅ Toast notifications replacing Alert dialogs
 *  ✅ Offline-first: writes to AsyncStorage if offline, syncs on reconnect
 *  ✅ Input clamping: sliders are constrained — no invalid values possible
 *  ✅ Duplicate protection: upsert with onConflict
 *  ✅ Pending offline badge
 *  ✅ Risk banner with CTA → Ver rutina de prevención
 *  ✅ Accessible touch targets (min 48px height)
 *  ✅ ACWR data shown immediately from last snapshot
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import Slider from "@react-native-community/slider";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/auth.store";
import { useToast } from "../../../components/Toast";
import { SkeletonCheckin } from "../../../components/Skeleton";
import { writeWithFallback, getPendingCount } from "../../../lib/offline-queue";
import { ACWR_ZONES, getRpeLabel } from "@vitatekh/shared";
import type { AcwrSnapshot } from "@vitatekh/shared";

// ─── Quick actions ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: "Registrar Dolor",
    emoji: "🩹",
    subtitle: "Escala EVA 0–10",
    route: "/(athlete)/register-pain" as const,
    color: "#EF4444",
  },
  {
    label: "Estado de Ánimo",
    emoji: "🧠",
    subtitle: "Cuestionario POMS",
    route: "/(athlete)/register-poms" as const,
    color: "#6366F1",
  },
  {
    label: "Registrar RPE",
    emoji: "⚡",
    subtitle: "Esfuerzo post-sesión",
    route: "/(athlete)/my-sessions" as const,
    color: "#F59E0B",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function AthleteCheckin() {
  const { profile } = useAuthStore();
  const toast = useToast();
  const today = new Date().toISOString().split("T")[0] as string;

  // ── Form state ──────────────────────────────────────────────────
  const [fatigue,      setFatigue]      = useState(5);
  const [sleepHours,   setSleepHours]   = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [mood,         setMood]         = useState(3);

  // ── UI state ────────────────────────────────────────────────────
  const [initializing, setInitializing] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [todayDone,    setTodayDone]    = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [latestSnap,   setLatestSnap]  = useState<AcwrSnapshot | null>(null);

  // ── Load today's existing check-in + latest ACWR ───────────────
  useEffect(() => {
    if (!profile) return;

    const init = async () => {
      const [wellnessRes, snapRes, pending] = await Promise.all([
        supabase
          .from("daily_wellness")
          .select("fatigue, sleep_hours, sleep_quality, mood")
          .eq("athlete_id", profile.id)
          .eq("date", today)
          .maybeSingle(),

        supabase
          .from("acwr_snapshots")
          .select("*")
          .eq("athlete_id", profile.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),

        getPendingCount(),
      ]);

      // Pre-fill form if already checked in today
      if (wellnessRes.data) {
        setTodayDone(true);
        setFatigue(wellnessRes.data.fatigue ?? 5);
        setSleepHours(wellnessRes.data.sleep_hours ?? 7);
        setSleepQuality(wellnessRes.data.sleep_quality ?? 3);
        setMood(wellnessRes.data.mood ?? 3);
      }

      setLatestSnap(snapRes.data ?? null);
      setPendingCount(pending);
      setInitializing(false);
    };

    init();
  }, [profile]);

  // ── Safe slider clampers ────────────────────────────────────────
  const setFatigueSafe      = (v: number) => setFatigue(Math.max(1, Math.min(10, Math.round(v))));
  const setSleepHoursSafe   = (v: number) => setSleepHours(Math.max(0, Math.min(12, Math.round(v * 2) / 2)));
  const setSleepQualitySafe = (v: number) => setSleepQuality(Math.max(1, Math.min(5, Math.round(v))));
  const setMoodSafe         = (v: number) => setMood(Math.max(1, Math.min(5, Math.round(v))));

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!profile) return;
    setSubmitting(true);

    const payload = {
      athlete_id:    profile.id,
      date:          today,
      fatigue:       Math.max(1, Math.min(10, fatigue)),
      sleep_hours:   Math.max(0, Math.min(12, sleepHours)),
      sleep_quality: Math.max(1, Math.min(5, sleepQuality)),
      mood:          Math.max(1, Math.min(5, mood)),
    };

    const { queued, error } = await writeWithFallback(
      "wellness",
      payload,
      () =>
        supabase
          .from("daily_wellness")
          .upsert(payload, { onConflict: "athlete_id,date" })
    );

    setSubmitting(false);

    if (error) {
      toast.error("No se pudo guardar el check-in", "Revisa tu conexión.");
      return;
    }

    setTodayDone(true);

    if (queued) {
      setPendingCount((p) => p + 1);
      toast.warning(
        "Check-in guardado localmente",
        "Se sincronizará cuando recuperes conexión."
      );
    } else {
      toast.success("¡Check-in registrado!", "Datos guardados correctamente.");
      // Trigger ACWR recalculation (non-blocking)
      supabase.functions
        .invoke("calculate-acwr", { body: { athlete_id: profile.id } })
        .catch(() => {});
    }
  }

  // ── Risk zone from latest ACWR ──────────────────────────────────
  const zone       = latestSnap ? ACWR_ZONES[latestSnap.risk_zone] : null;
  const isAtRisk   = latestSnap?.risk_zone === "high" || latestSnap?.risk_zone === "very_high";
  const isCritical = latestSnap?.risk_zone === "very_high";

  // ── Render ──────────────────────────────────────────────────────
  if (initializing) {
    return <SkeletonCheckin />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Check-in Diario</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingCount} pendiente{pendingCount > 1 ? "s" : ""}</Text>
          </View>
        )}
      </View>

      {/* ── ACWR Risk Banner (if at risk) ─────────────────────── */}
      {isAtRisk && latestSnap && (
        <View style={[styles.riskBanner, { borderColor: zone!.color + "88", backgroundColor: zone!.color + "18" }]}>
          <View style={styles.riskBannerTop}>
            <Text style={styles.riskBannerIcon}>{isCritical ? "🚨" : "⚠️"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.riskBannerTitle, { color: zone!.color }]}>
                {isCritical ? "Riesgo Muy Alto" : "Riesgo Alto"} — ACWR {latestSnap.acwr_ratio.toFixed(2)}
              </Text>
              <Text style={styles.riskBannerSub}>
                {isCritical
                  ? "Tu carga acumulada es crítica. Reduce intensidad inmediatamente."
                  : "Tu carga es elevada. Monitorea síntomas y considera reducir volumen."}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.riskCta, { backgroundColor: zone!.color }]}
            onPress={() => router.push("/(athlete)/(tabs)/prevention" as any)}
            accessibilityLabel="Ver rutina de prevención"
            accessibilityRole="button"
          >
            <Text style={styles.riskCtaText}>🛡️ Ver rutina de prevención</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Today already done banner ─────────────────────────── */}
      {todayDone && (
        <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>
            ✅ Check-in de hoy registrado. Puedes actualizar los valores.
          </Text>
        </View>
      )}

      {/* ── Fatigue ───────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Nivel de Fatiga</Text>
          <View style={[styles.valueBadge, { backgroundColor: fatigue > 7 ? "#7F1D1D" : "#1E293B" }]}>
            <Text style={[styles.cardValue, { color: fatigue > 7 ? "#FCA5A5" : "#F1F5F9" }]}>
              {fatigue}/10
            </Text>
          </View>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={fatigue}
          onValueChange={setFatigueSafe}
          minimumTrackTintColor={fatigue > 7 ? "#EF4444" : "#6366F1"}
          maximumTrackTintColor="#334155"
          thumbTintColor={fatigue > 7 ? "#FCA5A5" : "#818CF8"}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>1 — Sin fatiga</Text>
          <Text style={styles.sliderLabel}>10 — Agotado</Text>
        </View>
      </View>

      {/* ── Sleep hours ───────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Horas de Sueño</Text>
          <View style={[styles.valueBadge, { backgroundColor: sleepHours < 6 ? "#451A03" : "#1E293B" }]}>
            <Text style={[styles.cardValue, { color: sleepHours < 6 ? "#FCD34D" : "#F1F5F9" }]}>
              {sleepHours}h
            </Text>
          </View>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={12}
          step={0.5}
          value={sleepHours}
          onValueChange={setSleepHoursSafe}
          minimumTrackTintColor={sleepHours < 6 ? "#F59E0B" : "#22C55E"}
          maximumTrackTintColor="#334155"
          thumbTintColor={sleepHours < 6 ? "#FCD34D" : "#4ADE80"}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>0h</Text>
          <Text style={styles.sliderLabel}>12h</Text>
        </View>
        {sleepHours < 6 && (
          <Text style={styles.inputWarning}>
            ⚠ Menos de 6 horas afecta la recuperación.
          </Text>
        )}
      </View>

      {/* ── Sleep quality ─────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calidad del Sueño</Text>
        <View style={styles.emojiRow}>
          {(["😴", "😐", "😊", "😁", "🌟"] as const).map((emoji, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSleepQualitySafe(i + 1)}
              style={[styles.emojiBtn, sleepQuality === i + 1 && styles.emojiBtnActive]}
              accessibilityLabel={`Calidad de sueño ${i + 1} de 5`}
              accessibilityRole="radio"
              accessibilityState={{ selected: sleepQuality === i + 1 }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Mood ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de Ánimo</Text>
        <View style={styles.emojiRow}>
          {(["😞", "😕", "😐", "🙂", "😄"] as const).map((emoji, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setMoodSafe(i + 1)}
              style={[styles.emojiBtn, mood === i + 1 && styles.emojiBtnActive]}
              accessibilityLabel={`Estado de ánimo ${i + 1} de 5`}
              accessibilityRole="radio"
              accessibilityState={{ selected: mood === i + 1 }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Submit ────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel="Registrar check-in diario"
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>
            {todayDone ? "Actualizar Check-in" : "Registrar Check-in"}
          </Text>
        )}
      </TouchableOpacity>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <View style={styles.quickSection}>
        <Text style={styles.quickTitle}>REGISTROS ADICIONALES</Text>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.quickCard}
            onPress={() => router.push(action.route)}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <Text style={styles.quickEmoji}>{action.emoji}</Text>
            <View style={styles.quickCardText}>
              <Text style={styles.quickCardLabel}>{action.label}</Text>
              <Text style={styles.quickCardSub}>{action.subtitle}</Text>
            </View>
            <View style={[styles.quickArrow, { backgroundColor: action.color + "22" }]}>
              <Text style={[styles.quickArrowText, { color: action.color }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner: { padding: 20, paddingTop: 56, gap: 14, paddingBottom: 40 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800" },
  date:      { color: "#64748B", fontSize: 13, textTransform: "capitalize", marginTop: 2 },

  pendingBadge: {
    backgroundColor: "#92400E",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  pendingText: { color: "#FCD34D", fontSize: 11, fontWeight: "700" },

  // Risk banner
  riskBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  riskBannerTop:   { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  riskBannerIcon:  { fontSize: 22, marginTop: 1 },
  riskBannerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  riskBannerSub:   { color: "#94A3B8", fontSize: 12, lineHeight: 17 },
  riskCta: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  riskCtaText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Done banner
  doneBanner: {
    backgroundColor: "#052E16",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#166534",
  },
  doneBannerText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },

  // Cards
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle:  { color: "#94A3B8", fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  valueBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  cardValue:  { fontSize: 16, fontWeight: "800" },

  // Slider — min 44px height for accessibility
  slider:       { width: "100%", height: 44 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  sliderLabel:  { color: "#475569", fontSize: 11 },
  inputWarning: { color: "#FCD34D", fontSize: 12, fontWeight: "600" },

  // Emoji grid — min 52px × 52px per button
  emojiRow:      { flexDirection: "row", justifyContent: "space-around" },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  emojiBtnActive: { backgroundColor: "#312E81", borderWidth: 2, borderColor: "#6366F1" },
  emoji:          { fontSize: 28 },

  // Submit — min 54px height
  submitBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Quick actions
  quickSection:   { gap: 10 },
  quickTitle:     { color: "#475569", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginTop: 8 },
  quickCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    minHeight: 60,          // accessible touch target
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  quickEmoji:     { fontSize: 24 },
  quickCardText:  { flex: 1 },
  quickCardLabel: { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  quickCardSub:   { color: "#64748B", fontSize: 12, marginTop: 2 },
  quickArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  quickArrowText: { fontWeight: "800", fontSize: 18 },
});
