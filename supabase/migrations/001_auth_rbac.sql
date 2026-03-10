-- FCBL Production Auth RBAC Migration
-- Run this in your Supabase SQL Editor

-- ================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'director', 'merchandiser', 'qc', 'viewer')),
  factory_id UUID,
  section_access JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  profile_photo_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 2. ROLES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- 3. LOGIN ACTIVITY TABLE (Audit Log)
-- ================================================
CREATE TABLE IF NOT EXISTS public.login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_activity_email ON public.login_activity(email);
CREATE INDEX IF NOT EXISTS idx_login_activity_timestamp ON public.login_activity(timestamp DESC);

-- ================================================
-- 4. ACCOUNT LOCKOUT TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  email TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- 5. RLS POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile limited fields" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Super Admin can do everything on profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Admin can manage non-super users" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    AND role != 'super_admin'
  );

-- Roles policies
CREATE POLICY "Anyone authenticated can view roles" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only Super Admin can manage roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Login activity policies (admins can view)
CREATE POLICY "Admins can view login activity" ON public.login_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Service role can insert login activity (for logging)
CREATE POLICY "Service can insert login activity" ON public.login_activity
  FOR INSERT WITH CHECK (true);

-- Account lockouts - service access only
CREATE POLICY "Service can manage lockouts" ON public.account_lockouts
  FOR ALL USING (true);

-- ================================================
-- 6. SEED DEFAULT ROLES
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
-- 7. FUNCTION: Create profile on user signup
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, section_access)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(
      (SELECT default_sections FROM public.roles WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')),
      '{}'::jsonb
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 8. MANUAL SUPER ADMIN CREATION
-- ================================================
-- NOTE: You must create the Super Admin user manually via Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add User"
-- 3. Email: sft.salman94@gmail.com
-- 4. Password: *#Salman042
-- 5. Then run the following SQL to set as super_admin:

-- UPDATE public.profiles 
-- SET role = 'super_admin',
--     name = 'Super Admin',
--     section_access = '{"dashboard":"full","summary":"full","tech_pack":"full","order_sheet":"full","consumption":"full","pp_meeting":"full","mq_control":"full","commercial":"full","qc_inspect":"full","user_management":"full","role_management":"full"}'::jsonb
-- WHERE email = 'sft.salman94@gmail.com';
