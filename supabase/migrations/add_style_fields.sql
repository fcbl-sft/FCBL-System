-- Migration: Add new style fields to projects table
-- Fields: article_number, style_number, description, po_receive_date, shipment_date, fob

ALTER TABLE projects ADD COLUMN IF NOT EXISTS article_number TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS style_number TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS po_receive_date TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shipment_date TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fob TEXT;
