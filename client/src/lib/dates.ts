/**
 * Date utilities for robust timezone-aware formatting
 * Handles both all-day and timed events with graceful fallbacks
 */

export function isValidISO(s?: string): boolean {
  if (!s || typeof s !== 'string') return false;
  const date = new Date(s);
  return !isNaN(date.getTime());
}

export function formatDateBadge(
  iso?: string, 
  tz: string = 'America/Vancouver', 
  allDay?: boolean
): string {
  if (!isValidISO(iso)) return 'TBA';
  
  try {
    const date = new Date(iso!);
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      timeZone: tz
    });
    
    const formatted = formatter.format(date);
    // Convert "Fri, Aug 15" to "Fri • Aug 15"
    return formatted.replace(',', ' •');
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'TBA';
  }
}

export function formatTimeRange(
  startISO?: string,
  endISO?: string, 
  tz: string = 'America/Vancouver',
  allDay?: boolean
): string {
  if (!isValidISO(startISO)) return 'TBA';
  
  if (allDay) return 'All day';
  
  try {
    const startDate = new Date(startISO!);
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz
    });
    
    const startTime = timeFormatter.format(startDate);
    
    // If no end date or invalid end date, just show start time
    if (!isValidISO(endISO)) {
      return startTime;
    }
    
    const endDate = new Date(endISO!);
    const endTime = timeFormatter.format(endDate);
    
    // If same time (or very close), just show start time
    if (Math.abs(endDate.getTime() - startDate.getTime()) < 60000) {
      return startTime;
    }
    
    return `${startTime} – ${endTime}`;
  } catch (error) {
    console.warn('Time range formatting error:', error);
    return 'TBA';
  }
}

export function formatFullDateTime(
  iso?: string,
  tz: string = 'America/Vancouver',
  allDay?: boolean
): string {
  if (!isValidISO(iso)) return 'TBA';
  
  try {
    const date = new Date(iso!);
    
    if (allDay) {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: tz
      }).format(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz
    }).format(date);
  } catch (error) {
    console.warn('Full date formatting error:', error);
    return 'TBA';
  }
}

// Helper to detect if a date string represents an all-day event
export function detectAllDay(isoString?: string): boolean {
  if (!isoString) return false;
  
  // Check if it's a date-only format (YYYY-MM-DD)
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyPattern.test(isoString)) return true;
  
  // Check if time portion is midnight UTC (00:00:00.000Z)
  if (isoString.includes('T00:00:00') && isoString.includes('Z')) return true;
  
  return false;
}

// Helper to get a safe date string for display
export function safeDateString(iso?: string, fallback: string = 'TBA'): string {
  return isValidISO(iso) ? iso! : fallback;
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