import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseAdmin } from './supabaseAdmin.js';

// Schema for creating/updating promo codes
const promoCodeSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'free_days']),
  discount_value: z.number().positive(),
  valid_from: z.string(), // Date string
  valid_to: z.string(), // Date string
  max_uses: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
  min_purchase_amount: z.number().min(0).default(0),
  applicable_packages: z.array(z.string()).optional().nullable()
});

// Schema for validating promo codes (public endpoint)
const validatePromoSchema = z.object({
  code: z.string(),
  package_code: z.string().optional(),
  total_amount: z.number().optional()
});

// Admin middleware (reuse from existing admin routes)
const requireAdminKey = (req: Request, res: Response, next: Function) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
};

export function addPromoCodeRoutes(app: Express) {
  const supabase = getSupabaseAdmin();

  // GET /api/admin/promo-codes - List all promo codes (admin)
  app.get('/api/admin/promo-codes', requireAdminKey, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching promo codes:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch promo codes' });
      }

      res.json({ ok: true, promoCodes: data });
    } catch (error) {
      console.error('Error in GET /api/admin/promo-codes:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/promo-codes - Create new promo code (admin)
  app.post('/api/admin/promo-codes', requireAdminKey, async (req, res) => {
    try {
      const validatedData = promoCodeSchema.parse(req.body);

      // Check if code already exists
      const { data: existing } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', validatedData.code)
        .single();

      if (existing) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Promo code already exists' 
        });
      }

      const { data, error } = await supabase
        .from('promo_codes')
        .insert({
          ...validatedData,
          current_uses: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating promo code:', error);
        return res.status(500).json({ ok: false, error: 'Failed to create promo code' });
      }

      res.json({ ok: true, promoCode: data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Invalid data', 
          details: error.errors 
        });
      }
      console.error('Error in POST /api/admin/promo-codes:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  // PUT /api/admin/promo-codes/:id - Update promo code (admin)
  app.put('/api/admin/promo-codes/:id', requireAdminKey, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.current_uses;
      delete updates.created_at;

      const { data, error } = await supabase
        .from('promo_codes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating promo code:', error);
        return res.status(500).json({ ok: false, error: 'Failed to update promo code' });
      }

      if (!data) {
        return res.status(404).json({ ok: false, error: 'Promo code not found' });
      }

      res.json({ ok: true, promoCode: data });
    } catch (error) {
      console.error('Error in PUT /api/admin/promo-codes/:id:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  // DELETE /api/admin/promo-codes/:id - Deactivate promo code (admin)
  app.delete('/api/admin/promo-codes/:id', requireAdminKey, async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('promo_codes')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deactivating promo code:', error);
        return res.status(500).json({ ok: false, error: 'Failed to deactivate promo code' });
      }

      if (!data) {
        return res.status(404).json({ ok: false, error: 'Promo code not found' });
      }

      res.json({ ok: true, message: 'Promo code deactivated', promoCode: data });
    } catch (error) {
      console.error('Error in DELETE /api/admin/promo-codes/:id:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  // POST /api/spotlight/validate-promo - Validate promo code (public)
  app.post('/api/spotlight/validate-promo', async (req, res) => {
    try {
      const { code, package_code, total_amount } = validatePromoSchema.parse(req.body);
      
      // Get the promo code
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promoCode) {
        return res.status(404).json({ 
          ok: false, 
          error: 'Invalid promo code' 
        });
      }

      // Validate dates
      const today = new Date();
      const validFrom = new Date(promoCode.valid_from);
      const validTo = new Date(promoCode.valid_to);
      validTo.setHours(23, 59, 59, 999); // Include entire last day

      if (today < validFrom || today > validTo) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Promo code has expired or is not yet valid' 
        });
      }

      // Check usage limits
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Promo code has reached its usage limit' 
        });
      }

      // Check minimum purchase amount
      if (total_amount && promoCode.min_purchase_amount > 0 && total_amount < promoCode.min_purchase_amount) {
        return res.status(400).json({ 
          ok: false, 
          error: `Minimum purchase amount of $${promoCode.min_purchase_amount} required` 
        });
      }

      // Check applicable packages
      if (package_code && promoCode.applicable_packages && promoCode.applicable_packages.length > 0) {
        if (!promoCode.applicable_packages.includes(package_code)) {
          return res.status(400).json({ 
            ok: false, 
            error: 'Promo code not valid for selected package' 
          });
        }
      }

      // Calculate discount
      let discountAmount = 0;
      let discountDescription = '';
      
      switch (promoCode.discount_type) {
        case 'percentage':
          if (total_amount) {
            discountAmount = (total_amount * promoCode.discount_value) / 100;
            discountDescription = `${promoCode.discount_value}% off`;
          } else {
            discountDescription = `${promoCode.discount_value}% discount`;
          }
          break;
        
        case 'fixed_amount':
          discountAmount = promoCode.discount_value;
          discountDescription = `$${promoCode.discount_value} off`;
          break;
        
        case 'free_days':
          // Free days will be handled differently in the application logic
          discountDescription = `${promoCode.discount_value} free day${promoCode.discount_value > 1 ? 's' : ''}`;
          break;
      }

      res.json({ 
        ok: true, 
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          description: promoCode.description,
          discount_type: promoCode.discount_type,
          discount_value: promoCode.discount_value,
          discount_amount: discountAmount,
          discount_description: discountDescription
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      console.error('Error in POST /api/spotlight/validate-promo:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/promo-codes/:id/usage - Track promo code usage (internal)
  app.post('/api/admin/promo-codes/:id/usage', async (req, res) => {
    try {
      const { id } = req.params;
      const { lead_id, applied_discount } = req.body;

      // Start a transaction
      const { data: promoCode, error: fetchError } = await supabase
        .from('promo_codes')
        .select('current_uses')
        .eq('id', id)
        .single();

      if (fetchError || !promoCode) {
        return res.status(404).json({ ok: false, error: 'Promo code not found' });
      }

      // Update usage count
      const { error: updateError } = await supabase
        .from('promo_codes')
        .update({ 
          current_uses: (promoCode.current_uses || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating promo code usage:', updateError);
        return res.status(500).json({ ok: false, error: 'Failed to update usage count' });
      }

      // Track usage in usage table
      const { error: usageError } = await supabase
        .from('promo_code_usage')
        .insert({
          promo_code_id: id,
          lead_id,
          applied_discount
        });

      if (usageError) {
        console.error('Error tracking promo code usage:', usageError);
        // Don't fail the request if tracking fails
      }

      res.json({ ok: true, message: 'Usage tracked successfully' });
    } catch (error) {
      console.error('Error in POST /api/admin/promo-codes/:id/usage:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });
}