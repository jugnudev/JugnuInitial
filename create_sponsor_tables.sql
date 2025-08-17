-- SQL to create new sponsor tables for the sponsorship refresh
-- Run this to set up the new database tables

-- Create sponsor_promo_redemptions table
CREATE TABLE IF NOT EXISTS public.sponsor_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_email text NOT NULL,
  promo_code text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Create unique index to prevent duplicate redemptions per email+promo
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_promo_redemptions_email_promo_unique 
ON public.sponsor_promo_redemptions (lower(sponsor_email), promo_code);

-- Create sponsor_guarantee_targets table
CREATE TABLE IF NOT EXISTS public.sponsor_guarantee_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL CHECK (placement IN ('events_spotlight','homepage_feature','full_feature')),
  week_viewable_impressions_target integer NOT NULL DEFAULT 0,
  week_clicks_target integer, -- nullable for optional clicks target
  effective_from date NOT NULL DEFAULT now()::date
);

-- Create unique index on placement + effective_from
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_guarantee_targets_placement_date_unique 
ON public.sponsor_guarantee_targets (placement, effective_from);

-- Create sponsor_booking_days helper table
CREATE TABLE IF NOT EXISTS public.sponsor_booking_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  placement text NOT NULL,
  day date NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- Create unique index to enforce one sponsor per placement per day
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_booking_days_placement_day_active_unique 
ON public.sponsor_booking_days (placement, day) WHERE is_active = true;

-- Add needs_makegood column to sponsor_campaigns if it doesn't exist
ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS needs_makegood boolean NOT NULL DEFAULT false;

-- Seed conservative delivery guarantee targets
INSERT INTO public.sponsor_guarantee_targets (placement, week_viewable_impressions_target, week_clicks_target) 
VALUES 
  ('events_spotlight', 1200, 12),
  ('homepage_feature', 1800, 18),
  ('full_feature', 3000, 30)
ON CONFLICT (placement, effective_from) DO NOTHING;