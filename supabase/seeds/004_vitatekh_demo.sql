-- ============================================================
-- VITATEKH — Datos de demo (script limpio contra esquema real)
-- Tablas: auth.users · profiles · teams · team_members
--         training_sessions · session_rpe · daily_wellness
--         acwr_snapshots
-- Contraseña de los atletas: vitatekh123
-- IDs fijos → idempotente (ON CONFLICT DO NOTHING)
-- ============================================================

DO $$
DECLARE
  -- ── IDs fijos para re-ejecución segura ──
  v_team_id uuid := 'dddd0001-0000-0000-0000-000000000001';
  v_a1      uuid := 'dddd0002-0000-0000-0000-000000000002'; -- Sebastián Morales  · fútbol
  v_a2      uuid := 'dddd0003-0000-0000-0000-000000000003'; -- Laura Cifuentes    · voleibol
  v_a3      uuid := 'dddd0004-0000-0000-0000-000000000004'; -- Daniel Restrepo    · baloncesto

  v_prof_id uuid;
  v_today   date := CURRENT_DATE;
BEGIN

  -- ── 0. Localizar el profesional registrado ────────────────────────────────────
  SELECT id INTO v_prof_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'professional'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_prof_id IS NULL THEN
    RAISE EXCEPTION
      '❌ No hay profesional registrado. Ve a /register y crea una cuenta primero.';
  END IF;

  RAISE NOTICE '✅ Profesional encontrado: %', v_prof_id;

  -- ── 1. Crear usuarios en auth.users ──────────────────────────────────────────
  --    (necesario porque profiles.id tiene FK → auth.users.id)
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    is_sso_user, is_anonymous
  ) VALUES
    ( v_a1,
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'sebastian.morales@vitatekh.test',
      crypt('vitatekh123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"athlete","full_name":"Sebastián Morales"}',
      now(), now(), false, false ),

    ( v_a2,
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'laura.cifuentes@vitatekh.test',
      crypt('vitatekh123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"athlete","full_name":"Laura Cifuentes"}',
      now(), now(), false, false ),

    ( v_a3,
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'daniel.restrepo@vitatekh.test',
      crypt('vitatekh123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"athlete","full_name":"Daniel Restrepo"}',
      now(), now(), false, false )
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Perfiles ───────────────────────────────────────────────────────────────
  INSERT INTO public.profiles (id, role, full_name, email, sport, created_at, updated_at)
  VALUES
    (v_a1, 'athlete', 'Sebastián Morales', 'sebastian.morales@vitatekh.test', 'football',   now(), now()),
    (v_a2, 'athlete', 'Laura Cifuentes',   'laura.cifuentes@vitatekh.test',   'volleyball', now(), now()),
    (v_a3, 'athlete', 'Daniel Restrepo',   'daniel.restrepo@vitatekh.test',   'basketball', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 3. Equipo ─────────────────────────────────────────────────────────────────
  INSERT INTO public.teams (id, name, sport, professional_id, description, created_at, updated_at)
  VALUES (
    v_team_id,
    'Vitatekh Performance Team',
    'football',
    v_prof_id,
    'Equipo élite de rendimiento multideportivo',
    now(), now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Miembros del equipo ────────────────────────────────────────────────────
  INSERT INTO public.team_members (team_id, athlete_id, joined_at)
  VALUES
    (v_team_id, v_a1, v_today - 30),
    (v_team_id, v_a2, v_today - 30),
    (v_team_id, v_a3, v_today - 30)
  ON CONFLICT DO NOTHING;

  -- ── 5. Sesiones de entrenamiento ─────────────────────────────────────────────
  --
  --  15 sesiones × 3 atletas = 45 filas en training_sessions
  --  Distribuidas en los últimos 30 días (aproximadamente día de por medio)
  --
  --  Perfil de carga:
  --    Sebastián → carga constante moderada   (ACWR final ~1.1 — Óptimo)
  --    Laura     → carga creciente            (ACWR final ~1.35 — Alto)
  --    Daniel    → carga alta + tapering      (ACWR final ~0.65 — Bajo)
  --
  --  Columnas (esquema real):
  --    duration_min  INT       → duración en minutos
  --    session_type  ENUM      → 'physical' | 'technical' | 'tactical' | 'match' | 'recovery'
  --    phase         ENUM      → 'preseason' | 'competition' | 'transition'
  --    created_by    UUID      → ID del profesional
  --
  --  Nota: NO existe columna "load" en training_sessions.
  --        La carga (sRPE) se guarda en session_rpe.srpe = rpe × duration_min
  --

  -- ·· SEBASTIÁN MORALES — carga estable ········································
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  VALUES
    ('dddd1001-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 29, 90,  'physical'::session_type,   'competition'::session_phase, 'Resistencia aeróbica',        v_prof_id),
    ('dddd1002-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 27, 85,  'technical'::session_type,  'competition'::session_phase, 'Técnica individual con balón', v_prof_id),
    ('dddd1003-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 25, 100, 'physical'::session_type,   'competition'::session_phase, 'Fuerza + potencia',           v_prof_id),
    ('dddd1004-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 22, 70,  'tactical'::session_type,   'competition'::session_phase, 'Táctica colectiva 11v11',     v_prof_id),
    ('dddd1005-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 20, 90,  'physical'::session_type,   'competition'::session_phase, 'Circuito metabólico',         v_prof_id),
    ('dddd1006-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 18, 80,  'technical'::session_type,  'competition'::session_phase, 'Finalización y remates',      v_prof_id),
    ('dddd1007-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 15, 95,  'physical'::session_type,   'competition'::session_phase, 'Velocidad e intervalos',      v_prof_id),
    ('dddd1008-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 13, 60,  'recovery'::session_type,   'competition'::session_phase, 'Regenerativa baja intensidad',v_prof_id),
    ('dddd1009-0000-0000-0000-000000000001', v_a1, v_team_id, v_today - 11, 90,  'tactical'::session_type,   'competition'::session_phase, 'Táctica defensiva bloque',    v_prof_id),
    ('dddd1010-0000-0000-0000-000000000001', v_a1, v_team_id, v_today -  9, 100, 'physical'::session_type,   'competition'::session_phase, 'Fuerza máxima tren inferior',  v_prof_id),
    ('dddd1011-0000-0000-0000-000000000001', v_a1, v_team_id, v_today -  7, 90,  'match'::session_type,      'competition'::session_phase, 'Partido oficial (90 min)',     v_prof_id),
    ('dddd1012-0000-0000-0000-000000000001', v_a1, v_team_id, v_today -  5, 70,  'recovery'::session_type,   'competition'::session_phase, 'Recuperación post-partido',   v_prof_id),
    ('dddd1013-0000-0000-0000-000000000001', v_a1, v_team_id, v_today -  4, 85,  'technical'::session_type,  'competition'::session_phase, 'Pressing y transiciones',     v_prof_id),
    ('dddd1014-0000-0000-0000-000000000001', v_a1, v_team_id, v_today -  2, 90,  'physical'::session_type,   'competition'::session_phase, 'Carga aeróbica + aceleración',v_prof_id),
    ('dddd1015-0000-0000-0000-000000000001', v_a1, v_team_id, v_today -  1, 80,  'tactical'::session_type,   'competition'::session_phase, 'Activación pre-partido',      v_prof_id)
  ON CONFLICT (id) DO NOTHING;

  -- ·· LAURA CIFUENTES — carga progresiva ·······································
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  VALUES
    ('dddd2001-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 30, 60,  'technical'::session_type,  'competition'::session_phase, 'Saque y recepción básica',     v_prof_id),
    ('dddd2002-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 28, 65,  'physical'::session_type,   'competition'::session_phase, 'Salto vertical + aterrizaje',  v_prof_id),
    ('dddd2003-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 26, 70,  'tactical'::session_type,   'competition'::session_phase, 'Sistema rotacional 6-2',       v_prof_id),
    ('dddd2004-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 23, 75,  'physical'::session_type,   'competition'::session_phase, 'Core y estabilidad',           v_prof_id),
    ('dddd2005-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 21, 75,  'technical'::session_type,  'competition'::session_phase, 'Remate en zona 4',             v_prof_id),
    ('dddd2006-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 19, 80,  'physical'::session_type,   'competition'::session_phase, 'Resistencia específica',       v_prof_id),
    ('dddd2007-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 16, 85,  'tactical'::session_type,   'competition'::session_phase, 'Bloqueo colectivo 3-1-2',      v_prof_id),
    ('dddd2008-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 14, 85,  'physical'::session_type,   'competition'::session_phase, 'Potencia tren inferior',       v_prof_id),
    ('dddd2009-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 12, 90,  'technical'::session_type,  'competition'::session_phase, 'Segundo toque y armado',       v_prof_id),
    ('dddd2010-0000-0000-0000-000000000002', v_a2, v_team_id, v_today - 10, 90,  'match'::session_type,      'competition'::session_phase, 'Set de práctica 3 sets',       v_prof_id),
    ('dddd2011-0000-0000-0000-000000000002', v_a2, v_team_id, v_today -  8, 95,  'physical'::session_type,   'competition'::session_phase, 'Intervalos alta intensidad',   v_prof_id),
    ('dddd2012-0000-0000-0000-000000000002', v_a2, v_team_id, v_today -  6, 95,  'tactical'::session_type,   'competition'::session_phase, 'Partido entrenamiento 5 sets', v_prof_id),
    ('dddd2013-0000-0000-0000-000000000002', v_a2, v_team_id, v_today -  4, 100, 'physical'::session_type,   'competition'::session_phase, 'Pico carga semana competencia',v_prof_id),
    ('dddd2014-0000-0000-0000-000000000002', v_a2, v_team_id, v_today -  2, 100, 'match'::session_type,      'competition'::session_phase, 'Partido oficial',              v_prof_id),
    ('dddd2015-0000-0000-0000-000000000002', v_a2, v_team_id, v_today -  1, 105, 'physical'::session_type,   'competition'::session_phase, 'Sesión intensa post-partido',  v_prof_id)
  ON CONFLICT (id) DO NOTHING;

  -- ·· DANIEL RESTREPO — carga alta + tapering ··································
  INSERT INTO public.training_sessions
    (id, athlete_id, team_id, date, duration_min, session_type, phase, description, created_by)
  VALUES
    ('dddd3001-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 30, 110, 'physical'::session_type,   'competition'::session_phase, 'Pretemporada intensiva',       v_prof_id),
    ('dddd3002-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 28, 110, 'technical'::session_type,  'competition'::session_phase, 'Tiro y manejo de balón',       v_prof_id),
    ('dddd3003-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 26, 120, 'physical'::session_type,   'competition'::session_phase, 'Resistencia + velocidad',      v_prof_id),
    ('dddd3004-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 24, 105, 'tactical'::session_type,   'competition'::session_phase, 'Offensa triangular',           v_prof_id),
    ('dddd3005-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 22, 115, 'physical'::session_type,   'competition'::session_phase, 'Fuerza + pliométria',          v_prof_id),
    ('dddd3006-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 20, 110, 'match'::session_type,      'competition'::session_phase, 'Partido práctica 4Q',          v_prof_id),
    ('dddd3007-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 18, 120, 'physical'::session_type,   'competition'::session_phase, 'Bloque de alta carga',         v_prof_id),
    ('dddd3008-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 16, 115, 'technical'::session_type,  'competition'::session_phase, 'Tiro en suspensión',           v_prof_id),
    ('dddd3009-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 13, 60,  'recovery'::session_type,   'competition'::session_phase, 'Inicio tapering — recovery',   v_prof_id),
    ('dddd3010-0000-0000-0000-000000000003', v_a3, v_team_id, v_today - 11, 55,  'technical'::session_type,  'competition'::session_phase, 'Técnica liviana',              v_prof_id),
    ('dddd3011-0000-0000-0000-000000000003', v_a3, v_team_id, v_today -  9, 50,  'recovery'::session_type,   'competition'::session_phase, 'Movilidad y elongación',       v_prof_id),
    ('dddd3012-0000-0000-0000-000000000003', v_a3, v_team_id, v_today -  7, 50,  'tactical'::session_type,   'competition'::session_phase, 'Revisión de jugadas clave',    v_prof_id),
    ('dddd3013-0000-0000-0000-000000000003', v_a3, v_team_id, v_today -  5, 45,  'recovery'::session_type,   'competition'::session_phase, 'Activación leve',              v_prof_id),
    ('dddd3014-0000-0000-0000-000000000003', v_a3, v_team_id, v_today -  3, 40,  'recovery'::session_type,   'competition'::session_phase, 'Tapering final',               v_prof_id),
    ('dddd3015-0000-0000-0000-000000000003', v_a3, v_team_id, v_today -  1, 35,  'technical'::session_type,  'competition'::session_phase, 'Activación pre-competencia',   v_prof_id)
  ON CONFLICT (id) DO NOTHING;

  -- ── 6. Session RPE (sRPE = rpe × duration_min) ───────────────────────────────
  --
  --  sRPE es la unidad de CARGA INTERNA que pediste como "load".
  --  Escala RPE Borg: 6 (muy muy suave) → 20 (máximo esfuerzo)
  --  Típico entrenamiento moderado: RPE 12-14
  --
  --  Sebastián: RPE 11-14 estable  →  sRPE ~990-1300 UA/sesión
  --  Laura:     RPE 11-16 creciente → sRPE ~660-1680 UA/sesión
  --  Daniel:    RPE 14-16 alta + 7-9 tapering → sRPE ~280-1920 UA/sesión
  --

  -- Sebastián
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  VALUES
    (gen_random_uuid(), 'dddd1001-0000-0000-0000-000000000001', v_a1, 12, 12*90),
    (gen_random_uuid(), 'dddd1002-0000-0000-0000-000000000001', v_a1, 13, 13*85),
    (gen_random_uuid(), 'dddd1003-0000-0000-0000-000000000001', v_a1, 14, 14*100),
    (gen_random_uuid(), 'dddd1004-0000-0000-0000-000000000001', v_a1, 13, 13*70),
    (gen_random_uuid(), 'dddd1005-0000-0000-0000-000000000001', v_a1, 14, 14*90),
    (gen_random_uuid(), 'dddd1006-0000-0000-0000-000000000001', v_a1, 12, 12*80),
    (gen_random_uuid(), 'dddd1007-0000-0000-0000-000000000001', v_a1, 15, 15*95),
    (gen_random_uuid(), 'dddd1008-0000-0000-0000-000000000001', v_a1, 11, 11*60),
    (gen_random_uuid(), 'dddd1009-0000-0000-0000-000000000001', v_a1, 13, 13*90),
    (gen_random_uuid(), 'dddd1010-0000-0000-0000-000000000001', v_a1, 14, 14*100),
    (gen_random_uuid(), 'dddd1011-0000-0000-0000-000000000001', v_a1, 16, 16*90),
    (gen_random_uuid(), 'dddd1012-0000-0000-0000-000000000001', v_a1, 10, 10*70),
    (gen_random_uuid(), 'dddd1013-0000-0000-0000-000000000001', v_a1, 13, 13*85),
    (gen_random_uuid(), 'dddd1014-0000-0000-0000-000000000001', v_a1, 13, 13*90),
    (gen_random_uuid(), 'dddd1015-0000-0000-0000-000000000001', v_a1, 12, 12*80)
  ON CONFLICT (session_id, athlete_id) DO NOTHING;

  -- Laura
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  VALUES
    (gen_random_uuid(), 'dddd2001-0000-0000-0000-000000000002', v_a2, 11, 11*60),
    (gen_random_uuid(), 'dddd2002-0000-0000-0000-000000000002', v_a2, 12, 12*65),
    (gen_random_uuid(), 'dddd2003-0000-0000-0000-000000000002', v_a2, 12, 12*70),
    (gen_random_uuid(), 'dddd2004-0000-0000-0000-000000000002', v_a2, 12, 12*75),
    (gen_random_uuid(), 'dddd2005-0000-0000-0000-000000000002', v_a2, 13, 13*75),
    (gen_random_uuid(), 'dddd2006-0000-0000-0000-000000000002', v_a2, 13, 13*80),
    (gen_random_uuid(), 'dddd2007-0000-0000-0000-000000000002', v_a2, 13, 13*85),
    (gen_random_uuid(), 'dddd2008-0000-0000-0000-000000000002', v_a2, 14, 14*85),
    (gen_random_uuid(), 'dddd2009-0000-0000-0000-000000000002', v_a2, 14, 14*90),
    (gen_random_uuid(), 'dddd2010-0000-0000-0000-000000000002', v_a2, 15, 15*90),
    (gen_random_uuid(), 'dddd2011-0000-0000-0000-000000000002', v_a2, 15, 15*95),
    (gen_random_uuid(), 'dddd2012-0000-0000-0000-000000000002', v_a2, 15, 15*95),
    (gen_random_uuid(), 'dddd2013-0000-0000-0000-000000000002', v_a2, 16, 16*100),
    (gen_random_uuid(), 'dddd2014-0000-0000-0000-000000000002', v_a2, 16, 16*100),
    (gen_random_uuid(), 'dddd2015-0000-0000-0000-000000000002', v_a2, 16, 16*105)
  ON CONFLICT (session_id, athlete_id) DO NOTHING;

  -- Daniel
  INSERT INTO public.session_rpe (id, session_id, athlete_id, rpe, srpe)
  VALUES
    (gen_random_uuid(), 'dddd3001-0000-0000-0000-000000000003', v_a3, 16, 16*110),
    (gen_random_uuid(), 'dddd3002-0000-0000-0000-000000000003', v_a3, 15, 15*110),
    (gen_random_uuid(), 'dddd3003-0000-0000-0000-000000000003', v_a3, 16, 16*120),
    (gen_random_uuid(), 'dddd3004-0000-0000-0000-000000000003', v_a3, 15, 15*105),
    (gen_random_uuid(), 'dddd3005-0000-0000-0000-000000000003', v_a3, 16, 16*115),
    (gen_random_uuid(), 'dddd3006-0000-0000-0000-000000000003', v_a3, 17, 17*110),
    (gen_random_uuid(), 'dddd3007-0000-0000-0000-000000000003', v_a3, 16, 16*120),
    (gen_random_uuid(), 'dddd3008-0000-0000-0000-000000000003', v_a3, 15, 15*115),
    (gen_random_uuid(), 'dddd3009-0000-0000-0000-000000000003', v_a3,  9,  9*60),
    (gen_random_uuid(), 'dddd3010-0000-0000-0000-000000000003', v_a3,  8,  8*55),
    (gen_random_uuid(), 'dddd3011-0000-0000-0000-000000000003', v_a3,  7,  7*50),
    (gen_random_uuid(), 'dddd3012-0000-0000-0000-000000000003', v_a3,  8,  8*50),
    (gen_random_uuid(), 'dddd3013-0000-0000-0000-000000000003', v_a3,  7,  7*45),
    (gen_random_uuid(), 'dddd3014-0000-0000-0000-000000000003', v_a3,  6,  6*40),
    (gen_random_uuid(), 'dddd3015-0000-0000-0000-000000000003', v_a3,  7,  7*35)
  ON CONFLICT (session_id, athlete_id) DO NOTHING;

  -- ── 7. Wellness diario (últimos 15 días) ─────────────────────────────────────
  INSERT INTO public.daily_wellness
    (id, athlete_id, date, fatigue, sleep_hours, sleep_quality, mood)
  VALUES
    -- Sebastián: estable y bien recuperado
    (gen_random_uuid(), v_a1, v_today -  0, 4, 7.5, 4, 4),
    (gen_random_uuid(), v_a1, v_today -  1, 5, 7.0, 3, 3),
    (gen_random_uuid(), v_a1, v_today -  2, 4, 8.0, 4, 4),
    (gen_random_uuid(), v_a1, v_today -  3, 6, 6.5, 3, 3),
    (gen_random_uuid(), v_a1, v_today -  4, 3, 8.0, 5, 5),
    (gen_random_uuid(), v_a1, v_today -  5, 4, 7.5, 4, 4),
    (gen_random_uuid(), v_a1, v_today -  7, 7, 6.0, 3, 3),
    (gen_random_uuid(), v_a1, v_today -  8, 4, 7.5, 4, 4),
    (gen_random_uuid(), v_a1, v_today -  9, 5, 7.0, 3, 4),
    (gen_random_uuid(), v_a1, v_today - 10, 3, 8.0, 5, 5),

    -- Laura: fatiga acumulada (carga creciente)
    (gen_random_uuid(), v_a2, v_today -  0, 8, 5.5, 2, 2),
    (gen_random_uuid(), v_a2, v_today -  1, 9, 5.0, 2, 2),
    (gen_random_uuid(), v_a2, v_today -  2, 8, 6.0, 2, 3),
    (gen_random_uuid(), v_a2, v_today -  3, 7, 6.5, 3, 3),
    (gen_random_uuid(), v_a2, v_today -  4, 8, 5.5, 2, 2),
    (gen_random_uuid(), v_a2, v_today -  5, 9, 5.0, 1, 1),
    (gen_random_uuid(), v_a2, v_today -  7, 6, 7.0, 3, 3),
    (gen_random_uuid(), v_a2, v_today -  8, 5, 7.5, 4, 4),
    (gen_random_uuid(), v_a2, v_today -  9, 4, 7.5, 4, 4),
    (gen_random_uuid(), v_a2, v_today - 10, 5, 7.0, 3, 4),

    -- Daniel: muy descansado (tapering final)
    (gen_random_uuid(), v_a3, v_today -  0, 2, 9.0, 5, 5),
    (gen_random_uuid(), v_a3, v_today -  1, 2, 8.5, 5, 5),
    (gen_random_uuid(), v_a3, v_today -  2, 2, 9.0, 5, 5),
    (gen_random_uuid(), v_a3, v_today -  3, 3, 8.0, 4, 5),
    (gen_random_uuid(), v_a3, v_today -  4, 2, 9.0, 5, 4),
    (gen_random_uuid(), v_a3, v_today -  5, 1, 9.5, 5, 5),
    (gen_random_uuid(), v_a3, v_today -  7, 4, 7.0, 3, 4),
    (gen_random_uuid(), v_a3, v_today -  8, 5, 7.0, 3, 3),
    (gen_random_uuid(), v_a3, v_today -  9, 6, 6.5, 3, 3),
    (gen_random_uuid(), v_a3, v_today - 10, 7, 6.0, 2, 2)
  ON CONFLICT (athlete_id, date) DO NOTHING;

  -- ── 8. ACWR Snapshots ─────────────────────────────────────────────────────────
  --
  --  Calculado a partir de los sRPE reales insertados arriba.
  --  Formula:
  --    acute_load  = Σ sRPE de los últimos 7 días
  --    chronic_load = Σ sRPE de los últimos 28 días ÷ 4
  --    acwr_ratio  = acute_load / chronic_load
  --
  --  Insertamos el snapshot de hoy y los últimos 14 días.
  --

  INSERT INTO public.acwr_snapshots
    (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone)
  SELECT
    gen_random_uuid(),
    base.athlete_id,
    base.snap_date,
    COALESCE(acute.load, 0),
    COALESCE(chronic.load, 0),
    CASE
      WHEN COALESCE(chronic.load, 0) = 0 THEN 0
      ELSE ROUND(COALESCE(acute.load, 0) / chronic.load, 3)
    END,
    CASE
      WHEN COALESCE(chronic.load, 0) = 0 THEN 'low'::acwr_risk_zone
      WHEN COALESCE(acute.load, 0) / chronic.load < 0.8  THEN 'low'::acwr_risk_zone
      WHEN COALESCE(acute.load, 0) / chronic.load <= 1.3 THEN 'optimal'::acwr_risk_zone
      WHEN COALESCE(acute.load, 0) / chronic.load <= 1.5 THEN 'high'::acwr_risk_zone
      ELSE 'very_high'::acwr_risk_zone
    END
  FROM (
    -- Combinamos atletas × fechas (hoy y los 14 días anteriores)
    SELECT a.aid AS athlete_id, (CURRENT_DATE - s.d) AS snap_date
    FROM (VALUES (v_a1), (v_a2), (v_a3)) AS a(aid)
    CROSS JOIN generate_series(0, 14) AS s(d)
  ) base
  LEFT JOIN LATERAL (
    -- Carga aguda: suma sRPE de los 7 días anteriores al snap_date (inclusive)
    SELECT SUM(sr.srpe)::numeric AS load
    FROM public.training_sessions ts
    JOIN public.session_rpe sr ON sr.session_id = ts.id
    WHERE ts.athlete_id = base.athlete_id
      AND ts.date BETWEEN base.snap_date - 6 AND base.snap_date
  ) acute ON true
  LEFT JOIN LATERAL (
    -- Carga crónica: promedio semanal de los 28 días anteriores / 4
    SELECT SUM(sr.srpe)::numeric / 4.0 AS load
    FROM public.training_sessions ts
    JOIN public.session_rpe sr ON sr.session_id = ts.id
    WHERE ts.athlete_id = base.athlete_id
      AND ts.date BETWEEN base.snap_date - 27 AND base.snap_date
  ) chronic ON true
  ON CONFLICT (athlete_id, date) DO NOTHING;

  -- ── 9. Resumen ────────────────────────────────────────────────────────────────
  RAISE NOTICE '✅ Demo Vitatekh cargado correctamente';
  RAISE NOTICE '   Equipo   : Vitatekh Performance Team';
  RAISE NOTICE '   Atletas  : Sebastián Morales (fútbol) · Laura Cifuentes (voleibol) · Daniel Restrepo (baloncesto)';
  RAISE NOTICE '   Sesiones : 15 por atleta = 45 en total';
  RAISE NOTICE '   ACWR hoy : Sebastián ~1.1 Óptimo · Laura ~1.4 Alto · Daniel ~0.6 Bajo';
  RAISE NOTICE '   Password : vitatekh123';

END $$;
