-- ============================================================
-- VITATEKH — Datos de demo: SMCP / POMS / EVA / H-Q / FMS
-- Ajustado al esquema real de la migración 004
-- Atletas: dddd0002 (Sebastián) · dddd0003 (Laura) · dddd0004 (Daniel)
-- Idempotente: ON CONFLICT DO NOTHING con IDs fijos
-- ============================================================

DO $$
DECLARE
  v_a1    uuid := 'dddd0002-0000-0000-0000-000000000002'; -- Sebastián Morales  · fútbol
  v_a2    uuid := 'dddd0003-0000-0000-0000-000000000003'; -- Laura Cifuentes    · voleibol
  v_a3    uuid := 'dddd0004-0000-0000-0000-000000000004'; -- Daniel Restrepo    · baloncesto
  v_prof  uuid;
  v_today date := CURRENT_DATE;
BEGIN

  SELECT id INTO v_prof
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'professional'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_prof IS NULL THEN
    RAISE EXCEPTION '❌ No hay profesional. Regístrate primero.';
  END IF;

  -- ────────────────────────────────────────────────────────────
  -- 1. POMS ASSESSMENTS
  --    Escala real: 0-4 por dimensión (migración 004)
  --    TMD = tensión + depresión + ira + fatiga_poms + confusión − vigor
  --    UNIQUE (athlete_id, date) → fechas distintas por atleta
  --
  --    Sebastián: TMD = 1+0+1+1+0 - 4 = -1 → Normal (iceberg intacto)
  --    Laura:     TMD = 3+2+2+3+3  - 2 = 11 → Alerta sobreentrenamiento
  --    Daniel:    TMD = 2+2+1+3+3  - 2 = 9  → Alerta moderada
  -- ────────────────────────────────────────────────────────────
  INSERT INTO public.poms_assessments
    (id, athlete_id, date,
     tension, depression, anger, vigor, fatigue_poms, confusion,
     notes)
  VALUES
    -- Sebastián (hace 2 días): perfil iceberg sano
    ( 'ee000001-0000-0000-0000-000000000001',
      v_a1, v_today - 2,
      1, 0, 1, 4, 1, 0,
      'Buen perfil iceberg. Vigor alto, sin señales de fatiga central.' ),

    -- Sebastián (hace 9 días)
    ( 'ee000001-0000-0000-0000-000000000002',
      v_a1, v_today - 9,
      1, 1, 1, 3, 1, 1,
      'Semana de carga alta. Vigor aceptable, confusión mínima.' ),

    -- Laura (ayer): alerta por doble sesión pretemporada
    ( 'ee000002-0000-0000-0000-000000000001',
      v_a2, v_today - 1,
      3, 2, 2, 2, 3, 3,
      'Doble sesión diaria. Fatiga y confusión elevadas. Reducir volumen.' ),

    -- Daniel (hace 3 días): alerta moderada post-torneo
    ( 'ee000003-0000-0000-0000-000000000001',
      v_a3, v_today - 3,
      2, 2, 1, 2, 3, 3,
      'Post-torneo. Confusión y fatiga altas. Semana de recuperación activa.' )

  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────────────────────────
  -- 2. PAIN RECORDS (EVA)
  --    Columnas reales: timing (pain_timing enum), body_region (pain_region enum)
  --    pain_timing: pre_session | post_session | rest | next_morning
  --    pain_region: ver ENUM en migración (head, neck, lumbar, knee_left, etc.)
  --    pain_type: acute | chronic | exercise_induced | referred
  --
  --    Sebastián: EVA 2 → Verde
  --    Laura:     EVA 5 → Amarillo
  --    Daniel:    EVA 8 → Rojo
  -- ────────────────────────────────────────────────────────────
  INSERT INTO public.pain_records
    (id, athlete_id, date,
     timing, body_region, pain_type, eva_score, limits_performance, notes)
  VALUES
    ( 'ff000001-0000-0000-0000-000000000001',
      v_a1, v_today - 1,
      'post_session', 'ankle_right', 'acute',
      2, false,
      'Molestia leve en tobillo derecho post-sesión técnica. Sin limitación funcional.' ),

    ( 'ff000002-0000-0000-0000-000000000001',
      v_a2, v_today,
      'post_session', 'knee_left', 'exercise_induced',
      5, true,
      'Dolor moderado en rodilla izquierda durante saltos. Modificar sesión de potencia.' ),

    ( 'ff000003-0000-0000-0000-000000000001',
      v_a3, v_today,
      'pre_session', 'lumbar', 'chronic',
      8, true,
      'Dolor lumbar severo previo al entrenamiento. Atleta no puede participar. Derivar a fisio.' )

  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────────────────────────
  -- 3. H/Q EVALUATIONS
  --    Columna real: speed_deg_per_sec (no angular_velocity_deg_s)
  --    speed_deg_per_sec: CHECK IN (60, 180, 240, 300)
  --
  --    Sebastián: conv 60°/s  H/Q = 2.31/3.40 = 0.679 → sin riesgo
  --    Laura:     conv 60°/s  H/Q = 1.87/3.45 = 0.542 → en riesgo (< 0.6)
  --    Daniel:    func 180°/s H/Q = 2.80/3.05 = 0.918 → en riesgo (< 1.0)
  -- ────────────────────────────────────────────────────────────
  INSERT INTO public.hq_evaluations
    (id, athlete_id, evaluated_by, date,
     side, speed_deg_per_sec, ratio_type,
     quadriceps_peak_nm_kg, hamstring_peak_nm_kg,
     notes)
  VALUES
    ( 'aa100001-0000-0000-0000-000000000001',
      v_a1, v_prof, v_today - 7,
      'right', 60, 'conventional',
      3.400, 2.310,
      'Ratio H/Q dentro del rango normal (0.68). Refuerzo excéntrico de mantenimiento.' ),

    ( 'aa100002-0000-0000-0000-000000000001',
      v_a2, v_prof, v_today - 5,
      'left', 60, 'conventional',
      3.450, 1.870,
      'Déficit isquiotibial significativo pierna izquierda (H/Q 0.54). Protocolo nórdico urgente.' ),

    ( 'aa100003-0000-0000-0000-000000000001',
      v_a3, v_prof, v_today - 3,
      'bilateral', 180, 'functional',
      3.050, 2.800,
      'Ratio funcional 0.918 < 1.0. Trabajar velocidad de contracción excéntrica.' )

  ON CONFLICT (id) DO NOTHING;

  -- ────────────────────────────────────────────────────────────
  -- 4. BIOMECHANICAL EVALUATIONS (FMS)
  --    Columnas reales: fms_aslr (no fms_active_straight_leg_raise)
  --                     fms_trunk_stability (no fms_trunk_stability_pushup)
  --    surface_type enum real: natural_grass | artificial_grass_3g | hard_court | parquet ...
  --    footwear_type enum real: cleats_fg | basketball | volleyball | running ...
  --    Campos de texto: findings, recommendations (no general_notes / posture_notes)
  --
  --    Sebastián: 3+2+3+3+3+2+1 = 17 → sin riesgo
  --    Laura:     2+2+1+3+2+2+1 = 13 → en riesgo (≤ 14)
  --    Daniel:    2+1+2+2+0+2+2 = 11 → en riesgo + dolor (0) en ASLR
  -- ────────────────────────────────────────────────────────────
  INSERT INTO public.biomechanical_evaluations
    (id, athlete_id, evaluated_by, date,
     surface_type, footwear_type,
     fms_deep_squat, fms_hurdle_step, fms_inline_lunge,
     fms_shoulder_mobility, fms_aslr,
     fms_trunk_stability, fms_rotary_stability,
     findings, recommendations)
  VALUES
    -- Sebastián: FMS 17/21
    ( 'bb200001-0000-0000-0000-000000000001',
      v_a1, v_prof, v_today - 10,
      'natural_grass', 'cleats_fg',
      3, 2, 3, 3, 3, 2, 1,
      'Ligera compensación en paso de valla. Estabilidad rotatoria a mejorar.',
      'Continuar plan. Añadir ejercicios de estabilidad rotatoria 2x/semana.' ),

    -- Laura: FMS 13/21 → en riesgo
    ( 'bb200002-0000-0000-0000-000000000001',
      v_a2, v_prof, v_today - 8,
      'hard_court', 'volleyball',
      2, 2, 1, 3, 2, 2, 1,
      'Déficit en zancada en línea bilateral. Asimetría de cadera detectada.',
      'Programa de corrección de cadera y core antes de competición. Reevaluar en 4 semanas.' ),

    -- Daniel: FMS 11/21 → en riesgo + dolor (0) en ASLR
    ( 'bb200003-0000-0000-0000-000000000001',
      v_a3, v_prof, v_today - 4,
      'hard_court', 'basketball',
      2, 1, 2, 2, 0, 2, 2,
      'Dolor en elevación de pierna recta (ASLR = 0). Posible tensión isquiotibial derecha. FMS 11/21.',
      'Evaluación médica obligatoria antes de retorno deportivo. No autorizado para saltos ni sprints.' )

  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ SMCP seed completado:';
  RAISE NOTICE '   POMS: 4 evaluaciones (Sebastián x2, Laura x1, Daniel x1)';
  RAISE NOTICE '   EVA:  3 registros — Verde (2) / Amarillo (5) / Rojo (8)';
  RAISE NOTICE '   H/Q:  3 evaluaciones — OK / Conv riesgo (0.54) / Func riesgo (0.92)';
  RAISE NOTICE '   FMS:  3 evaluaciones — 17/21 OK / 13/21 riesgo / 11/21 riesgo+dolor';

END $$;
