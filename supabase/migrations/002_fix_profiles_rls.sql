-- ============================================================
-- FIX: INFINITE RECURSION IN PROFILES & ROLES RLS POLICIES
-- ============================================================
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- This fixes the "infinite recursion detected in policy" error
-- ============================================================

-- ============================================================
-- STEP 1: DROP ALL EXISTING POLICIES ON PROFILES TABLE
-- ============================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================================
-- STEP 2: DROP ALL EXISTING POLICIES ON ROLES TABLE
-- ============================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON roles', pol.policyname);
    END LOOP;
END $$;

-- ============================================================
-- STEP 3: CREATE SIMPLE NON-RECURSIVE POLICIES FOR PROFILES
-- ============================================================
-- These policies use auth.uid() directly without querying profiles table

-- Allow all authenticated users to read all profiles
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ============================================================
-- STEP 4: CREATE SIMPLE NON-RECURSIVE POLICIES FOR ROLES
-- ============================================================
-- Allow all authenticated users to read roles (needed for dropdowns)
CREATE POLICY "roles_select_all" ON roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow all operations for roles (admin check done in application)
CREATE POLICY "roles_modify_all" ON roles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- STEP 5: ENSURE RLS IS ENABLED
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION: Check policies were created correctly
-- ============================================================
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'roles')
ORDER BY tablename, policyname;
