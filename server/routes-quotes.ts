import type { Express } from 'express';
import { 
  createQuote, 
  getQuote, 
  createApplication, 
  createQuoteSchema, 
  createApplicationSchema,
  approveLead,
  resendOnboardingEmail,
  revokeOnboardingToken
} from './services/sponsorService';
import { uploadSponsorCreatives } from './services/storageService';
import { z } from 'zod';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabaseAdmin';


// Rate limiting for quote and application endpoints
const rateLimit = { windowMs: 60_000, max: 10 };
const quotesHits = new Map<string, { count: number; ts: number }>();

function checkRateLimit(ip: string, hitMap: Map<string, { count: number; ts: number }>): boolean {
  const now = Date.now();
  const hit = hitMap.get(ip);
  
  if (!hit || now - hit.ts > rateLimit.windowMs) {
    hitMap.set(ip, { count: 1, ts: now });
    return true;
  }
  
  if (hit.count >= rateLimit.max) {
    return false;
  }
  
  hit.count++;
  return true;
}

// Validate creative assets
function validateCreativeAssets(desktopUrl: string, mobileUrl: string): { valid: boolean; error?: string } {
  console.log('Validating creative assets:', { desktopUrl, mobileUrl });
  
  // Basic URL validation
  try {
    const desktopUrlObj = new URL(desktopUrl);
    const mobileUrlObj = new URL(mobileUrl);
    
    console.log('Parsed URLs:', {
      desktopHost: desktopUrlObj.hostname,
      mobileHost: mobileUrlObj.hostname,
      desktopPath: desktopUrlObj.pathname,
      mobilePath: mobileUrlObj.pathname
    });
    
    // Allow Google Drive, Dropbox, and other common file sharing services
    const trustedHosts = ['drive.google.com', 'dropbox.com', 'wetransfer.com', 'imgur.com', 'supabase.co', 'supabase.in'];
    if (trustedHosts.some(host => desktopUrlObj.hostname.includes(host) || mobileUrlObj.hostname.includes(host))) {
      console.log('Trusted host detected');
      return { valid: true };
    }
    
    // Check if URLs look like image URLs (skip for placeholder domains)
    const desktopExt = desktopUrlObj.pathname.split('.').pop()?.toLowerCase();
    const mobileExt = mobileUrlObj.pathname.split('.').pop()?.toLowerCase();
    
    console.log('File extensions:', { desktopExt, mobileExt });
    
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    
    // Only validate extensions if they exist and are not from placeholder domains
    // Skip validation for files.placeholder.com which indicates uploaded files
    const skipDesktopValidation = desktopUrlObj.hostname === 'files.placeholder.com';
    const skipMobileValidation = mobileUrlObj.hostname === 'files.placeholder.com';
    
    console.log('Skip validation flags:', { skipDesktopValidation, skipMobileValidation });
    
    if (!skipDesktopValidation && desktopExt && desktopExt.length <= 4 && !validExtensions.includes(desktopExt)) {
      console.log('Desktop validation failed:', { desktopExt, validExtensions });
      return { valid: false, error: 'Desktop asset must be a valid image (JPG, PNG, WebP)' };
    }
    
    if (!skipMobileValidation && mobileExt && mobileExt.length <= 4 && !validExtensions.includes(mobileExt)) {
      console.log('Mobile validation failed:', { mobileExt, validExtensions });
      return { valid: false, error: 'Mobile asset must be a valid image (JPG, PNG, WebP)' };
    }
    
    console.log('Validation passed');
    return { valid: true };
  } catch (error) {
    console.log('URL parsing error:', error);
    return { valid: false, error: 'Invalid creative asset URLs' };
  }
}

