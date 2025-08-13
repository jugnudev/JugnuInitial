// Places Sync v1.3 - Enhanced place classification with worship place detection
import { mapPlaceCategory } from './category-mapper.js';

interface YelpCategory {
  alias: string;
  title: string;
}

export function classifyPlace(
  name: string,
  yelpCategories: YelpCategory[] = [],
  googleTypes: string[] = []
): string {
  const nameLower = name.toLowerCase();
  
  // Worship place detection by name (highest priority)
  if (nameLower.match(/\b(mandir|temple|iskcon|shiv|krishna|sai|hindu)\b/i)) {
    return 'temple';
  }
  
  if (nameLower.match(/\b(gurdwara|gurudwara|sikh)\b/i)) {
    return 'gurdwara';
  }
  
  if (nameLower.match(/\b(mosque|masjid|islamic\s+centre?|islamic\s+center|jamia)\b/i)) {
    return 'mosque';
  }

  // Check for religious organization in Yelp categories + name keywords
  const hasReligiousCategory = yelpCategories.some(cat => 
    cat.alias === 'religiousorgs' || 
    cat.alias === 'churches' ||
    cat.title.toLowerCase().includes('religious')
  );

  if (hasReligiousCategory) {
    // Apply name-based classification for religious places
    if (nameLower.match(/\b(mandir|temple|iskcon|shiv|krishna|sai|hindu)\b/i)) {
      return 'temple';
    }
    if (nameLower.match(/\b(gurdwara|gurudwara|sikh)\b/i)) {
      return 'gurdwara';
    }
    if (nameLower.match(/\b(mosque|masjid|islamic)\b/i)) {
      return 'mosque';
    }
    // Other religious organizations
    return 'org';
  }

  // Google Types for worship places
  if (googleTypes.includes('place_of_worship')) {
    // Apply name-based classification
    if (nameLower.match(/\b(mandir|temple|iskcon|shiv|krishna|sai|hindu)\b/i)) {
      return 'temple';
    }
    if (nameLower.match(/\b(gurdwara|gurudwara|sikh)\b/i)) {
      return 'gurdwara';
    }
    if (nameLower.match(/\b(mosque|masjid|islamic)\b/i)) {
      return 'mosque';
    }
    return 'org'; // Generic worship place
  }

  // Yelp category mapping
  const yelpAliases = yelpCategories.map(cat => cat.alias);
  
  // Food & Beverage
  if (yelpAliases.some(alias => [
    'indpak', 'indian', 'pakistani', 'srilankan', 'bangladeshi', 'afghani', 'halal',
    'restaurants', 'food'
  ].includes(alias))) {
    return 'restaurant';
  }

  if (yelpAliases.some(alias => [
    'desserts', 'coffee', 'tea', 'bubbletea', 'bakery', 'cafes', 'icecream'
  ].includes(alias))) {
    return 'cafe';
  }

  // Retail & Services  
  if (yelpAliases.some(alias => [
    'grocery', 'internationalgrocery', 'markets', 'ethnic_grocery'
  ].includes(alias))) {
    return 'grocer';
  }

  if (yelpAliases.some(alias => [
    'fashion', 'clothing', 'jewelry', 'accessories', 'shoes'
  ].includes(alias))) {
    return 'fashion';
  }

  if (yelpAliases.some(alias => [
    'beautysvc', 'hair', 'skincare', 'makeupartists', 'massage', 'spas'
  ].includes(alias))) {
    return 'beauty';
  }

  // Google Types mapping
  if (googleTypes.includes('bakery') || googleTypes.includes('cafe')) {
    return 'cafe';
  }
  
  if (googleTypes.includes('grocery_or_supermarket') || googleTypes.includes('supermarket')) {
    return 'grocer';
  }

  if (googleTypes.includes('restaurant') || googleTypes.includes('food')) {
    return 'restaurant';
  }

  // Cultural & community
  if (yelpAliases.some(alias => [
    'dancestudio', 'culturalcenter', 'nonprofit'
  ].includes(alias))) {
    return 'dance';
  }

  // Fallback to Community Organization (NEVER Restaurant)
  return 'org';
}

// Validation function to check if a place is misclassified
export function isWorshipPlaceMisclassified(name: string, currentCategory: string): boolean {
  const nameLower = name.toLowerCase();
  
  // Check if it's a worship place that's been classified as something else
  const isWorshipPlace = nameLower.match(/\b(mandir|temple|iskcon|shiv|krishna|sai|hindu|gurdwara|gurudwara|sikh|mosque|masjid|islamic\s+centre?|islamic\s+center|jamia)\b/i);
  
  if (isWorshipPlace && !['temple', 'gurdwara', 'mosque'].includes(currentCategory)) {
    return true;
  }
  
  return false;
}

// Get correct worship category for a misclassified place
export function getCorrectWorshipCategory(name: string): string | null {
  const nameLower = name.toLowerCase();
  
  if (nameLower.match(/\b(mandir|temple|iskcon|shiv|krishna|sai|hindu)\b/i)) {
    return 'temple';
  }
  
  if (nameLower.match(/\b(gurdwara|gurudwara|sikh)\b/i)) {
    return 'gurdwara';
  }
  
  if (nameLower.match(/\b(mosque|masjid|islamic\s+centre?|islamic\s+center|jamia)\b/i)) {
    return 'mosque';
  }
  
  return null;
}