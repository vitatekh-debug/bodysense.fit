-- ============================================================
-- VITATEKH — Schema Consolidado v2
-- Fecha: 2026-04-19
-- ============================================================
-- Incluye:
--   · Migración 001: Esquema inicial (tablas core + RLS base)
--   · Migración 002: Fix trigger auth
--   · Migración 003: Fix recursión RLS (SECURITY DEFINER)
--   · Migración 004: SMCP · POMS · H/Q · EVA · FMS
--   · Migración 005: Hardening · Índices · Constraints · RLS mejorado
--
-- USO: ejecutar en un proyecto Supabase limpio (SQL Editor).
-- Requiere: extensión uuid-ossp (ya viene en Supabase).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE user_role           AS ENUM ('professional', 'athlete');          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sport_type          AS ENUM ('basketball', 'football', 'volleyball'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE session_phase       AS ENUM ('preseason', 'competition', 'transition'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE session_type        AS ENUM ('technical', 'tactical', 'physical', 'match', 'recovery', 'prevention'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE periodization_model AS ENUM ('classic', 'tactical');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE acwr_risk_zone      AS ENUM ('low', 'optimal', 'high', 'very_high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE prevention_type     AS ENUM ('group', 'individual');              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cycle_level         AS ENUM ('macrocycle', 'mesocycle', 'microcycle'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SMCP enums (migración 004)
DO $$ BEGIN CREATE TYPE pain_timing AS ENUM ('pre_session','post_session','rest','next_morning'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE pain_region AS ENUM (
  'head','neck',
  'shoulder_left','shoulder_right',
  'elbow_left','elbow_right',
  'wrist_left','wrist_right',
  'lumbar','thoracic',
  'hip_left','hip_right',
  'groin_left','groin_right',
  'hamstring_left','hamstring_right',
  'quadriceps_left','quadriceps_right',
  'knee_left','knee_right',
  'calf_left','calf_right',
  'ankle_left','ankle_right',
  'foot_left','foot_right',
  'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE eva_traffic_light AS ENUM ('green','yellow','red');               EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE hq_ratio_type     AS ENUM ('conventional','functional');          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE eval_side         AS ENUM ('left','right','bilateral');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE surface_type AS ENUM (
  'natural_grass','artificial_grass_3g','artificial_grass_4g',
  'hard_court','parquet','tartan','sand','gym_floor','other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE footwear_type AS ENUM (
  'cleats_fg','cleats_ag','cleats_sg','turf',
  'basketball','volleyball','running','training','barefoot','other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. FUNCIONES AUXILIARES
-- ──────────────────────────────────────────────────────────────

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- SECURITY DEFINER: rompe recursión RLS teams ↔ team_members
CREATE OR REPLACE FUNCTION public.is_my_team(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND professional_id = auth.uid()
  );
$$;

-- SECURITY DEFINER: ¿el atleta pertenece a algún equipo del profesional?
CREATE OR REPLACE FUNCTION public.athlete_in_my_teams(p_athlete_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = p_athlete_id AND t.professional_id = auth.uid()
  );
$$;

-- SECURITY DEFINER: alias más legible (usado en policies SMCP)
CREATE OR REPLACE FUNCTION public.is_my_athlete(p_athlete_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT public.athlete_in_my_teams(p_athlete_id);
$$;

-- Trigger: impide que un usuario cambie su propio role
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role <> OLD.role AND auth.uid() = OLD.id THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_my_team(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.athlete_in_my_teams(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_athlete(uuid)       TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 3. TABLAS CORE
-- ──────────────────────────────────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'athlete',
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  sport       sport_type,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── teams ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  sport           sport_type NOT NULL,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── team_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, athlete_id)
);

-- ── training_sessions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  date          DATE NOT NULL
                  CHECK (date <= CURRENT_DATE + INTERVAL '7 days'),
  duration_min  INT NOT NULL
                  CHECK (duration_min BETWEEN 1 AND 480),  -- 1 min – 8 horas
  session_type  session_type NOT NULL DEFAULT 'physical',
  phase         session_phase NOT NULL DEFAULT 'competition',
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── game_records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_records (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  opponent     TEXT,
  duration_min INT NOT NULL DEFAULT 90
                 CHECK (duration_min BETWEEN 1 AND 300),
  pre_rpe      SMALLINT CHECK (pre_rpe  BETWEEN 6 AND 20),
  post_rpe     SMALLINT CHECK (post_rpe BETWEEN 6 AND 20),
  result       TEXT CHECK (result IN ('win','loss','draw')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── daily_wellness ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_wellness (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date           DATE NOT NULL
                   CHECK (date <= CURRENT_DATE),
  fatigue        SMALLINT NOT NULL CHECK (fatigue       BETWEEN 1 AND 10),
  sleep_hours    NUMERIC(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 16),
  sleep_quality  SMALLINT NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  mood           SMALLINT NOT NULL CHECK (mood          BETWEEN 1 AND 5),
  notes          TEXT,
  -- Campos SMCP rápidos (migración 004)
  vigor_quick      SMALLINT CHECK (vigor_quick    BETWEEN 0 AND 4),
  confusion_quick  SMALLINT CHECK (confusion_quick BETWEEN 0 AND 4),
  eva_pre          SMALLINT CHECK (eva_pre         BETWEEN 0 AND 10),
  eva_post         SMALLINT CHECK (eva_post        BETWEEN 0 AND 10),
  pain_region_quick pain_region,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, date)
);

-- ── session_rpe ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_rpe (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rpe         SMALLINT NOT NULL CHECK (rpe  BETWEEN 6 AND 20),
  srpe        INT NOT NULL      CHECK (srpe > 0),  -- rpe × duration_min
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, athlete_id)
);

-- ── acwr_snapshots ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.acwr_snapshots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  acute_load    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (acute_load   >= 0),
  chronic_load  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (chronic_load >= 0),
  acwr_ratio    NUMERIC(6,3)  NOT NULL DEFAULT 0 CHECK (acwr_ratio   >= 0),
  risk_zone     acwr_risk_zone NOT NULL DEFAULT 'low',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, date)
);

-- ── prevention_sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prevention_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  description  TEXT,
  date         DATE NOT NULL,
  type         prevention_type NOT NULL DEFAULT 'group',
  sport        sport_type,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── prevention_athletes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prevention_athletes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES public.prevention_sessions(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ,
  UNIQUE (session_id, athlete_id)
);

-- ── exercises ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL CHECK (length(trim(name)) >= 3),
  sport        sport_type,
  category     TEXT NOT NULL DEFAULT 'general',
  instructions TEXT,
  video_url    TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── session_exercises ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_exercises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES public.prevention_sessions(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets          SMALLINT CHECK (sets         BETWEEN 1 AND 20),
  reps          SMALLINT CHECK (reps         BETWEEN 1 AND 100),
  duration_sec  INT      CHECK (duration_sec BETWEEN 1 AND 3600),
  order_index   SMALLINT NOT NULL DEFAULT 0,
  notes         TEXT
);

-- ── periodization_plans ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.periodization_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) >= 3),
  model       periodization_model NOT NULL DEFAULT 'classic',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date),
  CHECK ((end_date - start_date) >= 28)  -- mínimo 4 semanas
);

-- ── periodization_cycles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.periodization_cycles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.periodization_cycles(id) ON DELETE CASCADE,
  level       cycle_level NOT NULL,
  name        TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  phase       session_phase NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  objectives  TEXT,
  CHECK (end_date > start_date),
  -- Microciclos: máximo 14 días (2 semanas)
  CHECK (level != 'microcycle' OR (end_date - start_date) <= 14)
);

