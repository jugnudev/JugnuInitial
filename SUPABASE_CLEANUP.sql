-- ============================================
-- SUPABASE SQL CLEANUP FOR TICKETING SYSTEM
-- ============================================
-- Run these queries in your Supabase SQL Editor if needed

-- 1. VIEW CURRENT STATE
-- Check for orphaned tickets_organizers (records without user_id)
SELECT 
  id,
  user_id,
  email,
  business_email,
  business_name,
  stripe_account_id,
  stripe_onboarding_complete,
  created_at
FROM tickets_organizers
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- 2. VIEW DUPLICATE EMAILS
-- Find any duplicate emails in tickets_organizers table
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id) as organizer_ids,
  array_agg(user_id) as user_ids
FROM tickets_organizers
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. CLEANUP OPTION A: Delete orphaned records (no user_id and no Stripe account)
-- ⚠️ WARNING: This deletes records that were created but never completed onboarding
-- Only run this if you're sure you want to remove incomplete records
/*
DELETE FROM tickets_organizers
WHERE user_id IS NULL 
  AND (stripe_account_id IS NULL OR stripe_onboarding_complete = false);
*/

-- 4. CLEANUP OPTION B: Link orphaned records to users by email
-- This finds orphaned tickets_organizers and links them to users with matching emails
-- ⚠️ Only run if you want to auto-link based on email matching
/*
UPDATE tickets_organizers
SET user_id = users.id
FROM users
WHERE tickets_organizers.email = users.email
  AND tickets_organizers.user_id IS NULL;
*/

-- 5. VIEW SCHEMA CONSTRAINTS
-- Check what constraints exist on tickets_organizers table
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'tickets_organizers'::regclass
ORDER BY contype, conname;

-- 6. ENSURE EMAIL UNIQUE CONSTRAINT EXISTS (if missing)
-- This should already exist, but run this if needed
/*
ALTER TABLE tickets_organizers
ADD CONSTRAINT tickets_organizers_email_key UNIQUE (email);
*/

-- 7. VIEW APPROVED BUSINESSES (Communities organizers)
-- See which approved businesses could enable ticketing
SELECT 
  o.id as organizer_id,
  o.user_id,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  o.business_name,
  o.status,
  o.approved,
  CASE 
    WHEN t.id IS NOT NULL THEN 'Already has ticketing'
    ELSE 'Can enable ticketing'
  END as ticketing_status
FROM organizers o
JOIN users u ON o.user_id = u.id
LEFT JOIN tickets_organizers t ON u.id = t.user_id
WHERE o.approved = true
ORDER BY o.created_at DESC;

-- 8. RECOMMENDED: View all current ticketing organizers and their linkage
SELECT 
  t.id,
  t.user_id,
  t.email,
  t.business_name,
  t.stripe_account_id,
  t.stripe_onboarding_complete,
  t.stripe_charges_enabled,
  u.email as user_email,
  u.first_name || ' ' || u.last_name as user_name,
  CASE 
    WHEN t.user_id IS NULL THEN 'Orphaned (no user link)'
    WHEN t.email != u.email THEN 'Email mismatch'
    ELSE 'OK'
  END as status
FROM tickets_organizers t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC;

-- ============================================
-- RECOMMENDED ACTIONS:
-- ============================================
-- 1. Run query #1 to see orphaned records
-- 2. Run query #2 to see duplicate emails
-- 3. Run query #8 to see overall status
-- 4. If you have orphaned records, decide whether to:
--    - Delete them (query #3) if they're incomplete
--    - Link them (query #4) if they belong to existing users
-- ============================================
