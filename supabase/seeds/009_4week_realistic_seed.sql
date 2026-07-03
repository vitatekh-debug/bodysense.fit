-- ============================================================
-- Bodysense — Seed 009: 4 semanas de datos realistas
-- Cubre: training_sessions · session_rpe · acwr_snapshots
--        hq_evaluations · poms_assessments · daily_wellness
--        pain_records · biomechanical_evaluations
--
-- Requisito: los 15 atletas ya deben existir en profiles.
--            El profesional (juancho.9609@gmail.com) debe existir.
--
-- Patrón de carga (56 días = 28 bg + 28 display):
--   BG  (-4 a -1): estable ~2500 UA/semana  → carga crónica base
--   W1  (display): descarga 3 sesiones       → ACWR ≈ 0.75–0.90
--   W2  (display): construcción 4 sesiones   → ACWR ≈ 0.95–1.10
--   W3  (display): pico 5 sesiones           → ACWR ≈ 1.35–1.55
--   W4  (display): taper 4 sesiones          → ACWR ≈ 0.80–1.00
--
-- Ejecutar en Supabase SQL Editor (service_role / postgres)
-- ⚠  NO idempotente en training_sessions — limpia primero
-- ============================================================

BEGIN;

-- ─── 0. Contexto y validación ────────────────────────────────

CREATE TEMP TABLE IF NOT EXISTS _s009_ctx AS
  SELECT p.id   AS coach_id,
         t.id   AS team_id
  FROM   profiles p
  CROSS  JOIN LATERAL (SELECT id FROM teams LIMIT 1) t
  WHERE  p.role = 'professional'
  LIMIT  1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _s009_ctx) THEN
    RAISE EXCEPTION '❌  No hay perfil profesional. Regístrate en /register primero.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'athlete') THEN
    RAISE EXCEPTION '❌  No hay atletas en profiles. Ejecuta seed 008 primero.';
  END IF;
  RAISE NOTICE '✅  Contexto OK — iniciando seed 009…';
END $$;

-- ─── 1. Limpieza del período ──────────────────────────────────

DO $$
DECLARE v_aids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO v_aids FROM profiles WHERE role = 'athlete';

  DELETE FROM training_sessions
  WHERE  athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 55;

  DELETE FROM acwr_snapshots
  WHERE  athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;

  DELETE FROM hq_evaluations     WHERE athlete_id = ANY(v_aids);
  DELETE FROM biomechanical_evaluations WHERE athlete_id = ANY(v_aids);

  DELETE FROM poms_assessments
  WHERE  athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;

  DELETE FROM daily_wellness
  WHERE  athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;

  DELETE FROM pain_records
  WHERE  athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;

  RAISE NOTICE '🗑️  Período limpiado (56 días training + 28 días wellness/POMS/dolor)';
END $$;

-- ─── 2. Sesiones de entrenamiento + sRPE ─────────────────────
--
--  Estrategia de inserción:
--    · v_start = CURRENT_DATE - 55  (inicio del período de 56 días)
--    · Arreglos de offsets/duraciones/RPE (Borg 6–20) indexados por sesión
--    · load_factor por atleta (0.70 – 1.30) escala la duración
--    · rpe_delta por grupo de atleta (−1 / 0 / +1) diferencia la intensidad
--    · RETURNING id captura el UUID de sesión para insertarlo en session_rpe

