import type { Request, Response } from 'express';
import { getSupabaseAdmin } from '../../../supabaseAdmin';

// Field mapping from input format to database schema
const fieldMapping = {
  name: 'name',
  category: 'type', // Map category to type in our schema
  address: 'address',
  city: 'city',
  neighborhood: 'neighborhood',
  tags: 'tags',
  price_range: 'price_level', // Map to price_level (int)
  website: 'website_url',
  social: 'instagram',
  description: 'description',
  cover_image: 'image_url'
};

// Helper function to validate and normalize URLs
function validateUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  // Must start with http or https
  if (!trimmed.match(/^https?:\/\//)) return null;
  
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

// Helper function to strip HTML and normalize text
function stripHtml(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  
  const cleaned = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
    
  return cleaned || null;
}

// Helper function to create canonical key for deduplication
function createCanonicalKey(name: string, address: string | null): string {
  const normalizedName = name.toLowerCase().trim();
  const normalizedAddress = address ? address.toLowerCase().trim() : '';
  return `${normalizedName}|${normalizedAddress}`;
}

// Helper function to parse price range to price level
function parsePriceRange(priceRange: string | null | undefined): number | null {
  if (!priceRange || typeof priceRange !== 'string') return null;
  
  const normalized = priceRange.toLowerCase().trim();
  if (normalized.includes('$$$') || normalized.includes('high') || normalized.includes('expensive')) return 3;
  if (normalized.includes('$$') || normalized.includes('moderate') || normalized.includes('mid')) return 2;
  if (normalized.includes('$') || normalized.includes('low') || normalized.includes('cheap') || normalized.includes('budget')) return 1;
  
  return null;
}

export async function POST(req: Request, res: Response) {
  try {
    // Check authentication
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.EXPORT_ADMIN_KEY || process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD;
    
    if (!adminKey || !expectedKey || adminKey !== expectedKey) {
      return res.status(401).json({ 
        ok: false, 
        error: 'Unauthorized - invalid or missing admin key' 
      });
    }

    const { places } = req.body;
    
    if (!Array.isArray(places)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Request body must contain an array of places' 
      });
    }

    const supabase = getSupabaseAdmin();
    
    // Ensure canonical_key column exists and create UNIQUE index
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DO $$
          BEGIN
            -- Add canonical_key column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'places' AND column_name = 'canonical_key') THEN
              ALTER TABLE places ADD COLUMN canonical_key text;
            END IF;
            
            -- Create unique index if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_places_canonical_key') THEN
              CREATE UNIQUE INDEX uq_places_canonical_key ON places (canonical_key);
            END IF;
          END
          $$;
        `
      });
    } catch (schemaError) {
      console.error('Schema setup error:', schemaError);
      // Continue execution - the column might already exist
    }

    const results = {
      upserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process each place
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      
      try {
        // Validate required fields
        if (!place.name || typeof place.name !== 'string') {
          results.errors.push(`Place ${i + 1}: Missing or invalid name`);
          results.skipped++;
          continue;
        }

        if (!place.category || typeof place.category !== 'string') {
          results.errors.push(`Place ${i + 1}: Missing or invalid category`);
          results.skipped++;
          continue;
        }

        // Create canonical key for deduplication
        const canonicalKey = createCanonicalKey(place.name, place.address);

        // Map and validate fields
        const mappedPlace: any = {
          name: place.name.trim(),
          type: place.category.toLowerCase().trim(),
          address: place.address?.trim() || null,
          city: place.city?.trim() || 'Vancouver, BC',
          neighborhood: place.neighborhood?.trim() || null,
          description: stripHtml(place.description),
          website_url: validateUrl(place.website),
          instagram: place.social?.trim() || null,
          image_url: validateUrl(place.cover_image),
          price_level: parsePriceRange(place.price_range),
          canonical_key: canonicalKey,
          updated_at: new Date().toISOString(),
          status: 'active' // Default to active for bulk imports
        };

        // Handle tags array
        if (Array.isArray(place.tags)) {
          mappedPlace.tags = place.tags.filter((tag: any) => 
            tag && typeof tag === 'string' && tag.trim()
          ).map((tag: any) => tag.trim().toLowerCase());
        } else if (typeof place.tags === 'string') {
          mappedPlace.tags = place.tags.split(',')
            .filter((tag: string) => tag.trim())
            .map((tag: string) => tag.trim().toLowerCase());
        } else {
          mappedPlace.tags = [];
        }

        // Attempt upsert with conflict resolution
        const { data, error } = await supabase
          .from('places')
          .upsert(mappedPlace, {
            onConflict: 'canonical_key',
            ignoreDuplicates: false
          })
          .select('id, created_at, updated_at')
          .single();

        if (error) {
          results.errors.push(`Place ${i + 1} (${place.name}): ${error.message}`);
          results.skipped++;
        } else {
          // Check if this was an insert or update based on timestamps
          const createdAt = new Date(data.created_at);
          const updatedAt = new Date(data.updated_at);
          
          if (Math.abs(updatedAt.getTime() - createdAt.getTime()) < 1000) {
            results.upserted++; // New record
          } else {
            results.updated++; // Existing record updated
          }
        }

      } catch (placeError) {
        console.error(`Error processing place ${i + 1}:`, placeError);
        results.errors.push(`Place ${i + 1} (${place.name}): Processing error`);
        results.skipped++;
      }
    }

    // Return summary
    res.json({
      ok: true,
      summary: results,
      processed: places.length,
      message: `Processed ${places.length} places: ${results.upserted} new, ${results.updated} updated, ${results.skipped} skipped/failed`
    });

  } catch (error) {
    console.error('Bulk upsert error:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to process bulk upsert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}