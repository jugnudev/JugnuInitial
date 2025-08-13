// String similarity algorithms for place matching

/**
 * Calculate Jaro similarity between two strings
 */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchWindow < 1) return 0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Find transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 */
export function jaroWinkler(s1: string, s2: string): number {
  const jaroSim = jaro(s1, s2);
  if (jaroSim < 0.7) return jaroSim;

  // Calculate common prefix length (up to 4 characters)
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaroSim + 0.1 * prefix * (1 - jaroSim);
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshtein(s1: string, s2: string): number {
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calculate normalized Levenshtein similarity (0-1 scale)
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(s1, s2) / maxLen;
}

/**
 * Normalize string for comparison (lowercase, remove special chars, trim)
 */
export function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate name similarity using Jaro-Winkler on normalized strings
 */
export function nameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeForComparison(name1);
  const norm2 = normalizeForComparison(name2);
  return jaroWinkler(norm1, norm2);
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract street number and name from an address
 */
export function extractStreetInfo(address: string): { number: string; name: string } {
  const normalized = address.toLowerCase().trim();
  const match = normalized.match(/^(\d+)\s+(.+?)(?:,|$)/);
  
  if (match) {
    return {
      number: match[1],
      name: match[2].replace(/\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|place|pl)\b.*$/i, '')
    };
  }
  
  return { number: '', name: normalized };
}

/**
 * Calculate address similarity based on street number and name matching
 */
export function addressSimilarity(addr1: string, addr2: string): number {
  const street1 = extractStreetInfo(addr1);
  const street2 = extractStreetInfo(addr2);
  
  // If street numbers are different, lower the score significantly
  if (street1.number && street2.number && street1.number !== street2.number) {
    return 0.2;
  }
  
  // Calculate street name similarity
  const nameSim = jaroWinkler(
    normalizeForComparison(street1.name),
    normalizeForComparison(street2.name)
  );
  
  // Boost score if street numbers match
  if (street1.number === street2.number && street1.number !== '') {
    return Math.min(1, nameSim + 0.2);
  }
  
  return nameSim;
}

/**
 * Calculate overall place matching score
 */
export function calculatePlaceScore(
  place1: { name: string; address: string; lat?: number; lng?: number },
  place2: { name: string; address: string; lat: number; lng: number }
): number {
  const nameScore = nameSimilarity(place1.name, place2.name);
  const addressScore = addressSimilarity(place1.address, place2.address);
  
  let distanceScore = 0.5; // Default if no coordinates
  if (place1.lat && place1.lng) {
    const distance = calculateDistance(place1.lat, place1.lng, place2.lat, place2.lng);
    // Score of 1 for distance <= 50m, linear decay to 0 at 200m
    distanceScore = Math.max(0, Math.min(1, (200 - distance) / 150));
  }
  
  // Weighted combination: name (40%), address (35%), distance (25%)
  return nameScore * 0.4 + addressScore * 0.35 + distanceScore * 0.25;
}