-- ──────────────────────────────────────────────────────────────
-- 4. TABLAS SMCP (migración 004)
-- ──────────────────────────────────────────────────────────────

-- ── poms_assessments ─────────────────────────────────────────
-- Escala 0-4 por dimensión (Short Form)
-- TMD = tensión+depresión+ira+fatiga+confusión−vigor  → rango -4..20
CREATE TABLE IF NOT EXISTS public.poms_assessments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL CHECK (date <= CURRENT_DATE),
  tension       SMALLINT NOT NULL CHECK (tension      BETWEEN 0 AND 4),
  depression    SMALLINT NOT NULL CHECK (depression   BETWEEN 0 AND 4),
  anger         SMALLINT NOT NULL CHECK (anger        BETWEEN 0 AND 4),
  vigor         SMALLINT NOT NULL CHECK (vigor        BETWEEN 0 AND 4),
  fatigue_poms  SMALLINT NOT NULL CHECK (fatigue_poms BETWEEN 0 AND 4),
  confusion     SMALLINT NOT NULL CHECK (confusion    BETWEEN 0 AND 4),
  tmd_score     SMALLINT GENERATED ALWAYS AS
                  (tension + depression + anger + fatigue_poms + confusion - vigor) STORED,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, date)
);

-- ── hq_evaluations ───────────────────────────────────────────
-- Ratio isquiotibiales/cuádriceps (dinamómetro isocinético)
-- Conv 60°/s: umbral < 0.6 | Funcional 180°/s: umbral < 1.0
CREATE TABLE IF NOT EXISTS public.hq_evaluations (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluated_by           UUID NOT NULL REFERENCES public.profiles(id),
  date                   DATE NOT NULL CHECK (date <= CURRENT_DATE),
  side                   eval_side NOT NULL,
  speed_deg_per_sec      SMALLINT NOT NULL CHECK (speed_deg_per_sec IN (60,180,240,300)),
  ratio_type             hq_ratio_type NOT NULL DEFAULT 'conventional',
  quadriceps_peak_nm_kg  NUMERIC(5,3) NOT NULL CHECK (quadriceps_peak_nm_kg > 0),
  hamstring_peak_nm_kg   NUMERIC(5,3) NOT NULL CHECK (hamstring_peak_nm_kg  > 0),
  hq_ratio               NUMERIC(4,3) GENERATED ALWAYS AS
                           (hamstring_peak_nm_kg / quadriceps_peak_nm_kg) STORED,
  risk_flag              BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN ratio_type = 'conventional' THEN hamstring_peak_nm_kg / quadriceps_peak_nm_kg < 0.6
      WHEN ratio_type = 'functional'   THEN hamstring_peak_nm_kg / quadriceps_peak_nm_kg < 1.0
      ELSE false
    END
  ) STORED,
  asymmetry_index        NUMERIC(5,2) CHECK (asymmetry_index BETWEEN 0 AND 100),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── pain_records ─────────────────────────────────────────────
