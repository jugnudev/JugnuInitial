import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import type { 
  TicketsOrder, 
  TicketsTicket, 
  TicketsEvent,
  TicketsTier,
  TicketsOrderItem
} from '@shared/schema';
import { ticketsStorage } from './tickets-storage';

// Initialize SendGrid
const initSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('[Tickets Email] SendGrid API key not configured');
    return false;
  }
  sgMail.setApiKey(apiKey);
  return true;
};

// Generate QR code as base64 data URL
const generateQRCodeDataURL = async (ticketId: string, qrToken: string): Promise<string> => {
  try {
    const qrData = JSON.stringify({
      ticketId,
      token: qrToken,
      verifyUrl: `${process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com'}/api/tickets/validate?token=${qrToken}`
    });
    
    const dataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 1,
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Generate iCal format for calendar links
const generateCalendarData = (event: TicketsEvent): string => {
  const startDate = new Date(event.startAt);
  const endDate = event.endAt ? new Date(event.endAt) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Default 3 hours
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const icalData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jugnu//Tickets//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@thehouseofjugnu.com`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.summary || event.description || ''}`,
    `LOCATION:${event.venue || ''}, ${event.city}, ${event.province}`,
    `URL:${process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com'}/tickets/event/${event.slug}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return Buffer.from(icalData).toString('base64');
};

// Generate Google Calendar URL
const generateGoogleCalendarUrl = (event: TicketsEvent): string => {
  const startDate = new Date(event.startAt);
  const endDate = event.endAt ? new Date(event.endAt) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.summary || event.description || '',
    location: `${event.venue || ''}, ${event.city}, ${event.province}`,
    ctz: 'America/Vancouver'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Main email template for tickets
const generateTicketEmailHTML = async (
  order: TicketsOrder,
  event: TicketsEvent,
  tickets: Array<{
    ticket: TicketsTicket;
    tier: TicketsTier;
    orderItem: TicketsOrderItem;
  }>,
  organizer?: any
): Promise<string> => {
  const baseUrl = process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com';
  const eventDate = format(new Date(event.startAt), 'EEEE, MMMM d, yyyy');
  const eventTime = format(new Date(event.startAt), 'h:mm a');
  
  // Generate QR codes for all tickets
  const ticketsWithQR = await Promise.all(tickets.map(async ({ ticket, tier }) => {
    const qrDataURL = await generateQRCodeDataURL(ticket.id, ticket.qrToken);
    return { ticket, tier, qrDataURL };
  }));
  
  const googleCalendarUrl = generateGoogleCalendarUrl(event);
  const icalData = generateCalendarData(event);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    
    .event-banner {
      position: relative;
      width: 100%;
      height: 300px;
      background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%), 
                  url('${event.coverUrl || `${baseUrl}/images/placeholder.svg`}') center/cover;
    }
    
    .event-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 30px;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
    
    .event-info h2 {
      margin: 0 0 10px;
      font-size: 24px;
      font-weight: 700;
    }
    
    .event-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 14px;
    }
    
    .event-meta span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .content {
      padding: 30px;
    }
    
    .order-summary {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .order-summary h3 {
      margin: 0 0 15px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .order-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .order-details.total {
      font-weight: 600;
      font-size: 16px;
      padding-top: 10px;
      border-top: 2px solid #e5e7eb;
      margin-top: 10px;
    }
    
    .tickets-section {
      margin: 30px 0;
    }
    
    .tickets-section h3 {
      margin: 0 0 20px;
      font-size: 20px;
      font-weight: 600;
    }
    
    .ticket-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      background: white;
    }
    
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 20px;
    }
    
    .ticket-info h4 {
      margin: 0 0 5px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .ticket-info p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
    
    .ticket-status {
      padding: 6px 12px;
      background: #10b981;
      color: white;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .qr-container {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    
    .qr-container img {
      max-width: 200px;
      height: auto;
    }
    
    .qr-container p {
      margin: 10px 0 0;
      font-size: 12px;
      color: #6b7280;
    }
    
    .action-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin: 30px 0;
    }
    
    .button {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
    }
    
    .button-primary {
      background: #667eea;
      color: white;
    }
    
    .button-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }
    
    .venue-info {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
    }
    
    .venue-info h3 {
      margin: 0 0 15px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .venue-details {
      font-size: 14px;
      line-height: 1.8;
    }
    
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 30px 0;
    }
    
    @media (max-width: 600px) {
      .header {
        padding: 30px 20px;
      }
      
      .content {
        padding: 20px;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Your Tickets Are Ready! 🎉</h1>
      <p>Order #${order.id.slice(0, 8).toUpperCase()}</p>
    </div>
    
    <!-- Event Banner -->
    <div class="event-banner">
      <div class="event-info">
        <h2>${event.title}</h2>
        <div class="event-meta">
          <span>📅 ${eventDate}</span>
          <span>⏰ ${eventTime}</span>
          <span>📍 ${event.venue || 'Venue TBA'}</span>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Order Summary -->
      <div class="order-summary">
        <h3>Order Summary</h3>
        <div class="order-details">
          <span>Name</span>
          <span>${order.buyerName || 'Guest'}</span>
        </div>
        <div class="order-details">
          <span>Email</span>
          <span>${order.buyerEmail}</span>
        </div>
        <div class="order-details">
          <span>Tickets</span>
          <span>${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}</span>
        </div>
        <div class="order-details total">
          <span>Total Paid</span>
          <span>$${(order.totalCents / 100).toFixed(2)} ${order.currency}</span>
        </div>
      </div>
      
      <!-- Tickets -->
      <div class="tickets-section">
        <h3>Your Tickets</h3>
        ${ticketsWithQR.map(({ ticket, tier, qrDataURL }, index) => `
          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-info">
                <h4>${tier.name}</h4>
                <p>Ticket ${index + 1} of ${tickets.length} • Serial: ${ticket.serial}</p>
              </div>
              <span class="ticket-status">${ticket.status}</span>
            </div>
            
            <div class="qr-container">
              <img src="${qrDataURL}" alt="Ticket QR Code" />
              <p>Show this QR code at the venue for entry</p>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Action Buttons -->
      <div class="action-buttons">
        <a href="${baseUrl}/my-tickets" class="button button-primary">View All Tickets</a>
        <a href="${googleCalendarUrl}" class="button button-secondary">Add to Calendar</a>
      </div>
      
      <!-- Venue Information -->
      <div class="venue-info">
        <h3>Venue Information</h3>
        <div class="venue-details">
          <strong>${event.venue || 'Venue TBA'}</strong><br>
          ${event.city}, ${event.province}<br>
          <br>
          <a href="https://maps.google.com/?q=${encodeURIComponent(`${event.venue}, ${event.city}, ${event.province}`)}" style="color: #667eea;">
            Get Directions →
          </a>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- Important Information -->
      <div style="font-size: 14px; color: #6b7280;">
        <h4 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #1a1a1a;">Important Information</h4>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Please arrive at least 15 minutes before the event starts</li>
          <li>Have your QR code ready for scanning at the entrance</li>
          <li>Each QR code can only be scanned once</li>
          <li>Screenshots of QR codes are accepted</li>
          ${event.allowRefundsUntil ? `<li>Refunds available until ${format(new Date(event.allowRefundsUntil), 'MMMM d, yyyy')}</li>` : ''}
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>
        This email was sent to ${order.buyerEmail}<br>
        <a href="${baseUrl}/tickets/lookup">Retrieve Tickets</a> • 
        <a href="${baseUrl}/my-tickets">My Account</a> • 
        <a href="${baseUrl}/support">Support</a>
      </p>
      <p style="margin-top: 20px;">
        © ${new Date().getFullYear()} Jugnu. All rights reserved.<br>
        Vancouver, BC, Canada
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

// Send ticket email
export async function sendTicketEmail(
  orderId: string,
  isResend: boolean = false
): Promise<boolean> {
  try {
    if (!initSendGrid()) {
      console.warn('[Tickets Email] SendGrid not configured, skipping email');
      return false;
    }
    
    // Get order details
    const order = await ticketsStorage.getOrderById(orderId);
    if (!order || order.status !== 'paid') {
      console.error('[Tickets Email] Order not found or not paid:', orderId);
      return false;
    }
    
    // Get event details
    const event = await ticketsStorage.getEventById(order.eventId);
    if (!event) {
      console.error('[Tickets Email] Event not found:', order.eventId);
      return false;
    }
    
    // Get organizer details (optional)
    let organizer = null;
    if (event.organizerId) {
      organizer = await ticketsStorage.getOrganizerById(event.organizerId);
    }
    
    // Get order items and tickets
    const orderItems = await ticketsStorage.getOrderItems(orderId);
    const tickets = [];
    
    for (const item of orderItems) {
      const tier = await ticketsStorage.getTierById(item.tierId);
      const itemTickets = await ticketsStorage.getTicketsByOrderItem(item.id);
      
      for (const ticket of itemTickets) {
        if (tier) {
          tickets.push({ ticket, tier, orderItem: item });
        }
      }
    }
    
    if (tickets.length === 0) {
      console.error('[Tickets Email] No tickets found for order:', orderId);
      return false;
    }
    
    // Generate email HTML
    const html = await generateTicketEmailHTML(order, event, tickets, organizer);
    
    // Prepare email
    const msg = {
      to: order.buyerEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'tickets@thehouseofjugnu.com',
        name: 'Jugnu Tickets'
      },
      subject: isResend ? `[Resent] Your tickets for ${event.title}` : `Your tickets for ${event.title}`,
      html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };
    
    // Send email
    await sgMail.send(msg);
    console.log(`[Tickets Email] ${isResend ? 'Resent' : 'Sent'} ticket email to ${order.buyerEmail} for order ${orderId}`);
    
    // Update email status in database
    const now = new Date();
    await ticketsStorage.updateOrder(orderId, {
      emailSentAt: now,
      emailResentCount: isResend ? (order.emailResentCount || 0) + 1 : 0
    });
    
    return true;
  } catch (error) {
    console.error('[Tickets Email] Error sending email:', error);
    return false;
  }
}

// Send order confirmation email (simpler version without QR codes)
export async function sendOrderConfirmationEmail(
  orderId: string
): Promise<boolean> {
  try {
    if (!initSendGrid()) {
      console.warn('[Tickets Email] SendGrid not configured, skipping email');
      return false;
    }
    
    const order = await ticketsStorage.getOrderById(orderId);
    if (!order) {
      console.error('[Tickets Email] Order not found:', orderId);
      return false;
    }
    
    const event = await ticketsStorage.getEventById(order.eventId);
    if (!event) {
      console.error('[Tickets Email] Event not found:', order.eventId);
      return false;
    }
    
    const baseUrl = process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 15px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmed! 🎉</h1>
      <p>We're processing your tickets</p>
    </div>
    <div class="content">
      <p>Hi ${order.buyerName || 'there'},</p>
      <p>Thank you for your purchase! Your order for <strong>${event.title}</strong> has been confirmed.</p>
      <p>Order ID: <strong>${order.id.slice(0, 8).toUpperCase()}</strong></p>
      <p>Your tickets are being generated and will be sent to this email address shortly. You'll receive another email with your QR codes and ticket details.</p>
      <p style="text-align: center;">
        <a href="${baseUrl}/my-tickets" class="button">View My Tickets</a>
      </p>
      <div class="footer">
        <p>If you have any questions, please contact us at support@thehouseofjugnu.com</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
    
    const msg = {
      to: order.buyerEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'tickets@thehouseofjugnu.com',
        name: 'Jugnu Tickets'
      },
      subject: `Order Confirmed - ${event.title}`,
      html
    };
    
    await sgMail.send(msg);
    console.log(`[Tickets Email] Sent order confirmation to ${order.buyerEmail} for order ${orderId}`);
    return true;
  } catch (error) {
    console.error('[Tickets Email] Error sending confirmation email:', error);
    return false;
  }
}