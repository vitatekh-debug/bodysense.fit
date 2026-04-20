-- ============================================================
-- Vitatekh — Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('professional', 'athlete');
CREATE TYPE sport_type AS ENUM ('basketball', 'football', 'volleyball');
CREATE TYPE session_phase AS ENUM ('preseason', 'competition', 'transition');
CREATE TYPE session_type AS ENUM ('technical', 'tactical', 'physical', 'match', 'recovery', 'prevention');
CREATE TYPE periodization_model AS ENUM ('classic', 'tactical');
CREATE TYPE acwr_risk_zone AS ENUM ('low', 'optimal', 'high', 'very_high');
CREATE TYPE prevention_type AS ENUM ('group', 'individual');
CREATE TYPE cycle_level AS ENUM ('macrocycle', 'mesocycle', 'microcycle');

-- ─── PROFILES ───────────────────────────────────────────────
-- Extends auth.users — created automatically via trigger

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'athlete',
  full_name    TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  sport        sport_type,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TEAMS ──────────────────────────────────────────────────

CREATE TABLE teams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  sport            sport_type NOT NULL,
  professional_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX teams_professional_idx ON teams(professional_id);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TEAM MEMBERS ───────────────────────────────────────────

CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, athlete_id)
);

CREATE INDEX team_members_team_idx    ON team_members(team_id);
CREATE INDEX team_members_athlete_idx ON team_members(athlete_id);

-- ─── TRAINING SESSIONS ──────────────────────────────────────

CREATE TABLE training_sessions (
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

CREATE INDEX training_sessions_athlete_idx ON training_sessions(athlete_id);
CREATE INDEX training_sessions_date_idx    ON training_sessions(date);

-- ─── GAME RECORDS ───────────────────────────────────────────

CREATE TABLE game_records (
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

CREATE INDEX game_records_team_idx ON game_records(team_id);

-- ─── DAILY WELLNESS ─────────────────────────────────────────

CREATE TABLE daily_wellness (
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

CREATE INDEX daily_wellness_athlete_idx ON daily_wellness(athlete_id);
CREATE INDEX daily_wellness_date_idx    ON daily_wellness(date);

-- ─── SESSION RPE ────────────────────────────────────────────

CREATE TABLE session_rpe (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rpe         SMALLINT NOT NULL CHECK (rpe BETWEEN 6 AND 20),
  srpe        INT NOT NULL,   -- rpe × duration_min, computed by client
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, athlete_id)
);

CREATE INDEX session_rpe_athlete_idx ON session_rpe(athlete_id);

-- ─── ACWR SNAPSHOTS ─────────────────────────────────────────

CREATE TABLE acwr_snapshots (
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

CREATE INDEX acwr_athlete_idx ON acwr_snapshots(athlete_id);
CREATE INDEX acwr_date_idx    ON acwr_snapshots(date);

-- ─── PREVENTION SESSIONS ────────────────────────────────────

CREATE TABLE prevention_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  date         DATE NOT NULL,
  type         prevention_type NOT NULL DEFAULT 'group',
  sport        sport_type,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX prevention_sessions_created_by_idx ON prevention_sessions(created_by);

-- ─── PREVENTION ATHLETES ────────────────────────────────────

CREATE TABLE prevention_athletes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES prevention_sessions(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ,
  UNIQUE (session_id, athlete_id)
);

-- ─── EXERCISES ──────────────────────────────────────────────

CREATE TABLE exercises (
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

CREATE TABLE session_exercises (
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

CREATE TABLE periodization_plans (
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

CREATE INDEX periodization_plans_team_idx ON periodization_plans(team_id);

-- ─── PERIODIZATION CYCLES ───────────────────────────────────

CREATE TABLE periodization_cycles (
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

CREATE INDEX periodization_cycles_plan_idx ON periodization_cycles(plan_id);

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

-- Helper: get authenticated user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── profiles ───────────────────────────────────────────────
-- Users see their own profile; professionals see their athletes
CREATE POLICY "Own profile" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Professional sees team athletes" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = profiles.id
        AND t.professional_id = auth.uid()
    )
  );

-- ─── teams ──────────────────────────────────────────────────
CREATE POLICY "Professional manages own teams" ON teams
  FOR ALL USING (professional_id = auth.uid());

CREATE POLICY "Athlete sees own team" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id AND athlete_id = auth.uid()
    )
  );

-- ─── team_members ───────────────────────────────────────────
CREATE POLICY "Professional manages team members" ON team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND professional_id = auth.uid())
  );

CREATE POLICY "Athlete sees own membership" ON team_members
  FOR SELECT USING (athlete_id = auth.uid());

-- ─── training_sessions ──────────────────────────────────────
CREATE POLICY "Athlete sees own sessions" ON training_sessions
  FOR SELECT USING (athlete_id = auth.uid());

CREATE POLICY "Professional manages team sessions" ON training_sessions
  FOR ALL USING (created_by = auth.uid());

-- ─── daily_wellness ─────────────────────────────────────────
CREATE POLICY "Athlete manages own wellness" ON daily_wellness
  FOR ALL USING (athlete_id = auth.uid());

CREATE POLICY "Professional reads athlete wellness" ON daily_wellness
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = daily_wellness.athlete_id
        AND t.professional_id = auth.uid()
    )
  );

