-- Schema cleanup and optimization for sponsor metrics
-- A+B+C improvements implemented - Run this in Supabase SQL editor when ready

-- ✅ A) Enhanced logging: Implemented in application metrics test endpoint
-- ✅ B) Timezone hardening: All writes use (now() at time zone 'America/Vancouver')::date
-- ✅ C) Safe schema cleanup: All operations use 'day' column only

-- 1. Add day column if not exists (Pacific timezone aware)
ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS day DATE;

-- 2. Update day from existing date column if needed  
UPDATE public.sponsor_metrics_daily
SET day = COALESCE(day, date::date)
WHERE day IS NULL AND date IS NOT NULL;

-- 3. Ensure uniqueness on (campaign_id, placement, day) - confirmed working in application
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
  ON public.sponsor_metrics_daily (campaign_id, placement, day);

-- 4. Application now handles Pacific timezone writes with:
-- day = (now() at time zone 'America/Vancouver')::date

-- 5. Add missing freq_cap_per_user_per_day column to sponsor_campaigns
-- (Currently disabled due to PostgREST schema cache issue)
-- Uncomment when schema cache refreshes:
-- ALTER TABLE public.sponsor_campaigns 
--   ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day integer DEFAULT 0;

-- 6. Verify all columns are present and properly typed
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

-- 8. Verify the unique constraint is working
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  ARRAY_AGG(att.attname ORDER BY idx.ordinality) AS columns
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN LATERAL UNNEST(con.conkey) WITH ORDINALITY AS idx(key, ordinality) ON true
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = idx.key
WHERE rel.relname = 'sponsor_metrics_daily'
  AND con.contype IN ('p', 'u')  -- primary or unique constraints
GROUP BY con.conname, con.contype;

-- Optional: Clean up unused date column after confirming day column works
-- (Run this later when ready - application no longer references date column)
-- ALTER TABLE public.sponsor_metrics_daily DROP COLUMN IF EXISTS date;