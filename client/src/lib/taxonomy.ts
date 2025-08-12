// Places taxonomy and grouping system
export const PLACE_GROUPS = ['All', 'Eat & Drink', 'Shops & Services', 'Culture & Faith'] as const;
export type PlaceGroup = typeof PLACE_GROUPS[number];

export const EVENT_CATEGORIES = ['All', 'Concert', 'Club', 'Comedy', 'Festival'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

// Map place types to display groups
export function mapPlaceTypeToGroup(type: string): PlaceGroup {
  const typeMap: Record<string, PlaceGroup> = {
    'restaurant': 'Eat & Drink',
    'cafe': 'Eat & Drink', 
    'dessert': 'Eat & Drink',
    'grocer': 'Shops & Services',
    'fashion': 'Shops & Services',
    'beauty': 'Shops & Services',
    'temple': 'Culture & Faith',
    'gurdwara': 'Culture & Faith',
    'mosque': 'Culture & Faith',
    'gallery': 'Culture & Faith',
    'dance': 'Culture & Faith',
    'org': 'Culture & Faith',
    'other': 'Culture & Faith'
  };
  
  return typeMap[type.toLowerCase()] || 'Culture & Faith';
}

// Get place types for a group (for API filtering)
export function getTypesForGroup(group: PlaceGroup): string[] {
  if (group === 'All') return [];
  
  const groupMap: Record<PlaceGroup, string[]> = {
    'All': [],
    'Eat & Drink': ['restaurant', 'cafe', 'dessert'],
    'Shops & Services': ['grocer', 'fashion', 'beauty'],
    'Culture & Faith': ['temple', 'gurdwara', 'mosque', 'gallery', 'dance', 'org', 'other']
  };
  
  return groupMap[group] || [];
}

// Helper to format group names for API params
export function groupToApiParam(group: PlaceGroup): string {
  const paramMap: Record<PlaceGroup, string> = {
    'All': 'all',
    'Eat & Drink': 'eat',
    'Shops & Services': 'shops', 
    'Culture & Faith': 'culture'
  };
  
  return paramMap[group] || 'all';
}

// Helper to convert API param back to group
export function apiParamToGroup(param: string): PlaceGroup {
  const paramMap: Record<string, PlaceGroup> = {
    'all': 'All',
    'eat': 'Eat & Drink',
    'shops': 'Shops & Services',
    'culture': 'Culture & Faith'
  };
  
  return paramMap[param] || 'All';
}

// Price level helpers
export function formatPriceLevel(level?: number): string {
  if (!level) return '';
  return '₹'.repeat(level);
}

export function getPriceLevels() {
  return [
    { value: 1, label: '₹ (Budget)' },
    { value: 2, label: '₹₹ (Moderate)' },
    { value: 3, label: '₹₹₹ (Upscale)' },
    { value: 4, label: '₹₹₹₹ (Fine Dining)' }
  ];
}

// Vancouver neighborhoods
export function getNeighborhoods() {
  return [
    'Downtown',
    'Gastown', 
    'Kitsilano',
    'Burnaby',
    'Surrey',
    'Richmond',
    'North Vancouver',
    'West Vancouver',
    'New Westminster'
  ];
}

// Common tags for filtering
export function getCommonPlaceTags() {
  return [
    'biryani', 'chai', 'dosa', 'chaat', 'curry', 'tandoori',
    'vegan', 'vegetarian', 'halal', 'gluten-free',
    'punjabi', 'south-indian', 'gujarati', 'bengali', 'pakistani',
    'fine-dining', 'casual', 'takeout', 'catering',
    'family-friendly', 'date-night', 'group-dining'
  ];
}

export function getCommonEventTags() {
  return [
    'bollywood', 'bhangra', 'classical', 'fusion', 'live-music',
    'dj', 'dancing', 'cultural', 'comedy', 'food',
    'family-friendly', '19+', '21+', 'outdoor', 'indoor'
  ];
}