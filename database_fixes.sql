-- 1. Ensure Profile Exists and Matches
-- Check current state
SELECT * FROM profiles WHERE email = 'salman@fashioncomfort.com';

-- If profile doesn't exist, create it
INSERT INTO profiles (id, email, name, role, section_access, is_active, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'Salman',
  'admin',
  '{"dashboard":"full","summary":"full","tech_pack":"full","order_sheet":"full","consumption":"full","pp_meeting":"full","mq_control":"full","commercial":"full","qc_inspect":"full","admin":"full"}'::jsonb,
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'salman@fashioncomfort.com'
ON CONFLICT (id) DO UPDATE SET
  name = 'Salman',
  role = 'admin',
  updated_at = NOW();

-- 2. Disable RLS on profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Ensure ID Column Matches
-- Update profile ID to match auth user ID
UPDATE profiles p
SET id = au.id
FROM auth.users au
WHERE p.email = au.email
AND p.id != au.id;

-- 4. Create Trigger for Auto Profile Creation
-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, section_access, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'Viewer',
    '{"dashboard":"full","summary":"view"}'::jsonb,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
