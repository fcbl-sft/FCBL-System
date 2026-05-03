-- Fix: handle_new_user trigger was using 'Viewer' (capital V)
-- which violates the CHECK constraint on profiles.role column.
-- The constraint requires lowercase: ('super_admin', 'admin', 'director', 'merchandiser', 'qc', 'viewer')
--
-- This also properly reads the role from user_metadata passed by admin.create_user().
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR (Dashboard > SQL Editor)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, section_access, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(
      (SELECT default_sections FROM public.roles WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')),
      '{}'::jsonb
    ),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    section_access = COALESCE(EXCLUDED.section_access, public.profiles.section_access),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
