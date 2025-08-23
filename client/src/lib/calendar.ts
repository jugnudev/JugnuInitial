interface CalendarEvent {
  title: string;
  startISO: string;
  endISO: string;
  location: string;
  description: string;
}

export function getCalendarLinks(event: CalendarEvent) {
  const { title, startISO, endISO, location, description } = event;

  // Format dates for URLs
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  // Google Calendar URL
  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    location: location,
    details: description,
  });
  
  const google = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // ICS file content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jugnu//Events//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@thehouseofjugnu.com`,
    `DTSTART:${formatGoogleDate(startDate)}`,
    `DTEND:${formatGoogleDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return { google, ics };
}
