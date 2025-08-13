-- SQL for testing Promote v2.3 implementation
-- Create a test campaign and portal token

-- Test campaign creation
INSERT INTO public.sponsor_campaigns (
  id,
  name,
  status,
  start_at,
  end_at,
  total_budget,
  created_at
) VALUES (
  gen_random_uuid(),
  'Test Campaign - Promote v2.3',
  'pending',
  NOW(),
  NOW() + INTERVAL '7 days',
  150.00,
  NOW()
) RETURNING id;

-- Test metrics data (will need the campaign_id from above)
-- Replace <campaign_id> with actual ID
INSERT INTO public.sponsor_metrics_daily (
  campaign_id,
  creative_id,
  date,
  placement,
  impressions,
  clicks
) VALUES 
  ('<campaign_id>', NULL, CURRENT_DATE - 1, 'events_banner', 245, 12),
  ('<campaign_id>', NULL, CURRENT_DATE, 'events_banner', 189, 8);

-- Create portal token (replace <campaign_id>)
INSERT INTO public.sponsor_portal_tokens (
  campaign_id,
  token,
  expires_at
) VALUES (
  '<campaign_id>',
  'test-token-v23-' || extract(epoch from now())::text,
  NOW() + INTERVAL '30 days'
) RETURNING token;

-- Test RLS policies
SET app.portal_token = 'test-token-v23-xxxxx';
SELECT * FROM public.sponsor_campaigns WHERE id = '<campaign_id>';
SELECT * FROM public.sponsor_metrics_daily WHERE campaign_id = '<campaign_id>';