import type { Express, Request, Response } from "express";
import express from "express";
import { ticketsStorage } from "./tickets-storage";
import { StripeService, stripe } from "./stripe-service";
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import type { 
  InsertTicketsEvent,
  InsertTicketsTier,
  InsertTicketsOrder,
  InsertTicketsDiscount
} from '@shared/schema';
import {
  checkoutSessionSchema,
  createEventSchema,
  updateEventSchema,
  createTierSchema,
  organizerSignupSchema,
  validateDiscountSchema,
  validateTicketSchema,
  refundSchema
} from './validation';

// Check if ticketing is enabled
const isTicketingEnabled = () => process.env.ENABLE_TICKETING === 'true';

// Middleware to check if ticketing is enabled
const requireTicketing = (req: Request, res: Response, next: any) => {
  if (!isTicketingEnabled()) {
    return res.status(404).json({ ok: false, error: 'Ticketing not available' });
  }
  next();
};

// Middleware to check organizer auth - uses session
const requireOrganizer = async (req: Request & { session?: any }, res: Response, next: any) => {
  // Check session for organizer authentication
  const organizerId = req.session?.organizerId;
  
  if (!organizerId) {
    return res.status(401).json({ ok: false, error: 'Please log in as an organizer' });
  }
  
  const organizer = await ticketsStorage.getOrganizerById(organizerId);
  if (!organizer || organizer.status !== 'active') {
    return res.status(401).json({ ok: false, error: 'Organizer account not active' });
  }
  
  (req as any).organizer = organizer;
  next();
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (obj instanceof Date || typeof obj !== 'object') {
    return obj;
  }
  
  // Check if it's a Date string (ISO format)
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return obj;
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = toCamelCase(obj[key]);
    return result;
  }, {} as any);
};

