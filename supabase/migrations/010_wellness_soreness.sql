-- ============================================================
-- Bodysense — Migración 010: Dolor Muscular en Wellness Diario
--
-- 1. Añade columna soreness (dolor muscular percibido, 1-10)
--    a daily_wellness — alimentada por el check-in del atleta.
-- 2. Hace sleep_hours nullable: el check-in rápido (fatiga, ánimo,
--    calidad de sueño, dolor muscular) puede guardarse sin horas.
-- ============================================================

ALTER TABLE public.daily_wellness
  ADD COLUMN IF NOT EXISTS soreness SMALLINT
  CHECK (soreness BETWEEN 1 AND 10);

ALTER TABLE public.daily_wellness
  ALTER COLUMN sleep_hours DROP NOT NULL;
