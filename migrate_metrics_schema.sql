-- Migration script to streamline metrics schema
-- Consolidates raw_views/billable_impressions into impressions
-- Adds device breakdown and view duration tracking

BEGIN;

-- Add new columns for enhanced metrics
ALTER TABLE public.sponsor_metrics_daily 
  ADD COLUMN IF NOT EXISTS impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mobile_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desktop_impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_view_duration_ms bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_view_duration_ms integer GENERATED ALWAYS AS (
    CASE 
      WHEN impressions > 0 THEN (total_view_duration_ms / impressions)::integer
      ELSE 0
    END
  ) STORED;

-- Migrate existing data: consolidate raw_views/billable_impressions into impressions
UPDATE public.sponsor_metrics_daily 
SET impressions = GREATEST(COALESCE(raw_views, 0), COALESCE(billable_impressions, 0))
WHERE impressions IS NULL OR impressions = 0;

-- Update CTR calculation to use impressions instead of billable_impressions
ALTER TABLE public.sponsor_metrics_daily 
  DROP COLUMN IF EXISTS ctr CASCADE;

ALTER TABLE public.sponsor_metrics_daily 
  ADD COLUMN ctr numeric GENERATED ALWAYS AS (
    CASE 
      WHEN impressions > 0 THEN (clicks::numeric / impressions::numeric * 100)
      ELSE 0
    END
  ) STORED;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_metrics_device ON public.sponsor_metrics_daily(mobile_impressions, desktop_impressions);
CREATE INDEX IF NOT EXISTS idx_metrics_duration ON public.sponsor_metrics_daily(avg_view_duration_ms);

-- Note: We're keeping raw_views and billable_impressions for backward compatibility
-- They can be removed in a future migration once all systems are updated

COMMIT;