import type { Express } from "express";
import { getSupabaseAdmin } from './supabaseAdmin.js';

export function addSpotlightRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // Initialize database tables if they don't exist
  const initTables = async () => {
    try {
      // Create sponsor_campaigns table with frequency capping
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_campaigns (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            name text NOT NULL,
            sponsor_name text NOT NULL,
            headline text,
            subline text,
            cta_text text,
            click_url text NOT NULL,
            placements text[] NOT NULL DEFAULT ARRAY['events_banner'],
            start_at timestamptz NOT NULL,
            end_at timestamptz NOT NULL,
            priority int NOT NULL DEFAULT 0,
            is_active boolean NOT NULL DEFAULT true,
            is_sponsored boolean NOT NULL DEFAULT true,
            tags text[] DEFAULT '{}',
            freq_cap_per_user_per_day int NOT NULL DEFAULT 1
          );
          
          -- Add freq_cap_per_user_per_day column if it doesn't exist
          ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day int NOT NULL DEFAULT 1;
        `
      });

      // Create sponsor_creatives table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_creatives (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at timestamptz NOT NULL DEFAULT now(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            placement text NOT NULL,
            image_desktop_url text,
            image_mobile_url text,
            logo_url text,
            alt text
          );
        `
      });

      // Create sponsor_leads table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_leads (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at timestamptz NOT NULL DEFAULT now(),
            payload jsonb NOT NULL,
            status text NOT NULL DEFAULT 'new'
          );
        `
      });

      // Create sponsor_portal_tokens table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_portal_tokens (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            token text UNIQUE NOT NULL,
            expires_at timestamptz,
            is_active boolean NOT NULL DEFAULT true
          );
        `
      });

      // Create enhanced sponsor_metrics_daily table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_metrics_daily (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            creative_id uuid,
            date date NOT NULL,
            placement text NOT NULL,
            billable_impressions integer DEFAULT 0,
            raw_views integer DEFAULT 0,
            unique_users integer DEFAULT 0,
            clicks integer DEFAULT 0,
            ctr numeric GENERATED ALWAYS AS (
              CASE 
                WHEN billable_impressions > 0 THEN (clicks::numeric / billable_impressions::numeric * 100)
                ELSE 0
              END
            ) STORED,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE(campaign_id, creative_id, date, placement)
          );
          
          -- Add new columns if they don't exist
          ALTER TABLE public.sponsor_metrics_daily ADD COLUMN IF NOT EXISTS billable_impressions integer DEFAULT 0;
          ALTER TABLE public.sponsor_metrics_daily ADD COLUMN IF NOT EXISTS raw_views integer DEFAULT 0;
          ALTER TABLE public.sponsor_metrics_daily ADD COLUMN IF NOT EXISTS unique_users integer DEFAULT 0;
        `
      });

      console.log('✓ Spotlight database tables initialized');
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  };

  // Initialize tables on startup
  initTables();

  // Admin authentication middleware
  const requireAdminKey = (req: any, res: any, next: any) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.EXPORT_ADMIN_KEY || 'dev-key-placeholder';
    
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - invalid admin key' });
    }
    next();
  };

  // Schema migration endpoint
  app.post('/api/spotlight/admin/migrate-schema', requireAdminKey, async (req, res) => {
    try {
      // Add missing columns to existing tables
      await supabase.rpc('exec_sql', {
        sql: `
          -- Add freq_cap_per_user_per_day to sponsor_campaigns if missing
          ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day int NOT NULL DEFAULT 1;
          
          -- Ensure sponsor_portal_tokens has correct schema
          CREATE TABLE IF NOT EXISTS public.sponsor_portal_tokens (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            token text UNIQUE NOT NULL,
            expires_at timestamptz,
            is_active boolean NOT NULL DEFAULT true
          );
          
          -- Add missing columns to sponsor_metrics_daily
          ALTER TABLE public.sponsor_metrics_daily ADD COLUMN IF NOT EXISTS billable_impressions integer DEFAULT 0;
          ALTER TABLE public.sponsor_metrics_daily ADD COLUMN IF NOT EXISTS raw_views integer DEFAULT 0;
          ALTER TABLE public.sponsor_metrics_daily ADD COLUMN IF NOT EXISTS unique_users integer DEFAULT 0;
        `
      });

      res.json({ ok: true, message: 'Schema migration completed' });
    } catch (error) {
      console.error('Schema migration error:', error);
      res.status(500).json({ ok: false, error: 'Migration failed' });
    }
  });

  // Public active spotlights endpoint
  app.get('/api/spotlight/active', async (req, res) => {
    try {
      const { placement } = req.query;
      const now = new Date().toISOString();
      
      let query = supabase
        .from('sponsor_campaigns')
        .select(`
          *,
          sponsor_creatives (*)
        `)
        .eq('is_active', true)
        .lte('start_at', now)
        .gte('end_at', now);
      
      if (placement) {
        query = query.contains('placements', [placement]);
      }
      
      const { data: campaigns, error } = await query.order('priority', { ascending: false });
      
      if (error) throw error;

      // Group by placement
      const spotlights: Record<string, any> = {};
      
      campaigns?.forEach((campaign: any) => {
        campaign.placements?.forEach((p: string) => {
          if (!placement || p === placement) {
            if (!spotlights[p] || spotlights[p].priority < campaign.priority) {
              spotlights[p] = campaign;
            }
          }
        });
      });

      res.json({ ok: true, spotlights });
    } catch (error) {
      console.error('Spotlight active error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load spotlights' });
    }
  });

  // Metrics tracking endpoint
  app.post('/api/spotlight/admin/metrics/track', async (req, res) => {
    try {
      const { campaignId, creativeId, event, placement } = req.body;
      const today = new Date().toISOString().split('T')[0];

      if (event === 'impression') {
        await supabase.rpc('exec_sql', {
          sql: `
            INSERT INTO public.sponsor_metrics_daily (campaign_id, creative_id, date, placement, billable_impressions, raw_views)
            VALUES ($1, $2, $3, $4, 1, 1)
            ON CONFLICT (campaign_id, creative_id, date, placement)
            DO UPDATE SET 
              billable_impressions = sponsor_metrics_daily.billable_impressions + 1,
              raw_views = sponsor_metrics_daily.raw_views + 1,
              updated_at = now();
          `,
          params: [campaignId, creativeId, today, placement]
        });
      } else if (event === 'click') {
        await supabase.rpc('exec_sql', {
          sql: `
            INSERT INTO public.sponsor_metrics_daily (campaign_id, creative_id, date, placement, clicks)
            VALUES ($1, $2, $3, $4, 1)
            ON CONFLICT (campaign_id, creative_id, date, placement)
            DO UPDATE SET 
              clicks = sponsor_metrics_daily.clicks + 1,
              updated_at = now();
          `,
          params: [campaignId, creativeId, today, placement]
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Metrics tracking error:', error);
      res.status(500).json({ ok: false, error: 'Failed to track metric' });
    }
  });

  console.log('✓ Spotlight routes added');
}