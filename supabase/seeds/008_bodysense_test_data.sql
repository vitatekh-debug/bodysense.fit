-- ============================================================
-- Bodysense / Vitatekh — Seed 008: Entorno de prueba completo
-- ⚠️  SOLO DESARROLLO — NO ejecutar en producción
-- ============================================================
-- Requisito:  juancho.9609@gmail.com debe existir en auth.users
--             (registrado desde /register).
-- Ejecutar:   psql -U postgres  o  Supabase SQL Editor (service role).
-- ⚠️  No idempotente en training_sessions / planned_sessions.
--     Ejecutar una sola vez, o borrar datos previos con cleanup al final.
--
-- ─── GRUPOS DE CARGA (snapshot al 2026-05-05) ───────────────
--   Grupo A  · cccc0011 / 0021 / 0031  → ACWR ≈ 1.79  very_high
--   Grupo Bh · cccc0012 / 0022 / 0032  → ACWR ≈ 1.27  optimal
--   Grupo Bm · cccc0013 / 0023 / 0033  → ACWR ≈ 1.15  optimal
--   Grupo Bl · cccc0014 / 0024 / 0034  → ACWR ≈ 0.93  optimal
--   Grupo C  · cccc0015 / 0025 / 0035  → ACWR ≈ 0.65  low
--
-- ─── CÁLCULO ACWR ───────────────────────────────────────────
--   acute_load  = Σ sRPE días -7 a -1
--   chronic_load = Σ sRPE días -21 a -1 / 4
--   ACWR = acute_load / chronic_load
-- ============================================================

BEGIN;

-- ─── 0. Verificar profesional + tabla temporal ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'juancho.9609@gmail.com'
  ) THEN
    RAISE EXCEPTION
      '❌  juancho.9609@gmail.com no existe en auth.users. '
      'Regístrate en /register y vuelve a ejecutar este script.';
  END IF;
  RAISE NOTICE '✅  Profesional verificado. Iniciando seed 008…';
END $$;

CREATE TEMP TABLE IF NOT EXISTS _s008_prof AS
  SELECT id AS v_uid
  FROM auth.users
  WHERE email = 'juancho.9609@gmail.com'
  LIMIT 1;

-- ─── 1. Auth users — 15 atletas ficticios ────────────────────
-- Contraseña: vitatekh123
-- El trigger on_auth_user_created crea automáticamente la fila
-- en public.profiles con role y full_name del metadata.

