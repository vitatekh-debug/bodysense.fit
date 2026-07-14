-- ============================================================
-- Bodysense — Migración 011: Tipo de sesión "Rehabilitación"
--
-- 1. Añade el valor 'rehabilitation' al ENUM session_type
--    (usado por training_sessions).
-- 2. Actualiza el CHECK de planned_sessions.session_type (TEXT)
--    para permitir 'rehabilitation' en la planificación.
-- ============================================================

ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'rehabilitation';

ALTER TABLE public.planned_sessions
  DROP CONSTRAINT IF EXISTS planned_sessions_session_type_check;

ALTER TABLE public.planned_sessions
  ADD CONSTRAINT planned_sessions_session_type_check
  CHECK (session_type IN (
    'technical', 'tactical', 'physical', 'match', 'recovery', 'prevention', 'rehabilitation'
  ));
