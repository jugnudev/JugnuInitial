import type { Express, Request, Response } from "express";
import express from "express";
import { ticketsStorage } from "./tickets-storage";
import { StripeService, stripe } from "./stripe-service";
import { addConnectRoutes } from './connect-routes';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import type { 
  InsertTicketsEvent,
  InsertTicketsTier,
  InsertTicketsOrder,
  InsertTicketsDiscount
} from '@shared/schema';
import {
  checkoutSessionSchema,
  paymentIntentSchema,
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
    console.log(`[Ticketing] Disabled - API route ${req.path} blocked by ENABLE_TICKETING flag`);
    return res.status(404).json({ ok: false, disabled: true });
  }
  next();
};

// Middleware to check organizer auth - uses session
const requireOrganizer = async (req: Request & { session?: any }, res: Response, next: any) => {
  let organizer = null;
  
  // PRIORITY 1: Check if user is logged in with main platform session (userId)
  if (req.session?.userId) {
    // Look up organizer by userId (approved businesses who enabled ticketing)
    organizer = await ticketsStorage.getOrganizerByUserId(req.session.userId);
  }
  
  // PRIORITY 2: Fall back to organizerId in session (legacy/direct ticketing signup)
  if (!organizer && req.session?.organizerId) {
    organizer = await ticketsStorage.getOrganizerById(req.session.organizerId);
  }
  
  // PRIORITY 3: Development fallback - check x-organizer-id header
  if (!organizer && process.env.NODE_ENV === 'development') {
    const headerOrganizerId = req.headers['x-organizer-id'] as string;
    if (headerOrganizerId) {
      console.log('[DEBUG] Using header-based auth in development:', headerOrganizerId);
      organizer = await ticketsStorage.getOrganizerById(headerOrganizerId);
    }
  }
  
  if (!organizer) {
    return res.status(401).json({ ok: false, error: 'Please log in as an organizer' });
  }
  
  if (organizer.status === 'suspended') {
    return res.status(401).json({ ok: false, error: 'Organizer account suspended' });
  }
  // Allow 'pending' and 'active' status so organizers can complete Stripe Connect onboarding
  
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
  // ============ STRIPE CONNECT ROUTES ============
  // Add Connect onboarding routes for business setup
  addConnectRoutes(app);
  
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

  // Get event by slug or ID
  app.get('/api/tickets/events/:identifier', requireTicketing, async (req: Request, res: Response) => {
    try {
      const identifier = req.params.identifier;
      console.log('[Event Detail] Looking up event by identifier:', identifier);
      
      // Check if identifier looks like a UUID (for ID) or a slug
      let event;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(identifier)) {
        // It's a UUID, fetch by ID
        console.log('[Event Detail] Identifier is UUID, fetching by ID');
        event = await ticketsStorage.getEventById(identifier);
      } else {
        // It's a slug
        console.log('[Event Detail] Identifier is slug, fetching by slug');
        event = await ticketsStorage.getEventBySlug(identifier);
      }
      
      if (!event) {
        console.log('[Event Detail] Event not found for identifier:', identifier);
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      console.log('[Event Detail] Event found:', event.id, 'organizerId:', event.organizerId);
      
      const tiers = await ticketsStorage.getTiersByEvent(event.id);
      
      // Safely handle organizer lookup with null check
      let organizer = null;
      if (event.organizerId) {
        console.log('[Event Detail] Looking up organizer:', event.organizerId);
        organizer = await ticketsStorage.getOrganizerById(event.organizerId);
        console.log('[Event Detail] Organizer found:', organizer ? 'yes' : 'no');
      } else {
        console.log('[Event Detail] No organizerId found on event, skipping organizer lookup');
      }
      
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
      
      // Validate organizer - handle undefined organizerId safely
      let organizer = null;
      if (event.organizerId) {
        console.log('[Checkout] Looking up organizer:', event.organizerId);
        organizer = await ticketsStorage.getOrganizerById(event.organizerId);
        if (!organizer) {
          console.log('[Checkout] Organizer not found for ID:', event.organizerId);
          return res.status(400).json({ ok: false, error: 'Event organizer not found' });
        }
      } else {
        console.log('[Checkout] No organizerId found on event, continuing without organizer for test mode');
        // Create a minimal organizer object for test mode
        organizer = { 
          id: 'test-organizer', 
          userId: null,
          stripeAccountId: null,
          status: 'active',
          businessName: 'Test Organizer',
          businessEmail: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        };
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
            sum + (StripeService.getUnitPriceCents(item.tier) * item.quantity), 0
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
        // currency defaults to 'CAD' in database
        discountCode,
        discountAmountCents
      });
      
      // Create Stripe checkout session
      console.log('Creating checkout session for order:', order.id);
      console.log('Stripe available:', !!stripe);
      console.log('Organizer stripeAccountId:', organizer.stripeAccountId);
      console.log('Test mode condition: !stripe =', !stripe, '|| !organizer.stripeAccountId =', !organizer.stripeAccountId);
      
      if (!stripe) {
        console.log('Using test mode - Stripe not configured');
        const testResponse = {
          ok: true,
          orderId: order.id,
          checkoutUrl: `/tickets/checkout/test?orderId=${order.id}`,
          testMode: true
        };
        console.log('Test mode response:', testResponse);
        return res.json(testResponse);
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

  // Create Payment Intent for embedded checkout
  app.post('/api/tickets/checkout/payment-intent', requireTicketing, async (req: Request, res: Response) => {
    try {
      // Validate and sanitize input (specific schema for Payment Intent - no returnUrl needed)
      const validated = paymentIntentSchema.parse(req.body);
      const { 
        eventId, 
        items, 
        buyerEmail, 
        buyerName, 
        buyerPhone,
        discountCode
      } = validated;
      
      // Validate event
      const event = await ticketsStorage.getEventById(eventId);
      if (!event || event.status !== 'published') {
        return res.status(404).json({ ok: false, error: 'Event not available' });
      }
      
      // Validate organizer
      let organizer = null;
      if (event.organizerId) {
        console.log('[PaymentIntent] Looking up organizer:', event.organizerId);
        organizer = await ticketsStorage.getOrganizerById(event.organizerId);
        if (!organizer) {
          console.log('[PaymentIntent] Organizer not found for ID:', event.organizerId);
          return res.status(400).json({ ok: false, error: 'Event organizer not found' });
        }
      } else {
        console.log('[PaymentIntent] No organizerId found on event, creating test organizer');
        organizer = { 
          id: 'test-organizer', 
          userId: null,
          stripeAccountId: null,
          status: 'active',
          businessName: 'Test Organizer',
          businessEmail: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        };
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
            sum + (StripeService.getUnitPriceCents(item.tier) * item.quantity), 0
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
        discountCode,
        discountAmountCents
      });
      
      // Create order items for each tier (critical for webhook ticket creation)
      console.log('[PaymentIntent] Creating order items for order:', order.id);
      for (const item of tierData) {
        await ticketsStorage.createOrderItem({
          orderId: order.id,
          tierId: item.tier.id,
          quantity: item.quantity,
          unitPriceCents: StripeService.getUnitPriceCents(item.tier),
          taxCents: 0, // Tax is calculated at order level
          feesCents: 0  // Fees are calculated at order level
        });
      }
      
      console.log('[PaymentIntent] Creating Payment Intent for order:', order.id);
      console.log('[PaymentIntent] Stripe available:', !!stripe);
      
      if (!stripe) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Stripe not configured - embedded checkout requires Stripe' 
        });
      }
      
      // Create Payment Intent for embedded checkout
      const paymentIntent = await StripeService.createPaymentIntent(
        tierData,
        event,
        organizer,
        order
      );
      
      if (!paymentIntent) {
        throw new Error('Failed to create Payment Intent');
      }
      
      // Update order with Payment Intent ID
      await ticketsStorage.updateOrder(order.id, {
        stripePaymentIntentId: paymentIntent.id
      });
      
      res.json({
        ok: true,
        orderId: order.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
      
    } catch (error: any) {
      console.error('[PaymentIntent] Error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Payment Intent creation failed' });
    }
  });

  // ============ ORDER RETRIEVAL ============
  
  // Get order details by ID or checkout session ID
  app.get('/api/tickets/orders/:identifier', requireTicketing, async (req: Request, res: Response) => {
    try {
      const { identifier } = req.params;
      console.log('[Orders] Getting order by identifier:', identifier);
      
      let order;
      
      // Check if it's a UUID (order ID) or checkout session ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(identifier)) {
        // It's a UUID - fetch by order ID
        order = await ticketsStorage.getOrderById(identifier);
      } else if (identifier.startsWith('cs_')) {
        // It's a Stripe checkout session ID
        order = await ticketsStorage.getOrderByCheckoutSession(identifier);
      } else {
        // Try as order ID anyway
        order = await ticketsStorage.getOrderById(identifier);
      }
      
      if (!order) {
        console.log('[Orders] Order not found for identifier:', identifier);
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      console.log('[Orders] Found order:', order.id, 'status:', order.status);
      
      // Only return completed orders
      if (order.status !== 'paid') {
        console.log('[Orders] Order not yet paid, status:', order.status);
        return res.status(404).json({ ok: false, error: 'Order not completed' });
      }
      
      // Get event details
      const event = await ticketsStorage.getEventById(order.eventId);
      if (!event) {
        console.log('[Orders] Event not found for order:', order.id);
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      // Get organizer details
      let organizer = null;
      if (event.organizerId) {
        organizer = await ticketsStorage.getOrganizerById(event.organizerId);
      }
      
      // Get order items with ticket details
      const orderItems = await ticketsStorage.getOrderItems(order.id);
      const tickets = [];
      
      for (const item of orderItems) {
        const tier = await ticketsStorage.getTierById(item.tierId);
        const itemTickets = await ticketsStorage.getTicketsByOrderItem(item.id);
        
        for (const ticket of itemTickets) {
          tickets.push({
            id: ticket.id,
            tierId: ticket.tierId,
            tierName: tier?.name || 'Unknown Tier',
            serial: ticket.serial,
            qrToken: ticket.qrToken,
            status: ticket.status
          });
        }
      }
      
      // Convert to camelCase for frontend
      const camelCaseOrder = toCamelCase({
        ...order,
        tickets,
        event: {
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          venue: event.venue,
          address: event.address,
          city: event.city,
          province: event.province,
          coverUrl: event.coverUrl
        },
        organizer: organizer ? {
          businessName: organizer.businessName
        } : null
      });
      
      res.json({ 
        ok: true, 
        order: camelCaseOrder
      });
      
    } catch (error) {
      console.error('[Orders] Error fetching order:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch order' });
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
              await handlePaymentIntentSucceeded(event.data.object as any);
              await ticketsStorage.markWebhookProcessed(webhookId);
              break;
              
            case 'payment_intent.payment_failed':
              await handlePaymentIntentFailed(event.data.object as any);
              await ticketsStorage.markWebhookProcessed(webhookId);
              break;
            
            case 'charge.succeeded':
              await handleChargeSucceeded(event.data.object as any);
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

  // ============ TEST ENDPOINTS (Development Only) ============
  
  // Test endpoint to simulate successful payment - only for development/testing
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/tickets/test/simulate-payment/:orderId', requireTicketing, async (req: Request, res: Response) => {
      try {
        const { orderId } = req.params;
        
        // Get the order  
        const order = await ticketsStorage.getOrderById(orderId);
        if (!order) {
          return res.status(404).json({ ok: false, error: 'Order not found' });
        }
        
        if (order.status !== 'pending') {
          return res.status(400).json({ ok: false, error: 'Order is not in pending status' });
        }
        
        // Check for payment intent ID (could be snake_case or camelCase)
        const paymentIntentId = order.stripePaymentIntentId || (order as any).stripe_payment_intent_id;
        if (!paymentIntentId) {
          return res.status(400).json({ ok: false, error: 'Order missing payment intent ID' });
        }
        
        // Simulate successful payment intent
        const mockPaymentIntent = {
          id: paymentIntentId,
          status: 'succeeded',
          amount: order.totalCents,
          currency: 'cad'
        };
        
        // Process using the same webhook handler
        console.log(`[Test] Simulating successful payment for order: ${orderId}`);
        console.log(`[Test] Mock PaymentIntent:`, mockPaymentIntent);
        
        try {
          await handlePaymentIntentSucceeded(mockPaymentIntent);
          console.log(`[Test] handlePaymentIntentSucceeded completed successfully`);
        } catch (handlerError: any) {
          console.error('[Test] handlePaymentIntentSucceeded failed:', handlerError);
          throw handlerError;
        }
        
        // Get updated order
        const updatedOrder = await ticketsStorage.getOrderById(orderId);
        console.log(`[Test] Updated order status: ${updatedOrder?.status}`);
        
        res.json({ 
          ok: true, 
          message: 'Payment simulated successfully',
          order: updatedOrder
        });
        
      } catch (error: any) {
        console.error('Test payment simulation error details:', {
          message: error?.message || 'Unknown error',
          stack: error?.stack || 'No stack trace',
          orderId
        });
        res.status(500).json({ 
          ok: false, 
          error: 'Failed to simulate payment',
          details: error?.message || 'Unknown error occurred'
        });
      }
    });
  }

  // ============ ORGANIZER ENDPOINTS ============
  
  // Test endpoint to debug database connection
  app.get('/api/tickets/debug/test-connection', requireTicketing, async (req: Request, res: Response) => {
    try {
      console.log('[TEST] Testing Supabase connection...');
      
      // Test basic query first
      const result = await ticketsStorage.getOrganizerById('test-id');
      console.log('[TEST] Basic query result:', result);
      
      // Test user_id query directly
      const testUserId = 'test-user-123';
      const orgByUserId = await ticketsStorage.getOrganizerByUserId(testUserId);
      console.log('[TEST] getOrganizerByUserId result:', orgByUserId);
      
      res.json({ 
        ok: true, 
        message: 'Connection test completed', 
        testResults: {
          basicQuery: result ? 'found' : 'not found',
          userIdQuery: orgByUserId ? 'found' : 'not found'
        }
      });
    } catch (error) {
      console.error('[TEST] Connection test error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Connection test failed',
        details: error
      });
    }
  });
  
  // Create organizer account (MoR model - simplified signup)
  app.post('/api/tickets/organizers/signup', requireTicketing, async (req: Request & { session?: any }, res: Response) => {
    try {
      const validated = organizerSignupSchema.parse(req.body);
      const { name, email, payoutMethod, payoutEmail } = validated;
      
      // Get userId from session - for now we'll create a test user ID since we don't have auth yet
      const userId = req.session?.userId || 'test-user-1';
      console.log('[MoR Signup] Using userId:', userId);
      
      // Check if organizer already exists
      let organizer;
      try {
        organizer = await ticketsStorage.getOrganizerByUserId(userId);
        console.log('[MoR Signup] Found existing organizer:', organizer ? 'YES' : 'NO');
      } catch (dbError) {
        console.error('[MoR Signup] Database error in getOrganizerByUserId:', dbError);
        throw dbError;
      }
      
      if (!organizer) {
        // Create new organizer - MoR model: active immediately, no KYC needed
        console.log('[MoR Signup] Creating new organizer...');
        organizer = await ticketsStorage.createOrganizer({
          userId,
          businessName: name, // Use name as business name for compatibility
          businessEmail: email, // Use email as business email for compatibility
          email: email, // Required for MoR payouts
          status: 'active', // MoR model: active immediately
          payoutMethod: payoutMethod || 'etransfer', // User preference or default
          payoutEmail: payoutEmail || email, // User preference or primary email
          legalName: name // Use the provided name as legal name
        });
        console.log('[MoR Signup] Organizer created with ID:', organizer.id);
      } else {
        // Existing organizer found - ensure they're active for MoR model
        console.log('[MoR Signup] Found existing organizer, ensuring active status...');
        console.log('[MoR Signup] Current organizer status:', organizer.status);
        if (organizer.status !== 'active') {
          console.log('[MoR Signup] Status is not active, updating to active...');
          organizer = await ticketsStorage.updateOrganizer(organizer.id, { status: 'active' });
          console.log('[MoR Signup] Updated organizer status to active:', organizer.status);
        } else {
          console.log('[MoR Signup] Organizer already active, no update needed');
        }
      }
      
      // MoR Model: No Stripe Connect onboarding needed
      // Organizer can start creating events immediately
      req.session = req.session || {};
      req.session.organizerId = organizer.id;
      
      res.json({ 
        ok: true, 
        organizerId: organizer.id,
        message: 'Account created successfully! You can start creating events immediately.',
        status: 'active'
      });
      
    } catch (error) {
      console.error('Organizer signup error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create organizer account' });
    }
  });

  // Get organizer info
  // Get current user's organizer profile (or null if not set up yet)
  app.get('/api/tickets/organizers/me', requireTicketing, async (req: Request, res: Response) => {
    try {
      console.log('[Ticketing] GET /api/tickets/organizers/me - Session:', {
        hasSession: !!req.session,
        userId: req.session?.userId,
        sessionID: req.sessionID
      });
      
      // Check if user is logged in
      if (!req.session?.userId) {
        // Return success with null organizer instead of 401
        // This allows the UI to show "Enable Ticketing" button
        console.log('[Ticketing] No userId in session - returning null organizer');
        return res.json({ ok: true, organizer: null, events: [] });
      }
      
      // Try to find organizer by userId
      const organizer = await ticketsStorage.getOrganizerByUserId(req.session.userId);
      
      // If no organizer exists yet, return null (not an error - they haven't enabled ticketing yet)
      if (!organizer) {
        return res.json({ ok: true, organizer: null, events: [] });
      }
      
      const events = await ticketsStorage.getEventsByOrganizer(organizer.id);
      
      console.log('[DEBUG] Events before toCamelCase:', events.length > 0 ? JSON.stringify(events[0], null, 2).slice(0, 300) : 'No events');
      
      // Convert events and organizer to camelCase for frontend consistency
      const camelCaseEvents = toCamelCase(events);
      const camelCaseOrganizer = toCamelCase(organizer);
      
      console.log('[DEBUG] Events after toCamelCase:', camelCaseEvents.length > 0 ? JSON.stringify(camelCaseEvents[0], null, 2).slice(0, 300) : 'No events');
      
      res.json({ ok: true, organizer: camelCaseOrganizer, events: camelCaseEvents });
    } catch (error) {
      console.error('Get organizer error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch organizer info' });
    }
  });

  // Get revenue summary for MoR model
  app.get('/api/tickets/organizers/revenue-summary', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const summary = await ticketsStorage.getOrganizerRevenueSummary(organizer.id);
      
      res.json({ ok: true, summary });
    } catch (error) {
      console.error('Get revenue summary error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch revenue summary' });
    }
  });

  // Update organizer payout settings for MoR model
  app.patch('/api/tickets/organizers/settings', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const { payoutMethod, payoutEmail } = req.body;
      
      // Validate input
      if (!payoutMethod || !payoutEmail) {
        return res.status(400).json({ ok: false, error: 'Payout method and email are required' });
      }
      
      if (!['etransfer', 'paypal', 'manual'].includes(payoutMethod)) {
        return res.status(400).json({ ok: false, error: 'Invalid payout method' });
      }
      
      // Update organizer payout settings
      await ticketsStorage.updateOrganizerPayoutSettings(organizer.id, {
        payoutMethod,
        payoutEmail
      });
      
      res.json({ ok: true, message: 'Payout settings updated successfully' });
    } catch (error) {
      console.error('Update payout settings error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update payout settings' });
    }
  });

  // Get organizer balance (MoR)
  app.get('/api/tickets/organizers/:id/balance', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const requestedId = req.params.id;
      
      console.log('[DEBUG] Balance endpoint - organizer.id:', JSON.stringify(organizer.id), 'type:', typeof organizer.id);
      console.log('[DEBUG] Balance endpoint - requestedId:', JSON.stringify(requestedId), 'type:', typeof requestedId);
      console.log('[DEBUG] Balance endpoint - comparison result:', organizer.id === requestedId);
      
      // Ensure organizer can only access their own balance
      if (organizer.id !== requestedId) {
        console.log('[DEBUG] Balance endpoint - Access denied due to ID mismatch');
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      const balance = await ticketsStorage.getOrganizerBalance(organizer.id);
      res.json({ ok: true, balance: balance || 0 });
    } catch (error) {
      console.error('Get organizer balance error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch balance' });
    }
  });

  // Get organizer payouts (MoR)
  app.get('/api/tickets/organizers/:id/payouts', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const requestedId = req.params.id;
      
      console.log('[DEBUG] Payouts endpoint - organizer.id:', JSON.stringify(organizer.id), 'type:', typeof organizer.id);
      console.log('[DEBUG] Payouts endpoint - requestedId:', JSON.stringify(requestedId), 'type:', typeof requestedId);
      console.log('[DEBUG] Payouts endpoint - comparison result:', organizer.id === requestedId);
      
      // Ensure organizer can only access their own payouts
      if (organizer.id !== requestedId) {
        console.log('[DEBUG] Payouts endpoint - Access denied due to ID mismatch');
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
      
      const payouts = await ticketsStorage.getPayoutsByOrganizer(organizer.id);
      res.json({ ok: true, payouts: payouts || [] });
    } catch (error) {
      console.error('Get organizer payouts error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch payouts' });
    }
  });

  // Create event
  app.post('/api/tickets/events', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const validated = createEventSchema.parse(req.body);
      
      // Generate slug from title with uniqueness retry
      const baseSlug = validated.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let event = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!event && attempts < maxAttempts) {
        attempts++;
        const suffix = Math.random().toString(36).substring(2, 8);
        const slug = `${baseSlug}-${suffix}`;
        
        const eventData: InsertTicketsEvent = {
          ...validated,
          organizerId: organizer.id,
          slug: slug,
          status: validated.status || 'draft'
        };
        
        try {
          event = await ticketsStorage.createEvent(eventData);
        } catch (error: any) {
          // If slug conflict, retry with new suffix
          if (error.code === '23505' && error.detail?.includes('slug')) {
            if (attempts >= maxAttempts) {
              throw new Error('Failed to generate unique slug after multiple attempts');
            }
            continue;
          }
          throw error;
        }
      }
      
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
      
      // Extract tiers from body before validation
      const { tiers, ...eventData } = req.body;
      
      const validated = updateEventSchema.parse(eventData);
      const updated = await ticketsStorage.updateEvent(req.params.id, validated);
      
      // Handle tiers update if provided
      if (tiers && Array.isArray(tiers)) {
        // Get existing tiers
        const existingTiers = await ticketsStorage.getTiersByEvent(req.params.id);
        const existingTierIds = existingTiers.map(t => t.id);
        
        // Process each tier
        for (const tier of tiers) {
          if (tier.id && existingTierIds.includes(tier.id)) {
            // Update existing tier
            const { id, tempId, soldCount, ...tierData } = tier;
            await ticketsStorage.updateTier(id, tierData);
          } else if (!tier.id || tier.tempId) {
            // Create new tier
            const { id, tempId, soldCount, ...tierData } = tier;
            const newTierData: InsertTicketsTier = {
              ...tierData,
              eventId: req.params.id
            };
            await ticketsStorage.createTier(newTierData);
          }
        }
        
        // Delete tiers that are no longer in the list
        const updatedTierIds = tiers.filter(t => t.id).map(t => t.id);
        for (const existingTier of existingTiers) {
          if (!updatedTierIds.includes(existingTier.id)) {
            // Only delete if no tickets sold
            if (!existingTier.soldCount || existingTier.soldCount === 0) {
              await ticketsStorage.deleteTier(existingTier.id);
            }
          }
        }
      }
      
      // Return updated event with tiers
      const updatedTiers = await ticketsStorage.getTiersByEvent(req.params.id);
      const eventWithTiers = { ...updated, tiers: updatedTiers };
      
      res.json({ ok: true, event: toCamelCase(eventWithTiers) });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update event' });
    }
  });

  // Duplicate event
  app.post('/api/tickets/events/:eventId/duplicate', requireTicketing, requireOrganizer, async (req: Request, res: Response) => {
    try {
      const organizer = (req as any).organizer;
      const eventId = req.params.eventId;
      
      console.log(`[Duplicate] Starting duplicate for eventId: ${eventId}, organizerId: ${organizer.id}`);
      
      const rawEvent = await ticketsStorage.getEventById(eventId);
      console.log(`[Duplicate] Raw event lookup result:`, rawEvent ? `Found event with organizer_id: ${(rawEvent as any).organizer_id}` : 'Event not found');
      
      // Apply toCamelCase transformation like other endpoints
      const originalEvent = rawEvent ? toCamelCase(rawEvent) : null;
      console.log(`[Duplicate] After toCamelCase:`, originalEvent ? `Event with organizerId: ${originalEvent.organizerId}` : 'Event not found');
      
      if (!originalEvent) {
        console.log(`[Duplicate] Event ${eventId} not found in database`);
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      if (originalEvent.organizerId !== organizer.id) {
        console.log(`[Duplicate] Organizer ownership mismatch - event organizer: ${originalEvent.organizerId}, requesting organizer: ${organizer.id}`);
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      // Generate new slug from original title with uniqueness retry
      const baseSlug = originalEvent.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let duplicatedEvent = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!duplicatedEvent && attempts < maxAttempts) {
        attempts++;
        const suffix = Math.random().toString(36).substring(2, 8);
        const slug = `${baseSlug}-copy-${suffix}`;
        
        const eventData: InsertTicketsEvent = {
          title: `${originalEvent.title} (Copy)`,
          summary: originalEvent.summary,
          description: originalEvent.description,
          venue: originalEvent.venue,
          city: originalEvent.city,
          province: originalEvent.province,
          startAt: originalEvent.startAt,
          endAt: originalEvent.endAt,
          organizerId: organizer.id,
          slug: slug,
          status: 'draft' // Always create duplicates as drafts
        };
        
        try {
          duplicatedEvent = await ticketsStorage.createEvent(eventData);
        } catch (error: any) {
          // If slug conflict, retry with new suffix
          if (error.code === '23505' && error.detail?.includes('slug')) {
            if (attempts >= maxAttempts) {
              throw new Error('Failed to generate unique slug after multiple attempts');
            }
            continue;
          }
          throw error;
        }
      }
      
      // Also duplicate the tiers
      const originalTiers = await ticketsStorage.getTiersByEvent(originalEvent.id);
      for (const tier of originalTiers) {
        const tierData: InsertTicketsTier = {
          name: tier.name,
          priceCents: tier.priceCents,
          currency: tier.currency,
          capacity: tier.capacity,
          maxPerOrder: tier.maxPerOrder,
          salesStartAt: tier.salesStartAt,
          salesEndAt: tier.salesEndAt,
          visibility: tier.visibility,
          sortOrder: tier.sortOrder,
          eventId: duplicatedEvent.id
        };
        await ticketsStorage.createTier(tierData);
      }
      
      res.json({ ok: true, event: duplicatedEvent });
    } catch (error) {
      console.error('Duplicate event error:', error);
      res.status(500).json({ ok: false, error: 'Failed to duplicate event' });
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
      console.log('Fetching order:', req.params.orderId);
      const order = await ticketsStorage.getOrderById(req.params.orderId);
      if (!order) {
        console.log('Order not found:', req.params.orderId);
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      console.log('Found order:', order);
      
      // TODO: Validate ownership
      
      console.log('Fetching order items for order:', order.id);
      const items = await ticketsStorage.getOrderItems(order.id);
      console.log('Found order items:', items);
      
      console.log('Fetching tickets for order items...');
      const tickets = await Promise.all(
        items.map(item => ticketsStorage.getTicketsByOrderItem(item.id))
      );
      console.log('Found tickets:', tickets);
      
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
    
    console.log(`[MoR Webhook] Processing checkout completion for order: ${metadata.orderId}`);
    
    // Get the order to calculate financial data
    const order = await ticketsStorage.getOrderById(metadata.orderId);
    if (!order) {
      console.error(`[MoR Webhook] Order not found: ${metadata.orderId}`);
      return;
    }
    
    // MoR Model: Defer financial tracking to charge.succeeded webhook for accuracy
    // This handler focuses on order status and ticket creation
    console.log(`[MoR Webhook] Marking order as paid, charge.succeeded will handle fees`);
    
    // Update order status only - financial data will come from charge.succeeded
    await ticketsStorage.updateOrder(metadata.orderId, {
      status: 'paid',
      stripePaymentIntentId: session.payment_intent,
      placedAt: new Date()
    });
    
    // Note: Ledger entry will be created by charge.succeeded handler with accurate fees
    
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
      
      // Tickets will be created by createTicketsForPaidOrder function
    }
    
    // Create tickets and send confirmation email
    await createTicketsForPaidOrder(metadata.orderId);
    
    // Log audit (financial data will be logged by charge.succeeded)
    await ticketsStorage.createAudit({
      actorType: 'system',
      actorId: 'stripe',
      action: 'order_completed',
      targetType: 'order',
      targetId: metadata.orderId,
      metaJson: { 
        sessionId: session.id,
        note: 'Financial tracking deferred to charge.succeeded webhook'
      }
    });
    
    console.log(`[MoR Webhook] Successfully processed checkout completion for order: ${metadata.orderId}`);
    
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    throw error;
  }
}

// Helper function to handle charge succeeded (most reliable fee tracking)
async function handleChargeSucceeded(charge: any) {
  try {
    console.log(`[MoR Webhook] Processing charge succeeded: ${charge.id}`);
    
    // Find order by payment intent ID
    const order = await ticketsStorage.getOrderByPaymentIntent(charge.payment_intent);
    if (!order) {
      console.warn(`[MoR Webhook] No order found for payment intent: ${charge.payment_intent}`);
      return;
    }
    
    // Robust idempotency check: if already processed by this charge OR has ledger entry
    if (order.stripeChargeId === charge.id) {
      console.log(`[MoR Webhook] Order ${order.id} already processed for charge ${charge.id}, skipping`);
      return;
    }
    
    // Additional safety: check for existing ledger entry (prevents double-creation)
    const event = await ticketsStorage.getEventById(order.eventId);
    if (event?.organizerId) {
      const existingLedger = await ticketsStorage.getLedgerEntryByOrderId(order.id);
      if (existingLedger && order.stripeChargeId) {
        console.log(`[MoR Webhook] Order ${order.id} already has ledger entry and charge data, skipping`);
        return;
      }
    }
    
    // Get actual Stripe fees from charge (most reliable source)
    let stripeFeeCents = 0;
    let feeStatus = 'actual';
    
    if (charge.balance_transaction) {
      try {
        const balanceTransaction = await stripe!.balanceTransactions.retrieve(charge.balance_transaction);
        stripeFeeCents = balanceTransaction.fee;
        console.log(`[MoR Webhook] Retrieved precise fees - Stripe: ${stripeFeeCents}¢`);
      } catch (error) {
        console.error('[MoR Webhook] Error fetching balance transaction:', error);
        // Fallback to estimating fees (approximately 2.9% + 30¢)
        stripeFeeCents = Math.round(charge.amount * 0.029 + 30);
        feeStatus = 'estimated';
        console.log(`[MoR Webhook] Using estimated fees - Stripe: ${stripeFeeCents}¢ (${feeStatus})`);
      }
    } else {
      // No balance transaction yet, estimate fees
      stripeFeeCents = Math.round(charge.amount * 0.029 + 30);
      feeStatus = 'estimated';
      console.log(`[MoR Webhook] No balance transaction, using estimated fees - Stripe: ${stripeFeeCents}¢ (${feeStatus})`);
    }
    
    // Calculate net amount for organizer (MoR model: use subtotal, not Stripe net)
    // Organizer gets: subtotal - platform fee (taxes excluded from payout)
    const netToOrganizerCents = Math.max(0, order.subtotalCents - order.feesCents);
    
    console.log(`[MoR Webhook] Financial tracking - Subtotal: ${order.subtotalCents}¢, Stripe: ${stripeFeeCents}¢, Platform: ${order.feesCents}¢, Net to Organizer: ${netToOrganizerCents}¢`);
    
    // Atomic operation: Update order and create ledger entry together
    try {
      // Update order with authoritative financial data
      await ticketsStorage.updateOrder(order.id, {
        stripeChargeId: charge.id,
        stripeFeeCents,
        platformFeeCents: order.feesCents,
        netToOrganizerCents,
        payoutStatus: 'pending'
      });
      
      // Create ledger entry if organizer exists (this should be atomic with order update)
      if (event?.organizerId) {
        const existingLedger = await ticketsStorage.getLedgerEntryByOrderId(order.id);
        if (!existingLedger) {
          await ticketsStorage.createLedgerEntry({
            organizerId: event.organizerId,
            orderId: order.id,
            type: 'sale',
            description: `Ticket sale - Order ${order.id}`,
            amountCents: netToOrganizerCents,
            status: 'pending'
          });
          console.log(`[MoR Webhook] Created ledger entry for organizer ${event.organizerId}`);
        } else {
          console.log(`[MoR Webhook] Ledger entry already exists for order ${order.id}`);
        }
      }
    } catch (error) {
      console.error(`[MoR Webhook] Error in atomic financial update for order ${order.id}:`, error);
      throw error;
    }
    
    // Log audit with complete financial data
    await ticketsStorage.createAudit({
      actorType: 'system',
      actorId: 'stripe',
      action: 'charge_succeeded',
      targetType: 'order',
      targetId: order.id,
      metaJson: { 
        chargeId: charge.id,
        stripeFeeCents,
        platformFeeCents: order.feesCents,
        netToOrganizerCents,
        subtotalCents: order.subtotalCents
      }
    });
    
    console.log(`[MoR Webhook] Successfully processed charge for order: ${order.id}`);
    
  } catch (error) {
    console.error('Error handling charge succeeded:', error);
    throw error;
  }
}

// Helper function to handle refunds
async function handleRefund(charge: any) {
  try {
    console.log(`[MoR Webhook] Processing refund for charge: ${charge.id}`);
    
    // Find order by charge ID
    const order = await ticketsStorage.getOrderByChargeId(charge.id);
    if (!order) {
      console.warn(`[MoR Webhook] No order found for charge: ${charge.id}`);
      return;
    }
    
    const refundAmountCents = charge.amount_refunded;
    console.log(`[MoR Webhook] Refunding ${refundAmountCents}¢ for order: ${order.id}`);
    
    // Calculate net refund to organizer (refund amount minus proportional platform fee)
    const refundRatio = refundAmountCents / order.totalCents;
    const platformFeeRefundCents = Math.round(order.platformFeeCents * refundRatio);
    const organizerRefundCents = refundAmountCents - platformFeeRefundCents;
    
    // Update order with refund data
    await ticketsStorage.updateOrder(order.id, {
      status: refundAmountCents >= order.totalCents ? 'refunded' : 'partially_refunded',
      refundAmountCents: refundAmountCents,
      refundedAt: new Date()
    });
    
    // Create negative ledger entry for the refund
    const event = await ticketsStorage.getEventById(order.eventId);
    if (event?.organizerId) {
      await ticketsStorage.createLedgerEntry({
        organizerId: event.organizerId,
        orderId: order.id,
        type: 'refund',
        description: `Refund - Order ${order.id}`,
        amountCents: -organizerRefundCents, // Negative amount for refund
        status: 'completed'
      });
    }
    
    // Update ticket statuses for full refund
    if (refundAmountCents >= order.totalCents) {
      const tickets = await ticketsStorage.getTicketsByOrderId(order.id);
      for (const ticket of tickets) {
        await ticketsStorage.updateTicket(ticket.id, { status: 'refunded' });
      }
    }
    
    // Log audit
    await ticketsStorage.createAudit({
      actorType: 'system',
      actorId: 'stripe',
      action: 'refund_processed',
      targetType: 'charge',
      targetId: charge.id,
      metaJson: { 
        amount: refundAmountCents,
        orderId: order.id,
        organizerRefundCents,
        platformFeeRefundCents
      }
    });
    
    console.log(`[MoR Webhook] Successfully processed refund for order: ${order.id}`);
    
  } catch (error) {
    console.error('Error handling refund:', error);
    throw error;
  }
}

// Helper function to handle Payment Intent succeeded (for embedded checkout)
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    console.log(`[MoR Webhook] Processing Payment Intent succeeded: ${paymentIntent.id}`);
    
    // Find order by Payment Intent ID
    const order = await ticketsStorage.getOrderByPaymentIntent(paymentIntent.id);
    if (!order) {
      console.warn(`[MoR Webhook] No order found for Payment Intent: ${paymentIntent.id}`);
      return;
    }

    // Check if already processed (idempotency)
    if (order.status === 'paid') {
      console.log(`[MoR Webhook] Order ${order.id} already marked as paid, skipping`);
      return;
    }

    // MoR Model: Defer financial tracking to charge.succeeded webhook for accuracy
    // This handler focuses on order status and ticket creation
    console.log(`[MoR Webhook] Marking order as paid, charge.succeeded will handle fees`);
    
    // Update order status only - financial data will come from charge.succeeded
    await ticketsStorage.updateOrder(order.id, {
      status: 'paid',
      stripePaymentIntentId: paymentIntent.id,
      placedAt: new Date()
    });
    
    // Note: Ledger entry will be created by charge.succeeded handler with accurate fees
    
    // Create individual tickets for the order
    await createTicketsForPaidOrder(order.id);
    
    console.log(`[MoR Webhook] Successfully processed Payment Intent for order: ${order.id}`);
  } catch (error) {
    console.error('Error handling Payment Intent succeeded:', error);
    throw error;
  }
}

