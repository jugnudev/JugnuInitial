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
 * Check if an event spans multiple days
 * @param startIso - start time ISO string
 * @param endIso - end time ISO string
 * @param tz - timezone (default: America/Vancouver)
 * @returns true if event spans multiple days
 */
export function isMultiDayEvent(
  startIso: string,
  endIso?: string,
  tz: string = 'America/Vancouver'
): boolean {
  if (!startIso || !endIso) return false;
  
  try {
    const timezone = tz || 'America/Vancouver';
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    
    // Format dates to compare just the date portion
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const startDateStr = formatter.format(startDate);
    const endDateStr = formatter.format(endDate);
    
    return startDateStr !== endDateStr;
  } catch (error) {
    console.error('Error checking multi-day event:', error);
    return false;
  }
}

/**
 * Format a date range for multi-day events
 * @param startIso - start date ISO string
 * @param endIso - end date ISO string
 * @param tz - timezone (default: America/Vancouver)
 * @returns "September 23 - 27, 2025" or "September 23 - October 2, 2025"
 */
export function formatDateRange(
  startIso: string,
  endIso: string,
  tz: string = 'America/Vancouver'
): string {
  try {
    const timezone = tz || 'America/Vancouver';
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    const startParts = formatter.formatToParts(startDate);
    const endParts = formatter.formatToParts(endDate);
    
    const startMonth = startParts.find(p => p.type === 'month')?.value || '';
    const startDay = startParts.find(p => p.type === 'day')?.value || '';
    const startYear = startParts.find(p => p.type === 'year')?.value || '';
    
    const endMonth = endParts.find(p => p.type === 'month')?.value || '';
    const endDay = endParts.find(p => p.type === 'day')?.value || '';
    const endYear = endParts.find(p => p.type === 'year')?.value || '';
    
    // Same month and year
    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
    }
    // Different months, same year
    else if (startYear === endYear) {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    }
    // Different years
    else {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }
  } catch (error) {
    console.error('Error formatting date range:', error);
    // Fallback to single date
    return formatEventDate(startIso, tz);
  }
}

/**
 * Format event date for display (handles both single and multi-day)
 * @param startIso - ISO date string
 * @param endIso - Optional end date for multi-day events
 * @param tz - timezone (default: America/Vancouver)
 * @returns formatted date or date range
 */
export function formatEventDateDisplay(
  startIso: string,
  endIso?: string,
  tz: string = 'America/Vancouver'
): string {
  if (!endIso || !isMultiDayEvent(startIso, endIso, tz)) {
    // Single day event
    return formatEventDate(startIso, tz);
  } else {
    // Multi-day event
    return formatDateRange(startIso, endIso, tz);
  }
}

/**
 * Format event time for modal display (handles multi-day events)
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
  // For multi-day events, show different format
  if (endIso && isMultiDayEvent(startIso, endIso, tz)) {
    if (isAllDay) {
      return 'All day';
    }
    // For multi-day events with specific times, just show the time range
    // as dates are already shown separately
    return formatTimeRange(startIso, endIso, tz, false);
  }
  
  // Single day event
  return formatTimeRange(startIso, endIso, tz, isAllDay);
}