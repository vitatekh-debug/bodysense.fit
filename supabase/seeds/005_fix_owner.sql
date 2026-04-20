-- ============================================================
-- Fix: reasignar equipos y sesiones al usuario actual
-- Correo: juancho.9609@gmail.com
-- ============================================================

DO $$
DECLARE
  v_real_id uuid;
BEGIN
  -- 1. Obtener el UUID real del usuario registrado
  SELECT id INTO v_real_id
  FROM auth.users
  WHERE email = 'juancho.9609@gmail.com'
  LIMIT 1;

  IF v_real_id IS NULL THEN
    RAISE EXCEPTION '❌ No se encontró usuario con ese correo. Verifica que estés registrado.';
  END IF;

  RAISE NOTICE '✅ Usuario encontrado: %', v_real_id;

  -- 2. Asegurarse de que el perfil existe y tiene rol professional
  UPDATE public.profiles
  SET role = 'professional'
  WHERE id = v_real_id;

  -- Si por alguna razón no existe el perfil, lo crea
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (v_real_id, 'professional', 'Juan (Admin)', 'juancho.9609@gmail.com')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '   Perfil profesional confirmado';

  -- 3. Reasignar todos los equipos de prueba a este usuario
  UPDATE public.teams
  SET professional_id = v_real_id
  WHERE professional_id != v_real_id;

  RAISE NOTICE '   Equipos actualizados: %', (SELECT COUNT(*) FROM public.teams WHERE professional_id = v_real_id);

  -- 4. Reasignar created_by en training_sessions
  UPDATE public.training_sessions
  SET created_by = v_real_id
  WHERE created_by != v_real_id;

  RAISE NOTICE '   Sesiones actualizadas: %', (SELECT COUNT(*) FROM public.training_sessions WHERE created_by = v_real_id);

  -- 5. Reasignar prevention_sessions si las hubiera
  UPDATE public.prevention_sessions
  SET created_by = v_real_id
  WHERE created_by != v_real_id;

  -- 6. Reasignar periodization_plans si las hubiera
  UPDATE public.periodization_plans
  SET created_by = v_real_id
  WHERE created_by != v_real_id;

  RAISE NOTICE '✅ Todo reasignado a juancho.9609@gmail.com (%)', v_real_id;
  RAISE NOTICE '   Recarga /athletes en el navegador.';
END $$;
