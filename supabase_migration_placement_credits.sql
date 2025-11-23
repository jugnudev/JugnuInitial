-- Migration: Add placement credits system to community_subscriptions
-- Run this in your Supabase SQL editor

-- Add placement credits columns to community_subscriptions table
ALTER TABLE community_subscriptions 
ADD COLUMN IF NOT EXISTS placement_credits_available INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS placement_credits_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMPTZ;

-- Create placement_credits_usage tracking table
CREATE TABLE IF NOT EXISTS placement_credits_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organizer_id UUID NOT NULL REFERENCES organizers(id),
  subscription_id UUID REFERENCES community_subscriptions(id),
  campaign_id UUID REFERENCES sponsor_campaigns(id) ON DELETE SET NULL,
  placements_used TEXT[] NOT NULL,
  credits_deducted INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_placement_credits_usage_organizer 
ON placement_credits_usage(organizer_id);

CREATE INDEX IF NOT EXISTS idx_placement_credits_usage_subscription 
ON placement_credits_usage(subscription_id);

-- Update comment on price_per_month column to reflect new pricing
COMMENT ON COLUMN community_subscriptions.price_per_month IS 'Price in cents (5000 = $50 CAD)';

-- Add comments for new columns
COMMENT ON COLUMN community_subscriptions.placement_credits_available IS 'Number of ad placement credits available in current billing cycle';
COMMENT ON COLUMN community_subscriptions.placement_credits_used IS 'Number of ad placement credits used in current billing cycle';
COMMENT ON COLUMN community_subscriptions.credits_reset_date IS 'Next date when placement credits will reset (aligned with billing cycle)';
