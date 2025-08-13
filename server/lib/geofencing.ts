// Metro Vancouver geofencing and validation utilities

export interface MetroVancouverBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Metro Vancouver bounding box
export const METRO_VANCOUVER_BOUNDS: MetroVancouverBounds = {
  north: 49.45,  // North of North Vancouver
  south: 49.0,   // South of Richmond/Delta
  east: -122.4,  // East of Burnaby/Coquitlam
  west: -123.45  // West of West Vancouver/Richmond
};

// Metro Vancouver cities (for validation)
export const METRO_VANCOUVER_CITIES = [
  'Vancouver',
  'Burnaby',
  'Richmond',
  'Surrey',
  'Langley',
  'North Vancouver',
  'West Vancouver',
  'Coquitlam',
  'Port Coquitlam',
  'Port Moody',
  'New Westminster',
  'Delta',
  'White Rock',
  'Pitt Meadows',
  'Maple Ridge',
  'Anmore',
  'Belcarra',
  'Bowen Island',
  'Lions Bay'
];

/**
 * Check if coordinates are within Metro Vancouver bounds
 */
export function isWithinMetroVancouver(lat: number, lng: number): boolean {
  const bounds = METRO_VANCOUVER_BOUNDS;
  return lat >= bounds.south && 
         lat <= bounds.north && 
         lng >= bounds.west && 
         lng <= bounds.east;
}

/**
 * Validate if a city is in Metro Vancouver
 */
export function isMetroVancouverCity(city: string): boolean {
  const normalizedCity = city.trim().toLowerCase();
  return METRO_VANCOUVER_CITIES.some(metroCity => 
    metroCity.toLowerCase() === normalizedCity ||
    normalizedCity.includes(metroCity.toLowerCase())
  );
}

/**
 * Extract country from Google address components
 */
export function extractCountryFromAddressComponents(addressComponents: any[]): string | null {
  const countryComponent = addressComponents.find((component: any) => 
    component.types.includes('country')
  );
  return countryComponent?.short_name || null;
}

/**
 * Extract city from Google address components
 */
export function extractCityFromAddressComponents(addressComponents: any[]): string | null {
  // Try different component types for city
  const cityTypes = ['locality', 'administrative_area_level_2', 'administrative_area_level_1'];
  
  for (const type of cityTypes) {
    const component = addressComponents.find((comp: any) => comp.types.includes(type));
    if (component) {
      return component.long_name;
    }
  }
  
  return null;
}

/**
 * Validate Yelp result for Metro Vancouver
 */
export function isValidYelpResult(yelpBusiness: any): boolean {
  // Check country
  if (yelpBusiness.location?.country !== 'CA') {
    return false;
  }
  
  // Check province/state
  const state = yelpBusiness.location?.state;
  if (!state || !['BC', 'British Columbia'].includes(state)) {
    return false;
  }
  
  // Check coordinates
  const coords = yelpBusiness.coordinates;
  if (!coords || !isWithinMetroVancouver(coords.latitude, coords.longitude)) {
    return false;
  }
  
  return true;
}

/**
 * Validate Google result for Metro Vancouver
 */
export function isValidGoogleResult(googlePlace: any): boolean {
  // Check coordinates
  const location = googlePlace.geometry?.location;
  if (!location || !isWithinMetroVancouver(location.lat, location.lng)) {
    return false;
  }
  
  // Check country from address components
  if (googlePlace.address_components) {
    const country = extractCountryFromAddressComponents(googlePlace.address_components);
    if (country !== 'CA') {
      return false;
    }
  }
  
  return true;
}

/**
 * Format city display with proper BC suffix
 */
export function formatCityDisplay(city: string, neighborhood?: string): string {
  const cityPart = city.endsWith(', BC') ? city : `${city}, BC`;
  return neighborhood ? `${neighborhood} • ${cityPart}` : cityPart;
}