-- ============================================
-- TICKETING MODULE TABLES - Complete Isolation
-- ============================================
-- All tables prefixed with "tickets_" for isolation
-- No modifications to existing tables

-- Create tickets_organizers table
CREATE TABLE IF NOT EXISTS tickets_organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  stripe_account_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | suspended
  business_name TEXT,
  business_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_events table
CREATE TABLE IF NOT EXISTS tickets_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES tickets_organizers(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  venue TEXT,
  city TEXT NOT NULL DEFAULT 'Vancouver',
  province TEXT NOT NULL DEFAULT 'BC',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  cover_url TEXT,
  allow_refunds_until TIMESTAMPTZ,
  fee_structure JSONB DEFAULT '{"type": "buyer_pays", "serviceFeePercent": 5}'::jsonb,
  tax_settings JSONB DEFAULT '{"collectTax": true, "gstPercent": 5, "pstPercent": 7}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_tiers table
CREATE TABLE IF NOT EXISTS tickets_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tickets_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  capacity INTEGER,
  max_per_order INTEGER DEFAULT 10,
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  visibility TEXT NOT NULL DEFAULT 'public', -- public | hidden
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_orders table
CREATE TABLE IF NOT EXISTS tickets_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tickets_events(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | refunded | partially_refunded | canceled
  subtotal_cents INTEGER NOT NULL,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  discount_code TEXT,
  discount_amount_cents INTEGER DEFAULT 0,
  refunded_amount_cents INTEGER DEFAULT 0,
  placed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_order_items table
CREATE TABLE IF NOT EXISTS tickets_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES tickets_orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tickets_tiers(id),
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_tickets table
CREATE TABLE IF NOT EXISTS tickets_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES tickets_order_items(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tickets_tiers(id),
  serial TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'valid', -- valid | used | refunded | canceled
  used_at TIMESTAMPTZ,
  scanned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_discounts table
CREATE TABLE IF NOT EXISTS tickets_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tickets_events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- percent | fixed
  value NUMERIC NOT NULL, -- percentage (0-100) or fixed amount in cents
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- active | expired | exhausted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, code)
);

-- Create tickets_webhooks table
CREATE TABLE IF NOT EXISTS tickets_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL, -- stripe_payment | stripe_refund | etc.
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processed | failed
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets_audit table
CREATE TABLE IF NOT EXISTS tickets_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL, -- user | organizer | admin | system
  actor_id TEXT,
  action TEXT NOT NULL, -- event_created | ticket_purchased | refund_issued | etc.
  target_type TEXT, -- event | order | ticket | etc.
  target_id TEXT,
  meta_json JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_organizers_user_id ON tickets_organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_organizers_stripe_account_id ON tickets_organizers(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_tickets_events_organizer_id ON tickets_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_events_slug ON tickets_events(slug);
CREATE INDEX IF NOT EXISTS idx_tickets_events_status ON tickets_events(status);
CREATE INDEX IF NOT EXISTS idx_tickets_tiers_event_id ON tickets_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_orders_event_id ON tickets_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_orders_buyer_email ON tickets_orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_orders_status ON tickets_orders(status);
CREATE INDEX IF NOT EXISTS idx_tickets_orders_stripe_payment_intent ON tickets_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_items_order_id ON tickets_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_items_tier_id ON tickets_order_items(tier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tickets_order_item_id ON tickets_tickets(order_item_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tickets_qr_token ON tickets_tickets(qr_token);
CREATE INDEX IF NOT EXISTS idx_tickets_tickets_status ON tickets_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_discounts_event_id ON tickets_discounts(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_discounts_code ON tickets_discounts(code);
CREATE INDEX IF NOT EXISTS idx_tickets_webhooks_status ON tickets_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_tickets_webhooks_kind ON tickets_webhooks(kind);
CREATE INDEX IF NOT EXISTS idx_tickets_audit_actor ON tickets_audit(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_tickets_audit_target ON tickets_audit(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_tickets_audit_created_at ON tickets_audit(created_at);