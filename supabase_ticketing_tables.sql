-- ============================================
-- TICKETING SYSTEM TABLES FOR SUPABASE
-- ============================================

-- 1. Organizers table
CREATE TABLE IF NOT EXISTS tickets_organizers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN ('individual', 'business', 'nonprofit')),
  tax_id TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'CA',
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  commission_rate NUMERIC(5,4) DEFAULT 0.15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Events table
CREATE TABLE IF NOT EXISTS tickets_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES tickets_organizers(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT DEFAULT 'BC',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  cover_url TEXT,
  allow_refunds_until TIMESTAMPTZ,
  fee_structure JSONB DEFAULT '{"type": "buyer_pays", "serviceFeePercent": 5}',
  tax_settings JSONB DEFAULT '{"collectTax": true, "gstPercent": 5, "pstPercent": 7}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ticket tiers table
CREATE TABLE IF NOT EXISTS tickets_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES tickets_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT DEFAULT 'CAD',
  capacity INTEGER,
  max_per_order INTEGER DEFAULT 10,
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Discount codes table
CREATE TABLE IF NOT EXISTS tickets_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES tickets_events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, code)
);

-- 5. Orders table
CREATE TABLE IF NOT EXISTS tickets_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES tickets_events(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  subtotal_cents INTEGER NOT NULL,
  fees_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  discount_code TEXT,
  discount_amount_cents INTEGER DEFAULT 0,
  refunded_amount_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Order items table
CREATE TABLE IF NOT EXISTS tickets_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES tickets_orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tickets_tiers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL,
  tax_cents INTEGER DEFAULT 0,
  fees_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tickets table
CREATE TABLE IF NOT EXISTS tickets_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES tickets_order_items(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tickets_tiers(id),
  serial TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
  used_at TIMESTAMPTZ,
  scanned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Webhooks table (for Stripe webhook tracking)
CREATE TABLE IF NOT EXISTS tickets_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 9. Audit log table
CREATE TABLE IF NOT EXISTS tickets_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_type TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Events indexes
CREATE INDEX idx_tickets_events_organizer ON tickets_events(organizer_id);
CREATE INDEX idx_tickets_events_slug ON tickets_events(slug);
CREATE INDEX idx_tickets_events_status ON tickets_events(status);
CREATE INDEX idx_tickets_events_start ON tickets_events(start_at);

-- Tiers indexes
CREATE INDEX idx_tickets_tiers_event ON tickets_tiers(event_id);
CREATE INDEX idx_tickets_tiers_sort ON tickets_tiers(event_id, sort_order);

-- Orders indexes
CREATE INDEX idx_tickets_orders_event ON tickets_orders(event_id);
CREATE INDEX idx_tickets_orders_buyer ON tickets_orders(buyer_email);
CREATE INDEX idx_tickets_orders_status ON tickets_orders(status);
CREATE INDEX idx_tickets_orders_stripe_session ON tickets_orders(stripe_checkout_session_id);

-- Order items indexes
CREATE INDEX idx_tickets_order_items_order ON tickets_order_items(order_id);
CREATE INDEX idx_tickets_order_items_tier ON tickets_order_items(tier_id);

-- Tickets indexes
CREATE INDEX idx_tickets_tickets_order_item ON tickets_tickets(order_item_id);
CREATE INDEX idx_tickets_tickets_tier ON tickets_tickets(tier_id);
CREATE INDEX idx_tickets_tickets_qr ON tickets_tickets(qr_token);
CREATE INDEX idx_tickets_tickets_status ON tickets_tickets(status);

-- Discounts indexes
CREATE INDEX idx_tickets_discounts_event ON tickets_discounts(event_id);
CREATE INDEX idx_tickets_discounts_code ON tickets_discounts(event_id, code);

-- Webhooks indexes
CREATE INDEX idx_tickets_webhooks_event_id ON tickets_webhooks(stripe_event_id);
CREATE INDEX idx_tickets_webhooks_processed ON tickets_webhooks(processed);

-- Audit indexes
CREATE INDEX idx_tickets_audit_entity ON tickets_audit(entity_type, entity_id);
CREATE INDEX idx_tickets_audit_created ON tickets_audit(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tickets_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_audit ENABLE ROW LEVEL SECURITY;

-- Public read access for published events and tiers
CREATE POLICY "Public can view published events" ON tickets_events
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public can view event tiers" ON tickets_tiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets_events 
      WHERE tickets_events.id = tickets_tiers.event_id 
      AND tickets_events.status = 'published'
    )
  );

-- Service role has full access (for your backend API)
CREATE POLICY "Service role has full access to organizers" ON tickets_organizers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to events" ON tickets_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tiers" ON tickets_tiers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to discounts" ON tickets_discounts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to orders" ON tickets_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order items" ON tickets_order_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tickets" ON tickets_tickets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to webhooks" ON tickets_webhooks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to audit" ON tickets_audit
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_tickets_organizers_updated_at BEFORE UPDATE ON tickets_organizers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_events_updated_at BEFORE UPDATE ON tickets_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_orders_updated_at BEFORE UPDATE ON tickets_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_tickets_updated_at BEFORE UPDATE ON tickets_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();