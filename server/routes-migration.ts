// Database migration routes for Places v1.2
import { Router } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin.js';

const router = Router();
const supabase = getSupabaseAdmin();

// Migrate Places to v1.2 schema
router.post('/api/admin/migrate-places-v12', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ 
        ok: false, 
        error: 'Unauthorized - invalid or missing admin key' 
      });
    }

    console.log('Starting Places v1.2 database migration...');

    // First, check current schema
    const { data: columns } = await supabase.rpc('get_table_columns', { table_name: 'places' });
    const existingColumns = columns?.map((c: any) => c.column_name) || [];

    const missingColumns = [];
    if (!existingColumns.includes('country')) missingColumns.push('country text');
    if (!existingColumns.includes('google_photo_ref')) missingColumns.push('google_photo_ref text');
    if (!existingColumns.includes('photo_source')) missingColumns.push('photo_source text');

    if (missingColumns.length > 0) {
      // Add missing columns
      const alterQuery = `ALTER TABLE public.places ADD COLUMN ${missingColumns.join(', ADD COLUMN ')};`;
      
      const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterQuery });
      if (alterError) {
        throw new Error(`Failed to add columns: ${alterError.message}`);
      }
      console.log(`Added columns: ${missingColumns.join(', ')}`);
    }

    // Create indices
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);',
      'CREATE INDEX IF NOT EXISTS idx_places_country ON public.places(country);', 
      'CREATE INDEX IF NOT EXISTS idx_places_coordinates ON public.places(lat, lng);',
      'CREATE INDEX IF NOT EXISTS idx_places_business_status ON public.places(business_status);'
    ];

    for (const query of indexQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.warn(`Index creation warning: ${error.message}`);
      }
    }

    console.log('Places v1.2 migration completed successfully!');

    res.json({
      ok: true,
      message: 'Places v1.2 migration completed',
      addedColumns: missingColumns.length,
      indicesCreated: indexQueries.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Migration failed' 
    });
  }
});

// Get validation statistics
router.get('/api/admin/places-validation', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ 
        ok: false, 
        error: 'Unauthorized - invalid or missing admin key' 
      });
    }

    const { data: places } = await supabase
      .from('places')
      .select('id, name, city, country, lat, lng, type')
      .neq('status', 'merged');

    if (!places) {
      return res.json({ 
        ok: true, 
        stats: { total: 0, outsideBounds: 0, nonCanada: 0, missingCity: 0, wrongCategory: 0 } 
      });
    }

    const stats = {
      total: places.length,
      outsideBounds: 0,
      nonCanada: 0,
      missingCity: 0,
      wrongCategory: 0
    };

    // Metro Vancouver bounds
    const bounds = { north: 49.45, south: 49.0, east: -122.4, west: -123.45 };

    for (const place of places) {
      // Check bounds
      if (place.lat && place.lng) {
        if (place.lat < bounds.south || place.lat > bounds.north || 
            place.lng < bounds.west || place.lng > bounds.east) {
          stats.outsideBounds++;
        }
      }

      // Check country
      if (place.country && place.country !== 'CA') {
        stats.nonCanada++;
      }

      // Check city
      if (!place.city || place.city.trim() === '') {
        stats.missingCity++;
      }

      // Check category vs name (religious institutions)
      const nameLower = place.name.toLowerCase();
      if (nameLower.match(/mandir|temple|iskcon|shiv|krishna|sai/) && place.type !== 'Temple') {
        stats.wrongCategory++;
      } else if (nameLower.match(/gurdwara|gurudwara|sikh/) && place.type !== 'Gurdwara') {
        stats.wrongCategory++;
      } else if (nameLower.match(/mosque|masjid|islamic centre|islamic center/) && place.type !== 'Mosque') {
        stats.wrongCategory++;
      }
    }

    res.json({ ok: true, stats });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    });
  }
});

// Clean up out-of-bounds and non-Canada places
router.post('/api/admin/cleanup-invalid-places', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ 
        ok: false, 
        error: 'Unauthorized - invalid or missing admin key' 
      });
    }

    console.log('Starting cleanup of invalid places...');

    // Get places outside bounds or non-Canada
    const { data: places } = await supabase
      .from('places')
      .select('id, name, lat, lng, country')
      .neq('status', 'inactive');

    if (!places) {
      return res.json({ ok: true, deactivated: 0 });
    }

    const bounds = { north: 49.45, south: 49.0, east: -122.4, west: -123.45 };
    const toDeactivate = [];

    for (const place of places) {
      let shouldDeactivate = false;

      // Check bounds
      if (place.lat && place.lng) {
        if (place.lat < bounds.south || place.lat > bounds.north || 
            place.lng < bounds.west || place.lng > bounds.east) {
          shouldDeactivate = true;
        }
      }

      // Check country
      if (place.country && place.country !== 'CA') {
        shouldDeactivate = true;
      }

      if (shouldDeactivate) {
        toDeactivate.push(place.id);
      }
    }

    if (toDeactivate.length > 0) {
      const { error } = await supabase
        .from('places')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .in('id', toDeactivate);

      if (error) {
        throw new Error(`Failed to deactivate places: ${error.message}`);
      }
    }

    console.log(`Deactivated ${toDeactivate.length} invalid places`);

    res.json({
      ok: true,
      deactivated: toDeactivate.length,
      message: `Cleanup completed: ${toDeactivate.length} places deactivated`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Cleanup failed' 
    });
  }
});

export default router;