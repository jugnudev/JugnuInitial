// Date/time formatting utilities for Community events
// Handles timezone-aware formatting for Vancouver events

/**
 * Format event date for badge display
 * @param iso - ISO date string
 * @param tz - timezone (default: America/Vancouver)
 * @returns "SAT • SEP 20" format
 */
export function formatDateBadge(iso: string, tz: string = 'America/Vancouver'): string {
  try {
    if (!iso) {
      return 'TBA';
    }
    
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return 'TBA';
    }
    
    // Ensure timezone is valid
    const timezone = tz || 'America/Vancouver';
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    
    const parts = formatter.formatToParts(date);
    const weekday = parts.find(p => p.type === 'weekday')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    
    return `${weekday.toUpperCase()} • ${month.toUpperCase()} ${day}`;
  } catch (error) {
    console.error('Error formatting date badge:', error, { iso, tz });
    return 'TBA';
  }
}

/**
 * Format event time for display
 * @param iso - ISO date string
 * @param tz - timezone (default: America/Vancouver)
 * @param isAllDay - whether the event is all-day
 * @returns "9:00 PM" or "All day"
 */
export function formatTime(iso: string, tz: string = 'America/Vancouver', isAllDay: boolean = false): string {
  if (isAllDay) {
    return 'All day';
  }
  
  if (!iso) {
    return 'Time TBA';
  }
  
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return 'Time TBA';
    }
    
    // Ensure timezone is valid
    const timezone = tz || 'America/Vancouver';
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting time:', error, { iso, tz, isAllDay });
    return 'Time TBA';
  }
}

/**
 * Format event time range for modal display
 * @param startIso - start time ISO string
 * @param endIso - end time ISO string (optional)
 * @param tz - timezone (default: America/Vancouver)
 * @param isAllDay - whether the event is all-day
 * @returns "9:00 PM – 12:00 AM" or "All day"
 */
export function formatTimeRange(
  startIso: string, 
  endIso?: string, 
  tz: string = 'America/Vancouver', 
  isAllDay: boolean = false
): string {
  if (isAllDay) {
    return 'All day';
  }
  
  try {
    const startTime = formatTime(startIso, tz, false);
    
    if (!endIso) {
      return startTime;
    }
    
    const endTime = formatTime(endIso, tz, false);
    return `${startTime} – ${endTime}`;
  } catch (error) {
    console.error('Error formatting time range:', error);
    return 'Time TBA';
  }
}

/**
 * Format full event date for display
 * @param iso - ISO date string
 * @param tz - timezone (default: America/Vancouver)
 * @returns "Saturday, September 20, 2025"
 */
export function formatEventDate(iso: string, tz: string = 'America/Vancouver'): string {
  try {
    if (!iso) {
      return 'Date TBA';
    }
    
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return 'Date TBA';
    }
    
    // Ensure timezone is valid
    const timezone = tz || 'America/Vancouver';
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting event date:', error, { iso, tz });
    return 'Date TBA';
  }
}

/**
 * Format event time for modal display (combines date and time info)
 * @param startIso - start time ISO string
 * @param endIso - end time ISO string (optional)
 * @param tz - timezone (default: America/Vancouver)
 * @param isAllDay - whether the event is all-day
 * @returns formatted time info
 */
export function formatEventTime(
  startIso: string, 
  endIso?: string, 
  tz: string = 'America/Vancouver', 
  isAllDay: boolean = false
): string {
  return formatTimeRange(startIso, endIso, tz, isAllDay);
}