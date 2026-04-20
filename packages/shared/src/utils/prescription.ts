/**
 * Vitatekh — Motor de Prescripción Inteligente
 *
 * Analiza el cruce de variables de un atleta (ACWR, POMS, H/Q, EVA, Wellness, FMS)
 * y genera recomendaciones clínicas automáticas con nivel de alerta, protocolo,
 * acciones concretas y ajuste de carga.
 *
 * Arquitectura: funciones puras (sin I/O), 100% testeable.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertLevel = "red" | "orange" | "yellow" | "info";

export interface PrescriptionAction {
  label: string;
  type: "exercise" | "rest" | "nutrition" | "medical" | "equipment";
  protocol?: string;
  description: string;
  sets?: number;
  reps?: number;
  duration_min?: number;
  video_url?: string;
}

export interface LoadAdjustment {
  /** Porcentaje de cambio: -50 = reducir 50%, 0 = mantener */
  percentage: number;
  target: "volume" | "intensity" | "both" | "stop";
  duration_days: number;
  description: string;
}

export interface Prescription {
  /** ID estable de la regla — útil para deduplicar en UI */
  rule_id: string;
  athlete_id: string;
  athlete_name: string;
  alert_level: AlertLevel;
  protocol_name: string;
  /** Mensaje corto para el dashboard */
  short_message: string;
  /** Explicación clínica completa */
  rationale: string;
  actions: PrescriptionAction[];
  load_adjustment?: LoadAdjustment;
  /** Contexto biomecánico enriquecido (superficie + calzado) */
  biomech_context?: string;
  /** Variables que dispararon la alerta */
  triggered_by: string[];
}

/**
 * Snapshot de datos de un atleta para el motor de reglas.
 * Todos los campos son opcionales — el motor ignora reglas sin datos.
 */
