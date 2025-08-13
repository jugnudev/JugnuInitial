import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { classifyPlace } from './place-classifier.js';

const supabase = getSupabaseAdmin();

// Types for external APIs
interface GooglePlace {
  place_id: string;
  name: string;
  business_status?: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

interface YelpBusiness {
  id: string;
  name: string;
  url: string;
  rating: number;
  review_count: number;
  is_closed: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  location: {
    display_address: string[];
    country?: string;
  };
  categories: Array<{
    alias: string;
    title: string;
  }>;
  image_url?: string;
}

// Utility functions
function normalizeUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function createCanonicalKey(name: string, address?: string): string {
  const normalizedName = name.toLowerCase().trim();
  const normalizedAddress = address ? address.toLowerCase().trim() : '';
  return `${normalizedName}|${normalizedAddress}`;
}

// Use the enhanced classifier from v1.3

// Metro Vancouver geofencing
function isWithinMetroVancouver(lat: number, lng: number): boolean {
  const bounds = { north: 49.45, south: 49.0, east: -122.4, west: -123.45 };
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

function isValidGoogleResult(googlePlace: any): boolean {
  const location = googlePlace.geometry?.location;
  if (!location || !isWithinMetroVancouver(location.lat, location.lng)) {
    return false;
  }
  
  if (googlePlace.address_components) {
    const countryComponent = googlePlace.address_components.find((comp: any) => 
      comp.types.includes('country')
    );
    if (countryComponent?.short_name !== 'CA') {
      return false;
    }
  }
  
  return true;
}

function isValidYelpResult(yelpBusiness: any): boolean {
  if (yelpBusiness.location?.country !== 'CA') return false;
  
  const state = yelpBusiness.location?.state;
  if (!state || !['BC', 'British Columbia'].includes(state)) return false;
  
  const coords = yelpBusiness.coordinates;
  if (!coords || !isWithinMetroVancouver(coords.latitude, coords.longitude)) return false;
  
  return true;
}

function extractCityAndCountry(googlePlace: any): { city: string; country: string } {
  let city = 'Vancouver';
  let country = 'CA';
  
  if (googlePlace.address_components) {
    const cityComponent = googlePlace.address_components.find((comp: any) => 
      comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
    );
    const countryComponent = googlePlace.address_components.find((comp: any) => 
      comp.types.includes('country')
    );
    
    if (cityComponent) city = cityComponent.long_name;
    if (countryComponent) country = countryComponent.short_name;
  }
  
  return { city, country };
}

function extractTags(place: GooglePlace | YelpBusiness, categories?: Array<{alias: string, title: string}>): string[] {
  const tags: Set<string> = new Set();
  
  // Add cuisine-based tags
  const southAsianKeywords = [
    'indian', 'pakistani', 'bangladeshi', 'nepali', 'sri lankan', 'afghan',
    'punjabi', 'gujarati', 'tamil', 'kerala', 'kashmiri', 'desi',
    'biryani', 'dosa', 'chaat', 'mithai', 'halal', 'bollywood'
  ];
  
  const name = place.name.toLowerCase();
  southAsianKeywords.forEach(keyword => {
    if (name.includes(keyword)) {
      tags.add(keyword);
    }
  });
  
  // Add Yelp categories
  if (categories) {
    categories.forEach(cat => {
      const alias = cat.alias.toLowerCase();
      const title = cat.title.toLowerCase();
      
      if (alias.includes('indian') || title.includes('indian')) tags.add('indian');
      if (alias.includes('pakistani') || title.includes('pakistani')) tags.add('pakistani');
      if (alias.includes('bangladeshi') || title.includes('bangladeshi')) tags.add('bangladeshi');
      if (alias.includes('halal') || title.includes('halal')) tags.add('halal');
      if (alias.includes('vegetarian') || title.includes('vegetarian')) tags.add('vegetarian');
    });
  }
  
  return Array.from(tags);
}

function parseCity(address: string): { city: string; neighborhood?: string } {
  const parts = address.split(',').map(p => p.trim());
  
  // Look for BC cities
  const cities = ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'New Westminster', 
                 'Delta', 'North Vancouver', 'West Vancouver', 'Coquitlam'];
  
  for (const part of parts) {
    for (const city of cities) {
      if (part.includes(city)) {
        return { city: `${city}, BC` };
      }
    }
  }
  
  return { city: 'Vancouver, BC' };
}

// Distance calculation for deduplication
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

// Google Places API functions with strict geofencing
export async function searchGooglePlaces(query: string, city: string): Promise<GooglePlace[]> {
  const API_KEY = process.env.GOOGLE_PLACES_KEY;
  if (!API_KEY) {
    throw new Error('GOOGLE_PLACES_KEY not found in environment');
  }

  // City-specific location bias coordinates
  const cityCoords: Record<string, string> = {
    'Vancouver': '49.2827,-123.1207',
    'Burnaby': '49.2488,-122.9805', 
    'Richmond': '49.1666,-123.1336',
    'Surrey': '49.1913,-122.8490',
    'North Vancouver': '49.3181,-123.0680',
    'West Vancouver': '49.3289,-123.1645',
    'Coquitlam': '49.2838,-122.7932'
  };

  const locationbias = cityCoords[city] || cityCoords['Vancouver'];
  const searchQuery = `${query} in ${city}`;

  const params = new URLSearchParams({
    query: searchQuery,
    key: API_KEY,
    region: 'CA',
    locationbias: `circle:5000@${locationbias}` // 5km radius bias
  });

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error_message) {
      throw new Error(`Google Places API error: ${data.error_message}`);
    }
    
