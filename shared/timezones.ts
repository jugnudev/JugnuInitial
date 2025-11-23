// Area to timezone mapping for Canada-wide events
export const AREA_TIMEZONE_MAP = {
  'Metro Vancouver': 'America/Vancouver',
  'GTA': 'America/Toronto',
  'Greater Montreal': 'America/Montreal',
  'Calgary': 'America/Edmonton',
} as const;

export type AreaName = keyof typeof AREA_TIMEZONE_MAP;

// Get timezone for a given area
export function getTimezoneForArea(area: string | null | undefined): string {
  if (!area) return 'America/Vancouver'; // Default fallback
  
  // Direct match
  if (area in AREA_TIMEZONE_MAP) {
    return AREA_TIMEZONE_MAP[area as AreaName];
  }
  
  // Fallback to default
  return 'America/Vancouver';
}

// Get timezone abbreviation (PT, ET, MT, etc.)
export function getTimezoneAbbreviation(timezone: string, date?: Date): string {
  try {
    const testDate = date || new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(testDate);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    
    if (tzPart?.value) {
      // Return the abbreviation (e.g., "PST", "PDT", "EST", "EDT")
      return tzPart.value;
    }
  } catch (error) {
    console.warn('Failed to get timezone abbreviation:', error);
  }
  
  // Fallback based on timezone name
  if (timezone.includes('Vancouver') || timezone.includes('Pacific')) return 'PT';
  if (timezone.includes('Toronto') || timezone.includes('Montreal') || timezone.includes('Eastern')) return 'ET';
  if (timezone.includes('Edmonton') || timezone.includes('Calgary') || timezone.includes('Mountain')) return 'MT';
  
  return 'PT'; // Default fallback
}

// Get a human-readable timezone name
export function getTimezoneName(timezone: string): string {
  const names: Record<string, string> = {
    'America/Vancouver': 'Pacific Time',
    'America/Toronto': 'Eastern Time',
    'America/Montreal': 'Eastern Time',
    'America/Edmonton': 'Mountain Time',
  };
  
  return names[timezone] || 'Pacific Time';
}

// Validate if a timezone is valid
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
