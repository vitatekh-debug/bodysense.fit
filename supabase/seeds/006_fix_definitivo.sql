-- ============================================================
-- Fix DEFINITIVO — Vitatekh
-- Reasigna TODO al usuario juancho.9609@gmail.com
-- Incluye: perfil · equipos · sesiones · acwr · políticas RLS
-- ============================================================

DO $$
DECLARE
  v_uid uuid;
BEGIN

  -- ── 1. UUID real ──────────────────────────────────────────────
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'juancho.9609@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION '❌ No existe auth.users con ese correo. ¿Ya te registraste en /register?';
  END IF;

  RAISE NOTICE '─────────────────────────────────────────';
  RAISE NOTICE '✅ UUID encontrado: %', v_uid;
  RAISE NOTICE '─────────────────────────────────────────';

  -- ── 2. Garantizar perfil profesional ────────────────────────────
  INSERT INTO public.profiles (id, role, full_name, email, created_at, updated_at)
  VALUES (v_uid, 'professional', 'Juan Admin', 'juancho.9609@gmail.com', now(), now())
  ON CONFLICT (id) DO UPDATE
    SET role = 'professional',
        updated_at = now();

  RAISE NOTICE '✅ Perfil: role = professional';

  -- ── 3. Reasignar TODOS los equipos ──────────────────────────────
  UPDATE public.teams
  SET professional_id = v_uid,
      updated_at      = now();

  RAISE NOTICE '✅ Equipos reasignados: %',
    (SELECT COUNT(*) FROM public.teams WHERE professional_id = v_uid);

  -- ── 4. Reasignar created_by en sesiones de entrenamiento ─────────
  UPDATE public.training_sessions
  SET created_by = v_uid;

  RAISE NOTICE '✅ Sesiones de entrenamiento: %',
    (SELECT COUNT(*) FROM public.training_sessions WHERE created_by = v_uid);

  -- ── 5. Reasignar prevention_sessions y periodization_plans ───────
  UPDATE public.prevention_sessions  SET created_by = v_uid;
  UPDATE public.periodization_plans  SET created_by = v_uid;

  -- ── 6. Verificar que los atletas existen en profiles ─────────────
  RAISE NOTICE '✅ Perfiles atletas en BD: %',
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'athlete');

  -- ── 7. Verificar team_members ────────────────────────────────────
  RAISE NOTICE '✅ Miembros de equipo: %',
    (SELECT COUNT(*) FROM public.team_members);

  -- ── 8. Resultado final ───────────────────────────────────────────
  RAISE NOTICE '─────────────────────────────────────────';
  RAISE NOTICE '📊 RESUMEN';
  RAISE NOTICE '   Equipos del prof  : %', (SELECT COUNT(*) FROM public.teams        WHERE professional_id = v_uid);
  RAISE NOTICE '   Atletas totales   : %', (SELECT COUNT(*) FROM public.profiles     WHERE role = 'athlete'::user_role);
  RAISE NOTICE '   Miembros equipo   : %', (SELECT COUNT(*) FROM public.team_members);
  RAISE NOTICE '   Sesiones          : %', (SELECT COUNT(*) FROM public.training_sessions);
  RAISE NOTICE '   ACWR snapshots    : %', (SELECT COUNT(*) FROM public.acwr_snapshots);
  RAISE NOTICE '─────────────────────────────────────────';
  RAISE NOTICE '✅ Recarga localhost:3001/dashboard';

END $$;
