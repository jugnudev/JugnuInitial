// Places Sync v1.3 - Admin routes for reclassification and photo enrichment
import { Express } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { isWorshipPlaceMisclassified, getCorrectWorshipCategory } from './lib/place-classifier.js';

const supabase = getSupabaseAdmin();

export function addPlacesV13Routes(app: Express) {

  // Admin: Reclassify worship places that were incorrectly categorized as Restaurant
  app.post('/api/places/admin/reclassify-worship', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      console.log('Starting worship place reclassification...');

      // Get all places with 'restaurant' type
      const { data: places, error } = await supabase
        .from('places')
        .select('id, name, type')
        .eq('type', 'restaurant');

      if (error) {
        throw new Error(`Failed to fetch places: ${error.message}`);
      }

      const reclassified = [];
      const skipped = [];

      if (places) {
        for (const place of places) {
          if (isWorshipPlaceMisclassified(place.name, place.type)) {
            const correctCategory = getCorrectWorshipCategory(place.name);
            
            if (correctCategory) {
              const { error: updateError } = await supabase
                .from('places')
                .update({ 
                  type: correctCategory,
                  updated_at: new Date().toISOString()
                })
                .eq('id', place.id);

              if (updateError) {
                console.error(`Failed to update ${place.name}:`, updateError);
                skipped.push(`${place.name}: ${updateError.message}`);
              } else {
                reclassified.push({
                  id: place.id,
                  name: place.name,
                  from: place.type,
                  to: correctCategory
                });
                console.log(`✓ Reclassified ${place.name}: restaurant -> ${correctCategory}`);
              }
            }
          }
        }
      }

      console.log(`Worship reclassification completed: ${reclassified.length} updated, ${skipped.length} skipped`);

      res.json({
        ok: true,
        message: `Worship reclassification completed`,
        results: {
          reclassified: reclassified.length,
          skipped: skipped.length,
          details: reclassified,
          errors: skipped
        }
      });

    } catch (error) {
      console.error('Worship reclassification error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Reclassification failed'
      });
    }
  });

  // Admin: Enrich places with photos from Yelp or Google
  app.post('/api/places/admin/enrich-photos', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const limit = parseInt(req.query.limit as string) || 200;
      const source = req.query.source as string || 'all'; // 'yelp', 'google', or 'all'

      console.log(`Starting photo enrichment (limit: ${limit}, source: ${source})...`);

      // Get places missing both image_url and google_photo_ref
      let query = supabase
        .from('places')
        .select('id, name, yelp_id, google_place_id, image_url, google_photo_ref')
        .is('image_url', null)
        .is('google_photo_ref', null)
        .eq('status', 'active')
        .limit(limit);

      // Filter by available data source
      if (source === 'yelp') {
        query = query.not('yelp_id', 'is', null);
      } else if (source === 'google') {
        query = query.not('google_place_id', 'is', null);
      } else {
        // 'all' - either yelp_id or google_place_id must be present
        query = query.or('yelp_id.not.is.null,google_place_id.not.is.null');
      }

      const { data: places, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch places: ${error.message}`);
      }

      const results = {
        enriched: 0,
        yelpPhotos: 0,
        googlePhotos: 0,
        skipped: 0,
        errors: [] as string[]
      };

      if (places) {
        for (const place of places) {
          try {
            let photoData: any = null;

            // Try Yelp first if available (images are usually higher quality)
            if ((source === 'yelp' || source === 'all') && place.yelp_id) {
              try {
                const yelpDetails = await fetchYelpBusinessDetails(place.yelp_id);
                if (yelpDetails && yelpDetails.image_url) {
                  photoData = {
                    image_url: yelpDetails.image_url,
                    photo_source: 'yelp'
                  };
                  results.yelpPhotos++;
                }
              } catch (yelpError) {
                console.warn(`Yelp photo fetch failed for ${place.name}:`, yelpError);
              }
            }

            // If no Yelp photo, try Google if available
            if (!photoData && (source === 'google' || source === 'all') && place.google_place_id) {
              try {
                const googleDetails = await fetchGooglePlaceDetails(place.google_place_id);
                if (googleDetails && googleDetails.photos && googleDetails.photos.length > 0) {
                  photoData = {
                    google_photo_ref: googleDetails.photos[0].photo_reference,
                    photo_source: 'google'
                  };
                  results.googlePhotos++;
                }
              } catch (googleError) {
                console.warn(`Google photo fetch failed for ${place.name}:`, googleError);
              }
            }

            if (photoData) {
              const { error: updateError } = await supabase
                .from('places')
                .update({
                  ...photoData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', place.id);

              if (updateError) {
                results.errors.push(`${place.name}: ${updateError.message}`);
              } else {
                results.enriched++;
                console.log(`✓ Enriched ${place.name} with ${photoData.photo_source} photo`);
              }
            } else {
              results.skipped++;
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));

          } catch (placeError) {
            console.error(`Error enriching ${place.name}:`, placeError);
            results.errors.push(`${place.name}: ${placeError instanceof Error ? placeError.message : 'Unknown error'}`);
          }
        }
      }

      console.log(`Photo enrichment completed: ${results.enriched} enriched (${results.yelpPhotos} Yelp, ${results.googlePhotos} Google), ${results.skipped} skipped, ${results.errors.length} errors`);

      res.json({
        ok: true,
        message: `Photo enrichment completed`,
        results
      });

    } catch (error) {
      console.error('Photo enrichment error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Photo enrichment failed'
      });
    }
  });

}

// Helper functions for API calls
async function fetchYelpBusinessDetails(yelpId: string): Promise<any> {
  const response = await fetch(`https://api.yelp.com/v3/businesses/${yelpId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.YELP_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Yelp API error: ${response.status}`);
  }

  return response.json();
}

async function fetchGooglePlaceDetails(placeId: string): Promise<any> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${process.env.GOOGLE_PLACES_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error_message) {
    throw new Error(data.error_message);
  }

  return data.result;
}