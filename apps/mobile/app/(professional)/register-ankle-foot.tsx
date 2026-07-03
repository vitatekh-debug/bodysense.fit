/**
 * Pantalla: Evaluación de Tobillo, Pie y Rendimiento Funcional
 * Navegación: /(professional)/register-ankle-foot?athlete_id=xxx&athlete_name=Nombre
 *
 * Registra en ankle_foot_assessments (migración 009):
 *  1. Biomecánica — Feiss, ROM, WBLT, Windlass, pinzamiento, miofascial
 *  2. Fuerza y control motor — Daniels, Single-Leg Squat (checklist)
 *  3. Rendimiento — T-Test, Protocolo Bosco
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
import { ActiveScale } from "../../components/ui/Animated";
import type {
  FootType,
  MyofascialStatus,
  SlsOverallStatus,
} from "@vitatekh/shared";
import { WBLT_RISK_CM, DORSIFLEXION_RISK_DEG } from "@vitatekh/shared";

const FOOT_TYPES: { value: FootType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "flat",   label: "Plano" },
  { value: "cavus",  label: "Cavo" },
];

const MYOFASCIAL: { value: MyofascialStatus; label: string }[] = [
  { value: "optimal",    label: "Óptimo" },
  { value: "hypertonic", label: "Hipertónico" },
  { value: "phasic",     label: "Fásico" },
];

const SLS_STATUS: { value: SlsOverallStatus; label: string; color: string }[] = [
  { value: "optimal",     label: "Óptimo",     color: "#22C55E" },
  { value: "compensated", label: "Compensado", color: "#F59E0B" },
  { value: "deficient",   label: "Deficiente", color: "#EF4444" },
];

const SLS_COMPENSATIONS = [
  { key: "knee_valgus" as const,    label: "Valgo de rodilla" },
  { key: "pelvic_drop" as const,    label: "Caída pélvica" },
  { key: "trunk_rotation" as const, label: "Rotación de tronco" },
];

interface SlsState {
  knee_valgus: boolean;
  pelvic_drop: boolean;
  trunk_rotation: boolean;
  overall_status: SlsOverallStatus;
}

const EMPTY_SLS: SlsState = {
  knee_valgus: false,
  pelvic_drop: false,
  trunk_rotation: false,
  overall_status: "optimal",
};

export default function RegisterAnkleFootScreen() {
  const { athlete_id, athlete_name } = useLocalSearchParams<{
    athlete_id: string;
    athlete_name: string;
  }>();
  const { profile } = useAuthStore();

  // Biomecánica
  const [footTypeLeft, setFootTypeLeft]   = useState<FootType | null>(null);
  const [footTypeRight, setFootTypeRight] = useState<FootType | null>(null);
  const [dorsiLeft, setDorsiLeft]         = useState("");
  const [dorsiRight, setDorsiRight]       = useState("");
  const [plantiLeft, setPlantiLeft]       = useState("");
  const [plantiRight, setPlantiRight]     = useState("");
  const [wbltLeft, setWbltLeft]           = useState("");
  const [wbltRight, setWbltRight]         = useState("");
  const [windlassLeft, setWindlassLeft]   = useState(false);
  const [windlassRight, setWindlassRight] = useState(false);
  const [impingLeft, setImpingLeft]       = useState(false);
  const [impingRight, setImpingRight]     = useState(false);
  const [myofascial, setMyofascial]       = useState<MyofascialStatus | null>(null);

  // Fuerza y control motor
  const [danielsLeft, setDanielsLeft]   = useState("");
  const [danielsRight, setDanielsRight] = useState("");
  const [slsLeft, setSlsLeft]           = useState<SlsState>({ ...EMPTY_SLS });
  const [slsRight, setSlsRight]         = useState<SlsState>({ ...EMPTY_SLS });

  // Rendimiento
  const [tTest, setTTest]         = useState("");
  const [squatJump, setSquatJump] = useState("");
  const [cmj, setCmj]             = useState("");
  const [rsi, setRsi]             = useState("");

  const [submitting, setSubmitting] = useState(false);

  const num = (s: string): number | null => {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  function updateSls(side: "left" | "right", patch: Partial<SlsState>) {
    (side === "left" ? setSlsLeft : setSlsRight)((prev) => ({ ...prev, ...patch }));
  }

  const wbltWarn =
    (num(wbltLeft) !== null && num(wbltLeft)! < WBLT_RISK_CM) ||
    (num(wbltRight) !== null && num(wbltRight)! < WBLT_RISK_CM);
  const dorsiWarn =
    (num(dorsiLeft) !== null && num(dorsiLeft)! < DORSIFLEXION_RISK_DEG) ||
    (num(dorsiRight) !== null && num(dorsiRight)! < DORSIFLEXION_RISK_DEG);

  async function handleSubmit() {
    if (!profile || !athlete_id) return;
    setSubmitting(true);

    const hasBosco = [num(squatJump), num(cmj), num(rsi)].some((v) => v !== null);

    const { error } = await supabase.from("ankle_foot_assessments").insert({
      athlete_id,
      evaluated_by:               profile.id,
      foot_type_left:             footTypeLeft,
      foot_type_right:            footTypeRight,
      dorsiflexion_rom_left:      num(dorsiLeft),
      dorsiflexion_rom_right:     num(dorsiRight),
      plantiflexion_rom_left:     num(plantiLeft),
      plantiflexion_rom_right:    num(plantiRight),
      wblt_cm_left:               num(wbltLeft),
      wblt_cm_right:              num(wbltRight),
      windlass_test_left:         windlassLeft,
      windlass_test_right:        windlassRight,
      anterior_impingement_left:  impingLeft,
      anterior_impingement_right: impingRight,
      myofascial_status:          myofascial,
      daniels_muscle_grade_left:  num(danielsLeft),
      daniels_muscle_grade_right: num(danielsRight),
      single_leg_squat_left:      slsLeft,
      single_leg_squat_right:     slsRight,
      agility_t_test_seconds:     num(tTest),
      bosco_protocol: hasBosco
        ? {
            squat_jump_cm: num(squatJump) ?? 0,
            cmj_cm:        num(cmj) ?? 0,
            drop_jump_rsi: num(rsi) ?? 0,
          }
        : null,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert("Error", `No se pudo guardar: ${error.message}`);
      return;
    }

    Alert.alert("✅ Evaluación guardada", "Tobillo, pie y rendimiento funcional registrados.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  // ─── Render helpers ────────────────────────────────────────────

  function renderNumPair(
    label: string,
    unit: string,
    left: string,
    setLeft: (v: string) => void,
    right: string,
    setRight: (v: string) => void
  ) {
    return (
      <View style={styles.pairBlock}>
        <Text style={styles.fieldLabel}>{label} ({unit})</Text>
        <View style={styles.pairRow}>
          <View style={styles.pairField}>
            <Text style={styles.sideLabel}>Izq</Text>
            <TextInput
              style={styles.input}
              value={left}
              onChangeText={setLeft}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor="#475569"
            />
          </View>
          <View style={styles.pairField}>
            <Text style={styles.sideLabel}>Der</Text>
            <TextInput
              style={styles.input}
              value={right}
              onChangeText={setRight}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor="#475569"
            />
          </View>
        </View>
      </View>
    );
  }

  function renderCheck(label: string, checked: boolean, onToggle: () => void) {
    return (
      <ActiveScale active={checked}>
        <TouchableOpacity
          style={[styles.checkRow, checked && styles.checkRowActive]}
          onPress={onToggle}
          activeOpacity={0.85}
        >
          <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
            {checked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{label}</Text>
        </TouchableOpacity>
      </ActiveScale>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Tobillo, Pie y Rendimiento</Text>
      <Text style={styles.subtitle}>
        {athlete_name ?? "Atleta"} ·{" "}
        {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
      </Text>

      {/* ── 1. Biomecánica ── */}
      <Text style={styles.sectionLabel}>1 · BIOMECÁNICA CLÍNICA</Text>

      {(["left", "right"] as const).map((side) => {
        const value  = side === "left" ? footTypeLeft : footTypeRight;
        const setter = side === "left" ? setFootTypeLeft : setFootTypeRight;
        return (
          <View key={side}>
            <Text style={styles.fieldLabel}>
              Pisada {side === "left" ? "izquierda" : "derecha"} (Línea de Feiss)
            </Text>
            <View style={styles.chipRow}>
              {FOOT_TYPES.map((ft) => (
                <ActiveScale key={ft.value} active={value === ft.value}>
                  <TouchableOpacity
                    style={[styles.chip, value === ft.value && styles.chipActive]}
                    onPress={() => setter(value === ft.value ? null : ft.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, value === ft.value && styles.chipTextActive]}>
                      {ft.label}
                    </Text>
                  </TouchableOpacity>
                </ActiveScale>
              ))}
            </View>
          </View>
        );
      })}

      {renderNumPair("Dorsiflexión", "°", dorsiLeft, setDorsiLeft, dorsiRight, setDorsiRight)}
      {renderNumPair("Plantiflexión", "°", plantiLeft, setPlantiLeft, plantiRight, setPlantiRight)}
      {renderNumPair("WBLT", "cm", wbltLeft, setWbltLeft, wbltRight, setWbltRight)}

      {(wbltWarn || dorsiWarn) && (
        <View style={styles.warnCard}>
          <Text style={styles.warnText}>
            ⚠ Bajo el umbral (WBLT {"<"} {WBLT_RISK_CM} cm / dorsiflexión {"<"} {DORSIFLEXION_RISK_DEG}°).
            Se generará alerta de movilidad.
          </Text>
        </View>
      )}

      {renderCheck("Windlass ⊕ izquierdo", windlassLeft, () => setWindlassLeft(!windlassLeft))}
      {renderCheck("Windlass ⊕ derecho", windlassRight, () => setWindlassRight(!windlassRight))}
      {renderCheck("Pinzamiento anterior izq", impingLeft, () => setImpingLeft(!impingLeft))}
      {renderCheck("Pinzamiento anterior der", impingRight, () => setImpingRight(!impingRight))}

      <Text style={styles.fieldLabel}>Estado miofascial (gastro-sóleo-fascia)</Text>
      <View style={styles.chipRow}>
        {MYOFASCIAL.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.chip, myofascial === m.value && styles.chipActive]}
            onPress={() => setMyofascial(myofascial === m.value ? null : m.value)}
          >
            <Text style={[styles.chipText, myofascial === m.value && styles.chipTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 2. Fuerza y control motor ── */}
      <Text style={styles.sectionLabel}>2 · FUERZA Y CONTROL MOTOR</Text>
      {renderNumPair("Escala Daniels", "0-5", danielsLeft, setDanielsLeft, danielsRight, setDanielsRight)}

      {(["left", "right"] as const).map((side) => {
        const state = side === "left" ? slsLeft : slsRight;
        return (
          <View key={side} style={styles.slsCard}>
            <Text style={styles.slsTitle}>
              🦵 Single-Leg Squat — {side === "left" ? "izquierda" : "derecha"}
            </Text>
            {SLS_COMPENSATIONS.map((c) =>
              renderCheck(c.label, state[c.key], () =>
                updateSls(side, { [c.key]: !state[c.key] })
              )
            )}
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {SLS_STATUS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.chip,
                    state.overall_status === s.value && {
                      borderColor: s.color,
                      backgroundColor: s.color + "22",
                    },
                  ]}
                  onPress={() => updateSls(side, { overall_status: s.value })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      state.overall_status === s.value && { color: s.color },
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* ── 3. Rendimiento ── */}
      <Text style={styles.sectionLabel}>3 · AGILIDAD Y PLIOMETRÍA</Text>
      <View style={styles.pairBlock}>
        <Text style={styles.fieldLabel}>T-Test de agilidad (segundos)</Text>
        <TextInput
          style={styles.input}
          value={tTest}
          onChangeText={setTTest}
          keyboardType="decimal-pad"
          placeholder="ej. 10.25"
          placeholderTextColor="#475569"
        />
      </View>
      {renderNumPair("Bosco: SJ / CMJ", "cm", squatJump, setSquatJump, cmj, setCmj)}
      <View style={styles.pairBlock}>
        <Text style={styles.fieldLabel}>Drop Jump — RSI</Text>
        <TextInput
          style={styles.input}
          value={rsi}
          onChangeText={setRsi}
          keyboardType="decimal-pad"
          placeholder="ej. 1.40"
          placeholderTextColor="#475569"
        />
      </View>

      <View style={styles.refCard}>
        <Text style={styles.refTitle}>Baremos de referencia</Text>
        <Text style={styles.refRow}>WBLT ≥ 10 cm · Dorsiflexión ≥ 15° · Asimetría ≤ 2 cm</Text>
        <Text style={styles.refRow}>T-Test ≤ 11.5 s · CMJ ≥ 30 cm · RSI ≥ 1.0</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Guardar Evaluación</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  inner:     { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 14 },
  backBtn:   { marginBottom: 4 },
  backText:  { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  title:     { color: "#F1F5F9", fontSize: 26, fontWeight: "800" },
  subtitle:  { color: "#64748B", fontSize: 14, marginTop: -8 },

  sectionLabel: {
    color: "#818CF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 12,
  },
  fieldLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive:     { backgroundColor: "#312E81", borderColor: "#6366F1" },
  chipText:       { color: "#64748B", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#818CF8" },

  pairBlock: { gap: 2 },
  pairRow:   { flexDirection: "row", gap: 12 },
  pairField: { flex: 1, gap: 4 },
  sideLabel: { color: "#475569", fontSize: 10, fontWeight: "700", textAlign: "center" },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#334155",
    textAlign: "center",
  },

  warnCard: {
    backgroundColor: "#F59E0B15",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F59E0B44",
    padding: 12,
  },
  warnText: { color: "#F59E0B", fontSize: 12, fontWeight: "600" },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  checkRowActive: { borderColor: "#6366F1", backgroundColor: "#1E1B4B" },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  checkMark:      { color: "#fff", fontSize: 12, fontWeight: "900" },
  checkLabel:       { color: "#64748B", fontSize: 13, fontWeight: "600" },
  checkLabelActive: { color: "#C7D2FE" },

  slsCard: {
    backgroundColor: "#13203A",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  slsTitle: { color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 2 },

  refCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    gap: 4,
    marginTop: 8,
  },
  refTitle: { color: "#64748B", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  refRow:   { color: "#94A3B8", fontSize: 12 },

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