-- EVA 0-10 con semáforo automático
CREATE TABLE IF NOT EXISTS public.pain_records (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  date               DATE NOT NULL CHECK (date <= CURRENT_DATE),
  timing             pain_timing NOT NULL DEFAULT 'post_session',
  body_region        pain_region NOT NULL,
  pain_type          TEXT NOT NULL CHECK (pain_type IN ('acute','chronic','exercise_induced','referred')),
  eva_score          SMALLINT NOT NULL CHECK (eva_score BETWEEN 0 AND 10),
  traffic_light      eva_traffic_light GENERATED ALWAYS AS (
    CASE
      WHEN eva_score <= 3 THEN 'green'::eva_traffic_light
      WHEN eva_score <= 6 THEN 'yellow'::eva_traffic_light
      ELSE                     'red'::eva_traffic_light
    END
  ) STORED,
  limits_performance BOOLEAN NOT NULL DEFAULT FALSE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── biomechanical_evaluations ─────────────────────────────────
-- FMS + movilidad articular + contexto ambiental
-- FMS total ≤ 14 = riesgo elevado | score 0 = dolor (alerta inmediata)
CREATE TABLE IF NOT EXISTS public.biomechanical_evaluations (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id                   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluated_by                 UUID NOT NULL REFERENCES public.profiles(id),
  date                         DATE NOT NULL CHECK (date <= CURRENT_DATE),
  surface_type                 surface_type NOT NULL,
  surface_condition            TEXT CHECK (surface_condition IN ('dry','wet','muddy','icy','indoor')),
  footwear_type                footwear_type NOT NULL,
  footwear_age_months          SMALLINT CHECK (footwear_age_months BETWEEN 0 AND 120),
  insoles_used                 BOOLEAN DEFAULT FALSE,
  -- Movilidad articular (grados)
  ankle_dorsiflexion_left_deg  NUMERIC(4,1) CHECK (ankle_dorsiflexion_left_deg  BETWEEN 0 AND 60),
  ankle_dorsiflexion_right_deg NUMERIC(4,1) CHECK (ankle_dorsiflexion_right_deg BETWEEN 0 AND 60),
  hip_flexion_left_deg         NUMERIC(4,1) CHECK (hip_flexion_left_deg   BETWEEN 0 AND 180),
  hip_flexion_right_deg        NUMERIC(4,1) CHECK (hip_flexion_right_deg  BETWEEN 0 AND 180),
  hip_ir_left_deg              NUMERIC(4,1) CHECK (hip_ir_left_deg        BETWEEN 0 AND 90),
  hip_ir_right_deg             NUMERIC(4,1) CHECK (hip_ir_right_deg       BETWEEN 0 AND 90),
  -- FMS (0-3 cada patrón; 0 = dolor)
  fms_deep_squat          SMALLINT CHECK (fms_deep_squat       BETWEEN 0 AND 3),
  fms_hurdle_step         SMALLINT CHECK (fms_hurdle_step       BETWEEN 0 AND 3),
  fms_inline_lunge        SMALLINT CHECK (fms_inline_lunge      BETWEEN 0 AND 3),
  fms_shoulder_mobility   SMALLINT CHECK (fms_shoulder_mobility  BETWEEN 0 AND 3),
  fms_aslr                SMALLINT CHECK (fms_aslr              BETWEEN 0 AND 3),
  fms_trunk_stability     SMALLINT CHECK (fms_trunk_stability    BETWEEN 0 AND 3),
  fms_rotary_stability    SMALLINT CHECK (fms_rotary_stability   BETWEEN 0 AND 3),
  fms_total               SMALLINT GENERATED ALWAYS AS (
    COALESCE(fms_deep_squat,0) + COALESCE(fms_hurdle_step,0)  +
    COALESCE(fms_inline_lunge,0) + COALESCE(fms_shoulder_mobility,0) +
    COALESCE(fms_aslr,0) + COALESCE(fms_trunk_stability,0) +
    COALESCE(fms_rotary_stability,0)
  ) STORED,
  fms_injury_risk         BOOLEAN GENERATED ALWAYS AS (
    (COALESCE(fms_deep_squat,0) + COALESCE(fms_hurdle_step,0) +
     COALESCE(fms_inline_lunge,0) + COALESCE(fms_shoulder_mobility,0) +
     COALESCE(fms_aslr,0) + COALESCE(fms_trunk_stability,0) +
     COALESCE(fms_rotary_stability,0)) <= 14
  ) STORED,
  -- Cadena cinética
  knee_valgus_left          BOOLEAN DEFAULT FALSE,
  knee_valgus_right         BOOLEAN DEFAULT FALSE,
  pelvic_drop_left          BOOLEAN DEFAULT FALSE,
  pelvic_drop_right         BOOLEAN DEFAULT FALSE,
  excessive_pronation_left  BOOLEAN DEFAULT FALSE,
  excessive_pronation_right BOOLEAN DEFAULT FALSE,
  forward_trunk_lean        BOOLEAN DEFAULT FALSE,
  -- Observaciones
  findings         TEXT,
  recommendations  TEXT,
  follow_up_date   DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 5. TRIGGERS
-- ──────────────────────────────────────────────────────────────

-- Auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Proteger cambio de role
DROP TRIGGER IF EXISTS protect_role_change ON public.profiles;
CREATE TRIGGER protect_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- ──────────────────────────────────────────────────────────────
-- 6. ÍNDICES DE RENDIMIENTO
-- ──────────────────────────────────────────────────────────────

-- teams
CREATE INDEX IF NOT EXISTS teams_professional_idx
  ON public.teams (professional_id);

-- team_members
CREATE INDEX IF NOT EXISTS team_members_team_idx
  ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS team_members_athlete_idx
  ON public.team_members (athlete_id);

-- training_sessions
CREATE INDEX IF NOT EXISTS training_sessions_athlete_date_idx
  ON public.training_sessions (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS training_sessions_type_phase_idx
  ON public.training_sessions (session_type, phase);
CREATE INDEX IF NOT EXISTS training_sessions_date_idx
  ON public.training_sessions (date);

-- session_rpe
CREATE INDEX IF NOT EXISTS session_rpe_athlete_idx
  ON public.session_rpe (athlete_id);
CREATE INDEX IF NOT EXISTS session_rpe_session_athlete_idx
  ON public.session_rpe (session_id, athlete_id);

-- acwr_snapshots
CREATE INDEX IF NOT EXISTS acwr_athlete_date_desc_idx
  ON public.acwr_snapshots (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS acwr_risk_zone_idx
  ON public.acwr_snapshots (risk_zone)
  WHERE risk_zone IN ('high', 'very_high');

-- daily_wellness
CREATE INDEX IF NOT EXISTS wellness_athlete_date_desc_idx
  ON public.daily_wellness (athlete_id, date DESC);

-- game_records
CREATE INDEX IF NOT EXISTS game_records_team_idx
  ON public.game_records (team_id);

-- prevention_sessions
CREATE INDEX IF NOT EXISTS prev_sessions_creator_date_idx
  ON public.prevention_sessions (created_by, date DESC);

-- periodization
CREATE INDEX IF NOT EXISTS periodization_plans_team_idx
  ON public.periodization_plans (team_id);
CREATE INDEX IF NOT EXISTS periodization_cycles_plan_idx
  ON public.periodization_cycles (plan_id);
CREATE INDEX IF NOT EXISTS cycles_dates_idx
  ON public.periodization_cycles (start_date, end_date);

-- SMCP
CREATE INDEX IF NOT EXISTS poms_athlete_date_desc_idx
  ON public.poms_assessments (athlete_id, date DESC);

CREATE INDEX IF NOT EXISTS hq_athlete_date_desc_idx
  ON public.hq_evaluations (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS hq_risk_flag_idx
  ON public.hq_evaluations (risk_flag) WHERE risk_flag = true;

CREATE INDEX IF NOT EXISTS pain_athlete_date_desc_idx
  ON public.pain_records (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS pain_traffic_light_date_idx
  ON public.pain_records (traffic_light, date DESC)
  WHERE traffic_light IN ('yellow', 'red');

CREATE INDEX IF NOT EXISTS biomech_athlete_date_desc_idx
  ON public.biomechanical_evaluations (athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS biomech_fms_risk_idx
  ON public.biomechanical_evaluations (fms_injury_risk) WHERE fms_injury_risk = true;

-- ──────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_records              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_wellness            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_rpe               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acwr_snapshots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prevention_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prevention_athletes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodization_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodization_cycles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poms_assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_evaluations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_records              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomechanical_evaluations ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────
CREATE POLICY "profile: own read"   ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profile: own update" ON public.profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- Profesional: READ de atletas de su equipo (sin poder editar)
CREATE POLICY "profile: professional reads athletes" ON public.profiles
  FOR SELECT USING (public.is_my_athlete(id));

-- ── teams ────────────────────────────────────────────────────
CREATE POLICY "teams: professional full" ON public.teams
  FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "teams: athlete reads own" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND athlete_id = auth.uid())
  );

-- ── team_members ─────────────────────────────────────────────
CREATE POLICY "members: professional manages" ON public.team_members
  FOR ALL USING (public.is_my_team(team_id));
CREATE POLICY "members: athlete reads own" ON public.team_members
  FOR SELECT USING (athlete_id = auth.uid());

-- ── training_sessions ────────────────────────────────────────
CREATE POLICY "sessions: athlete reads own" ON public.training_sessions
  FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "sessions: professional manages" ON public.training_sessions
  FOR ALL USING (created_by = auth.uid());

-- ── game_records ─────────────────────────────────────────────
CREATE POLICY "games: professional manages" ON public.game_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = game_records.team_id AND professional_id = auth.uid())
  );
CREATE POLICY "games: athlete reads team" ON public.game_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = game_records.team_id AND athlete_id = auth.uid())
  );

-- ── daily_wellness ───────────────────────────────────────────
CREATE POLICY "wellness: athlete full" ON public.daily_wellness
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
-- Profesional: READ ONLY (no puede editar bienestar del atleta)
CREATE POLICY "wellness: professional reads" ON public.daily_wellness
  FOR SELECT USING (public.is_my_athlete(athlete_id));

-- ── session_rpe ──────────────────────────────────────────────
CREATE POLICY "rpe: athlete full" ON public.session_rpe
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "rpe: professional reads" ON public.session_rpe
  FOR SELECT USING (public.is_my_athlete(athlete_id));

-- ── acwr_snapshots ───────────────────────────────────────────
-- Solo la Edge Function (service_role) escribe; usuarios solo leen
CREATE POLICY "acwr: service role full" ON public.acwr_snapshots
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "acwr: athlete reads own" ON public.acwr_snapshots
  FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "acwr: professional reads" ON public.acwr_snapshots
  FOR SELECT USING (public.is_my_athlete(athlete_id));

-- ── prevention_sessions ──────────────────────────────────────
CREATE POLICY "prev_sess: professional full" ON public.prevention_sessions
  FOR ALL USING (created_by = auth.uid());
CREATE POLICY "prev_sess: athlete reads assigned" ON public.prevention_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.prevention_athletes WHERE session_id = prevention_sessions.id AND athlete_id = auth.uid())
  );

