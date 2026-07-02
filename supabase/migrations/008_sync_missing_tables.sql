-- ============================================================
-- Bodysense — Migración 008: Sincronización de tablas faltantes
--
-- Estas tablas existen en producción pero no tenían migración
-- local correspondiente. Se recrean aquí para mantener paridad
-- entre el esquema local y el remoto.
-- ============================================================

-- ── ENUMs nuevos (pueden ya existir en producción) ───────────

CREATE TYPE IF NOT EXISTS surface_type AS ENUM ('grass', 'artificial', 'parquet', 'concrete', 'sand', 'other');
CREATE TYPE IF NOT EXISTS footwear_type AS ENUM ('boots', 'sneakers', 'spikes', 'barefoot', 'other');
CREATE TYPE IF NOT EXISTS pain_timing AS ENUM ('pre_session', 'during_session', 'post_session', 'rest');
CREATE TYPE IF NOT EXISTS pain_region AS ENUM ('head', 'neck', 'shoulder', 'arm', 'elbow', 'forearm', 'wrist', 'hand', 'chest', 'upper_back', 'lower_back', 'hip', 'groin', 'thigh', 'knee', 'shin', 'calf', 'ankle', 'foot');
CREATE TYPE IF NOT EXISTS eva_traffic_light AS ENUM ('green', 'yellow', 'red');

-- ── team_members ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_members (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  athlete_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS team_members_team_idx    ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS team_members_athlete_idx ON public.team_members (athlete_id);

-- ── exercises ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exercises (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  sport        sport_type,
  category     TEXT        NOT NULL DEFAULT 'general',
  instructions TEXT,
  video_url    TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── game_records ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.game_records (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  opponent     TEXT,
  duration_min INTEGER     NOT NULL DEFAULT 90,
  pre_rpe      SMALLINT,
  post_rpe     SMALLINT,
  result       TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_records_team_date_idx ON public.game_records (team_id, date DESC);

-- ── pain_records ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pain_records (
  id                  UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id          UUID             NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id          UUID             REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  date                DATE             NOT NULL,
  timing              pain_timing      NOT NULL DEFAULT 'post_session',
  body_region         pain_region      NOT NULL,
  pain_type           TEXT             NOT NULL,
  eva_score           SMALLINT         NOT NULL,
  traffic_light       eva_traffic_light,
  limits_performance  BOOLEAN          NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pain_records_athlete_date_idx ON public.pain_records (athlete_id, date DESC);

-- ── periodization_plans ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.periodization_plans (
  id           UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      UUID                  NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name         TEXT                  NOT NULL,
  model        periodization_model   NOT NULL DEFAULT 'classic',
  start_date   DATE                  NOT NULL,
  end_date     DATE                  NOT NULL,
  created_by   UUID                  NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

-- ── periodization_cycles ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.periodization_cycles (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID           NOT NULL REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  parent_id   UUID           REFERENCES public.periodization_cycles(id) ON DELETE CASCADE,
  level       cycle_level    NOT NULL,
  name        TEXT           NOT NULL,
  phase       session_phase  NOT NULL,
  start_date  DATE           NOT NULL,
  end_date    DATE           NOT NULL,
  objectives  TEXT
);

CREATE INDEX IF NOT EXISTS periodization_cycles_plan_idx ON public.periodization_cycles (plan_id);

-- ── prevention_sessions ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prevention_sessions (
  id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by  UUID             NOT NULL REFERENCES public.profiles(id),
  title       TEXT             NOT NULL,
  description TEXT,
  date        DATE             NOT NULL,
  type        prevention_type  NOT NULL DEFAULT 'group',
  sport       sport_type,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ── prevention_athletes ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prevention_athletes (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID        NOT NULL REFERENCES public.prevention_sessions(id) ON DELETE CASCADE,
  athlete_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  UNIQUE (session_id, athlete_id)
);

-- ── session_exercises ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_exercises (
  id           UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID      NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id  UUID      NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets         SMALLINT,
  reps         SMALLINT,
  duration_sec INTEGER
);

CREATE INDEX IF NOT EXISTS session_exercises_session_idx ON public.session_exercises (session_id);

-- ── biomechanical_evaluations ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.biomechanical_evaluations (
  id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id                  UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluated_by                UUID         NOT NULL REFERENCES public.profiles(id),
  date                        DATE         NOT NULL,
  surface_type                surface_type NOT NULL,
  surface_condition           TEXT,
  footwear_type               footwear_type NOT NULL,
  footwear_age_months         SMALLINT,
  insoles_used                BOOLEAN      DEFAULT FALSE,
  ankle_dorsiflexion_left_deg NUMERIC,
  ankle_dorsiflexion_right_deg NUMERIC,
  hip_flexion_left_deg        NUMERIC,
  hip_flexion_right_deg       NUMERIC,
  hip_ir_left_deg             NUMERIC,
  hip_ir_right_deg            NUMERIC,
  fms_deep_squat              SMALLINT,
  fms_hurdle_step             SMALLINT,
  fms_inline_lunge            SMALLINT,
  fms_shoulder_mobility       SMALLINT,
  fms_aslr                    SMALLINT,
  fms_trunk_stability         SMALLINT,
  fms_rotary_stability        SMALLINT,
  fms_total                   SMALLINT,
  fms_injury_risk             BOOLEAN,
  knee_valgus_left            BOOLEAN      DEFAULT FALSE,
  knee_valgus_right           BOOLEAN      DEFAULT FALSE,
  pelvic_drop_left            BOOLEAN      DEFAULT FALSE,
  pelvic_drop_right           BOOLEAN      DEFAULT FALSE,
  excessive_pronation_left    BOOLEAN      DEFAULT FALSE,
  excessive_pronation_right   BOOLEAN      DEFAULT FALSE,
  forward_trunk_lean          BOOLEAN      DEFAULT FALSE,
  findings                    TEXT,
  recommendations             TEXT,
  follow_up_date              DATE,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS biomechanical_athlete_date_idx ON public.biomechanical_evaluations (athlete_id, date DESC);
