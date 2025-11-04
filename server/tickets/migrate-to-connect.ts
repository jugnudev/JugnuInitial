import { getSupabaseAdmin } from '../supabaseAdmin.js';

/**
 * Migration script to convert ticketing tables from MoR to Stripe Connect model
 * Run this once to update the database schema
 */
async function migrateToStripeConnect() {
  const supabase = getSupabaseAdmin();
  
  console.log('Starting migration to Stripe Connect model...');
  
  try {
    // Step 1: Modify tickets_organizers table
    console.log('\n1. Updating tickets_organizers table...');
    
    // Add new Stripe Connect columns
    const organizersSQL = `
      -- Add Stripe Connect tracking columns
      ALTER TABLE tickets_organizers
        ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE NOT NULL,
        ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE NOT NULL,
        ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER DEFAULT 500 NOT NULL;
      
      -- Drop MoR columns (if they exist)
      ALTER TABLE tickets_organizers
        DROP COLUMN IF EXISTS payout_method,
        DROP COLUMN IF EXISTS payout_email,
        DROP COLUMN IF EXISTS legal_name,
        DROP COLUMN IF EXISTS default_share_bps;
      
      -- Update status default back to 'pending' for Connect onboarding
      ALTER TABLE tickets_organizers
        ALTER COLUMN status SET DEFAULT 'pending';
    `;
    
    const { error: organizersError } = await supabase.rpc('exec_sql', { sql: organizersSQL });
    if (organizersError) {
      console.error('Error updating tickets_organizers:', organizersError);
    } else {
      console.log('✓ tickets_organizers updated successfully');
    }
    
    // Step 2: Modify tickets_orders table
    console.log('\n2. Updating tickets_orders table...');
    
    const ordersSQL = `
      -- Rename fees_cents to application_fee_cents for clarity
      ALTER TABLE tickets_orders
        RENAME COLUMN fees_cents TO application_fee_cents;
      
      -- Drop MoR-specific columns
      ALTER TABLE tickets_orders
        DROP COLUMN IF EXISTS stripe_charge_id,
        DROP COLUMN IF EXISTS stripe_fee_cents,
        DROP COLUMN IF EXISTS platform_fee_cents,
        DROP COLUMN IF EXISTS net_to_organizer_cents,
        DROP COLUMN IF EXISTS payout_id,
        DROP COLUMN IF EXISTS payout_status;
      
      -- Drop MoR-related indexes
      DROP INDEX IF EXISTS orders_payout_status_idx;
      DROP INDEX IF EXISTS orders_payout_id_idx;
      DROP INDEX IF EXISTS orders_event_payout_idx;
    `;
    
    const { error: ordersError } = await supabase.rpc('exec_sql', { sql: ordersSQL });
    if (ordersError) {
      console.error('Error updating tickets_orders:', ordersError);
    } else {
      console.log('✓ tickets_orders updated successfully');
    }
    
    console.log('\n✅ Migration to Stripe Connect completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Existing organizers will need to complete Stripe Connect onboarding');
    console.log('2. Update your application code to use Stripe Connect APIs');
    console.log('3. Test the new payment flow with a test account');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToStripeConnect()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateToStripeConnect };
