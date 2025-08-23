import type { Express } from 'express';
import { getOnboardingData, processOnboarding, onboardingFormSchema } from './services/onboardingService';
import { uploadSponsorCreatives } from './services/storageService';
import { z } from 'zod';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 4 // Max 4 files (desktop/mobile for events/home)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

export function registerOnboardingRoutes(app: Express) {
  // GET /api/onboard/:token - Get onboarding data
  app.get('/api/onboard/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Invalid onboarding link' 
        });
      }
      
      const data = await getOnboardingData(token);
      
      res.json({
        ok: true,
        prefill: {
          businessName: data.businessName,
          contactName: data.contactName,
          email: data.email,
          packageCode: data.packageCode,
          placements: data.placements,
          startDate: data.startDate,
          endDate: data.endDate,
          addOns: data.addOns,
          // Creative URLs if they exist
          creatives: {
            eventsDesktop: data.eventsDesktopUrl,
            eventsMobile: data.eventsMobileUrl,
            homeDesktop: data.homeDesktopUrl,
            homeMobile: data.homeMobileUrl,
          }
        }
      });
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      
      // Return user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : 'Invalid or expired onboarding link';
      
      res.status(400).json({ 
        ok: false, 
        error: errorMessage,
        contactEmail: process.env.EMAIL_FROM_ADDRESS || 'relations@thehouseofjugnu.com'
      });
    }
  });
  
  // POST /api/onboard/:token - Submit onboarding form
  app.post('/api/onboard/:token', upload.fields([
    { name: 'events_desktop', maxCount: 1 },
    { name: 'events_mobile', maxCount: 1 },
    { name: 'home_desktop', maxCount: 1 },
    { name: 'home_mobile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Invalid onboarding link' 
        });
      }
      
      // Get files if uploaded
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Parse and validate form data
      const formData = onboardingFormSchema.parse({
        campaignTitle: req.body.campaignTitle,
        headline: req.body.headline,
        subline: req.body.subline,
        ctaText: req.body.ctaText,
        clickUrl: req.body.clickUrl,
        // These will be undefined if no files uploaded, which is fine
        eventsDesktopUrl: req.body.events_desktop_url,
        eventsMobileUrl: req.body.events_mobile_url,
        homeDesktopUrl: req.body.home_desktop_url,
        homeMobileUrl: req.body.home_mobile_url,
      });
      
      // Handle file uploads if present
      let uploadedUrls: { [key: string]: string } = {};
      
      if (files) {
        // Generate a temp ID for the upload path
        const uploadId = `onboard_${Date.now()}`;
        
        // Prepare files array for upload
        const filesToUpload: Express.Multer.File[] = [];
        const fileMapping: { [index: number]: string } = {};
        
        if (files['events_desktop']?.[0]) {
          const idx = filesToUpload.length;
          filesToUpload.push(files['events_desktop'][0]);
          fileMapping[idx] = 'eventsDesktopUrl';
        }
        if (files['events_mobile']?.[0]) {
          const idx = filesToUpload.length;
          filesToUpload.push(files['events_mobile'][0]);
          fileMapping[idx] = 'eventsMobileUrl';
        }
        if (files['home_desktop']?.[0]) {
          const idx = filesToUpload.length;
          filesToUpload.push(files['home_desktop'][0]);
          fileMapping[idx] = 'homeDesktopUrl';
        }
        if (files['home_mobile']?.[0]) {
          const idx = filesToUpload.length;
          filesToUpload.push(files['home_mobile'][0]);
          fileMapping[idx] = 'homeMobileUrl';
        }
        
        if (filesToUpload.length > 0) {
          // Upload files and get URLs
          const urls = await uploadSponsorCreatives(filesToUpload, uploadId, 'onboarding');
          
          // Map URLs back to field names
          urls.forEach((url, idx) => {
            const fieldName = fileMapping[idx];
            if (fieldName) {
              uploadedUrls[fieldName] = url;
            }
          });
        }
      }
      
      // Merge uploaded URLs into form data
      const finalFormData = {
        ...formData,
        eventsDesktopUrl: uploadedUrls.eventsDesktopUrl || formData.eventsDesktopUrl,
        eventsMobileUrl: uploadedUrls.eventsMobileUrl || formData.eventsMobileUrl,
        homeDesktopUrl: uploadedUrls.homeDesktopUrl || formData.homeDesktopUrl,
        homeMobileUrl: uploadedUrls.homeMobileUrl || formData.homeMobileUrl,
      };
      
      // Process onboarding
      const result = await processOnboarding(token, finalFormData);
      
      res.json(result);
    } catch (error) {
      console.error('Error processing onboarding:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          ok: false,
          error: 'Invalid form data',
          details: error.errors 
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to process onboarding';
      
      res.status(400).json({ 
        ok: false, 
        error: errorMessage 
      });
    }
  });
}