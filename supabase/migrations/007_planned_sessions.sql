-- ============================================================
-- Bodysense — Migración 007: Sesiones Planificadas
--
-- Tabla planned_sessions: almacena la planificación semanal
-- de entrenamientos creada por profesionales para sus atletas.
--
-- Modelo de carga proyectada:
--   srpe_projected = rpe_target × duration_min
--   (se calcula y almacena en el INSERT para eficiencia de lectura)
-- ============================================================

-- ── Tabla principal ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.planned_sessions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  team_id          UUID        NOT NULL REFERENCES public.teams(id)      ON DELETE CASCADE,
  date             DATE        NOT NULL,
  duration_min     INTEGER     NOT NULL CHECK (duration_min > 0),
  session_type     TEXT        NOT NULL CHECK (session_type IN (
    'technical', 'tactical', 'physical', 'match', 'recovery', 'prevention'
  )),
  phase            TEXT        NOT NULL CHECK (phase IN (
    'preseason', 'competition', 'transition'
  )),
  description      TEXT,
  rpe_target       INTEGER     CHECK (rpe_target BETWEEN 6 AND 20),
  -- Carga proyectada: calculada en INSERT, nunca null cuando rpe_target está presente
  srpe_projected   INTEGER     GENERATED ALWAYS AS (
    CASE WHEN rpe_target IS NOT NULL THEN rpe_target * duration_min ELSE NULL END
  ) STORED,
  created_by       UUID        NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices de rendimiento ───────────────────────────────────

-- Lectura principal: sesiones de un atleta por semana
CREATE INDEX IF NOT EXISTS planned_sessions_athlete_date_idx
  ON public.planned_sessions (athlete_id, date);

-- Filtrado por equipo (vista coach: todos sus atletas)
CREATE INDEX IF NOT EXISTS planned_sessions_team_date_idx
  ON public.planned_sessions (team_id, date);

-- ── Row-Level Security ───────────────────────────────────────

ALTER TABLE public.planned_sessions ENABLE ROW LEVEL SECURITY;

-- Profesional: acceso completo a sesiones que él creó
CREATE POLICY "professional_own_planned_sessions"
  ON public.planned_sessions
  FOR ALL
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Atleta: sólo puede leer sus propias sesiones planificadas
CREATE POLICY "athlete_read_own_planned_sessions"
  ON public.planned_sessions
  FOR SELECT
  USING (athlete_id = auth.uid());

-- ── Trigger: audit created_by ────────────────────────────────
-- Garantiza que created_by siempre coincide con el usuario autenticado
-- (defensa en profundidad sobre la política RLS WITH CHECK).

CREATE OR REPLACE FUNCTION public.set_planned_session_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER planned_sessions_set_created_by
  BEFORE INSERT ON public.planned_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_planned_session_created_by();

-- ── Comentarios de documentación ────────────────────────────

COMMENT ON TABLE  public.planned_sessions                 IS 'Sesiones planificadas por el profesional para sus atletas. srpe_projected = rpe_target × duration_min.';
COMMENT ON COLUMN public.planned_sessions.rpe_target      IS 'Escala de Borg: 6 (muy muy ligero) – 20 (esfuerzo máximo).';
COMMENT ON COLUMN public.planned_sessions.srpe_projected  IS 'Carga interna proyectada (u.a.). Columna generada: rpe_target × duration_min.';
COMMENT ON COLUMN public.planned_sessions.created_by      IS 'UUID del profesional que creó la sesión. Forzado por trigger a auth.uid().';
