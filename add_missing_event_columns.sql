-- Add missing columns to community_events table for Google Calendar import
-- Run this in your Supabase SQL Editor

ALTER TABLE public.community_events 
ADD COLUMN IF NOT EXISTS source_uid text,
ADD COLUMN IF NOT EXISTS canonical_key text,
ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_community_events_source_uid ON public.community_events (source_uid);
CREATE INDEX IF NOT EXISTS idx_community_events_canonical_key ON public.community_events (canonical_key);

-- Update RLS policies if needed (optional)
-- ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'community_events' 
AND column_name IN ('source_uid', 'canonical_key', 'is_all_day');