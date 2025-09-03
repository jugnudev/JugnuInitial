import type { Express } from "express";
import { getSupabaseAdmin } from "./supabaseAdmin";

export function addDealsRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // Public endpoint to list deals for the moodboard
  app.get('/api/deals/list', async (req, res) => {
    try {
      const now = new Date().toISOString();
      
      // Fetch active deals that are within date range
      // Note: Using 'scheduled' status for active deals due to constraint issue
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .in('status', ['scheduled', 'active'])  // Check both scheduled and active
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order('priority', { ascending: false })
        .order('placement_slot', { ascending: true });

      if (dealsError) {
        console.error('Error fetching deals:', dealsError);
        // Return empty slots on error
        return res.json({ ok: true, slots: new Array(7).fill(null) });
      }

      // Process deals and organize by slot (7 premium slots)
      const slots = new Array(7).fill(null);
      
      if (deals) {
        deals.forEach((deal: any) => {
          const slotNumber = deal.placement_slot;
          
          // Skip if slot is out of range (only 7 slots)
          if (!slotNumber || slotNumber < 1 || slotNumber > 7) return;
          
          // Skip if slot already filled by higher priority deal
          if (slots[slotNumber - 1] !== null) return;
          
          // Map to frontend format
          slots[slotNumber - 1] = {
            id: deal.id,
            title: deal.title,
            subtitle: deal.blurb,
            brand: deal.merchant,
            code: deal.code,
            click_url: deal.link_url,
            slot: slotNumber,
            tile_kind: getTileKindForSlot(slotNumber), // Map slot to tile kind
            badge: deal.badge,
            terms: deal.terms_md,
            status: deal.status,
            image: {
              desktop: deal.image_desktop_url,
              mobile: deal.image_mobile_url,
              alt: `${deal.merchant} - ${deal.title}`
            }
          };
        });
      }

      res.json({ ok: true, slots });
    } catch (error) {
      console.error('Deals error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load deals' });
    }
  });

  // Admin endpoint to get all deals (for management)
  app.get('/api/admin/deals', async (req, res) => {
    try {
      // Check admin authentication
      const adminKey = process.env.EXPORT_ADMIN_KEY || process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD;
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === adminKey;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { data: deals, error } = await supabase
        .from('deals')
        .select('*')
        .order('placement_slot', { ascending: true })
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching admin deals:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch deals' });
      }

      // Map to frontend format
      const mappedDeals = (deals || []).map((deal: any) => ({
        ...deal,
        // Map database columns to frontend field names
        brand: deal.merchant,
        subtitle: deal.blurb,
        click_url: deal.link_url,
        slot: deal.placement_slot,
        start_date: deal.start_at,
        end_date: deal.end_at,
        is_active: deal.status === 'scheduled' || deal.status === 'active',  // Both scheduled and active are considered active
        tile_kind: getTileKindForSlot(deal.placement_slot)
      }));

      res.json({ ok: true, deals: mappedDeals });
    } catch (error) {
      console.error('Admin deals error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load deals' });
    }
  });

  // Admin endpoint to create a deal
  app.post('/api/admin/deals/create', async (req, res) => {
    try {
      // Check admin authentication
      const adminKey = process.env.EXPORT_ADMIN_KEY || process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD;
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === adminKey;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const {
        title,
        subtitle, // maps to blurb
        brand, // maps to merchant
        code,
        click_url, // maps to link_url
        start_date,
        end_date,
        slot, // maps to placement_slot
        priority,
        is_active,
        badge,
        terms,
        image_desktop_url,
        image_mobile_url
      } = req.body;

      // Validate required fields
      if (!title || !brand || !start_date || !slot || !image_desktop_url || !image_mobile_url) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Missing required fields' 
        });
      }

      // Validate slot range (7 slots only)
      if (slot < 1 || slot > 7) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Slot must be between 1 and 7' 
        });
      }

      // Create the deal with correct column names
      // Ensure dates are properly formatted as timestamps
      const startTimestamp = start_date.includes('T') ? start_date : `${start_date}T00:00:00Z`;
      const endTimestamp = end_date ? (end_date.includes('T') ? end_date : `${end_date}T23:59:59Z`) : null;
      
      const dealData: any = {
        title,
        merchant: brand,
        blurb: subtitle || null,
        code: code || null,
        link_url: click_url || null,
        image_desktop_url,
        image_mobile_url,
        placement_slot: slot,
        badge: badge || null,
        terms_md: terms || null,
        status: is_active ? 'scheduled' : 'draft',  // Using 'scheduled' for active deals due to constraint issue
        priority: priority || 0,
        start_at: startTimestamp,
        end_at: endTimestamp
      };
      
      console.log('Creating deal with data:', JSON.stringify(dealData, null, 2));
      
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert(dealData)
        .select()
        .single();

      if (dealError) {
        console.error('Deal creation error:', dealError);
        // Check if it's a slot conflict
        if (dealError.message?.includes('overlap')) {
          return res.status(400).json({ 
            ok: false, 
            error: `Slot ${slot} already has an active deal for the selected dates` 
          });
        }
        // Check if it's a status constraint error
        if (dealError.message?.includes('deals_status_check')) {
          return res.status(400).json({ 
            ok: false, 
            error: 'Invalid status value. Must be one of: draft, scheduled, active, paused, expired' 
          });
        }
        return res.status(500).json({ 
          ok: false, 
          error: dealError.message || 'Failed to create deal' 
        });
      }

      res.json({ ok: true, deal, message: 'Deal created successfully' });
    } catch (error) {
      console.error('Deal creation error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create deal' });
    }
  });

  // Admin endpoint to update a deal
  app.put('/api/admin/deals/:id', async (req, res) => {
    try {
      // Check admin authentication
      const adminKey = process.env.EXPORT_ADMIN_KEY || process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD;
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === adminKey;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const {
        title,
        subtitle, // maps to blurb
        brand, // maps to merchant
        code,
        click_url, // maps to link_url
        start_date,
        end_date,
        slot, // maps to placement_slot
        priority,
        is_active,
        badge,
        terms,
        image_desktop_url,
        image_mobile_url
      } = req.body;

      // Update the deal
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title;
      if (subtitle !== undefined) updateData.blurb = subtitle;
      if (brand !== undefined) updateData.merchant = brand;
      if (code !== undefined) updateData.code = code || null;
      if (click_url !== undefined) updateData.link_url = click_url || null;
      if (start_date !== undefined) updateData.start_at = start_date;
      if (end_date !== undefined) updateData.end_at = end_date || null;
      if (slot !== undefined) updateData.placement_slot = slot;
      if (priority !== undefined) updateData.priority = priority;
      if (is_active !== undefined) updateData.status = is_active ? 'scheduled' : 'draft';  // Using 'scheduled' for active deals
      if (badge !== undefined) updateData.badge = badge || null;
      if (terms !== undefined) updateData.terms_md = terms || null;
      if (image_desktop_url !== undefined) updateData.image_desktop_url = image_desktop_url;
      if (image_mobile_url !== undefined) updateData.image_mobile_url = image_mobile_url;

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (dealError) {
        console.error('Deal update error:', dealError);
        // Check if it's a slot conflict
        if (dealError.message?.includes('overlap')) {
          return res.status(400).json({ 
            ok: false, 
            error: `Slot ${slot} already has an active deal for the selected dates` 
          });
        }
        return res.status(500).json({ ok: false, error: 'Failed to update deal' });
      }

      res.json({ ok: true, deal, message: 'Deal updated successfully' });
    } catch (error) {
      console.error('Deal update error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update deal' });
    }
  });

  // Admin endpoint to delete a deal
  app.delete('/api/admin/deals/:id', async (req, res) => {
    try {
      // Check admin authentication
      const adminKey = process.env.EXPORT_ADMIN_KEY || process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD;
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === adminKey;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;

      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Deal deletion error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to delete deal' });
      }

      res.json({ ok: true, message: 'Deal deleted successfully' });
    } catch (error) {
      console.error('Deal deletion error:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete deal' });
    }
  });

  // Track deal metrics (impressions and clicks)
  app.post('/api/deals/track', async (req, res) => {
    try {
      const { deal_id, event_type } = req.body;
      
      if (!deal_id || !event_type) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }

      // Get current date in Pacific timezone
      const pacificDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
      
      // Update or insert metrics
      const column = event_type === 'click' ? 'clicks' : 'impressions';
      
      const { error } = await supabase.rpc('increment_deal_metric', {
        p_deal_id: deal_id,
        p_day: pacificDate,
        p_column: column
      }).single();

      if (error) {
        // If RPC doesn't exist, do manual upsert
        const { data: existing } = await supabase
          .from('deals_metrics_daily')
          .select('*')
          .eq('deal_id', deal_id)
          .eq('day', pacificDate)
          .single();

        if (existing) {
          await supabase
            .from('deals_metrics_daily')
            .update({ [column]: existing[column] + 1 })
            .eq('deal_id', deal_id)
            .eq('day', pacificDate);
        } else {
          await supabase
            .from('deals_metrics_daily')
            .insert({
              deal_id,
              day: pacificDate,
              [column]: 1
            });
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Metrics tracking error:', error);
      res.status(500).json({ ok: false, error: 'Failed to track metrics' });
    }
  });
}

// Helper function to map slot numbers to tile kinds
function getTileKindForSlot(slot: number): string {
  const slotConfig = [
    'wide',   // Slot 1
    'half',   // Slot 2
    'half',   // Slot 3
    'square', // Slot 4
    'tall',   // Slot 5
    'tall',   // Slot 6
    'tall'    // Slot 7
  ];
  return slotConfig[slot - 1] || 'square';
}