-- ============================================================
-- fix_teams_professional_uuid.sql
--
-- Propósito: Vincula los equipos de prueba (cccc00...) al UUID
-- real del profesional y verifica que los atletas de prueba
-- estén correctamente vinculados.
--
-- Ejecutar en: Supabase SQL Editor (como postgres)
-- ============================================================

DO $$
DECLARE
  v_prof_uuid  UUID;
  v_updated    INTEGER := 0;
  v_members    INTEGER := 0;
  v_athletes   INTEGER := 0;
BEGIN
  -- ── 1. Obtener UUID real del profesional ──────────────────────────────
  SELECT id
    INTO STRICT v_prof_uuid
    FROM auth.users
   WHERE email = 'juancho.9609@gmail.com';

  RAISE NOTICE '──────────────────────────────────────────────';
  RAISE NOTICE 'UUID del profesional: %', v_prof_uuid;

  -- ── 2. Reasignar equipos cccc00... al profesional real ────────────────
  UPDATE public.teams
     SET professional_id = v_prof_uuid
   WHERE id::text LIKE 'cccc00%'
     AND professional_id IS DISTINCT FROM v_prof_uuid;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Equipos actualizados → professional_id: %', v_updated;

  -- ── 3. Verificar team_members vinculados a esos equipos ───────────────
  SELECT COUNT(*)
    INTO v_members
    FROM public.team_members tm
    JOIN public.teams       t  ON t.id = tm.team_id
   WHERE t.id::text LIKE 'cccc00%';

  RAISE NOTICE 'team_members en equipos cccc00...: %', v_members;

  -- ── 4. Verificar perfiles de atletas vinculados ───────────────────────
  SELECT COUNT(DISTINCT p.id)
    INTO v_athletes
    FROM public.profiles    p
    JOIN public.team_members tm ON tm.athlete_id = p.id
    JOIN public.teams        t  ON t.id = tm.team_id
   WHERE t.id::text LIKE 'cccc00%'
     AND p.role = 'athlete';

  RAISE NOTICE 'Atletas con perfil en equipos cccc00...: %', v_athletes;
  RAISE NOTICE '──────────────────────────────────────────────';

  -- ── 5. Sanity check: debe haber 15 atletas ───────────────────────────
  IF v_athletes < 15 THEN
    RAISE WARNING '⚠ Solo % atletas encontrados (se esperan 15). Revisa el seed 008.', v_athletes;
  ELSE
    RAISE NOTICE '✓ Los 15 atletas de prueba están correctamente vinculados.';
  END IF;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'No existe ningún usuario con email juancho.9609@gmail.com en auth.users';
  WHEN TOO_MANY_ROWS THEN
    RAISE EXCEPTION 'Hay más de un usuario con email juancho.9609@gmail.com — revisa duplicados';
END;
$$;

-- ── Reporte final (SELECT visible en SQL Editor) ─────────────────────────
SELECT
  t.id                                        AS team_id,
  t.name                                      AS equipo,
  t.sport                                     AS deporte,
  u.email                                     AS profesional,
  COUNT(tm.athlete_id)                        AS num_atletas,
  BOOL_AND(p.role = 'athlete')                AS todos_son_atletas
FROM      public.teams       t
JOIN      auth.users         u  ON u.id  = t.professional_id
JOIN      public.team_members tm ON tm.team_id  = t.id
JOIN      public.profiles    p  ON p.id  = tm.athlete_id
WHERE t.id::text LIKE 'cccc00%'
GROUP BY  t.id, t.name, t.sport, u.email
ORDER BY  t.name;