// Send admin notification email
async function sendAdminNotificationEmail(leadId: string, leadData: any) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping admin notification email');
    return;
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const packageNames = {
    events_spotlight: 'Events Spotlight',
    homepage_feature: 'Homepage Feature',
    full_feature: 'Full Feature'
  };
  
  const subject = `New Sponsor Application: ${leadData.business_name} - ${packageNames[leadData.package_code as keyof typeof packageNames]}`;
  
  const html = `
    <h2>New Sponsor Application Received</h2>
    
    <h3>Contact Information</h3>
    <p><strong>Business:</strong> ${leadData.business_name}</p>
    <p><strong>Contact:</strong> ${leadData.contact_name}</p>
    <p><strong>Email:</strong> ${leadData.email}</p>
    ${leadData.instagram ? `<p><strong>Instagram:</strong> @${leadData.instagram}</p>` : ''}
    ${leadData.website ? `<p><strong>Website:</strong> <a href="${leadData.website}">${leadData.website}</a></p>` : ''}
    
    <h3>Package Selection</h3>
    <p><strong>Package:</strong> ${packageNames[leadData.package_code as keyof typeof packageNames]}</p>
    <p><strong>Duration:</strong> ${leadData.duration}</p>
    <p><strong>Dates:</strong> ${leadData.start_date && leadData.end_date ? `${leadData.start_date} to ${leadData.end_date}` : (leadData.selected_dates ? leadData.selected_dates.join(', ') : 'Not specified')}</p>
    ${leadData.add_ons && leadData.add_ons.length > 0 ? `<p><strong>Add-ons:</strong> ${leadData.add_ons.map((a: any) => {
      if (typeof a === 'string') return a;
      return a.code || a;
    }).join(', ')}</p>` : '<p><strong>Add-ons:</strong> None</p>'}
    
    <h3>Pricing</h3>
    <p><strong>Subtotal:</strong> CA$${leadData.subtotal_cents ? (leadData.subtotal_cents / 100).toFixed(2) : '0.00'}</p>
    ${leadData.promo_applied ? `<p><strong>Promo:</strong> ${leadData.promo_code} (Base package free)</p>` : ''}
    <p><strong>Total:</strong> CA$${leadData.total_cents ? (leadData.total_cents / 100).toFixed(2) : '0.00'}</p>
    
    <h3>Campaign Details</h3>
    ${leadData.objective ? `<p><strong>Objective:</strong> ${leadData.objective}</p>` : ''}
    ${leadData.budget_range ? `<p><strong>Budget Range:</strong> ${leadData.budget_range}</p>` : ''}
    
    <h3>Creative Assets</h3>
    <p><strong>Desktop Asset:</strong> <a href="${leadData.desktop_asset_url}">View Desktop Creative</a></p>
    <p><strong>Mobile Asset:</strong> <a href="${leadData.mobile_asset_url}">View Mobile Creative</a></p>
    ${leadData.creative_links ? `<p><strong>Additional Links:</strong> ${leadData.creative_links}</p>` : ''}
    
    ${leadData.comments ? `<h3>Comments</h3><p>${leadData.comments}</p>` : ''}
    
  `;
  
  try {
    await sgMail.send({
      to: process.env.ADMIN_EMAIL || 'relations@thehouseofjugnu.com',
      from: process.env.FROM_EMAIL || 'noreply@thehouseofjugnu.com',
      subject,
      html
    });
    console.log('Admin notification email sent for lead:', leadId);
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
  }
}

// Setup multer for handling file uploads (10MB limit)
const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.memoryStorage()
});

