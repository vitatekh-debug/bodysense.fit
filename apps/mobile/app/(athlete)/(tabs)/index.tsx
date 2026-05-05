/**
 * Athlete Check-in — Bodysense Industrial Dark redesign
 *
 * Logic preserved from previous version (offline-first, toasts, skeleton, etc.)
 * Visual layer updated to Bodysense Design System:
 *   ✅ #080808 Industrial Dark background
 *   ✅ AthleteHeader with dot-grid, neon avatar, AcwrZonePill (pulsing dot)
 *   ✅ Glass cards: #111111 + border rgba(255,255,255,0.09)
 *   ✅ Uppercase 10px labels with 1.5 letter-spacing
 *   ✅ #818CF8 submit button (session registration)
 *   ✅ All quick-action arrows use brandLight
 *   ✅ Zero "Vitatekh" references
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
import { ACWR_ZONES } from "@vitatekh/shared";
import type { AcwrSnapshot } from "@vitatekh/shared";
import AthleteHeader from "../../../components/ui/AthleteHeader";
import { BS } from "../../../lib/theme";

// ─── Quick actions ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label:    "Registrar Dolor",
    emoji:    "🩹",
    subtitle: "Escala EVA 0–10",
    route:    "/(athlete)/register-pain" as const,
    color:    "#EF4444",
  },
  {
    label:    "Estado de Ánimo",
    emoji:    "🧠",
    subtitle: "Cuestionario POMS",
    route:    "/(athlete)/register-poms" as const,
    color:    BS.brandLight,          // #818CF8 — brand color for registration
  },
  {
    label:    "Registrar RPE",
    emoji:    "⚡",
    subtitle: "Esfuerzo post-sesión",
    route:    "/(athlete)/my-sessions" as const,
    color:    BS.brandLight,          // #818CF8 — session registration
  },
] as const;

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
  const [latestSnap,   setLatestSnap]   = useState<AcwrSnapshot | null>(null);

  // ── Load today's existing check-in + latest ACWR snapshot ───────
  // Promise.all for parallel fetching — no sequential waterfall
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
      // Trigger ACWR recalculation (non-blocking, best-effort)
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
  if (initializing) return <SkeletonCheckin />;

  return (
    <View style={styles.screen}>
      {/* ── High-impact header (outside scroll, fixed) ───────────── */}
      <AthleteHeader
        profile={profile}
        acwrRatio={latestSnap?.acwr_ratio ?? null}
        acwrZone={latestSnap?.risk_zone ?? null}
        pendingCount={pendingCount}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >

        {/* ── ACWR Risk Banner ─────────────────────────────────── */}
        {isAtRisk && latestSnap && (
          <View
            style={[
              styles.riskBanner,
              {
                borderColor:     zone!.color + "70",
                backgroundColor: zone!.color + "12",
              },
            ]}
          >
            <View style={styles.riskBannerTop}>
              <Text style={styles.riskBannerIcon}>
                {isCritical ? "🚨" : "⚠️"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.riskBannerTitle, { color: zone!.color }]}>
                  {isCritical ? "Riesgo Muy Alto" : "Riesgo Alto"} — ACWR{" "}
                  {latestSnap.acwr_ratio.toFixed(2)}
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
            <Text style={styles.cardLabel}>Nivel de Fatiga</Text>
            <View
              style={[
                styles.valueBadge,
                { backgroundColor: fatigue > 7 ? "rgba(127,29,29,0.8)" : BS.surfaceHigh },
              ]}
            >
              <Text
                style={[
                  styles.cardValue,
                  { color: fatigue > 7 ? "#FCA5A5" : BS.textPrimary },
                ]}
              >
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
            minimumTrackTintColor={fatigue > 7 ? BS.error : BS.brandLight}
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor={fatigue > 7 ? "#FCA5A5" : BS.brandLight}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 — Sin fatiga</Text>
            <Text style={styles.sliderLabel}>10 — Agotado</Text>
          </View>
        </View>

        {/* ── Sleep hours ───────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Horas de Sueño</Text>
            <View
              style={[
                styles.valueBadge,
                { backgroundColor: sleepHours < 6 ? "rgba(69,26,3,0.8)" : BS.surfaceHigh },
              ]}
            >
              <Text
                style={[
                  styles.cardValue,
                  { color: sleepHours < 6 ? "#FCD34D" : BS.textPrimary },
                ]}
              >
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
            minimumTrackTintColor={sleepHours < 6 ? BS.warning : BS.success}
            maximumTrackTintColor="rgba(255,255,255,0.1)"
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
          <Text style={styles.cardLabel}>Calidad del Sueño</Text>
          <View style={styles.emojiRow}>
            {(["😴", "😐", "😊", "😁", "🌟"] as const).map((emoji, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSleepQualitySafe(i + 1)}
                style={[
                  styles.emojiBtn,
                  sleepQuality === i + 1 && styles.emojiBtnActive,
                ]}
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
          <Text style={styles.cardLabel}>Estado de Ánimo</Text>
          <View style={styles.emojiRow}>
            {(["😞", "😕", "😐", "🙂", "😄"] as const).map((emoji, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setMoodSafe(i + 1)}
                style={[
                  styles.emojiBtn,
                  mood === i + 1 && styles.emojiBtnActive,
                ]}
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

        {/* ── Quick actions ─────────────────────────────────────── */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionLabel}>REGISTROS ADICIONALES</Text>
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
              <View
                style={[
                  styles.quickArrow,
                  { backgroundColor: action.color + "20" },
                ]}
              >
                <Text style={[styles.quickArrowText, { color: action.color }]}>
                  →
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom breathing room */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  screen: { flex: 1, backgroundColor: BS.void },
  scroll: { flex: 1, backgroundColor: BS.void },
  inner:  { padding: BS.pagePad, gap: BS.gap, paddingBottom: 40 },

  // ── Banners ──────────────────────────────────────────────────────
  riskBanner: {
    borderRadius: 14,
    borderWidth:  1.5,
    padding:      14,
    gap:          12,
  },
  riskBannerTop:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  riskBannerIcon: { fontSize: 22, marginTop: 1 },
  riskBannerTitle:{
    fontSize:   14,
    fontWeight: "800",
    marginBottom: 4,
  },
  riskBannerSub: {
    color:      BS.textSecondary,
    fontSize:   12,
    lineHeight: 17,
  },
  riskCta: {
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      "center",
  },
  riskCtaText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  doneBanner: {
    backgroundColor: "rgba(5,46,22,0.9)",
    borderRadius:    12,
    padding:         12,
    borderWidth:     1,
    borderColor:     "rgba(22,101,52,0.8)",
  },
  doneBannerText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },

  // ── Glass cards ──────────────────────────────────────────────────
  card: {
    backgroundColor: BS.surface,
    borderRadius:    BS.cardRadius,
    borderWidth:     1,
    borderColor:     BS.border,
    padding:         BS.cardPad,
    gap:             10,
  },
  cardHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  // Uppercase 10px label — matches web design spec
  cardLabel: {
    color:          BS.textMuted,
    fontSize:       10,
    fontWeight:     "700",
    letterSpacing:  BS.labelTracking,
    textTransform:  "uppercase",
  },
  valueBadge: {
    borderRadius:     20,
    paddingHorizontal: 12,
    paddingVertical:   4,
  },
  cardValue: { fontSize: 15, fontWeight: "800" },

  // Slider — min 44px for a11y
  slider: { width: "100%", height: 44 },
  sliderLabels: {
    flexDirection:  "row",
    justifyContent: "space-between",
    marginTop:      -4,
  },
  sliderLabel:  { color: BS.textDisabled, fontSize: 11 },
  inputWarning: { color: "#FCD34D", fontSize: 12, fontWeight: "600" },

  // Emoji grid — 52px min touch target
  emojiRow: { flexDirection: "row", justifyContent: "space-around" },
  emojiBtn: {
    width:           52,
    height:          52,
    borderRadius:    26,
    justifyContent:  "center",
    alignItems:      "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth:     1,
    borderColor:     "transparent",
  },
  emojiBtnActive: {
    backgroundColor: "rgba(129,140,248,0.15)",
    borderColor:     BS.brandLight,
  },
  emoji: { fontSize: 28 },

  // Submit — #818CF8 (brandLight) — session registration primary CTA
  submitBtn: {
    backgroundColor: BS.brandLight,
    borderRadius:    14,
    height:          54,
    alignItems:      "center",
    justifyContent:  "center",
    marginTop:       4,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Quick actions section
  quickSection: { gap: 10 },
  sectionLabel: {
    color:         BS.textDisabled,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: BS.labelTracking,
    textTransform: "uppercase",
    marginTop:     8,
  },
  quickCard: {
    backgroundColor: BS.surface,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     BS.border,
    padding:         16,
    minHeight:       60,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             14,
  },
  quickEmoji:     { fontSize: 24 },
  quickCardText:  { flex: 1 },
  quickCardLabel: {
    color:      BS.textPrimary,
    fontSize:   14,
    fontWeight: "700",
  },
  quickCardSub: {
    color:     BS.textMuted,
    fontSize:  12,
    marginTop: 2,
  },
  quickArrow: {
    width:          36,
    height:         36,
    borderRadius:   18,
    justifyContent: "center",
    alignItems:     "center",
  },
  quickArrowText: { fontWeight: "800", fontSize: 18 },
});