    // Filter results to only Metro Vancouver using geofencing
    const results = data.results || [];
    const filteredResults = results.filter((place: any) => isValidGoogleResult(place));
    
    return filteredResults;
  } catch (error) {
    console.error(`Error searching Google Places for "${query}" in ${city}:`, error);
    return [];
  }
}

export async function getGooglePlaceDetails(placeId: string): Promise<GooglePlace | null> {
  const API_KEY = process.env.GOOGLE_PLACES_KEY;
  if (!API_KEY) {
    throw new Error('GOOGLE_PLACES_KEY not found in environment');
  }

  const fields = 'place_id,name,business_status,formatted_address,geometry,rating,user_ratings_total,website,types,photos';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error_message) {
      throw new Error(`Google Place Details API error: ${data.error_message}`);
    }
    
    return data.result || null;
  } catch (error) {
    console.error(`Error getting Google Place details for ${placeId}:`, error);
    return null;
  }
}

// Yelp API functions
export async function searchYelpBusinesses(term: string, location: string): Promise<YelpBusiness[]> {
  const API_KEY = process.env.YELP_API_KEY;
  if (!API_KEY) {
    throw new Error('YELP_API_KEY not found in environment');
  }

  const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(term)}&location=${encodeURIComponent(location)}&limit=50`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Yelp API error: ${data.error.description}`);
    }
    
    // Filter results to only Metro Vancouver
    const businesses = data.businesses || [];
    const filteredBusinesses = businesses.filter((business: any) => isValidYelpResult(business));
    
    return filteredBusinesses;
  } catch (error) {
    console.error(`Error searching Yelp for "${term}" in ${location}:`, error);
    return [];
  }
}

