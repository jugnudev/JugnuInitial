import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("Missing Supabase server environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  
  return createClient(url, key, { 
    auth: { persistSession: false },
    db: {
      schema: 'public'  // Explicitly set the schema
    },
    global: {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    }
  });
}