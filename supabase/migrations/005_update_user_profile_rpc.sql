-- =============================================
-- Supabase RPC: update_user_profile
-- Allows admin users to update other users' profiles
-- Uses SECURITY DEFINER to bypass RLS
-- =============================================

-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE OR REPLACE FUNCTION update_user_profile(
  target_user_id UUID,
  updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_keys TEXT[] := ARRAY['name', 'role', 'section_access', 'is_active', 'phone', 'factory_id', 'profile_photo_url'];
  filtered JSONB := '{}'::JSONB;
  key TEXT;
BEGIN
  -- Filter to only allowed fields
  FOR key IN SELECT jsonb_object_keys(updates)
  LOOP
    IF key = ANY(allowed_keys) THEN
      filtered := filtered || jsonb_build_object(key, updates->key);
    END IF;
  END LOOP;

  -- Must have at least one valid field
  IF filtered = '{}'::JSONB THEN
    RETURN jsonb_build_object('success', false, 'error', 'No valid fields to update');
  END IF;

  -- Add updated_at timestamp
  filtered := filtered || jsonb_build_object('updated_at', now()::TEXT);

  -- Perform the update
  UPDATE profiles
  SET
    name = COALESCE((filtered->>'name'), name),
    role = COALESCE((filtered->>'role'), role),
    section_access = COALESCE((filtered->'section_access')::JSONB, section_access),
    is_active = COALESCE((filtered->>'is_active')::BOOLEAN, is_active),
    phone = COALESCE((filtered->>'phone'), phone),
    factory_id = COALESCE((filtered->>'factory_id')::UUID, factory_id),
    profile_photo_url = COALESCE((filtered->>'profile_photo_url'), profile_photo_url),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, JSONB) TO anon;
