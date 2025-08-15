-- Fix Portal Token Schema and Add Missing Columns
-- Run this to ensure all columns exist and schema cache is refreshed

-- Ensure pgcrypto extension exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add missing columns to sponsor_campaigns
ALTER TABLE public.sponsor_campaigns
  ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day INTEGER NOT NULL DEFAULT 0;

-- Fix sponsor_portal_tokens table structure
-- Add id column if missing
ALTER TABLE public.sponsor_portal_tokens
  ADD COLUMN IF NOT EXISTS id UUID;

-- Set default for id
UPDATE public.sponsor_portal_tokens 
SET id = gen_random_uuid() 
WHERE id IS NULL;

ALTER TABLE public.sponsor_portal_tokens
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Try to add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' 
    AND indexname='sponsor_portal_tokens_pkey'
  ) THEN
    BEGIN
      ALTER TABLE public.sponsor_portal_tokens ADD PRIMARY KEY (id);
    EXCEPTION WHEN OTHERS THEN 
      NULL; -- Ignore if already exists
    END;
  END IF;
END$$;

-- Add other required columns
ALTER TABLE public.sponsor_portal_tokens
  ADD COLUMN IF NOT EXISTS campaign_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS token TEXT,
  ADD COLUMN IF NOT EXISTS emailed_to TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_campaign_idx
  ON public.sponsor_portal_tokens(campaign_id);

CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_active_idx
  ON public.sponsor_portal_tokens(is_active);

-- Add missing columns to sponsor_metrics_daily
ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS billable_impressions INTEGER DEFAULT 0;

-- Refresh PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Also try alternate method
NOTIFY pgrst, 'reload schema';