-- ── prevention_athletes ──────────────────────────────────────
CREATE POLICY "prev_ath: professional manages" ON public.prevention_athletes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.prevention_sessions WHERE id = prevention_athletes.session_id AND created_by = auth.uid())
  );
CREATE POLICY "prev_ath: athlete reads and completes" ON public.prevention_athletes
  FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "prev_ath: athlete marks complete" ON public.prevention_athletes
  FOR UPDATE USING (athlete_id = auth.uid());

-- ── exercises ────────────────────────────────────────────────
CREATE POLICY "exercises: anyone reads" ON public.exercises
  FOR SELECT USING (true);
CREATE POLICY "exercises: authenticated creates" ON public.exercises
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── session_exercises ────────────────────────────────────────
CREATE POLICY "sess_ex: anyone reads" ON public.session_exercises
  FOR SELECT USING (true);
CREATE POLICY "sess_ex: professional manages" ON public.session_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.prevention_sessions WHERE id = session_exercises.session_id AND created_by = auth.uid())
  );

-- ── periodization_plans ──────────────────────────────────────
CREATE POLICY "plans: professional full" ON public.periodization_plans
  FOR ALL USING (created_by = auth.uid());
CREATE POLICY "plans: athlete reads team" ON public.periodization_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = periodization_plans.team_id AND athlete_id = auth.uid())
  );

