const { getSupabaseAdmin } = require('./server/supabaseAdmin.js');

async function runMigrations() {
  const supabase = getSupabaseAdmin();
  console.log('Running database migrations...');
  
  // Fix sponsor_metrics_daily - add date column
  const { error: metricsError } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE sponsor_metrics_daily 
      ADD COLUMN IF NOT EXISTS date date;
      
      UPDATE sponsor_metrics_daily 
      SET date = COALESCE(day::date, created_at::date) 
      WHERE date IS NULL;
      
      CREATE INDEX IF NOT EXISTS sponsor_metrics_daily_date_idx 
      ON sponsor_metrics_daily(date);
    `
  }).catch(err => ({ error: err }));
  
  if (metricsError) {
    console.log('Metrics migration failed (may need manual SQL):', metricsError.message);
  } else {
    console.log('✓ Metrics table migrated');
  }
  
  // Fix sponsor_portal_tokens - add id and is_active columns
  const { error: tokensError } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE sponsor_portal_tokens 
      ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
      
      ALTER TABLE sponsor_portal_tokens
      ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
      
      CREATE INDEX IF NOT EXISTS sponsor_portal_tokens_campaign_idx
      ON sponsor_portal_tokens(campaign_id);
    `
  }).catch(err => ({ error: err }));
  
  if (tokensError) {
    console.log('Portal tokens migration failed (may need manual SQL):', tokensError.message);
  } else {
    console.log('✓ Portal tokens table migrated');
  }
  
  // Request schema cache refresh
  const { error: refreshError } = await supabase.rpc('exec_sql', {
    query: `SELECT pg_notify('pgrst', 'reload schema');`
  }).catch(err => ({ error: err }));
  
  if (!refreshError) {
    console.log('✓ Schema cache refresh requested');
  }
  
  console.log('Migration complete!');
  process.exit(0);
}

runMigrations().catch(console.error);