-- ─── session_rpe ────────────────────────────────────────────
CREATE POLICY "Athlete manages own RPE" ON session_rpe
  FOR ALL USING (athlete_id = auth.uid());

CREATE POLICY "Professional reads athlete RPE" ON session_rpe
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = session_rpe.athlete_id
        AND t.professional_id = auth.uid()
    )
  );

-- ─── acwr_snapshots ─────────────────────────────────────────
CREATE POLICY "Athlete reads own ACWR" ON acwr_snapshots
  FOR SELECT USING (athlete_id = auth.uid());

CREATE POLICY "Professional reads team ACWR" ON acwr_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = acwr_snapshots.athlete_id
        AND t.professional_id = auth.uid()
    )
  );

-- Service role (Edge Functions) can write ACWR
CREATE POLICY "Service role writes ACWR" ON acwr_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- ─── prevention_sessions ────────────────────────────────────
CREATE POLICY "Professional manages prevention sessions" ON prevention_sessions
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Athlete reads assigned prevention" ON prevention_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prevention_athletes
      WHERE session_id = prevention_sessions.id AND athlete_id = auth.uid()
    )
  );

-- ─── prevention_athletes ────────────────────────────────────
CREATE POLICY "Professional manages prevention athletes" ON prevention_athletes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prevention_sessions
      WHERE id = prevention_athletes.session_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Athlete updates own completion" ON prevention_athletes
  FOR UPDATE USING (athlete_id = auth.uid());

CREATE POLICY "Athlete reads own prevention" ON prevention_athletes
  FOR SELECT USING (athlete_id = auth.uid());

-- ─── exercises ──────────────────────────────────────────────
CREATE POLICY "Everyone reads exercises" ON exercises
  FOR SELECT USING (true);

CREATE POLICY "Authenticated creates exercises" ON exercises
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── session_exercises ──────────────────────────────────────
CREATE POLICY "Everyone reads session exercises" ON session_exercises
  FOR SELECT USING (true);

CREATE POLICY "Professional manages session exercises" ON session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prevention_sessions
      WHERE id = session_exercises.session_id AND created_by = auth.uid()
    )
  );

-- ─── periodization ──────────────────────────────────────────
CREATE POLICY "Professional manages periodization plans" ON periodization_plans
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Team athletes read periodization" ON periodization_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = periodization_plans.team_id AND athlete_id = auth.uid()
    )
  );

CREATE POLICY "Professional manages cycles" ON periodization_cycles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM periodization_plans
      WHERE id = periodization_cycles.plan_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Team athletes read cycles" ON periodization_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM periodization_plans pp
      JOIN team_members tm ON tm.team_id = pp.team_id
      WHERE pp.id = periodization_cycles.plan_id AND tm.athlete_id = auth.uid()
    )
  );

-- ─── game_records ───────────────────────────────────────────
CREATE POLICY "Professional manages game records" ON game_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM teams WHERE id = game_records.team_id AND professional_id = auth.uid())
  );

CREATE POLICY "Athlete reads team game records" ON game_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = game_records.team_id AND athlete_id = auth.uid()
    )
  );

-- ============================================================
-- SEED: Exercise catalogue
-- ============================================================

INSERT INTO exercises (name, sport, category, instructions) VALUES
  ('Nordic Curl',           NULL,         'isquiotibiales', 'Apoya las rodillas en el suelo, ancla los pies. Desciende controladamente hacia adelante.'),
  ('Copenhagen Plank',      NULL,         'aductores',      'Apoya el pie superior en un banco. Eleva la cadera y mantén posición lateral.'),
  ('Single-Leg Squat',      NULL,         'rodilla',        'De pie sobre una pierna, desciende controlando la alineación rodilla-tobillo.'),
  ('Calf Raises',           NULL,         'tobillo',        'De pie, eleva los talones lentamente. Trabaja bilateral y unilateral.'),
  ('Hip Thrust',            NULL,         'glúteo',         'Apoya los hombros en un banco. Empuja la cadera hacia arriba con control.'),
  ('Jump Landing',          'basketball', 'aterrizaje',     'Salta y aterriza con rodillas semiflexionadas absorbiendo el impacto con ambas piernas.'),
  ('Volleyball Spike Land', 'volleyball', 'aterrizaje',     'Remate y aterrizaje unilateral. Controla la rodilla en valgo.'),
  ('Sprint-Deceleration',   'football',   'velocidad',      'Sprint corto seguido de desaceleración progresiva en 5–10m.');
