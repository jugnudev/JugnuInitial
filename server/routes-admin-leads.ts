import type { Express, Request, Response } from 'express';
import { getLeads, getLead, updateLeadStatus } from './services/sponsorService';
import { getQuote } from './services/sponsorService';
import { z } from 'zod';
import { requireAdminKey } from './middleware/requireAdminKey';

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

// Handler functions
async function listLeads(req: Request, res: Response) {
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
}

async function getSingleLead(req: Request, res: Response) {
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
}

async function updateStatus(req: Request, res: Response) {
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
}

export function addAdminLeadsRoutes(app: Express) {
  console.log('[ADMIN] Routes mounted: /api/admin/leads*, /admin/leads/api*; requireAdminKey uses ADMIN_PASSWORD only');

  // Canonical routes (/api/admin/leads*)
  app.get('/api/admin/leads', requireAdminKey, listLeads);
  app.get('/api/admin/leads/:id', requireAdminKey, getSingleLead);
  app.post('/api/admin/leads/:id/status', requireAdminKey, updateStatus);
  app.get('/api/admin/leads.csv', requireAdminKey, listLeads); // with export=csv query

  // Legacy alias routes (/admin/leads/api*) for compatibility
  app.get('/admin/leads/api', requireAdminKey, listLeads);
  app.get('/admin/leads/api/:id', requireAdminKey, getSingleLead);
  app.post('/admin/leads/:id/status', requireAdminKey, updateStatus);
  app.get('/admin/leads/api.csv', requireAdminKey, listLeads); // with export=csv query

  // Diagnostics
  app.get('/api/admin/echo-auth', requireAdminKey, (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  // Legacy route for direct page access (redirect to React app)
  app.get('/admin/leads', (req, res) => {
    // Redirect to React app
    res.redirect('/#/admin/leads');
  });
}