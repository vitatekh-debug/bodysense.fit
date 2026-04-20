-- ============================================================
-- Vitatekh — Fix: Idempotent schema (safe to run multiple times)
-- Ejecuta este script si ya existe el error "type already exists"
-- ============================================================

-- ─── ENUMS (safe: solo crea si no existe) ───────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('professional', 'athlete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sport_type AS ENUM ('basketball', 'football', 'volleyball');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_phase AS ENUM ('preseason', 'competition', 'transition');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_type AS ENUM ('technical', 'tactical', 'physical', 'match', 'recovery', 'prevention');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE periodization_model AS ENUM ('classic', 'tactical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE acwr_risk_zone AS ENUM ('low', 'optimal', 'high', 'very_high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prevention_type AS ENUM ('group', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cycle_level AS ENUM ('macrocycle', 'mesocycle', 'microcycle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── EXTENSION ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── HELPER FUNCTION: updated_at ────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── PROFILES ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'athlete',
  full_name    TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  sport        sport_type,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── TEAMS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  sport            sport_type NOT NULL,
  professional_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teams_professional_idx ON teams(professional_id);

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TEAM MEMBERS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS team_members_team_idx    ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_athlete_idx ON team_members(athlete_id);

-- ─── TRAINING SESSIONS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  duration_min  INT NOT NULL CHECK (duration_min > 0),
  session_type  session_type NOT NULL DEFAULT 'physical',
  phase         session_phase NOT NULL DEFAULT 'competition',
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS training_sessions_athlete_idx ON training_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS training_sessions_date_idx    ON training_sessions(date);

-- ─── GAME RECORDS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_records (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  opponent     TEXT,
  duration_min INT NOT NULL DEFAULT 90,
  pre_rpe      SMALLINT CHECK (pre_rpe BETWEEN 6 AND 20),
  post_rpe     SMALLINT CHECK (post_rpe BETWEEN 6 AND 20),
  result       TEXT CHECK (result IN ('win', 'loss', 'draw')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_records_team_idx ON game_records(team_id);

-- ─── DAILY WELLNESS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_wellness (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  fatigue        SMALLINT NOT NULL CHECK (fatigue BETWEEN 1 AND 10),
  sleep_hours    NUMERIC(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 16),
  sleep_quality  SMALLINT NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  mood           SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, date)
);

CREATE INDEX IF NOT EXISTS daily_wellness_athlete_idx ON daily_wellness(athlete_id);
CREATE INDEX IF NOT EXISTS daily_wellness_date_idx    ON daily_wellness(date);

-- ─── SESSION RPE ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_rpe (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rpe         SMALLINT NOT NULL CHECK (rpe BETWEEN 6 AND 20),
  srpe        INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS session_rpe_athlete_idx ON session_rpe(athlete_id);

-- ─── ACWR SNAPSHOTS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS acwr_snapshots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  acute_load    NUMERIC(10,2) NOT NULL DEFAULT 0,
  chronic_load  NUMERIC(10,2) NOT NULL DEFAULT 0,
  acwr_ratio    NUMERIC(6,3) NOT NULL DEFAULT 0,
  risk_zone     acwr_risk_zone NOT NULL DEFAULT 'low',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, date)
);

CREATE INDEX IF NOT EXISTS acwr_athlete_idx ON acwr_snapshots(athlete_id);
CREATE INDEX IF NOT EXISTS acwr_date_idx    ON acwr_snapshots(date);

-- ─── PREVENTION SESSIONS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS prevention_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  date         DATE NOT NULL,
  type         prevention_type NOT NULL DEFAULT 'group',
  sport        sport_type,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prevention_sessions_created_by_idx ON prevention_sessions(created_by);

-- ─── PREVENTION ATHLETES ────────────────────────────────────

CREATE TABLE IF NOT EXISTS prevention_athletes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES prevention_sessions(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ,
  UNIQUE (session_id, athlete_id)
);

-- ─── EXERCISES ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  sport        sport_type,
  category     TEXT NOT NULL DEFAULT 'general',
  instructions TEXT,
  video_url    TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SESSION EXERCISES ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_exercises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES prevention_sessions(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets          SMALLINT,
  reps          SMALLINT,
  duration_sec  INT,
  order_index   SMALLINT NOT NULL DEFAULT 0,
  notes         TEXT
);

-- ─── PERIODIZATION PLANS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS periodization_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  model       periodization_model NOT NULL DEFAULT 'classic',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS periodization_plans_team_idx ON periodization_plans(team_id);

-- ─── PERIODIZATION CYCLES ───────────────────────────────────

CREATE TABLE IF NOT EXISTS periodization_cycles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES periodization_plans(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES periodization_cycles(id) ON DELETE CASCADE,
  level       cycle_level NOT NULL,
  name        TEXT NOT NULL,
  phase       session_phase NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  objectives  TEXT,
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS periodization_cycles_plan_idx ON periodization_cycles(plan_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_wellness       ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_rpe          ENABLE ROW LEVEL SECURITY;
ALTER TABLE acwr_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_athletes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises    ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodization_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodization_cycles ENABLE ROW LEVEL SECURITY;

-- ─── POLICIES (DROP + RECREATE para idempotencia) ───────────

-- profiles
DROP POLICY IF EXISTS "Own profile" ON profiles;
CREATE POLICY "Own profile" ON profiles
  FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "Professional sees team athletes" ON profiles;
CREATE POLICY "Professional sees team athletes" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = profiles.id
        AND t.professional_id = auth.uid()
    )
  );

-- teams
DROP POLICY IF EXISTS "Professional manages own teams" ON teams;
CREATE POLICY "Professional manages own teams" ON teams
  FOR ALL USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Athlete sees own team" ON teams;
CREATE POLICY "Athlete sees own team" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id AND athlete_id = auth.uid()
    )
  );

