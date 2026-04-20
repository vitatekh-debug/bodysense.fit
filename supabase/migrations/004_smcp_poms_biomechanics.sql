-- ============================================================
-- Vitatekh — Migración 004: POMS + SMCP + Evaluación Articular
-- ============================================================
-- Añade soporte para:
--   · POMS (Profile of Mood States) — Vigor y Confusión como
--     predictores de fatiga central
--   · SMCP — Ratio H/Q (umbral crítico < 0.6) y Semáforo EVA
--   · Evaluación Articular — superficie, calzado, cadena cinética
--   · FMS (Functional Movement Screen)
-- ============================================================

-- ── ENUMS nuevos ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pain_timing AS ENUM ('pre_session','post_session','rest','next_morning');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pain_region AS ENUM (
    'head','neck','shoulder_left','shoulder_right',
    'elbow_left','elbow_right','wrist_left','wrist_right',
    'lumbar','thoracic','hip_left','hip_right',
    'groin_left','groin_right','hamstring_left','hamstring_right',
    'quadriceps_left','quadriceps_right','knee_left','knee_right',
    'calf_left','calf_right','ankle_left','ankle_right',
    'foot_left','foot_right','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE eva_traffic_light AS ENUM ('green','yellow','red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hq_ratio_type AS ENUM ('conventional','functional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE eval_side AS ENUM ('left','right','bilateral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE surface_type AS ENUM (
    'natural_grass','artificial_grass_3g','artificial_grass_4g',
    'hard_court','parquet','tartan','sand','gym_floor','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE footwear_type AS ENUM (
    'cleats_fg','cleats_ag','cleats_sg','turf',
    'basketball','volleyball','running','training','barefoot','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1. POMS ASSESSMENTS ───────────────────────────────────────
-- Profile of Mood States (Short Form adaptado)
-- Escala 0–4 por ítem: 0=nada · 1=un poco · 2=algo · 3=bastante · 4=muchísimo
-- TMD = Tensión + Depresión + Ira + Fatiga + Confusión − Vigor
-- Valores altos de Vigor = adaptación positiva al entrenamiento
-- Valores altos de Confusión = señal temprana de sobreentrenamiento

CREATE TABLE IF NOT EXISTS poms_assessments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL,

  -- 6 dimensiones POMS (0–4)
  tension       SMALLINT NOT NULL CHECK (tension   BETWEEN 0 AND 4),
  depression    SMALLINT NOT NULL CHECK (depression BETWEEN 0 AND 4),
  anger         SMALLINT NOT NULL CHECK (anger     BETWEEN 0 AND 4),
  vigor         SMALLINT NOT NULL CHECK (vigor     BETWEEN 0 AND 4),  -- predictor clave ↑ bueno
  fatigue_poms  SMALLINT NOT NULL CHECK (fatigue_poms BETWEEN 0 AND 4),
  confusion     SMALLINT NOT NULL CHECK (confusion BETWEEN 0 AND 4),  -- predictor clave ↑ malo

  -- Índice Total de Perturbación del Estado de Ánimo
  -- Calculado automáticamente: tension+depression+anger+fatigue_poms+confusion - vigor
  tmd_score     SMALLINT GENERATED ALWAYS AS
                  (tension + depression + anger + fatigue_poms + confusion - vigor) STORED,

  -- Interpretación rápida
  -- tmd < -5: sobrerecuperación · -5..5: normal · 6..10: atención · >10: alerta sobreentrenamiento
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (athlete_id, date)
);

CREATE INDEX IF NOT EXISTS poms_athlete_idx ON poms_assessments(athlete_id);
CREATE INDEX IF NOT EXISTS poms_date_idx    ON poms_assessments(date);

-- ── 2. H/Q RATIO EVALUATIONS (SMCP) ──────────────────────────
-- Ratio Isquiotibiales/Cuádriceps en dinamómetro isocinético
-- Convencional:  H/Q = Isq_concéntrico / Cuad_concéntrico  (umbral: > 0.6)
-- Funcional:     H/Q = Isq_excéntrico  / Cuad_concéntrico  (umbral: > 1.0)
-- Velocidades estándar: 60°/s (fuerza máxima) y 180°/s (resistencia)

CREATE TABLE IF NOT EXISTS hq_evaluations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evaluated_by            UUID NOT NULL REFERENCES profiles(id),
  date                    DATE NOT NULL,

  side                    eval_side NOT NULL,
  speed_deg_per_sec       SMALLINT NOT NULL CHECK (speed_deg_per_sec IN (60,180,240,300)),
  ratio_type              hq_ratio_type NOT NULL DEFAULT 'conventional',

  -- Torques pico (Nm/kg — normalizados por peso corporal)
  quadriceps_peak_nm_kg   NUMERIC(5,3) NOT NULL CHECK (quadriceps_peak_nm_kg > 0),
  hamstring_peak_nm_kg    NUMERIC(5,3) NOT NULL CHECK (hamstring_peak_nm_kg  > 0),

  -- Ratio calculado automáticamente
  hq_ratio                NUMERIC(4,3) GENERATED ALWAYS AS
                            (hamstring_peak_nm_kg / quadriceps_peak_nm_kg) STORED,

  -- Semáforo de riesgo automático
  -- Convencional 60°/s: < 0.6 = riesgo · 0.6–0.7 = precaución · > 0.7 = OK
  -- Funcional:          < 1.0 = riesgo · 1.0–1.1 = precaución · > 1.1 = OK
  risk_flag               BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN ratio_type = 'conventional' THEN hamstring_peak_nm_kg / quadriceps_peak_nm_kg < 0.6
      WHEN ratio_type = 'functional'   THEN hamstring_peak_nm_kg / quadriceps_peak_nm_kg < 1.0
      ELSE false
    END
  ) STORED,

  asymmetry_index         NUMERIC(5,2),   -- % diferencia entre piernas (si hay 2 filas left/right)
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hq_athlete_idx ON hq_evaluations(athlete_id);
CREATE INDEX IF NOT EXISTS hq_date_idx    ON hq_evaluations(date);

-- ── 3. PAIN RECORDS — Semáforo EVA ───────────────────────────
-- Escala Visual Analógica (EVA) 0–10
-- Semáforo SMCP:
--   Verde  (0–3): dolor ausente o mínimo · continuar entrenamiento
--   Amarillo (4–6): dolor moderado · modificar carga
--   Rojo   (7–10): dolor severo · detener actividad · evaluación médica

CREATE TABLE IF NOT EXISTS pain_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  timing        pain_timing NOT NULL DEFAULT 'post_session',

  body_region   pain_region NOT NULL,
  pain_type     TEXT NOT NULL CHECK (pain_type IN ('acute','chronic','exercise_induced','referred')),

  -- Escala EVA 0–10 (0 = sin dolor, 10 = peor dolor imaginable)
  eva_score     SMALLINT NOT NULL CHECK (eva_score BETWEEN 0 AND 10),

  -- Semáforo calculado automáticamente
  traffic_light eva_traffic_light GENERATED ALWAYS AS (
    CASE
      WHEN eva_score <= 3 THEN 'green'::eva_traffic_light
      WHEN eva_score <= 6 THEN 'yellow'::eva_traffic_light
      ELSE 'red'::eva_traffic_light
    END
  ) STORED,

  -- ¿Afecta al rendimiento?
  limits_performance BOOLEAN NOT NULL DEFAULT FALSE,

  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pain_athlete_idx ON pain_records(athlete_id);
CREATE INDEX IF NOT EXISTS pain_date_idx    ON pain_records(date);
CREATE INDEX IF NOT EXISTS pain_region_idx  ON pain_records(body_region);

-- ── 4. BIOMECHANICAL EVALUATIONS ─────────────────────────────
-- Evaluación articular sistémica
-- Incluye: contexto (superficie/calzado) + movilidad + FMS + cadena cinética

CREATE TABLE IF NOT EXISTS biomechanical_evaluations (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evaluated_by                UUID NOT NULL REFERENCES profiles(id),
  date                        DATE NOT NULL,

  -- ── Contexto ambiental y de equipamiento ──────────────────
  surface_type                surface_type NOT NULL,
  surface_condition           TEXT CHECK (surface_condition IN ('dry','wet','muddy','icy','indoor')),
  footwear_type               footwear_type NOT NULL,
  footwear_age_months         SMALLINT CHECK (footwear_age_months >= 0),
  insoles_used                BOOLEAN DEFAULT FALSE,

  -- ── Movilidad articular (grados) ──────────────────────────
  -- Tobillo — Dorsiflexión en weight-bearing lunge test
  ankle_dorsiflexion_left_deg   NUMERIC(4,1) CHECK (ankle_dorsiflexion_left_deg  BETWEEN 0 AND 60),
  ankle_dorsiflexion_right_deg  NUMERIC(4,1) CHECK (ankle_dorsiflexion_right_deg BETWEEN 0 AND 60),
  -- Referencia clínica: < 10° = déficit severo · 10–15° = limitado · > 15° = normal

  -- Cadera — Flexión y Rotación Interna (posición prona)
  hip_flexion_left_deg          NUMERIC(4,1) CHECK (hip_flexion_left_deg   BETWEEN 0 AND 180),
  hip_flexion_right_deg         NUMERIC(4,1) CHECK (hip_flexion_right_deg  BETWEEN 0 AND 180),
  hip_ir_left_deg               NUMERIC(4,1) CHECK (hip_ir_left_deg        BETWEEN 0 AND 90),
  hip_ir_right_deg              NUMERIC(4,1) CHECK (hip_ir_right_deg       BETWEEN 0 AND 90),

  -- ── FMS — Functional Movement Screen (1–3 por patrón) ────
  -- 1 = no puede realizar · 2 = compensación · 3 = patrón correcto
  -- 0 = dolor durante el movimiento (requiere evaluación médica)
  fms_deep_squat           SMALLINT CHECK (fms_deep_squat          BETWEEN 0 AND 3),
  fms_hurdle_step          SMALLINT CHECK (fms_hurdle_step          BETWEEN 0 AND 3),
  fms_inline_lunge         SMALLINT CHECK (fms_inline_lunge         BETWEEN 0 AND 3),
  fms_shoulder_mobility    SMALLINT CHECK (fms_shoulder_mobility     BETWEEN 0 AND 3),
  fms_aslr                 SMALLINT CHECK (fms_aslr                 BETWEEN 0 AND 3), -- Active Straight Leg Raise
  fms_trunk_stability      SMALLINT CHECK (fms_trunk_stability       BETWEEN 0 AND 3),
  fms_rotary_stability     SMALLINT CHECK (fms_rotary_stability      BETWEEN 0 AND 3),

  -- Puntuación FMS total (suma de 7 patrones, máx 21)
  -- Umbral de riesgo de lesión: ≤ 14 puntos (Cook, Burton & Hoogenboom 2006)
  fms_total                SMALLINT GENERATED ALWAYS AS (
    COALESCE(fms_deep_squat,0) + COALESCE(fms_hurdle_step,0) +
    COALESCE(fms_inline_lunge,0) + COALESCE(fms_shoulder_mobility,0) +
    COALESCE(fms_aslr,0) + COALESCE(fms_trunk_stability,0) +
    COALESCE(fms_rotary_stability,0)
  ) STORED,

  fms_injury_risk          BOOLEAN GENERATED ALWAYS AS (
    (COALESCE(fms_deep_squat,0) + COALESCE(fms_hurdle_step,0) +
     COALESCE(fms_inline_lunge,0) + COALESCE(fms_shoulder_mobility,0) +
     COALESCE(fms_aslr,0) + COALESCE(fms_trunk_stability,0) +
     COALESCE(fms_rotary_stability,0)) <= 14
  ) STORED,

  -- ── Cadena cinética — Alteraciones observadas ─────────────
  knee_valgus_left         BOOLEAN DEFAULT FALSE,  -- valgo dinámico rodilla izq
  knee_valgus_right        BOOLEAN DEFAULT FALSE,
  pelvic_drop_left         BOOLEAN DEFAULT FALSE,  -- caída pélvica (Trendelenburg)
  pelvic_drop_right        BOOLEAN DEFAULT FALSE,
  excessive_pronation_left  BOOLEAN DEFAULT FALSE, -- hiperpronación pie izq
  excessive_pronation_right BOOLEAN DEFAULT FALSE,
  forward_trunk_lean       BOOLEAN DEFAULT FALSE,  -- inclinación excesiva de tronco

  -- ── Observaciones clínicas ────────────────────────────────
  findings                 TEXT,   -- hallazgos relevantes
  recommendations          TEXT,   -- recomendaciones de calzado, superficie, ejercicio
  follow_up_date           DATE,   -- próxima evaluación sugerida
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS biomech_athlete_idx ON biomechanical_evaluations(athlete_id);
CREATE INDEX IF NOT EXISTS biomech_date_idx    ON biomechanical_evaluations(date);

-- ── 5. RLS POLICIES ──────────────────────────────────────────

ALTER TABLE poms_assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_evaluations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_records              ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanical_evaluations ENABLE ROW LEVEL SECURITY;

-- POMS: atleta gestiona los suyos · profesional lee los de su equipo
DROP POLICY IF EXISTS "Athlete manages own POMS" ON poms_assessments;
CREATE POLICY "Athlete manages own POMS" ON poms_assessments
  FOR ALL USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Professional reads team POMS" ON poms_assessments;
CREATE POLICY "Professional reads team POMS" ON poms_assessments
  FOR SELECT USING (public.athlete_in_my_teams(athlete_id));

-- H/Q: profesional gestiona · atleta lee los suyos
DROP POLICY IF EXISTS "Professional manages HQ evals" ON hq_evaluations;
CREATE POLICY "Professional manages HQ evals" ON hq_evaluations
  FOR ALL USING (evaluated_by = auth.uid());

DROP POLICY IF EXISTS "Athlete reads own HQ" ON hq_evaluations;
CREATE POLICY "Athlete reads own HQ" ON hq_evaluations
  FOR SELECT USING (athlete_id = auth.uid());

-- Pain records: atleta registra · profesional del equipo lee
DROP POLICY IF EXISTS "Athlete manages own pain" ON pain_records;
CREATE POLICY "Athlete manages own pain" ON pain_records
  FOR ALL USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Professional reads team pain" ON pain_records;
CREATE POLICY "Professional reads team pain" ON pain_records
  FOR SELECT USING (public.athlete_in_my_teams(athlete_id));

-- Biomechanical: profesional gestiona · atleta lee los suyos
DROP POLICY IF EXISTS "Professional manages biomech" ON biomechanical_evaluations;
CREATE POLICY "Professional manages biomech" ON biomechanical_evaluations
  FOR ALL USING (evaluated_by = auth.uid());

DROP POLICY IF EXISTS "Athlete reads own biomech" ON biomechanical_evaluations;
CREATE POLICY "Athlete reads own biomech" ON biomechanical_evaluations
  FOR SELECT USING (athlete_id = auth.uid());

-- ── 6. EXTENDER daily_wellness con campos SMCP rápidos ───────
-- Añadimos checks rápidos diarios (no reemplaza las tablas especializadas)
-- vigor_quick y confusion_quick son versiones de ítem único del POMS
-- para el check-in diario del atleta (0–4)

ALTER TABLE daily_wellness
  ADD COLUMN IF NOT EXISTS vigor_quick      SMALLINT CHECK (vigor_quick     BETWEEN 0 AND 4),
  ADD COLUMN IF NOT EXISTS confusion_quick  SMALLINT CHECK (confusion_quick BETWEEN 0 AND 4),
  ADD COLUMN IF NOT EXISTS eva_pre          SMALLINT CHECK (eva_pre         BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS eva_post         SMALLINT CHECK (eva_post        BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS pain_region_quick pain_region;

-- ── 7. VERIFICACIÓN ──────────────────────────────────────────

SELECT
  table_name,
  COUNT(column_name) AS columnas
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'poms_assessments',
    'hq_evaluations',
    'pain_records',
    'biomechanical_evaluations'
  )
GROUP BY table_name
ORDER BY table_name;
