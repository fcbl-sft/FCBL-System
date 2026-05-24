-- ============================================================
-- MIGRATION 011: Security Fixes (RLS, permissions, schema)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- HIGH-02: Revoke anon access to update_user_profile RPC
-- ============================================================
REVOKE EXECUTE ON FUNCTION update_user_profile(UUID, JSONB) FROM anon;

-- ============================================================
-- HIGH-04: Fix profiles RLS — users read own, admins read all
-- ============================================================
-- Drop the overly permissive "all authenticated read all" policy
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;

-- Users can only read their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Admins and super_admins can read all profiles
-- Uses auth.jwt() to avoid infinite recursion (no self-referencing query)
CREATE POLICY "profiles_select_admin" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('super_admin', 'admin')
        )
    );

-- ============================================================
-- HIGH-05: Fix roles RLS — only admins can modify
-- ============================================================
-- Drop the overly permissive "all authenticated can modify" policy
DROP POLICY IF EXISTS "roles_modify_all" ON roles;

-- Only super_admin can INSERT/UPDATE/DELETE roles
CREATE POLICY "roles_modify_admin_only" ON roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- ============================================================
-- MED-04: Add created_at column to login_activity table
-- ============================================================
ALTER TABLE public.login_activity
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- VERIFICATION: Check policies were updated correctly
-- ============================================================
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'roles')
ORDER BY tablename, policyname;