-- team_members
DROP POLICY IF EXISTS "Professional manages team members" ON team_members;
CREATE POLICY "Professional manages team members" ON team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND professional_id = auth.uid())
  );

DROP POLICY IF EXISTS "Athlete sees own membership" ON team_members;
CREATE POLICY "Athlete sees own membership" ON team_members
  FOR SELECT USING (athlete_id = auth.uid());

-- training_sessions
DROP POLICY IF EXISTS "Athlete sees own sessions" ON training_sessions;
CREATE POLICY "Athlete sees own sessions" ON training_sessions
  FOR SELECT USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Professional manages team sessions" ON training_sessions;
CREATE POLICY "Professional manages team sessions" ON training_sessions
  FOR ALL USING (created_by = auth.uid());

-- daily_wellness
DROP POLICY IF EXISTS "Athlete manages own wellness" ON daily_wellness;
CREATE POLICY "Athlete manages own wellness" ON daily_wellness
  FOR ALL USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Professional reads athlete wellness" ON daily_wellness;
CREATE POLICY "Professional reads athlete wellness" ON daily_wellness
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = daily_wellness.athlete_id
        AND t.professional_id = auth.uid()
    )
  );

-- session_rpe
DROP POLICY IF EXISTS "Athlete manages own RPE" ON session_rpe;
CREATE POLICY "Athlete manages own RPE" ON session_rpe
  FOR ALL USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Professional reads athlete RPE" ON session_rpe;
CREATE POLICY "Professional reads athlete RPE" ON session_rpe
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = session_rpe.athlete_id
        AND t.professional_id = auth.uid()
    )
  );

-- acwr_snapshots
DROP POLICY IF EXISTS "Athlete reads own ACWR" ON acwr_snapshots;
CREATE POLICY "Athlete reads own ACWR" ON acwr_snapshots
  FOR SELECT USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Professional reads team ACWR" ON acwr_snapshots;
CREATE POLICY "Professional reads team ACWR" ON acwr_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = acwr_snapshots.athlete_id
        AND t.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role writes ACWR" ON acwr_snapshots;
CREATE POLICY "Service role writes ACWR" ON acwr_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- prevention_sessions
DROP POLICY IF EXISTS "Professional manages prevention sessions" ON prevention_sessions;
CREATE POLICY "Professional manages prevention sessions" ON prevention_sessions
  FOR ALL USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Athlete reads assigned prevention" ON prevention_sessions;
CREATE POLICY "Athlete reads assigned prevention" ON prevention_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prevention_athletes
      WHERE session_id = prevention_sessions.id AND athlete_id = auth.uid()
    )
  );

