import type { Express } from "express";
import { getSupabaseAdmin } from "./supabaseAdmin";

export function addDealsRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // Public endpoint to list deals for the moodboard
  app.get('/api/deals/list', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First check if deals table exists
      const { data: dealsTableCheck, error: tableCheckError } = await supabase
        .from('deals')
        .select('id')
        .limit(1);

      // If table doesn't exist, return empty slots
      if (tableCheckError?.code === 'PGRST204' || tableCheckError?.message?.includes('does not exist')) {
        return res.json({ ok: true, slots: new Array(7).fill(null) });
      }

      // Fetch active deals that are within date range
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .order('priority', { ascending: false })
        .order('placement', { ascending: true });

      if (dealsError) {
        // If there's a column error or table doesn't exist, return empty slots
        if (dealsError.code === '42703' || dealsError.code === 'PGRST204' || dealsError.message?.includes('does not exist')) {
          console.log('Deals table not configured yet');
          return res.json({ ok: true, slots: new Array(7).fill(null) });
        }
        console.error('Error fetching deals:', dealsError);
        return res.status(500).json({ ok: false, error: 'Failed to fetch deals' });
      }
      
      // Filter deals manually if columns exist
      const filteredDeals = (deals || []).filter((deal: any) => {
        // Check if date columns exist and filter (using start_at/end_at)
        if (deal.start_at && deal.end_at) {
          return deal.start_at <= today && deal.end_at >= today;
        }
        // Also check for old column names
        if (deal.start_date && deal.end_date) {
          return deal.start_date <= today && deal.end_date >= today;
        }
        // If no date columns, include the deal
        return true;
      }).filter((deal: any) => {
        // Check if is_active exists and filter
        if ('is_active' in deal) {
          return deal.is_active;
        }
        // If no is_active column, include the deal
        return true;
      });

      // Fetch images separately if deals exist
      let dealImages: any[] = [];
      if (filteredDeals && filteredDeals.length > 0) {
        const dealIds = filteredDeals.map((d: any) => d.id);
        const { data: images } = await supabase
          .from('deal_images')
          .select('*')
          .in('deal_id', dealIds);
        
        dealImages = images || [];
      }

      // Process deals and organize by slot (7 premium slots)
      const slots = new Array(7).fill(null);
      
      if (filteredDeals) {
        filteredDeals.forEach((deal: any) => {
          // Map placement field to slot
          const slotNumber = deal.placement || deal.slot || 1;
          
          // Skip if slot is out of range (only 7 slots)
          if (slotNumber < 1 || slotNumber > 7) return;
          
          // Skip if slot already filled by higher priority deal
          if (slots[slotNumber - 1] !== null) return;
          
          // Find images for this deal
          const dealImagesForThisDeal = dealImages.filter((img: any) => img.deal_id === deal.id);
          const desktopImage = dealImagesForThisDeal.find((img: any) => img.kind === 'desktop');
          const mobileImage = dealImagesForThisDeal.find((img: any) => img.kind === 'mobile');
          const image = desktopImage || mobileImage;
          
          slots[slotNumber - 1] = {
            id: deal.id,
            title: deal.title,
            subtitle: deal.subtitle,
            brand: deal.brand,
            code: deal.code,
            click_url: deal.click_url,
            slot: slotNumber,  // Use mapped slot number
            tile_kind: deal.tile_kind,
            // Map dates for consistency
            start_date: deal.start_at || deal.start_date,
            end_date: deal.end_at || deal.end_date,
            image: image ? {
              url: image.url,
              alt: image.alt || `${deal.brand} ${deal.title}`
            } : undefined
          };
        });
      }

      res.json({ ok: true, slots });
    } catch (error) {
      console.error('Deals list error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load deals' });
    }
  });

  // Admin endpoint to list all deals
  app.get('/api/admin/deals', async (req, res) => {
    try {
      // Check admin authentication
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === process.env.VITE_ADMIN_KEY;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      // First try to fetch without the relationship
      const { data: deals, error } = await supabase
        .from('deals')
        .select('*')
        .order('slot', { ascending: true })
        .order('priority', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
          return res.json({ ok: true, deals: [] });
        }
        console.error('Error fetching admin deals:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch deals' });
      }

      // Fetch images separately if deals exist
      let dealImages: any[] = [];
      if (deals && deals.length > 0) {
        const dealIds = deals.map((d: any) => d.id);
        const { data: images } = await supabase
          .from('deal_images')
          .select('*')
          .in('deal_id', dealIds);
        
        dealImages = images || [];
      }

      // Combine deals with their images and map column names for frontend
      const dealsWithImages = (deals || []).map((deal: any) => ({
        ...deal,
        // Map database columns back to frontend field names
        start_date: deal.start_at || deal.start_date,
        end_date: deal.end_at || deal.end_date,
        slot: deal.placement || deal.slot || 1,  // Map placement back to slot
        deal_images: dealImages.filter((img: any) => img.deal_id === deal.id)
      }));

      res.json({ ok: true, deals: dealsWithImages });
    } catch (error) {
      console.error('Admin deals error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load deals' });
    }
  });

  // Admin endpoint to create a deal
  app.post('/api/admin/deals/create', async (req, res) => {
    try {
      // Check admin authentication
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === process.env.VITE_ADMIN_KEY;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const {
        title,
        subtitle,
        brand,
        code,
        click_url,
        start_date,
        end_date,
        slot,
        tile_kind,
        priority,
        is_active,
        images
      } = req.body;

      // Validate required fields
      if (!title || !subtitle || !brand || !start_date || !end_date || !slot || !tile_kind) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Missing required fields' 
        });
      }

      // Validate slot range
      if (slot < 1 || slot > 7) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Slot must be between 1 and 7' 
        });
      }

      // Skip slot conflict check - database doesn't have slot column
      // We'll use placement field and priority to manage display order

      // Create the deal - use placement field instead of slot
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          title,
          subtitle,
          brand,
          code: code || null,
          click_url: click_url || null,
          start_at: start_date,
          end_at: end_date,
          placement: slot,  // Map slot to placement field
          tile_kind,
          priority: priority || 0,
          is_active: is_active !== false
        })
        .select()
        .single();

      if (dealError) {
        console.error('Deal creation error:', dealError);
        return res.status(500).json({ ok: false, error: 'Failed to create deal' });
      }

      // Add images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        const imageData = images.map((img: any) => ({
          deal_id: deal.id,
          kind: img.kind,
          url: img.url,
          width: img.width,
          height: img.height,
          alt: img.alt || `${brand} ${title}`
        }));

        const { error: imageError } = await supabase
          .from('deal_images')
          .insert(imageData);

        if (imageError) {
          console.error('Image insertion error:', imageError);
          // Deal created but images failed - continue anyway
        }
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
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === process.env.VITE_ADMIN_KEY;
      if (!isAuthenticated) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const {
        title,
        subtitle,
        brand,
        code,
        click_url,
        start_date,
        end_date,
        slot,
        tile_kind,
        priority,
        is_active,
        images
      } = req.body;

      // Skip slot conflict check - database doesn't have slot column

      // Update the deal
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title;
      if (subtitle !== undefined) updateData.subtitle = subtitle;
      if (brand !== undefined) updateData.brand = brand;
      if (code !== undefined) updateData.code = code || null;
      if (click_url !== undefined) updateData.click_url = click_url || null;
      if (start_date !== undefined) updateData.start_at = start_date;  // Map to database column
      if (end_date !== undefined) updateData.end_at = end_date;  // Map to database column
      if (slot !== undefined) updateData.placement = slot;  // Map slot to placement field
      if (tile_kind !== undefined) updateData.tile_kind = tile_kind;
      if (priority !== undefined) updateData.priority = priority;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (dealError) {
        console.error('Deal update error:', dealError);
        return res.status(500).json({ ok: false, error: 'Failed to update deal' });
      }

      // Update images if provided
      if (images && Array.isArray(images)) {
        // Delete existing images
        await supabase
          .from('deal_images')
          .delete()
          .eq('deal_id', id);

        // Insert new images
        if (images.length > 0) {
          const imageData = images.map((img: any) => ({
            deal_id: id,
            kind: img.kind,
            url: img.url,
            width: img.width,
            height: img.height,
            alt: img.alt || `${brand || deal.brand} ${title || deal.title}`
          }));

          const { error: imageError } = await supabase
            .from('deal_images')
            .insert(imageData);

          if (imageError) {
            console.error('Image update error:', imageError);
            // Deal updated but images failed - continue anyway
          }
        }
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
      const isAuthenticated = req.session?.isAdmin || req.headers['x-admin-key'] === process.env.VITE_ADMIN_KEY;
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
}