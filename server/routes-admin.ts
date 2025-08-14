import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    isAdmin?: boolean;
    loginTime?: number;
    userId?: string;
  }
}

// Admin session middleware
const requireAdminSession = (req: Request, res: Response, next: Function) => {
  const adminSession = req.session?.isAdmin;
  const loginTime = req.session?.loginTime;
  
  // Check if session exists and is not expired (24 hours)
  if (!adminSession || !loginTime || (Date.now() - loginTime) > 24 * 60 * 60 * 1000) {
    return res.status(401).json({ ok: false, error: 'Admin authentication required' });
  }
  
  next();
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: Function) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    Array.from(rateLimitStore.entries()).forEach(([k, v]) => {
      if (v.resetTime < windowStart) {
        rateLimitStore.delete(k);
      }
    });
    
    const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (current.resetTime < now) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }
    
    rateLimitStore.set(key, current);
    
    if (current.count > maxRequests) {
      return res.status(429).json({ ok: false, error: 'Rate limit exceeded' });
    }
    
    next();
  };
};

// Initialize admin audit table if needed
const initAuditTable = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.admin_audit_log (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz NOT NULL DEFAULT now(),
          action text NOT NULL,
          details jsonb,
          user_id text,
          ip_address text,
          user_agent text
        );
        
        CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
        CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON public.admin_audit_log (action);
        CREATE INDEX IF NOT EXISTS admin_audit_log_user_id_idx ON public.admin_audit_log (user_id);
      `
    });
    
    if (error) console.error('Audit table init error:', error);
  } catch (error) {
    console.error('Audit table init failed:', error);
  }
};

// Initialize audit table on startup
initAuditTable();

// Audit logging
const auditLog = async (action: string, details: any, userId?: string) => {
  try {
    await supabase.from('admin_audit_log').insert({
      action,
      details: JSON.stringify(details),
      user_id: userId || 'system',
      ip_address: details.ip,
      user_agent: details.userAgent,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// Admin key middleware for API endpoints
const requireAdminKey = (req: Request, res: Response, next: Function) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD;
  
  if (!expectedKey) {
    return res.status(500).json({ ok: false, error: 'Admin system not configured' });
  }
  
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ ok: false, error: 'Admin key required' });
  }
  
  next();
};

export function addAdminRoutes(app: Express) {
  // Environment check
  const checkEnvironment = () => {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  // Verify environment on startup
  checkEnvironment();

  // Admin routes use session authentication and direct database access

  // All admin routes now use session authentication

  // Selftest endpoint - forward to spotlight admin route
  app.get('/api/admin/selftest', requireAdminSession, async (req: Request, res: Response) => {
    try {
      // Make internal request to the admin selftest with proper admin key
      const adminKey = process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY || 'jugnu-admin-dev-2025';
      const response = await fetch(`http://localhost:5000/api/spotlight/admin/selftest`, {
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Admin selftest error:', error);
      res.status(500).json({ ok: false, error: 'Failed to run selftest' });
    }
  });

  // POST /api/admin/login
  app.post('/api/admin/login', rateLimit(5, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        return res.status(500).json({ ok: false, error: 'Admin system not configured' });
      }
      
      if (!password || password !== adminPassword) {
        await auditLog('admin_login_failed', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ ok: false, error: 'Invalid password' });
      }
      
      // Set admin session
      req.session = req.session || {};
      req.session.isAdmin = true;
      req.session.loginTime = Date.now();
      req.session.userId = 'admin';
      
      await auditLog('admin_login_success', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, 'admin');
      
      res.json({ ok: true });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ ok: false, error: 'Login failed' });
    }
  });

  // POST /api/admin/logout
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });

  // GET /api/admin/session
  app.get('/api/admin/session', (req: Request, res: Response) => {
    const isValid = req.session?.isAdmin && 
                   req.session?.loginTime && 
                   (Date.now() - req.session.loginTime) < 24 * 60 * 60 * 1000;
    
    res.json({ 
      ok: true, 
      isAdmin: isValid,
      loginTime: req.session?.loginTime 
    });
  });

  // GET /api/admin/campaigns
  app.get('/api/admin/campaigns', requireAdminSession, async (req: Request, res: Response) => {
    try {
      // Use service role to bypass RLS
      const { data: campaigns, error } = await supabase
        .from('sponsor_campaigns')
        .select(`
          id,
          name,
          sponsor_name,
          headline,
          subline,
          cta_text,
          click_url,
          placements,
          start_at,
          end_at,
          priority,
          is_active,
          is_sponsored,
          tags,
          created_at,
          updated_at,
          sponsor_creatives (
            placement,
            image_desktop_url,
            image_mobile_url,
            logo_url,
            alt
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Admin campaigns list error:', error);
        // Map database errors to friendly messages
        let errorMessage = 'Failed to load campaigns';
        if (error.message?.includes('freq_cap_per_user_per_day')) {
          errorMessage = 'Database schema needs migration. Please contact support.';
        }
        return res.status(500).json({ ok: false, error: errorMessage });
      }

      res.json({ ok: true, campaigns });
    } catch (error) {
      console.error('Admin campaigns list error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load campaigns' });
    }
  });



  // Helper function to normalize request body (camelCase ↔ snake_case)
  function normalizeBody(body: any) {
    const normalized: any = {};
    for (const [key, value] of Object.entries(body)) {
      // Convert camelCase to snake_case and vice versa
      if (key === 'sponsorName') normalized.sponsor_name = value;
      else if (key === 'sponsor_name') normalized.sponsor_name = value;
      else if (key === 'startAt') normalized.start_at = value;
      else if (key === 'start_at') normalized.start_at = value;
      else if (key === 'endAt') normalized.end_at = value;
      else if (key === 'end_at') normalized.end_at = value;
      else if (key === 'isActive') normalized.is_active = value;
      else if (key === 'is_active') normalized.is_active = value;
      else if (key === 'campaignId') normalized.campaign_id = value;
      else if (key === 'campaign_id') normalized.campaign_id = value;
      else if (key === 'expiresInHours') normalized.expires_in_hours = value;
      else if (key === 'expires_in_hours') normalized.expires_in_hours = value;
      else normalized[key] = value;
    }
    return normalized;
  }

  // Admin API alias routes that forward to spotlight handlers with admin key authentication
  
  // POST /api/admin/campaigns → POST /api/spotlight/admin/campaign/upsert (alias with admin key)
  app.post('/api/admin/campaigns', requireAdminKey, async (req, res) => {
    try {
      const normalizedBody = normalizeBody(req.body);
      
      const response = await fetch('http://localhost:5000/api/spotlight/admin/campaign/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY || 'jugnu-admin-dev-2025'
        },
        body: JSON.stringify(normalizedBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          error: data.error || 'Campaign operation failed',
          detail: data.detail || data.message,
          code: response.status
        });
      }
      
      res.json(data);
    } catch (error: any) {
      console.error('Admin campaigns alias error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        detail: error?.message || 'Unknown error',
        code: 500
      });
    }
  });

  // POST /api/admin/portal-tokens → Create portal token directly (no existing spotlight route)
  app.post('/api/admin/portal-tokens', requireAdminKey, async (req, res) => {
    try {
      const { campaign_id, expires_in_hours = 168 } = normalizeBody(req.body); // default 7 days
      
      if (!campaign_id) {
        return res.status(400).json({
          ok: false,
          error: 'Campaign ID is required',
          detail: 'campaign_id field is missing',
          code: 400
        });
      }

      // Create portal token directly
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

      const { data: tokenData, error } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          campaign_id,
          token,
          expires_at: expiresAt.toISOString(),
          disabled: false
        })
        .select()
        .single();

      if (error) {
        console.error('Portal token creation error:', error);
        return res.status(500).json({
          ok: false,
          error: 'Failed to create portal token',
          detail: error.message,
          code: 500
        });
      }

      await auditLog('portal_token_created', {
        tokenId: token,
        campaignId: campaign_id,
        expiresAt: expiresAt.toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, 'admin-api');

      res.json({
        ok: true,
        token: tokenData.token,
        expires_at: tokenData.expires_at,
        portal_url: `${req.protocol}://${req.get('host')}/sponsor/${tokenData.token}`
      });
    } catch (error: any) {
      console.error('Admin portal-tokens error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        detail: error?.message || 'Unknown error',
        code: 500
      });
    }
  });

  // POST /api/admin/send-onboarding → POST /api/spotlight/admin/send-onboarding
  app.post('/api/admin/send-onboarding', requireAdminKey, async (req, res) => {
    try {
      const normalizedBody = normalizeBody(req.body);
      
      const response = await fetch('http://localhost:5000/api/spotlight/admin/send-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY || 'jugnu-admin-dev-2025'
        },
        body: JSON.stringify(normalizedBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          error: data.error || 'Send onboarding operation failed',
          detail: data.detail || data.message,
          code: response.status
        });
      }
      
      res.json(data);
    } catch (error: any) {
      console.error('Admin send-onboarding alias error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        detail: error?.message || 'Unknown error',
        code: 500
      });
    }
  });

  // PATCH /api/admin/campaigns/:id/toggle
  app.patch('/api/admin/campaigns/:id/toggle', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const { data, error } = await supabase
        .from('sponsor_campaigns')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('name, is_active')
        .single();

      if (error) throw error;

      await auditLog('campaign_toggled', {
        campaignId: id,
        name: data.name,
        is_active,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.userId);

      res.json({ ok: true, campaign: data });
    } catch (error) {
      console.error('Admin campaign toggle error:', error);
      res.status(500).json({ ok: false, error: 'Failed to toggle campaign' });
    }
  });

  // POST /api/admin/campaigns/:id/duplicate
  app.post('/api/admin/campaigns/:id/duplicate', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get original campaign
      const { data: original, error: fetchError } = await supabase
        .from('sponsor_campaigns')
        .select(`
          *,
          sponsor_creatives (*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate campaign
      const { sponsor_creatives, ...campaignData } = original;
      const duplicatedCampaign = {
        ...campaignData,
        id: undefined,
        name: `${campaignData.name} (Copy)`,
        is_active: false,
        created_at: undefined,
        updated_at: undefined
      };

      const { data: newCampaign, error: createError } = await supabase
        .from('sponsor_campaigns')
        .insert(duplicatedCampaign)
        .select()
        .single();

      if (createError) throw createError;

      // Duplicate creatives
      if (sponsor_creatives && sponsor_creatives.length > 0) {
        const duplicatedCreatives = sponsor_creatives.map((creative: any) => ({
          campaign_id: newCampaign.id,
          placement: creative.placement,
          image_desktop_url: creative.image_desktop_url,
          image_mobile_url: creative.image_mobile_url,
          logo_url: creative.logo_url,
          alt: creative.alt
        }));

        await supabase
          .from('sponsor_creatives')
          .insert(duplicatedCreatives);
      }

      await auditLog('campaign_duplicated', {
        originalId: id,
        newId: newCampaign.id,
        name: newCampaign.name,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.userId);

      res.json({ ok: true, campaign: newCampaign });
    } catch (error) {
      console.error('Admin campaign duplicate error:', error);
      res.status(500).json({ ok: false, error: 'Failed to duplicate campaign' });
    }
  });

  // DELETE /api/admin/campaigns/:id
  app.delete('/api/admin/campaigns/:id', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get campaign name for audit log
      const { data: campaign } = await supabase
        .from('sponsor_campaigns')
        .select('name')
        .eq('id', id)
        .single();

      // Delete creatives first
      await supabase
        .from('sponsor_creatives')
        .delete()
        .eq('campaign_id', id);

      // Delete campaign
      const { error } = await supabase
        .from('sponsor_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await auditLog('campaign_deleted', {
        campaignId: id,
        name: campaign?.name,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.userId);

      res.json({ ok: true });
    } catch (error) {
      console.error('Admin campaign delete error:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete campaign' });
    }
  });

  // GET /api/admin/portal-tokens
  app.get('/api/admin/portal-tokens', requireAdminSession, async (req: Request, res: Response) => {
    try {
      // Use service role to bypass RLS - match existing table schema
      const { data: tokens, error } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          token,
          campaign_id,
          expires_at,
          created_at,
          disabled,
          sponsor_campaigns!campaign_id (
            name,
            sponsor_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Admin portal tokens list error:', error);
        // Map database errors to friendly messages
        let errorMessage = 'Failed to load portal tokens';
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          errorMessage = 'Database schema needs migration. Please contact support.';
        }
        return res.status(500).json({ ok: false, error: errorMessage });
      }

      res.json({ ok: true, tokens });
    } catch (error) {
      console.error('Admin portal tokens list error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load portal tokens' });
    }
  });

  // POST /api/admin/portal-tokens
  app.post('/api/admin/portal-tokens', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { campaignId, hoursValid = 24 * 30 } = req.body; // Default 30 days

      if (!campaignId) {
        return res.status(400).json({ ok: false, error: 'campaignId required' });
      }

      // Generate UUID token (using gen_random_uuid from database)
      const tokenResponse = await supabase.rpc('gen_random_uuid');
      const token = tokenResponse.data || crypto.randomBytes(32).toString('hex');
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hoursValid);

      const { data, error } = await supabase
        .from('sponsor_portal_tokens')
        .insert({
          token,
          campaign_id: campaignId,
          expires_at: expiresAt.toISOString()
        })
        .select(`
          token,
          campaign_id,
          expires_at,
          sponsor_campaigns!campaign_id (
            name,
            sponsor_name,
            start_at,
            end_at
          )
        `)
        .single();

      if (error) throw error;

      await auditLog('portal_token_created', {
        token: token.substring(0, 8) + '...',
        campaignId,
        hoursValid,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.userId);

      res.json({ 
        ok: true, 
        token: data,
        portalUrl: `${req.protocol}://${req.get('host')}/sponsor/${token}`
      });
    } catch (error) {
      console.error('Admin portal token create error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create portal token' });
    }
  });

  // POST /api/admin/portal-tokens/email (send portal link via email)
  app.post('/api/admin/portal-tokens/email', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { token, recipients, message } = req.body;

      if (!token || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ ok: false, error: 'Token and recipients are required' });
      }

      // Get token details
      const { data: tokenData, error: tokenError } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          *,
          sponsor_campaigns!campaign_id (
            name,
            sponsor_name,
            start_at,
            end_at
          )
        `)
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ ok: false, error: 'Portal token not found' });
      }

      const campaign = tokenData.sponsor_campaigns;
      const portalUrl = `${req.protocol}://${req.get('host')}/sponsor/${token}`;
      
      // Format dates
      const startDate = new Date(campaign.start_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const endDate = new Date(campaign.end_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const emailSubject = `Sponsor Analytics Portal - ${campaign.name}`;
      const emailBody = `
${message || 'Your sponsor analytics portal is ready!'}

Campaign: ${campaign.name}
Sponsor: ${campaign.sponsor_name}
Campaign Period: ${startDate} - ${endDate}

Access your analytics portal here:
${portalUrl}

This link will remain active until ${new Date(tokenData.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}.

Best regards,
The Jugnu Team
      `.trim();

      // Log the email action
      await auditLog('portal_email_sent', {
        campaignId: tokenData.campaign_id,
        token: token.substring(0, 8) + '...',
        recipients: recipients.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.userId);

      // Return email content for manual sending or integration with email service
      res.json({ 
        ok: true, 
        message: 'Email content prepared',
        emailData: {
          subject: emailSubject,
          body: emailBody,
          recipients
        }
      });
    } catch (error) {
      console.error('Admin portal email error:', error);
      res.status(500).json({ ok: false, error: 'Failed to send portal email' });
    }
  });

  // DELETE /api/admin/portal-tokens/:id
  app.delete('/api/admin/portal-tokens/:id', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('sponsor_portal_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await auditLog('portal_token_revoked', {
        tokenId: id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.userId);

      res.json({ ok: true });
    } catch (error) {
      console.error('Admin portal token delete error:', error);
      res.status(500).json({ ok: false, error: 'Failed to revoke portal token' });
    }
  });

  // GET /api/admin/audit-log
  app.get('/api/admin/audit-log', requireAdminSession, async (req: Request, res: Response) => {
    try {
      const { limit = 100 } = req.query;

      const { data: logs, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      if (error) throw error;

      res.json({ ok: true, logs });
    } catch (error) {
      console.error('Admin audit log error:', error);
      res.status(500).json({ ok: false, error: 'Failed to load audit log' });
    }
  });
}