-- Migration: Enable real-time publication for the projects table
-- Required for cross-user synchronization of approval status updates.
-- Without this, Supabase real-time subscriptions in ProjectContext.tsx will
-- silently fail, and users will only see updates after a full page refresh.

-- Idempotent: safe to run multiple times. If the table is already in the
-- publication, Postgres will raise a notice but not an error (via IF NOT EXISTS
-- on newer versions, or the DO block catch below for older versions).

DO $$
BEGIN
  -- Check if the table is already part of the publication
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
    RAISE NOTICE 'Added projects table to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'projects table already in supabase_realtime publication — skipping';
  END IF;
END $$;