// Helper function to handle Payment Intent failed
async function handlePaymentIntentFailed(paymentIntent: any) {
  try {
    console.log(`[Webhook] Processing Payment Intent failed: ${paymentIntent.id}`);
    
    // Find order and mark as failed
    const order = await ticketsStorage.getOrderByPaymentIntent(paymentIntent.id);
    if (order && order.status !== 'failed') {
      await ticketsStorage.updateOrder(order.id, { status: 'failed' });
      console.log(`[Webhook] Marked order ${order.id} as failed`);
    }
  } catch (error) {
    console.error('Error handling Payment Intent failed:', error);
    throw error;
  }

  // ============ MY TICKETS ENDPOINTS ============
  
  // Get all tickets for logged-in user
  app.get('/api/tickets/my-tickets', requireTicketing, async (req: Request & { session?: any }, res: Response) => {
    try {
      // Get user ID from session
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'Authentication required' });
      }
      
      // Get all orders for user (both by userId and by email)
      const user = await ticketsStorage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }
      
      // Get orders by both userId and email
      const ordersByUser = await ticketsStorage.getOrdersByUserId(userId);
      const ordersByEmail = await ticketsStorage.getOrdersByBuyer(user.email);
      
      // Combine and deduplicate orders
      const orderMap = new Map();
      [...ordersByUser, ...ordersByEmail].forEach(order => {
        if (order.status === 'paid') {
          orderMap.set(order.id, order);
        }
      });
      
      const orders = Array.from(orderMap.values());
      
      // Get all tickets with event and tier details
      const ticketsData = [];
      const now = new Date();
      
      for (const order of orders) {
        const event = await ticketsStorage.getEventById(order.eventId);
        if (!event) continue;
        
        const orderItems = await ticketsStorage.getOrderItems(order.id);
        
        for (const item of orderItems) {
          const tier = await ticketsStorage.getTierById(item.tierId);
          const tickets = await ticketsStorage.getTicketsByOrderItem(item.id);
          
          for (const ticket of tickets) {
            ticketsData.push({
              ticket: toCamelCase(ticket),
              tier: toCamelCase(tier),
              event: toCamelCase(event),
              order: toCamelCase({
                id: order.id,
                buyerEmail: order.buyerEmail,
                buyerName: order.buyerName,
                totalCents: order.totalCents,
                currency: order.currency,
                placedAt: order.placedAt
              }),
              isUpcoming: new Date(event.startAt) > now
            });
          }
        }
      }
      
      // Sort by event date
      ticketsData.sort((a, b) => {
        return new Date(b.event.startAt).getTime() - new Date(a.event.startAt).getTime();
      });
      
      // Group by upcoming vs past
      const upcoming = ticketsData.filter(t => t.isUpcoming);
      const past = ticketsData.filter(t => !t.isUpcoming);
      
      res.json({ 
        ok: true, 
        tickets: {
          upcoming,
          past,
          total: ticketsData.length
        }
      });
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch tickets' });
    }
  });
  
  // Get single ticket details
  app.get('/api/tickets/:ticketId', requireTicketing, async (req: Request & { session?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.session?.userId;
      
      // Get ticket
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      // Get order item and order to verify ownership
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      if (!orderItem) {
        return res.status(404).json({ ok: false, error: 'Order information not found' });
      }
      
      const order = await ticketsStorage.getOrderById(orderItem.orderId);
      if (!order) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // Verify ownership (if logged in)
      if (userId) {
        const user = await ticketsStorage.getUserById(userId);
        if (user && order.buyerEmail !== user.email && order.userId !== userId) {
          return res.status(403).json({ ok: false, error: 'Access denied' });
        }
      }
      
      // Get event and tier details
      const tier = await ticketsStorage.getTierById(ticket.tierId);
      const event = await ticketsStorage.getEventById(order.eventId);
      
      if (!tier || !event) {
        return res.status(404).json({ ok: false, error: 'Event information not found' });
      }
      
      // Get organizer details
      let organizer = null;
      if (event.organizerId) {
        organizer = await ticketsStorage.getOrganizerById(event.organizerId);
      }
      
      res.json({
        ok: true,
        ticket: toCamelCase(ticket),
        tier: toCamelCase(tier),
        event: toCamelCase(event),
        order: toCamelCase({
          id: order.id,
          buyerEmail: order.buyerEmail,
          buyerName: order.buyerName,
          totalCents: order.totalCents,
          currency: order.currency,
          placedAt: order.placedAt
        }),
        organizer: organizer ? {
          businessName: organizer.businessName
        } : null
      });
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch ticket details' });
    }
  });
  
  // Resend ticket email
  app.post('/api/tickets/:ticketId/resend', requireTicketing, async (req: Request & { session?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.session?.userId;
      
      // Get ticket and order
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      const order = orderItem ? await ticketsStorage.getOrderById(orderItem.orderId) : null;
      
      if (!order) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // Verify ownership
      if (userId) {
        const user = await ticketsStorage.getUserById(userId);
        if (user && order.buyerEmail !== user.email && order.userId !== userId) {
          return res.status(403).json({ ok: false, error: 'Access denied' });
        }
      }
      
      // Import and use email service
      const { sendTicketEmail } = await import('./email-service');
      const emailSent = await sendTicketEmail(order.id, true);
      
      if (!emailSent) {
        return res.status(500).json({ ok: false, error: 'Failed to send email' });
      }
      
      res.json({ ok: true, message: 'Ticket email resent successfully' });
    } catch (error) {
      console.error('Error resending ticket email:', error);
      res.status(500).json({ ok: false, error: 'Failed to resend email' });
    }
  });
  
  // Guest ticket lookup
  app.post('/api/tickets/lookup', requireTicketing, async (req: Request, res: Response) => {
    try {
      const { email, orderId } = req.body;
      
      if (!email || !orderId) {
        return res.status(400).json({ ok: false, error: 'Email and order ID are required' });
      }
      
      // Get order
      const order = await ticketsStorage.getOrderById(orderId);
      if (!order || order.buyerEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ ok: false, error: 'Order not found or email does not match' });
      }
      
      if (order.status !== 'paid') {
        return res.status(400).json({ ok: false, error: 'Order is not completed' });
      }
      
      // Get event
      const event = await ticketsStorage.getEventById(order.eventId);
      if (!event) {
        return res.status(404).json({ ok: false, error: 'Event not found' });
      }
      
      // Get tickets
      const orderItems = await ticketsStorage.getOrderItems(order.id);
      const tickets = [];
      
      for (const item of orderItems) {
        const tier = await ticketsStorage.getTierById(item.tierId);
        const itemTickets = await ticketsStorage.getTicketsByOrderItem(item.id);
        
        for (const ticket of itemTickets) {
          tickets.push({
            ticket: toCamelCase(ticket),
            tier: toCamelCase(tier)
          });
        }
      }
      
      res.json({
        ok: true,
        order: toCamelCase({
          id: order.id,
          buyerEmail: order.buyerEmail,
          buyerName: order.buyerName,
          totalCents: order.totalCents,
          currency: order.currency,
          placedAt: order.placedAt
        }),
        event: toCamelCase(event),
        tickets
      });
    } catch (error) {
      console.error('Error looking up tickets:', error);
      res.status(500).json({ ok: false, error: 'Failed to lookup tickets' });
    }
  });
  
  // Download ticket as HTML
  app.get('/api/tickets/:ticketId/download', requireTicketing, async (req: Request & { session?: any }, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.session?.userId;
      
      // Get ticket
      const ticket = await ticketsStorage.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket not found' });
      }
      
      // Get order to verify ownership
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      const order = orderItem ? await ticketsStorage.getOrderById(orderItem.orderId) : null;
      
      if (!order) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }
      
      // Verify ownership if logged in
      if (userId) {
        const user = await ticketsStorage.getUserById(userId);
        if (user && order.buyerEmail !== user.email && order.userId !== userId) {
          return res.status(403).json({ ok: false, error: 'Access denied' });
        }
      }
      
      // Get event and tier
      const tier = await ticketsStorage.getTierById(ticket.tierId);
      const event = await ticketsStorage.getEventById(order.eventId);
      
      if (!tier || !event) {
        return res.status(404).json({ ok: false, error: 'Event information not found' });
      }
      
      // Generate QR code
      const qrDataURL = await QRCode.toDataURL(JSON.stringify({
        ticketId: ticket.id,
        token: ticket.qrToken,
        verifyUrl: `${process.env.VITE_BASE_URL || 'https://thehouseofjugnu.com'}/api/tickets/validate?token=${ticket.qrToken}`
      }), {
        errorCorrectionLevel: 'M',
        width: 400,
        margin: 2
      });
      
      // Generate HTML ticket
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket - ${event.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .ticket {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    .qr-code {
      text-align: center;
      padding: 30px;
      background: #f9fafb;
      border-radius: 8px;
      margin: 20px 0;
    }
    .qr-code img {
      max-width: 300px;
    }
    .details {
      margin: 20px 0;
    }
    .details h3 {
      margin: 0 0 10px;
      color: #4b5563;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .details p {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    @media print {
      body {
        background: white;
      }
      .ticket {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>${event.title}</h1>
      <p>${tier.name} • Ticket #${ticket.serial}</p>
    </div>
    <div class="content">
      <div class="qr-code">
        <img src="${qrDataURL}" alt="QR Code" />
        <p>Show this code at the venue</p>
      </div>
      <div class="details">
        <h3>Date & Time</h3>
        <p>${format(new Date(event.startAt), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
      </div>
      <div class="details">
        <h3>Venue</h3>
        <p>${event.venue || 'TBA'}, ${event.city}, ${event.province}</p>
      </div>
      <div class="details">
        <h3>Ticket Holder</h3>
        <p>${order.buyerName || order.buyerEmail}</p>
      </div>
      <div class="details">
        <h3>Order ID</h3>
        <p>${order.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
    <div class="footer">
      <p>Powered by Jugnu • thehouseofjugnu.com</p>
    </div>
  </div>
</body>
</html>
      `;
      
      // Set headers for download
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${event.slug}-${ticket.serial}.html"`);
      res.send(html);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      res.status(500).json({ ok: false, error: 'Failed to generate ticket download' });
    }
  });
  
  // QR Code validation endpoint
  app.post('/api/tickets/validate-qr', requireTicketing, async (req: Request, res: Response) => {
    try {
      const { qrToken, eventId } = req.body;
      if (!qrToken || !eventId) {
        return res.status(400).json({ ok: false, error: 'QR token and event ID are required' });
      }
      const ticket = await ticketsStorage.getTicketByQR(qrToken);
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Invalid QR code', status: 'invalid' });
      }
      const tier = await ticketsStorage.getTierById(ticket.tierId);
      const event = await ticketsStorage.getEventById(tier?.eventId || '');
      if (!tier || !event || event.id !== eventId) {
        return res.status(404).json({ ok: false, error: 'Ticket not found for this event', status: 'invalid' });
      }
      if (ticket.status !== 'valid') {
        return res.status(400).json({ ok: false, error: ticket.status === 'used' ? 'Ticket already used' : ticket.status === 'refunded' ? 'Ticket has been refunded' : 'Ticket is not valid', status: ticket.status });
      }
      const orderItem = await ticketsStorage.getOrderItemById(ticket.orderItemId);
      if (!orderItem) {
        return res.status(404).json({ ok: false, error: 'Order information not found', status: 'invalid' });
      }
      const order = await ticketsStorage.getOrderById(orderItem.orderId);
      if (!order || order.status !== 'paid') {
        return res.status(400).json({ ok: false, error: 'Order not confirmed', status: 'invalid' });
      }
      res.json({ ok: true, status: 'valid', ticket: { id: ticket.id, serial: ticket.serial, tierName: tier.name, eventTitle: event.title, buyerName: order.buyerName, buyerEmail: order.buyerEmail } });
    } catch (error: any) {
      console.error('QR validation error:', error);
      res.status(500).json({ ok: false, error: 'Validation failed' });
    }
  });

  // Mark ticket as used (check-in)
  app.post('/api/tickets/check-in', async (req: Request, res: Response) => {
    try {
      const { qrToken, eventId, checkInBy } = req.body;
      
      if (!qrToken || !eventId) {
        return res.status(400).json({ 
          ok: false, 
          error: 'QR token and event ID are required' 
        });
      }
      
      // Find and validate ticket first
      const ticket = await ticketsStorage.getTicketByQR(qrToken);
      if (!ticket || ticket.status !== 'valid') {
        return res.status(400).json({
          ok: false,
          error: 'Invalid or already used ticket'
        });
      }
      
      // Update ticket status to used
      await ticketsStorage.updateTicket(ticket.id, {
        status: 'used',
        checkedInAt: new Date(),
        checkedInBy: checkInBy || 'staff'
      });
      
      // Create audit log
      await ticketsStorage.createAudit({
        actorType: 'staff',
        actorId: checkInBy || 'unknown',
        action: 'ticket_checkin',
        targetType: 'ticket',
        targetId: ticket.id,
        metaJson: { qrToken, eventId }
      });
      
      res.json({
        ok: true,
        message: 'Ticket checked in successfully',
        ticketId: ticket.id
      });
      
    } catch (error: any) {
      console.error('Check-in error:', error);
      res.status(500).json({ ok: false, error: 'Check-in failed' });
    }
  });
}

// Helper function to create tickets for a paid order
async function createTicketsForPaidOrder(orderId: string): Promise<void> {
  console.log(`[TicketCreation] Creating tickets for paid order: ${orderId}`);
  
  // Get order items
  const orderItems = await ticketsStorage.getOrderItems(orderId);
  
  // Get order details for email
  const order = await ticketsStorage.getOrderById(orderId);
  if (!order) {
    console.error(`[TicketCreation] Order not found: ${orderId}`);
    return;
  }
  
  const event = await ticketsStorage.getEventById(order.eventId);
  if (!event) {
    console.error(`[TicketCreation] Event not found for order: ${orderId}`);
    return;
  }
  
  const createdTickets = [];
  
  for (const orderItem of orderItems) {
    // Get tier details for email
    const tier = await ticketsStorage.getTierById(orderItem.tierId);
    
    // Create individual tickets for each quantity
    for (let i = 0; i < orderItem.quantity; i++) {
      const serial = `TKT-${nanoid(10).toUpperCase()}`;
      const qrToken = nanoid(20);
      
      const ticket = await ticketsStorage.createTicket({
        orderItemId: orderItem.id,
        tierId: orderItem.tierId,
        serial,
        qrToken,
        status: 'valid'
      });
      
      createdTickets.push({
        id: ticket.id,
        tierName: tier?.name || 'General Admission',
        qrToken: ticket.qrToken,
        serial: ticket.serial
      });
    }
  }
  
  console.log(`[TicketCreation] Created ${createdTickets.length} tickets for order: ${orderId}`);
  
  // Send ticket email confirmation
  try {
    const { sendTicketEmail } = await import('../services/emailService');
    
    const emailData = {
      recipientEmail: order.buyerEmail,
      buyerName: order.buyerName || 'Guest',
      eventTitle: event.title,
      eventVenue: event.venue,
      eventDate: new Date(event.startAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      eventTime: new Date(event.startAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      tickets: createdTickets,
      totalAmount: `$${(order.totalCents / 100).toFixed(2)} CAD`,
      refundPolicy: event.refundPolicy || 'Refunds are available up to 24 hours before the event.'
    };
    
    await sendTicketEmail(emailData);
    console.log(`[TicketCreation] Sent ticket email to ${order.buyerEmail}`);
  } catch (emailError) {
    console.error('[TicketCreation] Failed to send ticket email:', emailError);
    // Don't throw - tickets are created, email failure shouldn't break the flow
  }
}