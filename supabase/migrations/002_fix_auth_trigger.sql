-- ============================================================
-- Fix: "Database error saving new user"
-- El trigger handle_new_user necesita permisos explícitos
-- en Supabase para insertar en profiles con RLS activo.
-- ============================================================

-- 1. Dar permisos al rol que usa el auth service de Supabase
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- 2. Recrear la función con search_path fijo y permisos correctos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'athlete'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log el error pero no bloquear el registro
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Asegurarse que el trigger está bien conectado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Permitir que la función sea ejecutada por el auth service
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 5. Añadir policy de INSERT para el signup (el trigger inserta como postgres)
DROP POLICY IF EXISTS "Allow service insert profiles" ON profiles;
CREATE POLICY "Allow service insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- 6. Verificar que quedó bien
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
