-- ============================================================
-- seed_athlete_profile.sql
--
-- Crea manualmente un perfil de atleta vinculado al coach.
-- Útil para que el profesional se pruebe a sí mismo como
-- atleta sin necesidad de la app móvil.
--
-- ⚠️  ANTES DE EJECUTAR — cambia las 3 variables del bloque DO:
--   v_athlete_email    → tu correo personal (≠ juancho.9609@gmail.com)
--   v_athlete_name     → tu nombre como aparecerá en el dashboard
--   v_athlete_password → contraseña para login en la app móvil
--
-- Ejecutar en: Supabase Dashboard → SQL Editor (rol postgres)
-- ============================================================

DO $$
DECLARE
  -- ── ⚠️  EDITA ESTAS TRES LÍNEAS ANTES DE EJECUTAR ──────────
  v_athlete_email    TEXT := 'TU_CORREO_PERSONAL@gmail.com';  -- distinto al profesional
  v_athlete_name     TEXT := 'Juan Pablo (Atleta)';
  v_athlete_password TEXT := 'Atleta2025!';                   -- mín. 8 caracteres
  -- ────────────────────────────────────────────────────────────

  v_athlete_sport  TEXT := 'football';                        -- basketball | football | volleyball
  v_prof_email     TEXT := 'juancho.9609@gmail.com';

  v_athlete_id     UUID;
  v_prof_id        UUID;
  v_team_id        UUID;
  v_team_name      TEXT;
BEGIN

  -- ── Guardia: no permitir correo vacío o igual al profesional ──────────────
  IF v_athlete_email = 'TU_CORREO_PERSONAL@gmail.com' THEN
    RAISE EXCEPTION '⛔ Reemplaza v_athlete_email con tu correo real antes de ejecutar.';
  END IF;

  IF v_athlete_email = v_prof_email THEN
    RAISE EXCEPTION '⛔ El correo del atleta debe ser distinto al del profesional (%).', v_prof_email;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_athlete_email) THEN
    RAISE EXCEPTION '⛔ Ya existe un usuario con el correo %. Usa otro.', v_athlete_email;
  END IF;

  -- ── 1. UUID del profesional ───────────────────────────────────────────────
  SELECT id INTO STRICT v_prof_id
    FROM auth.users
   WHERE email = v_prof_email;

  RAISE NOTICE 'Profesional encontrado: %', v_prof_id;

  -- ── 2. Crear entrada en auth.users ───────────────────────────────────────
  -- El trigger handle_new_user creará automáticamente la fila en public.profiles.
  -- email_confirmed_at = now() confirma la cuenta al instante (sin link por correo).
  v_athlete_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    aud,
    role
  ) VALUES (
    v_athlete_id,
    '00000000-0000-0000-0000-000000000000',
    v_athlete_email,
    crypt(v_athlete_password, gen_salt('bf')),
    now(),                                  -- confirmado al instante
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'full_name', v_athlete_name,
      'role',      'athlete',
      'sport',     v_athlete_sport
    ),
    false,
    'authenticated',
    'authenticated'
  );

  -- ── 3. Verificar / completar perfil ──────────────────────────────────────
  -- El trigger debería haber creado la fila; si no, la creamos manualmente.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_athlete_id) THEN
    INSERT INTO public.profiles (id, role, full_name, email, sport)
    VALUES (
      v_athlete_id,
      'athlete',
      v_athlete_name,
      v_athlete_email,
      v_athlete_sport::sport_type
    );
    RAISE NOTICE 'Perfil creado manualmente (trigger handle_new_user no disparó).';
  ELSE
    -- Asegurar que sport y full_name queden seteados (el trigger no siempre los pasa)
    UPDATE public.profiles
       SET sport     = v_athlete_sport::sport_type,
           full_name = v_athlete_name
     WHERE id = v_athlete_id;
    RAISE NOTICE 'Perfil creado por trigger y actualizado con sport/full_name.';
  END IF;

  -- ── 4. Vincular al primer equipo del profesional ──────────────────────────
  SELECT t.id, t.name
    INTO v_team_id, v_team_name
    FROM public.teams t
   WHERE t.professional_id = v_prof_id
   ORDER BY t.created_at
   LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE WARNING '⚠ No hay equipos para el profesional %. El atleta existe pero no está en ningún equipo. Vincúlalo desde la app.', v_prof_email;
  ELSE
    INSERT INTO public.team_members (team_id, athlete_id)
    VALUES (v_team_id, v_athlete_id)
    ON CONFLICT (team_id, athlete_id) DO NOTHING;

    RAISE NOTICE 'Atleta añadido al equipo "%" (%)', v_team_name, v_team_id;
  END IF;

  -- ── Resumen final ─────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '✅  PERFIL DE ATLETA CREADO';
  RAISE NOTICE '   Email:      %', v_athlete_email;
  RAISE NOTICE '   Contraseña: %', v_athlete_password;
  RAISE NOTICE '   UUID:       %', v_athlete_id;
  RAISE NOTICE '   Equipo:     %', COALESCE(v_team_name, 'SIN EQUIPO — vincúlalo manualmente');
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '→ Inicia sesión con estas credenciales en la app';
  RAISE NOTICE '  móvil (o en /register-athlete para crear vía web)';

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'No existe el profesional con email %. Verifica el correo.', v_prof_email;
  WHEN TOO_MANY_ROWS THEN
    RAISE EXCEPTION 'Duplicados en auth.users para %. Contacta soporte.', v_prof_email;
END;
$$;

-- ── Reporte de verificación (visible en el SQL Editor) ────────────────────────
-- Muestra los últimos 5 atletas creados (excluye el seed de pruebas cccc00...).
SELECT
  p.id                                   AS athlete_uuid,
  p.full_name                            AS nombre,
  p.email                                AS correo,
  p.sport                                AS deporte,
  p.created_at::date                     AS creado,
  t.name                                 AS equipo,
  COUNT(ts.id)                           AS sesiones_registradas
FROM      public.profiles      p
LEFT JOIN public.team_members  tm ON tm.athlete_id = p.id
LEFT JOIN public.teams         t  ON t.id = tm.team_id
LEFT JOIN public.training_sessions ts ON ts.athlete_id = p.id
WHERE  p.role = 'athlete'
  AND  p.id::text NOT LIKE 'aaaa%'       -- excluye atletas seed demo
GROUP BY p.id, p.full_name, p.email, p.sport, p.created_at, t.name
ORDER BY p.created_at DESC
LIMIT 5;