export function addTicketsRoutes(app: Express) {
  // ============ PUBLIC ENDPOINTS ============
  
  // Get public events
  app.get('/api/tickets/events/public', requireTicketing, async (req: Request, res: Response) => {
    try {
      const { city } = req.query;
      console.log('[Tickets] Getting public events, city filter:', city);
      const events = await ticketsStorage.getPublicEvents();
      console.log('[Tickets] Found events:', events.length, events);
      
      // Add tier information
      const eventsWithTiers = await Promise.all(
        events.map(async (event) => {
          const tiers = await ticketsStorage.getTiersByEvent(event.id);
          console.log('[Tickets] Tiers for event:', event.id, tiers.length, 'tiers found');
          return { ...event, tiers };
        })
      );
      
      // Convert to camelCase for frontend
      const camelCaseEvents = toCamelCase(eventsWithTiers);
      if (camelCaseEvents.length > 0) {
        console.log('[Tickets] First transformed event:', JSON.stringify(camelCaseEvents[0], null, 2).slice(0, 500));
      }
      
      res.json({ ok: true, events: camelCaseEvents });
    } catch (error) {
      console.error('Error fetching public events:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch events' });
    }
  });

  // Get event by slug
  app.get('/api/tickets/events/:slug', requireTicketing, async (req: Request, res: Response) => {
    try {
      const event = await ticketsStorage.getEventBySlug(req.params.slug);
      if (!event) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      const tiers = await ticketsStorage.getTiersByEvent(event.id);
      const organizer = await ticketsStorage.getOrganizerById(event.organizer_id || event.organizerId);
      
      // Convert to camelCase for frontend
      const camelCaseEvent = toCamelCase({ ...event, tiers });
      
      res.json({ 
        ok: true, 
        event: camelCaseEvent,
        organizer: {
          id: organizer?.id,
          businessName: organizer?.businessName
        }
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch event' });
    }
  });

  // Check discount code
  app.post('/api/tickets/discounts/validate', requireTicketing, async (req: Request, res: Response) => {
    try {
      const validated = validateDiscountSchema.parse(req.body);
      const { eventId, code } = validated;
      
      const discount = await ticketsStorage.getDiscountByCode(eventId, code);
      if (!discount) {
        return res.status(404).json({ ok: false, error: 'Invalid discount code' });
      }
      
      res.json({ ok: true, discount });
    } catch (error) {
      console.error('Error validating discount:', error);
      res.status(500).json({ ok: false, error: 'Failed to validate discount' });
    }
  });

  // ============ CHECKOUT ============
  
  // Create checkout session
  app.post('/api/tickets/checkout/session', requireTicketing, async (req: Request, res: Response) => {
    try {
      // Validate and sanitize input
      const validated = checkoutSessionSchema.parse(req.body);
      const { 
        eventId, 
        items, // Array of { tierId, quantity }
        buyerEmail, 
        buyerName, 
        buyerPhone,
        discountCode,
        returnUrl 
      } = validated;
      
      // Validate event
      const event = await ticketsStorage.getEventById(eventId);
      if (!event || event.status !== 'published') {
        return res.status(404).json({ ok: false, error: 'Event not available' });
      }
      
      // Validate organizer
      const organizer = await ticketsStorage.getOrganizerById(event.organizer_id || event.organizerId);
      if (!organizer) {
        return res.status(400).json({ ok: false, error: 'Event organizer not found' });
      }
      
      // Validate and fetch tiers
      const tierData = await Promise.all(
        items.map(async (item: any) => {
          const tier = await ticketsStorage.getTierById(item.tierId);
          if (!tier) throw new Error(`Tier ${item.tierId} not found`);
          
          // Check availability
          const available = await ticketsStorage.checkTierAvailability(tier.id, item.quantity);
          if (!available) throw new Error(`Not enough tickets available for ${tier.name}`);
          
          return { tier, quantity: item.quantity };
        })
      );
      
      // Check discount if provided
      let discountAmountCents = 0;
      if (discountCode) {
        const discount = await ticketsStorage.getDiscountByCode(eventId, discountCode);
        if (discount) {
          const subtotal = tierData.reduce((sum, item) => 
            sum + (item.tier.priceCents * item.quantity), 0
          );
          
          if (discount.type === 'percent') {
            discountAmountCents = Math.round(subtotal * (Number(discount.value) / 100));
          } else {
            discountAmountCents = Number(discount.value);
          }
        }
      }
      
      // Calculate pricing
      const pricing = StripeService.calculatePricing(tierData, event, discountAmountCents);
      
      // Create order in database
      const order = await ticketsStorage.createOrder({
        eventId,
        buyerEmail,
        buyerName,
        buyerPhone,
        status: 'pending',
        subtotalCents: pricing.subtotalCents,
        feesCents: pricing.feesCents,
        taxCents: pricing.taxCents,
        totalCents: pricing.totalCents,
        currency: 'CAD',
        discountCode,
        discountAmountCents
      });
      
      // Create Stripe checkout session
      if (!stripe || !organizer.stripeAccountId) {
        // For testing without Stripe
        return res.json({
          ok: true,
          orderId: order.id,
          checkoutUrl: `/tickets/checkout/test?orderId=${order.id}`,
          testMode: true
        });
      }
      
      const session = await StripeService.createCheckoutSession(
        event,
        organizer,
        tierData,
        order,
        returnUrl || `${req.protocol}://${req.get('host')}/tickets/order/${order.id}`
      );
      
      if (!session) {
        throw new Error('Failed to create checkout session');
      }
      
      // Update order with Stripe session ID
      await ticketsStorage.updateOrder(order.id, {
        stripeCheckoutSessionId: session.id
      });
      
      res.json({
        ok: true,
        orderId: order.id,
        checkoutUrl: session.url,
        testMode: false
      });
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Checkout failed' });
    }
  });

  // ============ WEBHOOK ============
  
  // Stripe webhook handler - MUST use raw body for signature verification
  app.post('/api/tickets/webhooks/stripe', 
    express.raw({ type: 'application/json' }), 
    async (req: Request, res: Response) => {
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(400).json({ ok: false, error: 'Stripe not configured' });
      }
      
      const sig = req.headers['stripe-signature'] as string;
      if (!sig) {
        return res.status(400).json({ ok: false, error: 'Missing stripe-signature header' });
      }
      
      try {
        // Verify webhook signature with raw body
        const event = StripeService.verifyWebhookSignature(req.body, sig);
        if (!event) {
          return res.status(400).json({ ok: false, error: 'Invalid signature' });
        }
        
        // Log webhook
        const webhookId = nanoid();
        await ticketsStorage.createWebhook({
          id: webhookId,
          kind: event.type,
          payloadJson: event as any,
          status: 'pending'
        });
        
        // Process based on event type
        try {
          switch (event.type) {
            case 'checkout.session.completed':
              await handleCheckoutCompleted(event.data.object as any);
              await ticketsStorage.markWebhookProcessed(webhookId);
              break;
            
            case 'payment_intent.succeeded':
              // Additional payment confirmation - already handled by checkout.session.completed
              await ticketsStorage.markWebhookProcessed(webhookId);
              break;
            
            case 'charge.refunded':
              await handleRefund(event.data.object as any);
              await ticketsStorage.markWebhookProcessed(webhookId);
              break;
            
            default:
              // Unknown event type - mark as processed
              await ticketsStorage.markWebhookProcessed(webhookId);
          }
        } catch (processingError: any) {
          await ticketsStorage.markWebhookProcessed(webhookId, processingError.message);
          throw processingError;
        }
        
        res.json({ received: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ ok: false, error: 'Webhook processing failed' });
      }
    });

  // ============ ORGANIZER ENDPOINTS ============
  
  // Create/connect organizer account
  app.post('/api/tickets/organizers/connect', requireTicketing, async (req: Request & { session?: any }, res: Response) => {
    try {
      const validated = organizerSignupSchema.parse(req.body);
      const { userId, businessName, businessEmail, returnUrl, refreshUrl } = validated;
      
      // Check if organizer already exists
      let organizer = await ticketsStorage.getOrganizerByUserId(userId);
      
      if (!organizer) {
        // Create new organizer
        organizer = await ticketsStorage.createOrganizer({
          userId,
          businessName,
          businessEmail,
          status: 'pending'
        });
      }
      
      // Generate Stripe Connect onboarding link
      if (stripe) {
        const onboardingUrl = await StripeService.createConnectOnboardingLink(
          organizer.id,
          returnUrl || `${req.protocol}://${req.get('host')}/tickets/organizer/dashboard`,
          refreshUrl || `${req.protocol}://${req.get('host')}/tickets/organizer/connect`
        );
        
        if (onboardingUrl) {
          return res.json({ ok: true, onboardingUrl, organizerId: organizer.id });
        }
      }
      
      // Test mode without Stripe - set session
      req.session = req.session || {};
      req.session.organizerId = organizer.id;
      
      res.json({ 
        ok: true, 
        organizerId: organizer.id, 
        testMode: true 
      });
      
    } catch (error) {
      console.error('Organizer connect error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create organizer account' });
    }
  });

  // Get organizer info
  app.get('/api/tickets/organizers/me', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const events = await ticketsStorage.getEventsByOrganizer(organizer.id);
      
      res.json({ ok: true, organizer, events });
    } catch (error) {
      console.error('Get organizer error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch organizer info' });
    }
  });

  // Create event
  app.post('/api/tickets/events', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const validated = createEventSchema.parse(req.body);
      const eventData: InsertTicketsEvent = {
        ...validated,
        organizerId: organizer.id,
        status: validated.status || 'draft'
      };
      
      const event = await ticketsStorage.createEvent(eventData);
      res.json({ ok: true, event });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create event' });
    }
  });

  // Update event
  app.patch('/api/tickets/events/:id', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const event = await ticketsStorage.getEventById(req.params.id);
      
      if (!event || event.organizerId !== organizer.id) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      const validated = updateEventSchema.parse(req.body);
      const updated = await ticketsStorage.updateEvent(req.params.id, validated);
      res.json({ ok: true, event: updated });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update event' });
    }
  });

  // Create tier
  app.post('/api/tickets/events/:eventId/tiers', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const event = await ticketsStorage.getEventById(req.params.eventId);
      
      if (!event || event.organizerId !== organizer.id) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      const validated = createTierSchema.parse(req.body);
      const tierData: InsertTicketsTier = {
        ...validated,
        eventId: event.id
      };
      
      const tier = await ticketsStorage.createTier(tierData);
      res.json({ ok: true, tier });
    } catch (error) {
      console.error('Create tier error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create tier' });
    }
  });

  // Get event orders
  app.get('/api/tickets/events/:eventId/orders', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const event = await ticketsStorage.getEventById(req.params.eventId);
      
      if (!event || event.organizerId !== organizer.id) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      const orders = await ticketsStorage.getOrdersByEvent(event.id);
      res.json({ ok: true, orders });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch orders' });
    }
  });

  // Get event metrics
  app.get('/api/tickets/events/:eventId/metrics', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const event = await ticketsStorage.getEventById(req.params.eventId);
      
      if (!event || event.organizerId !== organizer.id) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      const metrics = await ticketsStorage.getEventMetrics(event.id);
      res.json({ ok: true, metrics });
    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch metrics' });
    }
  });

  // ============ TICKET VALIDATION ============
  
  // Validate/scan ticket
  app.post('/api/tickets/validate', requireTicketing, async (req: Request, res: Response) => {
    try {
      const validated = validateTicketSchema.parse(req.body);
      const { qrToken, apiKey } = validated;
      
      // TODO: Validate API key for event
      
      const ticket = await ticketsStorage.getTicketByQrToken(qrToken);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Invalid ticket' });
      }
      
      if (ticket.status === 'used') {
        return res.json({ 
          ok: false, 
          error: 'Ticket already used',
          usedAt: ticket.usedAt
        });
      }
      
      if (ticket.status !== 'valid') {
        return res.json({ 
          ok: false, 
          error: `Ticket ${ticket.status}`
        });
      }
      
      // Mark as used
      await ticketsStorage.updateTicketStatus(
        ticket.id, 
        'used', 
        new Date(),
        'scanner' // TODO: Get from API key
      );
      
      res.json({ 
        ok: true, 
        ticket: {
          serial: ticket.serial,
          status: 'valid'
        }
      });
      
    } catch (error) {
      console.error('Validate ticket error:', error);
      res.status(500).json({ ok: false, error: 'Failed to validate ticket' });
    }
  });

  // Get ticket QR code image
  app.get('/api/tickets/:ticketId/qrcode', requireTicketing, async (req: Request, res: Response) => {
    try {
      // TODO: Validate ownership
      const ticket = await ticketsStorage.getTicketByQrToken(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      const qrCodeDataURL = await QRCode.toDataURL(ticket.qrToken, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.json({ ok: true, qrCode: qrCodeDataURL });
    } catch (error) {
      console.error('QR code error:', error);
      res.status(500).json({ ok: false, error: 'Failed to generate QR code' });
    }
  });

  // ============ ORDER MANAGEMENT ============
  
  // Get order details
  app.get('/api/tickets/orders/:orderId', requireTicketing, async (req: Request, res: Response) => {
    try {
      const order = await ticketsStorage.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // TODO: Validate ownership
      
      const items = await ticketsStorage.getOrderItems(order.id);
      const tickets = await Promise.all(
        items.map(item => ticketsStorage.getTicketsByOrderItem(item.id))
      );
      
      res.json({ 
        ok: true, 
        order,
        items,
        tickets: tickets.flat()
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch order' });
    }
  });

  // Request refund
  app.post('/api/tickets/orders/:orderId/refund', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const validated = refundSchema.parse(req.body);
      const { amountCents, reason } = validated;
      const order = await ticketsStorage.getOrderById(req.params.orderId);
      
      if (!order) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // TODO: Validate organizer owns this event
      
      if (stripe && order.stripePaymentIntentId) {
        const refund = await StripeService.processRefund(order, amountCents || order.totalCents, reason);
        if (refund) {
          await ticketsStorage.updateOrder(order.id, {
            status: amountCents < order.totalCents ? 'partially_refunded' : 'refunded',
            refundedAmountCents: (order.refundedAmountCents || 0) + amountCents
          });
        }
      }
      
      res.json({ ok: true });
    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({ ok: false, error: 'Failed to process refund' });
    }
  });

  console.log('✓ Ticketing routes added');
}

// Helper function to handle checkout completion
async function handleCheckoutCompleted(session: any) {
  try {
    const metadata = session.metadata;
    if (!metadata?.orderId) return;
    
    // Update order status
    await ticketsStorage.updateOrder(metadata.orderId, {
      status: 'paid',
      stripePaymentIntentId: session.payment_intent,
      placedAt: new Date()
    });
    
    // Parse tier info and create order items and tickets
    const tierInfo = JSON.parse(metadata.tierInfo || '[]');
    
    for (const item of tierInfo) {
      // Create order item
      const orderItem = await ticketsStorage.createOrderItem({
        orderId: metadata.orderId,
        tierId: item.tierId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        taxCents: 0, // TODO: Calculate per-item tax
        feesCents: 0  // TODO: Calculate per-item fees
      });
      
      // Create individual tickets
      for (let i = 0; i < item.quantity; i++) {
        await ticketsStorage.createTicket({
          orderItemId: orderItem.id,
          tierId: item.tierId,
          serial: '', // Will be generated in createTicket
          qrToken: '', // Will be generated in createTicket
          status: 'valid'
        });
      }
    }
    
    // TODO: Send email with tickets
    
    // Log audit
    await ticketsStorage.createAuditLog({
      actorType: 'system',
      actorId: 'stripe',
      action: 'order_completed',
      targetType: 'order',
      targetId: metadata.orderId,
      metaJson: { sessionId: session.id }
    });
    
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    throw error;
  }
}

// Helper function to handle refunds
async function handleRefund(charge: any) {
  try {
    // Find order by payment intent
    // TODO: Implement finding order by payment intent
    
    // Update ticket statuses
    // TODO: Mark tickets as refunded
    
    // Log audit
    await ticketsStorage.createAuditLog({
      actorType: 'system',
      actorId: 'stripe',
      action: 'refund_processed',
      targetType: 'charge',
      targetId: charge.id,
      metaJson: { amount: charge.amount_refunded }
    });
    
  } catch (error) {
    console.error('Error handling refund:', error);
    throw error;
  }
}