INSERT INTO auth.users (
  id, aud, role,
  email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  -- ── Baloncesto ──────────────────────────────────────────────
  ('cccc0011-0000-0000-0000-000000000000','authenticated','authenticated',
   'carlos.mosquera@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Carlos Andrés Mosquera"}',
   false,'','','',''),

  ('cccc0012-0000-0000-0000-000000000000','authenticated','authenticated',
   'diego.salcedo@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Diego Fernando Salcedo"}',
   false,'','','',''),

  ('cccc0013-0000-0000-0000-000000000000','authenticated','authenticated',
   'andres.ospina@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Andrés Felipe Ospina"}',
   false,'','','',''),

  ('cccc0014-0000-0000-0000-000000000000','authenticated','authenticated',
   'juan.pardo@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Juan Sebastián Pardo"}',
   false,'','','',''),

  ('cccc0015-0000-0000-0000-000000000000','authenticated','authenticated',
   'miguel.rondon@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Miguel Ángel Rondón"}',
   false,'','','',''),

  -- ── Fútbol ──────────────────────────────────────────────────
  ('cccc0021-0000-0000-0000-000000000000','authenticated','authenticated',
   'sebastian.rios@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Sebastián Alejandro Ríos"}',
   false,'','','',''),

  ('cccc0022-0000-0000-0000-000000000000','authenticated','authenticated',
   'luis.herrera@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Luis Eduardo Herrera"}',
   false,'','','',''),

  ('cccc0023-0000-0000-0000-000000000000','authenticated','authenticated',
   'fabian.quintero@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Fabián Andrés Quintero"}',
   false,'','','',''),

  ('cccc0024-0000-0000-0000-000000000000','authenticated','authenticated',
   'david.vargas@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"David Camilo Vargas"}',
   false,'','','',''),

  ('cccc0025-0000-0000-0000-000000000000','authenticated','authenticated',
   'nicolas.estrada@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Nicolás Estrada Peña"}',
   false,'','','',''),

  -- ── Voleibol ────────────────────────────────────────────────
  ('cccc0031-0000-0000-0000-000000000000','authenticated','authenticated',
   'valentina.corredor@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Valentina Corredor Torres"}',
   false,'','','',''),

  ('cccc0032-0000-0000-0000-000000000000','authenticated','authenticated',
   'mariana.agudelo@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Mariana Isabel Agudelo"}',
   false,'','','',''),

  ('cccc0033-0000-0000-0000-000000000000','authenticated','authenticated',
   'daniela.suarez@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Daniela Fernanda Suárez"}',
   false,'','','',''),

  ('cccc0034-0000-0000-0000-000000000000','authenticated','authenticated',
   'camila.pacheco@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Camila Ximena Pacheco"}',
   false,'','','',''),

  ('cccc0035-0000-0000-0000-000000000000','authenticated','authenticated',
   'andrea.lozano@bodysense.test',crypt('vitatekh123',gen_salt('bf')),
   now(),now(),now(),
   '{"provider":"email","providers":["email"]}',
   '{"role":"athlete","full_name":"Andrea Milena Lozano"}',
   false,'','','','')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Perfiles: completar campo sport ──────────────────────
-- El trigger ya creó role+full_name. Aquí se completa sport y
-- se garantiza full_name correcto (ON CONFLICT DO UPDATE).

INSERT INTO public.profiles (id, role, full_name, email, sport, created_at, updated_at)
VALUES
  ('cccc0011-0000-0000-0000-000000000000','athlete','Carlos Andrés Mosquera',    'carlos.mosquera@bodysense.test',    'basketball',now(),now()),
  ('cccc0012-0000-0000-0000-000000000000','athlete','Diego Fernando Salcedo',    'diego.salcedo@bodysense.test',      'basketball',now(),now()),
  ('cccc0013-0000-0000-0000-000000000000','athlete','Andrés Felipe Ospina',      'andres.ospina@bodysense.test',      'basketball',now(),now()),
  ('cccc0014-0000-0000-0000-000000000000','athlete','Juan Sebastián Pardo',      'juan.pardo@bodysense.test',         'basketball',now(),now()),
  ('cccc0015-0000-0000-0000-000000000000','athlete','Miguel Ángel Rondón',       'miguel.rondon@bodysense.test',      'basketball',now(),now()),
  ('cccc0021-0000-0000-0000-000000000000','athlete','Sebastián Alejandro Ríos',  'sebastian.rios@bodysense.test',     'football',  now(),now()),
  ('cccc0022-0000-0000-0000-000000000000','athlete','Luis Eduardo Herrera',      'luis.herrera@bodysense.test',       'football',  now(),now()),
  ('cccc0023-0000-0000-0000-000000000000','athlete','Fabián Andrés Quintero',    'fabian.quintero@bodysense.test',    'football',  now(),now()),
  ('cccc0024-0000-0000-0000-000000000000','athlete','David Camilo Vargas',       'david.vargas@bodysense.test',       'football',  now(),now()),
  ('cccc0025-0000-0000-0000-000000000000','athlete','Nicolás Estrada Peña',      'nicolas.estrada@bodysense.test',    'football',  now(),now()),
  ('cccc0031-0000-0000-0000-000000000000','athlete','Valentina Corredor Torres', 'valentina.corredor@bodysense.test', 'volleyball',now(),now()),
  ('cccc0032-0000-0000-0000-000000000000','athlete','Mariana Isabel Agudelo',    'mariana.agudelo@bodysense.test',    'volleyball',now(),now()),
  ('cccc0033-0000-0000-0000-000000000000','athlete','Daniela Fernanda Suárez',   'daniela.suarez@bodysense.test',     'volleyball',now(),now()),
  ('cccc0034-0000-0000-0000-000000000000','athlete','Camila Ximena Pacheco',     'camila.pacheco@bodysense.test',     'volleyball',now(),now()),
  ('cccc0035-0000-0000-0000-000000000000','athlete','Andrea Milena Lozano',      'andrea.lozano@bodysense.test',      'volleyball',now(),now())
ON CONFLICT (id) DO UPDATE
  SET sport     = EXCLUDED.sport,
      full_name = EXCLUDED.full_name,
      updated_at = now();

-- ─── 3. Equipos ──────────────────────────────────────────────
INSERT INTO public.teams (id, name, sport, professional_id, description, created_at, updated_at)
SELECT
  unnest(ARRAY[
    'cccc0001-0000-0000-0000-000000000001'::uuid,
    'cccc0002-0000-0000-0000-000000000002'::uuid,
    'cccc0003-0000-0000-0000-000000000003'::uuid
  ]),
  unnest(ARRAY['Leones de Medellín','Halcones Bogotá FC','Volcán Voleibol Club']),
  unnest(ARRAY['basketball','football','volleyball']::sport_type[]),
  v_uid,
  unnest(ARRAY[
    'Equipo de baloncesto sub-23',
    'Equipo de fútbol categoría senior',
    'Club de voleibol femenino'
  ]),
  now(), now()
FROM _s008_prof
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Miembros de equipo ───────────────────────────────────
INSERT INTO public.team_members (team_id, athlete_id, joined_at) VALUES
  ('cccc0001-0000-0000-0000-000000000001','cccc0011-0000-0000-0000-000000000000',now()),
  ('cccc0001-0000-0000-0000-000000000001','cccc0012-0000-0000-0000-000000000000',now()),
  ('cccc0001-0000-0000-0000-000000000001','cccc0013-0000-0000-0000-000000000000',now()),
  ('cccc0001-0000-0000-0000-000000000001','cccc0014-0000-0000-0000-000000000000',now()),
  ('cccc0001-0000-0000-0000-000000000001','cccc0015-0000-0000-0000-000000000000',now()),
  ('cccc0002-0000-0000-0000-000000000002','cccc0021-0000-0000-0000-000000000000',now()),
  ('cccc0002-0000-0000-0000-000000000002','cccc0022-0000-0000-0000-000000000000',now()),
  ('cccc0002-0000-0000-0000-000000000002','cccc0023-0000-0000-0000-000000000000',now()),
  ('cccc0002-0000-0000-0000-000000000002','cccc0024-0000-0000-0000-000000000000',now()),
  ('cccc0002-0000-0000-0000-000000000002','cccc0025-0000-0000-0000-000000000000',now()),
  ('cccc0003-0000-0000-0000-000000000003','cccc0031-0000-0000-0000-000000000000',now()),
  ('cccc0003-0000-0000-0000-000000000003','cccc0032-0000-0000-0000-000000000000',now()),
  ('cccc0003-0000-0000-0000-000000000003','cccc0033-0000-0000-0000-000000000000',now()),
  ('cccc0003-0000-0000-0000-000000000003','cccc0034-0000-0000-0000-000000000000',now()),
  ('cccc0003-0000-0000-0000-000000000003','cccc0035-0000-0000-0000-000000000000',now())
ON CONFLICT (team_id, athlete_id) DO NOTHING;

-- ─── 5 + 6. Sesiones de entrenamiento + RPE ──────────────────
-- Genera training_sessions + session_rpe vía DO block.
-- Para cada grupo: itera atletas y fechas; captura el id
-- devuelto por RETURNING para enlazar session_rpe.
--
-- Verificación ACWR (cálculo manual):
--   acute_load  = Σ sRPE días -7..−1 (desde 2026-04-29)
--   chronic     = Σ sRPE días −21..−1 / 4
--   ACWR        = acute / chronic
--
--   Grupo A  : acute=6300  chronic=3525.00  → 1.787  very_high
--   Grupo Bh : acute=4550  chronic=3575.00  → 1.273  optimal
--   Grupo Bm : acute=4225  chronic=3681.25  → 1.148  optimal
--   Grupo Bl : acute=3380  chronic=3617.00  → 0.934  optimal
--   Grupo C  : acute=2079  chronic=3219.75  → 0.646  low

DO $$
DECLARE
  v_prof uuid;
  v_sess uuid;
  r      RECORD;
  s_date date;
BEGIN
  SELECT v_uid INTO v_prof FROM _s008_prof;

  -- ── Grupo A — ACWR ≈ 1.79  very_high ────────────────────
  -- bg (10): rpe=13 × 60 min → sRPE=780
  -- ac  (5): rpe=18 × 70 min → sRPE=1260
  FOR r IN
    SELECT * FROM (VALUES
      ('cccc0011-0000-0000-0000-000000000000'::uuid,
       'cccc0001-0000-0000-0000-000000000001'::uuid),
      ('cccc0021-0000-0000-0000-000000000000'::uuid,
       'cccc0002-0000-0000-0000-000000000002'::uuid),
      ('cccc0031-0000-0000-0000-000000000000'::uuid,
       'cccc0003-0000-0000-0000-000000000003'::uuid)
    ) AS t(athlete_id, team_id)
  LOOP
    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-15','2026-04-16','2026-04-18','2026-04-20','2026-04-22',
      '2026-04-24','2026-04-25','2026-04-26','2026-04-27','2026-04-28'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 60, 'physical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 13, 780);
    END LOOP;

    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-29','2026-05-01','2026-05-03','2026-05-04','2026-05-05'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 70, 'match', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 18, 1260);
    END LOOP;
  END LOOP;

  -- ── Grupo Bh — ACWR ≈ 1.27  optimal ────────────────────
  -- bg (10): rpe=15 × 65 min → sRPE=975
  -- ac  (5): rpe=14 × 65 min → sRPE=910
  FOR r IN
    SELECT * FROM (VALUES
      ('cccc0012-0000-0000-0000-000000000000'::uuid,
       'cccc0001-0000-0000-0000-000000000001'::uuid),
      ('cccc0022-0000-0000-0000-000000000000'::uuid,
       'cccc0002-0000-0000-0000-000000000002'::uuid),
      ('cccc0032-0000-0000-0000-000000000000'::uuid,
       'cccc0003-0000-0000-0000-000000000003'::uuid)
    ) AS t(athlete_id, team_id)
  LOOP
    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-15','2026-04-17','2026-04-19','2026-04-21','2026-04-23',
      '2026-04-24','2026-04-25','2026-04-26','2026-04-27','2026-04-28'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 65, 'technical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 15, 975);
    END LOOP;

    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-29','2026-04-30','2026-05-02','2026-05-04','2026-05-05'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 65, 'physical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 14, 910);
    END LOOP;
  END LOOP;

  -- ── Grupo Bm — ACWR ≈ 1.15  optimal ────────────────────
  -- bg (10): rpe=15 × 70 min → sRPE=1050
  -- ac  (5): rpe=13 × 65 min → sRPE=845
  FOR r IN
    SELECT * FROM (VALUES
      ('cccc0013-0000-0000-0000-000000000000'::uuid,
       'cccc0001-0000-0000-0000-000000000001'::uuid),
      ('cccc0023-0000-0000-0000-000000000000'::uuid,
       'cccc0002-0000-0000-0000-000000000002'::uuid),
      ('cccc0033-0000-0000-0000-000000000000'::uuid,
       'cccc0003-0000-0000-0000-000000000003'::uuid)
    ) AS t(athlete_id, team_id)
  LOOP
    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-15','2026-04-16','2026-04-18','2026-04-20','2026-04-22',
      '2026-04-24','2026-04-25','2026-04-26','2026-04-27','2026-04-28'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 70, 'tactical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 15, 1050);
    END LOOP;

    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-29','2026-05-01','2026-05-02','2026-05-04','2026-05-05'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 65, 'technical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 13, 845);
    END LOOP;
  END LOOP;

  -- ── Grupo Bl — ACWR ≈ 0.93  optimal ────────────────────
  -- bg (11): rpe=14 × 72 min → sRPE=1008
  -- ac  (4): rpe=13 × 65 min → sRPE=845
  FOR r IN
    SELECT * FROM (VALUES
      ('cccc0014-0000-0000-0000-000000000000'::uuid,
       'cccc0001-0000-0000-0000-000000000001'::uuid),
      ('cccc0024-0000-0000-0000-000000000000'::uuid,
       'cccc0002-0000-0000-0000-000000000002'::uuid),
      ('cccc0034-0000-0000-0000-000000000000'::uuid,
       'cccc0003-0000-0000-0000-000000000003'::uuid)
    ) AS t(athlete_id, team_id)
  LOOP
    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-15','2026-04-16','2026-04-18','2026-04-19','2026-04-21',
      '2026-04-22','2026-04-24','2026-04-25','2026-04-26','2026-04-27','2026-04-28'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 72, 'physical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 14, 1008);
    END LOOP;

    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-30','2026-05-02','2026-05-03','2026-05-05'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 65, 'tactical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 13, 845);
    END LOOP;
  END LOOP;

  -- ── Grupo C — ACWR ≈ 0.65  low ──────────────────────────
  -- bg (12): rpe=15 × 60 min → sRPE=900
  -- ac  (3): rpe=11 × 63 min → sRPE=693
  FOR r IN
    SELECT * FROM (VALUES
      ('cccc0015-0000-0000-0000-000000000000'::uuid,
       'cccc0001-0000-0000-0000-000000000001'::uuid),
      ('cccc0025-0000-0000-0000-000000000000'::uuid,
       'cccc0002-0000-0000-0000-000000000002'::uuid),
      ('cccc0035-0000-0000-0000-000000000000'::uuid,
       'cccc0003-0000-0000-0000-000000000003'::uuid)
    ) AS t(athlete_id, team_id)
  LOOP
    FOREACH s_date IN ARRAY ARRAY[
      '2026-04-15','2026-04-16','2026-04-17','2026-04-18','2026-04-20',
      '2026-04-21','2026-04-23','2026-04-24','2026-04-25','2026-04-26','2026-04-27','2026-04-28'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 60, 'physical', 'competition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 15, 900);
    END LOOP;

    FOREACH s_date IN ARRAY ARRAY[
      '2026-05-01','2026-05-03','2026-05-05'
    ]::date[] LOOP
      INSERT INTO public.training_sessions
        (athlete_id, team_id, date, duration_min, session_type, phase, created_by)
      VALUES (r.athlete_id, r.team_id, s_date, 63, 'recovery', 'transition', v_prof)
      RETURNING id INTO v_sess;
      INSERT INTO public.session_rpe (session_id, athlete_id, rpe, srpe)
      VALUES (v_sess, r.athlete_id, 11, 693);
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅  Sesiones de entrenamiento y RPE creados (225 + 225)';
END $$;

-- ─── 7. ACWR snapshots (snapshot al 2026-05-05) ──────────────
-- Columnas: athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone
-- Zona ACWR: <0.8 low · 0.8-1.3 optimal · 1.3-1.5 high · >1.5 very_high

INSERT INTO public.acwr_snapshots
  (athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
VALUES
  -- Grupo A — very_high (acute=6300, chronic=3525, acwr=1.787)
  ('cccc0011-0000-0000-0000-000000000000','2026-05-05',6300,3525,1.787,'very_high'),
  ('cccc0021-0000-0000-0000-000000000000','2026-05-05',6300,3525,1.787,'very_high'),
  ('cccc0031-0000-0000-0000-000000000000','2026-05-05',6300,3525,1.787,'very_high'),
  -- Grupo Bh — optimal (acute=4550, chronic=3575, acwr=1.273)
  ('cccc0012-0000-0000-0000-000000000000','2026-05-05',4550,3575,1.273,'optimal'),
  ('cccc0022-0000-0000-0000-000000000000','2026-05-05',4550,3575,1.273,'optimal'),
  ('cccc0032-0000-0000-0000-000000000000','2026-05-05',4550,3575,1.273,'optimal'),
  -- Grupo Bm — optimal (acute=4225, chronic=3681.25, acwr=1.148)
  ('cccc0013-0000-0000-0000-000000000000','2026-05-05',4225,3681.25,1.148,'optimal'),
  ('cccc0023-0000-0000-0000-000000000000','2026-05-05',4225,3681.25,1.148,'optimal'),
  ('cccc0033-0000-0000-0000-000000000000','2026-05-05',4225,3681.25,1.148,'optimal'),
  -- Grupo Bl — optimal (acute=3380, chronic=3617, acwr=0.934)
  ('cccc0014-0000-0000-0000-000000000000','2026-05-05',3380,3617,0.934,'optimal'),
  ('cccc0024-0000-0000-0000-000000000000','2026-05-05',3380,3617,0.934,'optimal'),
  ('cccc0034-0000-0000-0000-000000000000','2026-05-05',3380,3617,0.934,'optimal'),
  -- Grupo C — low (acute=2079, chronic=3219.75, acwr=0.646)
  ('cccc0015-0000-0000-0000-000000000000','2026-05-05',2079,3219.75,0.646,'low'),
  ('cccc0025-0000-0000-0000-000000000000','2026-05-05',2079,3219.75,0.646,'low'),
  ('cccc0035-0000-0000-0000-000000000000','2026-05-05',2079,3219.75,0.646,'low')
ON CONFLICT (athlete_id, date) DO UPDATE
  SET acute_load   = EXCLUDED.acute_load,
      chronic_load = EXCLUDED.chronic_load,
      acwr_ratio   = EXCLUDED.acwr_ratio,
      risk_zone    = EXCLUDED.risk_zone;

-- ─── 8. Bienestar diario — 15 días por atleta ────────────────
-- Rango: 2026-04-21 al 2026-05-05 (días -15 a -1)
-- Columnas: fatigue(1-10), sleep_hours, sleep_quality(1-5), mood(1-5)
-- Valores representan el estado típico de cada grupo de carga.

INSERT INTO public.daily_wellness
  (athlete_id, date, fatigue, sleep_hours, sleep_quality, mood)
VALUES
  -- ── Grupo A (cccc0011) — sobrecarga: cansancio alto, sueño pobre ──
  ('cccc0011-0000-0000-0000-000000000000','2026-04-21',8,6.5,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-22',8,6.5,2,3),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-23',7,7.0,3,3),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-24',8,6.5,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-25',9,6.0,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-26',8,6.5,2,3),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-27',9,6.5,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-28',9,6.0,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-29',8,6.5,3,3),
  ('cccc0011-0000-0000-0000-000000000000','2026-04-30',9,6.0,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-05-01',9,6.5,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-05-02',8,7.0,2,3),
  ('cccc0011-0000-0000-0000-000000000000','2026-05-03',9,6.0,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-05-04',9,6.5,2,2),
  ('cccc0011-0000-0000-0000-000000000000','2026-05-05',8,6.0,2,2),
  -- ── Grupo A (cccc0021) ──
  ('cccc0021-0000-0000-0000-000000000000','2026-04-21',8,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-22',9,6.0,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-23',7,7.0,3,3),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-24',8,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-25',9,6.0,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-26',8,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-27',9,6.0,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-28',9,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-29',8,6.0,2,3),
  ('cccc0021-0000-0000-0000-000000000000','2026-04-30',9,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-05-01',9,6.0,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-05-02',8,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-05-03',9,6.0,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-05-04',8,6.5,2,2),
  ('cccc0021-0000-0000-0000-000000000000','2026-05-05',9,6.0,2,2),
  -- ── Grupo A (cccc0031) ──
  ('cccc0031-0000-0000-0000-000000000000','2026-04-21',8,6.5,2,3),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-22',8,7.0,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-23',7,7.0,3,3),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-24',9,6.0,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-25',9,6.5,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-26',8,6.5,2,3),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-27',9,6.0,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-28',9,6.5,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-29',8,6.0,3,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-04-30',9,6.5,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-05-01',8,6.0,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-05-02',9,6.5,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-05-03',9,6.0,2,2),
  ('cccc0031-0000-0000-0000-000000000000','2026-05-04',8,6.5,2,3),
  ('cccc0031-0000-0000-0000-000000000000','2026-05-05',9,6.0,2,2),

  -- ── Grupo Bh (cccc0012) — carga alta óptima ──
  ('cccc0012-0000-0000-0000-000000000000','2026-04-21',5,7.0,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-22',6,7.5,4,4),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-23',5,7.0,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-24',6,7.5,3,4),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-25',6,7.0,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-26',7,7.5,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-27',6,7.0,4,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-28',6,7.5,3,4),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-29',5,7.0,4,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-04-30',6,7.0,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-05-01',5,7.5,3,4),
  ('cccc0012-0000-0000-0000-000000000000','2026-05-02',6,7.0,4,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-05-03',6,7.5,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-05-04',7,7.0,3,3),
  ('cccc0012-0000-0000-0000-000000000000','2026-05-05',6,7.5,4,4),
  -- ── Grupo Bh (cccc0022) ──
  ('cccc0022-0000-0000-0000-000000000000','2026-04-21',6,7.0,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-22',5,7.5,4,4),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-23',6,7.0,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-24',5,7.5,4,4),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-25',6,7.0,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-26',7,7.5,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-27',6,7.0,3,4),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-28',6,7.5,4,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-29',5,7.0,3,4),
  ('cccc0022-0000-0000-0000-000000000000','2026-04-30',6,7.5,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-05-01',5,7.0,4,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-05-02',6,7.5,3,4),
  ('cccc0022-0000-0000-0000-000000000000','2026-05-03',6,7.0,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-05-04',7,7.5,3,3),
  ('cccc0022-0000-0000-0000-000000000000','2026-05-05',5,7.0,4,4),
  -- ── Grupo Bh (cccc0032) ──
  ('cccc0032-0000-0000-0000-000000000000','2026-04-21',5,7.5,4,4),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-22',6,7.0,3,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-23',5,7.5,3,4),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-24',6,7.0,4,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-25',6,7.5,3,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-26',7,7.0,3,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-27',5,7.5,4,4),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-28',6,7.0,3,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-29',6,7.5,3,4),
  ('cccc0032-0000-0000-0000-000000000000','2026-04-30',5,7.0,4,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-05-01',6,7.5,3,4),
  ('cccc0032-0000-0000-0000-000000000000','2026-05-02',5,7.0,4,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-05-03',6,7.5,3,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-05-04',7,7.0,3,3),
  ('cccc0032-0000-0000-0000-000000000000','2026-05-05',6,7.5,4,4),

  -- ── Grupo Bm (cccc0013) — carga media óptima ──
  ('cccc0013-0000-0000-0000-000000000000','2026-04-21',4,7.5,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-22',5,8.0,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-23',4,7.5,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-24',5,8.0,3,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-25',5,7.5,4,3),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-26',6,7.5,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-27',5,8.0,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-28',5,7.5,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-29',4,8.0,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-04-30',5,7.5,3,3),
  ('cccc0013-0000-0000-0000-000000000000','2026-05-01',4,8.0,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-05-02',5,7.5,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-05-03',4,8.0,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-05-04',5,7.5,4,4),
  ('cccc0013-0000-0000-0000-000000000000','2026-05-05',5,8.0,3,4),
  -- ── Grupo Bm (cccc0023) ──
  ('cccc0023-0000-0000-0000-000000000000','2026-04-21',5,7.5,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-22',4,8.0,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-23',5,7.5,4,3),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-24',4,8.0,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-25',5,7.5,3,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-26',6,8.0,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-27',5,7.5,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-28',4,8.0,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-29',5,7.5,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-04-30',4,7.5,3,3),
  ('cccc0023-0000-0000-0000-000000000000','2026-05-01',5,8.0,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-05-02',4,7.5,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-05-03',5,8.0,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-05-04',4,7.5,4,4),
  ('cccc0023-0000-0000-0000-000000000000','2026-05-05',5,8.0,3,4),
  -- ── Grupo Bm (cccc0033) ──
  ('cccc0033-0000-0000-0000-000000000000','2026-04-21',4,8.0,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-22',5,7.5,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-23',4,8.0,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-24',5,7.5,3,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-25',5,8.0,4,3),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-26',5,7.5,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-27',4,8.0,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-28',5,7.5,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-29',4,8.0,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-04-30',5,8.0,3,3),
  ('cccc0033-0000-0000-0000-000000000000','2026-05-01',4,7.5,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-05-02',5,8.0,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-05-03',4,7.5,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-05-04',5,8.0,4,4),
  ('cccc0033-0000-0000-0000-000000000000','2026-05-05',4,7.5,3,4),

  -- ── Grupo Bl (cccc0014) — carga baja óptima ──
  ('cccc0014-0000-0000-0000-000000000000','2026-04-21',3,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-22',4,8.5,5,5),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-23',3,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-24',4,8.5,4,5),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-25',4,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-26',5,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-27',4,8.5,5,5),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-28',4,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-29',3,8.5,5,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-04-30',4,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-05-01',3,8.5,5,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-05-02',4,8.0,4,5),
  ('cccc0014-0000-0000-0000-000000000000','2026-05-03',3,8.5,5,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-05-04',4,8.0,4,4),
  ('cccc0014-0000-0000-0000-000000000000','2026-05-05',4,8.5,4,5),
  -- ── Grupo Bl (cccc0024) ──
  ('cccc0024-0000-0000-0000-000000000000','2026-04-21',4,8.0,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-22',3,8.5,5,5),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-23',4,8.0,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-24',3,8.5,5,5),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-25',4,8.0,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-26',5,8.5,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-27',4,8.0,5,5),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-28',3,8.5,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-29',4,8.0,5,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-04-30',3,8.5,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-05-01',4,8.0,5,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-05-02',3,8.5,4,5),
  ('cccc0024-0000-0000-0000-000000000000','2026-05-03',4,8.0,5,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-05-04',3,8.5,4,4),
  ('cccc0024-0000-0000-0000-000000000000','2026-05-05',4,8.0,4,5),
  -- ── Grupo Bl (cccc0034) ──
  ('cccc0034-0000-0000-0000-000000000000','2026-04-21',3,8.5,5,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-22',4,8.0,4,5),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-23',3,8.5,5,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-24',4,8.0,4,5),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-25',4,8.5,4,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-26',5,8.0,4,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-27',3,8.5,5,5),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-28',4,8.0,4,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-29',3,8.5,5,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-04-30',4,8.0,4,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-05-01',3,8.5,5,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-05-02',4,8.0,4,5),
  ('cccc0034-0000-0000-0000-000000000000','2026-05-03',3,8.5,5,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-05-04',4,8.0,4,4),
  ('cccc0034-0000-0000-0000-000000000000','2026-05-05',4,8.5,4,5),

  -- ── Grupo C (cccc0015) — descarga/tapering ──
  ('cccc0015-0000-0000-0000-000000000000','2026-04-21',2,8.5,4,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-22',3,9.0,5,4),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-23',2,8.5,4,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-24',3,9.0,4,4),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-25',3,8.5,4,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-26',4,8.5,5,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-27',3,9.0,4,4),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-28',3,8.5,5,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-29',2,9.0,5,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-04-30',3,8.5,4,4),
  ('cccc0015-0000-0000-0000-000000000000','2026-05-01',2,9.0,5,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-05-02',3,8.5,4,4),
  ('cccc0015-0000-0000-0000-000000000000','2026-05-03',2,9.0,5,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-05-04',3,8.5,4,3),
  ('cccc0015-0000-0000-0000-000000000000','2026-05-05',3,9.0,4,4),
  -- ── Grupo C (cccc0025) ──
  ('cccc0025-0000-0000-0000-000000000000','2026-04-21',3,8.5,4,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-22',2,9.0,5,4),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-23',3,8.5,4,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-24',2,9.0,5,4),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-25',3,8.5,4,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-26',4,9.0,5,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-27',3,8.5,4,4),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-28',2,9.0,5,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-29',3,8.5,5,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-04-30',2,9.0,4,4),
  ('cccc0025-0000-0000-0000-000000000000','2026-05-01',3,8.5,5,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-05-02',2,9.0,4,4),
  ('cccc0025-0000-0000-0000-000000000000','2026-05-03',3,8.5,5,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-05-04',2,9.0,4,3),
  ('cccc0025-0000-0000-0000-000000000000','2026-05-05',3,8.5,4,4),
  -- ── Grupo C (cccc0035) ──
  ('cccc0035-0000-0000-0000-000000000000','2026-04-21',2,9.0,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-22',3,8.5,4,4),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-23',2,9.0,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-24',3,8.5,4,4),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-25',3,9.0,4,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-26',4,8.5,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-27',3,9.0,4,4),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-28',2,8.5,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-29',3,9.0,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-04-30',2,8.5,4,4),
  ('cccc0035-0000-0000-0000-000000000000','2026-05-01',3,9.0,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-05-02',2,8.5,4,4),
  ('cccc0035-0000-0000-0000-000000000000','2026-05-03',3,9.0,5,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-05-04',2,8.5,4,3),
  ('cccc0035-0000-0000-0000-000000000000','2026-05-05',3,9.0,4,4)
ON CONFLICT (athlete_id, date) DO NOTHING;

-- ─── 9. Sesiones planificadas — próxima semana ───────────────
-- Rango: 2026-05-07 al 2026-05-13 (3 sesiones por atleta)
-- NOTA: El trigger planned_sessions_set_created_by sobreescribe
-- created_by = auth.uid(), que es NULL en el contexto de postgres.
-- Se deshabilita temporalmente para que la inserción de seed funcione.

ALTER TABLE public.planned_sessions
  DISABLE TRIGGER planned_sessions_set_created_by;

INSERT INTO public.planned_sessions
  (athlete_id, team_id, date, duration_min, session_type, phase,
   description, rpe_target, created_by)
SELECT
  v.athlete_id::uuid, v.team_id::uuid, v.pdate::date,
  v.dur, v.stype, v.phase, v.descr, v.rpe,
  (SELECT v_uid FROM _s008_prof)
FROM (VALUES
  -- ── Grupo A — recuperación activa (sobrecarga) ───────────
  ('cccc0011-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-07',30,'recovery','competition','Recuperación activa — descarga programada',7),
  ('cccc0011-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-09',40,'prevention','competition','Prevención lesiones — trabajo de movilidad',8),
  ('cccc0011-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-12',35,'recovery','competition','Vuelta a la calma — RPE controlado',8),

  ('cccc0021-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-07',30,'recovery','competition','Recuperación activa — descarga programada',7),
  ('cccc0021-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-09',40,'prevention','competition','Prevención lesiones — trabajo de movilidad',8),
  ('cccc0021-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-12',35,'recovery','competition','Vuelta a la calma — RPE controlado',8),

  ('cccc0031-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-07',30,'recovery','competition','Recuperación activa — descarga programada',7),
  ('cccc0031-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-09',40,'prevention','competition','Prevención lesiones — trabajo de movilidad',8),
  ('cccc0031-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-12',35,'recovery','competition','Vuelta a la calma — RPE controlado',8),

  -- ── Grupo Bh — carga alta óptima ────────────────────────
  ('cccc0012-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-07',65,'technical','competition','Trabajo técnico específico',13),
  ('cccc0012-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-10',65,'physical','competition','Preparación física — zona alta',14),
  ('cccc0012-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-13',70,'match','competition','Partido de competición',15),

  ('cccc0022-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-07',65,'technical','competition','Trabajo técnico específico',13),
  ('cccc0022-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-10',65,'physical','competition','Preparación física — zona alta',14),
  ('cccc0022-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-13',70,'match','competition','Partido de competición',15),

  ('cccc0032-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-07',65,'technical','competition','Trabajo técnico específico',13),
  ('cccc0032-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-10',65,'physical','competition','Preparación física — zona alta',14),
  ('cccc0032-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-13',70,'match','competition','Partido de competición',15),

  -- ── Grupo Bm — carga media óptima ───────────────────────
  ('cccc0013-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-07',65,'technical','competition','Entrenamiento técnico-táctico',13),
  ('cccc0013-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-10',65,'tactical','competition','Trabajo táctico — foco en sistemas',13),
  ('cccc0013-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-12',60,'physical','competition','Físico moderado — mantenimiento',12),

  ('cccc0023-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-07',65,'technical','competition','Entrenamiento técnico-táctico',13),
  ('cccc0023-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-10',65,'tactical','competition','Trabajo táctico — foco en sistemas',13),
  ('cccc0023-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-12',60,'physical','competition','Físico moderado — mantenimiento',12),

  ('cccc0033-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-07',65,'technical','competition','Entrenamiento técnico-táctico',13),
  ('cccc0033-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-10',65,'tactical','competition','Trabajo táctico — foco en sistemas',13),
  ('cccc0033-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-12',60,'physical','competition','Físico moderado — mantenimiento',12),

  -- ── Grupo Bl — carga en progresión ──────────────────────
  ('cccc0014-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-07',70,'physical','competition','Carga física progresiva',14),
  ('cccc0014-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-10',65,'technical','competition','Técnica de alto rendimiento',14),
  ('cccc0014-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-12',70,'physical','competition','Sesión de carga alta planificada',15),

  ('cccc0024-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-07',70,'physical','competition','Carga física progresiva',14),
  ('cccc0024-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-10',65,'technical','competition','Técnica de alto rendimiento',14),
  ('cccc0024-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-12',70,'physical','competition','Sesión de carga alta planificada',15),

  ('cccc0034-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-07',70,'physical','competition','Carga física progresiva',14),
  ('cccc0034-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-10',65,'technical','competition','Técnica de alto rendimiento',14),
  ('cccc0034-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-12',70,'physical','competition','Sesión de carga alta planificada',15),

  -- ── Grupo C — reintroducción suave ──────────────────────
  ('cccc0015-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-07',40,'recovery','transition','Recuperación activa post-descarga',9),
  ('cccc0015-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-10',45,'technical','transition','Retorno técnico suave',10),
  ('cccc0015-0000-0000-0000-000000000000','cccc0001-0000-0000-0000-000000000001',
   '2026-05-12',50,'physical','transition','Reintroducción de carga controlada',11),

  ('cccc0025-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-07',40,'recovery','transition','Recuperación activa post-descarga',9),
  ('cccc0025-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-10',45,'technical','transition','Retorno técnico suave',10),
  ('cccc0025-0000-0000-0000-000000000000','cccc0002-0000-0000-0000-000000000002',
   '2026-05-12',50,'physical','transition','Reintroducción de carga controlada',11),

  ('cccc0035-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-07',40,'recovery','transition','Recuperación activa post-descarga',9),
  ('cccc0035-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-10',45,'technical','transition','Retorno técnico suave',10),
  ('cccc0035-0000-0000-0000-000000000000','cccc0003-0000-0000-0000-000000000003',
   '2026-05-12',50,'physical','transition','Reintroducción de carga controlada',11)

) AS v(athlete_id, team_id, pdate, dur, stype, phase, descr, rpe);

ALTER TABLE public.planned_sessions
  ENABLE TRIGGER planned_sessions_set_created_by;

-- ─── 10. Resumen ─────────────────────────────────────────────
DO $$
DECLARE
  team_ids uuid[] := ARRAY[
    'cccc0001-0000-0000-0000-000000000001'::uuid,
    'cccc0002-0000-0000-0000-000000000002'::uuid,
    'cccc0003-0000-0000-0000-000000000003'::uuid
  ];
BEGIN
  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE '📊  SEED 008 — RESUMEN';
  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE '  auth.users atletas    : %',
    (SELECT COUNT(*) FROM auth.users
     WHERE email LIKE '%@bodysense.test');
  RAISE NOTICE '  Perfiles atletas      : %',
    (SELECT COUNT(*) FROM public.profiles
     WHERE role = 'athlete'::user_role
       AND email LIKE '%@bodysense.test');
  RAISE NOTICE '  Equipos seed          : %',
    (SELECT COUNT(*) FROM public.teams WHERE id = ANY(team_ids));
  RAISE NOTICE '  Miembros de equipo    : %',
    (SELECT COUNT(*) FROM public.team_members WHERE team_id = ANY(team_ids));
  RAISE NOTICE '  Sesiones entrenamiento: %',
    (SELECT COUNT(*) FROM public.training_sessions
     WHERE athlete_id::text LIKE 'cccc00%');
  RAISE NOTICE '  Session RPE           : %',
    (SELECT COUNT(*) FROM public.session_rpe
     WHERE athlete_id::text LIKE 'cccc00%');
  RAISE NOTICE '  ACWR snapshots        : %',
    (SELECT COUNT(*) FROM public.acwr_snapshots
     WHERE athlete_id::text LIKE 'cccc00%');
  RAISE NOTICE '  Wellness diario       : %',
    (SELECT COUNT(*) FROM public.daily_wellness
     WHERE athlete_id::text LIKE 'cccc00%');
  RAISE NOTICE '  Sesiones planificadas : %',
    (SELECT COUNT(*) FROM public.planned_sessions
     WHERE athlete_id::text LIKE 'cccc00%');
  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE '✅  Recarga localhost:3001/dashboard';
END $$;

COMMIT;

-- ============================================================
-- LIMPIEZA (descomenta si necesitas volver a ejecutar el seed)
-- ============================================================
/*
DELETE FROM public.planned_sessions  WHERE athlete_id::text LIKE 'cccc00%';
DELETE FROM public.acwr_snapshots    WHERE athlete_id::text LIKE 'cccc00%';
DELETE FROM public.daily_wellness    WHERE athlete_id::text LIKE 'cccc00%';
DELETE FROM public.session_rpe       WHERE athlete_id::text LIKE 'cccc00%';
DELETE FROM public.training_sessions WHERE athlete_id::text LIKE 'cccc00%';
DELETE FROM public.team_members      WHERE athlete_id::text LIKE 'cccc00%';
DELETE FROM public.teams             WHERE id IN (
  'cccc0001-0000-0000-0000-000000000001'::uuid,
  'cccc0002-0000-0000-0000-000000000002'::uuid,
  'cccc0003-0000-0000-0000-000000000003'::uuid);
DELETE FROM public.profiles          WHERE id::text LIKE 'cccc00%';
DELETE FROM auth.users               WHERE email LIKE '%@bodysense.test';
*/
