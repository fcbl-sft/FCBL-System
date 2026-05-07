-- Migration: Add technical specifications and machine information fields to projects table
-- These fields support knitwear/garment manufacturing data capture

-- Technical Specifications
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gauge TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS yarn TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS knitting_time TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wash TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embroidery_print TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS special_trims TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS body_ply TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cuff_bottom_ply TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS neck_ply TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sample_comment TEXT;

-- Machine Information
ALTER TABLE projects ADD COLUMN IF NOT EXISTS machine_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS machine_no TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS machine_gauge TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS machine_type_no TEXT;
