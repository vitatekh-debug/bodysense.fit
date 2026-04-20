-- ============================================================
-- Vitatekh — Datos de Prueba
-- ⚠️  Solo para desarrollo. NO ejecutar en producción.
--
-- INSTRUCCIONES:
-- 1. Primero crea usuarios reales desde la app en /register
--    (o desde Supabase Dashboard → Authentication → Users → Add user)
-- 2. Luego ejecuta las partes de este script que necesites.
-- ============================================================

-- ─── CREAR EQUIPO para el profesional ───────────────────────
-- Reemplaza 'TU_PROFESSIONAL_ID' con el UUID de tu usuario profesional
-- (lo encuentras en Supabase → Authentication → Users)

/*
INSERT INTO teams (name, sport, professional_id, description)
VALUES (
  'Club Deportivo Ejemplo',
  'basketball',
  'TU_PROFESSIONAL_ID',
  'Equipo de prueba para baloncesto sub-18'
);
*/

-- ─── VERIFICAR TABLAS CREADAS ───────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ─── VER USUARIOS REGISTRADOS ───────────────────────────────
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- ─── VER PERFILES ───────────────────────────────────────────
SELECT id, full_name, email, role, sport FROM profiles ORDER BY created_at DESC;
