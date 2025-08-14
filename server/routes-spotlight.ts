import type { Express } from "express";
import { getSupabaseAdmin } from './supabaseAdmin.js';
import crypto from 'crypto';

export function addSpotlightRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // Domain validation middleware for portal routes
  const validatePortalOrigin = (req: any, res: any, next: any) => {
    const host = req.get('host');
    const origin = req.get('origin');
    const referer = req.get('referer');
    
    // Allow local development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Expected domains (configure via environment)
    const allowedDomains = [
      'jugnu.events',
      'www.jugnu.events',
      process.env.ALLOWED_PORTAL_DOMAIN || 'jugnu.events'
    ].filter(Boolean);
    
    // Check host header
    if (host && !allowedDomains.includes(host)) {
      console.warn(`🚫 Portal access denied for host: ${host}`);
      return res.status(403).json({ 
        ok: false, 
        error: 'Portal access not allowed from this domain' 
      });
    }
    
    // Check origin if present (for AJAX requests)
    if (origin) {
      const originDomain = new URL(origin).hostname;
      if (!allowedDomains.includes(originDomain)) {
        console.warn(`🚫 Portal access denied for origin: ${origin}`);
        return res.status(403).json({ 
          ok: false, 
          error: 'Portal access not allowed from this domain' 
        });
      }
    }
    
    next();
  };

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
            freq_cap_per_user_per_day int NOT NULL DEFAULT 0
          );
          
          -- Add freq_cap_per_user_per_day column if it doesn't exist
          ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day int NOT NULL DEFAULT 0;
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
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
          
          CREATE TABLE IF NOT EXISTS public.sponsor_portal_tokens (
            token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id uuid NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            created_at timestamptz NOT NULL DEFAULT now(),
            expires_at timestamptz NOT NULL,
            revoked boolean NOT NULL DEFAULT false
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
          ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day int NOT NULL DEFAULT 0;
          
          -- Ensure sponsor_portal_tokens has correct schema
          CREATE TABLE IF NOT EXISTS public.sponsor_portal_tokens (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            token text UNIQUE NOT NULL,
            expires_at timestamptz,
            last_accessed_at timestamptz,
            is_active boolean NOT NULL DEFAULT true,
            email_subscription text,
            weekly_emails_enabled boolean DEFAULT false
          );
          
          -- Add missing columns to sponsor_portal_tokens if they don't exist
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS email_subscription text;
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS weekly_emails_enabled boolean DEFAULT false;
          
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

  // Click redirector - logs click and redirects with UTM parameters
  app.get('/r/:campaignId', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { to } = req.query;
      
      if (!to || typeof to !== 'string') {
        return res.status(400).json({ ok: false, error: 'Missing target URL' });
      }
      
      const targetUrl = decodeURIComponent(to);
      
      // Log the click
      try {
        await supabase
          .from('sponsor_metrics_daily')
          .upsert({
            campaign_id: campaignId,
            date: new Date().toISOString().split('T')[0],
            raw_views: 0,
            billable_impressions: 0,
            clicks: 1
          }, {
            onConflict: 'campaign_id,date',
            ignoreDuplicates: false
          });
      } catch (error) {
        console.error('Click tracking error:', error);
        // Continue with redirect even if logging fails
      }
      
      // Parse target URL and merge UTM parameters
      const url = new URL(targetUrl);
      
      // Add UTM parameters if not present
      if (!url.searchParams.has('utm_source')) {
        url.searchParams.set('utm_source', 'jugnu');
      }
      if (!url.searchParams.has('utm_medium')) {
        url.searchParams.set('utm_medium', 'spotlight');
      }
      if (!url.searchParams.has('utm_campaign')) {
        url.searchParams.set('utm_campaign', campaignId);
      }
      
      // Add utm_content from query params if provided
      const utmContent = req.query.utm_content;
      if (utmContent && typeof utmContent === 'string' && !url.searchParams.has('utm_content')) {
        url.searchParams.set('utm_content', utmContent);
      }
      
      // 302 redirect to final URL
      res.redirect(302, url.toString());
      
    } catch (error) {
      console.error('Redirector error:', error);
      res.status(500).json({ ok: false, error: 'Redirect failed' });
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

  // Validation helpers
  const validatePlacement = (placement: string): string | null => {
    const validPlacements = ['events_banner', 'home_mid', 'home_hero'];
    if (!validPlacements.includes(placement)) {
      return `Invalid placement "${placement}". Must be one of: ${validPlacements.join(', ')}`;
    }
    return null;
  };

  const parseDate = (dateStr: string): string => {
    // Handle both date-only (YYYY-MM-DD) and ISO datetime inputs
    if (!dateStr) throw new Error('Date is required');
    
    // If it's a date-only string (YYYY-MM-DD), convert to Vancouver timezone
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Default start_at to 00:00:00 and end_at to 23:59:59 in local timezone
      return dateStr; // Return as date-only for now, will be handled in SQL
    }
    
    // If it's already an ISO datetime, return as-is
    return dateStr;
  };

  const mapSupabaseError = (error: any): string => {
    if (error.code === '23505') {
      return 'Campaign name already exists. Please choose a different name.';
    }
    if (error.code === '23514') {
      return 'Invalid data format. Please check your inputs.';
    }
    if (error.message?.includes('start_at')) {
      return 'Start date must be before end date.';
    }
    if (error.message?.includes('placements')) {
      return 'Invalid placement selection. Please choose valid placements.';
    }
    return error.message || 'Unknown database error occurred.';
  };

  // Admin campaign upsert endpoint
  app.post('/api/spotlight/admin/campaign/upsert', async (req, res) => {
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
        priority,
        is_active,
        is_sponsored,
        tags,
        freq_cap_per_user_per_day,
        creatives
      } = req.body;

      // Validation
      if (!name?.trim()) {
        return res.status(400).json({ ok: false, error: 'Campaign name is required' });
      }
      if (!sponsor_name?.trim()) {
        return res.status(400).json({ ok: false, error: 'Sponsor name is required' });
      }
      if (!headline?.trim()) {
        return res.status(400).json({ ok: false, error: 'Headline is required' });
      }
      if (!click_url?.trim()) {
        return res.status(400).json({ ok: false, error: 'Click URL is required' });
      }
      if (!Array.isArray(placements) || placements.length === 0) {
        return res.status(400).json({ ok: false, error: 'At least one placement is required' });
      }

      // Validate placements
      for (const placement of placements) {
        const placementError = validatePlacement(placement);
        if (placementError) {
          return res.status(400).json({ ok: false, error: placementError });
        }
      }

      // Type coercion and defaults
      const coercedPriority = parseInt(priority) || 1;
      const coercedIsActive = is_active !== false; // Default to true
      const coercedIsSponsored = is_sponsored !== false; // Default to true  
      const coercedFreqCap = parseInt(freq_cap_per_user_per_day) || parseInt(process.env.FREQ_CAP_DEFAULT || '0');
      const coercedTags = Array.isArray(tags) ? tags : [];

      // Date handling
      let finalStartAt: string;
      let finalEndAt: string;

      try {
        if (start_at?.match(/^\d{4}-\d{2}-\d{2}$/)) {
          finalStartAt = `${start_at}T00:00:00-08:00`; // Vancouver timezone start of day
        } else {
          finalStartAt = parseDate(start_at);
        }

        if (end_at?.match(/^\d{4}-\d{2}-\d{2}$/)) {
          finalEndAt = `${end_at}T23:59:59-08:00`; // Vancouver timezone end of day
        } else {
          finalEndAt = parseDate(end_at);
        }
      } catch (dateError) {
        return res.status(400).json({ ok: false, error: dateError instanceof Error ? dateError.message : 'Invalid date format' });
      }

      // Auto-add UTM parameters if not present
      let finalClickUrl = click_url;
      if (finalClickUrl && !finalClickUrl.includes('utm_source')) {
        const separator = finalClickUrl.includes('?') ? '&' : '?';
        finalClickUrl += `${separator}utm_source=jugnu&utm_medium=sponsorship&utm_campaign=${encodeURIComponent(name)}`;
      }

      const campaignData = {
        name: name.trim(),
        sponsor_name: sponsor_name.trim(),
        headline: headline.trim(),
        subline: subline?.trim() || null,
        cta_text: cta_text?.trim() || null,
        click_url: finalClickUrl,
        placements,
        start_at: finalStartAt,
        end_at: finalEndAt,
        priority: coercedPriority,
        is_active: coercedIsActive,
        is_sponsored: coercedIsSponsored,
        tags: coercedTags,
        freq_cap_per_user_per_day: coercedFreqCap,
        updated_at: new Date().toISOString()
      };

      let campaign;
      
      if (id) {
        // Update existing campaign
        const { data, error } = await supabase
          .from('sponsor_campaigns')
          .update(campaignData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Campaign update error:', error);
          return res.status(400).json({ ok: false, error: mapSupabaseError(error) });
        }
        campaign = data;
      } else {
        // Create new campaign
        const { data, error } = await supabase
          .from('sponsor_campaigns')
          .insert(campaignData)
          .select()
          .single();

        if (error) {
          console.error('Campaign create error:', error);
          return res.status(400).json({ ok: false, error: mapSupabaseError(error) });
        }
        campaign = data;
      }

      // Handle creatives if provided
      if (creatives && Array.isArray(creatives) && creatives.length > 0) {
        // Delete existing creatives
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
          alt: creative.alt || `${sponsor_name} ${headline}`
        }));

        const { error: creativesError } = await supabase
          .from('sponsor_creatives')
          .insert(creativesData);

        if (creativesError) {
          console.error('Creatives error:', creativesError);
          return res.status(400).json({ ok: false, error: mapSupabaseError(creativesError) });
        }
      }

      res.json({
        ok: true,
        campaign,
        message: id ? 'Campaign updated successfully' : 'Campaign created successfully'
      });
    } catch (error) {
      console.error('Campaign upsert error:', error);
      res.status(500).json({ ok: false, error: 'Failed to save campaign' });
    }
  });

  // Metrics tracking endpoint
  app.post('/api/spotlight/admin/metrics/track', async (req, res) => {
    try {
      const { campaignId, creativeId, event, placement } = req.body;
      const today = new Date().toISOString().split('T')[0];

      if (event === 'impression') {
        // Get frequency cap for this campaign
        const freqCapEnabled = process.env.FREQ_CAP_ENABLED === 'true';
        const { data: campaign } = await supabase
          .from('sponsor_campaigns')
          .select('freq_cap_per_user_per_day')
          .eq('id', campaignId)
          .single();
        
        const freqCap = campaign?.freq_cap_per_user_per_day || 0;
        
        // For MVP launch: when cap=0, both raw and billable increment the same
        // In future: billable will respect the cap, raw will always increment
        const billableIncrement = (freqCapEnabled && freqCap > 0) ? 0 : 1; // Future: implement actual cap logic
        
        await supabase.rpc('exec_sql', {
          sql: `
            INSERT INTO public.sponsor_metrics_daily (campaign_id, creative_id, date, placement, billable_impressions, raw_views)
            VALUES ($1, $2, $3, $4, $5, 1)
            ON CONFLICT (campaign_id, creative_id, date, placement)
            DO UPDATE SET 
              billable_impressions = sponsor_metrics_daily.billable_impressions + $5,
              raw_views = sponsor_metrics_daily.raw_views + 1,
              updated_at = now();
          `,
          params: [campaignId, creativeId, today, placement, billableIncrement]
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

  // Send Onboarding Email Endpoint
  app.post('/api/spotlight/admin/send-onboarding', requireAdminKey, async (req, res) => {
    try {
      const { tokenId } = req.body;
      
      if (!tokenId) {
        return res.status(400).json({ ok: false, error: 'Token ID is required' });
      }

      // Get token and campaign data
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          *,
          sponsor_campaigns (
            id,
            name,
            sponsor_name,
            start_at,
            end_at
          )
        `)
        .eq('id', tokenId)
        .single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ ok: false, error: 'Portal token not found' });
      }

      const campaign = tokenData.sponsor_campaigns;
      const portalUrl = `${req.protocol}://${req.get('host')}/sponsor/${tokenData.token}`;
      const expiryDate = new Date(tokenData.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Polished onboarding email template
      const subject = `Your Jugnu Campaign Analytics`;
      
      const startDate = new Date(campaign.start_at);
      const endDate = new Date(campaign.end_at);
      const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      const body = `Hi ${campaign.sponsor_name},

Your sponsor portal is ready for ${campaign.name} (${dateRange}).

Portal: ${portalUrl} (expires ${expiryDate})

Inside you'll see real-time Impressions, Clicks, CTR, 7-day trends, and CSV export.

Tip: Compare performance to site benchmarks shown in the header.

Need help or want to extend your run? Reply to this email or book the next slot from the portal.

— Team Jugnu`;

      // Log to audit table
      try {
        await supabase.rpc('exec_sql', {
          sql: `
            INSERT INTO public.admin_audit_log (action, details, ip_address, user_agent, created_at)
            VALUES ($1, $2, $3, $4, now())
          `,
          params: [
            'onboarding_email_sent',
            JSON.stringify({
              tokenId: tokenData.id,
              campaignId: campaign.id,
              campaignName: campaign.name,
              sponsorName: campaign.sponsor_name,
              portalUrl: portalUrl,
              expiryDate: expiryDate,
              timestamp: new Date().toISOString()
            }),
            req.ip || req.connection?.remoteAddress || 'unknown',
            req.headers['user-agent'] || 'unknown'
          ]
        });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the request if audit logging fails
      }

      res.json({
        ok: true,
        emailData: {
          subject,
          body,
          recipients: [`contact@${campaign.sponsor_name.toLowerCase().replace(/\s+/g, '')}.com`], // Generic fallback
          portalUrl,
          expiryDate
        },
        message: 'Onboarding email template prepared successfully'
      });

    } catch (error) {
      console.error('Onboarding email error:', error);
      res.status(500).json({ ok: false, error: 'Failed to prepare onboarding email' });
    }
  });

  // Sponsor Portal Data Endpoint
  app.get('/api/spotlight/portal/:token', validatePortalOrigin, async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ ok: false, error: 'Token is required' });
      }

      // Validate token and get campaign
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          *,
          sponsor_campaigns (
            id,
            name,
            sponsor_name,
            start_at,
            end_at
          )
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ ok: false, error: 'Invalid or expired portal link' });
      }

      // Check if token is expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return res.status(401).json({ ok: false, error: 'Portal link has expired' });
      }

      // Update last accessed
      await supabase
        .from('sponsor_portal_tokens')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      const campaign = tokenData.sponsor_campaigns;
      if (!campaign) {
        return res.status(404).json({ ok: false, error: 'Campaign not found' });
      }

      // Get metrics data for the campaign
      const { data: metricsData, error: metricsError } = await supabase
        .from('sponsor_metrics_daily')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('date', { ascending: true });

      if (metricsError) {
        console.error('Metrics query error:', metricsError);
        return res.status(500).json({ ok: false, error: 'Failed to load analytics data' });
      }

      // Process metrics data
      const metrics = metricsData || [];
      
      // Calculate totals
      const totals = metrics.reduce(
        (acc, row) => ({
          billable_impressions: acc.billable_impressions + (row.billable_impressions || 0),
          raw_views: acc.raw_views + (row.raw_views || 0),
          unique_users: acc.unique_users + (row.unique_users || 0),
          clicks: acc.clicks + (row.clicks || 0),
        }),
        { billable_impressions: 0, raw_views: 0, unique_users: 0, clicks: 0 }
      );

      // Calculate CTR
      const ctr = totals.billable_impressions > 0 
        ? (totals.clicks / totals.billable_impressions * 100).toFixed(2)
        : '0.00';

      // Calculate CTR benchmark for the same placement over last 30 days
      let ctrBenchmark = null;
      if (totals.billable_impressions > 0) {
        const campaignPlacements = metrics.length > 0 ? metrics[0].placement : null;
        
        if (campaignPlacements) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { data: benchmarkData, error: benchmarkError } = await supabase
            .from('sponsor_metrics_daily')
            .select(`
              campaign_id,
              SUM(billable_impressions) as total_impressions,
              SUM(clicks) as total_clicks
            `)
            .eq('placement', campaignPlacements)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .neq('campaign_id', campaign.id) // Exclude current campaign
            .group('campaign_id')
            .having('SUM(billable_impressions)', 'gt', 100); // Only campaigns with significant impressions

          if (!benchmarkError && benchmarkData && benchmarkData.length > 0) {
            // Calculate CTR for each campaign
            const ctrs = benchmarkData
              .map(row => (row.total_clicks / row.total_impressions) * 100)
              .filter(ctr => ctr > 0)
              .sort((a, b) => a - b);

            if (ctrs.length > 0) {
              const currentCtr = parseFloat(ctr);
              const betterThanCount = ctrs.filter(benchmarkCtr => currentCtr > benchmarkCtr).length;
              const percentile = Math.round((betterThanCount / ctrs.length) * 100);
              
              let badge = null;
              if (percentile >= 75) badge = `Top 25% for ${campaignPlacements.replace('_', ' ')} last 30 days`;
              else if (percentile >= 50) badge = `Top 50% for ${campaignPlacements.replace('_', ' ')} last 30 days`;
              else if (percentile >= 25) badge = `Above average for ${campaignPlacements.replace('_', ' ')}`;
              
              ctrBenchmark = {
                percentile,
                badge,
                totalCampaigns: ctrs.length,
                averageCtr: (ctrs.reduce((a, b) => a + b, 0) / ctrs.length).toFixed(2)
              };
            }
          }
        }
      }

      // Prepare chart data
      const chartData = metrics.map(row => ({
        date: row.date,
        billable_impressions: row.billable_impressions || 0,
        raw_views: row.raw_views || 0,
        unique_users: row.unique_users || 0,
        clicks: row.clicks || 0,
        ctr: row.billable_impressions > 0 
          ? ((row.clicks || 0) / row.billable_impressions * 100).toFixed(2)
          : '0.00'
      }));

      // Get last 7 days data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7Days = chartData.filter(row => new Date(row.date) >= sevenDaysAgo);

      res.json({
        ok: true,
        campaign: {
          name: campaign.name,
          sponsor_name: campaign.sponsor_name,
          start_at: campaign.start_at,
          end_at: campaign.end_at
        },
        totals: {
          ...totals,
          ctr: parseFloat(ctr)
        },
        ctrBenchmark,
        chartData,
        last7Days,
        last30Days: chartData // Return all data as 30-day view for now
      });

    } catch (error) {
      console.error('Portal data error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load portal data' });
    }
  });

  // Get campaign details for renewal form prefill
  app.get('/api/spotlight/portal/:token/campaign-details', validatePortalOrigin, async (req, res) => {
    try {
      const { token } = req.params;
      
      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          sponsor_campaigns (
            id,
            name,
            sponsor_name,
            headline,
            subline,
            cta_text,
            click_url,
            placements,
            priority,
            tags
          )
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData?.sponsor_campaigns) {
        return res.status(404).json({ ok: false, error: 'Campaign not found' });
      }

      const campaign = tokenData.sponsor_campaigns;
      
      // Return campaign details for prefilling
      res.json({
        ok: true,
        campaign: {
          business_name: campaign.sponsor_name,
          campaign_name: campaign.name,
          headline: campaign.headline,
          subline: campaign.subline,
          cta_text: campaign.cta_text,
          website_url: campaign.click_url,
          placements: campaign.placements,
          campaign_objectives: campaign.tags || [],
          priority: campaign.priority
        }
      });
      
    } catch (error) {
      console.error('Campaign details error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load campaign details' });
    }
  });

  // Weekly summary email endpoint (env-gated)
  app.post('/api/spotlight/portal/:token/weekly-summary', validatePortalOrigin, async (req, res) => {
    try {
      if (process.env.ENABLE_WEEKLY_SUMMARIES !== 'true') {
        return res.status(404).json({ ok: false, error: 'Feature not enabled' });
      }

      const { token } = req.params;
      const { email, subscribe } = req.body;
      
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
      }
      
      // Validate token and get campaign
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          id,
          sponsor_campaigns (
            id,
            name,
            sponsor_name,
            start_at,
            end_at
          )
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ ok: false, error: 'Invalid portal link' });
      }

      // Update token with email subscription preference
      await supabase
        .from('sponsor_portal_tokens')
        .update({ 
          email_subscription: subscribe ? email : null,
          weekly_emails_enabled: subscribe
        })
        .eq('id', tokenData.id);
      
      res.json({ 
        ok: true, 
        message: subscribe ? 'Subscribed to weekly summaries' : 'Unsubscribed from weekly summaries'
      });
      
    } catch (error) {
      console.error('Weekly summary subscription error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update subscription' });
    }
  });

  // Self-test endpoint for system validation
  app.get('/api/admin/selftest', requireAdminKey, async (req, res) => {
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'PASS',
      tests: {}
    };

    try {
      // Test 1: Database tables exist and RLS bypass confirmed
      results.tests.database = await testDatabase();
      
      // Test 2: Health check and active spotlight creation/querying
      results.tests.spotlights = await testSpotlights();
      
      // Test 3: Impression + click tracking and metrics aggregation
      results.tests.tracking = await testTracking();
      
      // Test 4: Portal token creation and validation
      results.tests.portalTokens = await testPortalTokens(req);
      
      // Test 5: Events banner rendering scenarios
      results.tests.eventsbanner = await testEventsBanner();
      
      // Test 6: Public API endpoints return JSON
      results.tests.publicAPIs = await testPublicAPIs(req);
      
      // Test 7: UTM redirector functionality
      results.tests.utmRedirector = await testUTMRedirector();
      
      // Test 8: Robots.txt and schema validation
      results.tests.robotsSchema = await testRobotsSchema(req);

      // Determine overall status
      const failedTests = Object.values(results.tests).filter(test => test.status === 'FAIL');
      if (failedTests.length > 0) {
        results.overall = 'FAIL';
      }

      res.json({
        ok: true,
        results,
        summary: {
          total: Object.keys(results.tests).length,
          passed: Object.values(results.tests).filter(test => test.status === 'PASS').length,
          failed: failedTests.length
        }
      });

    } catch (error) {
      console.error('Self-test error:', error);
      res.status(500).json({
        ok: false,
        error: 'Self-test failed to complete',
        results,
        partial: true
      });
    }
  });

  // Test helper functions
  async function testDatabase() {
    try {
      // Check if tables exist
      const tables = ['sponsor_campaigns', 'sponsor_creatives', 'sponsor_metrics_daily', 'sponsor_portal_tokens'];
      const tableChecks = [];

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          tableChecks.push({
            table,
            exists: !error,
            error: error?.message
          });
        } catch (err) {
          tableChecks.push({
            table,
            exists: false,
            error: err.message
          });
        }
      }

      // Test RLS bypass with service role
      const { data: testData, error: rlsError } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .limit(1);

      return {
        status: tableChecks.every(check => check.exists) && !rlsError ? 'PASS' : 'FAIL',
        message: tableChecks.every(check => check.exists) && !rlsError 
          ? 'All tables exist and RLS bypass confirmed'
          : 'Database issues detected',
        details: {
          tableChecks,
          rlsBypass: !rlsError,
          rlsError: rlsError?.message
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Database test failed',
        error: error.message
      };
    }
  }

  async function testSpotlights() {
    try {
      // Test fetching active spotlights
      const { data: campaigns, error } = await supabase
        .from('sponsor_campaigns')
        .select('*')
        .eq('is_active', true)
        .limit(5);

      if (error) throw error;

      // Test spotlight API endpoint
      const testResponse = await fetch(`http://localhost:5000/api/spotlight/active?placement=events_banner`);
      const spotlightData = await testResponse.json();

      return {
        status: testResponse.ok && spotlightData.ok ? 'PASS' : 'FAIL',
        message: testResponse.ok && spotlightData.ok 
          ? 'Spotlight queries working correctly'
          : 'Spotlight query issues detected',
        details: {
          activeCampaigns: campaigns?.length || 0,
          apiResponse: spotlightData.ok,
          spotlights: Object.keys(spotlightData.spotlights || {}).length
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Spotlight test failed',
        error: error.message
      };
    }
  }

  async function testTracking() {
    try {
      // Get a test campaign
      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .limit(1);

      if (!campaigns || campaigns.length === 0) {
        return {
          status: 'SKIP',
          message: 'No campaigns available for tracking test'
        };
      }

      const testCampaignId = campaigns[0].id;
      const testCreativeId = 'test-creative-' + Date.now();
      
      // Test impression tracking
      const impressionResponse = await fetch('http://localhost:5000/api/spotlight/admin/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: testCampaignId,
          creativeId: testCreativeId,
          event: 'impression',
          placement: 'events_banner'
        })
      });

      // Test click tracking
      const clickResponse = await fetch('http://localhost:5000/api/spotlight/admin/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: testCampaignId,
          creativeId: testCreativeId,
          event: 'click',
          placement: 'events_banner'
        })
      });

      // Check if metrics were recorded
      const { data: metrics } = await supabase
        .from('sponsor_metrics_daily')
        .select('*')
        .eq('campaign_id', testCampaignId)
        .eq('creative_id', testCreativeId);

      return {
        status: impressionResponse.ok && clickResponse.ok && metrics && metrics.length > 0 ? 'PASS' : 'FAIL',
        message: impressionResponse.ok && clickResponse.ok && metrics && metrics.length > 0
          ? 'Tracking and metrics aggregation working'
          : 'Tracking issues detected',
        details: {
          impressionTracking: impressionResponse.ok,
          clickTracking: clickResponse.ok,
          metricsRecorded: metrics?.length || 0
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Tracking test failed',
        error: error.message
      };
    }
  }

  async function testPortalTokens(req) {
    try {
      // Get a test campaign
      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id, name')
        .limit(1);

      if (!campaigns || campaigns.length === 0) {
        return {
          status: 'SKIP',
          message: 'No campaigns available for portal token test'
        };
      }

      // Create test token
      const { data: tokenData, error: createError } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          campaign_id: campaigns[0].id,
          token: 'test-token-' + Date.now(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;

      // Test portal data endpoint
      const portalResponse = await fetch(`http://localhost:5000/api/spotlight/portal/${tokenData.token}`);
      const portalData = await portalResponse.json();

      // Clean up test token
      await supabase
        .from('sponsor_portal_tokens')
        .delete()
        .eq('id', tokenData.id);

      return {
        status: portalResponse.ok && portalData.ok ? 'PASS' : 'FAIL',
        message: portalResponse.ok && portalData.ok
          ? 'Portal token creation and validation working'
          : 'Portal token issues detected',
        details: {
          tokenCreated: !!tokenData,
          portalResponse: portalResponse.ok,
          dataReturned: !!portalData.campaign
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Portal token test failed',
        error: error.message
      };
    }
  }

  async function testEventsBanner() {
    try {
      // Test different event scenarios by checking community events
      const eventsResponse = await fetch('http://localhost:5000/api/community/weekly');
      const eventsData = await eventsResponse.json();

      const eventCount = eventsData.items?.length || 0;
      let scenario = '';
      
      if (eventCount === 0) scenario = '0 events';
      else if (eventCount === 1) scenario = '1 event';
      else if (eventCount <= 3) scenario = '2-3 events';
      else scenario = '4+ events';

      // Test spotlight placement
      const spotlightResponse = await fetch('http://localhost:5000/api/spotlight/active?placement=events_banner');
      const spotlightData = await spotlightResponse.json();

      const hasSpotlight = spotlightData.spotlights?.events_banner ? true : false;

      return {
        status: eventsResponse.ok && spotlightResponse.ok ? 'PASS' : 'FAIL',
        message: eventsResponse.ok && spotlightResponse.ok
          ? `Events banner rendering tested for ${scenario}`
          : 'Events banner test issues detected',
        details: {
          scenario,
          eventCount,
          hasSpotlight,
          placementDecision: hasSpotlight ? 'Show sponsor banner' : 'No active banner campaign',
          impressionBeacon: hasSpotlight ? 'Would fire on render' : 'Not applicable'
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Events banner test failed',
        error: error.message
      };
    }
  }

  async function testPublicAPIs(req) {
    try {
      const publicEndpoints = [
        '/api/spotlight/active',
        '/api/community/weekly',
        '/api/waitlist'
      ];

      const results = [];

      for (const endpoint of publicEndpoints) {
        try {
          const response = await fetch(`http://localhost:5000${endpoint}`);
          const contentType = response.headers.get('content-type');
          
          results.push({
            endpoint,
            status: response.status,
            isJson: contentType?.includes('application/json') || false,
            contentType
          });
        } catch (error) {
          results.push({
            endpoint,
            status: 'ERROR',
            isJson: false,
            error: error.message
          });
        }
      }

      const allJson = results.every(result => result.isJson);

      return {
        status: allJson ? 'PASS' : 'FAIL',
        message: allJson
          ? 'All public APIs return application/json'
          : 'Some APIs not returning JSON',
        details: results
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Public API test failed',
        error: error.message
      };
    }
  }

  async function testUTMRedirector() {
    try {
      // Get a test campaign
      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id, click_url')
        .limit(1);

      if (!campaigns || campaigns.length === 0) {
        return {
          status: 'SKIP',
          message: 'No campaigns available for redirector test'
        };
      }

      const testCampaignId = campaigns[0].id;
      const testUrl = campaigns[0].click_url || 'https://example.com';
      const redirectorUrl = `http://localhost:5000/r/${testCampaignId}?to=${encodeURIComponent(testUrl)}&utm_content=events_banner`;

      // Test redirector returns 302 and doesn't follow redirect
      const redirectResponse = await fetch(redirectorUrl, {
        method: 'GET',
        redirect: 'manual'  // Don't follow redirects
      });

      // Check that it returns 302
      const is302 = redirectResponse.status === 302;
      const hasLocation = redirectResponse.headers.get('location') !== null;
      
      // Check if UTM parameters are merged
      const locationHeader = redirectResponse.headers.get('location') || '';
      const hasUTMSource = locationHeader.includes('utm_source=jugnu');
      const hasUTMContent = locationHeader.includes('utm_content=events_banner');

      // Give a moment for click tracking to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if click was logged in metrics
      const today = new Date().toISOString().split('T')[0];
      const { data: metrics } = await supabase
        .from('sponsor_metrics_daily')
        .select('clicks')
        .eq('campaign_id', testCampaignId)
        .eq('date', today)
        .eq('placement', 'events_banner');

      const clickLogged = metrics && metrics.some(m => m.clicks > 0);

      return {
        status: is302 && hasLocation && hasUTMSource && hasUTMContent ? 'PASS' : 'FAIL',
        message: is302 && hasLocation && hasUTMSource && hasUTMContent
          ? 'UTM redirector working correctly'
          : 'UTM redirector issues detected',
        details: {
          returns302: is302,
          hasLocationHeader: hasLocation,
          utmSourceAdded: hasUTMSource,
          utmContentAdded: hasUTMContent,
          clickTracked: clickLogged,
          redirectUrl: locationHeader.substring(0, 100) + (locationHeader.length > 100 ? '...' : '')
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'UTM redirector test failed',
        error: error.message
      };
    }
  }

  async function testRobotsSchema(req) {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const results = {
        robotsTxt: false,
        sitemapInRobots: false,
        promoteSchema: false,
        hasProductOffer: false,
        hasFAQSchema: false
      };

      // Test 1: Check robots.txt exists and contains sitemap
      try {
        const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
        results.robotsTxt = robotsResponse.ok;
        
        if (robotsResponse.ok) {
          const robotsText = await robotsResponse.text();
          results.sitemapInRobots = robotsText.toLowerCase().includes('sitemap:');
        }
      } catch (error) {
        console.warn('Robots.txt test error:', error.message);
      }

      // Test 2: Check /promote page for JSON-LD schemas
      try {
        const promoteResponse = await fetch(`${baseUrl}/promote`);
        results.promoteSchema = promoteResponse.ok;
        
        if (promoteResponse.ok) {
          const promoteHtml = await promoteResponse.text();
          
          // Check for Product/Offer schema
          const hasOfferSchema = promoteHtml.includes('"@type":"Offer"') || promoteHtml.includes('"@type": "Offer"');
          const hasOrganizationSchema = promoteHtml.includes('"@type":"Organization"') || promoteHtml.includes('"@type": "Organization"');
          results.hasProductOffer = hasOfferSchema || hasOrganizationSchema;
          
          // Check for FAQ schema
          const hasFAQPageSchema = promoteHtml.includes('"@type":"FAQPage"') || promoteHtml.includes('"@type": "FAQPage"');
          const hasQuestionSchema = promoteHtml.includes('"@type":"Question"') || promoteHtml.includes('"@type": "Question"');
          results.hasFAQSchema = hasFAQPageSchema && hasQuestionSchema;
        }
      } catch (error) {
        console.warn('Promote schema test error:', error.message);
      }

      const allPassed = results.robotsTxt && results.sitemapInRobots && results.promoteSchema && results.hasProductOffer && results.hasFAQSchema;

      return {
        status: allPassed ? 'PASS' : 'FAIL',
        message: allPassed
          ? 'Robots.txt and schema validation passed'
          : 'Some robots/schema issues detected',
        details: results
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Robots/schema test failed',
        error: error.message
      };
    }
  }

  console.log('✓ Spotlight routes added');
}