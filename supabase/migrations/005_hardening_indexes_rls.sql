-- ============================================================
-- Vitatekh — Migración 005: Hardening de Base de Datos
-- Paso 2 de robustez del sistema
--
-- Contenido:
--   1. Índices compuestos de rendimiento
--   2. Constraints de validación faltantes
--   3. Mejoras de RLS con SECURITY DEFINER
--   4. Función helper is_my_athlete() para políticas SMCP
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- PARTE 1 — ÍNDICES DE RENDIMIENTO
-- Estrategia: índices compuestos (athlete_id, date DESC)
-- para las consultas más frecuentes del dashboard y gráficos.
-- "DESC" porque siempre pedimos los registros más recientes.
-- ──────────────────────────────────────────────────────────────

-- training_sessions ─────────────────────────────────────────
-- ACWR Edge Function: WHERE athlete_id = ? AND date BETWEEN ?
CREATE INDEX IF NOT EXISTS training_sessions_athlete_date_idx
  ON public.training_sessions (athlete_id, date DESC);

-- Búsqueda por sesión + tipo (análisis de carga por fase)
CREATE INDEX IF NOT EXISTS training_sessions_type_phase_idx
  ON public.training_sessions (session_type, phase);

-- session_rpe ────────────────────────────────────────────────
-- JOIN con training_sessions en el cálculo ACWR
CREATE INDEX IF NOT EXISTS session_rpe_session_athlete_idx
  ON public.session_rpe (session_id, athlete_id);

-- acwr_snapshots ─────────────────────────────────────────────
-- Dashboard: obtener el snapshot más reciente por atleta
-- (date DESC es crítico para el ORDER BY LIMIT 1)
CREATE INDEX IF NOT EXISTS acwr_athlete_date_desc_idx
  ON public.acwr_snapshots (athlete_id, date DESC);

-- Filtrado por zona de riesgo en el dashboard
CREATE INDEX IF NOT EXISTS acwr_risk_zone_idx
  ON public.acwr_snapshots (risk_zone)
  WHERE risk_zone IN ('high', 'very_high');

-- daily_wellness ─────────────────────────────────────────────
-- Página de atleta: últimos 7 registros de bienestar
CREATE INDEX IF NOT EXISTS wellness_athlete_date_desc_idx
  ON public.daily_wellness (athlete_id, date DESC);

-- POMS Assessments ────────────────────────────────────────────
-- Página Prevención: último POMS por atleta
CREATE INDEX IF NOT EXISTS poms_athlete_date_desc_idx
  ON public.poms_assessments (athlete_id, date DESC);

-- H/Q Evaluations ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS hq_athlete_date_desc_idx
  ON public.hq_evaluations (athlete_id, date DESC);

-- Filtrado por riesgo (atletas con risk_flag = true)
CREATE INDEX IF NOT EXISTS hq_risk_flag_idx
  ON public.hq_evaluations (risk_flag)
  WHERE risk_flag = true;

-- Pain Records ────────────────────────────────────────────────
-- Página Prevención: último dolor por atleta + semáforo rojo
CREATE INDEX IF NOT EXISTS pain_athlete_date_desc_idx
  ON public.pain_records (athlete_id, date DESC);

CREATE INDEX IF NOT EXISTS pain_traffic_light_date_idx
  ON public.pain_records (traffic_light, date DESC)
  WHERE traffic_light IN ('yellow', 'red');

-- Biomechanical Evaluations ───────────────────────────────────
CREATE INDEX IF NOT EXISTS biomech_athlete_date_desc_idx
  ON public.biomechanical_evaluations (athlete_id, date DESC);

-- FMS en riesgo
CREATE INDEX IF NOT EXISTS biomech_fms_risk_idx
  ON public.biomechanical_evaluations (fms_injury_risk)
  WHERE fms_injury_risk = true;

-- Prevention Sessions ─────────────────────────────────────────
-- Profesional ve sus sesiones ordenadas por fecha
CREATE INDEX IF NOT EXISTS prev_sessions_creator_date_idx
  ON public.prevention_sessions (created_by, date DESC);

-- Periodization ───────────────────────────────────────────────
-- Ciclo activo (fechas en rango actual)
CREATE INDEX IF NOT EXISTS cycles_dates_idx
  ON public.periodization_cycles (start_date, end_date);

