-- Add day column if not exists (Pacific timezone aware)
ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS day DATE;

-- Update day from date if needed
UPDATE public.sponsor_metrics_daily
SET day = COALESCE(day, date::date);

-- Ensure uniqueness on (campaign_id, placement, day)
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
  ON public.sponsor_metrics_daily (campaign_id, placement, day);

-- Verify the structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sponsor_metrics_daily' 
ORDER BY ordinal_position;
