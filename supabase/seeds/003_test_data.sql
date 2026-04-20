-- ============================================================
-- DATOS DE PRUEBA — Vitatekh
-- Crea 5 atletas con cargas variadas para revisar el dashboard.
-- Todos los atletas tienen contraseña: vitatekh123
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_prof_id   uuid;
  v_team_id   uuid := 'bbbb0001-0000-0000-0000-000000000001';

  -- IDs fijos para poder re-ejecutar con ON CONFLICT
  v_a1  uuid := 'aaaa0001-0000-0000-0000-000000000001'; -- Carlos Ruiz    → ACWR Óptimo ~1.1
  v_a2  uuid := 'aaaa0002-0000-0000-0000-000000000002'; -- María Gómez    → ACWR Muy Alto ~1.7
  v_a3  uuid := 'aaaa0003-0000-0000-0000-000000000003'; -- Juan Pérez     → ACWR Bajo ~0.6
  v_a4  uuid := 'aaaa0004-0000-0000-0000-000000000004'; -- Ana Torres     → ACWR Óptimo ~1.25
  v_a5  uuid := 'aaaa0005-0000-0000-0000-000000000005'; -- Pedro Díaz     → ACWR Alto ~1.42

  v_today date := CURRENT_DATE;

  -- Variables de sesión
  v_sid uuid;