-- ──────────────────────────────────────────────────────────────
-- PARTE 2 — CONSTRAINTS DE VALIDACIÓN
--
-- PostgreSQL no admite ADD CONSTRAINT IF NOT EXISTS.
-- Usamos bloques DO para verificar pg_constraint antes de añadir.
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN

  -- session_rpe: sRPE debe ser positivo (mínimo 6 rpe × 1 min = 6)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'srpe_positive' AND conrelid = 'public.session_rpe'::regclass
  ) THEN
    ALTER TABLE public.session_rpe
      ADD CONSTRAINT srpe_positive CHECK (srpe > 0);
    RAISE NOTICE 'Constraint srpe_positive añadido.';
  END IF;

  -- training_sessions: fecha no más de 7 días en el futuro
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_date_not_far_future'
      AND conrelid = 'public.training_sessions'::regclass
  ) THEN
    ALTER TABLE public.training_sessions
      ADD CONSTRAINT session_date_not_far_future
        CHECK (date <= CURRENT_DATE + INTERVAL '7 days');
    RAISE NOTICE 'Constraint session_date_not_far_future añadido.';
  END IF;

  -- daily_wellness: fecha no futura
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wellness_date_not_future'
      AND conrelid = 'public.daily_wellness'::regclass
  ) THEN
    ALTER TABLE public.daily_wellness
      ADD CONSTRAINT wellness_date_not_future
        CHECK (date <= CURRENT_DATE);
    RAISE NOTICE 'Constraint wellness_date_not_future añadido.';
  END IF;

  -- poms_assessments: fecha no futura
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'poms_date_not_future'
      AND conrelid = 'public.poms_assessments'::regclass
  ) THEN
    ALTER TABLE public.poms_assessments
      ADD CONSTRAINT poms_date_not_future
        CHECK (date <= CURRENT_DATE);
    RAISE NOTICE 'Constraint poms_date_not_future añadido.';
  END IF;

  -- pain_records: fecha no futura
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pain_date_not_future'
      AND conrelid = 'public.pain_records'::regclass
  ) THEN
    ALTER TABLE public.pain_records
      ADD CONSTRAINT pain_date_not_future
        CHECK (date <= CURRENT_DATE);
    RAISE NOTICE 'Constraint pain_date_not_future añadido.';
  END IF;

  -- hq_evaluations: fecha no futura
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hq_date_not_future'
      AND conrelid = 'public.hq_evaluations'::regclass
  ) THEN
    ALTER TABLE public.hq_evaluations
      ADD CONSTRAINT hq_date_not_future
        CHECK (date <= CURRENT_DATE);
    RAISE NOTICE 'Constraint hq_date_not_future añadido.';
  END IF;

  -- biomechanical_evaluations: fecha no futura
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'biomech_date_not_future'
      AND conrelid = 'public.biomechanical_evaluations'::regclass
  ) THEN
    ALTER TABLE public.biomechanical_evaluations
      ADD CONSTRAINT biomech_date_not_future
        CHECK (date <= CURRENT_DATE);
    RAISE NOTICE 'Constraint biomech_date_not_future añadido.';
  END IF;

  -- periodization_cycles: microciclo máximo 14 días
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'microcycle_max_duration'
      AND conrelid = 'public.periodization_cycles'::regclass
  ) THEN
    ALTER TABLE public.periodization_cycles
      ADD CONSTRAINT microcycle_max_duration
        CHECK (level != 'microcycle' OR (end_date - start_date) <= 14);
    RAISE NOTICE 'Constraint microcycle_max_duration añadido.';
  END IF;

  -- periodization_plans: duración mínima 28 días (4 semanas)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_min_duration'
      AND conrelid = 'public.periodization_plans'::regclass
  ) THEN
    ALTER TABLE public.periodization_plans
      ADD CONSTRAINT plan_min_duration
        CHECK ((end_date - start_date) >= 28);
    RAISE NOTICE 'Constraint plan_min_duration añadido.';
  END IF;

END $$;

-- ──────────────────────────────────────────────────────────────
-- PARTE 3 — FUNCIÓN SECURITY DEFINER: is_my_athlete()
--
-- Complementa a athlete_in_my_teams() existente.
-- Usada en políticas SMCP para INSERT/UPDATE del profesional.
-- SECURITY DEFINER = ejecuta sin activar RLS internamente.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_my_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = p_athlete_id
      AND t.professional_id = auth.uid()
  );
$$;