export function addQuotesRoutes(app: Express) {
  // GET /api/spotlight/blocked-dates - Get dates that are already booked
  app.get('/api/spotlight/blocked-dates', async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      
      // Only check sponsor_leads table for blocked dates
      // This excludes placeholder campaigns that advertise sponsor opportunities
      const { data: leadsData, error: leadsError } = await supabase
        .from('sponsor_leads')
        .select('start_date, end_date, package_code, status, business_name')
        .in('status', ['approved', 'onboarded', 'active'])
        .gte('end_date', new Date().toISOString());
      
      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to fetch blocked dates' 
        });
      }
      
      // Collect all blocked date ranges from approved/onboarded leads only
      const blockedRanges: Array<{ start: string; end: string; reason: string }> = [];
      
      // Add dates from approved/onboarded leads
      if (leadsData) {
        leadsData.forEach(lead => {
          if (lead.start_date && lead.end_date) {
            const reasonText = lead.status === 'approved' 
              ? 'Approved booking' 
              : lead.status === 'active' 
                ? 'Active sponsor'
                : 'Reserved booking';
            
            blockedRanges.push({
              start: lead.start_date.split('T')[0],
              end: lead.end_date.split('T')[0],
              reason: reasonText
            });
          }
        });
      }
      
      // Generate array of all blocked dates
      const blockedDates = new Set<string>();
      const dateReasons = new Map<string, string>();
      
      blockedRanges.forEach(range => {
        // Parse dates with explicit UTC to avoid timezone issues
        const start = new Date(range.start + 'T00:00:00Z');
        const end = new Date(range.end + 'T00:00:00Z');
        
        // Use a safer date iteration that doesn't modify the original date
        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dateStr = currentDate.toISOString().split('T')[0];
          blockedDates.add(dateStr);
          // Keep the first reason for each date
          if (!dateReasons.has(dateStr)) {
            dateReasons.set(dateStr, range.reason);
          }
          // Create a new date for the next iteration to avoid mutation issues
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      });
      
      res.json({
        ok: true,
        blockedDates: Array.from(blockedDates).sort(),
        blockedRanges,
        dateReasons: Object.fromEntries(dateReasons)
      });
      
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to fetch blocked dates' 
      });
    }
  });

  // POST /api/spotlight/quotes - Create a new quote
  app.post('/api/spotlight/quotes', async (req, res) => {
    try {
      // Rate limiting
      if (!checkRateLimit(req.ip || 'unknown', quotesHits)) {
        return res.status(429).json({ 
          ok: false,
          error: 'Too many quote requests. Please try again later.' 
        });
      }

      const body = createQuoteSchema.parse(req.body);
      const quoteId = await createQuote(body);
      
      res.json({ ok: true, quote_id: quoteId });
    } catch (err) {
      console.error('Error creating quote:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          ok: false,
          error: 'Invalid request data', 
          details: err.errors 
        });
      }
      
      if (err instanceof Error) {
        return res.status(400).json({ 
          ok: false,
          error: err.message 
        });
      }
      
      res.status(500).json({ 
        ok: false,
        error: 'Failed to create quote' 
      });
    }
  });

  // GET /api/spotlight/quotes/:id - Get quote by ID
  app.get('/api/spotlight/quotes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false,
          error: 'Quote ID is required' 
        });
      }
      
      const quote = await getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ 
          ok: false,
          error: 'Quote not found' 
        });
      }
      
      res.json({ ok: true, quote });
    } catch (err) {
      console.error('Error fetching quote:', err);
      
      if (err instanceof Error && err.message.includes('expired')) {
        return res.status(410).json({ 
          ok: false,
          error: err.message 
        });
      }
      
      res.status(500).json({ 
        ok: false,
        error: 'Failed to fetch quote' 
      });
    }
  });

  // POST /api/spotlight/applications - Submit sponsor application (with file upload support)
  app.post('/api/spotlight/applications', 
    upload.fields([
      { name: 'events_desktop', maxCount: 1 },
      { name: 'events_mobile', maxCount: 1 },
      { name: 'home_desktop', maxCount: 1 },
      { name: 'home_mobile', maxCount: 1 }
    ]),
    async (req, res) => {
    try {
      // Rate limiting
      if (!checkRateLimit(req.ip || 'unknown', quotesHits)) {
        return res.status(429).json({ 
          ok: false,
          error: 'Too many application requests. Please try again later.' 
        });
      }

      // Parse form data (multer puts files in req.files, other fields in req.body)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Build application data from form fields
      const applicationData: any = {
        businessName: req.body.businessName,
        contactName: req.body.contactName,
        email: req.body.email,
        instagram: req.body.instagram,
        website: req.body.website,
        packageCode: req.body.packageCode,
        duration: req.body.duration,
        numWeeks: parseInt(req.body.numWeeks) || 1,
        numDays: parseInt(req.body.numDays) || 1,  // Default to 1 if not provided
        selectedDates: [],
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        addOns: req.body.addOns ? JSON.parse(req.body.addOns) : [],
        objective: req.body.objective,
        budgetRange: '',
        comments: req.body.comments,
        ackExclusive: true,
        ackGuarantee: true,
        quoteId: req.body.quoteId
      };
      
      // Handle creative assets based on package type
      const packageCode = req.body.packageCode;
      
      // Generate a temporary lead ID for file uploads
      const tempLeadId = uuidv4();
      
      // Upload files to Supabase Storage if provided
      let uploadedUrls: any = {};
      if (files && Object.keys(files).length > 0) {
        try {
          uploadedUrls = await uploadSponsorCreatives(files, tempLeadId, packageCode);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          return res.status(500).json({
            ok: false,
            error: `Failed to upload creative assets: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
          });
        }
      }
      
      // Determine final asset URLs based on package type
      let desktopAssetUrl: string | undefined;
      let mobileAssetUrl: string | undefined;
      
      if (packageCode === 'events_spotlight' || packageCode === 'full_feature') {
        desktopAssetUrl = uploadedUrls.events_desktop_asset_url || req.body.events_desktop_asset_url;
        mobileAssetUrl = uploadedUrls.events_mobile_asset_url || req.body.events_mobile_asset_url;
      }
      
      if (packageCode === 'homepage_feature') {
        desktopAssetUrl = uploadedUrls.home_desktop_asset_url || req.body.home_desktop_asset_url;
        mobileAssetUrl = uploadedUrls.home_mobile_asset_url || req.body.home_mobile_asset_url;
      }
      
      if (packageCode === 'full_feature') {
        // For full feature, prioritize home assets if both exist
        desktopAssetUrl = uploadedUrls.home_desktop_asset_url || 
                         uploadedUrls.events_desktop_asset_url ||
                         req.body.home_desktop_asset_url ||
                         req.body.events_desktop_asset_url;
        
        mobileAssetUrl = uploadedUrls.home_mobile_asset_url ||
                        uploadedUrls.events_mobile_asset_url ||
                        req.body.home_mobile_asset_url ||
                        req.body.events_mobile_asset_url;
      }
      
      // Validate that we have required assets
      if (!desktopAssetUrl || !mobileAssetUrl) {
        return res.status(400).json({
          ok: false,
          error: 'Missing required creative assets. Please upload both desktop and mobile creatives or provide URLs.'
        });
      }
      
      applicationData.desktopAssetUrl = desktopAssetUrl;
      applicationData.mobileAssetUrl = mobileAssetUrl;
      applicationData.creativeLinks = req.body.creative_links || '';
      
      // Debug logging
      console.log('Application received:', {
        packageCode,
        hasFiles: !!files && Object.keys(files).length > 0,
        uploadedUrls,
        desktopUrl: desktopAssetUrl,
        mobileUrl: mobileAssetUrl
      });
      
      // Validate the parsed data with schema
      const body = createApplicationSchema.parse(applicationData);
      
      // Store raw payload for debugging
      const rawPayload = { ...req.body, ip: req.ip, userAgent: req.get('User-Agent') };
      
      const leadId = await createApplication(body, rawPayload);
      
      // Fetch the created lead to get calculated values
      const supabase = getSupabaseAdmin();
      const { data: leadData } = await supabase
        .from('sponsor_leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      // Send admin notification email with complete lead data
      if (leadData) {
        await sendAdminNotificationEmail(leadId, leadData);
      }
      
      res.json({ ok: true, lead_id: leadId });
    } catch (err) {
      console.error('Error creating application:', err);
      
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          ok: false,
          error: 'Invalid request data', 
          details: err.errors 
        });
      }
      
      if (err instanceof Error) {
        // Handle specific business logic errors
        if (err.message.includes('expired')) {
          return res.status(410).json({ 
            ok: false,
            error: err.message 
          });
        }
        
        return res.status(400).json({ 
          ok: false,
          error: err.message 
        });
      }
      
      res.status(500).json({ 
        ok: false,
        error: 'Failed to create application' 
      });
    }
  });

  // Admin approval endpoints
  app.post('/api/admin/leads/:id/approve', async (req, res) => {
    try {
      // Check admin auth
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const approvedBy = req.body.approvedBy || 'console';
      
      const result = await approveLead(id, approvedBy);
      res.json(result);
    } catch (error) {
      console.error('Error approving lead:', error);
      res.status(400).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to approve lead' 
      });
    }
  });

  app.post('/api/admin/leads/:id/resend-onboarding', async (req, res) => {
    try {
      // Check admin auth
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const result = await resendOnboardingEmail(id);
      res.json(result);
    } catch (error) {
      console.error('Error resending onboarding:', error);
      res.status(400).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to resend onboarding' 
      });
    }
  });

  app.post('/api/admin/leads/:id/revoke-onboarding', async (req, res) => {
    try {
      // Check admin auth
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const result = await revokeOnboardingToken(id);
      res.json(result);
    } catch (error) {
      console.error('Error revoking onboarding:', error);
      res.status(400).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to revoke onboarding' 
      });
    }
  });
}