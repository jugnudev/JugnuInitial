import { getSupabaseAdmin } from './server/supabaseAdmin';

async function addAreaColumn() {
  const supabase = getSupabaseAdmin();
  
  // Try to add the area column to the community_events table
  const { data, error } = await supabase.rpc('pg_get_cols', { tablename: 'community_events' });
  
  if (error) {
    console.log('Checking if column exists:', error.message);
  }
  
  // Try to query to see if area column exists
  const { data: testData, error: testError } = await supabase
    .from('community_events')
    .select('area')
    .limit(1);
  
  if (testError) {
    console.error('Area column does not exist:', testError.message);
    console.log('You need to add the area column via Supabase SQL Editor or migrations');
  } else {
    console.log('Area column exists! Sample data:', testData);
  }
}

addAreaColumn().catch(console.error);
