import { createClient } from '@supabase/supabase-js';

async function fixMetricsSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Since exec_sql is not available, we'll note the schema needs to be applied manually
  console.log('=== METRICS SCHEMA MIGRATION ===');
  console.log('The following SQL needs to be applied in Supabase SQL Editor:');
  console.log(`
ALTER TABLE public.sponsor_metrics_daily
  ADD COLUMN IF NOT EXISTS "date" date,
  ADD COLUMN IF NOT EXISTS raw_views int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billable_impressions int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_users int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS sponsor_metrics_daily_unique_idx
  ON public.sponsor_metrics_daily (campaign_id, placement, "date");

SELECT pg_notify('pgrst', 'reload schema');
  `);
  
  // Check current schema
  const { data, error } = await supabase
    .from('sponsor_metrics_daily')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('\nCurrent error when querying metrics:', error.message);
  } else {
    console.log('\nSchema check successful - metrics table accessible');
  }
}

fixMetricsSchema().catch(console.error);
