"""
Run migration 010 directly against Supabase.

Strategy:
  1. Try psycopg2 direct Postgres connection (most reliable).
  2. Fall back to Supabase REST /rpc/exec_sql if psycopg2 is not installed.

Usage:
  python run_migration.py
"""
import sys, os

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL      = "https://zilbigcueizkfvvpuwjp.supabase.co"
SERVICE_ROLE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbGJpZ2N1ZWl6a2Z2dnB1d2pwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA4MTA4MSwiZXhwIjoyMDgyNjU3MDgxfQ.j1z2IUX1TQbBgssbFzsi9xGkYqbFqKAgi04lL3lLtdo"
PROJECT_REF       = "zilbigcueizkfvvpuwjp"

# Supabase direct DB connection (session pooler, port 5432)
DB_HOST     = f"db.{PROJECT_REF}.supabase.co"
DB_PORT     = 5432
DB_NAME     = "postgres"
DB_USER     = "postgres"
DB_PASSWORD = SERVICE_ROLE_KEY   # service role key IS the db password for direct connections

# ── Migration SQL (all idempotent) ────────────────────────────────────────────
MIGRATION_SQL = """
-- ============================================================
-- MIGRATION 010: Add ALL Missing Columns (safe to re-run)
-- ============================================================

-- Core style fields
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

-- Status & workflow
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS main_status          TEXT DEFAULT 'DEVELOPMENT';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tech_pack_workflow    JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS mq_control_workflow   JSONB;

-- Technical specs
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

-- Machine info
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_name      TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_no        TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_gauge     TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS machine_type_no   TEXT;

-- Material & misc
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_remarks      TEXT    DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_attachments   JSONB   DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS material_comments      JSONB   DEFAULT '[]'::jsonb;

-- Timestamps
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT now();

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
"""

VERIFY_SQL = """
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
  AND column_name IN (
    'brand','team','factory_name','article_number','style_number',
    'description','po_receive_date','shipment_date','fob',
    'product_image','product_colors','main_status',
    'tech_pack_workflow','mq_control_workflow',
    'gauge','yarn','knitting_time','wash','embroidery_print',
    'special_trims','body_ply','cuff_bottom_ply','neck_ply','sample_comment',
    'machine_name','machine_no','machine_gauge','machine_type_no',
    'material_remarks','material_attachments','material_comments','created_at'
  )
ORDER BY column_name;
"""

# ── Runner ────────────────────────────────────────────────────────────────────
def run_with_psycopg2():
    import psycopg2
    print(f"Connecting to {DB_HOST}:{DB_PORT} ...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode="require",
        connect_timeout=15,
    )
    conn.autocommit = True
    cur = conn.cursor()
    print("Connected! Running migration...\n")
    cur.execute(MIGRATION_SQL)
    print("Migration SQL executed successfully.\n")

    print("Verifying columns...\n")
    cur.execute(VERIFY_SQL)
    rows = cur.fetchall()
    print(f"{'Column':<30} {'Type':<20} {'Default'}")
    print("-" * 70)
    for row in rows:
        print(f"  {row[0]:<28} {row[1]:<20} {row[2] or ''}")
    print(f"\n✅  {len(rows)} columns confirmed present.")
    cur.close()
    conn.close()


def run_with_requests():
    """
    Fall back: use Supabase REST API with the service role key.
    This requires an exec_sql RPC function to exist — if it doesn't,
    we print manual instructions.
    """
    import requests, json
    headers = {
        "apikey":        SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }
    print("Trying Supabase REST RPC exec_sql ...")
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql": MIGRATION_SQL},
        timeout=30,
    )
    if resp.status_code in (200, 201):
        print("✅  Migration applied via REST RPC.")
        return True
    else:
        print(f"REST RPC failed ({resp.status_code}): {resp.text[:300]}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("  FCBL Migration 010 — Add Missing Columns")
    print("=" * 60, "\n")

    # Try psycopg2 first (most reliable)
    try:
        import psycopg2
        run_with_psycopg2()
        sys.exit(0)
    except ImportError:
        print("psycopg2 not installed — trying REST API fallback...\n")
    except Exception as e:
        print(f"psycopg2 error: {e}\nTrying REST API fallback...\n")

    # REST fallback
    try:
        import requests
        ok = run_with_requests()
        if not ok:
            print("\n" + "=" * 60)
            print("MANUAL STEPS REQUIRED")
            print("=" * 60)
            print("1. Open: https://supabase.com/dashboard/project/zilbigcueizkfvvpuwjp/sql/new")
            print("2. Paste and run the contents of:")
            print("   supabase/migrations/010_add_all_missing_columns.sql")
            sys.exit(1)
    except ImportError:
        print("requests not installed. Install with: pip install requests")
        sys.exit(1)
