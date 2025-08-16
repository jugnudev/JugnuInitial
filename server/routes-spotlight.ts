import type { Express } from "express";
import { getSupabaseAdmin } from './supabaseAdmin.js';
import crypto from 'crypto';

export function addSpotlightRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // Domain validation middleware for portal routes
  const validatePortalOrigin = (req: any, res: any, next: any) => {
    const host = req.get('host');
    const origin = req.get('origin');
    
    // In development, use permissive defaults or skip checks entirely
    if (process.env.NODE_ENV !== 'production') {
      // Development defaults: .replit.dev,localhost,127.0.0.1
      const devDefaults = '.replit.dev,localhost,127.0.0.1';
      const allowedDomains = (process.env.ALLOWED_PORTAL_DOMAIN || devDefaults)
        .split(',')
        .map(domain => domain.trim())
        .filter(Boolean);
      
      // Check if host matches any allowed domain (supports wildcards like *.replit.dev)
      const isAllowed = allowedDomains.some(allowed => {
        if (allowed.startsWith('*.')) {
          const suffix = allowed.substring(2);
          return host?.endsWith(suffix);
        }
        if (allowed.startsWith('.')) {
          // Support .replit.dev format - check if host ends with the domain
          return host?.endsWith(allowed);
        }
        return host === allowed || host?.includes(allowed);
      });
      
      if (isAllowed) {
        return next();
      }
      
      console.log(`🔍 Dev mode - allowing host: ${host} (would be blocked in production)`);
      return next(); // Allow in development even if not in the list
    }
    
    // Production: strict domain checking
    const allowedDomains = (process.env.ALLOWED_PORTAL_DOMAIN || 'jugnu.events')
      .split(',')
      .map(domain => domain.trim())
      .filter(Boolean);
    
    // Check if host matches any allowed domain (supports wildcards like *.replit.dev)
    const isAllowed = allowedDomains.some(allowed => {
      if (allowed.startsWith('*.')) {
        const suffix = allowed.substring(2);
        return host?.endsWith(suffix);
      }
      if (allowed.startsWith('.')) {
        return host?.endsWith(allowed);
      }
      return host === allowed;
    });
    
    if (!isAllowed) {
      console.warn(`🚫 Portal access denied for host: ${host}`);
      return res.status(403).json({ 
        ok: false, 
        error: 'Portal access not allowed from this domain' 
      });
    }
    
    if (origin) {
      const originDomain = new URL(origin).hostname;
      const originAllowed = allowedDomains.some(allowed => {
        if (allowed.startsWith('*.')) {
          const suffix = allowed.substring(2);
          return originDomain.endsWith(suffix);
        }
        if (allowed.startsWith('.')) {
          return originDomain.endsWith(allowed);
        }
        return originDomain === allowed;
      });
      
      if (!originAllowed) {
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
            -- freq_cap_per_user_per_day int NOT NULL DEFAULT 0 -- Temporarily disabled
          );
          
          -- Temporarily disabled freq_cap_per_user_per_day column due to schema cache issue
          -- ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day int NOT NULL DEFAULT 0;
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

      // Create sponsor_portal_tokens table with correct schema - force cache refresh
      await supabase.rpc('exec_sql', {
        sql: `
          BEGIN;
          
          DROP TABLE IF EXISTS public.sponsor_portal_tokens CASCADE;
          
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
          
          CREATE TABLE public.sponsor_portal_tokens (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id uuid NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            token text NOT NULL UNIQUE,
            is_active boolean NOT NULL DEFAULT true,
            expires_at timestamptz NOT NULL,
            emailed_to text,
            email_sent_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          
          CREATE INDEX idx_spt_campaign ON public.sponsor_portal_tokens(campaign_id);
          CREATE INDEX idx_spt_active ON public.sponsor_portal_tokens(is_active);
          
          COMMIT;
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
    const expectedKey = process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY || 'jugnu-admin-dev-2025';
    
    // Debug logging for admin key mismatch
    if (!adminKey || adminKey !== expectedKey) {
      console.warn(`Admin key mismatch: received "${adminKey?.substring(0, 8)}...", expected "${expectedKey?.substring(0, 8)}..."`);
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
          -- Temporarily disabled due to schema cache issue
          -- ALTER TABLE public.sponsor_campaigns ADD COLUMN IF NOT EXISTS freq_cap_per_user_per_day int NOT NULL DEFAULT 0;
          
          -- Add missing columns to sponsor_portal_tokens if they don't exist
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS emailed_to text;
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS email_subscription text;
          ALTER TABLE public.sponsor_portal_tokens ADD COLUMN IF NOT EXISTS weekly_emails_enabled boolean DEFAULT false;
          
          -- Force recreate sponsor_portal_tokens using direct DDL
          BEGIN;
          
          DROP TABLE IF EXISTS public.sponsor_portal_tokens CASCADE;
          
          CREATE EXTENSION IF NOT EXISTS pgcrypto;
          
          CREATE TABLE public.sponsor_portal_tokens (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id uuid NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
            token text NOT NULL UNIQUE,
            is_active boolean NOT NULL DEFAULT true,
            expires_at timestamptz NOT NULL,
            emailed_to text,
            email_sent_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          
          CREATE INDEX idx_spt_campaign ON public.sponsor_portal_tokens(campaign_id);
          CREATE INDEX idx_spt_active ON public.sponsor_portal_tokens(is_active);
          
          -- Refresh PostgREST schema cache
          NOTIFY pgrst, 'reload schema';
          
          COMMIT;
          
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
        // freq_cap_per_user_per_day, // Schema cache issue - disable until PostgREST refreshes
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

      // Type coercion and defaults - handle both frequencyCap and freq_cap_per_user_per_day
      const coercedPriority = parseInt(priority) || 1;
      const coercedIsActive = is_active !== false; // Default to true
      const coercedIsSponsored = is_sponsored !== false; // Default to true  
      // Accept frequencyCap (from UI) - schema cache blocking freq_cap_per_user_per_day
      const frequencyCap = req.body.frequencyCap;
      const coercedFreqCap = parseInt(frequencyCap) || 0; // Default to unlimited
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
        // Skip freq_cap_per_user_per_day due to schema cache issue
        // Will use default of 0 (unlimited) in frontend
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

  // Metrics tracking endpoint - fixed to use "date" column and proper upsert
  app.post('/api/spotlight/admin/metrics/track', async (req, res) => {
    try {
      const { campaignId, placement = 'events_banner', eventType, userId } = req.body;
      // Note: Using database timezone function instead of JS for consistency
      
      // Use service-role client for direct database access
      const serviceRoleClient = getSupabaseAdmin();
      
      if (eventType === 'impression') {
        // Skip frequency cap check due to schema cache issue - default to unlimited
        let freqCap = 0; // 0 = unlimited impressions
        
        // For MVP: when cap=0, both raw and billable increment the same
        const billableIncrement = freqCap === 0 ? 1 : 1; // Both increment for now
        
        // Insert or update metrics with proper error handling
        const { data: existing, error: selectError } = await serviceRoleClient
          .from('sponsor_metrics_daily')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('placement', placement)
          .eq('day', today)
          .single();
        
        // single() returns error when no rows found, that's ok
        if (!selectError || selectError.code === 'PGRST116') {
          if (existing) {
            // Update existing record
            const { error: updateError } = await serviceRoleClient
              .from('sponsor_metrics_daily')
              .update({
                raw_views: (existing.raw_views || 0) + 1,
                billable_impressions: (existing.billable_impressions || 0) + billableIncrement,
                unique_users: (existing.unique_users || 0) + (userId ? 1 : 0)
              })
              .eq('campaign_id', campaignId)
              .eq('placement', placement)
              .eq('day', today);
              
            if (updateError) {
              console.error('Failed to update metrics:', updateError);
              throw updateError;
            }
          } else {
            // Insert new record
            const { error: insertError } = await serviceRoleClient
              .from('sponsor_metrics_daily')
              .insert({
                campaign_id: campaignId,
                placement,
                day: serviceRoleClient.sql`(now() at time zone 'America/Vancouver')::date`, // B) Pacific timezone in DB
                raw_views: 1,
                billable_impressions: billableIncrement,
                unique_users: userId ? 1 : 0,
                clicks: 0
              });
              
            if (insertError) {
              console.error('Failed to insert metrics:', insertError);
              throw insertError;
            }
          }
        } else {
          console.error('Failed to select metrics:', selectError);
          throw selectError;
        }

      } else if (eventType === 'click') {
        // Check if record exists for clicks with proper error handling
        const { data: existing, error: selectError } = await serviceRoleClient
          .from('sponsor_metrics_daily')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('placement', placement)
          .eq('day', today)
          .single();
        
        // single() returns error when no rows found, that's ok  
        if (!selectError || selectError.code === 'PGRST116') {
          if (existing) {
            // Update clicks
            const { error: updateError } = await serviceRoleClient
              .from('sponsor_metrics_daily')
              .update({
                clicks: (existing.clicks || 0) + 1
              })
              .eq('campaign_id', campaignId)
              .eq('placement', placement)
              .eq('day', today);
              
            if (updateError) {
              console.error('Failed to update click metrics:', updateError);
              throw updateError;
            }
          } else {
            // Insert new record with click
            const { error: insertError } = await serviceRoleClient
              .from('sponsor_metrics_daily')
              .insert({
                campaign_id: campaignId,
                placement,
                day: serviceRoleClient.sql`(now() at time zone 'America/Vancouver')::date`, // B) Pacific timezone
                clicks: 1,
                raw_views: 0,
                billable_impressions: 0,
                unique_users: 0
              });
              
            if (insertError) {
              console.error('Failed to insert click metrics:', insertError);
              throw insertError;
            }
          }
        } else {
          console.error('Failed to select click metrics:', selectError);
          throw selectError;
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Metrics tracking error:', error);
      res.status(500).json({ ok: false, error: 'Failed to track metric' });
    }
  });

  // A) Test Metrics Endpoint with enhanced logging
  app.get('/api/spotlight/admin/metrics/test', requireAdminKey, async (req, res) => {
    try {
      const { campaignId } = req.query;
      
      if (!campaignId) {
        return res.status(400).json({ 
          ok: false, 
          error: 'campaignId is required' 
        });
      }

      const serviceRoleClient = getSupabaseAdmin();
      const placement = 'events_banner';
      
      // Get before counts for logging
      const { data: before } = await serviceRoleClient
        .from('sponsor_metrics_daily')
        .select('day, raw_views, billable_impressions, clicks, unique_users')
        .eq('campaign_id', campaignId)
        .eq('placement', placement)
        .single();
      
      // Record impression and click using Pacific timezone (B)
      await serviceRoleClient
        .from('sponsor_metrics_daily')
        .upsert({
          campaign_id: campaignId,
          placement,
          day: serviceRoleClient.sql`(now() at time zone 'America/Vancouver')::date`, // B) Pacific timezone
          raw_views: (before?.raw_views || 0) + 1,
          billable_impressions: (before?.billable_impressions || 0) + 1,
          clicks: (before?.clicks || 0) + 1,
          unique_users: (before?.unique_users || 0) + 1
        }, {
          onConflict: 'campaign_id, placement, day', // C) Using day column index
          ignoreDuplicates: false
        });
      
      // Get after counts for logging
      const { data: after } = await serviceRoleClient
        .from('sponsor_metrics_daily')
        .select('day, raw_views, billable_impressions, clicks, unique_users')
        .eq('campaign_id', campaignId)
        .eq('placement', placement)
        .single();
      
      // A) Enhanced logging showing before→after counts
      console.log(`📊 Metrics Test: {campaignId: ${campaignId}, placement: ${placement}, day: ${after?.day}, before→after: {raw_views: ${before?.raw_views || 0}→${after?.raw_views || 0}, billable_impressions: ${before?.billable_impressions || 0}→${after?.billable_impressions || 0}, clicks: ${before?.clicks || 0}→${after?.clicks || 0}}}`);

      res.json({ 
        ok: true, 
        wrote: 2,
        message: 'Test metrics recorded successfully',
        details: {
          campaignId,
          placement,
          day: after?.day
        }
      });
    } catch (error: any) {
      console.error('Test metrics error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to record test metrics',
        detail: error?.message || 'Unknown error'
      });
    }
  });
  
  // NEW: Metrics Dump Endpoint - read-only admin endpoint to see raw data
  app.get('/api/spotlight/admin/metrics/dump', requireAdminKey, async (req, res) => {
    try {
      const { campaignId, placement = 'events_banner' } = req.query;
      
      if (!campaignId) {
        return res.status(400).json({ 
          ok: false, 
          error: 'campaignId is required' 
        });
      }
      
      const today = new Date().toISOString().split('T')[0];
      const serviceRoleClient = getSupabaseAdmin();
      
      // C) Get today's raw rows using day column only
      const { data, error } = await serviceRoleClient
        .from('sponsor_metrics_daily')
        .select('campaign_id, placement, day, billable_impressions, raw_views, clicks, unique_users')
        .eq('campaign_id', campaignId)
        .eq('placement', placement)
        .order('day', { ascending: false }); // Get all days, not just today
      
      if (error) {
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to fetch metrics',
          detail: error.message
        });
      }
      
      res.json(data || []);
    } catch (error: any) {
      console.error('Metrics dump error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to dump metrics',
        detail: error?.message || 'Unknown error'
      });
    }
  });

  // Reload Schema Endpoint - triggers PostgREST schema cache refresh
  app.get('/api/admin/reload-schema', requireAdminKey, async (req, res) => {
    try {
      const serviceRoleClient = getSupabaseAdmin();
      
      // Try to use pg_notify to reload schema cache
      try {
        await serviceRoleClient.rpc('exec_sql', {
          query: "SELECT pg_notify('pgrst', 'reload schema')"
        }).single();
        console.log('Schema reload requested via pg_notify');
      } catch (err) {
        // exec_sql might not be available, that's ok
        console.log('Could not use pg_notify, schema will refresh on next query');
      }
      
      // Force a schema refresh by querying tables
      await serviceRoleClient.from('sponsor_campaigns').select('id').limit(1);
      await serviceRoleClient.from('sponsor_metrics_daily').select('campaign_id').limit(1);
      
      res.json({
        ok: true,
        message: 'Schema cache refresh noted - PostgREST will refresh on next query'
      });
    } catch (error: any) {
      console.error('Schema reload unexpected error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to reload schema',
        detail: error?.message || 'Unexpected error'
      });
    }
  });

  // Send Onboarding Email Endpoint
  app.post('/api/spotlight/admin/send-onboarding', requireAdminKey, async (req, res) => {
    try {
      const { tokenId, token, recipient } = req.body;
      
      // Accept either tokenId (UUID) or token (hex string)
      const lookupId = tokenId;
      const tokenHex = token;
      
      if (!lookupId && !tokenHex) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Token ID or token is required',
          detail: 'Provide either tokenId (UUID) or token (hex string)'
        });
      }
      
      if (!recipient || !recipient.includes('@')) {
        return res.status(400).json({
          ok: false,
          error: 'Valid recipient email is required',
          detail: 'Please provide a valid email address for the recipient'
        });
      }

      // Get token and campaign data - lookup by ID or token
      let tokenQuery = supabase
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
        `);

      if (lookupId) {
        tokenQuery = tokenQuery.eq('id', lookupId);
      } else {
        tokenQuery = tokenQuery.eq('token', tokenHex);
      }

      const { data: tokenData, error: tokenError } = await tokenQuery.single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ 
          ok: false, 
          error: 'Portal token not found',
          detail: lookupId ? `No token found with ID ${lookupId}` : `No token found with hex ${tokenHex}`
        });
      }

      const campaign = tokenData.sponsor_campaigns;
      const portalUrl = `${req.protocol}://${req.get('host')}/sponsor/${tokenData.id}`;
      const expiryDate = new Date(tokenData.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Use the provided recipient email
      const recipientEmail = recipient;

      // Polished onboarding email template
      const subject = `Your Jugnu Campaign Analytics`;
      
      const startDate = new Date(campaign.start_at);
      const endDate = new Date(campaign.end_at);
      const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      const body = `Hi ${campaign.sponsor_name},

Your campaign "${campaign.name}" is now live on Jugnu (${dateRange}).

Access your analytics portal here: ${portalUrl}

Your portal includes:
• Real-time impressions and clicks
• Click-through rates (CTR) 
• 7-day performance summary
• CSV export for your records

This portal link expires on ${expiryDate}.

Questions? Reply to this email or contact our team.

Best,
The Jugnu Team
jugnu.events`;

      // TODO: Integrate with actual email service (SendGrid, etc.)
      console.log('Onboarding email content:', { 
        to: recipientEmail,
        subject, 
        body, 
        portalUrl 
      });

      // Update token with email info
      await supabase
        .from('sponsor_portal_tokens')
        .update({
          emailed_to: recipientEmail,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', tokenData.id);

      // Log the email send (audit logging disabled temporarily)
      console.log('Onboarding email sent:', {
        tokenId: tokenData.id,
        token: tokenData.token,
        campaignId: campaign.id,
        campaignName: campaign.name,
        recipientEmail,
        portalUrl,
        expiryDate,
        lookupMethod: lookupId ? 'id' : 'token',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ 
        ok: true, 
        message: 'Onboarding email sent successfully',
        portalUrl,
        expiryDate,
        recipientEmail
      });

    } catch (error: any) {
      console.error('Onboarding email error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to send onboarding email',
        detail: error?.message || 'Unknown error'
      });
    }
  });

  // Sponsor Portal Data Endpoint  
  app.get('/api/spotlight/portal/:tokenId', validatePortalOrigin, async (req, res) => {
    try {
      const { tokenId } = req.params;
      
      if (!tokenId) {
        return res.status(400).json({ ok: false, error: 'Token ID is required' });
      }

      // Validate token and get campaign - accept both UUID and legacy hex tokens
      let tokenQuery = supabase
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
        .eq('is_active', true);

      // Check if tokenId is UUID format or legacy hex token
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenId);
      
      if (isUuid) {
        // UUID format - query by id column
        tokenQuery = tokenQuery.eq('id', tokenId);
      } else {
        // Legacy hex token - query by token column (never cast to UUID)
        tokenQuery = tokenQuery.eq('token', tokenId);
      }

      const { data: tokenData, error: tokenError } = await tokenQuery.single();

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
        .order('day', { ascending: true }); // C) Use day column only

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
            .select('campaign_id, billable_impressions, clicks')
            .eq('placement', campaignPlacements)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .neq('campaign_id', campaign.id); // Exclude current campaign

          if (!benchmarkError && benchmarkData && benchmarkData.length > 0) {
            // Group by campaign and calculate totals
            const campaignTotals = benchmarkData.reduce((acc: any, row: any) => {
              const id = row.campaign_id;
              if (!acc[id]) acc[id] = { impressions: 0, clicks: 0 };
              acc[id].impressions += row.billable_impressions || 0;
              acc[id].clicks += row.clicks || 0;
              return acc;
            }, {});
            
            // Calculate CTR for each campaign with significant impressions
            const ctrs = Object.values(campaignTotals)
              .filter((totals: any) => totals.impressions > 100)
              .map((totals: any) => (totals.clicks / totals.impressions) * 100)
              .filter((ctr: number) => ctr > 0)
              .sort((a: number, b: number) => a - b);

            if (ctrs.length > 0) {
              const currentCtr = parseFloat(ctr);
              const betterThanCount = ctrs.filter((benchmarkCtr: number) => currentCtr > benchmarkCtr).length;
              const percentile = Math.round((betterThanCount / ctrs.length) * 100);
              
              let badge = null;
              if (percentile >= 75) badge = `Top 25% for ${campaignPlacements.replace('_', ' ')} last 30 days`;
              else if (percentile >= 50) badge = `Top 50% for ${campaignPlacements.replace('_', ' ')} last 30 days`;
              else if (percentile >= 25) badge = `Above average for ${campaignPlacements.replace('_', ' ')}`;
              
              ctrBenchmark = {
                percentile,
                badge,
                totalCampaigns: ctrs.length,
                averageCtr: (ctrs.reduce((a: number, b: number) => a + b, 0) / ctrs.length).toFixed(2)
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

  // CSV Export endpoint for portal
  app.get('/api/spotlight/portal/:tokenId/export.csv', validatePortalOrigin, async (req, res) => {
    try {
      const { tokenId } = req.params;
      
      // Validate token - accept both UUID and legacy hex tokens
      let tokenQuery = supabase
        .from('sponsor_portal_tokens')
        .select(`
          campaign_id,
          sponsor_campaigns (
            id,
            name,
            sponsor_name,
            start_at,
            end_at
          )
        `)
        .eq('is_active', true);

      // Check if tokenId looks like a UUID (has hyphens) or hex string
      if (tokenId.includes('-')) {
        tokenQuery = tokenQuery.eq('id', tokenId);
      } else {
        tokenQuery = tokenQuery.eq('token', tokenId);
      }

      const { data: tokenData, error: tokenError } = await tokenQuery
        .gte('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired portal link' });
      }

      const campaign = tokenData.sponsor_campaigns as any;
      const campaignId = tokenData.campaign_id;

      // Get metrics for last 30 days or campaign range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Use campaign start date if it's more recent
      const campaignStart = new Date(campaign.start_at);
      if (campaignStart > startDate) {
        startDate.setTime(campaignStart.getTime());
      }

      // Use service role client for metrics access
      const serviceRoleClient = getSupabaseAdmin();
      const { data: metrics, error: metricsError } = await serviceRoleClient
        .from('sponsor_metrics_daily')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('day', startDate.toISOString().split('T')[0])
        .lte('day', endDate.toISOString().split('T')[0])
        .order('day', { ascending: false });

      if (metricsError) {
        console.error('Metrics query error:', metricsError);
        return res.status(500).json({ ok: false, error: 'Failed to load metrics' });
      }
      
      // Debug logging
      console.log('CSV Export Debug:', {
        campaignId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metricsCount: metrics?.length || 0,
        firstRow: metrics?.[0]
      });

      // Build CSV content
      const csvRows = ['date,placement,billable_impressions,raw_views,clicks,unique_users,ctr'];
      
      if (metrics && metrics.length > 0) {
        metrics.forEach(row => {
          const ctr = row.billable_impressions > 0 
            ? ((row.clicks || 0) / row.billable_impressions * 100).toFixed(2)
            : '0.00';
          
          csvRows.push(
            `${row.day},${row.placement || ''},${row.billable_impressions || 0},${row.raw_views || 0},${row.clicks || 0},${row.unique_users || 0},${ctr}`
          );
        });
      } else {
        // Add at least one row with today's date and zeros
        const today = new Date().toISOString().split('T')[0];
        csvRows.push(`${today},events_banner,0,0,0,0,0.00`);
      }

      // Set CSV headers and send
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign-metrics-${campaign.name.replace(/[^a-z0-9]/gi, '-')}.csv"`);
      res.status(200).send(csvRows.join('\n'));
      
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ ok: false, error: 'Failed to export data' });
    }
  });

  // Get campaign details for renewal form prefill
  app.get('/api/spotlight/portal/:tokenId/campaign-details', validatePortalOrigin, async (req, res) => {
    try {
      const { tokenId } = req.params;
      
      // Validate token - accept both UUID and legacy hex tokens
      let tokenQuery = supabase
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
        .eq('is_active', true);

      // Check if tokenId looks like a UUID (has hyphens) or hex string
      if (tokenId.includes('-')) {
        tokenQuery = tokenQuery.eq('id', tokenId);
      } else {
        tokenQuery = tokenQuery.eq('token', tokenId);
      }

      const { data: tokenData, error: tokenError } = await tokenQuery.single();

      if (tokenError || !tokenData?.sponsor_campaigns) {
        return res.status(404).json({ ok: false, error: 'Campaign not found' });
      }

      const campaign = tokenData.sponsor_campaigns;
      
      // Return campaign details for prefilling
      res.json({
        ok: true,
        campaign: {
          business_name: (campaign as any).sponsor_name,
          campaign_name: (campaign as any).name,
          headline: (campaign as any).headline,
          subline: (campaign as any).subline,
          cta_text: (campaign as any).cta_text,
          website_url: (campaign as any).click_url,
          placements: (campaign as any).placements,
          campaign_objectives: (campaign as any).tags || [],
          priority: (campaign as any).priority
        }
      });
      
    } catch (error) {
      console.error('Campaign details error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load campaign details' });
    }
  });

  // Weekly summary email endpoint (env-gated)
  app.post('/api/spotlight/portal/:tokenId/weekly-summary', validatePortalOrigin, async (req, res) => {
    try {
      if (process.env.ENABLE_WEEKLY_SUMMARIES !== 'true') {
        return res.status(404).json({ ok: false, error: 'Feature not enabled' });
      }

      const { tokenId } = req.params;
      const { email, subscribe } = req.body;
      
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
      }
      
      // Validate token and get campaign - accept both UUID and legacy hex tokens
      let tokenQuery = supabase
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
        .eq('is_active', true);

      // Check if tokenId looks like a UUID (has hyphens) or hex string
      if (tokenId.includes('-')) {
        tokenQuery = tokenQuery.eq('id', tokenId);
      } else {
        tokenQuery = tokenQuery.eq('token', tokenId);
      }

      const { data: tokenData, error: tokenError } = await tokenQuery.single();

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

  // Self-test endpoint for system validation (admin key required)
  app.get('/api/spotlight/admin/selftest', requireAdminKey, async (req, res) => {
    const results: {
      timestamp: string;
      overall: string;
      tests: {
        database?: any;
        spotlights?: any;
        tracking?: any;
        portalTokens?: any;
        eventsbanner?: any;
        publicAPIs?: any;
        utmRedirector?: any;
        robotsSchema?: any;
      };
    } = {
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
      const failedTests = Object.values(results.tests).filter((test: any) => test.status === 'FAIL');
      if (failedTests.length > 0) {
        results.overall = 'FAIL';
      }

      res.json({
        ok: true,
        results,
        summary: {
          total: Object.keys(results.tests).length,
          passed: Object.values(results.tests).filter((test: any) => test.status === 'PASS').length,
          failed: failedTests.length
        }
      });

    } catch (error: any) {
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
        } catch (err: any) {
          tableChecks.push({
            table,
            exists: false,
            error: err?.message || 'Unknown error'
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
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Database test failed',
        error: error?.message || 'Unknown error'
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
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Spotlight test failed',
        error: error?.message || 'Unknown error'
      };
    }
  }

  async function testTracking() {
    try {
      const serviceRoleClient = getSupabaseAdmin();
      const today = new Date().toISOString().split('T')[0];
      
      // Create a temp campaign for testing with today+2d
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      
      const tempCampaign = {
        name: 'Self-Test Campaign ' + Date.now(),
        sponsor_name: 'Self-Test',
        headline: 'Test Headline',
        click_url: 'https://test.com',
        placements: ['events_banner'],
        start_at: new Date().toISOString(),
        end_at: endDate.toISOString(),
        is_active: true
      };
      
      const { data: campaign, error: campaignError } = await serviceRoleClient
        .from('sponsor_campaigns')
        .insert(tempCampaign)
        .select('id')
        .single();
        
      if (campaignError || !campaign) {
        return {
          status: 'FAIL',
          message: 'Failed to create test campaign',
          error: campaignError?.message
        };
      }
      
      // Call the admin metrics test endpoint twice
      const testUrl = `http://localhost:5000/api/spotlight/admin/metrics/test?campaignId=${campaign.id}`;
      const testKey = process.env.ADMIN_KEY || 'jugnu-admin-dev-2025';
      
      let wrote = 0;
      for (let i = 0; i < 2; i++) {
        const response = await fetch(testUrl, {
          headers: { 'x-admin-key': testKey }
        });
        const data = await response.json();
        if (data.ok && data.wrote) {
          wrote += data.wrote;
        }
      }
      
      // Verify metrics were written with "date" column
      const { data: metrics, error: metricsError } = await serviceRoleClient
        .from('sponsor_metrics_daily')
        .select('billable_impressions, raw_views, clicks')
        .eq('campaign_id', campaign.id)
        .eq('placement', 'events_banner')
        .eq('date', today) // Using "date" column
        .single();
      
      // Clean up
      await serviceRoleClient
        .from('sponsor_metrics_daily')
        .delete()
        .eq('campaign_id', campaign.id);
        
      await serviceRoleClient
        .from('sponsor_campaigns')
        .delete()
        .eq('id', campaign.id);
      
      if (!metrics || metricsError) {
        return {
          status: 'FAIL',
          message: 'Metrics not found after test writes',
          error: metricsError?.message
        };
      }
      
      const billableCount = metrics.billable_impressions || 0;
      
      return {
        status: billableCount >= 2 ? 'PASS' : 'FAIL',
        message: `Tracking test ${billableCount >= 2 ? 'passed' : 'failed'}: ${billableCount} billable impressions`,
        metricsRecorded: billableCount,
        details: { 
          campaignId: campaign.id,
          date: today,
          metrics
        }
      };
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Tracking test failed',
        error: error?.message || 'Unknown error'
      };
    }
  }

  async function testPortalTokens(req: any) {
    try {
      const serviceRoleClient = getSupabaseAdmin();
      const today = new Date().toISOString().split('T')[0];
      
      // Create temp campaign for portal test
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      
      const { data: campaign, error: campaignError } = await serviceRoleClient
        .from('sponsor_campaigns')
        .insert({
          name: 'Portal Test Campaign ' + Date.now(),
          sponsor_name: 'Portal Test',
          headline: 'Test Headline',
          click_url: 'https://test.com',
          placements: ['events_banner'],
          start_at: new Date().toISOString(),
          end_at: endDate.toISOString(),
          is_active: true
        })
        .select('id')
        .single();
        
      if (campaignError || !campaign) {
        return {
          status: 'FAIL',
          message: 'Failed to create test campaign for portal',
          error: campaignError?.message
        };
      }

      // Create a UUID portal token (not hex)
      const { data: tokenData, error: createError } = await serviceRoleClient
        .from('sponsor_portal_tokens')
        .insert({
          campaign_id: campaign.id,
          token: crypto.randomBytes(32).toString('hex'), // Keep for backward compat
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id, token, campaign_id') // Select the UUID id
        .single();

      if (createError) {
        return {
          status: 'FAIL',
          message: 'Failed to create portal token',
          error: createError.message
        };
      }

      // Call admin metrics test twice to populate data
      const testUrl = `http://localhost:5000/api/spotlight/admin/metrics/test?campaignId=${campaign.id}`;
      const testKey = process.env.ADMIN_KEY || 'jugnu-admin-dev-2025';
      
      for (let i = 0; i < 2; i++) {
        await fetch(testUrl, {
          headers: { 'x-admin-key': testKey }
        });
      }

      // Test portal data endpoint using UUID id (not the hex token)
      const portalResponse = await fetch(`http://localhost:5000/api/spotlight/portal/${tokenData.id}`);
      const portalData = await portalResponse.json();
      
      // Test CSV endpoint
      const csvResponse = await fetch(`http://localhost:5000/api/spotlight/portal/${tokenData.id}/export.csv`);
      const csvData = await csvResponse.text();
      
      // Parse CSV to check for today's data
      const csvLines = csvData.split('\n');
      const hasData = csvLines.length > 1 && csvLines[1].includes(today);
      
      // Check if billable_impressions >= 2 in portal data
      const billableCount = portalData.totals?.billable_impressions || 0;
      
      // Clean up
      await serviceRoleClient
        .from('sponsor_metrics_daily')
        .delete()
        .eq('campaign_id', campaign.id);
        
      await serviceRoleClient
        .from('sponsor_portal_tokens')
        .delete()
        .eq('id', tokenData.id);
        
      await serviceRoleClient
        .from('sponsor_campaigns')
        .delete()
        .eq('id', campaign.id);

      return {
        status: (portalResponse.ok && csvResponse.ok && billableCount >= 2) ? 'PASS' : 'FAIL',
        message: billableCount >= 2 
          ? `Portal and CSV working: ${billableCount} billable impressions`
          : `Portal test failed: only ${billableCount} billable impressions`,
        details: {
          tokenId: tokenData?.id,
          portalResponse: portalResponse.ok,
          csvResponse: csvResponse.ok,
          billableImpressions: billableCount,
          csvHasData: hasData,
          date: today
        }
      };
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Portal token test failed',
        error: error?.message || 'Unknown error'
      };
    }
  }

  async function testEventsBanner(): Promise<any> {
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
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Events banner test failed',
        error: error?.message || 'Unknown error'
      };
    }
  }

  async function testPublicAPIs(req: any) {
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
            error: (error as Error).message
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
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Public API test failed',
        error: error?.message || 'Unknown error'
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
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'UTM redirector test failed',
        error: error?.message || 'Unknown error'
      };
    }
  }

  async function testRobotsSchema(req: any) {
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
        console.warn('Robots.txt test error:', (error as Error).message);
      }

      // Test 2: Check schema info endpoint for schemas (since this is a client-side app)
      try {
        const schemaResponse = await fetch(`${baseUrl}/api/schema-info`);
        results.promoteSchema = schemaResponse.ok;
        
        if (schemaResponse.ok) {
          const schemaData = await schemaResponse.json();
          results.hasProductOffer = schemaData.hasProductOffers || false;
          results.hasFAQSchema = schemaData.hasFAQSchema || false;
        }
      } catch (error: any) {
        console.warn('Schema info test error:', error?.message || 'Unknown error');
      }

      const allPassed = results.robotsTxt && results.sitemapInRobots && results.promoteSchema && results.hasProductOffer && results.hasFAQSchema;

      return {
        status: allPassed ? 'PASS' : 'FAIL',
        message: allPassed
          ? 'Robots.txt and schema validation passed'
          : 'Some robots/schema issues detected',
        details: results
      };
    } catch (error: any) {
      return {
        status: 'FAIL',
        message: 'Robots/schema test failed',
        error: error?.message || 'Unknown error'
      };
    }
  }

  console.log('✓ Spotlight routes added');
}