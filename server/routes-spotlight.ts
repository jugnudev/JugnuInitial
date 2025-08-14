import type { Express } from "express";
import crypto from "crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

export function addSpotlightRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // Initialize database tables if they don't exist
  const initTables = async () => {
    try {
      // Create sponsor_campaigns table
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
            placements text[] NOT NULL DEFAULT ARRAY['home_hero','events_banner'],
            start_at timestamptz NOT NULL,
            end_at timestamptz NOT NULL,
            priority int NOT NULL DEFAULT 0,
            is_active boolean NOT NULL DEFAULT true,
            is_sponsored boolean NOT NULL DEFAULT true,
            tags text[] DEFAULT '{}'
          );
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

      // Create sponsor_metrics_daily table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_metrics_daily (
            day date NOT NULL,
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            placement text NOT NULL,
            impressions int NOT NULL DEFAULT 0,
            clicks int NOT NULL DEFAULT 0,
            PRIMARY KEY (day, campaign_id, placement)
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
            token text UNIQUE NOT NULL,
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            expires_at timestamptz
          );
        `
      });

      // Create sponsor_portal_tokens table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_portal_tokens (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            token text UNIQUE NOT NULL,
            expires_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          );
        `
      });

      // Create enhanced sponsor_metrics_daily table with CTR calculation
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.sponsor_metrics_daily (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            creative_id uuid,
            date date NOT NULL,
            placement text NOT NULL,
            impressions integer DEFAULT 0,
            clicks integer DEFAULT 0,
            ctr numeric GENERATED ALWAYS AS (
              CASE 
                WHEN impressions > 0 THEN (clicks::numeric / impressions::numeric * 100)
                ELSE 0
              END
            ) STORED,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE(campaign_id, creative_id, date, placement)
          );
        `
      });

      // Enable RLS on all sponsor tables
      await supabase.rpc('exec_sql', {
        sql: `
          -- Enable RLS
          ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.sponsor_creatives ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.sponsor_metrics_daily ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.sponsor_leads ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.sponsor_portal_tokens ENABLE ROW LEVEL SECURITY;

          -- Admin (service key) policies - full access
          CREATE POLICY sponsor_campaigns_admin ON public.sponsor_campaigns FOR ALL USING (true);
          CREATE POLICY sponsor_creatives_admin ON public.sponsor_creatives FOR ALL USING (true);
          CREATE POLICY sponsor_metrics_admin ON public.sponsor_metrics_daily FOR ALL USING (true);
          CREATE POLICY sponsor_leads_admin ON public.sponsor_leads FOR ALL USING (true);
          CREATE POLICY sponsor_tokens_admin ON public.sponsor_portal_tokens FOR ALL USING (true);

          -- Token holder policies - read access to their campaign data
          CREATE POLICY sponsor_campaigns_token ON public.sponsor_campaigns FOR SELECT 
            USING (id IN (
              SELECT campaign_id FROM public.sponsor_portal_tokens 
              WHERE token = current_setting('app.portal_token', true)
              AND (expires_at IS NULL OR expires_at > now())
            ));

          CREATE POLICY sponsor_metrics_token ON public.sponsor_metrics_daily FOR SELECT 
            USING (campaign_id IN (
              SELECT campaign_id FROM public.sponsor_portal_tokens 
              WHERE token = current_setting('app.portal_token', true)
              AND (expires_at IS NULL OR expires_at > now())
            ));
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

  // ======= ADMIN API ROUTES =======

  // POST /api/spotlight/admin/campaign/upsert
  app.post('/api/spotlight/admin/campaign/upsert', requireAdminKey, async (req, res) => {
    try {
      const {
        id,
        name,
        sponsor_name,
        headline,
        subline,
        cta_text,
        click_url,
        placements,
        start_at,
        end_at,
        priority = 0,
        is_active = true,
        is_sponsored = true,
        tags = [],
        creatives = []
      } = req.body;

      let campaign;

      if (id) {
        // Update existing campaign
        const { data, error } = await supabase
          .from('sponsor_campaigns')
          .update({
            name,
            sponsor_name,
            headline,
            subline,
            cta_text,
            click_url,
            placements,
            start_at,
            end_at,
            priority,
            is_active,
            is_sponsored,
            tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        campaign = data;
      } else {
        // Create new campaign
        const { data, error } = await supabase
          .from('sponsor_campaigns')
          .insert({
            name,
            sponsor_name,
            headline,
            subline,
            cta_text,
            click_url,
            placements,
            start_at,
            end_at,
            priority,
            is_active,
            is_sponsored,
            tags
          })
          .select()
          .single();

        if (error) throw error;
        campaign = data;
      }

      // Update creatives if provided
      if (creatives && creatives.length > 0) {
        // Delete existing creatives for this campaign
        await supabase
          .from('sponsor_creatives')
          .delete()
          .eq('campaign_id', campaign.id);

        // Insert new creatives
        const creativesData = creatives.map((creative: any) => ({
          campaign_id: campaign.id,
          placement: creative.placement,
          image_desktop_url: creative.image_desktop_url,
          image_mobile_url: creative.image_mobile_url,
          logo_url: creative.logo_url,
          alt: creative.alt
        }));

        const { error: creativesError } = await supabase
          .from('sponsor_creatives')
          .insert(creativesData);

        if (creativesError) throw creativesError;
      }

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        campaign,
        message: id ? 'Campaign updated successfully' : 'Campaign created successfully'
      });

    } catch (error) {
      console.error('Campaign upsert error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to upsert campaign'
      });
    }
  });

  // POST /api/spotlight/admin/campaign/toggle
  app.post('/api/spotlight/admin/campaign/toggle', requireAdminKey, async (req, res) => {
    try {
      const { id, is_active } = req.body;

      const { data, error } = await supabase
        .from('sponsor_campaigns')
        .update({ 
          is_active, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        campaign: data,
        message: `Campaign ${is_active ? 'activated' : 'deactivated'}`
      });

    } catch (error) {
      console.error('Campaign toggle error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to toggle campaign'
      });
    }
  });

  // GET /api/spotlight/admin/campaign/list - Campaigns list for sanity checks
  app.get('/api/spotlight/admin/campaign/list', requireAdminKey, async (req, res) => {
    try {
      const { data: campaigns, error } = await supabase
        .from('sponsor_campaigns')
        .select(`
          id,
          name,
          sponsor_name,
          is_active,
          start_at,
          end_at,
          placements
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        campaigns
      });

    } catch (error) {
      console.error('Get campaign list error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign list'
      });
    }
  });

  // GET /api/spotlight/admin/campaigns
  app.get('/api/spotlight/admin/campaigns', requireAdminKey, async (req, res) => {
    try {
      const { data: campaigns, error } = await supabase
        .from('sponsor_campaigns')
        .select(`
          *,
          creatives:sponsor_creatives(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get basic metrics for each campaign
      const campaignsWithMetrics = await Promise.all(
        campaigns.map(async (campaign) => {
          const { data: metrics } = await supabase
            .from('sponsor_metrics_daily')
            .select('impressions, clicks')
            .eq('campaign_id', campaign.id);

          const totalImpressions = metrics?.reduce((sum, m) => sum + m.impressions, 0) || 0;
          const totalClicks = metrics?.reduce((sum, m) => sum + m.clicks, 0) || 0;

          return {
            ...campaign,
            metrics: {
              impressions: totalImpressions,
              clicks: totalClicks,
              ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00'
            }
          };
        })
      );

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        campaigns: campaignsWithMetrics
      });

    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get campaigns'
      });
    }
  });

  // POST /api/spotlight/admin/metrics/track
  app.post('/api/spotlight/admin/metrics/track', async (req, res) => {
    try {
      const { campaignId, placement, kind } = req.body;
      
      if (!['click', 'impression'].includes(kind)) {
        return res.status(400).json({ ok: false, error: 'Invalid tracking kind' });
      }

      const today = new Date().toISOString().split('T')[0];

      // Upsert daily metrics
      const { error } = await supabase.rpc('upsert_sponsor_metrics', {
        p_day: today,
        p_campaign_id: campaignId,
        p_placement: placement,
        p_impressions: kind === 'impression' ? 1 : 0,
        p_clicks: kind === 'click' ? 1 : 0
      });

      if (error) {
        // Fallback to manual upsert if RPC doesn't exist
        const { data: existing } = await supabase
          .from('sponsor_metrics_daily')
          .select('*')
          .eq('day', today)
          .eq('campaign_id', campaignId)
          .eq('placement', placement)
          .single();

        if (existing) {
          const updates = kind === 'impression' 
            ? { impressions: existing.impressions + 1 }
            : { clicks: existing.clicks + 1 };

          await supabase
            .from('sponsor_metrics_daily')
            .update(updates)
            .eq('day', today)
            .eq('campaign_id', campaignId)
            .eq('placement', placement);
        } else {
          await supabase
            .from('sponsor_metrics_daily')
            .insert({
              day: today,
              campaign_id: campaignId,
              placement: placement,
              impressions: kind === 'impression' ? 1 : 0,
              clicks: kind === 'click' ? 1 : 0
            });
        }
      }

      res.json({ ok: true });

    } catch (error) {
      console.error('Metrics tracking error:', error);
      // Don't fail the request - analytics failures shouldn't break user experience
      res.json({ ok: true });
    }
  });

  // POST /api/spotlight/admin/portal-token - Create portal token for campaign analytics
  app.post('/api/spotlight/admin/portal-token', requireAdminKey, async (req, res) => {
    try {
      const { campaign_id, expires_in_hours = 72 } = req.body;

      if (!campaign_id) {
        return res.status(400).json({
          ok: false,
          error: 'campaign_id is required'
        });
      }

      // Verify campaign exists
      const { data: campaign, error: campaignError } = await supabase
        .from('sponsor_campaigns')
        .select('id, name')
        .eq('id', campaign_id)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({
          ok: false,
          error: 'Campaign not found'
        });
      }

      // Generate token (using UUID for simplicity, could be JWT in production)
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

      // Store token in database
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          token,
          campaign_id,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        token,
        portal_url: `/sponsor/${token}`,
        campaign_id,
        expires_at: expiresAt.toISOString()
      });

    } catch (error) {
      console.error('Portal token creation error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create portal token'
      });
    }
  });

  // GET /api/spotlight/admin/portal-token - Convenience alias for curl testing
  app.get('/api/spotlight/admin/portal-token', requireAdminKey, async (req, res) => {
    try {
      const { campaign_id, expires_in_hours = 72 } = req.query;

      if (!campaign_id) {
        return res.status(400).json({
          ok: false,
          error: 'campaign_id query parameter is required'
        });
      }

      // Forward to POST handler with same logic
      const forwardedReq = {
        ...req,
        body: {
          campaign_id: campaign_id as string,
          expires_in_hours: parseInt(expires_in_hours as string) || 72
        }
      };

      // Call POST handler logic directly
      const { campaign_id: cid, expires_in_hours: eih = 72 } = forwardedReq.body;

      // Verify campaign exists
      const { data: campaign, error: campaignError } = await supabase
        .from('sponsor_campaigns')
        .select('id, name')
        .eq('id', cid)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({
          ok: false,
          error: 'Campaign not found'
        });
      }

      // Generate token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + eih);

      // Store token in database
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          token,
          campaign_id: cid,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        token,
        portal_url: `/sponsor/${token}`,
        campaign_id: cid,
        expires_at: expiresAt.toISOString()
      });

    } catch (error) {
      console.error('Portal token creation error (GET):', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create portal token'
      });
    }
  });

  // GET /api/spotlight/admin/leads
  app.get('/api/spotlight/admin/leads', requireAdminKey, async (req, res) => {
    try {
      const { data: leads, error } = await supabase
        .from('sponsor_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        leads
      });

    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get leads'
      });
    }
  });

  // ======= PUBLIC API ROUTES =======

  // GET /api/health - Health check endpoint
  app.get('/api/health', (req, res) => {
    res.set('Content-Type', 'application/json');
    res.json({ ok: true });
  });

  // GET /api/spotlight/public/active - Alias that forwards to /api/spotlight/active
  app.get('/api/spotlight/public/active', async (req, res) => {
    try {
      // Forward request to main /api/spotlight/active endpoint with proper parameters
      const { placement = 'events_banner' } = req.query;
      
      // Create internal request to main endpoint
      const forwardedReq = {
        ...req,
        query: {
          ...req.query,
          slots: placement, // Convert placement to slots parameter
          route: '/events' // Default route for compatibility
        }
      };
      
      // Call the main spotlight active handler
      const mockRes = {
        set: (key: string, value: string) => res.set(key, value),
        json: (data: any) => {
          // Transform the response format from spotlights object to creatives array
          const placementKey = placement as string;
          if (data.ok && data.spotlights && data.spotlights[placementKey]) {
            const creative = data.spotlights[placementKey];
            res.set('Content-Type', 'application/json');
            return res.json({
              ok: true,
              placement: placementKey,
              creatives: [creative]
            });
          } else {
            res.set('Content-Type', 'application/json');
            return res.json({
              ok: true,
              placement: placementKey,
              creatives: []
            });
          }
        },
        status: (code: number) => ({ json: (data: any) => res.status(code).json(data) })
      };
      
      // Forward to main handler
      await spotlightActiveHandler(forwardedReq, mockRes);
      
    } catch (error) {
      console.error('Public spotlight alias error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get active spotlights'
      });
    }
  });

  // Main spotlight active handler (extracted for reuse)
  const spotlightActiveHandler = async (req: any, res: any) => {
    try {
      const { route, slots, placement } = req.query;
      // Support both 'slots' (original) and 'placement' (new) parameters
      let requestedSlots: string[];
      if (placement) {
        requestedSlots = [placement as string];
      } else if (slots) {
        requestedSlots = typeof slots === 'string' ? slots.split(',') : ['events_banner'];
      } else {
        requestedSlots = ['events_banner'];
      }
      
      // Environment flags for placements
      const ENABLE_HOME_MID = process.env.ENABLE_HOME_MID === 'true';
      const ENABLE_EVENTS_BANNER = process.env.ENABLE_EVENTS_BANNER !== 'false'; // true by default
      const ENABLE_HOME_HERO = false; // Always disabled as per requirements
      
      // Filter requested slots based on environment flags
      const allowedSlots = requestedSlots.filter(slot => {
        if (slot === 'home_hero') {
          if (!ENABLE_HOME_HERO && process.env.NODE_ENV === 'development') {
            console.warn(`⚠️  home_hero placement requested but is disabled by default. Set ENABLE_HOME_HERO=true to enable.`);
          }
          return ENABLE_HOME_HERO;
        }
        if (slot === 'home_mid') {
          return ENABLE_HOME_MID;
        }
        if (slot === 'events_banner') {
          return ENABLE_EVENTS_BANNER;
        }
        return true; // Allow unknown slots for future expansion
      });

      if (allowedSlots.length === 0) {
        return res.json({
          ok: true,
          spotlights: {}
        });
      }
      
      const now = new Date().toISOString();

      // Get active campaigns for allowed placements
      const { data: campaigns, error } = await supabase
        .from('sponsor_campaigns')
        .select(`
          *,
          creatives:sponsor_creatives(*)
        `)
        .eq('is_active', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .overlaps('placements', allowedSlots)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Log warnings for campaigns with disabled placements in development
      if (process.env.NODE_ENV === 'development') {
        campaigns.forEach(campaign => {
          if (campaign.placements.includes('home_hero') && !ENABLE_HOME_HERO) {
            console.warn(`⚠️  Campaign "${campaign.name}" includes disabled placement: home_hero`);
          }
        });
      }

      // Select one creative per allowed placement
      const activeSpotlights: any = {};

      for (const slot of allowedSlots) {
        const eligibleCampaigns = campaigns.filter(campaign => 
          campaign.placements.includes(slot) &&
          campaign.creatives.some((c: any) => c.placement === slot)
        );

        if (eligibleCampaigns.length > 0) {
          // Simple round-robin based on current minute for now
          const selectedCampaign = eligibleCampaigns[Date.now() % eligibleCampaigns.length];
          const creative = selectedCampaign.creatives.find((c: any) => c.placement === slot);

          if (creative) {
            activeSpotlights[slot] = {
              campaignId: selectedCampaign.id,
              sponsor_name: selectedCampaign.sponsor_name,
              headline: selectedCampaign.headline,
              subline: selectedCampaign.subline,
              cta_text: selectedCampaign.cta_text,
              click_url: selectedCampaign.click_url,
              is_sponsored: selectedCampaign.is_sponsored,
              tags: selectedCampaign.tags,
              creative: {
                image_desktop_url: creative.image_desktop_url,
                image_mobile_url: creative.image_mobile_url,
                logo_url: creative.logo_url,
                alt: creative.alt
              }
            };
          }
        }
      }

      // Cache for 5 minutes
      res.set('Cache-Control', 'public, s-maxage=300, max-age=300');
      res.json({
        ok: true,
        spotlights: activeSpotlights
      });

    } catch (error) {
      console.error('Get active spotlights error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get active spotlights'
      });
    }
  };

  // GET /api/spotlight/active
  app.get('/api/spotlight/active', spotlightActiveHandler);

  // POST /api/spotlight/leads (for /promote form submissions)
  app.post('/api/spotlight/leads', async (req, res) => {
    try {
      const payload = req.body;

      // Basic validation
      if (!payload.business_name || !payload.contact_name || !payload.email) {
        return res.status(400).json({
          ok: false,
          error: 'Missing required fields: business_name, contact_name, email'
        });
      }

      const { data, error } = await supabase
        .from('sponsor_leads')
        .insert({
          payload: payload,
          status: 'new'
        })
        .select()
        .single();

      if (error) throw error;

      res.set('Content-Type', 'application/json');
      res.json({
        ok: true,
        lead: data,
        message: 'Thank you for your interest! We\'ll be in touch soon.'
      });

    } catch (error) {
      console.error('Lead submission error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to submit lead'
      });
    }
  });

  // GET /api/spotlight/admin/metrics/summary
  app.get('/api/spotlight/admin/metrics/summary', requireAdminKey, async (req, res) => {
    try {
      const { campaignId } = req.query;
      
      if (!campaignId) {
        return res.status(400).json({ ok: false, error: 'campaignId required' });
      }

      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('sponsor_campaigns')
        .select('name, start_at, end_at')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get metrics for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: metrics, error: metricsError } = await supabase
        .from('sponsor_metrics_daily')
        .select('day, placement, impressions, clicks')
        .eq('campaign_id', campaignId)
        .gte('day', thirtyDaysAgo.toISOString().split('T')[0])
        .order('day', { ascending: true });

      if (metricsError) throw metricsError;

      // Calculate totals and daily arrays
      const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
      const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00';

      // Group by day for charts
      const dailyData: Record<string, { date: string; impressions: number; clicks: number }> = {};
      metrics.forEach(m => {
        if (!dailyData[m.day]) {
          dailyData[m.day] = { date: m.day, impressions: 0, clicks: 0 };
        }
        dailyData[m.day].impressions += m.impressions;
        dailyData[m.day].clicks += m.clicks;
      });

      const chartData = Object.values(dailyData).map((d: any) => ({
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions * 100).toFixed(2) : '0.00'
      }));

      res.json({
        ok: true,
        campaign: {
          name: campaign.name,
          start_at: campaign.start_at,
          end_at: campaign.end_at
        },
        totals: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: parseFloat(ctr)
        },
        chartData,
        last7Days: chartData.slice(-7),
        last30Days: chartData
      });

    } catch (error) {
      console.error('Metrics summary error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics summary'
      });
    }
  });

  // POST /api/spotlight/admin/portal/create
  app.post('/api/spotlight/admin/portal/create', requireAdminKey, async (req, res) => {
    try {
      const { campaignId, daysValid = 30 } = req.body;
      
      if (!campaignId) {
        return res.status(400).json({ ok: false, error: 'campaignId required' });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysValid);

      const { data, error } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          campaign_id: campaignId,
          token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        ok: true,
        token: data.token,
        url: `/sponsor/${data.token}`,
        expires_at: data.expires_at
      });

    } catch (error) {
      console.error('Portal create error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create portal token'
      });
    }
  });

  // GET /api/spotlight/portal/:token
  app.get('/api/spotlight/portal/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      // Verify token and get campaign
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          campaign_id,
          expires_at,
          campaign:sponsor_campaigns(name, start_at, end_at)
        `)
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ ok: false, error: 'Invalid or expired token' });
      }

      // Check if token is expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return res.status(401).json({ ok: false, error: 'Token has expired' });
      }

      // Get metrics (reuse the summary logic)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: metrics, error: metricsError } = await supabase
        .from('sponsor_metrics_daily')
        .select('day, placement, impressions, clicks')
        .eq('campaign_id', tokenData.campaign_id)
        .gte('day', thirtyDaysAgo.toISOString().split('T')[0])
        .order('day', { ascending: true });

      if (metricsError) throw metricsError;

      // Calculate summary data
      const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
      const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00';

      // Group by day for charts
      const dailyData: Record<string, { date: string; impressions: number; clicks: number }> = {};
      metrics.forEach(m => {
        if (!dailyData[m.day]) {
          dailyData[m.day] = { date: m.day, impressions: 0, clicks: 0 };
        }
        dailyData[m.day].impressions += m.impressions;
        dailyData[m.day].clicks += m.clicks;
      });

      const chartData = Object.values(dailyData).map((d: any) => ({
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions * 100).toFixed(2) : '0.00'
      }));

      res.json({
        ok: true,
        campaign: {
          name: (tokenData.campaign as any).name,
          start_at: (tokenData.campaign as any).start_at,
          end_at: (tokenData.campaign as any).end_at
        },
        totals: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: parseFloat(ctr)
        },
        chartData,
        last7Days: chartData.slice(-7),
        last30Days: chartData
      });

    } catch (error) {
      console.error('Portal access error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to access portal'
      });
    }
  });

  // POST /api/spotlight/admin/metrics/track - Upsert daily metrics
  app.post('/api/spotlight/admin/metrics/track', requireAdminKey, async (req, res) => {
    try {
      const { campaignId, creativeId, placement, kind, utm } = req.body;
      
      if (!campaignId || !placement || !kind) {
        return res.status(400).json({ ok: false, error: 'campaignId, placement, and kind required' });
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Upsert daily metrics row
      const incrementField = kind === 'impression' ? 'impressions' : 'clicks';
      
      const { data, error } = await supabase
        .from('sponsor_metrics_daily')
        .upsert(
          {
            campaign_id: campaignId,
            creative_id: creativeId || null,
            date: today,
            placement: placement,
            [incrementField]: 1
          },
          {
            onConflict: 'campaign_id,creative_id,date,placement',
            ignoreDuplicates: false
          }
        )
        .select();

      if (error) {
        // If upsert fails due to conflict, try incrementing existing row
        const { error: updateError } = await supabase.rpc('increment_metric', {
          p_campaign_id: campaignId,
          p_creative_id: creativeId,
          p_date: today,
          p_placement: placement,
          p_field: incrementField
        });

        if (updateError) throw updateError;
      }

      res.json({
        ok: true,
        tracked: kind,
        campaign_id: campaignId,
        placement: placement,
        utm: utm
      });

    } catch (error) {
      console.error('Metrics tracking error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to track metric'
      });
    }
  });

  // POST /api/spotlight/admin/leads/status
  app.post('/api/spotlight/admin/leads/status', requireAdminKey, async (req, res) => {
    try {
      const { id, status } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ ok: false, error: 'id and status required' });
      }

      const { data, error } = await supabase
        .from('sponsor_leads')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        ok: true,
        lead: data,
        message: `Lead status updated to ${status}`
      });

    } catch (error) {
      console.error('Lead status update error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update lead status'
      });
    }
  });

  console.log('✓ Spotlight routes added');
}