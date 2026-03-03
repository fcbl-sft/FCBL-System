-- Migration: Add created_at column to projects table
-- Fixes: "Could not find the 'created_at' column of 'projects' in the schema cache"

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill: set created_at = updated_at for any existing rows that had no value
UPDATE public.projects
SET created_at = COALESCE(updated_at, now())
WHERE created_at = now();
