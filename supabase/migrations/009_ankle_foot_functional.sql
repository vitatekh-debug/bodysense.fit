-- ============================================================
-- Bodysense — Migración 009: Módulo Avanzado de Tobillo, Pie
-- y Rendimiento Funcional
--
-- Evaluación de miembros inferiores:
--   1. Biomecánica clínica (Feiss, ROM, WBLT, Windlass, pinzamiento)
--   2. Fuerza y control motor (Daniels, Single-Leg Squat)
--   3. Agilidad y pliometría (T-Test, Protocolo Bosco)
-- ============================================================

-- ── ENUMs ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE foot_type AS ENUM ('normal', 'flat', 'cavus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE myofascial_status AS ENUM ('hypertonic', 'phasic', 'optimal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sls_overall_status AS ENUM ('optimal', 'compensated', 'deficient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabla principal ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ankle_foot_assessments (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id                UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluated_by              UUID        NOT NULL REFERENCES public.profiles(id),
  assessment_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Biomecánica y parámetros clínicos (simétricos L/R) ────
  -- Test de Línea de Feiss
  foot_type_left            foot_type,
  foot_type_right           foot_type,

  -- Rango de movilidad articular (grados)
  dorsiflexion_rom_left     NUMERIC CHECK (dorsiflexion_rom_left  BETWEEN 0 AND 60),
  dorsiflexion_rom_right    NUMERIC CHECK (dorsiflexion_rom_right BETWEEN 0 AND 60),
  plantiflexion_rom_left    NUMERIC CHECK (plantiflexion_rom_left  BETWEEN 0 AND 90),
  plantiflexion_rom_right   NUMERIC CHECK (plantiflexion_rom_right BETWEEN 0 AND 90),

  -- Weight-Bearing Lunge Test (cm hasta la pared)
  wblt_cm_left              NUMERIC CHECK (wblt_cm_left  BETWEEN 0 AND 25),
  wblt_cm_right             NUMERIC CHECK (wblt_cm_right BETWEEN 0 AND 25),

  -- Test de Windlass (reactividad de fascia plantar)
  windlass_test_left        BOOLEAN,
  windlass_test_right       BOOLEAN,

  -- Pinzamiento anterior de la mortaja maleolar
  anterior_impingement_left  BOOLEAN,
  anterior_impingement_right BOOLEAN,

  -- Estado del complejo gastro-sóleo-calcáneo-fascia plantar
  myofascial_status         myofascial_status,

  -- ── Fuerza y control motor ─────────────────────────────────
  -- Escala de Daniels (evaluación muscular manual 0-5)
  daniels_muscle_grade_left  INTEGER CHECK (daniels_muscle_grade_left  BETWEEN 0 AND 5),
  daniels_muscle_grade_right INTEGER CHECK (daniels_muscle_grade_right BETWEEN 0 AND 5),

  -- Single-Leg Squat: compensaciones observadas
  -- Estructura: { "knee_valgus": bool, "pelvic_drop": bool,
  --               "trunk_rotation": bool, "overall_status": "optimal|compensated|deficient" }
  single_leg_squat_left     JSONB,
  single_leg_squat_right    JSONB,

  -- ── Agilidad y pliometría ──────────────────────────────────
  agility_t_test_seconds    NUMERIC CHECK (agility_t_test_seconds > 0),

  -- Protocolo Bosco de saltabilidad
  -- Estructura: { "squat_jump_cm": num, "cmj_cm": num, "drop_jump_rsi": num }
  bosco_protocol            JSONB,

  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ankle_foot_athlete_date_idx
  ON public.ankle_foot_assessments (athlete_id, assessment_date DESC);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.ankle_foot_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ankle_foot: athlete own data"
    ON public.ankle_foot_assessments FOR SELECT
    USING (athlete_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ankle_foot: professional reads team"
    ON public.ankle_foot_assessments FOR SELECT
    USING (is_my_athlete(athlete_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ankle_foot: professional inserts for team"
    ON public.ankle_foot_assessments FOR INSERT
    WITH CHECK (is_my_athlete(athlete_id) AND evaluated_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ankle_foot: professional updates own evals"
    ON public.ankle_foot_assessments FOR UPDATE
    USING (evaluated_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