DO $$
DECLARE
  v_coach  UUID;
  v_team   UUID;
  v_aids   UUID[];
  v_n      INT;
  v_aid    UUID;
  v_sid    UUID;
  v_date   DATE;
  v_dur    INT;
  v_rpe    SMALLINT;
  v_delta  SMALLINT;
  lf       NUMERIC;
  i        INT;
  j        INT;

  -- ── Inicio del período completo (bg + fg) ─────────────────
  v_start  DATE := CURRENT_DATE - 55;

  -- ── Background: 4 semanas × 4 sesiones → 16 sesiones ─────
  -- Offsets (días desde v_start): Mon, Tue, Thu, Fri × 4 semanas
  bg_days INT[]      := ARRAY[0,1,3,4,  7,8,10,11,  14,15,17,18,  21,22,24,25];
  bg_dur  INT[]      := ARRAY[60,65,60,55, 65,70,60,65, 60,65,60,55, 65,70,60,55];
  bg_rpe  SMALLINT[] := ARRAY[10,10,10,12, 10,12,10,12, 10,10,12,10, 12,10,10,12]::SMALLINT[];

  -- ── Foreground: W1 deload, W2 build, W3 peak, W4 taper ───
  -- Offsets desde v_start (días 28–55 = los últimos 28 días)
  fg_days  INT[]      := ARRAY[29,31,33,   35,36,38,39,   42,43,44,45,46,   49,50,52,54];
  fg_dur   INT[]      := ARRAY[55,60,55,   65,70,65,75,   70,75,65,80,85,   60,65,60,55];
  fg_rpe   SMALLINT[] := ARRAY[10,10,12,   12,12,12,12,   12,14,12,14,14,   12,12,10,10]::SMALLINT[];
  fg_type  TEXT[]     := ARRAY[
    'physical','technical','physical',
    'physical','tactical','technical','physical',
    'physical','physical','tactical','physical','physical',
    'technical','physical','physical','recovery'
  ];
  fg_phase TEXT[]     := ARRAY[
    'preseason','preseason','preseason',
    'preseason','preseason','preseason','preseason',
    'competition','competition','competition','competition','competition',
    'competition','competition','competition','competition'
  ];

BEGIN
  SELECT coach_id, team_id INTO v_coach, v_team FROM _s009_ctx;
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_aids FROM profiles WHERE role = 'athlete';
  v_n := COALESCE(ARRAY_LENGTH(v_aids, 1), 0);

  RAISE NOTICE '⚽  Generando sesiones para % atletas…', v_n;

  FOR i IN 1..v_n LOOP
    v_aid := v_aids[i];

    -- Escala la duración (0.70 a 1.30)
    lf := 0.70 + ((i - 1)::NUMERIC / GREATEST(v_n - 1, 1)) * 0.60;

    -- Variación de RPE por grupo (−1 / 0 / +1 Borg) para diversificar ACWR
    v_delta := CASE (i % 3)
      WHEN 1 THEN  1::SMALLINT   -- atletas 1,4,7,10,13 → carga alta
      WHEN 2 THEN  0::SMALLINT   -- atletas 2,5,8,11,14 → carga media
      ELSE        -1::SMALLINT   -- atletas 3,6,9,12,15 → carga baja
    END;

    -- ── Background sessions ─────────────────────────────────
    FOR j IN 1..ARRAY_LENGTH(bg_days, 1) LOOP
      v_date := v_start + bg_days[j];
      v_dur  := GREATEST(30, ROUND(bg_dur[j] * lf)::INT);
      v_rpe  := GREATEST(6, LEAST(20, bg_rpe[j] + v_delta))::SMALLINT;

      INSERT INTO training_sessions
        (id, athlete_id, team_id, date, duration_min, session_type, phase, created_by, created_at)
      VALUES
        (uuid_generate_v4(), v_aid, v_team, v_date, v_dur,
         'physical'::session_type, 'preseason'::session_phase, v_coach, NOW())
      RETURNING id INTO v_sid;

      INSERT INTO session_rpe (id, session_id, athlete_id, rpe, srpe, created_at)
      VALUES (uuid_generate_v4(), v_sid, v_aid, v_rpe, v_dur * v_rpe, NOW());
    END LOOP;

    -- ── Foreground sessions ─────────────────────────────────
    FOR j IN 1..ARRAY_LENGTH(fg_days, 1) LOOP
      v_date := v_start + fg_days[j];
      v_dur  := GREATEST(30, ROUND(fg_dur[j] * lf)::INT);
      v_rpe  := GREATEST(6, LEAST(20, fg_rpe[j] + v_delta))::SMALLINT;

      INSERT INTO training_sessions
        (id, athlete_id, team_id, date, duration_min, session_type, phase, created_by, created_at)
      VALUES
        (uuid_generate_v4(), v_aid, v_team, v_date, v_dur,
         fg_type[j]::session_type, fg_phase[j]::session_phase, v_coach, NOW())
      RETURNING id INTO v_sid;

      INSERT INTO session_rpe (id, session_id, athlete_id, rpe, srpe, created_at)
      VALUES (uuid_generate_v4(), v_sid, v_aid, v_rpe, v_dur * v_rpe, NOW());
    END LOOP;

  END LOOP;

  RAISE NOTICE '✅  Sesiones + sRPE insertados (% atletas × 32 sesiones = % sesiones)',
    v_n, v_n * 32;
