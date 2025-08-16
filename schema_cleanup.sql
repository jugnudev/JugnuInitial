-- Schema cleanup and optimization for sponsor metrics
-- Run this in Supabase SQL editor when ready

-- 1. Add day column if not exists (Pacific timezone aware)
ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS day DATE;

-- 2. Update day from existing date column if needed  
UPDATE public.sponsor_metrics_daily
SET day = COALESCE(day, date::date)
WHERE day IS NULL AND date IS NOT NULL;

-- 3. For new records, populate day with Pacific timezone
-- This will be handled in application code going forward

-- 4. Ensure uniqueness on (campaign_id, placement, day)
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
  ON public.sponsor_metrics_daily (campaign_id, placement, day);

-- 5. Add missing freq_cap_per_user_per_day column to sponsor_campaigns
-- (Currently disabled due to PostgREST schema cache issue)
-- Uncomment when schema cache refreshes:
-- ALTER TABLE public.sponsor_campaigns 
--   ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day integer DEFAULT 0;

-- 6. Verify structure
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('sponsor_metrics_daily', 'sponsor_campaigns', 'sponsor_portal_tokens')
ORDER BY table_name, ordinal_position;

-- 7. Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Optional: Clean up unused date column after confirming day column works
-- (Run this later when ready)
-- ALTER TABLE public.sponsor_metrics_daily DROP COLUMN IF EXISTS date;