-- ── periodization_cycles ─────────────────────────────────────
CREATE POLICY "cycles: professional full" ON public.periodization_cycles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.periodization_plans WHERE id = periodization_cycles.plan_id AND created_by = auth.uid())
  );
CREATE POLICY "cycles: athlete reads" ON public.periodization_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.periodization_plans pp
      JOIN public.team_members tm ON tm.team_id = pp.team_id
      WHERE pp.id = periodization_cycles.plan_id AND tm.athlete_id = auth.uid()
    )
  );

-- ── poms_assessments ─────────────────────────────────────────
-- Atleta: gestión total (self-report)
CREATE POLICY "poms: athlete own" ON public.poms_assessments
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
-- Profesional: lectura + inserción (evaluación presencial)
CREATE POLICY "poms: professional reads" ON public.poms_assessments
  FOR SELECT USING (public.is_my_athlete(athlete_id));
CREATE POLICY "poms: professional inserts" ON public.poms_assessments
  FOR INSERT WITH CHECK (public.is_my_athlete(athlete_id));
CREATE POLICY "poms: professional updates" ON public.poms_assessments
  FOR UPDATE USING (public.is_my_athlete(athlete_id));

-- ── hq_evaluations ───────────────────────────────────────────
-- Solo profesional que realiza la evaluación puede gestionar
CREATE POLICY "hq: evaluator full" ON public.hq_evaluations
  FOR ALL USING (evaluated_by = auth.uid()) WITH CHECK (evaluated_by = auth.uid());