export interface AthleteRuleInput {
  athlete_id: string;
  athlete_name: string;
  sport?: string;
  // ACWR
  acwr_ratio?: number;
  acwr_risk_zone?: string;
  // POMS (escala 0-4)
  poms_vigor?: number;       // 0-4: 0=ninguno, 4=máximo
  poms_tmd?: number;         // -4..20: positivo = mal estado
  poms_confusion?: number;   // 0-4
  poms_fatigue_poms?: number;// 0-4
  // H/Q Ratio
  hq_ratio?: number;
  hq_ratio_type?: "conventional" | "functional";
  hq_risk_flag?: boolean;
  // EVA Dolor
  eva_score?: number;        // 0-10
  pain_region?: string;      // pain_region enum
  pain_traffic_light?: string;
  pain_date?: string;
  // Wellness diario
  sleep_hours?: number;      // 0-16
  fatigue?: number;          // 1-10
  mood?: number;             // 1-5
  // FMS
  fms_total?: number;        // 0-21
  fms_injury_risk?: boolean;
  fms_has_pain_pattern?: boolean; // algún patrón con score 0
  // Biomecánica (para contexto)
  surface_type?: string;
  footwear_type?: string;
  biomech_date?: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const SURFACE_LABELS: Record<string, string> = {
  natural_grass:       "césped natural",
  artificial_grass_3g: "césped artificial 3G",
  artificial_grass_4g: "césped artificial 4G",
  hard_court:          "pista dura",
  parquet:             "parqué",
  tartan:              "tartán",
  sand:                "arena",
  gym_floor:           "suelo de gimnasio",
  other:               "superficie no especificada",
};

const FOOTWEAR_LABELS: Record<string, string> = {
  cleats_fg:   "tacos FG (césped firme)",
  cleats_ag:   "tacos AG (césped artificial)",
  cleats_sg:   "tacos SG (terreno blando)",
  turf:        "zapatillas turf",
  basketball:  "zapatillas de baloncesto",
  volleyball:  "zapatillas de voleibol",
  running:     "zapatillas de running",
  training:    "zapatillas de entrenamiento",
  barefoot:    "descalzo",
  other:       "calzado no especificado",
};

const PAIN_REGION_LABELS: Record<string, string> = {
  hamstring_left:  "isquiotibial izquierdo",
  hamstring_right: "isquiotibial derecho",
  knee_left:       "rodilla izquierda",
  knee_right:      "rodilla derecha",
  ankle_left:      "tobillo izquierdo",
  ankle_right:     "tobillo derecho",
  lumbar:          "zona lumbar",
  hip_left:        "cadera izquierda",
  hip_right:       "cadera derecha",
  groin_left:      "ingle izquierda",
  groin_right:     "ingle derecha",
  calf_left:       "gemelo izquierdo",
  calf_right:      "gemelo derecho",
};

const HAMSTRING_REGIONS = new Set([
  "hamstring_left", "hamstring_right",
  "knee_left", "knee_right",
  "calf_left", "calf_right",
]);

const ANKLE_REGIONS = new Set([
  "ankle_left", "ankle_right",
  "foot_left", "foot_right",
]);

/** Vídeos de referencia (YouTube search URL para evitar enlaces rotos) */
const VIDEO_URLS = {
  nordic_hamstring: "https://www.youtube.com/results?search_query=nordic+hamstring+curl+protocol",
  fifa_11_plus:     "https://www.youtube.com/results?search_query=FIFA+11+plus+calentamiento",
  hip_hinge_eccentric: "https://www.youtube.com/results?search_query=hip+hinge+eccentric+RDL",
  mobility_routine: "https://www.youtube.com/results?search_query=rutina+movilidad+deportiva",
  hsr_protocol:     "https://www.youtube.com/results?search_query=heavy+slow+resistance+isquiotibiales",
  foam_rolling:     "https://www.youtube.com/results?search_query=foam+rolling+recuperacion+deportiva",
};

// ─── Motor de Reglas ──────────────────────────────────────────────────────────

/**
 * Evalúa todas las reglas sobre el snapshot del atleta y devuelve
 * las prescripciones ordenadas por severidad (rojo → naranja → amarillo → info).
 */
export function runPrescriptionRules(input: AthleteRuleInput): Prescription[] {
  const prescriptions: Prescription[] = [];

  // ── Contexto biomecánico (enriquece otras reglas) ──────────────
  const biomechContext = buildBiomechContext(input);

  // ════════════════════════════════════════════════════════════════
  // REGLA R1 — ROJO: ACWR > 1.5 Y Vigor < 3
  // Cruce crítico: sobrecarga acumulada + depleción psicológica
  // ════════════════════════════════════════════════════════════════
  if (
    input.acwr_ratio !== undefined && input.acwr_ratio > 1.5 &&
    input.poms_vigor !== undefined && input.poms_vigor < 3
  ) {
    prescriptions.push({
      rule_id: "R1_overtraining_critical",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: "red",
      protocol_name: "Protocolo de Descarga Urgente",
      short_message:
        "Riesgo inminente de sobreentrenamiento. Reducir carga un 50% y priorizar sueño > 8h.",
      rationale:
        `ACWR ${input.acwr_ratio.toFixed(2)} (zona muy alta) combinado con Vigor POMS ${input.poms_vigor}/4. ` +
        "El cruce de sobrecarga externa + depleción psicológica es el indicador más robusto de riesgo de sobreentrenamiento " +
        "según Morgan et al. (1987) y Meeusen et al. (2013, ECSS).",
      triggered_by: [`ACWR ${input.acwr_ratio.toFixed(2)}`, `Vigor ${input.poms_vigor}/4`],
      actions: [
        {
          label: "Día de recuperación activa",
          type: "rest",
          description: "Sesión de 30 min: movilidad articular suave + respiración diafragmática. Sin cargas.",
          duration_min: 30,
          video_url: VIDEO_URLS.mobility_routine,
        },
        {
          label: "Protocolo de sueño",
          type: "rest",
          description: "Priorizar > 8h de sueño. Eliminar pantallas 1h antes de dormir. Temperatura habitación 18-20°C.",
        },
        {
          label: "Nutrición de recuperación",
          type: "nutrition",
          description: "2.0-2.2 g proteína/kg/día. CHO de bajo IG post-sesión. Hidratación 40 ml/kg/día.",
        },
      ],
      load_adjustment: {
        percentage: -50,
        target: "both",
        duration_days: 5,
        description: "Reducir volumen e intensidad un 50% durante 5 días. Reevaluar ACWR al 3er día.",
      },
      biomech_context: biomechContext ?? undefined,
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R2 — ROJO: Dolor severo (EVA > 6) + Carga alta (ACWR > 1.3)
  // ════════════════════════════════════════════════════════════════
  if (
    input.eva_score !== undefined && input.eva_score > 6 &&
    input.acwr_ratio !== undefined && input.acwr_ratio > 1.3
  ) {
    const regionLabel = input.pain_region
      ? (PAIN_REGION_LABELS[input.pain_region] ?? input.pain_region.replace(/_/g, " "))
      : "zona afectada";

    prescriptions.push({
      rule_id: "R2_severe_pain_high_load",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: "red",
      protocol_name: "Detención y Evaluación Médica",
      short_message: `Dolor severo (EVA ${input.eva_score}/10) con carga elevada. Detener actividad. Derivar a fisioterapeuta.`,
      rationale:
        `EVA ${input.eva_score}/10 en ${regionLabel} con ACWR ${input.acwr_ratio?.toFixed(2)}. ` +
        "Continuar entrenando con dolor ≥7 y carga elevada multiplica el riesgo de lesión estructural. " +
        "Protocolo: descanso completo + evaluación clínica antes de retorno deportivo.",
      triggered_by: [`EVA ${input.eva_score}/10`, `ACWR ${input.acwr_ratio?.toFixed(2)}`],
      actions: [
        {
          label: "Evaluación fisioterapéutica",
          type: "medical",
          description: "Valoración clínica en < 48h. Descartar lesión estructural antes de retorno.",
        },
        {
          label: "PRICE: Protección, Reposo, Hielo",
          type: "rest",
          description: "Aplicar protocolo PRICE en la zona afectada. 15-20 min de crioterapia cada 2-3h las primeras 48h.",
        },
      ],
      load_adjustment: {
        percentage: -100,
        target: "stop",
        duration_days: 3,
        description: "Detener entrenamiento hasta evaluación médica. Retorno progresivo según fisioterapeuta.",
      },
      biomech_context: biomechContext ?? undefined,
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R3 — NARANJA: H/Q en riesgo O dolor en isquios/rodilla EVA > 4
  // Déficit excéntrico → protocolo Nordic + HSR
  // ════════════════════════════════════════════════════════════════
  const hqAtRisk = input.hq_risk_flag === true;
  const hamstringPain =
    input.pain_region !== undefined &&
    HAMSTRING_REGIONS.has(input.pain_region) &&
    (input.eva_score ?? 0) > 4;

  if (hqAtRisk || hamstringPain) {
    const triggers: string[] = [];
    if (hqAtRisk)
      triggers.push(
        `H/Q ${input.hq_ratio?.toFixed(2)} ${input.hq_ratio_type === "functional" ? "(func)" : "(conv)"} < umbral`
      );
    if (hamstringPain)
      triggers.push(
        `Dolor ${PAIN_REGION_LABELS[input.pain_region!] ?? input.pain_region} EVA ${input.eva_score}`
      );

    const regionLabel = input.pain_region
      ? (PAIN_REGION_LABELS[input.pain_region] ?? input.pain_region.replace(/_/g, " "))
      : "";
    const contextNote = biomechContext ?? "";

    prescriptions.push({
      rule_id: "R3_hamstring_deficit",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: "orange",
      protocol_name: "Nordic Hamstring + HSR",
      short_message:
        "Déficit excéntrico detectado. Sustituir sprints por protocolo Nordic Hamstring (3×8) y HSR.",
      rationale:
        `${triggers.join(" + ")}. ` +
        "El déficit de fuerza excéntrica isquiotibial es el principal predictor de lesión de isquios en deportes de equipo " +
        "(Croisier et al. 2008, AJSM). El protocolo Nordic Hamstring reduce la incidencia en un 51% " +
        "(Petersen et al. 2011, AJSM). HSR (Heavy Slow Resistance) acelera la remodelación del tendón.",
      triggered_by: triggers,
      actions: [
        {
          label: "Nordic Hamstring Curl",
          type: "exercise",
          protocol: "Programa Nórdico Progresivo (11 semanas)",
          description:
            "Fase 1 (sem 1-2): 2×5 con banda. Fase 2 (sem 3-6): 3×8. Fase 3 (sem 7-11): 3×10 sin asistencia. " +
            "Velocidad: excéntrico 3-4s, retorno asistido.",
          sets: 3,
          reps: 8,
          video_url: VIDEO_URLS.nordic_hamstring,
        },
        {
          label: "RDL Excéntrico (Hip Hinge)",
          type: "exercise",
          description: "3×10 con mancuerna o barra. Excéntrico 4s. Rango completo. Sustituye sprint en sesión.",
          sets: 3,
          reps: 10,
          video_url: VIDEO_URLS.hip_hinge_eccentric,
        },
        {
          label: "Heavy Slow Resistance (HSR)",
          type: "exercise",
          protocol: "HSR para tendinopatía isquiotibial",
          description:
            "Leg curl sentado 70% 1RM. 3×8-15. 3 veces/semana. " +
            "Progresión cada 2 semanas según umbral de dolor (EVA ≤ 3 durante el ejercicio).",
          sets: 3,
          reps: 12,
          video_url: VIDEO_URLS.hsr_protocol,
        },
      ],
      load_adjustment: {
        percentage: -30,
        target: "volume",
        duration_days: 14,
        description:
          "Reducir volumen de carrera/sprint un 30%. Mantener técnica y táctica. Reevaluar H/Q en 3 semanas.",
      },
      biomech_context: contextNote || undefined,
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R4 — NARANJA: FMS ≤ 14 o patrón con dolor (score 0)
  // ════════════════════════════════════════════════════════════════
  if (input.fms_injury_risk === true || input.fms_has_pain_pattern === true) {
    const triggers: string[] = [];
    if (input.fms_total !== undefined)
      triggers.push(`FMS total ${input.fms_total}/21 (umbral ≤14)`);
    if (input.fms_has_pain_pattern)
      triggers.push("Patrón FMS con dolor detectado (score 0)");

    prescriptions.push({
      rule_id: "R4_fms_risk",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: input.fms_has_pain_pattern ? "orange" : "yellow",
      protocol_name: "FIFA 11+ / Corrección FMS",
      short_message: `FMS ${input.fms_total ?? "—"}/21. Riesgo de lesión por patrón de movimiento. Activar FIFA 11+ y trabajo correctivo.`,
      rationale:
        `${triggers.join(". ")}. ` +
        "Una puntuación FMS ≤14 predice lesión con sensibilidad del 54% y especificidad del 67% " +
        "(Kiesel et al. 2007). El patrón con score 0 indica dolor activo durante el movimiento, " +
        "que requiere evaluación clínica antes de continuar entrenando.",
      triggered_by: triggers,
      actions: [
        {
          label: "Calentamiento FIFA 11+",
          type: "exercise",
          protocol: "FIFA 11+ (Completo)",
          description:
            "20 min antes de cada entrenamiento. 3 partes: carrera suave → ejercicios de fuerza/equilibrio → carrera progresiva. " +
            "Reduce lesiones un 30-50% en fútbol y deportes de equipo.",
          duration_min: 20,
          video_url: VIDEO_URLS.fifa_11_plus,
        },
        {
          label: "Trabajo correctivo FMS",
          type: "exercise",
          description:
            "Abordar el patrón de menor puntuación primero. " +
            "Si fms_inline_lunge < 2: movilidad de cadera + estabilidad de tobillo. " +
            "Si fms_deep_squat < 2: movilidad de tobillo + control de cadera.",
          duration_min: 15,
        },
        {
          label: input.fms_has_pain_pattern ? "Evaluación médica (patrón doloroso)" : "Reevaluar FMS en 4 semanas",
          type: input.fms_has_pain_pattern ? "medical" : "exercise",
          description: input.fms_has_pain_pattern
            ? "Un score 0 requiere valoración clínica antes de retorno a plena actividad."
            : "Repetir FMS completo tras 4 semanas de trabajo correctivo para cuantificar mejora.",
        },
      ],
      biomech_context: biomechContext ?? undefined,
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R5 — AMARILLO: Sueño < 6h Y Fatiga > 7
  // Recuperación incompleta
  // ════════════════════════════════════════════════════════════════
  if (
    input.sleep_hours !== undefined && input.sleep_hours < 6 &&
    input.fatigue !== undefined && input.fatigue > 7
  ) {
    prescriptions.push({
      rule_id: "R5_poor_recovery",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: "yellow",
      protocol_name: "Protocolo de Recuperación",
      short_message:
        "Recuperación incompleta. Sugerir sesión de movilidad y aumento de ingesta proteica.",
      rationale:
        `Sueño ${input.sleep_hours.toFixed(1)}h (< 6h) + Fatiga ${input.fatigue}/10. ` +
        "La privación de sueño < 6h reduce la fuerza muscular un 3-8%, el tiempo de reacción un 20% " +
        "y aumenta el cortisol matutino un 37% (Skein et al. 2011). " +
        "La fatiga subjetiva > 7 es predictor de sobreentrenamiento a corto plazo.",
      triggered_by: [`Sueño ${input.sleep_hours.toFixed(1)}h`, `Fatiga ${input.fatigue}/10`],
      actions: [
        {
          label: "Sesión de movilidad y activación",
          type: "rest",
          description:
            "30 min: foam rolling 10 min → movilidad articular dinámica 10 min → respiración 10 min. " +
            "Sin ejercicio de alta intensidad.",
          duration_min: 30,
          video_url: VIDEO_URLS.foam_rolling,
        },
        {
          label: "Nutrición de recuperación nocturna",
          type: "nutrition",
          description:
            "30 min antes de dormir: 40g caseína o 250ml leche entera. " +
            "Aumentar ingesta proteica total: 2.0-2.2g/kg/día durante la semana.",
        },
        {
          label: "Higiene del sueño",
          type: "rest",
          description:
            "Temperatura habitación 17-19°C. Oscuridad total. Sin pantallas 60 min antes. " +
            "Siesta de 20 min si hay doble sesión (no > 30 min para evitar inercia del sueño).",
        },
      ],
      load_adjustment: {
        percentage: -20,
        target: "volume",
        duration_days: 2,
        description:
          "Reducir volumen de sesión un 20% hoy y mañana. Mantener intensidad técnica/táctica.",
      },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R6 — AMARILLO: POMS TMD > 7
  // Disturbio psicológico moderado
  // ════════════════════════════════════════════════════════════════
  if (input.poms_tmd !== undefined && input.poms_tmd > 7) {
    const isOvertraining = input.poms_tmd > 14;
    prescriptions.push({
      rule_id: "R6_poms_disturbance",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: isOvertraining ? "orange" : "yellow",
      protocol_name: "Gestión Psicológica de Carga",
      short_message:
        `TMD ${input.poms_tmd > 0 ? "+" : ""}${input.poms_tmd} — ${isOvertraining ? "Riesgo de sobreentrenamiento" : "Estado de alerta"}. Revisar carga y gestionar estrés.`,
      rationale:
        `TMD score: ${input.poms_tmd > 0 ? "+" : ""}${input.poms_tmd}` +
        (input.poms_vigor !== undefined ? `, Vigor: ${input.poms_vigor}/4` : "") +
        ". El POMS es el instrumento más validado para detectar sobreentrenamiento temprano " +
        "(Morgan 1987, Meeusen 2013). Un TMD positivo con Vigor bajo (perfil de iceberg invertido) " +
        "precede a la caída de rendimiento en 7-14 días si no se interviene.",
      triggered_by: [
        `TMD ${input.poms_tmd > 0 ? "+" : ""}${input.poms_tmd}`,
        ...(input.poms_vigor !== undefined ? [`Vigor ${input.poms_vigor}/4`] : []),
        ...(input.poms_confusion !== undefined && input.poms_confusion >= 3
          ? [`Confusión alta (${input.poms_confusion}/4)`] : []),
      ],
      actions: [
        {
          label: "Conversación individual con el atleta",
          type: "rest",
          description:
            "Reunión de 10 min. Explorar: percepción de carga, vida personal, motivación. " +
            "No preguntar solo '¿cómo estás?' — usar escala de Percepción Subjetiva de Entrenamiento.",
        },
        {
          label: "Reducir presión competitiva esta semana",
          type: "rest",
          description:
            "Eliminar ejercicios tácticos de alta presión. Priorizar técnica en contexto lúdico. " +
            "Aumentar autonomía del atleta en las decisiones del entrenamiento.",
        },
        {
          label: isOvertraining ? "Semana de descarga formal" : "Ajuste de sesión",
          type: "rest",
          description: isOvertraining
            ? "Semana de descarga: reducir 40% volumen + 30% intensidad. Trabajo de fuerza en rangos sub-máximos."
            : "Hoy: sesión de menor intensidad. Foco en táctico/técnico. Evitar series físicas al fallo.",
        },
      ],
      load_adjustment: {
        percentage: isOvertraining ? -40 : -25,
        target: "intensity",
        duration_days: isOvertraining ? 7 : 3,
        description: isOvertraining
          ? "Semana de descarga completa. POMS obligatorio al día 5 para reevaluar."
          : "Reducir intensidad 25% durante 3 días. Mantener volumen técnico.",
      },
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R7 — AMARILLO: ACWR en zona alta (1.3-1.5) sin otras alertas
  // Monitoreo preventivo
  // ════════════════════════════════════════════════════════════════
  if (
    input.acwr_ratio !== undefined &&
    input.acwr_ratio >= 1.3 &&
    input.acwr_ratio < 1.5 &&
    !prescriptions.some((p) => p.rule_id === "R1_overtraining_critical")
  ) {
    prescriptions.push({
      rule_id: "R7_acwr_high_zone",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: "yellow",
      protocol_name: "Monitoreo Intensivo de Carga",
      short_message: `ACWR ${input.acwr_ratio.toFixed(2)} — zona de riesgo. Mantener carga actual. Sin añadir estímulos extra.`,
      rationale:
        `ACWR ${input.acwr_ratio.toFixed(2)} entre 1.3 y 1.5. ` +
        "El 'sweet spot' de ACWR está entre 0.8 y 1.3 (Gabbett 2016). " +
        "Valores entre 1.3-1.5 indican que la carga aguda supera la capacidad de adaptación crónica. " +
        "Sin síntomas adicionales, es suficiente monitorear y no añadir carga.",
      triggered_by: [`ACWR ${input.acwr_ratio.toFixed(2)}`],
      actions: [
        {
          label: "Mantener carga de la semana sin modificar",
          type: "rest",
          description: "No añadir sesiones extra ni aumentar intensidad esta semana. Respetar días de descanso planificados.",
        },
        {
          label: "Monitorear RPE post-sesión",
          type: "rest",
          description:
            "Si el atleta reporta RPE > 17 dos días seguidos, activar protocolo de descarga (Regla R1). " +
            "Registrar bienestar diario esta semana.",
        },
      ],
    });
  }

  // ════════════════════════════════════════════════════════════════
  // REGLA R8 — INFO: Dolor tobillo/pie + contexto de calzado/superficie
  // Alerta biomecánica de equipamiento
  // ════════════════════════════════════════════════════════════════
  if (
    input.pain_region !== undefined &&
    ANKLE_REGIONS.has(input.pain_region) &&
    (input.surface_type !== undefined || input.footwear_type !== undefined) &&
    (input.eva_score ?? 0) > 0
  ) {
    const surfaceLabel = input.surface_type
      ? (SURFACE_LABELS[input.surface_type] ?? input.surface_type)
      : null;
    const footwearLabel = input.footwear_type
      ? (FOOTWEAR_LABELS[input.footwear_type] ?? input.footwear_type)
      : null;
    const regionLabel =
      PAIN_REGION_LABELS[input.pain_region] ?? input.pain_region.replace(/_/g, " ");

    prescriptions.push({
      rule_id: "R8_equipment_context",
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      alert_level: "info",
      protocol_name: "Revisión de Equipamiento",
      short_message:
        `El dolor de ${regionLabel} coincide con ${footwearLabel ?? "calzado actual"} en ${surfaceLabel ?? "superficie actual"}. Revisar equipamiento.`,
      rationale:
        `Dolor en ${regionLabel} (EVA ${input.eva_score})` +
        (footwearLabel ? ` con ${footwearLabel}` : "") +
        (surfaceLabel ? ` sobre ${surfaceLabel}` : "") +
        ". La combinación calzado-superficie modifica la transmisión de impactos y la cinemática del tobillo. " +
        "Un calzado desgastado (> 500 km) o inadecuado para la superficie puede aumentar la carga articular un 20-30%.",
      triggered_by: [
        `Dolor ${regionLabel} EVA ${input.eva_score}`,
        ...(footwearLabel ? [footwearLabel] : []),
        ...(surfaceLabel ? [surfaceLabel] : []),
      ],
      actions: [
        {
          label: "Revisar desgaste del calzado",
          type: "equipment",
          description:
            "Evaluar suela del calzado. Si hay desgaste asimétrico en el talón o la puntera, reemplazar. " +
            "Vida útil estimada: 400-700 km según fabricante.",
        },
        {
          label: "Valorar plantillas ortopédicas",
          type: "equipment",
          description:
            "Si el dolor es recurrente con el mismo calzado, derivar a podólogo para análisis de pisada. " +
            "Plantillas personalizadas reducen lesiones por impacto en un 28%.",
        },
      ],
      biomech_context: biomechContext ?? undefined,
    });
  }

  // Ordenar: rojo → naranja → amarillo → info
  const ORDER: Record<AlertLevel, number> = {
    red: 0, orange: 1, yellow: 2, info: 3,
  };

  return prescriptions.sort((a, b) => ORDER[a.alert_level] - ORDER[b.alert_level]);
}

/**
 * Construye la cadena de contexto biomecánico enriquecida.
 * Devuelve null si no hay datos suficientes.
 */
function buildBiomechContext(input: AthleteRuleInput): string | null {
  if (!input.surface_type && !input.footwear_type) return null;

  const parts: string[] = [];
  if (input.footwear_type)
    parts.push(`calzado: ${FOOTWEAR_LABELS[input.footwear_type] ?? input.footwear_type}`);
  if (input.surface_type)
    parts.push(`superficie: ${SURFACE_LABELS[input.surface_type] ?? input.surface_type}`);

  return `Contexto de la última evaluación biomecánica — ${parts.join(", ")}.`;
}

// ─── Utilidad: construir input desde datos del dashboard ─────────────────────

/**
 * Transforma los datos crudos del dashboard (any[]) en AthleteRuleInput.
 * Adaptador entre la capa de datos y el motor de reglas.
 */
export function buildRuleInput(athlete: {
  id: string;
  full_name: string;
  sport?: string;
  latest_acwr?: any;
  latest_poms?: any;
  latest_hq?: any;
  latest_pain?: any;
  latest_wellness?: any;
  latest_biomech?: any;
}): AthleteRuleInput {
  const b = athlete.latest_biomech;
  const fmsPainPattern = b
    ? [
        b.fms_deep_squat, b.fms_hurdle_step, b.fms_inline_lunge,
        b.fms_shoulder_mobility, b.fms_aslr,
        b.fms_trunk_stability, b.fms_rotary_stability,
      ].some((v: number | null) => v === 0)
    : false;

  return {
    athlete_id:          athlete.id,
    athlete_name:        athlete.full_name,
    sport:               athlete.sport,
    // ACWR
    acwr_ratio:          athlete.latest_acwr?.acwr_ratio,
    acwr_risk_zone:      athlete.latest_acwr?.risk_zone,
    // POMS
    poms_vigor:          athlete.latest_poms?.vigor,
    poms_tmd:            athlete.latest_poms?.tmd_score,
    poms_confusion:      athlete.latest_poms?.confusion,
    poms_fatigue_poms:   athlete.latest_poms?.fatigue_poms,
    // H/Q
    hq_ratio:            athlete.latest_hq?.hq_ratio,
    hq_ratio_type:       athlete.latest_hq?.ratio_type,
    hq_risk_flag:        athlete.latest_hq?.risk_flag,
    // EVA
    eva_score:           athlete.latest_pain?.eva_score,
    pain_region:         athlete.latest_pain?.body_region,
    pain_traffic_light:  athlete.latest_pain?.traffic_light,
    pain_date:           athlete.latest_pain?.date,
    // Wellness
    sleep_hours:         athlete.latest_wellness?.sleep_hours,
    fatigue:             athlete.latest_wellness?.fatigue,
    mood:                athlete.latest_wellness?.mood,
    // FMS
    fms_total:           b?.fms_total,
    fms_injury_risk:     b?.fms_injury_risk,
    fms_has_pain_pattern: fmsPainPattern,
    // Biomecánica
    surface_type:        b?.surface_type,
    footwear_type:       b?.footwear_type,
    biomech_date:        b?.date,
  };
}

// ─── Colores por nivel ────────────────────────────────────────────────────────

export const ALERT_LEVEL_CONFIG: Record<AlertLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
}> = {
  red: {
    label: "Alerta Roja",
    color: "#EF4444",
    bgColor: "#EF444411",
    borderColor: "#EF444444",
    emoji: "🔴",
  },
  orange: {
    label: "Alerta Naranja",
    color: "#F97316",
    bgColor: "#F9731611",
    borderColor: "#F9731644",
    emoji: "🟠",
  },
  yellow: {
    label: "Ajuste Recomendado",
    color: "#EAB308",
    bgColor: "#EAB30811",
    borderColor: "#EAB30844",
    emoji: "🟡",
  },
  info: {
    label: "Información",
    color: "#3B82F6",
    bgColor: "#3B82F611",
    borderColor: "#3B82F644",
    emoji: "🔵",
  },
};
