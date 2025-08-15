import { getSupabaseAdmin } from './supabaseAdmin.js';

async function applyMigrations() {
  const supabase = getSupabaseAdmin();
  
  try {
    // Apply tracking schema migration
    console.log('Applying tracking schema migration...');
    const { error: trackingError } = await supabase.rpc('exec_sql', {
      query: `
        -- Ensure date column exists in sponsor_metrics_daily
        ALTER TABLE sponsor_metrics_daily 
        ADD COLUMN IF NOT EXISTS date date;
        
        -- If day column exists and date doesn't have data, copy from day
        UPDATE sponsor_metrics_daily 
        SET date = day::date 
        WHERE date IS NULL AND day IS NOT NULL;
        
        -- Create index if not exists
        CREATE INDEX IF NOT EXISTS sponsor_metrics_daily_date_idx 
        ON sponsor_metrics_daily(date);
      `
    });
    
    if (trackingError) {
      console.error('Tracking migration error:', trackingError);
    } else {
      console.log('✓ Tracking schema migration applied');
    }
    
    // Apply portal tokens schema migration
    console.log('Applying portal tokens schema migration...');
    const { error: tokensError } = await supabase.rpc('exec_sql', {
      query: `
        -- Add id column if it doesn't exist
        ALTER TABLE sponsor_portal_tokens 
        ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
        
        -- Add is_active column if it doesn't exist
        ALTER TABLE sponsor_portal_tokens
        ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
        
        -- Create index on campaign_id if not exists
        CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_campaign_idx
        ON sponsor_portal_tokens(campaign_id);
      `
    });
    
    if (tokensError) {
      console.error('Portal tokens migration error:', tokensError);
    } else {
      console.log('✓ Portal tokens schema migration applied');
    }
    
    // Notify PostgREST to reload schema
    const { error: notifyError } = await supabase.rpc('exec_sql', {
      query: `SELECT pg_notify('pgrst', 'reload schema');`
    });
    
    if (!notifyError) {
      console.log('✓ PostgREST schema cache refresh requested');
    }
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Run migrations on module load
applyMigrations();

export { applyMigrations };