// Main import functions
export async function importFromGoogle(cities: string[]): Promise<{imported: number, errors: string[]}> {
  const results = { imported: 0, errors: [] as string[] };
  
  const searchTerms = [
    'indian restaurant', 'pakistani restaurant', 'bangladeshi restaurant',
    'south asian restaurant', 'punjabi restaurant', 'gujarati restaurant',
    'tamil restaurant', 'afghan restaurant', 'halal restaurant',
    'indian grocery', 'south asian grocery', 'desi grocery',
    'indian clothing', 'south asian clothing', 'sari shop',
    'gurdwara', 'sikh temple', 'hindu temple', 'indian temple', 'mosque'
  ];
  
  for (const city of cities) {
    for (const term of searchTerms) {
      try {
        const places = await searchGooglePlaces(term, city);
        
        for (const place of places) {
          try {
            // Get detailed info
            const details = await getGooglePlaceDetails(place.place_id);
            if (!details) continue;
            
            // Check if this is South Asian related
            const name = details.name.toLowerCase();
            const types = details.types || [];
            const isSouthAsian = [
              'indian', 'pakistani', 'bangladeshi', 'nepali', 'sri lankan', 'afghan',
              'punjabi', 'gujarati', 'tamil', 'kerala', 'desi', 'biryani', 'dosa',
              'chaat', 'mithai', 'halal', 'bollywood', 'gurdwara', 'temple', 'mandir',
              'mosque', 'masjid'
            ].some(keyword => name.includes(keyword));
            
            if (!isSouthAsian) continue;
            
            // Check for existing by google_place_id or canonical key
            const canonicalKey = createCanonicalKey(details.name, details.formatted_address);
            
            const { data: existing } = await supabase
              .from('places')
              .select('id, google_place_id')
              .or(`google_place_id.eq.${details.place_id},name.ilike.${details.name.replace(/'/g, "''")}`)
              .single();
            
            const cityAndCountry = extractCityAndCountry(details);
            const category = classifyPlace(details.name, [], details.types || []);
            const tags = extractTags(details);
            
            // Extract photo data
            let photoData: any = {};
            if (details.photos && details.photos.length > 0) {
              photoData.google_photo_ref = details.photos[0].photo_reference;
              photoData.photo_source = 'google';
            }
            
            const placeData: any = {
              name: details.name,
              type: category,
              address: details.formatted_address,
              city: cityAndCountry.city,
              country: cityAndCountry.country,
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng,
              website_url: normalizeUrl(details.website),
              rating: details.rating,
              rating_count: details.user_ratings_total,
              google_place_id: details.place_id,
              business_status: details.business_status || 'OPERATIONAL',
              last_verified_at: new Date().toISOString(),
              tags: tags,
              status: details.business_status === 'CLOSED' ? 'inactive' : 'active',
              ...photoData
            };
            
            if (existing) {
              // Update existing
              await supabase
                .from('places')
                .update(placeData)
                .eq('id', existing.id);
            } else {
              // Insert new
              await supabase
                .from('places')
                .insert(placeData);
              results.imported++;
            }
            
          } catch (placeError) {
            console.error(`Error processing place ${place.place_id}:`, placeError);
            results.errors.push(`Failed to process ${place.name}: ${placeError instanceof Error ? placeError.message : 'Unknown error'}`);
          }
        }
        
        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (termError) {
        console.error(`Error searching for "${term}" in ${city}:`, termError);
        results.errors.push(`Failed search "${term}" in ${city}: ${termError instanceof Error ? termError.message : 'Unknown error'}`);
      }
    }
  }
  
  return results;
}

export async function importFromYelp(cities: string[]): Promise<{imported: number, updated: number, errors: string[]}> {
  const results = { imported: 0, updated: 0, errors: [] as string[] };
  
  const categories = ['indian', 'pakistani', 'bangladeshi', 'sri_lankan', 'afghani', 'halal'];
  
  for (const city of cities) {
    for (const category of categories) {
      try {
        const businesses = await searchYelpBusinesses(category, `${city}, BC`);
        
        for (const business of businesses) {
          try {
            const canonicalKey = createCanonicalKey(business.name, business.location.display_address.join(', '));
            
            // Try to find existing place by Yelp ID, Google Place ID, or name match
            const { data: existing } = await supabase
              .from('places')
              .select('id, yelp_id, google_place_id, lat, lng, image_url')
              .or(`yelp_id.eq.${business.id},name.ilike.${business.name.replace(/'/g, "''")}`)
              .single();
            
            const cityInfo = parseCity(business.location.display_address.join(', '));
            const yelpCategories = business.categories || [];
            const category = classifyPlace(business.name, yelpCategories);
            const tags = extractTags(business, business.categories);
            
            const existingImageUrl = existing?.image_url;
            const yelpData: any = {
              yelp_id: business.id,
              rating: business.rating,
              rating_count: business.review_count,
              business_status: business.is_closed ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL',
              country: business.location.country || 'CA',
              status: business.is_closed ? 'inactive' : 'active',
              last_verified_at: new Date().toISOString(),
              lat: business.coordinates.latitude,
              lng: business.coordinates.longitude,
            };
            
            // Add photo data if available and no existing image  
            if (business.image_url && !existingImageUrl) {
              yelpData.image_url = business.image_url;
              yelpData.photo_source = 'yelp';
            }
            
            if (existing) {
              // Check if we can merge with Google data by location proximity
              if (existing.lat && existing.lng) {
                const distance = calculateDistance(
                  existing.lat, existing.lng,
                  business.coordinates.latitude, business.coordinates.longitude
                );
                
                // If within 80 meters, merge data
                if (distance <= 80) {
                  await supabase
                    .from('places')
                    .update(yelpData)
                    .eq('id', existing.id);
                  results.updated++;
                }
              } else {
                // Update with Yelp data
                await supabase
                  .from('places')
                  .update(yelpData)
                  .eq('id', existing.id);
                results.updated++;
              }
            } else {
              // Create new place from Yelp data
              const newPlace: any = {
                name: business.name,
                type: category, // Use proper category mapping
                address: business.location.display_address.join(', '),
                city: cityInfo.city,
                neighborhood: cityInfo.neighborhood,
                website_url: normalizeUrl(business.url),
                tags: tags,
                ...yelpData
              };
              
              await supabase
                .from('places')
                .insert(newPlace);
              results.imported++;
            }
            
          } catch (businessError) {
            console.error(`Error processing Yelp business ${business.id}:`, businessError);
            results.errors.push(`Failed to process ${business.name}: ${businessError instanceof Error ? businessError.message : 'Unknown error'}`);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (categoryError) {
        console.error(`Error searching Yelp category "${category}" in ${city}:`, categoryError);
        results.errors.push(`Failed Yelp search "${category}" in ${city}: ${categoryError instanceof Error ? categoryError.message : 'Unknown error'}`);
      }
    }
  }
  
  return results;
}

export async function reverifyAllPlaces(): Promise<{verified: number, deactivated: number, errors: string[]}> {
  const results = { verified: 0, deactivated: 0, errors: [] as string[] };
  
  try {
    // Get all places with Google Place IDs
    const { data: places, error } = await supabase
      .from('places')
      .select('id, google_place_id, name')
      .not('google_place_id', 'is', null);
    
    if (error) {
      results.errors.push(`Failed to fetch places: ${error.message}`);
      return results;
    }
    
    if (!places) return results;
    
    for (const place of places) {
      try {
        const details = await getGooglePlaceDetails(place.google_place_id);
        
        if (details) {
          const isOperational = details.business_status === 'OPERATIONAL';
          const updateData: any = {
            business_status: details.business_status || 'UNKNOWN',
            status: isOperational ? 'active' : 'inactive',
            rating: details.rating,
            rating_count: details.user_ratings_total,
            last_verified_at: new Date().toISOString()
          };
          
          await supabase
            .from('places')
            .update(updateData)
            .eq('id', place.id);
          
          if (isOperational) {
            results.verified++;
          } else {
            results.deactivated++;
          }
        } else {
          // Place not found in Google - mark as inactive
          await supabase
            .from('places')
            .update({
              business_status: 'UNKNOWN',
              status: 'inactive',
              last_verified_at: new Date().toISOString()
            })
            .eq('id', place.id);
          
          results.deactivated++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (placeError) {
        console.error(`Error reverifying place ${place.id}:`, placeError);
        results.errors.push(`Failed to reverify ${place.name}: ${placeError instanceof Error ? placeError.message : 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    console.error('Error in reverifyAllPlaces:', error);
    results.errors.push(`Reverification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return results;
}