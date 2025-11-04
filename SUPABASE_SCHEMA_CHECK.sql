-- ============================================
-- SUPABASE SCHEMA VERIFICATION FOR TICKETING
-- ============================================
-- Run these queries in Supabase SQL Editor to verify your schema is up-to-date

-- 1. CHECK: Verify tickets_organizers table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tickets_organizers'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid) - PRIMARY KEY
-- user_id (character varying) - NULLABLE, foreign key to users.id
-- stripe_account_id (text) - NULLABLE, UNIQUE
-- stripe_onboarding_complete (boolean) - NOT NULL, DEFAULT false
-- stripe_charges_enabled (boolean) - NOT NULL, DEFAULT false  
-- stripe_payouts_enabled (boolean) - NOT NULL, DEFAULT false
-- stripe_details_submitted (boolean) - NOT NULL, DEFAULT false
-- status (text) - NOT NULL, DEFAULT 'pending'
-- business_name (text) - NULLABLE
-- business_email (text) - NULLABLE
-- email (text) - NOT NULL, UNIQUE ⚠️ IMPORTANT
-- platform_fee_bps (integer) - NOT NULL, DEFAULT 500
-- created_at (timestamp with time zone) - NOT NULL
-- updated_at (timestamp with time zone) - NOT NULL

-- 2. CHECK: Verify email column has UNIQUE constraint (critical for preventing duplicates)
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'tickets_organizers'::regclass
  AND contype = 'u' -- unique constraints only
ORDER BY conname;

-- Expected: tickets_organizers_email_key UNIQUE (email)

-- 3. CHECK: Verify foreign key to users table exists
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'tickets_organizers'::regclass
  AND contype = 'f' -- foreign key constraints only;

-- Expected: user_id references users(id)

-- ============================================
-- FIXES: Run these ONLY if schema is missing or incorrect
-- ============================================

-- FIX 1: Add email UNIQUE constraint (if missing)
-- ⚠️ Only run if query #2 above shows no email unique constraint
/*
ALTER TABLE tickets_organizers
ADD CONSTRAINT tickets_organizers_email_key UNIQUE (email);
*/

-- FIX 2: Add user_id foreign key (if missing)
-- ⚠️ Only run if query #3 above shows no user_id foreign key
/*
ALTER TABLE tickets_organizers
ADD CONSTRAINT tickets_organizers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id);
*/

-- FIX 3: Add stripe_account_id UNIQUE constraint (if missing)
/*
ALTER TABLE tickets_organizers
ADD CONSTRAINT tickets_organizers_stripe_account_id_key 
UNIQUE (stripe_account_id);
*/

-- ============================================
-- DATA VERIFICATION
-- ============================================

-- 4. VERIFY: Check current organizers and their linkage to users
SELECT 
  t.id as organizer_id,
  t.user_id,
  t.email as organizer_email,
  t.business_name,
  t.stripe_account_id,
  t.stripe_onboarding_complete,
  t.stripe_charges_enabled,
  t.status,
  u.email as user_email,
  u.first_name || ' ' || u.last_name as user_name,
  CASE 
    WHEN t.user_id IS NULL THEN '⚠️ Orphaned (no user link)'
    WHEN t.email != u.email THEN '⚠️ Email mismatch'
    WHEN t.stripe_onboarding_complete = false THEN 'Pending Stripe onboarding'
    WHEN t.stripe_charges_enabled = false THEN 'Stripe onboarding incomplete'
    ELSE '✅ OK'
  END as health_status
FROM tickets_organizers t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC;

-- 5. VERIFY: Find approved businesses that could enable ticketing
SELECT 
  o.id as community_organizer_id,
  o.user_id,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  o.business_name,
  o.status as community_status,
  o.approved,
  CASE 
    WHEN t.id IS NOT NULL THEN '✅ Ticketing enabled'
    ELSE '🟡 Can enable ticketing'
  END as ticketing_status,
  t.id as tickets_organizer_id,
  t.stripe_onboarding_complete,
  t.stripe_charges_enabled
FROM organizers o
JOIN users u ON o.user_id = u.id
LEFT JOIN tickets_organizers t ON u.id = t.user_id
WHERE o.approved = true
ORDER BY o.created_at DESC;

-- ============================================
-- SUMMARY
-- ============================================
-- 1. Run queries #1-3 to verify schema
-- 2. If any constraints are missing, run the corresponding FIX queries
-- 3. Run query #4 to check data health
-- 4. Run query #5 to see which approved businesses can enable ticketing
-- 5. Most importantly: The backend now handles duplicate emails automatically,
--    so schema should already be correct if you ran `npm run db:push`
-- ============================================
