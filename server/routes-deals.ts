import { Express } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.DATABASE_URL ? process.env.SUPABASE_URL || '' : '';
const SUPABASE_ANON_KEY = process.env.DATABASE_URL ? process.env.SUPABASE_ANON_KEY || '' : '';
const SUPABASE_SERVICE_ROLE = process.env.DATABASE_URL ? process.env.SUPABASE_SERVICE_ROLE || '' : '';

const isDev = process.env.NODE_ENV === 'development';

// Create Supabase clients
const getSupabaseAnon = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured - deals features will be disabled');
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

const getSupabaseAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.warn('Supabase service role not configured - admin features will be disabled');
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Admin authentication middleware
const requireAdminKey = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key'];
  const sessionAdmin = req.session?.admin;
  
  if (adminKey === process.env.VITE_ADMIN_KEY || sessionAdmin) {
    next();
  } else {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};

export function addDealsRoutes(app: Express) {
  // Public API: Get active deals for all 12 slots
  app.get('/api/deals/active', async (req, res) => {
    try {
      const supabase = getSupabaseAnon();
      if (!supabase) {
        // Return empty slots if Supabase not configured
        const slots = Array.from({ length: 12 }, (_, i) => ({ slot: i + 1, deal: null }));
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json({ ok: true, slots });
      }

      // Get current timestamp for date filtering
      const now = new Date().toISOString();

      // Fetch all published deals that are currently active
      const { data: deals, error } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'published')
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order('priority', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch deals:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch deals' });
      }

      // Create slots array and fill with deals
      const slots = [];
      const usedDealIds = new Set<string>();

      for (let slot = 1; slot <= 12; slot++) {
        // Find the best deal for this slot
        const slotDeal = deals?.find(deal => 
          deal.placement_slot === slot && !usedDealIds.has(deal.id)
        ) || deals?.find(deal => 
          !usedDealIds.has(deal.id)
        );

        if (slotDeal) {
          usedDealIds.add(slotDeal.id);
          slots.push({ slot, deal: slotDeal });
        } else {
          slots.push({ slot, deal: null });
        }
      }

      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json({ ok: true, slots });
    } catch (error) {
      console.error('Deals active error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load deals' });
    }
  });

  // Public API: Get single deal
  app.get('/api/deals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAnon();
      
      if (!supabase) {
        return res.status(404).json({ ok: false, error: 'Deal not found' });
      }

      const now = new Date().toISOString();
      const { data: deal, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .single();

      if (error || !deal) {
        return res.status(404).json({ ok: false, error: 'Deal not found' });
      }

      res.json({ ok: true, deal });
    } catch (error) {
      console.error('Deal fetch error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch deal' });
    }
  });

  // Public API: Track impressions and clicks
  app.post('/api/deals/track', async (req, res) => {
    try {
      const { dealId, slot, type } = req.body;

      if (!dealId || !type || !['impression', 'click'].includes(type)) {
        return res.status(400).json({ ok: false, error: 'Invalid tracking data' });
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        // Silently succeed if admin client not configured
        return res.json({ ok: true });
      }

      // Use Pacific timezone for consistency
      const vancouverTime = new Date().toLocaleString('en-CA', { 
        timeZone: 'America/Vancouver',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit'
      });
      const today = vancouverTime.split(',')[0]; // Format: YYYY-MM-DD

      // Check if record exists
      const { data: existing } = await supabase
        .from('deals_metrics_daily')
        .select('*')
        .eq('deal_id', dealId)
        .eq('day', today)
        .single();

      if (existing) {
        // Update existing record
        const updateData: any = {};
        if (type === 'impression') {
          updateData.impressions = (existing.impressions || 0) + 1;
        } else if (type === 'click') {
          updateData.clicks = (existing.clicks || 0) + 1;
        }

        const { error } = await supabase
          .from('deals_metrics_daily')
          .update(updateData)
          .eq('deal_id', dealId)
          .eq('day', today);

        if (error) {
          console.error('Failed to update metrics:', error);
          return res.status(500).json({ ok: false, error: 'Failed to track metric' });
        }
      } else {
        // Insert new record
        const insertData: any = {
          deal_id: dealId,
          day: today,
          impressions: type === 'impression' ? 1 : 0,
          clicks: type === 'click' ? 1 : 0
        };

        const { error } = await supabase
          .from('deals_metrics_daily')
          .insert(insertData);

        if (error) {
          console.error('Failed to insert metrics:', error);
          return res.status(500).json({ ok: false, error: 'Failed to track metric' });
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Metrics tracking error:', error);
      res.status(500).json({ ok: false, error: 'Failed to track metric' });
    }
  });

  // Public API: Deal redirector with UTM tracking
  app.get('/r/deal/:dealId', async (req, res) => {
    try {
      const { dealId } = req.params;
      const { slot, to } = req.query;

      if (!to) {
        return res.status(400).json({ ok: false, error: 'Missing destination URL' });
      }

      const supabase = getSupabaseAnon();
      if (!supabase) {
        // Just redirect without tracking if Supabase not configured
        return res.redirect(302, decodeURIComponent(to as string));
      }

      // Verify deal exists and has a link_url
      const { data: deal, error } = await supabase
        .from('deals')
        .select('id, link_url')
        .eq('id', dealId)
        .single();

      if (error || !deal || !deal.link_url) {
        return res.status(404).json({ ok: false, error: 'No link for this deal' });
      }

      // Track the click
      const adminClient = getSupabaseAdmin();
      if (adminClient) {
        const vancouverTime = new Date().toLocaleString('en-CA', { 
          timeZone: 'America/Vancouver',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit'
        });
        const today = vancouverTime.split(',')[0];

        // Update metrics
        const { data: existing } = await adminClient
          .from('deals_metrics_daily')
          .select('*')
          .eq('deal_id', dealId)
          .eq('day', today)
          .single();

        if (existing) {
          await adminClient
            .from('deals_metrics_daily')
            .update({ clicks: (existing.clicks || 0) + 1 })
            .eq('deal_id', dealId)
            .eq('day', today);
        } else {
          await adminClient
            .from('deals_metrics_daily')
            .insert({
              deal_id: dealId,
              day: today,
              impressions: 0,
              clicks: 1
            });
        }
      }

      // Build redirect URL with UTM parameters
      let redirectUrl = decodeURIComponent(to as string);
      const utmParams = new URLSearchParams({
        utm_source: 'jugnu',
        utm_medium: 'deals',
        utm_campaign: dealId,
        utm_content: `slot-${slot || 'unknown'}`
      });

      // Merge UTM parameters without duplication
      const url = new URL(redirectUrl);
      utmParams.forEach((value, key) => {
        if (!url.searchParams.has(key)) {
          url.searchParams.append(key, value);
        }
      });

      res.redirect(302, url.toString());
    } catch (error) {
      console.error('Redirector error:', error);
      res.status(500).json({ ok: false, error: 'Failed to redirect' });
    }
  });

  // Admin API: List deals with filtering
  app.get('/api/admin/deals/list', requireAdminKey, async (req, res) => {
    try {
      const { status, q } = req.query;
      const supabase = getSupabaseAdmin();
      
      if (!supabase) {
        return res.json({ ok: true, deals: [] });
      }

      let query = supabase.from('deals').select('*');

      if (status) {
        query = query.eq('status', status);
      }

      if (q) {
        query = query.or(`merchant.ilike.%${q}%,title.ilike.%${q}%`);
      }

      const { data: deals, error } = await query
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to list deals:', error);
        return res.status(500).json({ ok: false, error: 'Failed to list deals' });
      }

      res.json({ ok: true, deals: deals || [] });
    } catch (error) {
      console.error('List deals error:', error);
      res.status(500).json({ ok: false, error: 'Failed to list deals' });
    }
  });

  // Admin API: Upsert deal
  app.post('/api/admin/deals/upsert', requireAdminKey, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return res.status(500).json({ ok: false, error: 'Admin features not configured' });
      }

      const {
        id,
        title,
        merchant,
        blurb,
        code,
        link_url,
        image_desktop_url,
        image_mobile_url,
        placement_slot,
        badge,
        terms_md,
        status,
        priority,
        start_at,
        end_at
      } = req.body;

      // Validation
      if (!title || !merchant || !blurb) {
        return res.status(400).json({ ok: false, error: 'Title, merchant, and blurb are required' });
      }

      if (placement_slot && (placement_slot < 1 || placement_slot > 12)) {
        return res.status(400).json({ ok: false, error: 'Placement slot must be between 1 and 12' });
      }

      if (status === 'published') {
        if (!image_desktop_url || !image_mobile_url) {
          return res.status(400).json({ ok: false, error: 'Published deals require both desktop and mobile images' });
        }
        if (!code && !link_url) {
          return res.status(400).json({ ok: false, error: 'Published deals require either a code or link URL' });
        }
      }

      const dealData: any = {
        title: title.trim(),
        merchant: merchant.trim(),
        blurb: blurb.trim(),
        code: code?.trim() || null,
        link_url: link_url?.trim() || null,
        image_desktop_url: image_desktop_url?.trim() || null,
        image_mobile_url: image_mobile_url?.trim() || null,
        placement_slot: placement_slot || null,
        badge: badge?.trim() || null,
        terms_md: terms_md?.trim() || null,
        status: status || 'draft',
        priority: priority || 0,
        start_at: start_at || new Date().toISOString(),
        end_at: end_at || null,
        updated_at: new Date().toISOString()
      };

      let deal;
      if (id) {
        // Update existing deal
        const { data, error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Deal update error:', error);
          return res.status(400).json({ ok: false, error: 'Failed to update deal' });
        }
        deal = data;
      } else {
        // Create new deal
        const { data, error } = await supabase
          .from('deals')
          .insert(dealData)
          .select()
          .single();

        if (error) {
          console.error('Deal create error:', error);
          return res.status(400).json({ ok: false, error: 'Failed to create deal' });
        }
        deal = data;
      }

      res.json({
        ok: true,
        deal,
        message: id ? 'Deal updated successfully' : 'Deal created successfully'
      });
    } catch (error) {
      console.error('Deal upsert error:', error);
      res.status(500).json({ ok: false, error: 'Failed to save deal' });
    }
  });

  // Admin API: Archive deal (soft delete)
  app.post('/api/admin/deals/delete', requireAdminKey, async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ ok: false, error: 'Deal ID is required' });
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return res.status(500).json({ ok: false, error: 'Admin features not configured' });
      }

      const { error } = await supabase
        .from('deals')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Archive deal error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to archive deal' });
      }

      res.json({ ok: true, message: 'Deal archived successfully' });
    } catch (error) {
      console.error('Delete deal error:', error);
      res.status(500).json({ ok: false, error: 'Failed to archive deal' });
    }
  });

  // Admin API: Self-test endpoint
  app.get('/api/admin/deals/selftest', requireAdminKey, async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return res.status(500).json({ ok: false, error: 'Admin features not configured' });
      }

      // Create a temporary test deal
      const testDeal = {
        title: 'Test Deal - Delete Me',
        merchant: 'Test Merchant',
        blurb: 'This is a test deal for self-test',
        code: 'TESTCODE',
        placement_slot: 12,
        status: 'published',
        priority: -999, // Low priority so it doesn't interfere
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000).toISOString() // +1 day
      };

      const { data: deal, error: createError } = await supabase
        .from('deals')
        .insert(testDeal)
        .select()
        .single();

      if (createError || !deal) {
        return res.status(500).json({ ok: false, error: 'Failed to create test deal' });
      }

      // Write test metrics
      const vancouverTime = new Date().toLocaleString('en-CA', { 
        timeZone: 'America/Vancouver',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit'
      });
      const today = vancouverTime.split(',')[0];

      // Insert metrics
      const { error: metricsError } = await supabase
        .from('deals_metrics_daily')
        .insert({
          deal_id: deal.id,
          day: today,
          impressions: 1,
          clicks: 1
        });

      if (metricsError) {
        // Clean up the test deal
        await supabase.from('deals').delete().eq('id', deal.id);
        return res.status(500).json({ ok: false, error: 'Failed to write test metrics' });
      }

      // Verify metrics were written
      const { data: metrics, error: verifyError } = await supabase
        .from('deals_metrics_daily')
        .select('*')
        .eq('deal_id', deal.id)
        .eq('day', today)
        .single();

      if (verifyError || !metrics || metrics.impressions !== 1 || metrics.clicks !== 1) {
        // Clean up
        await supabase.from('deals_metrics_daily').delete().eq('deal_id', deal.id);
        await supabase.from('deals').delete().eq('id', deal.id);
        return res.status(500).json({ ok: false, error: 'Metrics verification failed' });
      }

      // Clean up
      await supabase.from('deals_metrics_daily').delete().eq('deal_id', deal.id);
      await supabase.from('deals').delete().eq('id', deal.id);

      res.json({
        ok: true,
        wrote: {
          impressions: 1,
          clicks: 1
        },
        message: 'Self-test passed successfully'
      });
    } catch (error) {
      console.error('Self-test error:', error);
      res.status(500).json({ ok: false, error: 'Self-test failed' });
    }
  });

  // Admin API: Dump metrics for debugging
  app.get('/api/admin/deals/dump', requireAdminKey, async (req, res) => {
    try {
      const { dealId } = req.query;
      
      if (!dealId) {
        return res.status(400).json({ ok: false, error: 'dealId is required' });
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return res.status(500).json({ ok: false, error: 'Admin features not configured' });
      }

      const { data: metrics, error } = await supabase
        .from('deals_metrics_daily')
        .select('*')
        .eq('deal_id', dealId)
        .order('day', { ascending: false });

      if (error) {
        console.error('Metrics dump error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch metrics' });
      }

      res.json({ ok: true, metrics: metrics || [] });
    } catch (error) {
      console.error('Dump error:', error);
      res.status(500).json({ ok: false, error: 'Failed to dump metrics' });
    }
  });

  console.log('✓ Deals routes added');
}