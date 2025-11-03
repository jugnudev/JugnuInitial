/**
 * Migration script to create loyalty tables in Supabase
 * Run this with: npx tsx server/loyalty/create-loyalty-tables.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createLoyaltyTables() {
  console.log('🚀 Creating loyalty tables in Supabase...\n');

  // 1. Create wallets table
  console.log('Creating wallets table...');
  const { error: walletsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        total_points INTEGER NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);
    `
  });
  
  if (walletsError) {
    console.error('Error creating wallets:', walletsError);
  } else {
    console.log('✅ wallets table created');
  }

  // 2. Create merchant_loyalty_config table
  console.log('Creating merchant_loyalty_config table...');
  const { error: configError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS merchant_loyalty_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE UNIQUE,
        issue_rate INTEGER NOT NULL DEFAULT 25,
        cap_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.20,
        home_boost_multiplier NUMERIC(3, 2) DEFAULT 1.00,
        point_bank_included INTEGER NOT NULL DEFAULT 0,
        point_bank_purchased INTEGER NOT NULL DEFAULT 0,
        loyalty_enabled BOOLEAN NOT NULL DEFAULT false,
        billing_date TIMESTAMPTZ,
        subscription_id TEXT
      );
      CREATE INDEX IF NOT EXISTS merchant_loyalty_config_organizer_id_idx ON merchant_loyalty_config(organizer_id);
    `
  });
  
  if (configError) {
    console.error('Error creating merchant_loyalty_config:', configError);
  } else {
    console.log('✅ merchant_loyalty_config table created');
  }

  // 3. Create loyalty_ledger table
  console.log('Creating loyalty_ledger table...');
  const { error: ledgerError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS loyalty_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
    `
  });
  
  if (ledgerError) {
    console.error('Error creating loyalty_ledger:', ledgerError);
  } else {
    console.log('✅ loyalty_ledger table created');
  }

  // 4. Create user_merchant_earnings table
  console.log('Creating user_merchant_earnings table...');
  const { error: earningsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS user_merchant_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
        total_earned INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT user_merchant_earnings_user_organizer_unique UNIQUE(user_id, organizer_id)
      );
      CREATE INDEX IF NOT EXISTS user_merchant_earnings_user_id_idx ON user_merchant_earnings(user_id);
      CREATE INDEX IF NOT EXISTS user_merchant_earnings_organizer_id_idx ON user_merchant_earnings(organizer_id);
    `
  });
  
  if (earningsError) {
    console.error('Error creating user_merchant_earnings:', earningsError);
  } else {
    console.log('✅ user_merchant_earnings table created');
  }

  console.log('\n✅ Loyalty tables creation complete!');
}

createLoyaltyTables().catch(console.error);
