import type { Express, Request, Response } from "express";
import { ticketsStorage } from "./tickets-storage";
import { sendBulkAttendeeEmail } from "./email-service";

// Middleware to check if ticketing is enabled
const isTicketingEnabled = () => process.env.ENABLE_TICKETING === 'true';

const requireTicketing = (req: Request, res: Response, next: any) => {
  if (!isTicketingEnabled()) {
    return res.status(404).json({ ok: false, disabled: true });
  }
  next();
};

// Middleware to check organizer auth
const requireOrganizer = async (req: Request & { session?: any; organizer?: any }, res: Response, next: any) => {
  let organizer = null;
  
  if (req.session?.userId) {
    organizer = await ticketsStorage.getOrganizerByUserId(req.session.userId);
  }
  
  if (!organizer && req.session?.organizerId) {
    organizer = await ticketsStorage.getOrganizerById(req.session.organizerId);
  }
  
  if (!organizer) {
    return res.status(401).json({ ok: false, error: 'Please log in as an organizer' });
  }
  
  if (organizer.status === 'suspended') {
    return res.status(401).json({ ok: false, error: 'Organizer account suspended' });
  }
  
  req.organizer = organizer;
  next();
};

export function addCommunicationRoutes(app: Express) {
  
  // Send bulk message to attendees
  app.post('/api/tickets/events/:eventId/send-message', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { eventId } = req.params;
      const { ticketIds, subject, message } = req.body;
      
      console.log('[Communication] Send message request:', { eventId, ticketCount: ticketIds?.length });
      
      // Validate inputs
      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return res.status(400).json({ ok: false, error: 'No attendees selected' });
      }
      
      if (!subject || subject.trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'Subject is required' });
      }
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'Message is required' });
      }
      
      // Verify event ownership
      const event = await ticketsStorage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      if (event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Get attendees by ticket IDs
      const attendees = [];
      for (const ticketId of ticketIds) {
        const ticket = await ticketsStorage.getTicketById(ticketId);
        if (!ticket) {
          console.warn(`[Communication] Ticket not found: ${ticketId}`);
          continue;
        }
        
        // Get order info for buyer email
        const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
        if (!orderItem) {
          console.warn(`[Communication] Order item not found for ticket: ${ticketId}`);
          continue;
        }
        
        const order = await ticketsStorage.getOrderById(orderItem.orderId);
        if (!order) {
          console.warn(`[Communication] Order not found for ticket: ${ticketId}`);
          continue;
        }
        
        // Verify ticket belongs to this event
        const tier = await ticketsStorage.getTierById(ticket.tierId);
        if (!tier || tier.eventId !== eventId) {
          console.warn(`[Communication] Ticket ${ticketId} does not belong to event ${eventId}`);
          continue;
        }
        
        attendees.push({
          email: order.buyerEmail,
          name: order.buyerName || 'Attendee',
          ticketId: ticket.id,
          ticketSerial: ticket.serial
        });
      }
      
      if (attendees.length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid attendees found for selected tickets' });
      }
      
      console.log(`[Communication] Sending message to ${attendees.length} attendees`);
      
      // Send emails
      const emailPromises = attendees.map(attendee => 
        sendBulkAttendeeEmail({
          to: attendee.email,
          name: attendee.name,
          subject,
          message,
          eventTitle: event.title,
          organizerName: req.organizer.businessName || 'Event Organizer'
        })
      );
      
      try {
        await Promise.all(emailPromises);
        
        // Create audit log
        await ticketsStorage.createAuditLog({
          actorType: 'organizer',
          actorId: req.organizer.id,
          action: 'bulk_email_sent',
          targetType: 'event',
          targetId: eventId,
          metaJson: {
            subject,
            messagePreview: message.substring(0, 100),
            recipientCount: attendees.length,
            ticketIds: ticketIds
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        res.json({
          ok: true,
          sent: attendees.length,
          message: `Successfully sent message to ${attendees.length} attendee${attendees.length !== 1 ? 's' : ''}`
        });
        
      } catch (emailError: any) {
        console.error('[Communication] Error sending emails:', emailError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to send some or all emails',
          details: emailError.message
        });
      }
      
    } catch (error: any) {
      console.error('[Communication] Error in send-message:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to send message' });
    }
  });
}