END $$;

-- ─── 3. ACWR Snapshots (ventana deslizante 7/28 días) ────────
--
--  La ventana de 28 días background garantiza que chronic_load
--  esté bien establecido y que ACWR sea realista:
--    • W1 display: ACWR ≈ 0.75–0.90  (low/optimal)
--    • W2 display: ACWR ≈ 0.95–1.15  (optimal)
--    • W3 display: ACWR ≈ 1.35–1.55  (high / very_high)
--    • W4 display: ACWR ≈ 0.80–1.00  (optimal)

INSERT INTO acwr_snapshots
  (id, athlete_id, date, acute_load, chronic_load, acwr_ratio, risk_zone, created_at)
WITH daily_srpe AS (
  -- Suma de sRPE por atleta × día en toda la ventana de 56 días
  SELECT
    s.athlete_id,
    s.date,
    SUM(r.srpe)::NUMERIC AS srpe
  FROM   training_sessions s
  JOIN   session_rpe r ON r.session_id = s.id
  WHERE  s.athlete_id IN (SELECT id FROM profiles WHERE role = 'athlete')
    AND  s.date >= CURRENT_DATE - 55
  GROUP  BY s.athlete_id, s.date
),
all_days AS (
  -- Serie completa (56 días) con 0 en días de descanso
  SELECT
    p.id    AS athlete_id,
    d::DATE AS date,
    COALESCE(ds.srpe, 0) AS srpe
  FROM   profiles p
  CROSS  JOIN generate_series(CURRENT_DATE - 55, CURRENT_DATE, '1 day'::INTERVAL) d
  LEFT   JOIN daily_srpe ds
         ON ds.athlete_id = p.id AND ds.date = d::DATE
  WHERE  p.role = 'athlete'
),
rolling AS (
  SELECT
    athlete_id,
    date,
    ROUND(SUM(srpe) OVER w7,  2)     AS acute_load,
    ROUND(SUM(srpe) OVER w28 / 4.0, 2) AS chronic_load
  FROM   all_days
  WINDOW
    w7  AS (PARTITION BY athlete_id ORDER BY date ROWS BETWEEN 6  PRECEDING AND CURRENT ROW),
    w28 AS (PARTITION BY athlete_id ORDER BY date ROWS BETWEEN 27 PRECEDING AND CURRENT ROW)
)
SELECT
  uuid_generate_v4(),
  athlete_id,
  date,
  acute_load,
  chronic_load,
  ROUND(
    CASE WHEN chronic_load = 0 THEN 0
         ELSE acute_load / chronic_load
    END, 3
  )                                 AS acwr_ratio,
  CASE
    WHEN chronic_load = 0                        THEN 'low'
    WHEN acute_load / chronic_load  < 0.8        THEN 'low'
    WHEN acute_load / chronic_load <= 1.3        THEN 'optimal'
    WHEN acute_load / chronic_load <= 1.5        THEN 'high'
    ELSE                                              'very_high'
  END::acwr_risk_zone               AS risk_zone,
  NOW()
FROM   rolling
-- Solo el período de display (últimos 28 días)
WHERE  date BETWEEN CURRENT_DATE - 27 AND CURRENT_DATE
ON CONFLICT (athlete_id, date) DO UPDATE
  SET acute_load   = EXCLUDED.acute_load,
      chronic_load = EXCLUDED.chronic_load,
      acwr_ratio   = EXCLUDED.acwr_ratio,
      risk_zone    = EXCLUDED.risk_zone;

