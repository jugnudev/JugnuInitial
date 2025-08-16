-- Apply this SQL directly in Supabase SQL Editor to fix the metrics schema
-- This adds the missing columns that PostgREST cache is not recognizing

ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS "date" date,
  ADD COLUMN IF NOT EXISTS raw_views int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billable_impressions int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_users int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
  ON public.sponsor_metrics_daily (campaign_id, placement, "date");

-- Force PostgREST to reload its schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sponsor_metrics_daily' 
AND table_schema = 'public'
ORDER BY ordinal_position;