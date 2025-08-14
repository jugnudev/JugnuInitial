import { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AdminRequest extends Request {
  session?: any;
}

// Admin session middleware
const requireAdminSession = (req: AdminRequest, res: Response, next: Function) => {
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

export function addAdminRoutes(app: Express) {
  // POST /api/admin/login
  app.post('/api/admin/login', rateLimit(5, 15 * 60 * 1000), async (req: AdminRequest, res) => {
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
  app.post('/api/admin/logout', (req: AdminRequest, res) => {
    req.session = undefined;
    res.json({ ok: true });
  });

  // GET /api/admin/session
  app.get('/api/admin/session', (req: AdminRequest, res) => {
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
  app.get('/api/admin/campaigns', requireAdminSession, async (req: AdminRequest, res) => {
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

  // POST /api/admin/campaigns (create/update) - Forward to spotlight admin endpoint
  app.post('/api/admin/campaigns', requireAdminSession, async (req: AdminRequest, res) => {
    try {
      // Forward to the spotlight admin endpoint with audit logging
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/spotlight/admin/campaign/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });

      const result = await response.json();

      if (result.ok) {
        // Log the action for audit trail
        await auditLog(req.body.id ? 'campaign_updated' : 'campaign_created', {
          campaignId: result.campaign?.id,
          name: req.body.name,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }, req.session?.userId);
      }

      // Forward the response
      res.status(response.status).json(result);
    } catch (error) {
      console.error('Admin campaign proxy error:', error);
      res.status(500).json({ ok: false, error: 'Failed to save campaign' });
    }
  });

  // PATCH /api/admin/campaigns/:id/toggle
  app.patch('/api/admin/campaigns/:id/toggle', requireAdminSession, async (req: AdminRequest, res) => {
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
  app.post('/api/admin/campaigns/:id/duplicate', requireAdminSession, async (req: AdminRequest, res) => {
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
  app.delete('/api/admin/campaigns/:id', requireAdminSession, async (req: AdminRequest, res) => {
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
  app.get('/api/admin/portal-tokens', requireAdminSession, async (req: AdminRequest, res) => {
    try {
      // Use service role to bypass RLS
      const { data: tokens, error } = await supabase
        .from('sponsor_portal_tokens')
        .select(`
          id,
          token,
          campaign_id,
          expires_at,
          last_accessed_at,
          created_at,
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
  app.post('/api/admin/portal-tokens', requireAdminSession, async (req: AdminRequest, res) => {
    try {
      const { campaignId, hoursValid = 24 * 30 } = req.body; // Default 30 days

      if (!campaignId) {
        return res.status(400).json({ ok: false, error: 'campaignId required' });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
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
          *,
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
        tokenId: data.id,
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
  app.post('/api/admin/portal-tokens/email', requireAdminSession, async (req: AdminRequest, res) => {
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
  app.delete('/api/admin/portal-tokens/:id', requireAdminSession, async (req: AdminRequest, res) => {
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
  app.get('/api/admin/audit-log', requireAdminSession, async (req: AdminRequest, res) => {
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