DO $$ BEGIN
  RAISE NOTICE '📈  ACWR snapshots calculados (ventana 7/28 días, % días × % atletas)',
    28, (SELECT COUNT(*) FROM profiles WHERE role = 'athlete');
END $$;

-- ─── 4. H/Q Evaluations ──────────────────────────────────────
--
--  15 atletas en 2 grupos:
--    · Atletas 1–10:  ratio convencional SALUDABLE (> 0.65)
--    · Atletas 11–15: ratio convencional RIESGO    (< 0.58)
--                     → risk_flag = TRUE (calculado automáticamente)
--  Campos GENERATED que NO se insertan: hq_ratio, risk_flag

DO $$
DECLARE
  v_coach  UUID;
  v_aids   UUID[];
  v_n      INT;
  i        INT;
  v_quad   NUMERIC(5,3);
  v_ham    NUMERIC(5,3);
  v_side   eval_side;
  v_speed  SMALLINT;
  v_date   DATE;
BEGIN
  SELECT coach_id INTO v_coach FROM _s009_ctx;
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_aids FROM profiles WHERE role = 'athlete';
  v_n := COALESCE(ARRAY_LENGTH(v_aids, 1), 0);

  FOR i IN 1..v_n LOOP
    -- Fecha escalonada en las últimas 4 semanas (siempre en el pasado)
    -- Con v_n atletas, el más reciente queda 2 días atrás: CURRENT_DATE - 2
    v_date  := CURRENT_DATE - (v_n + 1 - i) * 2;
    v_side  := CASE (i % 3) WHEN 0 THEN 'bilateral' WHEN 1 THEN 'left' ELSE 'right' END::eval_side;
    v_speed := CASE (i % 2) WHEN 0 THEN 60::SMALLINT ELSE 180::SMALLINT END;

    IF i <= (v_n - 5) THEN
      -- ── Saludables: ratio 0.65–0.82 ───────────────────────
      v_quad := (0.750 + (i % 4) * 0.040)::NUMERIC(5,3);  -- 0.750 / 0.790 / 0.830 / 0.870
      v_ham  := (v_quad * (0.68 + (i % 3) * 0.04))::NUMERIC(5,3); -- ratio 0.68–0.76
    ELSE
      -- ── Riesgo: ratio 0.52–0.57 ───────────────────────────
      v_quad := (0.880 + ((i - (v_n - 4)) % 3) * 0.040)::NUMERIC(5,3); -- 0.880–0.960
      v_ham  := (v_quad * (0.54 + (i % 2) * 0.030))::NUMERIC(5,3);     -- ratio 0.54–0.57
    END IF;

    INSERT INTO hq_evaluations (
      id, athlete_id, evaluated_by, date, side,
      speed_deg_per_sec, ratio_type,
      quadriceps_peak_nm_kg, hamstring_peak_nm_kg,
      created_at
    ) VALUES (
      uuid_generate_v4(), v_aids[i], v_coach, v_date, v_side,
      v_speed, 'conventional',
      v_quad, v_ham,
      NOW()
    );
  END LOOP;

  RAISE NOTICE '💪  H/Q evaluaciones: % saludables + 5 en riesgo', v_n - 5;
END $$;

-- ─── 5. POMS Assessments (28 días, ~5 días/semana) ───────────
--
--  Patrón por semana:
--    W1 (descarga): vigor alto, fatiga baja   → TMD bajo (bueno)
--    W2 (build):    vigor medio, fatiga media → TMD normal
--    W3 (pico):     vigor bajo, fatiga alta   → TMD elevado (alerta)
--    W4 (taper):    vigor recupera            → TMD vuelve a normal
--
--  TMD = tension+depression+anger+fatigue_poms+confusion−vigor (GENERATED)

INSERT INTO poms_assessments
  (id, athlete_id, date, tension, depression, anger, vigor, fatigue_poms, confusion, created_at)
