import { getSupabaseAdmin } from './supabaseAdmin';
import * as schema from '@shared/schema';

// Use Supabase for now - will migrate to Drizzle later when properly configured
export const db = getSupabaseAdmin();

// Export schema for convenience
export * from '@shared/schema';