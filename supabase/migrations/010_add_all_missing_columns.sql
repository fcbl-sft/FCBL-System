-- ============================================================
-- MIGRATION 010: Add ALL Missing Columns (safe to re-run)
-- Run this entire script in Supabase → SQL Editor → New query
-- Every statement uses IF NOT EXISTS so it won't break existing data
-- ============================================================

-- ── 1. CORE STYLE FIELDS ────────────────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand             TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team              TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS factory_name      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS article_number    TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS style_number      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS po_receive_date   TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS shipment_date     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS fob               TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_image     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_colors    JSONB DEFAULT '[]'::jsonb;

-- ── 2. STATUS & WORKFLOW FIELDS ─────────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS main_status          TEXT DEFAULT 'DEVELOPMENT';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tech_pack_workflow    JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS mq_control_workflow   JSONB;

-- ── 3. TECHNICAL SPECIFICATIONS ─────────────────────────────
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

-- ── 4. MACHINE INFORMATION ───────────────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_name      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_no        TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_gauge     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_type_no   TEXT;

-- ── 5. MATERIAL & MISC ───────────────────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_remarks     TEXT    DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_attachments  JSONB   DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_comments     JSONB   DEFAULT '[]'::jsonb;

-- ── 6. TIMESTAMPS ────────────────────────────────────────────
-- created_at: use DEFAULT only — do NOT add NOT NULL if rows already exist without it
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT now();

-- ── 7. STORAGE BUCKET FOR PRODUCT IMAGES ────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload product images'
  ) THEN
    CREATE POLICY "Authenticated users can upload product images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Anyone can view product images'
  ) THEN
    CREATE POLICY "Anyone can view product images"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can update product images'
  ) THEN
    CREATE POLICY "Authenticated users can update product images"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete product images'
  ) THEN
    CREATE POLICY "Authenticated users can delete product images"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- ── 8. VERIFY — run this SELECT to confirm all 27 columns exist ──
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
  AND column_name IN (
    'brand', 'team', 'factory_name', 'article_number', 'style_number',
    'description', 'po_receive_date', 'shipment_date', 'fob',
    'product_image', 'product_colors', 'main_status',
    'tech_pack_workflow', 'mq_control_workflow',
    'gauge', 'yarn', 'knitting_time', 'wash', 'embroidery_print',
    'special_trims', 'body_ply', 'cuff_bottom_ply', 'neck_ply', 'sample_comment',
    'machine_name', 'machine_no', 'machine_gauge', 'machine_type_no',
    'material_remarks', 'material_attachments', 'material_comments', 'created_at'
  )
ORDER BY column_name;