SELECT
  uuid_generate_v4(),
  p.id,
  d::DATE,

  -- tension  (0–4): sube en W3
  LEAST(4, GREATEST(0,
    1
    + CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7  THEN 1 ELSE 0 END
    + CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7
           AND ABS(HASHTEXT(p.id::TEXT)) % 3 = 0 THEN 1 ELSE 0 END
  ))::SMALLINT,

  -- depression (0–4): constante-baja con variación por atleta
  (ABS(HASHTEXT(p.id::TEXT)) % 2)::SMALLINT,

  -- anger (0–4): varía por día de semana
  (EXTRACT(DOW FROM d)::INT % 2)::SMALLINT,

  -- vigor (0–4): baja en W3, sube en W4
  LEAST(4, GREATEST(0,
    3
    - CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7  THEN 1 ELSE 0 END
    - CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7
           AND ABS(HASHTEXT(p.id::TEXT)) % 3 = 0 THEN 1 ELSE 0 END
    + CASE WHEN d::DATE > CURRENT_DATE - 7 THEN 1 ELSE 0 END
  ))::SMALLINT,

  -- fatigue_poms (0–4): alta en W3
  LEAST(4, GREATEST(0,
    1
    + CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7  THEN 2 ELSE 0 END
    + CASE WHEN d::DATE < CURRENT_DATE - 20                             THEN 0 ELSE 0 END
  ))::SMALLINT,

  -- confusion (0–4): señal temprana de sobreentrenamiento en W3
  LEAST(4, GREATEST(0,
    1
    + CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7  THEN 1 ELSE 0 END
    + CASE WHEN ABS(HASHTEXT(p.id::TEXT || d::TEXT)) % 4 = 0            THEN 1 ELSE 0 END
  ))::SMALLINT,

  NOW()

FROM   profiles p
CROSS  JOIN generate_series(CURRENT_DATE - 27, CURRENT_DATE, '1 day'::INTERVAL) d
WHERE  p.role = 'athlete'
  -- Solo días de lunes a sábado (excluye domingos)
  AND  EXTRACT(DOW FROM d) <> 0
ON CONFLICT (athlete_id, date) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '🧠  POMS assessments generados (28 días × atletas, excl. domingos)';
END $$;

-- ─── 6. Daily Wellness ────────────────────────────────────────
--
--  fatigue (1–10): sube en W3 (pico de carga)
--  sleep_hours (4.5–8.5): deteriora levemente en W3
--  sleep_quality (1–5): 3–5 normal, baja a 2–3 en W3
--  mood (1–5): 3–5 normal, baja a 2–3 en W3

INSERT INTO daily_wellness
  (id, athlete_id, date, fatigue, sleep_hours, sleep_quality, mood, created_at)
SELECT
  uuid_generate_v4(),
  p.id,
  d::DATE,

  -- fatigue (1–10)
  LEAST(10, GREATEST(1,
    4
    + CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7 THEN 3 ELSE 0 END
    + CASE WHEN d::DATE BETWEEN CURRENT_DATE -  6 AND CURRENT_DATE     THEN 1 ELSE 0 END
    + (ABS(HASHTEXT(p.id::TEXT || d::TEXT)) % 3 - 1)  -- −1/0/+1 noise
  ))::SMALLINT,

  -- sleep_hours (4.5–8.5)
  ROUND(CAST(
    7.5
    - CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7 THEN 0.8 ELSE 0 END
    + (ABS(HASHTEXT(p.id::TEXT || d::TEXT || 'z')) % 5 - 2) * 0.3  -- −0.6 a +0.6
  AS NUMERIC), 1),

  -- sleep_quality (1–5)
  LEAST(5, GREATEST(1,
    4
    - CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7 THEN 1 ELSE 0 END
    + (ABS(HASHTEXT(p.id::TEXT)) % 3 - 1)
  ))::SMALLINT,

  -- mood (1–5)
  LEAST(5, GREATEST(1,
    4
    - CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7 THEN 1 ELSE 0 END
    - CASE WHEN d::DATE BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7
           AND ABS(HASHTEXT(p.id::TEXT)) % 3 = 0 THEN 1 ELSE 0 END
    + CASE WHEN d::DATE > CURRENT_DATE - 7 THEN 1 ELSE 0 END
  ))::SMALLINT,

  NOW()

