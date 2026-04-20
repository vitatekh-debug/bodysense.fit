-- ============================================================
-- Fix: RLS infinite recursion + reasignar al usuario real
-- UUID real de juancho.9609@gmail.com:
--   79aa3f31-64d7-4e58-9cb5-9bc631357d36
--
-- CAUSA del error:
--   policy "teams"        → consulta team_members
--   policy "team_members" → consulta teams
--   → bucle infinito cuando RLS evalúa ambas tablas
--
-- SOLUCIÓN: funciones SECURITY DEFINER que ejecutan la
--   consulta interna sin activar RLS, rompiendo el ciclo.
-- ============================================================

-- ── 0. Reasignar equipos al UUID real ────────────────────────

UPDATE public.teams
SET professional_id = '79aa3f31-64d7-4e58-9cb5-9bc631357d36',
    updated_at      = now();

UPDATE public.training_sessions
SET created_by = '79aa3f31-64d7-4e58-9cb5-9bc631357d36';

UPDATE public.prevention_sessions
SET created_by = '79aa3f31-64d7-4e58-9cb5-9bc631357d36';

UPDATE public.periodization_plans
SET created_by = '79aa3f31-64d7-4e58-9cb5-9bc631357d36';

-- Garantizar perfil profesional
INSERT INTO public.profiles (id, role, full_name, email, created_at, updated_at)
VALUES (
  '79aa3f31-64d7-4e58-9cb5-9bc631357d36',
  'professional',
  'Juan Admin',
  'juancho.9609@gmail.com',
  now(), now()
)
ON CONFLICT (id) DO UPDATE
  SET role = 'professional', updated_at = now();

-- ── 1. Funciones SECURITY DEFINER (rompen el ciclo RLS) ──────
--
--   SECURITY DEFINER → se ejecutan con permisos del owner (postgres)
--   → no activan RLS al consultar las tablas internas
--   → el ciclo teams↔team_members queda roto

CREATE OR REPLACE FUNCTION public.is_my_team(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- ¿El equipo pertenece al usuario actual?
  -- Al ser SECURITY DEFINER no activa la policy de teams → sin recursión
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id
      AND professional_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.athlete_in_my_teams(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- ¿El atleta pertenece a algún equipo del profesional actual?
  -- SECURITY DEFINER evita activar RLS en teams y team_members
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = p_athlete_id
      AND t.professional_id = auth.uid()
  );
$$;

-- ── 2. Recrear policies de teams ─────────────────────────────

DROP POLICY IF EXISTS "Professional manages own teams" ON public.teams;
CREATE POLICY "Professional manages own teams" ON public.teams
  FOR ALL
  USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Athlete sees own team" ON public.teams;
CREATE POLICY "Athlete sees own team" ON public.teams
  FOR SELECT
  USING (
    -- Consulta directa a team_members; la policy de team_members
    -- ahora usa is_my_team() (SECURITY DEFINER) → sin ciclo
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = teams.id
        AND athlete_id = auth.uid()
    )
  );

-- ── 3. Recrear policies de team_members ──────────────────────

DROP POLICY IF EXISTS "Professional manages team members" ON public.team_members;
CREATE POLICY "Professional manages team members" ON public.team_members
  FOR ALL
  -- is_my_team() es SECURITY DEFINER → consulta teams sin activar su RLS
  USING (public.is_my_team(team_id));

DROP POLICY IF EXISTS "Athlete sees own membership" ON public.team_members;
CREATE POLICY "Athlete sees own membership" ON public.team_members
  FOR SELECT
  USING (athlete_id = auth.uid());

-- ── 4. Recrear policy de profiles ────────────────────────────

DROP POLICY IF EXISTS "Professional sees team athletes" ON public.profiles;
CREATE POLICY "Professional sees team athletes" ON public.profiles
  FOR SELECT
  -- athlete_in_my_teams() es SECURITY DEFINER → sin recursión
  USING (public.athlete_in_my_teams(id));

-- ── 5. Verificación final ─────────────────────────────────────

SELECT
  'teams'        AS tabla,
  COUNT(*)       AS filas,
  COUNT(*) FILTER (WHERE professional_id = '79aa3f31-64d7-4e58-9cb5-9bc631357d36') AS del_usuario
FROM public.teams

UNION ALL

SELECT 'team_members', COUNT(*), COUNT(*) FROM public.team_members

UNION ALL

SELECT 'training_sessions', COUNT(*),
  COUNT(*) FILTER (WHERE created_by = '79aa3f31-64d7-4e58-9cb5-9bc631357d36')
FROM public.training_sessions

UNION ALL

SELECT 'acwr_snapshots', COUNT(*), COUNT(*) FROM public.acwr_snapshots

UNION ALL

SELECT 'profiles (atletas)', COUNT(*), COUNT(*)
FROM public.profiles WHERE role = 'athlete';
