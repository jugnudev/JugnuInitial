-- Loyalty Program Schema
-- Run this manually in Supabase if db:push fails

-- 1. Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);

-- 2. Create merchant_loyalty_config table
CREATE TABLE IF NOT EXISTS merchant_loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE UNIQUE,
  issue_rate INTEGER NOT NULL DEFAULT 25,
  cap_percent NUMERIC(5,2) NOT NULL DEFAULT 0.20,
  home_boost_multiplier NUMERIC(3,2) DEFAULT 1.00,
  point_bank_included INTEGER NOT NULL DEFAULT 0,
  point_bank_purchased INTEGER NOT NULL DEFAULT 0,
  loyalty_enabled BOOLEAN NOT NULL DEFAULT false,
  billing_date TIMESTAMP WITH TIME ZONE,
  subscription_id TEXT
);

CREATE INDEX IF NOT EXISTS merchant_loyalty_config_organizer_id_idx ON merchant_loyalty_config(organizer_id);

-- 3. Create loyalty_ledger table
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  organizer_id UUID NOT NULL REFERENCES organizers(id),
  points INTEGER NOT NULL,
  cents_value INTEGER,
  bucket_used TEXT,
  reference TEXT,
  reversed_of UUID REFERENCES loyalty_ledger(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS loyalty_ledger_user_id_idx ON loyalty_ledger(user_id);
CREATE INDEX IF NOT EXISTS loyalty_ledger_organizer_id_idx ON loyalty_ledger(organizer_id);
CREATE INDEX IF NOT EXISTS loyalty_ledger_created_at_idx ON loyalty_ledger(created_at);
CREATE INDEX IF NOT EXISTS loyalty_ledger_type_idx ON loyalty_ledger(type);

-- 4. Create user_merchant_earnings table
CREATE TABLE IF NOT EXISTS user_merchant_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  total_earned INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT user_merchant_earnings_user_organizer_unique UNIQUE (user_id, organizer_id)
);

CREATE INDEX IF NOT EXISTS user_merchant_earnings_user_id_idx ON user_merchant_earnings(user_id);
CREATE INDEX IF NOT EXISTS user_merchant_earnings_organizer_id_idx ON user_merchant_earnings(organizer_id);
