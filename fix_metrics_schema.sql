-- Fix sponsor_metrics_daily schema
ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS "date" date,
  ADD COLUMN IF NOT EXISTS raw_views int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billable_impressions int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_users int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
  ON public.sponsor_metrics_daily (campaign_id, placement, "date");

SELECT pg_notify('pgrst', 'reload schema');
