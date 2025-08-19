import type { Express } from 'express';
import { createQuote, getQuote, createApplication, createQuoteSchema, createApplicationSchema } from './services/sponsorService';
import { z } from 'zod';
import sgMail from '@sendgrid/mail';

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
  
  // Skip validation for placeholder URLs (when files are uploaded directly)
  if (desktopUrl.includes('placeholder.com') || mobileUrl.includes('placeholder.com')) {
    console.log('Skipping validation - placeholder URLs detected');
    return { valid: true };
  }
  
  // Basic URL validation (more comprehensive validation would happen server-side with actual image fetching)
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
    const trustedHosts = ['drive.google.com', 'dropbox.com', 'wetransfer.com', 'imgur.com'];
    if (trustedHosts.some(host => desktopUrlObj.hostname.includes(host) || mobileUrlObj.hostname.includes(host))) {
      console.log('Trusted host detected, skipping validation');
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
  
  const subject = `New Sponsor Application: ${leadData.businessName} - ${packageNames[leadData.packageCode as keyof typeof packageNames]}`;
  
  const html = `
    <h2>New Sponsor Application Received</h2>
    
    <h3>Contact Information</h3>
    <p><strong>Business:</strong> ${leadData.businessName}</p>
    <p><strong>Contact:</strong> ${leadData.contactName}</p>
    <p><strong>Email:</strong> ${leadData.email}</p>
    ${leadData.instagram ? `<p><strong>Instagram:</strong> @${leadData.instagram}</p>` : ''}
    ${leadData.website ? `<p><strong>Website:</strong> <a href="${leadData.website}">${leadData.website}</a></p>` : ''}
    
    <h3>Package Selection</h3>
    <p><strong>Package:</strong> ${packageNames[leadData.packageCode as keyof typeof packageNames]}</p>
    <p><strong>Duration:</strong> ${leadData.duration}</p>
    <p><strong>Dates:</strong> ${leadData.startDate && leadData.endDate ? `${leadData.startDate} to ${leadData.endDate}` : leadData.selectedDates.join(', ')}</p>
    ${leadData.addOns.length > 0 ? `<p><strong>Add-ons:</strong> ${leadData.addOns.map((a: any) => a.code).join(', ')}</p>` : ''}
    
    <h3>Pricing</h3>
    <p><strong>Subtotal:</strong> CA$${(leadData.subtotalCents / 100).toFixed(2)}</p>
    ${leadData.promoApplied ? `<p><strong>Promo:</strong> ${leadData.promoCode} (Base package free)</p>` : ''}
    <p><strong>Total:</strong> CA$${(leadData.totalCents / 100).toFixed(2)}</p>
    
    <h3>Campaign Details</h3>
    ${leadData.objective ? `<p><strong>Objective:</strong> ${leadData.objective}</p>` : ''}
    ${leadData.budgetRange ? `<p><strong>Budget Range:</strong> ${leadData.budgetRange}</p>` : ''}
    
    <h3>Creative Assets</h3>
    <p><strong>Desktop Asset:</strong> <a href="${leadData.desktopAssetUrl}">View Desktop Creative</a></p>
    <p><strong>Mobile Asset:</strong> <a href="${leadData.mobileAssetUrl}">View Mobile Creative</a></p>
    ${leadData.creativeLinks ? `<p><strong>Additional Links:</strong> ${leadData.creativeLinks}</p>` : ''}
    
    ${leadData.comments ? `<h3>Comments</h3><p>${leadData.comments}</p>` : ''}
    
    <h3>Admin Actions</h3>
    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/admin/leads/${leadId}">View Lead Details</a></p>
  `;
  
  try {
    await sgMail.send({
      to: process.env.ADMIN_EMAIL || 'admin@jugnu.events',
      from: process.env.FROM_EMAIL || 'noreply@jugnu.events',
      subject,
      html
    });
    console.log('Admin notification email sent for lead:', leadId);
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
  }
}

export function addQuotesRoutes(app: Express) {
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

  // POST /api/spotlight/applications - Submit sponsor application
  app.post('/api/spotlight/applications', async (req, res) => {
    try {
      // Rate limiting
      if (!checkRateLimit(req.ip || 'unknown', quotesHits)) {
        return res.status(429).json({ 
          ok: false,
          error: 'Too many application requests. Please try again later.' 
        });
      }

      const body = createApplicationSchema.parse(req.body);
      
      // Debug logging
      console.log('Application received with assets:', {
        desktopUrl: body.desktopAssetUrl,
        mobileUrl: body.mobileAssetUrl,
        creativeLinks: body.creativeLinks
      });
      
      // Validate creative assets
      const assetValidation = validateCreativeAssets(body.desktopAssetUrl, body.mobileAssetUrl);
      if (!assetValidation.valid) {
        console.log('Asset validation failed:', assetValidation.error);
        return res.status(400).json({ 
          ok: false,
          error: assetValidation.error 
        });
      }
      
      // Store raw payload for debugging
      const rawPayload = { ...req.body, ip: req.ip, userAgent: req.get('User-Agent') };
      
      const leadId = await createApplication(body, rawPayload);
      
      // Send admin notification email
      await sendAdminNotificationEmail(leadId, body);
      
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
}