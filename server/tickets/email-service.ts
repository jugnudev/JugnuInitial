import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import PDFDocument from 'pdfkit';
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
const generateQRCodeDataURL = async (ticketId: string, qrToken: string, forPDF: boolean = false): Promise<string> => {
  try {
    const qrData = JSON.stringify({
      ticketId,
      token: qrToken,
      verifyUrl: `${process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com'}/api/tickets/validate?token=${qrToken}`
    });
    
    const dataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      width: forPDF ? 400 : 300,
      margin: 2,
      color: {
        dark: forPDF ? '#FFFFFF' : '#000000',
        light: forPDF ? '#0B0B0F' : '#FFFFFF'
      }
    });
    
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Generate PDF ticket
const generateTicketPDF = async (
  ticket: TicketsTicket,
  tier: TicketsTier,
  event: TicketsEvent,
  order: TicketsOrder,
  ticketIndex: number,
  totalTickets: number
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        autoFirstPage: true,
        bufferPages: false
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Dark background
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fill('#0B0B0F');
      
      // Copper gradient header (simulated with rectangles)
      const headerHeight = 120;
      for (let i = 0; i < headerHeight; i++) {
        const ratio = i / headerHeight;
        const r = Math.round(192 + (211 - 192) * ratio);
        const g = Math.round(88 + (84 - 88) * ratio);
        const b = Math.round(15 + (30 - 15) * ratio);
        doc.rect(0, i, doc.page.width, 1)
           .fill(`rgb(${r}, ${g}, ${b})`);
      }
      
      // Jugnu logo text
      doc.fontSize(32)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text('Jugnu', 50, 35);
      
      doc.fontSize(12)
         .fillColor('rgba(255, 255, 255, 0.9)')
         .font('Helvetica')
         .text('Find Your Frequency', 50, 75);
      
      // Event title
      let y = headerHeight + 40;
      doc.fontSize(24)
         .fillColor('#E8C4A0')
         .font('Helvetica-Bold')
         .text(event.title, 50, y, { width: doc.page.width - 100, align: 'left' });
      
      y += 60;
      
      // Event details
      const eventDate = format(new Date(event.startAt), 'EEEE, MMMM d, yyyy');
      const eventTime = format(new Date(event.startAt), 'h:mm a');
      
      doc.fontSize(12)
         .fillColor('#A89584')
         .font('Helvetica');
      
      doc.text(`DATE: ${eventDate}`, 50, y);
      y += 20;
      doc.text(`TIME: ${eventTime}`, 50, y);
      y += 20;
      doc.text(`VENUE: ${event.venue || 'Venue TBA'}, ${event.city}, ${event.province}`, 50, y);
      
      y += 50;
      
      // Ticket tier card with copper border
      const cardY = y;
      const cardHeight = 100;
      
      // Card background
      doc.rect(50, cardY, doc.page.width - 100, cardHeight)
         .fillAndStroke('#1C1C24', '#c0580f');
      
      // Tier name
      doc.fontSize(20)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text(tier.name, 70, cardY + 20);
      
      // Ticket number
      doc.fontSize(11)
         .fillColor('#A89584')
         .font('Helvetica')
         .text(`Ticket ${ticketIndex + 1} of ${totalTickets}`, 70, cardY + 50);
      
      // Serial number
      doc.fontSize(10)
         .fillColor('#E8C4A0')
         .text(`Serial: ${ticket.serial}`, 70, cardY + 70);
      
      // Status badge
      const statusX = doc.page.width - 150;
      doc.rect(statusX, cardY + 25, 80, 30)
         .fill('#17C0A9');
      
      doc.fontSize(12)
         .fillColor('#0B0B0F')
         .font('Helvetica-Bold')
         .text('VALID', statusX, cardY + 33, { width: 80, align: 'center' });
      
      y = cardY + cardHeight + 50;
      
      // QR Code section
      const qrDataURL = await generateQRCodeDataURL(ticket.id, ticket.qrToken, true);
      const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
      
      // QR Code background card
      const qrCardY = y;
      const qrCardHeight = 280;
      doc.rect(50, qrCardY, doc.page.width - 100, qrCardHeight)
         .fillAndStroke('#1C1C24', '#c0580f');
      
      // Center QR code
      const qrSize = 200;
      const qrX = (doc.page.width - qrSize) / 2;
      const qrY = qrCardY + 20;
      
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      
      // QR instructions
      doc.fontSize(11)
         .fillColor('#E8C4A0')
         .font('Helvetica')
         .text('Show this QR code at the venue for entry', 50, qrY + qrSize + 15, {
           width: doc.page.width - 100,
           align: 'center'
         });
      
      // Order information - positioned at bottom before footer
      const orderInfoY = doc.page.height - 140;
      doc.fontSize(9)
         .fillColor('#A89584')
         .font('Helvetica');
      
      doc.text(`Order ID: ${order.id.slice(0, 8).toUpperCase()}`, 50, orderInfoY);
      doc.text(`Name: ${order.buyerName || 'Guest'}`, 50, orderInfoY + 14);
      doc.text(`Email: ${order.buyerEmail}`, 50, orderInfoY + 28);
      
      // Footer
      const footerY = doc.page.height - 80;
      doc.fontSize(9)
         .fillColor('#6B7280')
         .font('Helvetica')
         .text('© ' + new Date().getFullYear() + ' Jugnu. All rights reserved.', 50, footerY, {
           width: doc.page.width - 100,
           align: 'center'
         });
      
      doc.fontSize(8)
         .text('Vancouver, BC, Canada', 50, footerY + 15, {
           width: doc.page.width - 100,
           align: 'center'
         });
      
      // Finalize PDF - this ensures no extra pages
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #E8C4A0;
      margin: 0;
      padding: 0;
      background-color: #0B0B0F;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #0B0B0F;
    }
    
    .header {
      background: linear-gradient(135deg, #c0580f 0%, #d3541e 100%);
      color: white;
      padding: 50px 30px;
      text-align: center;
      border-bottom: 2px solid rgba(192, 88, 15, 0.3);
    }
    
    .header h1 {
      margin: 0;
      font-family: 'Fraunces', serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .header p {
      margin: 12px 0 0;
      font-size: 16px;
      opacity: 0.95;
      letter-spacing: 0.5px;
    }
    
    .event-banner {
      position: relative;
      width: 100%;
      height: 320px;
      background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%), 
                  url('${event.coverUrl || `${baseUrl}/images/placeholder.svg`}') center/cover;
      border-bottom: 2px solid #c0580f;
    }
    
    .event-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 35px;
      color: white;
      text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    }
    
    .event-info h2 {
      margin: 0 0 15px;
      font-family: 'Fraunces', serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .event-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      font-size: 15px;
      font-weight: 500;
    }
    
    .event-meta span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .order-summary {
      background: rgba(28, 28, 36, 0.6);
      border: 1px solid rgba(192, 88, 15, 0.2);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 40px;
      backdrop-filter: blur(10px);
    }
    
    .order-summary h3 {
      margin: 0 0 20px;
      font-family: 'Fraunces', serif;
      font-size: 22px;
      font-weight: 600;
      color: #FFFFFF;
    }
    
    .order-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 14px;
      font-size: 15px;
      color: #A89584;
    }
    
    .order-details span:last-child {
      color: #E8C4A0;
      font-weight: 500;
    }
    
    .order-details.total {
      font-weight: 600;
      font-size: 18px;
      padding-top: 16px;
      border-top: 2px solid rgba(192, 88, 15, 0.3);
      margin-top: 12px;
      color: #FFFFFF;
    }
    
    .order-details.total span:last-child {
      color: #FFFFFF;
    }
    
    .tickets-section {
      margin: 40px 0;
    }
    
    .tickets-section h3 {
      margin: 0 0 24px;
      font-family: 'Fraunces', serif;
      font-size: 24px;
      font-weight: 600;
      color: #FFFFFF;
    }
    
    .ticket-card {
      border: 2px solid rgba(192, 88, 15, 0.3);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      background: rgba(28, 28, 36, 0.6);
      backdrop-filter: blur(10px);
    }
    
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    
    .ticket-info h4 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 600;
      color: #FFFFFF;
    }
    
    .ticket-info p {
      margin: 0;
      color: #A89584;
      font-size: 14px;
    }
    
    .ticket-status {
      padding: 8px 16px;
      background: #17C0A9;
      color: #0B0B0F;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .qr-container {
      text-align: center;
      padding: 28px;
      background: rgba(11, 11, 15, 0.8);
      border-radius: 12px;
      border: 1px solid rgba(192, 88, 15, 0.2);
    }
    
    .qr-container img {
      max-width: 220px;
      height: auto;
      border-radius: 8px;
    }
    
    .qr-container p {
      margin: 16px 0 0;
      font-size: 13px;
      color: #E8C4A0;
      font-weight: 500;
    }
    
    .action-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin: 40px 0;
    }
    
    .button {
      display: inline-block;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .button-primary {
      background: linear-gradient(135deg, #c0580f 0%, #d3541e 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(192, 88, 15, 0.3);
    }
    
    .button-primary:hover {
      box-shadow: 0 6px 16px rgba(192, 88, 15, 0.4);
      transform: translateY(-2px);
    }
    
    .button-secondary {
      background: rgba(28, 28, 36, 0.8);
      color: #E8C4A0;
      border: 2px solid rgba(192, 88, 15, 0.4);
    }
    
    .button-secondary:hover {
      border-color: #c0580f;
      background: rgba(28, 28, 36, 1);
    }
    
    .venue-info {
      background: rgba(28, 28, 36, 0.6);
      border: 1px solid rgba(192, 88, 15, 0.2);
      border-radius: 16px;
      padding: 28px;
      margin: 40px 0;
      backdrop-filter: blur(10px);
    }
    
    .venue-info h3 {
      margin: 0 0 20px;
      font-family: 'Fraunces', serif;
      font-size: 22px;
      font-weight: 600;
      color: #FFFFFF;
    }
    
    .venue-details {
      font-size: 15px;
      line-height: 1.8;
      color: #A89584;
    }
    
    .venue-details strong {
      color: #E8C4A0;
    }
    
    .venue-details a {
      color: #c0580f;
      text-decoration: none;
      font-weight: 600;
    }
    
    .footer {
      background: rgba(28, 28, 36, 0.4);
      border-top: 2px solid rgba(192, 88, 15, 0.2);
      padding: 40px 30px;
      text-align: center;
      font-size: 13px;
      color: #6B7280;
    }
    
    .footer a {
      color: #c0580f;
      text-decoration: none;
      font-weight: 500;
    }
    
    .footer a:hover {
      color: #d3541e;
    }
    
    .divider {
      height: 2px;
      background: rgba(192, 88, 15, 0.2);
      margin: 40px 0;
    }
    
    .info-box {
      background: rgba(28, 28, 36, 0.6);
      border: 1px solid rgba(192, 88, 15, 0.2);
      border-radius: 12px;
      padding: 24px;
      margin: 30px 0;
    }
    
    .info-box h4 {
      margin: 0 0 16px;
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
    }
    
    .info-box ul {
      margin: 0;
      padding-left: 24px;
      line-height: 1.9;
      color: #A89584;
    }
    
    .info-box li {
      margin-bottom: 8px;
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
      <h1>Your Tickets Are Ready!</h1>
      <p>Order #${order.id.slice(0, 8).toUpperCase()}</p>
    </div>
    
    <!-- Event Banner -->
    <div class="event-banner">
      <div class="event-info">
        <h2>${event.title}</h2>
        <div class="event-meta">
          <span>&#128197; ${eventDate}</span>
          <span>&#128336; ${eventTime}</span>
          <span>&#128205; ${event.venue || 'Venue TBA'}</span>
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
          <span>$${(order.totalCents / 100).toFixed(2)} ${order.currency?.toUpperCase() || 'CAD'}</span>
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
      <div class="info-box">
        <h4>Important Information</h4>
        <ul>
          <li>Please arrive at least 15 minutes before the event starts</li>
          <li>Have your QR code ready for scanning at the entrance</li>
          <li>Each QR code can only be scanned once</li>
          <li>Screenshots of QR codes are accepted</li>
          <li>Your tickets are attached as PDF files for easy access</li>
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
    
    // Generate PDF tickets
    const attachments = [];
    for (let i = 0; i < tickets.length; i++) {
      const { ticket, tier } = tickets[i];
      try {
        const pdfBuffer = await generateTicketPDF(ticket, tier, event, order, i, tickets.length);
        attachments.push({
          content: pdfBuffer.toString('base64'),
          filename: `ticket-${ticket.serial}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        });
      } catch (error) {
        console.error(`[Tickets Email] Error generating PDF for ticket ${ticket.id}:`, error);
      }
    }
    
    // Prepare email
    const msg: any = {
      to: order.buyerEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'tickets@thehouseofjugnu.com',
        name: 'Jugnu Tickets'
      },
      subject: isResend ? `[Resent] Your tickets for ${event.title}` : `Your tickets for ${event.title}`,
      html,
      attachments,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };
    
    // Send email
    await sgMail.send(msg);
    console.log(`[Tickets Email] ${isResend ? 'Resent' : 'Sent'} ticket email to ${order.buyerEmail} for order ${orderId} with ${attachments.length} PDF attachment(s)`);
    
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

// Send refund notification email
export async function sendRefundEmail(
  ticketId: string,
  refundAmountCents: number,
  refundReason?: string
): Promise<boolean> {
  try {
    if (!initSendGrid()) {
      console.warn('[Tickets Email] SendGrid not configured, skipping refund email');
      return false;
    }
    
    // Get ticket details
    const ticket = await ticketsStorage.getTicketById(ticketId);
    if (!ticket) {
      console.error('[Tickets Email] Ticket not found:', ticketId);
      return false;
    }
    
    // Get order item
    const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
    if (!orderItem) {
      console.error('[Tickets Email] Order item not found:', ticket.orderItemId);
      return false;
    }
    
    // Get order
    const order = await ticketsStorage.getOrderById(orderItem.orderId);
    if (!order) {
      console.error('[Tickets Email] Order not found:', orderItem.orderId);
      return false;
    }
    
    // Get event
    const event = await ticketsStorage.getEventById(order.eventId);
    if (!event) {
      console.error('[Tickets Email] Event not found:', order.eventId);
      return false;
    }
    
    const baseUrl = process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com';
    const refundAmountDisplay = refundAmountCents > 0 
      ? `$${(refundAmountCents / 100).toFixed(2)}`
      : 'Free';
    
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
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
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
    .refund-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .refund-amount {
      font-size: 24px;
      font-weight: bold;
      color: #dc2626;
      text-align: center;
      margin: 10px 0;
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
      <h1>Refund Processed</h1>
      <p>Your ticket has been refunded</p>
    </div>
    <div class="content">
      <p>Hi ${order.buyerName || 'there'},</p>
      <p>A refund has been processed for your ticket to <strong>${event.title}</strong>.</p>
      
      <div class="refund-box">
        <p style="margin: 0 0 10px 0; text-align: center;"><strong>Refund Details</strong></p>
        <p style="margin: 5px 0;"><strong>Ticket:</strong> ${ticket.serial}</p>
        <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.id.slice(0, 8).toUpperCase()}</p>
        ${refundReason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${refundReason}</p>` : ''}
        <div class="refund-amount">${refundAmountDisplay}</div>
      </div>
      
      ${refundAmountCents > 0 ? `
      <p>The refund will be processed to your original payment method within 5-10 business days.</p>
      ` : `
      <p>Your free ticket has been cancelled and is no longer valid.</p>
      `}
      
      <p>If you have any questions about this refund, please contact the event organizer or reach out to our support team.</p>
      
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
      subject: `Refund Processed - ${event.title}`,
      html
    };
    
    await sgMail.send(msg);
    console.log(`[Tickets Email] Sent refund email to ${order.buyerEmail} for ticket ${ticketId}`);
    return true;
  } catch (error) {
    console.error('[Tickets Email] Error sending refund email:', error);
    return false;
  }
}
// Send transfer notification emails (to both old and new ticket holders)
export async function sendTransferEmails(
  oldTicketId: string,
  newTicketId: string,
  oldEmail: string,
  oldName: string,
  newEmail: string,
  newName: string
): Promise<boolean> {
  try {
    if (!initSendGrid()) {
      console.warn('[Tickets Email] SendGrid not configured, skipping transfer emails');
      return false;
    }
    
    // Get old ticket details
    const oldTicket = await ticketsStorage.getTicketById(oldTicketId);
    if (!oldTicket) {
      console.error('[Tickets Email] Old ticket not found:', oldTicketId);
      return false;
    }
    
    // Get new ticket details
    const newTicket = await ticketsStorage.getTicketById(newTicketId);
    if (!newTicket) {
      console.error('[Tickets Email] New ticket not found:', newTicketId);
      return false;
    }
    
    // Get order item
    const orderItem = await ticketsStorage.getOrderItemById(oldTicket.orderItemId);
    if (!orderItem) {
      console.error('[Tickets Email] Order item not found:', oldTicket.orderItemId);
      return false;
    }
    
    // Get tier
    const tier = await ticketsStorage.getTierById(orderItem.tierId);
    if (!tier) {
      console.error('[Tickets Email] Tier not found:', orderItem.tierId);
      return false;
    }
    
    // Get order
    const order = await ticketsStorage.getOrderById(orderItem.orderId);
    if (!order) {
      console.error('[Tickets Email] Order not found:', orderItem.orderId);
      return false;
    }
    
    // Get event
    const event = await ticketsStorage.getEventById(order.eventId);
    if (!event) {
      console.error('[Tickets Email] Event not found:', order.eventId);
      return false;
    }
    
    const baseUrl = process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com';
    const eventDate = format(new Date(event.startAt), 'EEEE, MMMM d, yyyy');
    const eventTime = format(new Date(event.startAt), 'h:mm a');
    
    // Generate QR code for new ticket as base64 (without data:image/png;base64, prefix)
    const qrCodeDataURL = await generateQRCodeDataURL(newTicket.id, newTicket.qrToken);
    const qrCodeBase64 = qrCodeDataURL.split(',')[1]; // Extract base64 data without the data URL prefix
    
    // Send email to old holder
    await sgMail.send({
      to: oldEmail,
      from: {
        email: 'noreply@thehouseofjugnu.com',
        name: 'Jugnu'
      },
      subject: `Ticket Transferred: ${event.title}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#c0580f 0%,#d3541e 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:28px;font-weight:600}.content{background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px}.transfer-box{background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:20px;margin:20px 0}.info-grid{display:grid;grid-template-columns:1fr;gap:15px;margin:20px 0}.info-row{padding:12px;background:#f9fafb;border-radius:6px}.info-label{font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}.info-value{color:#111827;font-size:16px;margin-top:4px}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}</style>
</head>
<body><div class="container"><div class="header"><h1>🎫 Ticket Transferred</h1></div><div class="content"><p>Hi ${oldName},</p><div class="transfer-box"><strong>Your ticket has been transferred</strong><p style="margin:10px 0 0">Your ticket for <strong>${event.title}</strong> has been successfully transferred to another attendee.</p></div><div class="info-grid"><div class="info-row"><div class="info-label">Event</div><div class="info-value">${event.title}</div></div><div class="info-row"><div class="info-label">Date & Time</div><div class="info-value">${eventDate} at ${eventTime}</div></div><div class="info-row"><div class="info-label">Ticket Type</div><div class="info-value">${tier.name}</div></div><div class="info-row"><div class="info-label">Previous Ticket #</div><div class="info-value">${oldTicket.serial}</div></div><div class="info-row"><div class="info-label">Transferred To</div><div class="info-value">${newEmail}</div></div></div><p style="margin-top:24px;color:#6b7280">Your original ticket is no longer valid. If you believe this transfer was made in error, please contact the event organizer immediately.</p></div><div class="footer"><p>Questions? Contact us at <a href="mailto:support@thehouseofjugnu.com" style="color:#c0580f">support@thehouseofjugnu.com</a></p><p style="margin-top:10px">© ${new Date().getFullYear()} Jugnu</p></div></div></body>
</html>`
    });
    
    // Send email to new holder with QR code as attachment
    await sgMail.send({
      to: newEmail,
      from: {
        email: 'noreply@thehouseofjugnu.com',
        name: 'Jugnu'
      },
      subject: `Your Ticket for ${event.title}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#c0580f 0%,#d3541e 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:28px;font-weight:600}.content{background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px}.welcome-box{background:#d1fae5;border:1px solid #10b981;border-radius:8px;padding:20px;margin:20px 0;text-align:center}.qr-container{text-align:center;padding:24px;background:#f9fafb;border-radius:8px;margin:20px 0}.qr-container img{max-width:240px;height:auto;border:2px solid #c0580f;border-radius:8px}.info-grid{display:grid;grid-template-columns:1fr;gap:15px;margin:20px 0}.info-row{padding:12px;background:#f9fafb;border-radius:6px}.info-label{font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}.info-value{color:#111827;font-size:16px;margin-top:4px}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}</style>
</head>
<body><div class="container"><div class="header"><h1>🎉 Welcome! Your Ticket is Ready</h1></div><div class="content"><p>Hi ${newName},</p><div class="welcome-box"><strong style="font-size:18px">You've received a ticket!</strong><p style="margin:10px 0 0">A ticket for <strong>${event.title}</strong> has been transferred to you.</p></div><div class="info-grid"><div class="info-row"><div class="info-label">Event</div><div class="info-value">${event.title}</div></div><div class="info-row"><div class="info-label">Date & Time</div><div class="info-value">${eventDate} at ${eventTime}</div></div><div class="info-row"><div class="info-label">Venue</div><div class="info-value">${event.venue || 'TBA'}, ${event.city}, ${event.province}</div></div><div class="info-row"><div class="info-label">Ticket Type</div><div class="info-value">${tier.name}</div></div><div class="info-row"><div class="info-label">Your Ticket #</div><div class="info-value">${newTicket.serial}</div></div></div><h3 style="margin:30px 0 15px;color:#111827">Your QR Code</h3><p style="color:#6b7280;margin-bottom:15px">Present this QR code at the event entrance for check-in:</p><div class="qr-container"><img src="cid:ticket-qr-code" alt="Ticket QR Code"/><p style="margin-top:12px;font-size:14px;color:#6b7280">Scan this code at the venue</p></div><div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin:20px 0"><strong>Important:</strong> Save this email or take a screenshot of your QR code. You'll need it for entry!</div></div><div class="footer"><p>Questions? Contact us at <a href="mailto:support@thehouseofjugnu.com" style="color:#c0580f">support@thehouseofjugnu.com</a></p><p style="margin-top:10px">© ${new Date().getFullYear()} Jugnu</p></div></div></body>
</html>`,
      attachments: [
        {
          content: qrCodeBase64,
          filename: 'ticket-qr-code.png',
          type: 'image/png',
          disposition: 'inline',
          contentId: 'ticket-qr-code'
        }
      ]
    });
    
    console.log(`[Tickets Email] Sent transfer notifications - old: ${oldEmail}, new: ${newEmail}`);
    return true;
  } catch (error) {
    console.error('[Tickets Email] Error sending transfer emails:', error);
    return false;
  }
}

export async function sendBulkAttendeeEmail(params: {
  to: string;
  name: string;
  subject: string;
  message: string;
  eventTitle: string;
  organizerName: string;
}): Promise<boolean> {
  if (!sgMail) {
    console.warn('[Tickets Email] SendGrid not configured - skipping bulk email');
    return false;
  }
  
  try {
    const { to, name, subject, message, eventTitle, organizerName } = params;
    
    // Convert message line breaks to HTML
    const htmlMessage = message.replace(/\n/g, '<br>');
    
    await sgMail.send({
      to,
      from: {
        email: 'noreply@thehouseofjugnu.com',
        name: 'Jugnu'
      },
      subject,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#c0580f 0%,#d3541e 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px;font-weight:600}.content{background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px}.message-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;white-space:pre-wrap}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}</style>
</head>
<body><div class="container"><div class="header"><h1>📧 Message from ${organizerName}</h1></div><div class="content"><p>Hi ${name},</p><p>You're receiving this message regarding <strong>${eventTitle}</strong>.</p><div class="message-box">${htmlMessage}</div><p style="margin-top:24px;color:#6b7280">This message was sent by the event organizer.</p></div><div class="footer"><p>Questions? Contact us at <a href="mailto:support@thehouseofjugnu.com" style="color:#c0580f">support@thehouseofjugnu.com</a></p><p style="margin-top:10px">© ${new Date().getFullYear()} Jugnu</p></div></div></body>
</html>`
    });
    
    console.log(`[Tickets Email] Sent bulk message to: ${to}`);
    return true;
  } catch (error) {
    console.error('[Tickets Email] Error sending bulk email:', error);
    return false;
  }
}
