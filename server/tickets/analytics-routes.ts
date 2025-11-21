import type { Express, Request, Response } from "express";
import { ticketsStorage } from "./tickets-storage";
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';

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

export function addAnalyticsRoutes(app: Express) {
  
  // ============ ANALYTICS ENDPOINTS ============
  
  // Get comprehensive event analytics
  app.get('/api/tickets/events/:eventId/analytics', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { eventId } = req.params;
      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      // Verify event ownership
      const event = await ticketsStorage.getEventById(eventId);
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Get date range (default: last 30 days)
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : subDays(end, 30);
      
      // Fetch all orders for the event
      const orders = await ticketsStorage.getOrdersByEvent(eventId);
      const paidOrders = orders.filter(o => o.status === 'paid');
      const refundedOrders = orders.filter(o => o.status === 'refunded' || o.status === 'partially_refunded');
      
      // Fetch all tickets and tiers for analytics
      const tickets = await ticketsStorage.getTicketsByEvent(eventId);
      const tiers = await ticketsStorage.getTiersByEvent(eventId);
      
      // Build maps for quick lookups
      const orderItemsMap = new Map<string, any>();
      const ordersMap = new Map<string, any>();
      
      // Fetch all order items for these tickets
      const uniqueOrderItemIds = Array.from(new Set(tickets.map(t => t.orderItemId)));
      for (const itemId of uniqueOrderItemIds) {
        const item = await ticketsStorage.getOrderItemById(itemId);
        if (item) {
          orderItemsMap.set(itemId, item);
          if (!ordersMap.has(item.orderId)) {
            const order = await ticketsStorage.getOrderById(item.orderId);
            if (order) ordersMap.set(item.orderId, order);
          }
        }
      }
      
      // 1. Sales over time
      const salesByDate = new Map<string, number>();
      const revenueByDate = new Map<string, number>();
      
      const dateInterval = eachDayOfInterval({ start, end });
      dateInterval.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        salesByDate.set(dateKey, 0);
        revenueByDate.set(dateKey, 0);
      });
      
      paidOrders.forEach(order => {
        if (order.placedAt) {
          const orderDate = new Date(order.placedAt);
          if (orderDate >= start && orderDate <= end) {
            const dateKey = format(orderDate, 'yyyy-MM-dd');
            const currentSales = salesByDate.get(dateKey) || 0;
            const currentRevenue = revenueByDate.get(dateKey) || 0;
            
            // Count tickets in this order using our maps
            const orderTickets = tickets.filter(t => {
              const orderItem = orderItemsMap.get(t.orderItemId);
              return orderItem && orderItem.orderId === order.id;
            });
            
            salesByDate.set(dateKey, currentSales + orderTickets.length);
            revenueByDate.set(dateKey, currentRevenue + order.totalCents);
          }
        }
      });
      
      // 2. Revenue breakdown by tier
      const revenueByTier = new Map<string, { 
        name: string;
        quantity: number;
        revenue: number;
        averagePrice: number;
      }>();
      
      for (const tier of tiers) {
        const tierTickets = tickets.filter(t => t.tierId === tier.id && t.status !== 'refunded');
        const tierRevenue = tierTickets.length * tier.priceCents;
        
        revenueByTier.set(tier.id, {
          name: tier.name,
          quantity: tierTickets.length,
          revenue: tierRevenue,
          averagePrice: tier.priceCents
        });
      }
      
      // 3. Check-in patterns
      const checkinsByHour = new Map<number, number>();
      for (let hour = 0; hour < 24; hour++) {
        checkinsByHour.set(hour, 0);
      }
      
      tickets.filter(t => t.status === 'used' && t.usedAt).forEach(ticket => {
        const checkinHour = new Date(ticket.usedAt!).getHours();
        checkinsByHour.set(checkinHour, (checkinsByHour.get(checkinHour) || 0) + 1);
      });
      
      // 4. Overall statistics
      const totalTicketsSold = tickets.filter(t => t.status !== 'refunded').length;
      const totalTicketsUsed = tickets.filter(t => t.status === 'used').length;
      const totalTicketsRefunded = tickets.filter(t => t.status === 'refunded').length;
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
      const totalRefunded = refundedOrders.reduce((sum, o) => sum + (o.refundedAmountCents || 0), 0);
      const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
      
      // 5. Conversion metrics
      const checkInRate = totalTicketsSold > 0 ? (totalTicketsUsed / totalTicketsSold) * 100 : 0;
      const refundRate = totalTicketsSold > 0 ? (totalTicketsRefunded / totalTicketsSold) * 100 : 0;
      
      // 6. Top buyers (for VIP identification)
      const buyerStats = new Map<string, { 
        email: string;
        name: string;
        ticketCount: number;
        totalSpent: number;
      }>();
      
      paidOrders.forEach(order => {
        const existing = buyerStats.get(order.buyerEmail) || {
          email: order.buyerEmail,
          name: order.buyerName || 'Unknown',
          ticketCount: 0,
          totalSpent: 0
        };
        
        // Count tickets in this order using our maps
        const orderTickets = tickets.filter(t => {
          const orderItem = orderItemsMap.get(t.orderItemId);
          return orderItem && orderItem.orderId === order.id;
        });
        
        existing.ticketCount += orderTickets.length;
        existing.totalSpent += order.totalCents;
        
        buyerStats.set(order.buyerEmail, existing);
      });
      
      const topBuyers = Array.from(buyerStats.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
      
      // Calculate refund stats
      const refundReasons = new Map<string, number>();
      tickets.filter(t => t.status === 'refunded').forEach(ticket => {
        const reason = (ticket as any).refundReason || 'No reason provided';
        refundReasons.set(reason, (refundReasons.get(reason) || 0) + 1);
      });
      
      // Get total revenue for tier percentages
      const totalTierRevenue = Array.from(revenueByTier.values()).reduce((sum, tier) => sum + tier.revenue, 0);
      
      // Format response to match frontend AnalyticsData interface
      const analytics = {
        summary: {
          totalTicketsSold,
          totalRevenue,
          averageTicketPrice: totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
          conversionRate: 0, // Would need page view data to calculate
          refundRate,
          checkInRate
        },
        
        salesOverTime: Array.from(salesByDate.entries()).map(([date, count]) => ({
          date,
          tickets: count,
          revenue: revenueByDate.get(date) || 0
        })),
        
        revenueByTier: Array.from(revenueByTier.values()).map(tier => ({
          name: tier.name,
          revenue: tier.revenue,
          ticketsSold: tier.quantity,
          percentage: totalTierRevenue > 0 ? (tier.revenue / totalTierRevenue) * 100 : 0
        })),
        
        checkInPatterns: Array.from(checkinsByHour.entries()).map(([hour, count]) => ({
          hour: `${hour}:00`,
          count
        })),
        
        refundStats: {
          totalRefunds: totalTicketsRefunded,
          refundedAmount: totalRefunded,
          reasons: Array.from(refundReasons.entries()).map(([reason, count]) => ({
            reason,
            count
          }))
        },
        
        attendeeDemographics: {
          emailDomains: Array.from(
            paidOrders.reduce((map, order) => {
              const domain = order.buyerEmail ? (order.buyerEmail.split('@')[1] || 'unknown') : 'unknown';
              map.set(domain, (map.get(domain) || 0) + 1);
              return map;
            }, new Map<string, number>())
          )
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          purchaseTimes: Array.from(
            paidOrders.reduce((map, order) => {
              if (order.placedAt) {
                const hour = `${new Date(order.placedAt).getHours()}:00`;
                map.set(hour, (map.get(hour) || 0) + 1);
              }
              return map;
            }, new Map<string, number>())
          ).map(([hour, count]) => ({ hour, count }))
        }
      };
      
      res.json({
        ok: true,
        event: {
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          status: event.status
        },
        dateRange: {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd')
        },
        analytics
      });
      
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to fetch analytics' });
    }
  });
  
  // ============ BULK EMAIL ENDPOINTS ============
  
  // Send bulk email to attendees
  app.post('/api/tickets/attendees/bulk-email', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { 
        eventId, 
        subject, 
        message, 
        recipientFilter,
        templateId,
        scheduledFor,
        testMode = false
      } = req.body;
      
      // Verify event ownership
      const event = await ticketsStorage.getEventById(eventId);
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Build recipient list based on filters
      const allTickets = await ticketsStorage.getTicketsByEvent(eventId);
      let filteredTickets = [...allTickets];
      
      // Apply filters
      if (recipientFilter) {
        if (recipientFilter.status) {
          filteredTickets = filteredTickets.filter(t => t.status === recipientFilter.status);
        }
        if (recipientFilter.tierId) {
          filteredTickets = filteredTickets.filter(t => t.tierId === recipientFilter.tierId);
        }
        if (recipientFilter.isVip !== undefined) {
          filteredTickets = filteredTickets.filter(t => t.isVip === recipientFilter.isVip);
        }
        if (recipientFilter.checkedIn !== undefined) {
          filteredTickets = filteredTickets.filter(t => 
            recipientFilter.checkedIn ? t.status === 'used' : t.status === 'valid'
          );
        }
      }
      
      // Get unique buyer emails
      const recipientEmails = new Set<string>();
      for (const ticket of filteredTickets) {
        const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
        if (orderItem) {
          const order = await ticketsStorage.getOrderById(orderItem.orderId);
          if (order) {
            recipientEmails.add(order.buyerEmail);
          }
        }
      }
      
      const recipients = Array.from(recipientEmails);
      
      if (recipients.length === 0) {
        return res.status(400).json({ ok: false, error: 'No recipients match the selected criteria' });
      }
      
      // Create email communication record
      const communication = await ticketsStorage.createEmailCommunication({
        eventId,
        organizerId: req.organizer.id,
        subject,
        message,
        templateId,
        recipientEmails: recipients,
        recipientFilter,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'scheduled' : 'sending'
      });
      
      // Send emails (or schedule for later)
      if (!scheduledFor && !testMode) {
        // Send immediately
        try {
          const { sendBulkAttendeeEmail } = await import('./email-service');
          
          const emailData = {
            eventTitle: event.title,
            eventDate: event.startAt,
            eventVenue: event.venue || '',
            subject,
            message,
            organizerName: req.organizer.businessName,
            unsubscribeUrl: `${process.env.APP_URL}/unsubscribe`
          };
          
          // Queue emails for sending
          const sendResults = await sendBulkAttendeeEmail(recipients, emailData);
          
          // Update communication status
          await ticketsStorage.updateEmailCommunication(communication.id, {
            status: 'sent',
            sentAt: new Date(),
            stats: {
              totalRecipients: recipients.length,
              sent: sendResults.successful,
              failed: sendResults.failed
            }
          });
          
          res.json({
            ok: true,
            communication: {
              id: communication.id,
              recipientCount: recipients.length,
              status: 'sent',
              stats: sendResults
            }
          });
          
        } catch (emailError: any) {
          console.error('Failed to send bulk email:', emailError);
          
          await ticketsStorage.updateEmailCommunication(communication.id, {
            status: 'failed',
            stats: { error: emailError.message }
          });
          
          return res.status(500).json({ 
            ok: false, 
            error: 'Failed to send emails' 
          });
        }
      } else if (testMode) {
        // Test mode - just return preview
        res.json({
          ok: true,
          testMode: true,
          preview: {
            subject,
            message,
            recipientCount: recipients.length,
            sampleRecipients: recipients.slice(0, 5)
          }
        });
      } else {
        // Scheduled for later
        res.json({
          ok: true,
          communication: {
            id: communication.id,
            recipientCount: recipients.length,
            status: 'scheduled',
            scheduledFor
          }
        });
      }
      
    } catch (error: any) {
      console.error('Error sending bulk email:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to send bulk email' });
    }
  });
  
  // Get email communication history
  app.get('/api/tickets/events/:eventId/communications', requireTicketing, requireOrganizer, async (req: Request & { organizer?: any }, res: Response) => {
    try {
      const { eventId } = req.params;
      
      // Verify event ownership
      const event = await ticketsStorage.getEventById(eventId);
      if (!event || event.organizerId !== req.organizer.id) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      // Get all communications for this event
      const communications = await ticketsStorage.getEmailCommunicationsByEvent(eventId);
      
      res.json({
        ok: true,
        communications: communications.map(comm => ({
          id: comm.id,
          subject: comm.subject,
          recipientCount: comm.recipientEmails.length,
          status: comm.status,
          sentAt: comm.sentAt,
          scheduledFor: comm.scheduledFor,
          stats: comm.stats,
          createdAt: comm.createdAt
        }))
      });
      
    } catch (error: any) {
      console.error('Error fetching communications:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to fetch communications' });
    }
  });
}