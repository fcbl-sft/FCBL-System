-- Migration: Sync Auth Users to Profiles
-- 1. Seed Roles (if missing) to ensure default_sections are available
-- 2. Update/Verify Trigger Function
-- 3. Backfill existing users who are missing profiles

-- ================================================
-- 1. SEED DEFAULT ROLES (Idempotent)
-- ================================================
INSERT INTO public.roles (name, description, default_sections, is_system) VALUES
  ('super_admin', 'Full access, manage all users & roles', 
   '{"dashboard":"full","summary":"full","tech_pack":"full","order_sheet":"full","consumption":"full","pp_meeting":"full","mq_control":"full","commercial":"full","qc_inspect":"full","user_management":"full","role_management":"full"}'::jsonb, 
   true),
  ('admin', 'Manage users, access all features', 
   '{"dashboard":"full","summary":"full","tech_pack":"full","order_sheet":"full","consumption":"full","pp_meeting":"full","mq_control":"full","commercial":"full","qc_inspect":"full","user_management":"full","role_management":"none"}'::jsonb, 
   true),
  ('director', 'View all, limited edit', 
   '{"dashboard":"full","summary":"full","tech_pack":"full","order_sheet":"full","consumption":"full","pp_meeting":"full","mq_control":"full","commercial":"full","qc_inspect":"full","user_management":"none","role_management":"none"}'::jsonb, 
   true),
  ('merchandiser', 'Manage styles, orders, consumption', 
   '{"dashboard":"full","summary":"full","tech_pack":"full","order_sheet":"full","consumption":"full","pp_meeting":"full","mq_control":"none","commercial":"full","qc_inspect":"none","user_management":"none","role_management":"none"}'::jsonb, 
   true),
  ('qc', 'QC Inspect, PP Meeting, MQ Control only', 
   '{"dashboard":"full","summary":"full","tech_pack":"none","order_sheet":"none","consumption":"none","pp_meeting":"full","mq_control":"full","commercial":"none","qc_inspect":"full","user_management":"none","role_management":"none"}'::jsonb, 
   true),
  ('viewer', 'Read-only access', 
   '{"dashboard":"full","summary":"full","tech_pack":"view","order_sheet":"view","consumption":"view","pp_meeting":"view","mq_control":"view","commercial":"view","qc_inspect":"view","user_management":"none","role_management":"none"}'::jsonb, 
   true)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- 2. UPDATE TRIGGER FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, section_access)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(
      (SELECT default_sections FROM public.roles WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')),
      '{}'::jsonb
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 3. BACKFILL MISSING PROFILES
-- ================================================
INSERT INTO public.profiles (id, email, name, role, section_access, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(
        (SELECT default_sections FROM public.roles WHERE name = COALESCE(au.raw_user_meta_data->>'role', 'viewer')),
        '{}'::jsonb
    ),
    au.created_at,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
