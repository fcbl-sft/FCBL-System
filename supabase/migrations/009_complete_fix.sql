-- ============================================================
-- MIGRATION 009: Complete Fix
-- Run this in your Supabase SQL Editor
-- Adds all missing columns and sets up image storage bucket
-- ============================================================

-- ── 1. MISSING CORE STYLE COLUMNS ──────────────────────────
-- (from add_style_fields.sql — safe to re-run)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS article_number    TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS style_number      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS po_receive_date   TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS shipment_date     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fob               TEXT;

-- ── 2. TECHNICAL SPECIFICATIONS COLUMNS ────────────────────
-- (from 008_add_technical_machine_fields.sql — safe to re-run)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gauge             TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS yarn              TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS knitting_time     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS wash              TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS embroidery_print  TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS special_trims     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS body_ply          TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cuff_bottom_ply   TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS neck_ply          TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sample_comment    TEXT;

-- ── 3. MACHINE INFORMATION COLUMNS ─────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_name      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_no        TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_gauge     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_type_no   TEXT;

-- ── 4. OTHER COLUMNS USED BY THE APP ──────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand             TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team              TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS factory_name      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_image     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_colors    JSONB  DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS main_status       TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_remarks  TEXT   DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_comments    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tech_pack_workflow   JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS mq_control_workflow  JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 5. STORAGE BUCKET FOR PRODUCT IMAGES ──────────────────
-- Create the bucket (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,               -- public bucket so image URLs work without signed URLs
  5242880,            -- 5 MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Storage RLS: allow public read
CREATE POLICY IF NOT EXISTS "Anyone can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Storage RLS: allow authenticated users to update/delete their own uploads
CREATE POLICY IF NOT EXISTS "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- ── 6. VERIFY ─────────────────────────────────────────────
-- Run this SELECT to confirm all columns exist:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
  AND column_name IN (
    'body_ply', 'machine_gauge', 'gauge', 'yarn', 'knitting_time',
    'wash', 'embroidery_print', 'special_trims', 'cuff_bottom_ply',
    'neck_ply', 'sample_comment', 'machine_name', 'machine_no',
    'machine_type_no', 'article_number', 'style_number', 'description',
    'po_receive_date', 'shipment_date', 'fob', 'brand', 'team',
    'factory_name', 'product_image', 'product_colors', 'main_status',
    'created_at'
  )
ORDER BY column_name;
