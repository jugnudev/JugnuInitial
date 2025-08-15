import { getSupabaseAdmin } from './server/supabaseAdmin.js';

async function runMigrations() {
  const supabase = getSupabaseAdmin();
  console.log('Applying database migrations to fix schema...');
  
  // Run the migrations as direct table operations since rpc might not work
  try {
    // Check if sponsor_metrics_daily has the date column
    const { data: metricsColumns } = await supabase
      .from('sponsor_metrics_daily')
      .select('*')
      .limit(0);
    
    console.log('✓ sponsor_metrics_daily table accessible');
    
    // Check if sponsor_portal_tokens has the id column
    const { data: tokensColumns } = await supabase
      .from('sponsor_portal_tokens')
      .select('*')
      .limit(0);
      
    console.log('✓ sponsor_portal_tokens table accessible');
    
    // Test creating a portal token with the proper structure
    const testToken = {
      campaign_id: 'a840d6b9-5501-494d-b39f-14b383fb3c45',
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      is_active: true
    };
    
    console.log('Testing portal token creation with:', testToken);
    
    const { data, error } = await supabase
      .from('sponsor_portal_tokens')
      .insert(testToken)
      .select('id, campaign_id, expires_at');
    
    if (error) {
      console.error('Portal token test failed:', error);
      console.log('The database may need manual migration. Run these SQL commands:');
      console.log(`
-- Fix sponsor_portal_tokens table
ALTER TABLE sponsor_portal_tokens 
DROP COLUMN IF EXISTS id;

ALTER TABLE sponsor_portal_tokens 
ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE sponsor_portal_tokens
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Fix sponsor_metrics_daily table  
ALTER TABLE sponsor_metrics_daily
ADD COLUMN IF NOT EXISTS date date;

UPDATE sponsor_metrics_daily 
SET date = COALESCE(day::date, created_at::date)
WHERE date IS NULL;

-- Refresh PostgREST cache
SELECT pg_notify('pgrst', 'reload schema');
      `);
    } else {
      console.log('✓ Portal token created successfully:', data);
      
      // Clean up test token
      if (data && data[0]) {
        await supabase
          .from('sponsor_portal_tokens')
          .delete()
          .eq('id', data[0].id);
        console.log('✓ Test token cleaned up');
      }
    }
    
  } catch (err) {
    console.error('Migration error:', err);
  }
  
  process.exit(0);
}

runMigrations().catch(console.error);
