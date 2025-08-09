/**
 * Date formatting utilities with Vancouver timezone support
 */

export function formatEventDate(dateISO: string | null): string {
  if (!dateISO) {
    return "TBA";
  }

  try {
    const date = new Date(dateISO);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Vancouver',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    return "TBA";
  }
}

export function formatEventDateShort(dateISO: string | null): string {
  if (!dateISO) {
    return "TBA";
  }

  try {
    const date = new Date(dateISO);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Vancouver',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    return "TBA";
  }
}