-- Cualquier profesional del equipo puede leer
CREATE POLICY "hq: professional reads team" ON public.hq_evaluations
  FOR SELECT USING (public.is_my_athlete(athlete_id));
-- Atleta: solo lectura de sus propias evaluaciones
CREATE POLICY "hq: athlete reads own" ON public.hq_evaluations
  FOR SELECT USING (athlete_id = auth.uid());

-- ── pain_records ─────────────────────────────────────────────
-- Atleta: gestión total (registra su propio dolor)
CREATE POLICY "pain: athlete own" ON public.pain_records
  FOR ALL USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
-- Profesional: lectura + inserción (registro en evaluación presencial)
CREATE POLICY "pain: professional reads" ON public.pain_records
  FOR SELECT USING (public.is_my_athlete(athlete_id));
CREATE POLICY "pain: professional inserts" ON public.pain_records
  FOR INSERT WITH CHECK (public.is_my_athlete(athlete_id));

-- ── biomechanical_evaluations ─────────────────────────────────
-- Solo el evaluador puede gestionar la evaluación
CREATE POLICY "biomech: evaluator full" ON public.biomechanical_evaluations
  FOR ALL USING (evaluated_by = auth.uid()) WITH CHECK (evaluated_by = auth.uid());
-- Cualquier profesional del equipo puede leer
CREATE POLICY "biomech: professional reads" ON public.biomechanical_evaluations
  FOR SELECT USING (public.is_my_athlete(athlete_id));
