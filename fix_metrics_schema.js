const { createClient } = require('@supabase/supabase-js');

async function fixMetricsSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const sql = `
    ALTER TABLE public.sponsor_metrics_daily
      ADD COLUMN IF NOT EXISTS "date" date,
      ADD COLUMN IF NOT EXISTS raw_views int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS billable_impressions int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unique_users int NOT NULL DEFAULT 0;

    CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
      ON public.sponsor_metrics_daily (campaign_id, placement, "date");

    SELECT pg_notify('pgrst', 'reload schema');
  `;
  
  console.log('Applying metrics schema migration...');
  
  // Execute through RPC if available, or direct query
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).catch(async (err) => {
    console.log('exec_sql RPC not available, trying direct approach...');
    // If exec_sql is not available, we'll need to handle it differently
    return { data: null, error: err };
  });
  
  if (error) {
    console.error('Migration error:', error.message);
    console.log('Note: The schema changes may need to be applied directly in Supabase SQL Editor');
  } else {
    console.log('Migration successful!');
  }
}

fixMetricsSchema().catch(console.error);
