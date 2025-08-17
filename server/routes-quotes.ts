import type { Express } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { z } from 'zod';

// Create quote schema
const createQuoteSchema = z.object({
  packageCode: z.enum(['events_spotlight', 'homepage_feature', 'full_feature']),
  duration: z.enum(['daily', 'weekly']),
  numWeeks: z.number().min(1).default(1),
  selectedDates: z.array(z.string()).default([]),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  addOns: z.array(z.object({
    code: z.string(),
    price: z.number()
  })).default([]),
  basePriceCents: z.number(),
  promoApplied: z.boolean().default(false),
  promoCode: z.string().nullish(),
  currency: z.string().default('CAD'),
  totalCents: z.number()
});

export function addQuotesRoutes(app: Express) {
  const supabase = getSupabaseAdmin();
  
  // POST /api/spotlight/quotes - Create a new quote
  app.post('/api/spotlight/quotes', async (req, res) => {
  try {
    const body = createQuoteSchema.parse(req.body);
    
    // Validate Full Feature must be weekly
    if (body.packageCode === 'full_feature' && body.duration === 'daily') {
      return res.status(400).json({ 
        error: 'Full Feature package is only available as a weekly booking' 
      });
    }
    
    const { data: quote, error } = await supabase
      .from('sponsor_quotes')
      .insert({
        package_code: body.packageCode,
        duration: body.duration,
        num_weeks: body.numWeeks,
        selected_dates: body.selectedDates,
        start_date: body.startDate ? body.startDate : null,
        end_date: body.endDate ? body.endDate : null,
        add_ons: body.addOns,
        base_price_cents: body.basePriceCents,
        promo_applied: body.promoApplied,
        promo_code: body.promoCode || null,
        currency: body.currency,
        total_cents: body.totalCents,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to create quote:', error);
      return res.status(500).json({ error: 'Failed to create quote' });
    }
    
    res.json({ ok: true, quote_id: quote.id });
  } catch (err) {
    console.error('Error creating quote:', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

  // GET /api/spotlight/quotes/:id - Get quote by ID
  app.get('/api/spotlight/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: quote, error } = await supabase
      .from('sponsor_quotes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    // Check if expired
    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return res.status(410).json({ error: 'Quote has expired' });
    }
    
    res.json({ ok: true, ...quote });
  } catch (err) {
    console.error('Error fetching quote:', err);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
  });
}