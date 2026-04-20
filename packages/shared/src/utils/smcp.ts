import type {
  EvaTrafficLight,
  HqRatioType,
  PomsAlertLevel,
  HqRiskLevel,
} from "../types/index";

// ─── POMS / TMD ───────────────────────────────────────────────────────────────

/**
 * TMD thresholds for the 0-4 scale per dimension (Short Form).
 * Range: -4 (best, max vigor=4, all negatives=0) to 20 (worst).
 *
 * Clinical cutoffs (adapted from Morgan's iceberg profile research):
 *   TMD ≤  0 → normal / positive adaptation (iceberg profile intact)
 *   TMD 1-7  → warning (monitor, reduce intensity)
 *   TMD > 7  → overtraining risk (immediate intervention)
 */
export function getPomsAlertLevel(tmd: number): PomsAlertLevel {
  if (tmd <= 0) return "normal";
  if (tmd <= 7) return "warning";
  return "overtraining_risk";
}

export const POMS_ALERT_CONFIG: Record<
  PomsAlertLevel,
  { label: string; color: string; description: string }
> = {
  normal: {
    label: "Adaptación positiva",
    color: "#22C55E",
    description: "Perfil iceberg intacto. Continuar con el plan.",
  },
  warning: {
    label: "Estado de alerta",
    color: "#F59E0B",
    description: "Disturbio emocional moderado. Reducir carga o recuperación activa.",
  },
  overtraining_risk: {
    label: "Riesgo de sobreentrenamiento",
    color: "#EF4444",
    description: "TMD elevado. Reducir volumen e intensidad de inmediato.",
  },
};

/**
 * Returns true if the POMS pattern suggests overtraining (0-4 scale).
 * High confusion + high fatigue + low vigor (inverted iceberg).
 */
export function isOvertrained(opts: {
  confusion: number;
  fatigue_poms: number;
  vigor: number;
}): boolean {
  return opts.confusion >= 3 && opts.fatigue_poms >= 3 && opts.vigor <= 1;
}

/**
 * Formats a TMD score for display (e.g. "+12" or "-5").
 */
export function formatTmd(tmd: number): string {
  return tmd >= 0 ? `+${tmd}` : `${tmd}`;
}

// ─── H/Q Ratio ────────────────────────────────────────────────────────────────

/**
 * Thresholds (Kannus 1994, Croisier 2008):
 *   Conventional (60°/s):  H/Q < 0.60 = at risk, 0.60-0.65 = borderline, ≥ 0.65 = safe
 *   Functional   (180°/s): H/Q < 1.00 = at risk, 1.00-1.10 = borderline, ≥ 1.10 = safe
 */
export function getHqRiskLevel(ratio: number, type: HqRatioType): HqRiskLevel {
  if (type === "conventional") {
    if (ratio < 0.60) return "at_risk";
    if (ratio < 0.65) return "borderline";
    return "safe";
  }
  // functional
  if (ratio < 1.00) return "at_risk";
  if (ratio < 1.10) return "borderline";
  return "safe";
}

export const HQ_RISK_CONFIG: Record<
  HqRiskLevel,
  { label: string; color: string; description: string }
> = {
  safe: {
    label: "Sin riesgo",
    color: "#22C55E",
    description: "Ratio H/Q dentro de parámetros normales.",
  },
  borderline: {
    label: "Límite",
    color: "#F59E0B",
    description: "Ratio H/Q en zona límite. Refuerzo preventivo recomendado.",
  },
  at_risk: {
    label: "En riesgo",
    color: "#EF4444",
    description: "Desequilibrio muscular significativo. Riesgo elevado de lesión isquiotibial.",
  },
};

/** Returns the threshold for a given H/Q ratio type */
export function getHqThreshold(type: HqRatioType): number {
  return type === "conventional" ? 0.60 : 1.00;
}

// ─── EVA Pain Scale ───────────────────────────────────────────────────────────

/**
 * EVA (Escala Visual Analógica) traffic light:
 *   0-3  → green  (tolerable, continue training with monitoring)
 *   4-6  → yellow (moderate, modify training load)
 *   7-10 → red    (severe, stop and refer to medical staff)
 */
export function getEvaTrafficLight(score: number): EvaTrafficLight {
  if (score <= 3) return "green";
  if (score <= 6) return "yellow";
  return "red";
}

export const EVA_TRAFFIC_LIGHT_CONFIG: Record<
  EvaTrafficLight,
  { label: string; color: string; bgColor: string; action: string }
> = {
  green: {
    label: "Verde — Tolerable",
    color: "#22C55E",
    bgColor: "#22C55E22",
    action: "Continuar entrenamiento con monitoreo.",
  },
  yellow: {
    label: "Amarillo — Moderado",
    color: "#F59E0B",
    bgColor: "#F59E0B22",
    action: "Modificar carga de entrenamiento. Reevaluar en 48h.",
  },
  red: {
    label: "Rojo — Severo",
    color: "#EF4444",
    bgColor: "#EF444422",
    action: "Detener actividad. Derivar al equipo médico.",
  },
};

// ─── FMS Score ────────────────────────────────────────────────────────────────

/** Names of the 7 FMS movement patterns — keys match exact DB column names */
export const FMS_PATTERNS = [
  { key: "fms_deep_squat",          label: "Sentadilla profunda" },
  { key: "fms_hurdle_step",         label: "Paso de valla" },
  { key: "fms_inline_lunge",        label: "Zancada en línea" },
  { key: "fms_shoulder_mobility",   label: "Movilidad de hombro" },
  { key: "fms_aslr",                label: "Elevación pierna recta" },
  { key: "fms_trunk_stability",     label: "Estabilidad de tronco" },
  { key: "fms_rotary_stability",    label: "Estabilidad rotatoria" },
] as const;

/**
 * FMS injury risk: total score ≤ 14 = elevated risk.
 * A score of 0 on any pattern also flags risk (pain present).
 */
export function getFmsRiskLevel(
  total: number,
  patterns?: number[]
): { isRisk: boolean; reason: string } {
  if (patterns && patterns.some((p) => p === 0)) {
    return { isRisk: true, reason: "Patrón con dolor (puntuación 0) detectado." };
  }
  if (total <= 14) {
    return { isRisk: true, reason: `Puntuación FMS total (${total}) ≤ 14 — riesgo elevado.` };
  }
  return { isRisk: false, reason: `Puntuación FMS total (${total}) — sin riesgo por puntaje.` };
}

export const FMS_SCORE_LABELS: Record<number, string> = {
  0: "Dolor",
  1: "No puede realizar",
  2: "Realiza con compensación",
  3: "Patrón correcto",
};

// ─── Quick Wellness POMS indicators ──────────────────────────────────────────

/**
 * Quick daily check interpretation.
 * Vigor ↓ + Confusion ↑ = early overtraining signal.
 */
export function interpretQuickPoms(vigor: number, confusion: number): {
  level: "ok" | "caution" | "alert";
  message: string;
} {
  if (confusion >= 3 && vigor <= 1) {
    return { level: "alert", message: "Señal temprana de sobreentrenamiento. Revisar carga." };
  }
  if (confusion >= 2 || vigor <= 1) {
    return { level: "caution", message: "Estado de atención. Monitorear los próximos días." };
  }
  return { level: "ok", message: "Estado psicológico dentro de parámetros normales." };
}
