// Enhanced category mapping for Places Sync v1.2

/**
 * Map place to appropriate category based on name and type data
 */
export function mapPlaceCategory(name: string, yelpCategories?: string[], googleTypes?: string[]): string {
  const nameLower = name.toLowerCase();
  
  // Religious institutions - highest priority
  if (nameLower.match(/mandir|temple|iskcon|shiv|krishna|sai/)) {
    return 'Temple';
  }
  
  if (nameLower.match(/gurdwara|gurudwara|sikh/)) {
    return 'Gurdwara';
  }
  
  if (nameLower.match(/mosque|masjid|islamic centre|islamic center/)) {
    return 'Mosque';
  }
  
  // Yelp category mapping
  if (yelpCategories) {
    const yelpCats = yelpCategories.map(cat => cat.toLowerCase());
    
    // Food & Beverage
    if (yelpCats.some(cat => ['indpak', 'indian', 'pakistani', 'srilankan', 'bangladeshi', 'afghani', 'halal'].includes(cat))) {
      return 'Restaurant';
    }
    
    if (yelpCats.some(cat => ['desserts', 'coffee', 'tea', 'bubbletea', 'bakeries', 'cafes'].includes(cat))) {
      return 'Cafe/Dessert';
    }
    
    // Retail
    if (yelpCats.some(cat => ['grocery', 'internationalgrocery', 'markets'].includes(cat))) {
      return 'Grocery Store';
    }
    
    if (yelpCats.some(cat => ['fashion', 'clothing', 'jewelry', 'accessories'].includes(cat))) {
      return 'Clothing Store';
    }
    
    // Services
    if (yelpCats.some(cat => ['beautysvc', 'hair', 'skincare', 'makeupartists', 'cosmetics'].includes(cat))) {
      return 'Beauty Salon';
    }
    
    // Religious organizations - use name-based mapping above
    if (yelpCats.includes('religiousorgs')) {
      // Already handled by name matching above
      return 'Community Organization';
    }
  }
  
  // Google types mapping
  if (googleTypes) {
    const googleTypesLower = googleTypes.map(type => type.toLowerCase());
    
    if (googleTypesLower.some(type => ['bakery', 'cafe'].includes(type))) {
      return 'Cafe/Dessert';
    }
    
    if (googleTypesLower.includes('grocery_or_supermarket')) {
      return 'Grocery Store';
    }
    
    if (googleTypesLower.includes('place_of_worship')) {
      // Use name-based mapping above, fallback to Community Organization
      return 'Community Organization';
    }
    
    if (googleTypesLower.some(type => ['restaurant', 'meal_takeaway', 'meal_delivery'].includes(type))) {
      return 'Restaurant';
    }
    
    if (googleTypesLower.some(type => ['clothing_store', 'jewelry_store', 'shoe_store'].includes(type))) {
      return 'Clothing Store';
    }
    
    if (googleTypesLower.some(type => ['beauty_salon', 'hair_care'].includes(type))) {
      return 'Beauty Salon';
    }
  }
  
  // Default fallback - NO "Restaurant" fallback as specified
  return 'Community Organization';
}

/**
 * Validate category against name keywords (for dev utilities)
 */
export function validateCategoryAgainstName(name: string, category: string): boolean {
  const nameLower = name.toLowerCase();
  
  // Check for mismatched religious categories
  if (nameLower.match(/mandir|temple|iskcon|shiv|krishna|sai/) && category !== 'Temple') {
    return false;
  }
  
  if (nameLower.match(/gurdwara|gurudwara|sikh/) && category !== 'Gurdwara') {
    return false;
  }
  
  if (nameLower.match(/mosque|masjid|islamic centre|islamic center/) && category !== 'Mosque') {
    return false;
  }
  
  return true;
}

/**
 * Get all available place categories
 */
export function getPlaceCategories(): string[] {
  return [
    'Restaurant',
    'Cafe/Dessert', 
    'Grocery Store',
    'Clothing Store',
    'Beauty Salon',
    'Temple',
    'Gurdwara',
    'Mosque',
    'Community Organization'
  ];
}