-- prevention_athletes
DROP POLICY IF EXISTS "Professional manages prevention athletes" ON prevention_athletes;
CREATE POLICY "Professional manages prevention athletes" ON prevention_athletes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prevention_sessions
      WHERE id = prevention_athletes.session_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Athlete updates own completion" ON prevention_athletes;
CREATE POLICY "Athlete updates own completion" ON prevention_athletes
  FOR UPDATE USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Athlete reads own prevention" ON prevention_athletes;
CREATE POLICY "Athlete reads own prevention" ON prevention_athletes
  FOR SELECT USING (athlete_id = auth.uid());

-- exercises
DROP POLICY IF EXISTS "Everyone reads exercises" ON exercises;
CREATE POLICY "Everyone reads exercises" ON exercises
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated creates exercises" ON exercises;
CREATE POLICY "Authenticated creates exercises" ON exercises
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- session_exercises
DROP POLICY IF EXISTS "Everyone reads session exercises" ON session_exercises;
CREATE POLICY "Everyone reads session exercises" ON session_exercises
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professional manages session exercises" ON session_exercises;
CREATE POLICY "Professional manages session exercises" ON session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prevention_sessions
      WHERE id = session_exercises.session_id AND created_by = auth.uid()
    )
  );

-- periodization_plans
DROP POLICY IF EXISTS "Professional manages periodization plans" ON periodization_plans;
CREATE POLICY "Professional manages periodization plans" ON periodization_plans
  FOR ALL USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Team athletes read periodization" ON periodization_plans;
CREATE POLICY "Team athletes read periodization" ON periodization_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = periodization_plans.team_id AND athlete_id = auth.uid()
    )
  );

-- periodization_cycles
DROP POLICY IF EXISTS "Professional manages cycles" ON periodization_cycles;
CREATE POLICY "Professional manages cycles" ON periodization_cycles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM periodization_plans
      WHERE id = periodization_cycles.plan_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team athletes read cycles" ON periodization_cycles;
CREATE POLICY "Team athletes read cycles" ON periodization_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM periodization_plans pp
      JOIN team_members tm ON tm.team_id = pp.team_id
      WHERE pp.id = periodization_cycles.plan_id AND tm.athlete_id = auth.uid()
    )
  );

-- game_records
DROP POLICY IF EXISTS "Professional manages game records" ON game_records;
CREATE POLICY "Professional manages game records" ON game_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM teams WHERE id = game_records.team_id AND professional_id = auth.uid())
  );

DROP POLICY IF EXISTS "Athlete reads team game records" ON game_records;
CREATE POLICY "Athlete reads team game records" ON game_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = game_records.team_id AND athlete_id = auth.uid()
    )
  );

-- ─── SEED: Catálogo de ejercicios (solo si no existe) ────────

INSERT INTO exercises (name, sport, category, instructions)
SELECT * FROM (VALUES
  ('Nordic Curl',           NULL::sport_type, 'isquiotibiales', 'Apoya las rodillas en el suelo, ancla los pies. Desciende controladamente hacia adelante.'),
  ('Copenhagen Plank',      NULL,              'aductores',      'Apoya el pie superior en un banco. Eleva la cadera y mantén posición lateral.'),
  ('Single-Leg Squat',      NULL,              'rodilla',        'De pie sobre una pierna, desciende controlando la alineación rodilla-tobillo.'),
  ('Calf Raises',           NULL,              'tobillo',        'De pie, eleva los talones lentamente. Trabaja bilateral y unilateral.'),
  ('Hip Thrust',            NULL,              'glúteo',         'Apoya los hombros en un banco. Empuja la cadera hacia arriba con control.'),
  ('Jump Landing',          'basketball',      'aterrizaje',     'Salta y aterriza con rodillas semiflexionadas absorbiendo el impacto con ambas piernas.'),
  ('Volleyball Spike Land', 'volleyball',      'aterrizaje',     'Remate y aterrizaje unilateral. Controla la rodilla en valgo.'),
  ('Sprint-Deceleration',   'football',        'velocidad',      'Sprint corto seguido de desaceleración progresiva en 5–10m.')
) AS v(name, sport, category, instructions)
WHERE NOT EXISTS (SELECT 1 FROM exercises LIMIT 1);
