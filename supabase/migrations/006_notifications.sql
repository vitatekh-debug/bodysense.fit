-- ============================================================
-- Vitatekh — Migración 006: Sistema de Notificaciones Proactivas
-- Detecta transiciones de zona ACWR (Verde → Rojo en < 24h)
-- y genera alertas para el coach.
-- ============================================================

-- ── Tabla de notificaciones ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN (
    'zone_escalation',   -- ACWR pasó de baja/óptima a alta/muy_alta
    'critical_acwr',     -- ACWR > 1.5 (zona muy alta directamente)
    'red_pain',          -- EVA >= 7 registrado hoy
    'poms_overtraining', -- TMD > 7
    'hq_risk_detected',  -- H/Q bajo umbral nuevo
    'fms_pain_pattern'   -- Patrón FMS con dolor (score 0)
  )),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  previous_zone TEXT,      -- zona ACWR anterior (para escalaciones)
  current_zone  TEXT,      -- zona ACWR actual
  data          JSONB,     -- contexto adicional (acwr_ratio, eva_score, etc.)
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_coach_unread_idx
  ON public.coach_notifications (coach_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_coach_date_idx
  ON public.coach_notifications (coach_id, created_at DESC);

-- RLS
ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

-- Coach solo ve sus propias notificaciones
CREATE POLICY "notifications: coach reads own"
  ON public.coach_notifications
  FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "notifications: coach marks read"
  ON public.coach_notifications
  FOR UPDATE
  USING (coach_id = auth.uid());

-- La Edge Function (service_role) inserta notificaciones
CREATE POLICY "notifications: service role full"
  ON public.coach_notifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- ── Función: marcar notificaciones como leídas ───────────────

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_coach_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coach_notifications
  SET read_at = NOW()
  WHERE coach_id = p_coach_id AND read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid) TO authenticated;

-- ── Función: contar notificaciones no leídas del coach ───────

CREATE OR REPLACE FUNCTION public.unread_notification_count(p_coach_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.coach_notifications
  WHERE coach_id = p_coach_id AND read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.unread_notification_count(uuid) TO authenticated;

-- ── Verificación ─────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 006 completada:';
  RAISE NOTICE '   Tabla coach_notifications creada.';
  RAISE NOTICE '   Índices para notificaciones no leídas creados.';
  RAISE NOTICE '   Funciones mark_notifications_read() y unread_notification_count() listas.';
END $$;
