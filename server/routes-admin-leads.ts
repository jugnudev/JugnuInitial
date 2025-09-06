import type { Express } from 'express';
import { getLeads, getLead, updateLeadStatus, deleteLead } from './services/sponsorService';
import { getQuote } from './services/sponsorService';
import { z } from 'zod';

// Admin key middleware
const requireAdminKey = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY || 'jugnu-admin-dev-2025';
  
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ ok: false, error: 'Admin key required' });
  }
  
  next();
};

// Update status schema
const updateStatusSchema = z.object({
  status: z.enum(['new', 'reviewing', 'approved', 'rejected']),
  adminNotes: z.string().optional()
});

// CSV generation utility
function generateCSV(leads: any[], singleLead: boolean = false): string {
  const headers = [
    'id', 'created_at', 'business_name', 'contact_name', 'email', 'instagram', 'website',
    'package_code', 'duration', 'num_weeks', 'start_date', 'end_date', 'selected_dates',
    'add_ons', 'promo_applied', 'promo_code', 'subtotal_cents', 'addons_cents', 'total_cents',
    'budget_range', 'objective', 'ack_exclusive', 'ack_guarantee',
    'desktop_asset_url', 'mobile_asset_url', 'creative_links',
    'comments', 'status', 'admin_notes'
  ];

  const rows = leads.map(lead => 
    headers.map(header => {
      let value = (lead as any)[header];
      
      // Handle special formatting
      if (header === 'selected_dates' && Array.isArray(value)) {
        value = value.join('; ');
      } else if (header === 'add_ons' && Array.isArray(value)) {
        value = value.map((addon: any) => `${addon.code}:$${addon.price}`).join('; ');
      } else if (header === 'created_at' && value) {
        value = new Date(value).toISOString();
      }
      
      // CSV escape
      if (value == null) return "";
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export function addAdminLeadsRoutes(app: Express) {
  // GET /api/admin/leads - List leads with filtering
  app.get('/api/admin/leads', requireAdminKey, async (req, res) => {
    try {
      const { status, package_code, search, date_from, date_to, limit = 50, offset = 0, export: exportMode } = req.query;
      
      const leads = await getLeads({
        status: status as string,
        packageCode: package_code as string,
        search: search as string,
        dateFrom: date_from as string,
        dateTo: date_to as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      if (exportMode === 'csv') {
        const csv = generateCSV(leads);
        const filename = `sponsor-leads-${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
      }

      res.json({ ok: true, leads });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch leads' });
    }
  });

  // GET /api/admin/leads/:id - Get single lead with quote details
  app.get('/api/admin/leads/:id', requireAdminKey, async (req, res) => {
    try {
      const { id } = req.params;
      const { export: exportMode } = req.query;
      
      const lead = await getLead(id);
      if (!lead) {
        return res.status(404).json({ ok: false, error: 'Lead not found' });
      }

      let quote = null;
      if (lead.quoteId) {
        try {
          quote = await getQuote(lead.quoteId);
        } catch (error) {
          console.log('Quote not found or expired for lead:', id);
        }
      }

      if (exportMode === 'csv') {
        const csv = generateCSV([lead], true);
        const filename = `lead-${id}-${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
      }

      res.json({ ok: true, lead, quote });
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch lead' });
    }
  });

  // DELETE /api/admin/leads/:id - Delete lead
  app.delete('/api/admin/leads/:id', requireAdminKey, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ ok: false, error: 'Lead ID required' });
      }
      
      await deleteLead(id);
      
      res.json({ ok: true, message: 'Lead deleted successfully' });
    } catch (error: any) {
      console.error('Delete lead error:', error);
      res.status(400).json({ 
        ok: false, 
        error: error?.message || 'Failed to delete lead' 
      });
    }
  });

  // POST /api/admin/leads/:id/status - Update lead status
  app.post('/api/admin/leads/:id/status', requireAdminKey, async (req, res) => {
    try {
      const { id } = req.params;
      const body = updateStatusSchema.parse(req.body);
      
      const result = await updateLeadStatus(id, body.status, body.adminNotes);
      
      if (!result) {
        return res.status(404).json({ ok: false, error: 'Lead not found' });
      }

      res.json({ ok: true, updated: result });
    } catch (error) {
      console.error('Error updating lead status:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ ok: false, error: 'Failed to update lead status' });
    }
  });

  // Quote prefill endpoint - allows forms to get quote data for prefilling
  app.get('/api/quotes/:quoteId/prefill', async (req, res) => {
    try {
      const { quoteId } = req.params;
      
      const quote = await getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({
          error: 'Quote not found or expired'
        });
      }

      // Return prefill data structure
      const prefillData = {
        quoteId: quote.id,
        packageCode: quote.package_code,
        duration: quote.duration,
        numWeeks: quote.num_weeks,
        selectedDates: quote.selected_dates || [],
        startDate: quote.start_date,
        endDate: quote.end_date,
        addOns: quote.add_ons || [],
        subtotalCents: quote.base_price_cents + (quote.add_ons || []).reduce((sum: number, addon: any) => sum + (addon.price * 100), 0),
        addonsCents: (quote.add_ons || []).reduce((sum: number, addon: any) => sum + (addon.price * 100), 0),
        totalCents: quote.total_cents,
        currency: quote.currency || 'CAD',
        expiresAt: quote.expires_at
      };

      res.json({
        success: true,
        prefill: prefillData
      });

    } catch (error: any) {
      console.error('Quote prefill error:', error);
      res.status(500).json({
        error: error.message || 'Failed to fetch quote for prefill'
      });
    }
  });
}