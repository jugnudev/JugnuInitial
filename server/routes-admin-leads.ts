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

export function addAdminLeadsRoutes(app: Express) {
  // GET /admin/leads - Show login page or leads management UI
  app.get('/admin/leads', async (req, res) => {
    // Check if user is authenticated
    const adminSession = req.session?.isAdmin;
    const loginTime = req.session?.loginTime;
    const isAuthenticated = adminSession && loginTime && (Date.now() - loginTime) < 24 * 60 * 60 * 1000;

    if (!isAuthenticated) {
      // Show login page
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - Sponsor Leads</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-900 text-white min-h-screen flex items-center justify-center">
  <div class="max-w-md w-full p-8">
    <h1 class="text-3xl font-bold mb-8 text-center">Admin Login</h1>
    <div id="login-form" class="bg-gray-800 p-6 rounded-lg">
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Admin Key</label>
        <input type="password" id="admin-key" class="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter admin key">
      </div>
      <button onclick="login()" class="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium">Login</button>
      <div id="error-msg" class="mt-4 text-red-400 hidden"></div>
    </div>
  </div>
  
  <script>
    async function login() {
      const key = document.getElementById('admin-key').value;
      const errorMsg = document.getElementById('error-msg');
      
      if (!key) {
        errorMsg.textContent = 'Please enter an admin key';
        errorMsg.classList.remove('hidden');
        return;
      }
      
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: key })
        });
        
        const result = await response.json();
        
        if (result.ok) {
          window.location.reload();
        } else {
          errorMsg.textContent = result.error || 'Invalid admin key';
          errorMsg.classList.remove('hidden');
        }
      } catch (error) {
        errorMsg.textContent = 'Login failed. Please try again.';
        errorMsg.classList.remove('hidden');
      }
    }
    
    document.getElementById('admin-key').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login();
    });
  </script>
</body>
</html>
      `);
      return;
    }

    // User is authenticated, show leads management UI
    // This continues to the actual leads API handling
  });

  // GET /admin/leads/api - API endpoint for fetching leads (protected)
  app.get('/admin/leads/api', requireAdminKey, async (req, res) => {
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

  // GET /admin/leads/:id - Get single lead with quote details
  app.get('/admin/leads/:id', requireAdminKey, async (req, res) => {
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

  // POST /admin/leads/:id/status - Update lead status
  app.post('/admin/leads/:id/status', requireAdminKey, async (req, res) => {
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