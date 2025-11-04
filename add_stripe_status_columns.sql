-- Add missing Stripe Connect status columns to tickets_organizers table
-- Migration: add_stripe_status_columns.sql
-- Date: 2025-11-04

ALTER TABLE tickets_organizers
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_id VARCHAR,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER NOT NULL DEFAULT 1500;

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_organizers_user_id ON tickets_organizers(user_id);

-- Update trigger is already in place from base migration
