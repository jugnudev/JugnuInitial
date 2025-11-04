import type { Express, Request, Response } from "express";
import { ticketsStorage } from "./tickets-storage";
import { StripeService, stripe } from "./stripe-service";
import { nanoid } from 'nanoid';
import type { TicketsOrder } from '@shared/schema';

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

export function addRefundRoutes(app: Express) {
  
  // ============ REFUND ENDPOINTS ============
  
  // Process refund for a ticket
  app.post('/api/tickets/:ticketId/refund', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { refundAmount, reason, refundType = 'full' } = req.body;
      
      // Get ticket details
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      if (ticket.status === 'refunded') {
        return res.status(400).json({ ok: false, error: 'Ticket already refunded' });
      }
      
      // Get order item and order
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      if (!orderItem) {
        return res.status(404).json({ ok: false, error: 'Order item not found' });
      }
      
      const order = await ticketsStorage.getOrderById(orderItem.orderId);
      if (!order) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // Verify organizer owns this event
      const event = await ticketsStorage.getEventById(order.eventId);
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Calculate refund amount
      let refundCents: number;
      if (refundType === 'full') {
        // Full refund - calculate proportional amount for this ticket
        refundCents = Math.round((orderItem.unitPriceCents + orderItem.taxCents) / orderItem.quantity);
      } else if (refundType === 'partial') {
        refundCents = refundAmount || 0;
        if (refundCents <= 0) {
          return res.status(400).json({ ok: false, error: 'Invalid refund amount' });
        }
      } else {
        return res.status(400).json({ ok: false, error: 'Invalid refund type' });
      }
      
      // Process Stripe refund
      if (order.stripePaymentIntentId && stripe) {
        try {
          const refund = await StripeService.processRefund(order, refundCents, reason);
          
          if (!refund) {
            throw new Error('Failed to process Stripe refund');
          }
          
          // Update ticket status
          await ticketsStorage.updateTicket(ticketId, {
            status: 'refunded',
            refundedAt: new Date(),
            refundReason: reason || 'Refunded by organizer'
          });
          
          // Update order refund amount
          const newRefundedAmount = (order.refundedAmountCents || 0) + refundCents;
          const orderStatus = newRefundedAmount >= order.totalCents ? 'refunded' : 'partially_refunded';
          
          await ticketsStorage.updateOrder(order.id, {
            status: orderStatus,
            refundedAmountCents: newRefundedAmount,
            refundProcessedAt: new Date(),
            refundReason: reason,
            stripeRefundId: refund.id
          });
          
          // Create audit log
          await ticketsStorage.createAuditLog({
            actorType: 'organizer',
            actorId: req.organizer.id,
            action: 'ticket_refunded',
            targetType: 'ticket',
            targetId: ticketId,
            metaJson: {
              orderId: order.id,
              refundAmount: refundCents,
              reason,
              stripeRefundId: refund.id
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
          
          // Send refund confirmation email
          try {
            const { sendRefundEmail } = await import('../services/emailService');
            await sendRefundEmail({
              recipientEmail: order.buyerEmail,
              buyerName: order.buyerName || 'Guest',
              eventTitle: event.title,
              refundAmount: `$${(refundCents / 100).toFixed(2)} CAD`,
              ticketSerial: ticket.serial,
              reason: reason || 'Refund processed by organizer',
              orderNumber: order.id.slice(0, 8).toUpperCase()
            });
          } catch (emailError) {
            console.error('Failed to send refund email:', emailError);
          }
          
          res.json({
            ok: true,
            refund: {
              id: refund.id,
              amount: refundCents,
              status: refund.status,
              ticketId,
              orderStatus
            }
          });
          
        } catch (stripeError: any) {
          console.error('Stripe refund error:', stripeError);
          return res.status(500).json({ 
            ok: false, 
            error: stripeError.message || 'Failed to process refund' 
          });
        }
      } else {
        // No Stripe payment - just update status
        await ticketsStorage.updateTicket(ticketId, {
          status: 'refunded',
          refundedAt: new Date(),
          refundReason: reason || 'Refunded by organizer'
        });
        
        res.json({
          ok: true,
          refund: {
            amount: refundCents,
            ticketId,
            orderStatus: 'refunded'
          }
        });
      }
      
    } catch (error: any) {
      console.error('Error processing refund:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to process refund' });
    }
  });
  
  // ============ ATTENDEE MANAGEMENT ENDPOINTS ============
  
  // Transfer ticket to another attendee
  app.patch('/api/tickets/:ticketId/transfer', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { newEmail, newName, newPhone } = req.body;
      
      if (!newEmail) {
        return res.status(400).json({ ok: false, error: 'New email is required' });
      }
      
      // Get ticket and verify ownership
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      if (ticket.status !== 'valid') {
        return res.status(400).json({ ok: false, error: 'Only valid tickets can be transferred' });
      }
      
      // Verify organizer owns this event
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      const order = await ticketsStorage.getOrderById(orderItem!.orderId);
      const event = await ticketsStorage.getEventById(order!.eventId);
      
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Create a new ticket for the new attendee
      const newSerial = `TKT-${nanoid(10).toUpperCase()}`;
      const newQrToken = nanoid(20);
      
      const newTicket = await ticketsStorage.createTicket({
        orderItemId: ticket.orderItemId,
        tierId: ticket.tierId,
        serial: newSerial,
        qrToken: newQrToken,
        status: 'valid',
        transferredFrom: ticketId
      });
      
      // Mark old ticket as transferred
      await ticketsStorage.updateTicket(ticketId, {
        status: 'transferred',
        transferredTo: newTicket.id,
        transferredAt: new Date()
      });
      
      // Update order with new attendee info if provided
      if (newName || newPhone) {
        // Create a new order for the transferred ticket or update existing
        // This is simplified - in production you might handle this differently
        await ticketsStorage.updateOrder(order!.id, {
          buyerName: newName || order!.buyerName,
          buyerPhone: newPhone || order!.buyerPhone
        });
      }
      
      // Create audit log
      await ticketsStorage.createAuditLog({
        actorType: 'organizer',
        actorId: req.organizer.id,
        action: 'ticket_transferred',
        targetType: 'ticket',
        targetId: ticketId,
        metaJson: {
          newTicketId: newTicket.id,
          newEmail,
          newName,
          originalEmail: order!.buyerEmail
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Send transfer notification emails
      try {
        const { sendTicketTransferEmail } = await import('../services/emailService');
        
        // Email to new recipient
        await sendTicketTransferEmail({
          recipientEmail: newEmail,
          recipientName: newName || 'Guest',
          eventTitle: event.title,
          ticketSerial: newTicket.serial,
          qrToken: newTicket.qrToken,
          eventDate: event.startAt,
          eventVenue: event.venue || ''
        });
        
        // Notification to original buyer
        await sendTicketTransferEmail({
          recipientEmail: order!.buyerEmail,
          recipientName: order!.buyerName || 'Guest',
          eventTitle: event.title,
          ticketSerial: ticket.serial,
          isNotification: true,
          transferredTo: newEmail
        });
        
      } catch (emailError) {
        console.error('Failed to send transfer emails:', emailError);
      }
      
      res.json({
        ok: true,
        transfer: {
          oldTicketId: ticketId,
          newTicketId: newTicket.id,
          newSerial: newTicket.serial,
          transferredTo: newEmail
        }
      });
      
    } catch (error: any) {
      console.error('Error transferring ticket:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to transfer ticket' });
    }
  });
  
  // Update attendee information
  app.patch('/api/tickets/attendees/:ticketId', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { notes, tags, isVip, isBlocked, buyerName, buyerEmail, buyerPhone } = req.body;
      
      // Get ticket and verify ownership
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      // Verify organizer owns this event
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      const order = await ticketsStorage.getOrderById(orderItem!.orderId);
      const event = await ticketsStorage.getEventById(order!.eventId);
      
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Update ticket metadata
      const ticketUpdates: any = {};
      if (notes !== undefined) ticketUpdates.notes = notes;
      if (tags !== undefined) ticketUpdates.tags = tags;
      if (isVip !== undefined) ticketUpdates.isVip = isVip;
      if (isBlocked !== undefined) ticketUpdates.isBlocked = isBlocked;
      
      if (Object.keys(ticketUpdates).length > 0) {
        await ticketsStorage.updateTicket(ticketId, ticketUpdates);
      }
      
      // Update order buyer info if provided
      const orderUpdates: any = {};
      if (buyerName) orderUpdates.buyerName = buyerName;
      if (buyerEmail) orderUpdates.buyerEmail = buyerEmail;
      if (buyerPhone) orderUpdates.buyerPhone = buyerPhone;
      
      if (Object.keys(orderUpdates).length > 0) {
        await ticketsStorage.updateOrder(order!.id, orderUpdates);
      }
      
      // Create audit log
      await ticketsStorage.createAuditLog({
        actorType: 'organizer',
        actorId: req.organizer.id,
        action: 'attendee_updated',
        targetType: 'ticket',
        targetId: ticketId,
        metaJson: {
          ...ticketUpdates,
          ...orderUpdates
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({
        ok: true,
        ticket: {
          id: ticketId,
          ...ticketUpdates
        },
        order: {
          id: order!.id,
          ...orderUpdates
        }
      });
      
    } catch (error: any) {
      console.error('Error updating attendee:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to update attendee' });
    }
  });
  
  // Resend ticket email
  app.post('/api/tickets/:ticketId/resend', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { email } = req.body;
      
      // Get ticket and related data
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      const order = await ticketsStorage.getOrderById(orderItem!.orderId);
      const event = await ticketsStorage.getEventById(order!.eventId);
      const tier = await ticketsStorage.getTierById(ticket.tierId);
      
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Send ticket email
      const { sendTicketEmail } = await import('../services/emailService');
      
      await sendTicketEmail({
        recipientEmail: email || order!.buyerEmail,
        buyerName: order!.buyerName || 'Guest',
        eventTitle: event.title,
        eventVenue: event.venue || '',
        eventDate: new Date(event.startAt).toLocaleDateString(),
        eventTime: new Date(event.startAt).toLocaleTimeString(),
        orderNumber: order!.id.slice(0, 8).toUpperCase(),
        tickets: [{
          id: ticket.id,
          tierName: tier!.name,
          qrToken: ticket.qrToken,
          serial: ticket.serial
        }],
        totalAmount: `$${(order!.totalCents / 100).toFixed(2)} CAD`,
        refundPolicy: event.refundPolicy || 'Refunds available up to 24 hours before event.'
      });
      
      res.json({
        ok: true,
        message: `Ticket resent to ${email || order!.buyerEmail}`
      });
      
    } catch (error: any) {
      console.error('Error resending ticket:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to resend ticket' });
    }
  });
}