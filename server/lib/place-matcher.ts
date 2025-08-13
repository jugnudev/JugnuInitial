import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { calculatePlaceScore, normalizeForComparison } from './string-similarity.js';

const supabase = getSupabaseAdmin();

interface PlaceToMatch {
  id: string;
  name: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  yelp_id?: string;
  website_url?: string;
  rating?: number;
  rating_count?: number;
  image_url?: string;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  website?: string;
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

interface YelpBusinessResult {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  location: {
    display_address: string[];
  };
  url?: string;
  is_closed: boolean;
}

interface MatchResult {
  matched: number;
  enriched: number;
  merged: number;
  skipped: number;
  errors: string[];
}

// Google Places Text Search
async function searchGooglePlaces(query: string): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const params = new URLSearchParams({
    query,
    key: apiKey,
    fields: 'place_id,name,formatted_address,geometry,website,business_status,rating,user_ratings_total,types'
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
  const data = await response.json();

  if (data.status === 'OK') {
    return data.results || [];
  } else if (data.status === 'ZERO_RESULTS') {
    return [];
  } else {
    throw new Error(`Google Places Text Search error: ${data.error_message || data.status}`);
  }
}

// Yelp Business Search
async function searchYelpBusiness(name: string, city: string): Promise<YelpBusinessResult[]> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return []; // Yelp is optional
  }

  const params = new URLSearchParams({
    term: name,
    location: `${city}, BC, Canada`,
    limit: '5'
  });

