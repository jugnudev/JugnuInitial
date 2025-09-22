import { z } from 'zod';

// Checkout validation
export const checkoutSessionSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(z.object({
    tierId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10)
  })).min(1).max(10),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1).max(100),
  buyerPhone: z.string().optional(),
  discountCode: z.string().optional(),
  returnUrl: z.string().url().refine(url => {
    // Whitelist returnUrl to same origin only
    try {
      const parsed = new URL(url);
      return parsed.origin === process.env.APP_URL || 
             parsed.hostname === 'localhost' ||
             parsed.hostname.endsWith('.replit.dev');
    } catch {
      return false;
    }
  }, 'Return URL must be from same origin')
});

// Payment Intent validation (for embedded checkout - no returnUrl needed)
export const paymentIntentSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(z.object({
    tierId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10)
  })).min(1).max(10),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1).max(100),
  buyerPhone: z.string().optional(),
  discountCode: z.string().optional()
  // Note: No returnUrl needed for embedded checkout
});

// Event creation/update validation
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  venue: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  province: z.string().length(2),
  maxCapacity: z.number().int().min(1).optional(),
  refundPolicy: z.string().max(1000).optional(),
  hasGST: z.boolean().default(true),
  hasPST: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'archived']).default('draft')
});

export const updateEventSchema = createEventSchema.partial();

// Tier creation/update validation
export const createTierSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0),
  capacity: z.number().int().min(1).optional(),
  maxPerOrder: z.number().int().min(1).max(10).default(10),
  minPerOrder: z.number().int().min(1).max(10).default(1),
  salesOpenAt: z.string().datetime().optional(),
  salesCloseAt: z.string().datetime().optional(),
  sortOrder: z.number().int().default(0)
});

export const updateTierSchema = createTierSchema.partial();

// Organizer signup validation
export const organizerSignupSchema = z.object({
  userId: z.string().uuid(),
  businessName: z.string().min(1).max(200),
  businessEmail: z.string().email(),
  returnUrl: z.string().url().optional(),
  refreshUrl: z.string().url().optional()
});

// Discount validation
export const validateDiscountSchema = z.object({
  eventId: z.string().uuid(),
  code: z.string().min(1).max(50)
});

// Ticket validation
export const validateTicketSchema = z.object({
  qrToken: z.string().min(1),
  apiKey: z.string().min(1)
});

// Refund validation
export const refundSchema = z.object({
  amountCents: z.number().int().min(1).optional(),
  reason: z.string().max(500).optional()
});