FROM   profiles p
CROSS  JOIN generate_series(CURRENT_DATE - 27, CURRENT_DATE, '1 day'::INTERVAL) d
WHERE  p.role = 'athlete'
  AND  EXTRACT(DOW FROM d) <> 0  -- excluye domingos
ON CONFLICT (athlete_id, date) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '😴  Daily wellness generado (28 días × atletas)';
END $$;

-- ─── 7. Pain Records — 3 atletas con dolor EVA 4-6 ───────────
--
--  Los primeros 3 atletas (orden created_at) tienen:
--    · Atleta 1: dolor rodilla izquierda  (knee_left),  EVA 5-6
--    · Atleta 2: dolor tobillo derecho   (ankle_right), EVA 4-5
--    · Atleta 3: dolor rodilla derecha   (knee_right),  EVA 4-6
--  EVA 4-6 → traffic_light = 'yellow' (calculado automáticamente)

DO $$
DECLARE
  v_aids   UUID[];
  v_dates  DATE[];
  body_regions pain_region[] := ARRAY['knee_left','ankle_right','knee_right']::pain_region[];
  eva_bases    SMALLINT[]    := ARRAY[5,4,4]::SMALLINT[];
  i            INT;
  j            INT;
  v_eva        SMALLINT;
BEGIN
  SELECT ARRAY_AGG(id)
  INTO   v_aids
  FROM   (SELECT id FROM profiles WHERE role = 'athlete' ORDER BY created_at LIMIT 3) _top3;

  IF ARRAY_LENGTH(v_aids, 1) IS NULL THEN
    RAISE NOTICE '⚠️  No hay atletas para pain records';
    RETURN;
  END IF;

  FOR i IN 1..LEAST(3, ARRAY_LENGTH(v_aids, 1)) LOOP
    -- Inserta registros de dolor en los últimos 10 días post-sesión
    FOR j IN 0..5 LOOP
      -- Saltar algunos días para que parezca natural
      CONTINUE WHEN (i + j) % 3 = 0;

      v_eva := LEAST(6, GREATEST(4, eva_bases[i] + (j % 2)::SMALLINT))::SMALLINT;

      INSERT INTO pain_records (
        id, athlete_id, date, timing, body_region,
        pain_type, eva_score, limits_performance, created_at
      ) VALUES (
        uuid_generate_v4(),
        v_aids[i],
        CURRENT_DATE - j,
        'post_session',
        body_regions[i],
        CASE WHEN j < 3 THEN 'exercise_induced' ELSE 'chronic' END,
        v_eva,
        v_eva >= 6,  -- limita rendimiento si EVA ≥ 6
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE '🚦  Pain records: 3 atletas con dolor EVA 4-6 (knee/ankle)';
END $$;

-- ─── 8. Biomechanical Evaluations (FMS) ──────────────────────
--
--  FMS Scores (0–3 por patrón, suma = fms_total GENERATED):
--    • fms_total ≤ 14 → fms_injury_risk = TRUE
--    • fms_total > 14 → fms_injury_risk = FALSE
--
--  Distribución:
--    · Atletas con índice % 5 = 0: total ≈ 12 (riesgo alto)
--    · Atletas con índice % 5 = 1: total ≈ 13–14 (riesgo límite)
--    · Atletas con índice % 5 = 2: total ≈ 15–16 (dentro de norma)
--    · Atletas con índice % 5 = 3: total ≈ 16–17 (bueno)
--    · Atletas con índice % 5 = 4: total ≈ 18 (excelente)

DO $$
DECLARE
  v_coach  UUID;
  v_aids   UUID[];
  v_n      INT;
  v_aid    UUID;
  i        INT;
  grp      INT;
  -- Patrones FMS por grupo [deep_squat, hurdle, lunge, shoulder, aslr, trunk, rotary]
  -- Suma por grupo: 12, 14, 15, 16, 18
  fms_patterns SMALLINT[][] := ARRAY[
    [1,2,2,1,2,2,2],   -- total 12 — riesgo
    [2,2,2,2,2,2,2],   -- total 14 — riesgo límite
    [2,2,2,2,3,2,2],   -- total 15 — OK
    [3,2,2,2,2,3,2],   -- total 16 — bueno
    [3,3,2,3,3,2,2]    -- total 18 — excelente
  ]::SMALLINT[][];
BEGIN
  SELECT coach_id INTO v_coach FROM _s009_ctx;
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_aids FROM profiles WHERE role = 'athlete';
  v_n := COALESCE(ARRAY_LENGTH(v_aids, 1), 0);

  FOR i IN 1..v_n LOOP
    v_aid := v_aids[i];
    grp   := ((i - 1) % 5) + 1;  -- 1..5

    INSERT INTO biomechanical_evaluations (
      id, athlete_id, evaluated_by, date,
      surface_type, surface_condition, footwear_type,
      fms_deep_squat, fms_hurdle_step, fms_inline_lunge,
      fms_shoulder_mobility, fms_aslr,
      fms_trunk_stability, fms_rotary_stability,
      created_at
    ) VALUES (
      uuid_generate_v4(), v_aid, v_coach,
      CURRENT_DATE - 14 + (i % 5),  -- escalonado en las últimas 2 semanas
      'parquet', 'indoor', 'basketball',
      fms_patterns[grp][1], fms_patterns[grp][2], fms_patterns[grp][3],
      fms_patterns[grp][4], fms_patterns[grp][5],
      fms_patterns[grp][6], fms_patterns[grp][7],
      NOW()
    );
  END LOOP;

  RAISE NOTICE '🏃  FMS evaluaciones: % atletas — totales distribuidos 12/14/15/16/18', v_n;
END $$;

-- ─── 9. Resumen final ─────────────────────────────────────────

DO $$
DECLARE
  v_sessions   INT;
  v_rpe        INT;
  v_acwr       INT;
  v_hq_risk    INT;
  v_poms       INT;
  v_wellness   INT;
  v_pain       INT;
  v_fms        INT;
  v_aids       UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO v_aids FROM profiles WHERE role = 'athlete';

  SELECT COUNT(*) INTO v_sessions  FROM training_sessions  WHERE athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 55;
  SELECT COUNT(*) INTO v_rpe       FROM session_rpe        WHERE athlete_id = ANY(v_aids);
  SELECT COUNT(*) INTO v_acwr      FROM acwr_snapshots     WHERE athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;
  SELECT COUNT(*) INTO v_hq_risk   FROM hq_evaluations     WHERE athlete_id = ANY(v_aids) AND risk_flag = TRUE;
  SELECT COUNT(*) INTO v_poms      FROM poms_assessments   WHERE athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;
  SELECT COUNT(*) INTO v_wellness  FROM daily_wellness      WHERE athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;
  SELECT COUNT(*) INTO v_pain      FROM pain_records        WHERE athlete_id = ANY(v_aids) AND date >= CURRENT_DATE - 27;
  SELECT COUNT(*) INTO v_fms       FROM biomechanical_evaluations WHERE athlete_id = ANY(v_aids);

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '✅  Seed 009 completo — Resumen';
  RAISE NOTICE '────────────────────────────────────────────────';
  RAISE NOTICE '📋  training_sessions:         %', v_sessions;
  RAISE NOTICE '💪  session_rpe:               %', v_rpe;
  RAISE NOTICE '📈  acwr_snapshots (28d):      %', v_acwr;
  RAISE NOTICE '⚠️   hq_evaluations riesgo:    %', v_hq_risk;
  RAISE NOTICE '🧠  poms_assessments:          %', v_poms;
  RAISE NOTICE '😴  daily_wellness:            %', v_wellness;
  RAISE NOTICE '🚦  pain_records (EVA 4-6):   %', v_pain;
  RAISE NOTICE '🏃  FMS evaluaciones:          %', v_fms;
  RAISE NOTICE '════════════════════════════════════════════════';
END $$;

COMMIT;
