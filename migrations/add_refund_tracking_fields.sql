-- Add refund tracking and attendee management fields
-- For tickets_tickets table
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS transferred_from uuid REFERENCES tickets_tickets(id);
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS transferred_to uuid REFERENCES tickets_tickets(id);
ALTER TABLE tickets_tickets ADD COLUMN IF NOT EXISTS transferred_at timestamp with time zone;

-- For tickets_orders table - track refunds at order level
ALTER TABLE tickets_orders ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE tickets_orders ADD COLUMN IF NOT EXISTS refund_requested_at timestamp with time zone;
ALTER TABLE tickets_orders ADD COLUMN IF NOT EXISTS refund_processed_at timestamp with time zone;
ALTER TABLE tickets_orders ADD COLUMN IF NOT EXISTS stripe_refund_id text;

-- Create email communications tracking table
CREATE TABLE IF NOT EXISTS tickets_email_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES tickets_events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES tickets_organizers(id),
  subject text NOT NULL,
  message text NOT NULL,
  template_id text,
  recipient_emails text[] NOT NULL,
  recipient_filter jsonb, -- stores filter criteria used
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed
  stats jsonb, -- open rates, click rates, etc.
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create analytics summary table for caching event stats
CREATE TABLE IF NOT EXISTS tickets_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES tickets_events(id) ON DELETE CASCADE,
  date date NOT NULL,
  metric_type text NOT NULL, -- daily_sales | tier_breakdown | checkin_pattern | refund_rate
  metric_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, date, metric_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_refunded_at ON tickets_tickets(refunded_at) WHERE refunded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_is_vip ON tickets_tickets(is_vip) WHERE is_vip = true;
CREATE INDEX IF NOT EXISTS idx_tickets_is_blocked ON tickets_tickets(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_email_comms_event_id ON tickets_email_communications(event_id);
CREATE INDEX IF NOT EXISTS idx_email_comms_sent_at ON tickets_email_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_lookup ON tickets_analytics_cache(event_id, date, metric_type);