-- Atleta: solo lectura de las suyas
CREATE POLICY "biomech: athlete reads own" ON public.biomechanical_evaluations
  FOR SELECT USING (athlete_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 8. CATÁLOGO DE EJERCICIOS (seed)
-- ──────────────────────────────────────────────────────────────

INSERT INTO public.exercises (name, sport, category, instructions) VALUES
  ('Nordic Curl',           NULL,         'isquiotibiales', 'Apoya las rodillas, ancla los pies. Desciende controladamente. 3×6-8 reps excéntrico.'),
  ('Copenhagen Plank',      NULL,         'aductores',      'Apoya el pie superior en un banco. Eleva la cadera, mantén 20-30 s.'),
  ('Single-Leg Squat',      NULL,         'rodilla',        'De pie sobre una pierna, desciende controlando la alineación rodilla-tobillo-cadera.'),
  ('Calf Raises',           NULL,         'tobillo',        'Eleva los talones lentamente (3 s concéntrico, 3 s excéntrico). Bilateral y unilateral.'),
  ('Hip Thrust',            NULL,         'glúteo',         'Hombros en banco, caderas al suelo. Empuja hacia arriba con control del core.'),
  ('Reverse Nordic',        NULL,         'cuádriceps',     'De rodillas, inclínate hacia atrás lentamente controlando la tensión del cuádriceps.'),
  ('Lateral Band Walk',     NULL,         'glúteo_medio',   'Banda en rodillas. Pasos laterales manteniendo la alineación de cadera y rodilla.'),
  ('Jump Landing',          'basketball', 'aterrizaje',     'Salta y aterriza con rodillas semiflexionadas. Foco en absorción simétrica del impacto.'),
  ('Volleyball Spike Land', 'volleyball', 'aterrizaje',     'Remate y aterrizaje unilateral. Controla la rodilla en valgo. Progresión 1→2 piernas.'),
  ('Sprint-Deceleration',   'football',   'velocidad',      'Sprint 10m + desaceleración progresiva 5m. Foco en frenada con cadera baja.')
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- FIN — Schema Vitatekh v2
-- ──────────────────────────────────────────────────────────────
