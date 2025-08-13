// Database migration utility for Places v1.2
import { getSupabaseAdmin } from '../supabaseAdmin.js';

const supabase = getSupabaseAdmin();

export async function migratePlacesV12(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Starting Places v1.2 database migration...');

    // Add new columns using raw SQL
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add new columns for Places v1.2
        ALTER TABLE public.places 
        ADD COLUMN IF NOT EXISTS country text,
        ADD COLUMN IF NOT EXISTS google_photo_ref text,
        ADD COLUMN IF NOT EXISTS photo_source text;
        
        -- Create indices for performance
        CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);
        CREATE INDEX IF NOT EXISTS idx_places_country ON public.places(country);
        CREATE INDEX IF NOT EXISTS idx_places_coordinates ON public.places(lat, lng);
        CREATE INDEX IF NOT EXISTS idx_places_business_status ON public.places(business_status);
      `
    });

    if (migrationError) {
      console.error('Migration failed:', migrationError);
      return { success: false, error: migrationError.message };
    }

    console.log('Places v1.2 migration completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('Migration error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown migration error' 
    };
  }
}

export async function validatePlacesData(): Promise<{
  total: number;
  outsideBounds: number;
  nonCanada: number;
  missingCity: number;
  wrongCategory: number;
}> {
  try {
    const { data: places } = await supabase
      .from('places')
      .select('id, name, city, country, lat, lng, type')
      .neq('status', 'merged');

    if (!places) return { total: 0, outsideBounds: 0, nonCanada: 0, missingCity: 0, wrongCategory: 0 };

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

    return stats;

  } catch (error) {
    console.error('Validation error:', error);
    return { total: 0, outsideBounds: 0, nonCanada: 0, missingCity: 0, wrongCategory: 0 };
  }
}