-- Grant de ejecución al rol authenticated
GRANT EXECUTE ON FUNCTION public.is_my_athlete(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- PARTE 4 — MEJORAS DE RLS
--
-- Problema detectado: las políticas SMCP de la migración 004
-- usan el patrón estándar que puede crear recursión.
-- Solución: reescribir usando las funciones SECURITY DEFINER.
--
-- Además: el profesional necesita poder INSERTAR registros
-- para sus atletas (no solo leer), especialmente en POMS y H/Q.
-- ──────────────────────────────────────────────────────────────

-- ── poms_assessments ─────────────────────────────────────────

-- Eliminar políticas anteriores (migración 004)
DROP POLICY IF EXISTS "Athlete manages own POMS"    ON public.poms_assessments;
DROP POLICY IF EXISTS "Professional reads team POMS" ON public.poms_assessments;

-- Atleta: gestión total de sus propios registros
CREATE POLICY "poms: athlete own data"
  ON public.poms_assessments
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Profesional: READ de sus atletas (SECURITY DEFINER → sin recursión)
CREATE POLICY "poms: professional reads team"
  ON public.poms_assessments
  FOR SELECT
  USING (public.is_my_athlete(athlete_id));

-- Profesional: INSERT/UPDATE para sus atletas
-- (entrada de datos por el profesional en evaluaciones presenciales)
CREATE POLICY "poms: professional inserts for team"
  ON public.poms_assessments
  FOR INSERT
  WITH CHECK (public.is_my_athlete(athlete_id));

CREATE POLICY "poms: professional updates for team"
  ON public.poms_assessments
  FOR UPDATE
  USING (public.is_my_athlete(athlete_id));

-- ── hq_evaluations ───────────────────────────────────────────

DROP POLICY IF EXISTS "Professional manages HQ evals" ON public.hq_evaluations;
DROP POLICY IF EXISTS "Athlete reads own HQ"           ON public.hq_evaluations;

-- Solo el profesional puede crear/editar evaluaciones H/Q
CREATE POLICY "hq: professional manages"
  ON public.hq_evaluations
  FOR ALL
  USING (evaluated_by = auth.uid())
  WITH CHECK (evaluated_by = auth.uid());

-- Atleta: solo lectura de sus propias evaluaciones
CREATE POLICY "hq: athlete reads own"
  ON public.hq_evaluations
  FOR SELECT
  USING (athlete_id = auth.uid());

-- Profesional que NO es evaluated_by pero es responsable del atleta:
-- READ para cualquier evaluación de su equipo
CREATE POLICY "hq: professional reads team"
  ON public.hq_evaluations
  FOR SELECT
  USING (public.is_my_athlete(athlete_id));

-- ── pain_records ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Athlete manages own pain"     ON public.pain_records;
DROP POLICY IF EXISTS "Professional reads team pain" ON public.pain_records;

-- Atleta: registra y gestiona su propio dolor
CREATE POLICY "pain: athlete own data"
  ON public.pain_records
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Profesional: READ + INSERT (puede registrar dolor en evaluación presencial)
CREATE POLICY "pain: professional reads team"
  ON public.pain_records
  FOR SELECT
  USING (public.is_my_athlete(athlete_id));

CREATE POLICY "pain: professional inserts for team"
  ON public.pain_records
  FOR INSERT
  WITH CHECK (public.is_my_athlete(athlete_id));

-- ── biomechanical_evaluations ─────────────────────────────────

DROP POLICY IF EXISTS "Professional manages biomech" ON public.biomechanical_evaluations;
DROP POLICY IF EXISTS "Athlete reads own biomech"    ON public.biomechanical_evaluations;

-- Solo el profesional que la realizó puede crear/editar
CREATE POLICY "biomech: professional manages"
  ON public.biomechanical_evaluations
  FOR ALL
  USING (evaluated_by = auth.uid())
  WITH CHECK (evaluated_by = auth.uid());

-- READ para cualquier profesional del equipo del atleta
CREATE POLICY "biomech: professional reads team"
  ON public.biomechanical_evaluations
  FOR SELECT
  USING (public.is_my_athlete(athlete_id));

-- Atleta: solo lectura de sus propias evaluaciones
CREATE POLICY "biomech: athlete reads own"
  ON public.biomechanical_evaluations
  FOR SELECT
  USING (athlete_id = auth.uid());

-- ── Mejorar política de profiles ─────────────────────────────
-- Atleta: SOLO puede editar campos no sensibles de su perfil
-- El profesional NO puede modificar datos del atleta (solo leer)

DROP POLICY IF EXISTS "Own profile" ON public.profiles;

-- Lectura total del propio perfil
CREATE POLICY "profile: own read"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Escritura: el atleta puede editar SOLO su propio perfil
-- El profesional gestiona su perfil de la misma forma
CREATE POLICY "profile: own update"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- El role NO puede cambiarse directamente (solo via trigger/service role)
    -- Esta restricción se refuerza en app level; RLS no puede comparar OLD vs NEW
  );

-- ── Política de acwr_snapshots: solo service role escribe ────
-- La Edge Function usa service_role key, los demás solo leen.

DROP POLICY IF EXISTS "Service role writes ACWR" ON public.acwr_snapshots;

CREATE POLICY "acwr: service role full access"
  ON public.acwr_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────
-- PARTE 5 — FUNCIÓN: prevent_role_change()
--
-- Trigger que impide que un usuario cambie su propio role
-- (solo el service role / admin puede hacerlo).
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el role cambia Y quien hace el cambio es el propio usuario
  IF NEW.role <> OLD.role AND auth.uid() = OLD.id THEN
    RAISE EXCEPTION
      'No puedes cambiar tu propio rol. Contacta al administrador.'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_role_change ON public.profiles;
CREATE TRIGGER protect_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- ──────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_idx_count    INT;
  v_policy_count INT;
BEGIN
  SELECT COUNT(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE '%_desc_idx'
       OR indexname LIKE '%_risk_%';

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '✅ Migración 005 completada:';
  RAISE NOTICE '   Índices de rendimiento: % (solo _desc y _risk)',   v_idx_count;
  RAISE NOTICE '   Políticas RLS totales:  %',                        v_policy_count;
  RAISE NOTICE '   Función is_my_athlete() creada con SECURITY DEFINER';
  RAISE NOTICE '   Trigger prevent_role_change() activado en profiles';
END $$;