  const response = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    console.warn(`Yelp search failed for "${name}": ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.businesses || [];
}

// Find the most complete place (for duplicate resolution)
function selectWinnerPlace(place1: PlaceToMatch, place2: PlaceToMatch): PlaceToMatch {
  let score1 = 0;
  let score2 = 0;

  // Score based on completeness
  if (place1.image_url) score1 += 3;
  if (place1.website_url) score1 += 2;
  if (place1.rating_count && place1.rating_count > 0) score1 += 1;
  if (place1.google_place_id) score1 += 1;
  if (place1.yelp_id) score1 += 1;

  if (place2.image_url) score2 += 3;
  if (place2.website_url) score2 += 2;
  if (place2.rating_count && place2.rating_count > 0) score2 += 1;
  if (place2.google_place_id) score2 += 1;
  if (place2.yelp_id) score2 += 1;

  // If scores are equal, prefer higher rating count
  if (score1 === score2) {
    const count1 = place1.rating_count || 0;
    const count2 = place2.rating_count || 0;
    return count1 >= count2 ? place1 : place2;
  }

  return score1 > score2 ? place1 : place2;
}

// Merge data from loser to winner
function mergePlace(winner: PlaceToMatch, loser: PlaceToMatch): Partial<PlaceToMatch> {
  const updates: Partial<PlaceToMatch> = {};

  // Copy non-null fields from loser if winner's field is null
  if (!winner.image_url && loser.image_url) updates.image_url = loser.image_url;
  if (!winner.website_url && loser.website_url) updates.website_url = loser.website_url;
  if (!winner.google_place_id && loser.google_place_id) updates.google_place_id = loser.google_place_id;
  if (!winner.yelp_id && loser.yelp_id) updates.yelp_id = loser.yelp_id;
  
  // Use better rating data if available
  const winnerRatingCount = winner.rating_count || 0;
  const loserRatingCount = loser.rating_count || 0;
  if (loserRatingCount > winnerRatingCount && loser.rating) {
    updates.rating = loser.rating;
    updates.rating_count = loser.rating_count;
  }

  return updates;
}

// Create canonical key for duplicate detection
function createCanonicalKey(name: string, address: string): string {
  const normName = normalizeForComparison(name);
  const normAddress = normalizeForComparison(address);
  return `${normName}|${normAddress}`;
}

// Main matching function
export async function matchAndEnrichPlaces(limit: number = 200): Promise<MatchResult> {
  const result: MatchResult = {
    matched: 0,
    enriched: 0,
    merged: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Get places that need matching
    const { data: places, error } = await supabase
      .from('places')
      .select('*')
      .or('google_place_id.is.null,yelp_id.is.null')
      .in('status', ['active', 'pending'])
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch places: ${error.message}`);
    }

    if (!places || places.length === 0) {
      return result;
    }

    console.log(`Processing ${places.length} places for ID matching...`);

    for (const place of places) {
      try {
        let matched = false;
        let enriched = false;

        // Skip if already has both Google and Yelp IDs
        if (place.google_place_id && place.yelp_id) {
          result.skipped++;
          continue;
        }

        // Try Google Places search if missing google_place_id
        if (!place.google_place_id) {
          const searchQuery = `${place.name} ${place.address} ${place.city}`;
          console.log(`Searching Google Places for: "${searchQuery}"`);

          try {
            const googleResults = await searchGooglePlaces(searchQuery);
            
            let bestMatch: GooglePlaceResult | null = null;
            let bestScore = 0;

            for (const candidate of googleResults) {
              const score = calculatePlaceScore(
                { name: place.name, address: place.address, lat: place.lat, lng: place.lng },
                {
                  name: candidate.name,
                  address: candidate.formatted_address,
                  lat: candidate.geometry.location.lat,
                  lng: candidate.geometry.location.lng
                }
              );

              if (score > bestScore && score >= 0.85) {
                bestScore = score;
                bestMatch = candidate;
              }
            }

            if (bestMatch) {
              console.log(`Found Google match for "${place.name}" with score ${bestScore.toFixed(3)}`);

              // Check for existing place with this google_place_id
              const { data: existing } = await supabase
                .from('places')
                .select('*')
                .eq('google_place_id', bestMatch.place_id)
                .neq('id', place.id)
                .single();

              if (existing) {
                // Handle duplicate - merge places
                const winner = selectWinnerPlace(place, existing);
                const loser = winner.id === place.id ? existing : place;
                const mergeUpdates = mergePlace(winner, loser);

                // Update winner with merged data and Google info
                const winnerUpdates = {
                  ...mergeUpdates,
                  google_place_id: bestMatch.place_id,
                  business_status: bestMatch.business_status || 'OPERATIONAL',
                  rating: bestMatch.rating || winner.rating,
                  rating_count: bestMatch.user_ratings_total || winner.rating_count,
                  website_url: bestMatch.website || winner.website_url,
                  lat: bestMatch.geometry.location.lat,
                  lng: bestMatch.geometry.location.lng,
                  last_verified_at: new Date().toISOString()
                };

                await supabase
                  .from('places')
                  .update(winnerUpdates)
                  .eq('id', winner.id);

                // Mark loser as merged
                await supabase
                  .from('places')
                  .update({
                    status: 'merged',
                    featured: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', loser.id);

                result.merged++;
                console.log(`Merged duplicate places: ${winner.name} (winner) and ${loser.name} (merged)`);
              } else {
                // Update place with Google data
                const updates: any = {
                  google_place_id: bestMatch.place_id,
                  business_status: bestMatch.business_status || 'OPERATIONAL',
                  last_verified_at: new Date().toISOString(),
                  lat: bestMatch.geometry.location.lat,
                  lng: bestMatch.geometry.location.lng
                };

                // Only update rating if Google has better data
                if (bestMatch.rating && (!place.rating || (bestMatch.user_ratings_total || 0) > (place.rating_count || 0))) {
                  updates.rating = bestMatch.rating;
                  updates.rating_count = bestMatch.user_ratings_total;
                }

                // Only update website if we don't have one
                if (bestMatch.website && !place.website_url) {
                  updates.website_url = bestMatch.website;
                }

                await supabase
                  .from('places')
                  .update(updates)
                  .eq('id', place.id);

                matched = true;
                enriched = true;
              }
            }

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (googleError) {
            console.error(`Google search failed for "${place.name}":`, googleError);
            result.errors.push(`Google search failed for "${place.name}": ${googleError instanceof Error ? googleError.message : String(googleError)}`);
          }
        }

        // Try Yelp search if missing yelp_id
        if (!place.yelp_id) {
          try {
            const yelpResults = await searchYelpBusiness(place.name, place.city);
            
            let bestMatch: YelpBusinessResult | null = null;
            let bestScore = 0;

            for (const candidate of yelpResults) {
              const score = calculatePlaceScore(
                { name: place.name, address: place.address, lat: place.lat, lng: place.lng },
                {
                  name: candidate.name,
                  address: candidate.location.display_address.join(', '),
                  lat: candidate.coordinates.latitude,
                  lng: candidate.coordinates.longitude
                }
              );

              if (score > bestScore && score >= 0.85) {
                bestScore = score;
                bestMatch = candidate;
              }
            }

            if (bestMatch) {
              console.log(`Found Yelp match for "${place.name}" with score ${bestScore.toFixed(3)}`);

              const updates: any = {
                yelp_id: bestMatch.id,
                last_verified_at: new Date().toISOString()
              };

              // Use Yelp rating if it's better (more reviews)
              if (bestMatch.review_count > (place.rating_count || 0)) {
                updates.rating = bestMatch.rating;
                updates.rating_count = bestMatch.review_count;
              }

              await supabase
                .from('places')
                .update(updates)
                .eq('id', place.id);

              matched = true;
              enriched = true;
            }

            // Small delay for Yelp rate limits
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (yelpError) {
            console.warn(`Yelp search failed for "${place.name}":`, yelpError);
            // Don't add to errors since Yelp is optional
          }
        }

        if (matched) result.matched++;
        if (enriched) result.enriched++;
        if (!matched && !enriched) result.skipped++;

      } catch (placeError) {
        console.error(`Error processing place ${place.id}:`, placeError);
        result.errors.push(`Failed to process "${place.name}": ${placeError instanceof Error ? placeError.message : 'Unknown error'}`);
        result.skipped++;
      }
    }

  } catch (error) {
    console.error('Error in matchAndEnrichPlaces:', error);
    result.errors.push(`Matching failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

// Inactivate unmatched places
export async function inactivateUnmatchedPlaces(): Promise<{ inactivated: number; errors: string[] }> {
  const result = { inactivated: 0, errors: [] };

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    const { data, error } = await supabase
      .from('places')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .is('google_place_id', null)
      .lt('last_verified_at', cutoffDate.toISOString())
      .neq('status', 'inactive')
      .select('id, name');

    if (error) {
      throw new Error(`Failed to inactivate places: ${error.message}`);
    }

    result.inactivated = data?.length || 0;
    console.log(`Inactivated ${result.inactivated} unmatched places older than 14 days`);

  } catch (error) {
    console.error('Error in inactivateUnmatchedPlaces:', error);
    result.errors.push(`Inactivation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

// Get statistics for the dev page
export async function getPlaceMatchingStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  merged: number;
  withoutGoogleId: number;
  withoutYelpId: number;
  potentialDuplicates: number;
}> {
  try {
    // Get basic counts
    const { data: allPlaces } = await supabase
      .from('places')
      .select('id, status, google_place_id, yelp_id, name, address');

    if (!allPlaces) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        merged: 0,
        withoutGoogleId: 0,
        withoutYelpId: 0,
        potentialDuplicates: 0
      };
    }

    const total = allPlaces.length;
    const active = allPlaces.filter(p => p.status === 'active').length;
    const inactive = allPlaces.filter(p => p.status === 'inactive').length;
    const merged = allPlaces.filter(p => p.status === 'merged').length;
    const withoutGoogleId = allPlaces.filter(p => !p.google_place_id).length;
    const withoutYelpId = allPlaces.filter(p => !p.yelp_id).length;

    // Calculate potential duplicates by canonical key
    const canonicalKeys = new Set<string>();
    let potentialDuplicates = 0;

    for (const place of allPlaces) {
      if (place.status === 'merged') continue;
      
      const key = createCanonicalKey(place.name, place.address);
      if (canonicalKeys.has(key)) {
        potentialDuplicates++;
      } else {
        canonicalKeys.add(key);
      }
    }

    return {
      total,
      active,
      inactive,
      merged,
      withoutGoogleId,
      withoutYelpId,
      potentialDuplicates
    };

  } catch (error) {
    console.error('Error getting place matching stats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      merged: 0,
      withoutGoogleId: 0,
      withoutYelpId: 0,
      potentialDuplicates: 0
    };
  }
}