BEGIN

  -- ── 0. Encontrar el profesional registrado ───────────────────────────────────
  SELECT id INTO v_prof_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'professional'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_prof_id IS NULL THEN
    RAISE EXCEPTION '❌ No hay usuario profesional. Regístrate primero en /register.';
  END IF;

  RAISE NOTICE '✅ Profesional encontrado: %', v_prof_id;

  -- ── 1. Crear usuarios en auth.users (atletas de prueba) ──────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES
    (v_a1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'carlos.ruiz@test.vitatekh.com', crypt('vitatekh123',gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"athlete","full_name":"Carlos Ruiz"}', now(), now(), false, false),

    (v_a2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'maria.gomez@test.vitatekh.com', crypt('vitatekh123',gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"athlete","full_name":"María Gómez"}', now(), now(), false, false),

    (v_a3,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'juan.perez@test.vitatekh.com', crypt('vitatekh123',gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"athlete","full_name":"Juan Pérez"}', now(), now(), false, false),

    (v_a4,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'ana.torres@test.vitatekh.com', crypt('vitatekh123',gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"athlete","full_name":"Ana Torres"}', now(), now(), false, false),

    (v_a5,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'pedro.diaz@test.vitatekh.com', crypt('vitatekh123',gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"role":"athlete","full_name":"Pedro Díaz"}', now(), now(), false, false)
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Perfiles ──────────────────────────────────────────────────────────────
  INSERT INTO public.profiles (id, role, full_name, email, sport, created_at, updated_at)
  VALUES
    (v_a1,'athlete','Carlos Ruiz',  'carlos.ruiz@test.vitatekh.com',  'football',   now(), now()),
    (v_a2,'athlete','María Gómez',  'maria.gomez@test.vitatekh.com',  'football',   now(), now()),
    (v_a3,'athlete','Juan Pérez',   'juan.perez@test.vitatekh.com',   'basketball', now(), now()),
    (v_a4,'athlete','Ana Torres',   'ana.torres@test.vitatekh.com',   'volleyball', now(), now()),
    (v_a5,'athlete','Pedro Díaz',   'pedro.diaz@test.vitatekh.com',   'football',   now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 3. Equipo ────────────────────────────────────────────────────────────────
  INSERT INTO public.teams (id, name, sport, professional_id, description, created_at, updated_at)
  VALUES (v_team_id, 'FC Bogotá Sub-23', 'football', v_prof_id,
          'Equipo de fútbol masculino sub-23', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Miembros del equipo ───────────────────────────────────────────────────
  INSERT INTO public.team_members (team_id, athlete_id, joined_at)
  VALUES
    (v_team_id, v_a1, now() - interval '30 days'),
    (v_team_id, v_a2, now() - interval '30 days'),
    (v_team_id, v_a3, now() - interval '30 days'),
    (v_team_id, v_a4, now() - interval '30 days'),
    (v_team_id, v_a5, now() - interval '30 days')
  ON CONFLICT DO NOTHING;

  -- ── 5. Sesiones de entrenamiento (35 días) ───────────────────────────────────
  -- Generamos sesiones para cada atleta los lunes-sábado
  -- con cargas que producirán diferentes ACWR al final

  -- CARLOS RUIZ → carga consistente (ACWR óptimo ~1.1)
  -- Semanas 1-4: ~380 UA/sem · Sem 5 (últimos 7d): ~418 UA
  -- CARLOS RUIZ → carga consistente (ACWR óptimo ~1.1)
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  SELECT
    gen_random_uuid(),
    v_a1, v_team_id,
    v_today - interval '1 day' * s.d,
    90 + (random()*20)::int,
    (ARRAY['technical','tactical','physical','match']::session_type[])[1 + (random()*3)::int],
    'competition'::session_phase,
    'Sesión estándar FC Bogotá',
    v_prof_id
  FROM (
    SELECT unnest(ARRAY[3,4,5,6,10,11,12,13,17,18,19,20,24,25,26,27,31,32,33,34]) AS d
  ) s
  ON CONFLICT DO NOTHING;

  -- MARÍA GÓMEZ → carga baja 3 semanas + PICO semana 5 (ACWR ~1.7)
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  SELECT
    gen_random_uuid(),
    v_a2, v_team_id,
    v_today - interval '1 day' * s.d,
    CASE WHEN s.d <= 7 THEN 110 + (random()*20)::int
         ELSE 70 + (random()*15)::int END,
    (ARRAY['technical','tactical','physical','match']::session_type[])[1 + (random()*3)::int],
    'competition'::session_phase, 'Sesión FC Bogotá', v_prof_id
  FROM (
    SELECT unnest(ARRAY[1,2,3,4,5,6,10,11,12,13,17,18,19,20,24,25,26,27,31,32]) AS d
  ) s
  ON CONFLICT DO NOTHING;

  -- JUAN PÉREZ → carga alta semanas 1-4 + TAPERING (ACWR bajo ~0.6)
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  SELECT
    gen_random_uuid(),
    v_a3, v_team_id,
    v_today - interval '1 day' * s.d,
    CASE WHEN s.d <= 7 THEN 50 + (random()*15)::int
         ELSE 100 + (random()*30)::int END,
    (ARRAY['technical','tactical','physical']::session_type[])[1 + (random()*2)::int],
    'competition'::session_phase, 'Sesión FC Bogotá', v_prof_id
  FROM (
    SELECT unnest(ARRAY[2,4,5,6,10,11,12,13,14,17,18,19,20,21,24,25,26,27,28,31]) AS d
  ) s
  ON CONFLICT DO NOTHING;

  -- ANA TORRES → carga progresiva (ACWR óptimo ~1.25)
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  SELECT
    gen_random_uuid(),
    v_a4, v_team_id,
    v_today - interval '1 day' * s.d,
    75 + ((35 - s.d) * 0.8)::int,
    (ARRAY['technical','tactical','physical','match']::session_type[])[1 + (random()*3)::int],
    'competition'::session_phase, 'Sesión FC Bogotá', v_prof_id
  FROM (
    SELECT unnest(ARRAY[3,5,6,10,11,13,17,18,19,24,25,26,27,31,32,33,1,2,4,7]) AS d
  ) s
  ON CONFLICT DO NOTHING;

  -- PEDRO DÍAZ → carga variable con sobreentrenamiento reciente (ACWR alto ~1.4)
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  SELECT
    gen_random_uuid(),
    v_a5, v_team_id,
    v_today - interval '1 day' * s.d,
    CASE WHEN s.d <= 10 THEN 95 + (random()*25)::int
         ELSE 80 + (random()*20)::int END,
    (ARRAY['technical','physical','match']::session_type[])[1 + (random()*2)::int],
    'competition'::session_phase, 'Sesión FC Bogotá', v_prof_id
  FROM (
    SELECT unnest(ARRAY[1,2,3,4,5,7,8,10,11,12,13,15,17,18,19,20,22,24,25,26,27,29,31,32]) AS d
  ) s
  ON CONFLICT DO NOTHING;

  -- ── 6. RPE por sesión ────────────────────────────────────────────────────────
  -- Asignamos RPE a cada sesión según el atleta:
  -- Carlos ~13, María semana5=16 resto=11, Juan semana5=9 resto=14, Ana ~13, Pedro ~14

  -- Carlos: RPE consistente 12-14
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  SELECT
    gen_random_uuid(), ts.id, v_a1,
    12 + (random()*2)::int,
    (12 + (random()*2)::int) * ts.duration_min
  FROM public.training_sessions ts
  WHERE ts.athlete_id = v_a1
  ON CONFLICT DO NOTHING;

  -- María: RPE alto última semana (16-18), bajo antes (10-12)
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  SELECT
    gen_random_uuid(), ts.id, v_a2,
    CASE WHEN ts.date >= v_today - 7 THEN 16 + (random()*2)::int
         ELSE 10 + (random()*2)::int END,
    CASE WHEN ts.date >= v_today - 7
         THEN (16 + (random()*2)::int) * ts.duration_min
         ELSE (10 + (random()*2)::int) * ts.duration_min END
  FROM public.training_sessions ts
  WHERE ts.athlete_id = v_a2
  ON CONFLICT DO NOTHING;

  -- Juan: RPE bajo última semana (8-10), alto antes (13-16)
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  SELECT
    gen_random_uuid(), ts.id, v_a3,
    CASE WHEN ts.date >= v_today - 7 THEN 8 + (random()*2)::int
         ELSE 13 + (random()*3)::int END,
    CASE WHEN ts.date >= v_today - 7
         THEN (8 + (random()*2)::int) * ts.duration_min
         ELSE (13 + (random()*3)::int) * ts.duration_min END
  FROM public.training_sessions ts
  WHERE ts.athlete_id = v_a3
  ON CONFLICT DO NOTHING;

  -- Ana: RPE progresivo 11-15
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  SELECT
    gen_random_uuid(), ts.id, v_a4,
    11 + (random()*4)::int,
    (11 + (random()*4)::int) * ts.duration_min
  FROM public.training_sessions ts
  WHERE ts.athlete_id = v_a4
  ON CONFLICT DO NOTHING;

  -- Pedro: RPE elevado reciente (14-16), moderado antes (12-14)
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  SELECT
    gen_random_uuid(), ts.id, v_a5,
    CASE WHEN ts.date >= v_today - 10 THEN 14 + (random()*2)::int
         ELSE 12 + (random()*2)::int END,
    CASE WHEN ts.date >= v_today - 10
         THEN (14 + (random()*2)::int) * ts.duration_min
         ELSE (12 + (random()*2)::int) * ts.duration_min END
  FROM public.training_sessions ts
  WHERE ts.athlete_id = v_a5
  ON CONFLICT DO NOTHING;

  -- ── 7. Wellness diario (últimos 14 días) ─────────────────────────────────────
  INSERT INTO public.daily_wellness (id, athlete_id, date, fatigue, sleep_hours, sleep_quality, mood)
  SELECT gen_random_uuid(), aid, v_today - interval '1 day' * d,
    fat, slh, slq, mo
  FROM (
    VALUES
      -- Carlos: bienestar estable
      (v_a1, 0, 4, 7.5, 4, 4), (v_a1, 1, 3, 8.0, 4, 4), (v_a1, 2, 5, 7.0, 3, 3),
      (v_a1, 3, 4, 7.5, 4, 4), (v_a1, 4, 3, 8.0, 5, 5), (v_a1, 5, 6, 6.5, 3, 3),
      (v_a1, 6, 4, 7.0, 4, 4), (v_a1, 7, 5, 7.5, 3, 4),

      -- María: muy fatigada (alta carga reciente)
      (v_a2, 0, 8, 5.5, 2, 2), (v_a2, 1, 9, 5.0, 2, 1), (v_a2, 2, 8, 6.0, 2, 2),
      (v_a2, 3, 7, 6.5, 3, 2), (v_a2, 4, 9, 5.0, 1, 1), (v_a2, 5, 8, 6.0, 2, 2),
      (v_a2, 6, 6, 7.0, 3, 3), (v_a2, 7, 5, 7.5, 3, 3),

      -- Juan: bien descansado (tapering)
      (v_a3, 0, 2, 9.0, 5, 5), (v_a3, 1, 2, 8.5, 5, 5), (v_a3, 2, 3, 8.0, 4, 5),
      (v_a3, 3, 2, 9.0, 5, 4), (v_a3, 4, 1, 8.5, 5, 5), (v_a3, 5, 3, 8.0, 4, 4),
      (v_a3, 6, 2, 9.5, 5, 5), (v_a3, 7, 2, 8.0, 4, 5),

      -- Ana: bienestar progresivo
      (v_a4, 0, 5, 7.0, 3, 4), (v_a4, 1, 4, 7.5, 4, 4), (v_a4, 2, 5, 7.0, 3, 3),
      (v_a4, 3, 6, 6.5, 3, 3), (v_a4, 4, 4, 7.5, 4, 4), (v_a4, 5, 5, 7.0, 4, 4),
      (v_a4, 6, 3, 8.0, 4, 5), (v_a4, 7, 4, 7.5, 3, 4),

      -- Pedro: moderadamente fatigado
      (v_a5, 0, 7, 6.0, 2, 3), (v_a5, 1, 6, 6.5, 3, 3), (v_a5, 2, 7, 6.0, 2, 2),
      (v_a5, 3, 6, 6.5, 3, 3), (v_a5, 4, 8, 5.5, 2, 2), (v_a5, 5, 7, 6.0, 3, 3),
      (v_a5, 6, 5, 7.0, 3, 4), (v_a5, 7, 6, 6.5, 3, 3)
  ) AS data(aid, d, fat, slh, slq, mo)
  ON CONFLICT DO NOTHING;

  -- ── 8. ACWR Snapshots (calculados) ───────────────────────────────────────────
  -- Insertamos historial de los últimos 30 días + valor de hoy
  -- con zonas que reflejen la narrativa de carga de cada atleta

  -- Carlos: zona óptima estable
  INSERT INTO public.acwr_snapshots (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
  SELECT gen_random_uuid(), v_a1,
    v_today - interval '1 day' * d,
    GREATEST(200, 400 + (random()*60 - 30)::int),
    GREATEST(300, 380 + (random()*20 - 10)::int),
    ROUND((1.0 + random()*0.15)::numeric, 2),
    'optimal'::acwr_risk_zone
  FROM generate_series(0, 29) AS d
  ON CONFLICT DO NOTHING;

  -- María: óptima → sube a muy alto en los últimos 7 días
  INSERT INTO public.acwr_snapshots (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
  SELECT gen_random_uuid(), v_a2,
    v_today - interval '1 day' * d,
    CASE WHEN d < 7 THEN GREATEST(400, 520 + (random()*60)::int)
         ELSE GREATEST(200, 280 + (random()*40)::int) END,
    GREATEST(280, 320 + (random()*20)::int),
    CASE WHEN d < 7 THEN ROUND((1.6 + random()*0.15)::numeric, 2)
         ELSE ROUND((0.85 + random()*0.3)::numeric, 2) END,
    CASE WHEN d < 7 THEN 'very_high'::acwr_risk_zone ELSE 'optimal'::acwr_risk_zone END
  FROM generate_series(0, 29) AS d
  ON CONFLICT DO NOTHING;

  -- Juan: alto → baja a zona baja por tapering
  INSERT INTO public.acwr_snapshots (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
  SELECT gen_random_uuid(), v_a3,
    v_today - interval '1 day' * d,
    CASE WHEN d < 7 THEN GREATEST(100, 280 + (random()*40)::int)
         ELSE GREATEST(300, 450 + (random()*50)::int) END,
    GREATEST(400, 480 + (random()*30)::int),
    CASE WHEN d < 7 THEN ROUND((0.55 + random()*0.1)::numeric, 2)
         ELSE ROUND((0.9 + random()*0.3)::numeric, 2) END,
    CASE WHEN d < 7 THEN 'low'::acwr_risk_zone ELSE 'optimal'::acwr_risk_zone END
  FROM generate_series(0, 29) AS d
  ON CONFLICT DO NOTHING;

  -- Ana: progresión hacia óptimo
  INSERT INTO public.acwr_snapshots (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
  SELECT gen_random_uuid(), v_a4,
    v_today - interval '1 day' * d,
    GREATEST(250, 400 + (random()*50 - 20)::int),
    GREATEST(300, 350 + (random()*30)::int),
    ROUND((1.1 + (30 - d) * 0.005 + random()*0.1)::numeric, 2),
    'optimal'::acwr_risk_zone
  FROM generate_series(0, 29) AS d
  ON CONFLICT DO NOTHING;

  -- Pedro: creciendo hacia zona alta
  INSERT INTO public.acwr_snapshots (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
  SELECT gen_random_uuid(), v_a5,
    v_today - interval '1 day' * d,
    CASE WHEN d < 10 THEN GREATEST(350, 430 + (random()*40)::int)
         ELSE GREATEST(280, 360 + (random()*40)::int) END,
    GREATEST(300, 330 + (random()*30)::int),
    CASE WHEN d < 10 THEN ROUND((1.35 + random()*0.1)::numeric, 2)
         ELSE ROUND((1.0 + random()*0.25)::numeric, 2) END,
    CASE WHEN d < 10 THEN 'high'::acwr_risk_zone ELSE 'optimal'::acwr_risk_zone END
  FROM generate_series(0, 29) AS d
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Datos de prueba creados correctamente.';
  RAISE NOTICE '   Equipo: FC Bogotá Sub-23';
  RAISE NOTICE '   Atletas: Carlos (óptimo), María (muy alto), Juan (bajo), Ana (óptimo), Pedro (alto)';
  RAISE NOTICE '   Contraseña de todos los atletas: vitatekh123';

END $$;
