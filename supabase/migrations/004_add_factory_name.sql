-- Migration 004: Add factory_name column to projects table
-- Run this SQL in: Supabase Dashboard → SQL Editor
--
-- The frontend (projectService.ts) reads: row.factory_name
-- and writes the field as: factory_name
-- Column name MUST be snake_case: factory_name

ALTER TABLE projects ADD COLUMN IF NOT EXISTS factory_name TEXT;
