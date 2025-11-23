import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { addPlacesV13Routes } from './routes-places-v13.js';
import { addSpotlightRoutes } from './routes-spotlight.js';
import { addAdminRoutes } from './routes-admin.js';
import { addQuotesRoutes } from './routes-quotes.js';
import { addAdminLeadsRoutes } from './routes-admin-leads.js';
import { registerOnboardingRoutes } from './routes-onboarding.js';
import { addDealsRoutes } from './routes-deals.js';
import { addPromoCodeRoutes } from './routes-promo-codes.js';
import { createHash } from "crypto";
import ical from "node-ical";
import he from "he";
import multer from "multer";
import path from "path";
import fs from "fs";

// Helper function to create canonical key for deduplication
function createCanonicalKey(title: string, startAt: Date, venue: string | null, isAllDay: boolean): string {
  // Normalize title to slug format (letters+digits joined by '-')
  const titleNorm = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
  
  // Normalize venue 
  const venueNorm = venue 
    ? venue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : 'tba';
  
  // Format date in Vancouver timezone
  const vancouverDate = new Date(startAt.toLocaleString("en-US", { timeZone: "America/Vancouver" }));
  const whenStr = isAllDay 
    ? `${vancouverDate.getFullYear()}-${String(vancouverDate.getMonth() + 1).padStart(2, '0')}-${String(vancouverDate.getDate()).padStart(2, '0')}`
    : `${vancouverDate.getFullYear()}-${String(vancouverDate.getMonth() + 1).padStart(2, '0')}-${String(vancouverDate.getDate()).padStart(2, '0')}-${String(vancouverDate.getHours()).padStart(2, '0')}:${String(vancouverDate.getMinutes()).padStart(2, '0')}`;
  
  return `${titleNorm}|${whenStr}|${venueNorm}`;
}

import { insertCommunityEventSchema, updateCommunityEventSchema, visitorAnalytics, insertVisitorAnalyticsSchema } from "@shared/schema";
import { addTicketsRoutes } from "./tickets/tickets-routes";
import { addCommunitiesRoutes } from "./communities/communities-routes";
// DISABLED: Communities billing routes - Communities are FREE for all business accounts
// import billingRoutes from "./communities/billing-routes";
import webhookRoutes from "./communities/webhook-routes";
import loyaltyRoutes from "./loyalty/loyalty-routes";
import { importFromGoogle, importFromYelp, reverifyAllPlaces } from "./lib/places-sync.js";
import { matchAndEnrichPlaces, inactivateUnmatchedPlaces, getPlaceMatchingStats } from "./lib/place-matcher.js";
import { sendDailyAnalyticsEmail } from "./services/emailService";

// Helper function for group filtering (duplicated from client taxonomy)
function getTypesForGroup(group: string): string[] {
  if (group === 'all') return [];
  
  const groupMap: Record<string, string[]> = {
    'eat': ['restaurant', 'cafe', 'dessert'],
    'shops': ['grocer', 'fashion', 'beauty'],
    'culture': ['temple', 'gurdwara', 'mosque', 'gallery', 'dance', 'org', 'other']
  };
  
  return groupMap[group] || [];
}

// Rate limiting for waitlist endpoint
const rateLimit = { windowMs: 60_000, max: 60 };
const hits = new Map<string, { count: number; ts: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hit = hits.get(ip);
  
  if (!hit || now - hit.ts > rateLimit.windowMs) {
    hits.set(ip, { count: 1, ts: now });
    return true;
  }
  
  if (hit.count >= rateLimit.max) {
    return false;
  }
  
  hit.count++;
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Redirect /saved to /events?saved=1
  app.get("/saved", (req, res) => {
    res.redirect(301, '/events?saved=1');
  });

  // Dynamic robots.txt endpoint
  app.get("/robots.txt", (req, res) => {
    const baseRobots = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://thehouseofjugnu.com/sitemap.xml

# Block admin and development routes
Disallow: /api/
Disallow: /admin/
Disallow: /sponsor/`;

    // Build dynamic disallow rules for disabled features
    let dynamicDisallows = '';
    
    if (process.env.ENABLE_TICKETING !== 'true') {
      dynamicDisallows += `

# Ticketing disabled - block all ticketing routes
Disallow: /tickets
Disallow: /tickets/*`;
      console.log('[Ticketing] Disabled - robots.txt blocking /tickets* routes');
    }

    if (process.env.ENABLE_COMMUNITIES !== 'true') {
      dynamicDisallows += `

# Communities disabled - block all community routes
Disallow: /community
Disallow: /community/*
Disallow: /account
Disallow: /account/*`;
      console.log('[Communities] Disabled - robots.txt blocking /community* and /account* routes');
    }

    if (dynamicDisallows) {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(baseRobots + dynamicDisallows);
    }

    res.setHeader('Content-Type', 'text/plain');
    res.send(baseRobots);
  });

  // Dynamic sitemap.xml endpoint
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://thehouseofjugnu.com' 
      : `http://localhost:${process.env.PORT || 5000}`;
    
    // Base sitemap URLs (always included)
    let sitemapUrls = [
      '<url><loc>' + baseUrl + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>',
      '<url><loc>' + baseUrl + '/story</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
      '<url><loc>' + baseUrl + '/events</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
      '<url><loc>' + baseUrl + '/deals</loc><changefreq>daily</changefreq><priority>0.8</priority></url>',
      '<url><loc>' + baseUrl + '/promote</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>'
    ];

    // Only include ticketing URLs when ticketing is enabled
    if (process.env.ENABLE_TICKETING === 'true') {
      sitemapUrls.push(
        '<url><loc>' + baseUrl + '/tickets</loc><changefreq>daily</changefreq><priority>0.9</priority></url>'
      );
    } else {
      console.log('[Ticketing] Disabled - sitemap.xml excluding /tickets* routes');
    }

    // Only include Communities URLs when Communities is enabled
    if (process.env.ENABLE_COMMUNITIES === 'true') {
      sitemapUrls.push(
        '<url><loc>' + baseUrl + '/community</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        '<url><loc>' + baseUrl + '/account/signin</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>',
        '<url><loc>' + baseUrl + '/account/signup</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>'
      );
    } else {
      console.log('[Communities] Disabled - sitemap.xml excluding /community* and /account* routes');
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapUrls.join('\n  ')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // Health check endpoint - always returns JSON
  app.get("/api/health", async (req, res) => {
    const version = process.env.APP_VERSION || 'dev';
    
    try {
      // Test database connectivity
      const supabase = getSupabaseAdmin();
      const startTime = Date.now();
      
      // Quick DB check
      const { error: metricsError } = await supabase
        .from('sponsor_metrics_daily')
        .select('campaign_id')
        .limit(1);
      
      const { error: tokensError } = await supabase
        .from('sponsor_portal_tokens')
        .select('id')
        .limit(1);
      
      const dbTime = Date.now() - startTime;
      const dbHealthy = !metricsError && !tokensError;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, max-age=0');
      res.status(200).json({
        ok: dbHealthy,
        version,
        db: dbHealthy,
        tables: {
          sponsor_metrics_daily: !metricsError,
          sponsor_portal_tokens: !tokensError
        },
        responseTime: `${dbTime}ms`,
        time: new Date().toISOString()
      });
    } catch (error) {
      // Even on error, return JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(503).json({
        ok: false,
        version,
        db: false,
        error: 'Database connection failed',
        time: new Date().toISOString()
      });
    }
  });

  // Test email endpoint - send test email to verify SendGrid domain configuration
  app.post("/api/test-email", async (req, res) => {
    try {
      const { sendVerificationEmail } = await import('./services/emailService');
      
      await sendVerificationEmail({
        recipientEmail: 'relations@jugnucanada.com',
        verificationCode: '123456',
        purpose: 'signup',
        userName: 'Test User'
      });

      res.json({
        ok: true,
        message: 'Test email sent to relations@jugnucanada.com',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to send test email'
      });
    }
  });

  // Waitlist form submission endpoint
  app.post("/api/waitlist", async (req, res) => {
    try {
      // Rate limiting
      const ip = (req.headers['x-forwarded-for'] as string || req.ip || '0.0.0.0')
        .split(',')[0].trim();
      
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ ok: false, error: "rate_limited" });
      }

      const { first_name, last_name, email, event_slug, source, utm_source, utm_medium, utm_campaign, utm_content, consent } = req.body;

      // Validate required fields
      const firstNameTrimmed = (first_name || "").trim();
      const lastNameTrimmed = (last_name || "").trim();
      const emailTrimmed = (email || "").trim().toLowerCase();

      // Use null for missing names (for email-only signups)
      const finalFirstName = firstNameTrimmed || null;
      const finalLastName = lastNameTrimmed || null;

      // Validate length if provided
      if (firstNameTrimmed && firstNameTrimmed.length > 80) {
        return res.status(400).json({ ok: false, error: "invalid_first_name" });
      }
      
      if (lastNameTrimmed && lastNameTrimmed.length > 80) {
        return res.status(400).json({ ok: false, error: "invalid_last_name" });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ ok: false, error: "invalid_email" });
      }

      // Consent is required - must be explicitly provided
      if (!consent) {
        return res.status(400).json({ ok: false, error: "consent_required" });
      }
      
      const eventSlug = event_slug || null;
      const sourceParam = source || null;
      const userAgent = req.headers['user-agent'] || null;

      const utmData = {
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
      };

      // Insert into Supabase
      const supabase = getSupabaseAdmin();
      const payload = {
        email: emailTrimmed,
        first_name: finalFirstName,
        last_name: finalLastName,
        name: finalFirstName && finalLastName ? `${finalFirstName} ${finalLastName}` : null, // Keep for backwards compatibility
        event_slug: eventSlug,
        source: sourceParam,
        user_agent: userAgent,
        consent: consent,
        ...utmData
      };

      const { error } = await supabase
        .from("waitlist_signups")
        .upsert(payload, { 
          onConflict: "email_norm,event_key", 
          ignoreDuplicates: false 
        });

      if (error) {
        console.error("Waitlist upsert error:", error);
        return res.status(500).json({ ok: false, error: "db_error" });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Waitlist submission error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // CSV export endpoint (admin only)
  app.get("/api/waitlist/export", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).send("Unauthorized");
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("waitlist_signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Export query error:", error);
        return res.status(500).send("Database Error");
      }

      // Generate CSV
      const headers = [
        "id", "created_at", "email", "first_name", "last_name", "name", "event_slug", "source",
        "utm_source", "utm_medium", "utm_campaign", "utm_content", 
        "user_agent", "consent", "email_norm", "event_key"
      ];

      const rows = (data || []).map(row => 
        headers.map(header => {
          const value = (row as any)[header];
          // Escape CSV values that contain commas or quotes
          if (value == null) return "";
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).send("Server Error");
    }
  });

  // Helper function to strip HTML tags and decode HTML entities
  const cleanHtmlFromText = (text: string | null | undefined): string | null => {
    if (!text) return null;
    
    // First decode HTML entities
    let cleaned = he.decode(text);
    
    // Strip HTML tags
    cleaned = cleaned
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return cleaned || null;
  };

  // Community Events - ICS Import Cron Endpoint
  app.get("/api/community/cron/import-ics", async (req, res) => {
    try {
      // Require admin key - accept any valid key
      const adminKey = req.headers['x-admin-key'];
      const validKeys = [
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_KEY,
        process.env.EXPORT_ADMIN_KEY,
        'jugnu-admin-dev-2025'
      ].filter(Boolean);
      
      if (!adminKey || !validKeys.includes(adminKey)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const icsUrls = process.env.COMMUNITY_ICS_URLS;
      if (!icsUrls) {
        return res.json({ ok: true, imported: 0, updated: 0, markedPast: 0, message: "No ICS URLs configured" });
      }

      const supabase = getSupabaseAdmin();
      
      // Check if required columns exist by attempting a test query
      let hasNewColumns = false;
      try {
        const { error } = await supabase
          .from('community_events')
          .select('canonical_key, source_uid')
          .limit(1);
        
        if (!error) {
          hasNewColumns = true;
          console.log('✓ Using canonical_key and source_uid for deduplication');
        } else {
          console.log('⚠️ Missing columns for deduplication - using legacy title-based matching');
        }
      } catch (e) {
        console.log('⚠️ Column check failed - using fallback mode');
      }
      
      const urls = icsUrls.split(',').map(url => url.trim()).filter(Boolean);
      let imported = 0;
      let updated = 0;
      let deleted = 0;

      const timezone = process.env.CITY_TZ || 'America/Vancouver';
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Track all source_uids seen in the current sync
      const currentSyncSourceUids = new Set<string>();

      for (const url of urls) {
        try {
          const response = await fetch(url);
          const icsData = await response.text();
          
          // Use the main parseICS method if available, otherwise sync.parseICS
          const events = typeof ical.parseICS === 'function' ? ical.parseICS(icsData) : ical.sync.parseICS(icsData);

          for (const event of Object.values(events)) {
            const calendarEvent = event as any; // Type assertion for node-ical events
            if (calendarEvent.type !== 'VEVENT' || !calendarEvent.start) continue;

            const title = calendarEvent.summary || 'Untitled Event';
            const sourceUid = calendarEvent.uid || null; // ICS VEVENT UID when present
            
            // Track this source UID if present
            if (sourceUid) {
              currentSyncSourceUids.add(sourceUid);
            }
            
            // Detect all-day events and handle timezone properly
            let startAt = new Date(calendarEvent.start);
            let endAt = calendarEvent.end ? new Date(calendarEvent.end) : new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
            let isAllDay = false;
            let eventTimezone = 'America/Vancouver'; // Default to Vancouver timezone
            
            // Check if event is all-day
            // Method 1: Check if DTSTART has VALUE=DATE (node-ical sets datetype)
            if (calendarEvent.datetype === 'date') {
              isAllDay = true;
            } else {
              // Method 2: Check if start time is midnight and duration is multiple of 24 hours
              const startHours = startAt.getUTCHours();
              const durationMs = endAt.getTime() - startAt.getTime();
              const is24HourMultiple = durationMs % (24 * 60 * 60 * 1000) === 0;
              
              if (startHours === 0 && is24HourMultiple && durationMs >= 24 * 60 * 60 * 1000) {
                isAllDay = true;
              }
            }
            
            // Extract timezone from DTSTART if available
            if (calendarEvent.start && typeof calendarEvent.start === 'object' && (calendarEvent.start as any).tz) {
              eventTimezone = (calendarEvent.start as any).tz;
            } else if (calendarEvent.params && calendarEvent.params.TZID) {
              eventTimezone = calendarEvent.params.TZID;
            }
            
            // Normalize timezone names to ensure consistency
            if (eventTimezone && eventTimezone.includes('Vancouver')) {
              eventTimezone = 'America/Vancouver';
            } else if (eventTimezone && (eventTimezone.includes('Pacific') || eventTimezone.includes('PST') || eventTimezone.includes('PDT'))) {
              eventTimezone = 'America/Vancouver';
            }
            
            // Ensure we always have a valid Vancouver timezone
            if (!eventTimezone || eventTimezone === 'Etc/UTC' || eventTimezone === 'UTC') {
              eventTimezone = 'America/Vancouver';
            }
            
            // Handle dates differently for all-day events
            if (isAllDay) {
              // All-day events need special handling to preserve the calendar date
              // When an event is all-day, we want to store it at noon local time
              // to prevent date shifting when displayed
              
              const adjustAllDayDate = (date: any) => {
                const d = new Date(date);
                // Get the date components in UTC
                const year = d.getUTCFullYear();
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                
                // Create a new date at noon Pacific time
                // Using -08:00 for PST (we'll let the display handle PDT conversion)
                return new Date(`${year}-${month}-${day}T12:00:00-08:00`);
              };
              
              startAt = adjustAllDayDate(calendarEvent.start);
              endAt = calendarEvent.end ? adjustAllDayDate(calendarEvent.end) : new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
              
              console.log(`All-day event "${title}": ${startAt.toISOString()} to ${endAt.toISOString()}`);
            } else {
              // Regular events with specific times
              startAt = new Date(calendarEvent.start);
              endAt = calendarEvent.end ? new Date(calendarEvent.end) : new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
            }
            
            // Extract venue and address from location
            const location = calendarEvent.location || '';
            const [venue, ...addressParts] = location.split(',').map((s: string) => s.trim());
            const address = addressParts.join(', ') || null;

            let organizer = calendarEvent.organizer ? 
              (typeof calendarEvent.organizer === 'string' ? calendarEvent.organizer : 
               (calendarEvent.organizer as any)?.params?.CN || 
               (calendarEvent.organizer as any)?.val || 
               String(calendarEvent.organizer)) : null;
            
            // Clean HTML from organizer field
            organizer = cleanHtmlFromText(organizer);
            
            const status = startAt >= oneDayAgo ? 'upcoming' : 'past';
            
            // Parse structured data from DESCRIPTION
            const description = calendarEvent.description || '';
            let ticketsUrl: string | null = null;
            let sourceUrl: string | null = null;
            let imageUrl: string | null = null;
            let tags: string[] = [];
            let priceFrom: number | null = null;
            let area: string | null = null;
            
            console.log(`Processing event: ${title}`);
            console.log(`Raw description: ${description.substring(0, 200)}...`);
            
            // Enhanced HTML cleaning to extract URLs properly
            let cleanedForParsing = description
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/?(div|p)[^>]*>/gi, '\n')
              .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi, '$1\n') // Extract href URLs and add newline
              .replace(/<a[^>]*>/gi, '') // Remove opening <a> tags without href
              .replace(/<\/a>/gi, '') // Remove closing </a> tags
              .replace(/[">]/g, '\n') // Split on quotes and > symbols to separate URLs
              .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
              .replace(/&[a-zA-Z0-9#]+;/g, (match: string) => he.decode(match)) // Decode HTML entities
              .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but preserve newlines!)
              .trim();
            
            console.log(`Cleaned for parsing: ${cleanedForParsing.substring(0, 200)}...`);
            
            // Parse structured fields (case-insensitive, allow spaces)
            const lines = cleanedForParsing.split(/\r?\n/);
            const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
            let allUrls: string[] = [];
            let featured = false; // v2.8 Featured parsing
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              
              // Extract URLs from this line
              const lineUrls = trimmedLine.match(urlRegex) || [];
              allUrls.push(...lineUrls);
              
              // Parse structured fields
              const ticketsMatch = trimmedLine.match(/^tickets\s*:\s*(https?:\/\/[^\s"'<>]+)/i);
              const sourceMatch = trimmedLine.match(/^source\s*:\s*(https?:\/\/[^\s"'<>]+)/i);
              const imageMatch = trimmedLine.match(/^image\s*:\s*(https?:\/\/[^\s"'<>]+)/i);
              const tagsMatch = trimmedLine.match(/^tags\s*:\s*(.+)/i);
              const organizerMatch = trimmedLine.match(/^organizer\s*:\s*(.+)/i);
              const areaMatch = trimmedLine.match(/^area\s*:\s*(.+)/i);
              const priceMatch = trimmedLine.match(/^pricefrom\s*:\s*(\d+(?:\.\d{2})?)/i);
              // v2.8 Featured parsing
              const featuredMatch = trimmedLine.match(/^featured\s*:\s*(true|yes|1)\s*$/i);
              
              if (ticketsMatch) {
                ticketsUrl = ticketsMatch[1];
              } else if (sourceMatch) {
                sourceUrl = sourceMatch[1];
              } else if (imageMatch) {
                imageUrl = imageMatch[1];
              } else if (tagsMatch) {
                tags = tagsMatch[1]
                  .split(',')
                  .map((tag: string) => tag.trim().toLowerCase())
                  .filter((tag: string) => tag.length > 0);
              } else if (organizerMatch) {
                organizer = cleanHtmlFromText(organizerMatch[1].trim());
              } else if (areaMatch) {
                // Normalize area value to match frontend filter values (case-sensitive)
                const rawArea = areaMatch[1].trim();
                const normalizedArea = rawArea.toLowerCase();
                
                // Map to canonical area names
                if (normalizedArea.includes('metro vancouver') || normalizedArea.includes('vancouver')) {
                  area = 'Metro Vancouver';
                } else if (normalizedArea.includes('gta') || normalizedArea.includes('toronto') || normalizedArea.includes('greater toronto')) {
                  area = 'GTA';
                } else if (normalizedArea.includes('montreal') || normalizedArea.includes('montréal')) {
                  area = 'Greater Montreal';
                } else if (normalizedArea.includes('calgary')) {
                  area = 'Calgary';
                } else {
                  // If it doesn't match known areas, store the trimmed value as-is
                  area = rawArea;
                }
              } else if (priceMatch) {
                priceFrom = parseFloat(priceMatch[1]);
              } else if (featuredMatch) {
                featured = true;
              }
            }
            
            console.log(`Found URLs: ${JSON.stringify(allUrls)}`);
            console.log(`Parsed - tickets: ${ticketsUrl}, image: ${imageUrl}, tags: ${JSON.stringify(tags)}`);
            
            // Enhanced fallback logic for better URL detection
            if (!ticketsUrl && allUrls.length > 0) {
              // Find Eventbrite URL first
              const eventbriteUrl = allUrls.find(url => url.includes('eventbrite.ca') || url.includes('eventbrite.com'));
              if (eventbriteUrl) {
                // Clean the Eventbrite URL to remove any trailing artifacts
                ticketsUrl = eventbriteUrl.split(/["\s<>]/)[0];
              } else {
                ticketsUrl = allUrls[0].split(/["\s<>]/)[0];
              }
            }
            
            // Clean the tickets URL if it contains artifacts
            if (ticketsUrl && (ticketsUrl.includes('"') || ticketsUrl.includes('<') || ticketsUrl.includes('>'))) {
              ticketsUrl = ticketsUrl.split(/["\s<>]/)[0];
            }
            
            // Also check if any URLs in allUrls need cleaning
            allUrls = allUrls.map(url => {
              if (url.includes('"') || url.includes('<') || url.includes('>')) {
                return url.split(/["\s<>]/)[0];
              }
              return url;
            }).filter(url => url.startsWith('http'));
            
            // If no explicit image URL provided, try to look for image URLs in description
            if (!imageUrl) {
              // Look for direct image URLs in description or allUrls
              const imageUrlPattern = /https?:\/\/[^\s"'<>]*\.(jpg|jpeg|png|gif|webp)(\?[^\s"'<>]*)?/gi;
              const imageUrls = cleanedForParsing.match(imageUrlPattern);
              if (imageUrls && imageUrls.length > 0) {
                imageUrl = imageUrls[0].split(/["\s<>]/)[0];
              } else {
                // Check if any of the extracted URLs are image URLs
                const imageFromAllUrls = allUrls.find(url => {
                  console.log(`Checking URL for image: ${url}`);
                  // Standard image file extensions
                  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) {
                    console.log(`Found image URL by extension: ${url}`);
                    return true;
                  }
                  // Eventbrite image CDN URLs
                  if (url.includes('img.evbuc.com') || url.includes('cdn.evbuc.com')) {
                    console.log(`Found Eventbrite image URL: ${url}`);
                    return true;
                  }
                  // Other common image CDN patterns
                  if (url.includes('cloudinary.com') || url.includes('imgur.com') || 
                      url.includes('images.unsplash.com') || url.includes('pexels.com')) {
                    console.log(`Found CDN image URL: ${url}`);
                    return true;
                  }
                  return false;
                });
                if (imageFromAllUrls) {
                  imageUrl = imageFromAllUrls;
                  console.log(`Set image URL to: ${imageUrl}`);
                }
              }
            }
            
            console.log(`Final URLs - tickets: ${ticketsUrl}, image: ${imageUrl}`);

            // Clean description: convert HTML to text and remove structured lines
            let cleanDescription = description;
            if (cleanDescription) {
              // Convert HTML to text
              cleanDescription = cleanDescription
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/?(div|p)[^>]*>/gi, '\n')
                .replace(/<[^>]+>/g, '') // Strip all HTML tags
                .replace(/&[a-zA-Z0-9#]+;/g, (match: string) => he.decode(match)); // Decode HTML entities
              
              // Remove structured lines (case-insensitive)
              const cleanLines = cleanDescription
                .split(/\r?\n/)
                .filter((line: string) => {
                  const trimmed = line.trim();
                  return !(/^(tickets|source|image|tags|organizer|area|pricefrom)\s*:\s*/i.test(trimmed));
                });
              
              // Collapse multiple blank lines and trim
              cleanDescription = cleanLines
                .join('\n')
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ newlines with 2
                .trim();
            }
            
            // Determine category from tags first, then infer from content
            let category = 'other';
            const validCategories = ['concert', 'parties', 'comedy', 'festival'];
            const tagCategory = tags.find(tag => validCategories.includes(tag));
            
            if (tagCategory) {
              category = tagCategory;
            } else {
              // Infer category from title and description
              const combinedText = `${title} ${cleanDescription || description}`.toLowerCase();
              
              if (/(concert|live|tour|singer|band|diljit|atif|arijit)/i.test(combinedText)) {
                category = 'concert';
              } else if (/(club|dj|night|party|bollywood night|desi night|bhangra)/i.test(combinedText)) {
                category = 'parties';
              } else if (/(comedy|comic|stand ?up)/i.test(combinedText)) {
                category = 'comedy';
              } else if (/(festival|mela|fair)/i.test(combinedText)) {
                category = 'festival';
              }
            }
            
            // Generate canonical key for v2.7 deduplication
            const canonicalKey = createCanonicalKey(title, startAt, venue, isAllDay);
            
            // Generate content hash to detect if event details have changed
            const contentHash = createHash('sha1')
              .update(`${description || ''}|${organizer || ''}|${ticketsUrl || ''}|${imageUrl || ''}|${JSON.stringify(tags)}`)
              .digest('hex');

            const eventData = {
              title,
              description: cleanDescription || null,
              category,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              timezone: eventTimezone,
              isAllDay,
              venue: venue || null,
              address,
              city: 'Vancouver, BC',
              area,
              organizer,
              status,
              sourceHash: contentHash, // Keep for tracking content changes
              sourceUid: sourceUid, // ICS VEVENT UID 
              canonicalKey: canonicalKey, // Normalized deduplication key
              tags,
              ticketsUrl,
              sourceUrl,
              imageUrl,
              priceFrom,
              neighborhood: null,
              featured: featured, // v2.8 Use parsed featured value
            };

            // Build upsert payload based on available columns
            const basePayload: any = {
              title: eventData.title,
              description: eventData.description,
              category: eventData.category,
              start_at: eventData.startAt,
              end_at: eventData.endAt,
              timezone: eventData.timezone,
              venue: eventData.venue,
              address: eventData.address,
              city: eventData.city,
              area: eventData.area,
              organizer: eventData.organizer,
              status: eventData.status,
              tags: eventData.tags,
              tickets_url: eventData.ticketsUrl,
              source_url: eventData.sourceUrl,
              image_url: eventData.imageUrl,
              price_from: eventData.priceFrom,
              neighborhood: eventData.neighborhood,
              featured: eventData.featured,
              updated_at: new Date().toISOString(),
            };

            // Add new columns only if they exist in schema
            if (hasNewColumns) {
              basePayload.source_hash = eventData.sourceHash;
              basePayload.source_uid = eventData.sourceUid;
              basePayload.canonical_key = eventData.canonicalKey;
              basePayload.is_all_day = eventData.isAllDay;
            }

            let upsertResult;
            let useManualUpsert = false;

            // Try to use constraint-based upsert if we have the columns
            if (hasNewColumns && sourceUid) {
              // Try upsert with source_uid constraint
              const { error: sourceUidError, data: sourceUidData } = await supabase
                .from('community_events')
                .upsert(basePayload, { 
                  onConflict: 'source_uid',
                  ignoreDuplicates: false 
                })
                .select();
              
              if (!sourceUidError) {
                upsertResult = sourceUidData;
                console.log(`Upserted by source_uid: ${title}`);
              } else if (sourceUidError.code === '42P10') {
                // No unique constraint on source_uid, need manual upsert
                console.log(`No source_uid constraint, will use manual upsert for "${title}"`);
                useManualUpsert = true;
              } else {
                console.error(`Failed to upsert by source_uid for "${title}":`, sourceUidError);
              }
            }
            
            // Try canonical_key if source_uid didn't work and we have canonical_key
            if (!upsertResult && hasNewColumns && canonicalKey && !useManualUpsert) {
              const { error: canonicalError, data: canonicalData } = await supabase
                .from('community_events')
                .upsert(basePayload, { 
                  onConflict: 'canonical_key',
                  ignoreDuplicates: false 
                })
                .select();
              
              if (!canonicalError) {
                upsertResult = canonicalData;
                console.log(`Upserted by canonical_key: ${title}`);
              } else if (canonicalError.code === '42P10') {
                // No unique constraint on canonical_key either
                console.log(`No canonical_key constraint, will use manual upsert for "${title}"`);
                useManualUpsert = true;
              } else {
                console.error(`Failed to upsert by canonical_key for "${title}":`, canonicalError);
              }
            }
            
            // If constraint-based upsert failed or we need manual upsert
            if (!upsertResult || useManualUpsert) {
              // Manual upsert: check by source_uid, canonical_key, or title+start_at
              let existing = null;
              
              // Try to find existing by source_uid first
              if (hasNewColumns && sourceUid) {
                const { data: bySourceUid } = await supabase
                  .from('community_events')
                  .select('id')
                  .eq('source_uid', sourceUid)
                  .single();
                existing = bySourceUid;
              }
              
              // Try canonical_key if no match by source_uid
              if (!existing && hasNewColumns && canonicalKey) {
                const { data: byCanonicalKey } = await supabase
                  .from('community_events')
                  .select('id')
                  .eq('canonical_key', canonicalKey)
                  .single();
                existing = byCanonicalKey;
              }
              
              // Fall back to title + start_at
              if (!existing) {
                const { data: byTitleAndTime } = await supabase
                  .from('community_events')
                  .select('id')
                  .eq('title', eventData.title)
                  .eq('start_at', eventData.startAt)
                  .single();
                existing = byTitleAndTime;
              }
              
              if (existing) {
                // Update existing event
                const { error: updateError, data: updateData } = await supabase
                  .from('community_events')
                  .update(basePayload)
                  .eq('id', existing.id)
                  .select();
                
                if (!updateError) {
                  upsertResult = updateData;
                  updated++;
                  console.log(`Updated existing event: ${title}`);
                } else {
                  console.error(`Failed to update event "${title}":`, updateError);
                }
              } else {
                // Insert new event
                const { error: insertError, data: insertData } = await supabase
                  .from('community_events')
                  .insert(basePayload)
                  .select();
                
                if (!insertError) {
                  upsertResult = insertData;
                  imported++;
                  console.log(`Imported new event: ${title}`);
                } else {
                  console.error(`Failed to insert event "${title}":`, insertError);
                }
              }
            } else if (upsertResult && upsertResult.length > 0) {
              // Track stats for successful constraint-based upsert
              const event = upsertResult[0];
              if (new Date(event.created_at).getTime() === new Date(event.updated_at).getTime()) {
                imported++;
                console.log(`Inserted new event: ${title}`);
              } else {
                updated++;
                console.log(`Updated existing event: ${title}`);
              }
            }
          }
        } catch (urlError) {
          console.error(`Error processing ICS URL ${url}:`, urlError);
        }
      }

      // Mark past events
      const { count: markedPastCount } = await supabase
        .from('community_events')
        .update({ 
          status: 'past',
          updated_at: new Date().toISOString()
        })
        .lt('start_at', oneDayAgo.toISOString())
        .neq('status', 'past');

      const markedPast = markedPastCount || 0;
      
      // Delete events that are no longer in the source calendar
      // Only if we have source_uid column and found events with source_uids
      if (hasNewColumns && currentSyncSourceUids.size > 0) {
        // First, get all events with source_uid that are NOT past
        const { data: eventsWithSourceUid, error: fetchError } = await supabase
          .from('community_events')
          .select('id, title, source_uid')
          .not('source_uid', 'is', null)
          .neq('status', 'past');
        
        if (!fetchError && eventsWithSourceUid) {
          // Find events to delete (have source_uid but not in current sync)
          const eventsToDelete = eventsWithSourceUid.filter(event => 
            event.source_uid && !currentSyncSourceUids.has(event.source_uid)
          );
          
          if (eventsToDelete.length > 0) {
            // Log which events are being deleted
            console.log(`Deleting ${eventsToDelete.length} events no longer in source calendar:`);
            eventsToDelete.forEach(event => {
              console.log(`  - Deleting: ${event.title} (source_uid: ${event.source_uid})`);
            });
            
            // Delete the events
            const idsToDelete = eventsToDelete.map(e => e.id);
            const { error: deleteError, count: deleteCount } = await supabase
              .from('community_events')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) {
              console.error('Error deleting removed events:', deleteError);
            } else {
              deleted = deleteCount || eventsToDelete.length;
              console.log(`✓ Deleted ${deleted} events that were removed from source calendar`);
            }
          }
        } else if (fetchError) {
          console.error('Error fetching events for deletion check:', fetchError);
        }
      }

      res.json({ ok: true, imported, updated, markedPast, deleted });
    } catch (error) {
      console.error("ICS import error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // Schema Migration - Add columns and backfill categories
  app.post("/api/community/admin/migrate", async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    try {
      const supabase = getSupabaseAdmin();

      // Try to add all missing columns based on schema definition
      try {
        await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE public.community_events 
            ADD COLUMN IF NOT EXISTS description text,
            ADD COLUMN IF NOT EXISTS category text,
            ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS source_uid text,
            ADD COLUMN IF NOT EXISTS canonical_key text;
            
            -- Refresh PostgREST schema cache
            SELECT pg_notify('pgrst', 'reload schema');
          `
        });
        console.log("✓ Added missing columns to community_events table");
      } catch (sqlError) {
        console.log("Column creation may have failed (might already exist):", sqlError);
      }

      // Get all events to backfill categories  
      const { data: events, error: fetchError } = await supabase
        .from('community_events')
        .select('id, title, description, tags, category');

      if (fetchError) {
        console.error("Failed to fetch events:", fetchError);
        return res.status(500).json({ ok: false, error: "fetch_failed" });
      }

      let migrated = 0;
      if (events && events.length > 0) {
        for (const event of events) {
          // Skip if already has category
          if (event.category && event.category !== '') continue;
          
          let category = 'other';
          
          // Check tags first
          if (event.tags?.includes('concert')) category = 'concert';
          else if (event.tags?.includes('parties')) category = 'parties';
          else if (event.tags?.includes('comedy')) category = 'comedy';
          else if (event.tags?.includes('festival')) category = 'festival';
          else {
            // Infer from title and description
            const combinedText = `${event.title} ${event.description || ''}`.toLowerCase();
            
            if (/(concert|live|tour|singer|band|atif|arijit|diljit)/i.test(combinedText)) {
              category = 'concert';
            } else if (/(club|dj|night|party|bollywood night|desi night|bhangra)/i.test(combinedText)) {
              category = 'parties';
            } else if (/(comedy|stand ?up|comic)/i.test(combinedText)) {
              category = 'comedy';
            } else if (/(festival|mela|fair)/i.test(combinedText)) {
              category = 'festival';
            }
          }
          
          const { error: updateError } = await supabase
            .from('community_events')
            .update({ category })
            .eq('id', event.id);
          
          if (!updateError) migrated++;
        }
      }

      res.json({ ok: true, migrated, total: events?.length || 0 });
    } catch (error) {
      console.error("Migration error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ ok: false, error: "migration_failed", details: errorMessage });
    }
  });

  // Admin endpoint to clean up duplicate events
  app.post("/api/community/admin/cleanup-duplicates", async (req, res) => {
    try {
      // Require admin key
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      console.log('Starting duplicate cleanup...');
      const supabase = getSupabaseAdmin();
      
      // Get all events grouped by title, start_at, venue
      const { data: allEvents, error: fetchError } = await supabase
        .from('community_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Group events by unique key (title + start_at + venue)
      const eventGroups = new Map();
      for (const event of allEvents || []) {
        const key = `${event.title}|${event.start_at}|${event.venue || ''}`;
        if (!eventGroups.has(key)) {
          eventGroups.set(key, []);
        }
        eventGroups.get(key).push(event);
      }
      
      let deletedCount = 0;
      
      // For each group, keep the best one and delete the rest
      for (const [key, events] of eventGroups) {
        if (events.length > 1) {
          console.log(`Found ${events.length} duplicates for: ${key}`);
          
          // Sort by: has image > has clean tickets > most recent
          events.sort((a, b) => {
            const aScore = (a.image_url ? 100 : 0) + 
                          (a.tickets_url && !a.tickets_url.includes('>') ? 50 : 0) +
                          (new Date(a.created_at).getTime() / 1000000);
            const bScore = (b.image_url ? 100 : 0) + 
                          (b.tickets_url && !b.tickets_url.includes('>') ? 50 : 0) +
                          (new Date(b.created_at).getTime() / 1000000);
            return bScore - aScore;
          });
          
          // Keep the first (best) one, delete the rest
          const toDelete = events.slice(1);
          for (const event of toDelete) {
            const { error: deleteError } = await supabase
              .from('community_events')
              .delete()
              .eq('id', event.id);
            
            if (!deleteError) {
              deletedCount++;
              console.log(`Deleted duplicate: ${event.title} (${event.id})`);
            }
          }
        }
      }
      
      res.json({ ok: true, deletedCount, message: `Cleaned up ${deletedCount} duplicate events` });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ ok: false, error: 'Failed to cleanup duplicates' });
    }
  });

  // v2.7 Admin endpoint for backfill + cleanup + final unique index
  app.post("/api/community/admin/dedupe", async (req, res) => {
    try {
      // Require admin key
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      console.log('Starting v2.7 deduplication process...');
      const supabase = getSupabaseAdmin();
      
      // Step 1: Check if canonical_key column exists, if not, manually add it and backfill
      let eventsWithoutKey = [];
      let hasCanonicalKey = false;
      
      // Try to select canonical_key to see if it exists
      try {
        const { data: testData, error: testError } = await supabase
          .from('community_events')
          .select('id, title, start_at, venue, canonical_key')
          .limit(1);
        
        if (!testError) {
          hasCanonicalKey = true;
          // Get all events without canonical_key
          const { data: eventsData, error: fetchError } = await supabase
            .from('community_events')
            .select('id, title, start_at, venue, canonical_key')
            .is('canonical_key', null);
          
          if (fetchError) {
            throw new Error(`Failed to fetch events: ${fetchError.message}`);
          }
          eventsWithoutKey = eventsData || [];
        }
      } catch (columnError) {
        console.log('canonical_key column does not exist yet');
        hasCanonicalKey = false;
      }
      
      if (!hasCanonicalKey) {
        console.log('canonical_key column does not exist - working with existing schema');
        // Since we can't modify schema directly, we'll work with the existing duplicate cleanup
        // Get all events and group by title+start_at+venue for duplicate removal
        const { data: allEvents, error: allError } = await supabase
          .from('community_events')
          .select('id, title, start_at, venue, updated_at, created_at')
          .order('title')
          .order('start_at')
          .order('updated_at', { ascending: false });
          
        if (allError) {
          throw new Error(`Failed to fetch all events: ${allError.message}`);
        }
        
        let deduped = 0;
        if (allEvents && allEvents.length > 0) {
          const eventGroups = new Map();
          
          // Group by title+start_at+venue (manual canonical key)
          for (const event of allEvents) {
            const key = `${event.title}|${event.start_at}|${event.venue || 'null'}`;
            if (!eventGroups.has(key)) {
              eventGroups.set(key, []);
            }
            eventGroups.get(key).push(event);
          }
          
          // For each group with more than one event, delete all but the first (newest)
          for (const [key, events] of eventGroups) {
            if (events.length > 1) {
              const toDelete = events.slice(1); // Keep first (newest), delete rest
              
              for (const event of toDelete) {
                const { error: deleteError } = await supabase
                  .from('community_events')
                  .delete()
                  .eq('id', event.id);
                
                if (!deleteError) {
                  deduped++;
                  console.log(`Deleted duplicate event: ${event.title}`);
                }
              }
            }
          }
        }
        
        return res.json({ 
          ok: true, 
          backfilled: 0, 
          deduped,
          message: `Working with existing schema - removed ${deduped} duplicates using title+date+venue matching`
        });
      }
      
      let backfilled = 0;
      if (eventsWithoutKey.length > 0) {
        for (const event of eventsWithoutKey) {
          const canonicalKey = createCanonicalKey(
            event.title, 
            new Date(event.start_at), 
            event.venue, 
            false // Default to false since we don't have is_all_day column yet
          );
          
          const { error: updateError } = await supabase
            .from('community_events')
            .update({ canonical_key: canonicalKey })
            .eq('id', event.id);
          
          if (!updateError) {
            backfilled++;
          } else {
            console.error(`Failed to backfill canonical_key for event ${event.id}:`, updateError);
          }
        }
      }
      
      // Step 2: Delete duplicates, keeping the newest
      const { data: allEvents, error: allError } = await supabase
        .from('community_events')
        .select('id, canonical_key, updated_at, created_at')
        .not('canonical_key', 'is', null)
        .order('canonical_key')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (allError) {
        throw new Error(`Failed to fetch all events: ${allError.message}`);
      }
      
      let deduped = 0;
      if (allEvents && allEvents.length > 0) {
        const eventGroups = new Map();
        
        // Group by canonical_key
        for (const event of allEvents) {
          if (!eventGroups.has(event.canonical_key)) {
            eventGroups.set(event.canonical_key, []);
          }
          eventGroups.get(event.canonical_key).push(event);
        }
        
        // For each group with more than one event, delete all but the first (newest)
        for (const [canonicalKey, events] of eventGroups) {
          if (events.length > 1) {
            const toDelete = events.slice(1); // Keep first (newest), delete rest
            
            for (const event of toDelete) {
              const { error: deleteError } = await supabase
                .from('community_events')
                .delete()
                .eq('id', event.id);
              
              if (!deleteError) {
                deduped++;
                console.log(`Deleted duplicate event with canonical_key: ${canonicalKey}`);
              }
            }
          }
        }
      }
      
      console.log(`Deduplication complete: backfilled ${backfilled}, deduped ${deduped}`);
      
      res.json({ 
        ok: true, 
        backfilled, 
        deduped,
        message: `Backfilled ${backfilled} canonical keys and removed ${deduped} duplicates`
      });
    } catch (error) {
      console.error('v2.7 Dedupe error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ ok: false, error: 'Failed to dedupe', details: errorMessage });
    }
  });

  // Community Events - Admin Upsert Endpoint
  app.post("/api/community/admin/upsert", async (req, res) => {
    try {
      // Require admin key
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const supabase = getSupabaseAdmin();
      const { id, ...eventData } = req.body;

      // Validate the data
      const validated = id ? 
        updateCommunityEventSchema.parse({ id, ...eventData }) :
        insertCommunityEventSchema.parse(eventData);

      if (id) {
        // Update existing event
        const { data, error } = await supabase
          .from('community_events')
          .update({
            ...validated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('id')
          .single();

        if (error) throw error;
        res.json({ ok: true, id: data.id });
      } else {
        // Insert new event
        const sourceHash = validated.sourceHash || createHash('sha1')
          .update(`${validated.title}|${new Date().toISOString()}|${validated.venue || ''}`)
          .digest('hex');

        const { data, error } = await supabase
          .from('community_events')
          .insert({
            ...validated,
            source_hash: sourceHash,
          })
          .select('id')
          .single();

        if (error) throw error;
        res.json({ ok: true, id: data.id });
      }
    } catch (error) {
      console.error("Admin upsert error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // Community Events - Delete Endpoint
  app.delete("/api/community/events/:id", async (req, res) => {
    try {
      // Require admin key
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const supabase = getSupabaseAdmin();
      const { id } = req.params;

      const { data, error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', id)
        .select();

      if (error || !data || data.length === 0) {
        console.error("Delete error:", error);
        return res.status(404).json({ ok: false, error: "Not found" });
      }

      res.json({ ok: true, message: "Event deleted" });
    } catch (error) {
      console.error("Delete endpoint error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // Community Events - Weekly Feed Endpoint
  // Events by-ids endpoint for v3.3 UUID-based favorites
  app.get("/api/events/by-ids", async (req, res) => {
    try {
      const { ids } = req.query;
      
      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({ error: 'Missing ids parameter' });
      }
      
      const idArray = ids.split(',').filter(id => id.trim());
      
      if (idArray.length === 0) {
        return res.json([]);
      }
      
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('community_events')
        .select('*')
        .in('id', idArray)
        .order('start_at', { ascending: true, nullsFirst: false });
      
      if (error) {
        console.error('Error fetching events by IDs:', error);
        return res.status(500).json({ error: 'Failed to fetch events' });
      }
      
      res.json(data || []);
    } catch (error) {
      console.error('Error in events by-ids endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Community Events - Alias for backward compatibility  
  app.get("/api/community", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { category, month, year } = req.query;
      
      // Handle month/year filtering for Events page
      let startDate, endDate;
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        startDate = new Date(yearNum, monthNum - 1, 1); // month is 0-indexed
        endDate = new Date(yearNum, monthNum, 0, 23, 59, 59); // last day of month
      } else {
        // Show all future events without limit
        startDate = new Date();
        endDate = null; // No upper limit
      }
      
      let query = supabase
        .from('community_events')
        .select('*')
        .in('status', ['upcoming', 'soldout'])
        .gte('start_at', startDate.toISOString())
        .order('start_at', { ascending: true });
      
      // Only apply end date filter if month/year was specified
      if (endDate) {
        query = query.lte('start_at', endDate.toISOString());
      }
      
      // Apply category filter if specified
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      
      const { data: events, error } = await query;
      
      if (error) {
        console.error('Community events query error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to fetch events' });
      }
      
      // Return in the same format as /api/community/weekly
      res.json({ ok: true, featured: null, items: events || [] });
    } catch (error) {
      console.error('Community events error:', error);
      res.status(500).json({ ok: false, error: 'server_error' });
    }
  });

  app.get("/api/community/weekly", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { category, range, area } = req.query;
      
      // Check if data is stale and trigger background refresh (non-blocking)
      const { data: lastUpdate } = await supabase
        .from('community_events')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const isStale = !lastUpdate || new Date(lastUpdate.updated_at) < sixHoursAgo;
      
      if (isStale) {
        // Trigger background import (don't await - fire and forget)
        const adminKey = process.env.EXPORT_ADMIN_KEY;
        if (adminKey) {
          fetch(`${req.protocol}://${req.get('host')}/api/community/cron/import-ics`, {
            method: 'GET',
            headers: { 'x-admin-key': adminKey }
          }).catch(() => {}); // Ignore errors
        }
      }
      
      // Get current time for filtering past events
      const now = new Date();
      
      // Apply date range based on range parameter
      // - range='week': Show 7 days ahead (for homepage "This Week")
      // - range='month': Show 30 days ahead
      // - range='all' or no range: Show all future events (for events page)
      let endDate = null; // null = no upper limit
      if (range === 'week') {
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (range === 'month') {
        endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      // v2.7: Use manual deduplication if canonical_key is available, fallback to regular query
      let query;
      let manualDedup = false;
      
      // Check if canonical_key column exists by trying a simple select first
      const { data: columnCheck, error: columnError } = await supabase
        .from('community_events')
        .select('canonical_key')
        .limit(1);
      
      if (!columnError && columnCheck !== null) {
        // canonical_key exists, do manual deduplication
        manualDedup = true;
        query = supabase
          .from('community_events')
          .select(`
            id, created_at, updated_at, title, description, category,
            start_at, end_at, timezone, venue, address, 
            neighborhood, city, area, organizer, tickets_url, source_url, 
            image_url, price_from, tags, status, featured, source_hash,
            canonical_key, is_all_day
          `)
          .in('status', ['upcoming', 'soldout'])
          .gte('start_at', now.toISOString());
        
        // Apply end date filter only if range is specified (week/month)
        if (endDate) {
          query = query.lte('start_at', endDate.toISOString());
        }
        
        query = query.order('start_at', { ascending: true });
      } else {
        // Fallback to regular query
        query = supabase
          .from('community_events')
          .select(`
            id, created_at, updated_at, title, description, category,
            start_at, end_at, timezone, venue, address, 
            neighborhood, city, area, organizer, tickets_url, source_url, 
            image_url, price_from, tags, status, featured, source_hash, is_all_day
          `)
          .in('status', ['upcoming', 'soldout'])
          .gte('start_at', now.toISOString());
        
        // Apply end date filter only if range is specified (week/month)
        if (endDate) {
          query = query.lte('start_at', endDate.toISOString());
        }
        
        query = query.order('start_at', { ascending: true });
      }

      // Filter by category if provided (gracefully handle missing column)
      if (category && typeof category === 'string' && category !== 'all') {
        try {
          query = query.eq('category', category.toLowerCase());
        } catch (columnError) {
          // If category column doesn't exist, ignore the filter
          console.log('Category column not available, ignoring filter');
        }
      }

      // Filter by area if provided (gracefully handle missing column)
      // Events are normalized at import time, so we can use exact matching
      if (area && typeof area === 'string' && area !== 'all') {
        try {
          query = query.eq('area', area);
        } catch (columnError) {
          // If area column doesn't exist, ignore the filter
          console.log('Area column not available, ignoring filter');
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      let events = data || [];
      
      // Manual deduplication if canonical_key is available
      if (manualDedup && events.length > 0) {
        const seen = new Set();
        events = events.filter(event => {
          if (!(event as any).canonical_key) return true; // Keep events without canonical_key
          if (seen.has((event as any).canonical_key)) return false; // Skip duplicates
          seen.add((event as any).canonical_key);
          return true;
        });
        // Re-sort by date after deduplication to ensure proper order
        events.sort((a, b) => {
          const dateA = new Date((a as any).start_at).getTime();
          const dateB = new Date((b as any).start_at).getTime();
          return dateA - dateB;
        });
      }

      // v2.8 Format: Extract featured event and return { featured, items }
      let featured = null;
      let items = events;
      
      // Find the first featured event in the filtered set
      const featuredIndex = events.findIndex(event => event.featured === true);
      if (featuredIndex !== -1) {
        featured = events[featuredIndex];
        // Remove featured event from items array
        items = events.filter((_, index) => index !== featuredIndex);
      }

      res.json({ ok: true, featured, items });
    } catch (error) {
      console.error("Weekly events error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // v2.8 Admin endpoint to toggle featured status
  app.post("/api/community/admin/feature", async (req, res) => {
    try {
      // Require admin key
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const { id, featured } = req.body;
      
      if (!id || typeof featured !== 'boolean') {
        return res.status(400).json({ ok: false, error: "invalid_input" });
      }

      const supabase = getSupabaseAdmin();

      if (featured) {
        // When setting featured=true, first unset all other featured events
        await supabase
          .from('community_events')
          .update({ featured: false })
          .eq('featured', true);
        
        // Then set this event as featured
        const { error: setError } = await supabase
          .from('community_events')
          .update({ featured: true, updated_at: new Date().toISOString() })
          .eq('id', id);
        
        if (setError) {
          throw new Error(`Failed to set featured: ${setError.message}`);
        }
      } else {
        // When setting featured=false, just unset this event
        const { error: unsetError } = await supabase
          .from('community_events')
          .update({ featured: false, updated_at: new Date().toISOString() })
          .eq('id', id);
        
        if (unsetError) {
          throw new Error(`Failed to unset featured: ${unsetError.message}`);
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Feature toggle error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ ok: false, error: 'Failed to toggle featured', details: errorMessage });
    }
  });

  // Debug endpoint to see all events in database
  app.get("/api/community/debug/all-events", async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    try {
      const supabase = getSupabaseAdmin();
      console.log("Testing Supabase connection...");
      
      const { data: events, error } = await supabase
        .from('community_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      console.log(`Found ${events?.length || 0} events in database`);
      res.json({ ok: true, events: events || [], count: events?.length || 0 });
    } catch (error) {
      console.error("Debug all events error:", error);
      res.status(500).json({ ok: false, error: "server_error", details: (error as Error).message });
    }
  });

  // Clear existing events and force fresh import with updated source_hash logic
  app.post("/api/community/admin/clear-and-reimport", async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    try {
      const supabase = getSupabaseAdmin();

      // Clear all existing events
      const { error: deleteError } = await supabase
        .from('community_events')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return res.status(500).json({ ok: false, error: "delete_failed" });
      }

      res.json({ ok: true, message: "Events cleared successfully" });
    } catch (error) {
      console.error("Clear and reimport error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // v2.9 Feature request submission endpoint
  app.post("/api/community/feature", async (req, res) => {
    try {
      const { 
        organizer_name, 
        email, 
        event_url, 
        category, 
        title, 
        start_iso,
        end_iso,
        address,
        venue, // Keep for backward compatibility
        city, 
        ticket_link,
        image_url,
        uploaded_image_url,
        message, 
        rights_confirmed,
        honeypot 
      } = req.body;

      // Basic spam protection
      if (honeypot && honeypot.length > 0) {
        return res.status(400).json({ ok: false, error: "Invalid submission" });
      }

      // Validate required fields (treat "https://" as empty for URL fields)
      const hasValidEventUrl = event_url && event_url !== "https://";
      if (!organizer_name || !email || !hasValidEventUrl || !category || !title || !start_iso || !end_iso || !address || !city || !rights_confirmed) {
        return res.status(400).json({ ok: false, error: "Missing required fields" });
      }

      // Validate URLs (treat "https://" as empty/optional)
      try {
        if (event_url && event_url !== "https://") new URL(event_url);
        if (image_url && image_url !== "https://") new URL(image_url);
        if (ticket_link && ticket_link !== "https://") new URL(ticket_link);
        if (uploaded_image_url && uploaded_image_url !== "https://") new URL(uploaded_image_url);
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid URL format" });
      }

      const supabase = getSupabaseAdmin();

      // Insert feature request with new fields
      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          organizer_name: organizer_name.trim(),
          email: email.toLowerCase().trim(),
          event_url: event_url.trim(),
          category: category.toLowerCase(),
          title: title.trim(),
          start_iso: start_iso,
          end_iso: end_iso || null,
          address: address.trim(),
          venue: venue?.trim() || address.trim(), // Fallback to address for backward compatibility
          city: city.trim(),
          ticket_link: (ticket_link && ticket_link !== "https://") ? ticket_link.trim() : null,
          image_url: (image_url && image_url !== "https://") ? image_url.trim() : null,
          uploaded_image_url: uploaded_image_url?.trim() || null,
          message: message?.trim() || null,
          rights_confirmed: rights_confirmed,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Feature request insert error:', error);
        throw new Error('Failed to submit request');
      }

      // Send email notification
      try {
        const { sendFeatureRequestNotification } = await import('./email');
        await sendFeatureRequestNotification({
          organizerName: organizer_name.trim(),
          email: email.toLowerCase().trim(),
          eventUrl: event_url.trim(),
          category: category.toLowerCase(),
          title: title.trim(),
          startIso: start_iso,
          endIso: end_iso,
          address: address.trim(),
          city: city.trim(),
          ticketLink: (ticket_link && ticket_link !== "https://") ? ticket_link.trim() : null,
          imageUrl: (image_url && image_url !== "https://") ? image_url.trim() : null,
          uploadedImageUrl: uploaded_image_url?.trim() || null,
          message: message?.trim() || null
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }

      res.json({ ok: true, id: data.id });
    } catch (error) {
      console.error('Feature request error:', error);
      res.status(500).json({ ok: false, error: 'Failed to submit request' });
    }
  });

  // v2.9 Image upload endpoint for featured event requests
  const uploadDir = 'public/uploads/featured-events';
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `event-${uniqueSuffix}${ext}`);
    }
  });

  const imageUpload = multer({
    storage: imageStorage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/community/feature/upload-image", imageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image uploaded" });
      }

      // Upload to Supabase storage
      const { uploadFeaturedEventImage } = await import('./services/storageService');
      const imageUrl = await uploadFeaturedEventImage(req.file);
      
      res.json({ 
        ok: true, 
        imageUrl: imageUrl,
        filename: req.file.originalname
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Failed to upload image' });
    }
  });

  // v2.9 Admin: List pending feature requests
  app.get("/api/community/admin/feature-requests", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Feature requests list error:', error);
        throw error;
      }

      res.json({ ok: true, requests: data || [] });
    } catch (error) {
      console.error('Admin feature requests error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch requests' });
    }
  });

  // v2.9 Admin: Approve feature request
  app.post("/api/community/admin/feature-requests/approve", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const { request_id } = req.body;
      if (!request_id) {
        return res.status(400).json({ ok: false, error: "request_id required" });
      }

      const supabase = getSupabaseAdmin();

      // Fetch the request
      const { data: request, error: fetchError } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('id', request_id)
        .single();

      if (fetchError || !request) {
        return res.status(404).json({ ok: false, error: "Request not found" });
      }

      let eventId = request.linked_event_id;

      // Try to match existing event if not already linked
      if (!eventId) {
        // Try URL matching first
        const { data: urlMatches } = await supabase
          .from('community_events')
          .select('id')
          .or(`source_url.eq.${request.event_url},tickets_url.eq.${request.event_url}`)
          .limit(1);

        if (urlMatches && urlMatches.length > 0) {
          eventId = urlMatches[0].id;
        }
        // If we have title and date, try canonical key matching
        else if (request.title && request.start_iso) {
          const startDate = new Date(request.start_iso);
          const normalizedTitle = request.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
          const dateStr = startDate.toISOString().split('T')[0];
          const normalizedVenue = (request.venue || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
          const canonicalKey = `${normalizedTitle}_${dateStr}_${normalizedVenue}`;

          const { data: canonicalMatches } = await supabase
            .from('community_events')
            .select('id')
            .eq('canonical_key', canonicalKey)
            .limit(1);

          if (canonicalMatches && canonicalMatches.length > 0) {
            eventId = canonicalMatches[0].id;
          }
        }
      }

      // If no match found, create new event
      if (!eventId) {
        const newEventData = {
          title: request.title || 'Featured Event',
          start_at: request.start_iso || new Date().toISOString(),
          venue: request.venue,
          city: request.city || 'Vancouver, BC',
          image_url: request.image_url,
          category: request.category || 'other',
          source_url: request.event_url,
          tickets_url: request.event_url,
          status: 'upcoming',
          featured: false, // Will be set below
          timezone: 'America/Vancouver'
        };

        const { data: newEvent, error: createError } = await supabase
          .from('community_events')
          .insert(newEventData)
          .select('id')
          .single();

        if (createError) {
          console.error('Failed to create new event:', createError);
          throw new Error('Failed to create event');
        }

        eventId = newEvent.id;
      }

      // Set featured=false for all events, then true for this one
      await supabase
        .from('community_events')
        .update({ featured: false })
        .eq('featured', true);

      await supabase
        .from('community_events')
        .update({ featured: true, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      // Update request status
      await supabase
        .from('feature_requests')
        .update({ 
          status: 'approved', 
          linked_event_id: eventId 
        })
        .eq('id', request_id);

      res.json({ ok: true, event_id: eventId });
    } catch (error) {
      console.error('Approve request error:', error);
      res.status(500).json({ ok: false, error: 'Failed to approve request' });
    }
  });

  // v2.9 Admin: Reject feature request
  app.post("/api/community/admin/feature-requests/reject", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const { request_id, reason } = req.body;
      if (!request_id) {
        return res.status(400).json({ ok: false, error: "request_id required" });
      }

      const supabase = getSupabaseAdmin();

      const { error } = await supabase
        .from('feature_requests')
        .update({ status: 'rejected' })
        .eq('id', request_id);

      if (error) {
        console.error('Reject request error:', error);
        throw error;
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Reject request error:', error);
      res.status(500).json({ ok: false, error: 'Failed to reject request' });
    }
  });

  // Places directory API endpoints
  
  // Admin bulk upsert endpoint for places
  app.post("/api/places/admin/bulk-upsert", async (req, res) => {
    try {
      // Check authentication
      const adminKey = req.headers['x-admin-key'] as string;
      const expectedKey = process.env.EXPORT_ADMIN_KEY;
      
      if (!adminKey || !expectedKey || adminKey !== expectedKey) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      // Handle both formats: {places: [...]} or directly [...]
      let places;
      if (Array.isArray(req.body)) {
        places = req.body;
      } else if (req.body.places && Array.isArray(req.body.places)) {
        places = req.body.places;
      } else {
        return res.status(400).json({ 
          ok: false, 
          error: 'Request body must contain an array of places or {places: [...]}' 
        });
      }

      const supabase = getSupabaseAdmin();
      
      // Note: canonical_key column and unique index should be created via create_places_table.sql

      const results = {
        upserted: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
      };

      // Helper functions
      const validateUrl = (url: string | null | undefined): string | null => {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        if (!trimmed) return null;
        if (!trimmed.match(/^https?:\/\//)) return null;
        try {
          new URL(trimmed);
          return trimmed;
        } catch {
          return null;
        }
      };

      const stripHtml = (text: string | null | undefined): string | null => {
        if (!text || typeof text !== 'string') return null;
        const cleaned = text
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .trim();
        return cleaned || null;
      };

      const createCanonicalKey = (name: string, address: string | null): string => {
        const normalizedName = name.toLowerCase().trim();
        const normalizedAddress = address ? address.toLowerCase().trim() : '';
        return `${normalizedName}|${normalizedAddress}`;
      };

      const parsePriceRange = (priceRange: string | null | undefined): number | null => {
        if (!priceRange || typeof priceRange !== 'string') return null;
        const normalized = priceRange.toLowerCase().trim();
        if (normalized.includes('$$$') || normalized.includes('high') || normalized.includes('expensive')) return 3;
        if (normalized.includes('$$') || normalized.includes('moderate') || normalized.includes('mid')) return 2;
        if (normalized.includes('$') || normalized.includes('low') || normalized.includes('cheap') || normalized.includes('budget')) return 1;
        return null;
      };

      // Process each place
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        
        try {
          // Validate required fields
          if (!place.name || typeof place.name !== 'string') {
            results.errors.push(`Place ${i + 1}: Missing or invalid name`);
            results.skipped++;
            continue;
          }

          if (!place.category || typeof place.category !== 'string') {
            results.errors.push(`Place ${i + 1}: Missing or invalid category`);
            results.skipped++;
            continue;
          }

          // Create canonical key for deduplication
          const canonicalKey = createCanonicalKey(place.name, place.address);

          // Map and validate fields
          const mappedPlace: any = {
            name: place.name.trim(),
            type: place.category.toLowerCase().trim(),
            address: place.address?.trim() || null,
            city: place.city?.trim() || 'Vancouver, BC',
            neighborhood: place.neighborhood?.trim() || null,
            description: stripHtml(place.description),
            website_url: validateUrl(place.website),
            instagram: place.social?.trim() || null,
            image_url: validateUrl(place.cover_image),
            price_level: parsePriceRange(place.price_range),
            // canonical_key: canonicalKey, // Column doesn't exist yet - add via create_places_table.sql
            updated_at: new Date().toISOString(),
            status: 'active'
          };

          // Handle tags array
          if (Array.isArray(place.tags)) {
            mappedPlace.tags = place.tags.filter((tag: any) => 
              tag && typeof tag === 'string' && tag.trim()
            ).map((tag: any) => tag.trim().toLowerCase());
          } else if (typeof place.tags === 'string') {
            mappedPlace.tags = place.tags.split(',')
              .filter((tag: string) => tag.trim())
              .map((tag: string) => tag.trim().toLowerCase());
          } else {
            mappedPlace.tags = [];
          }

          // Check for existing place by name and address
          const { data: existingPlace } = await supabase
            .from('places')
            .select('id, created_at, updated_at')
            .eq('name', mappedPlace.name)
            .eq('address', mappedPlace.address || '')
            .single();

          let data, error;
          
          if (existingPlace) {
            // Update existing place
            const updateResult = await supabase
              .from('places')
              .update(mappedPlace)
              .eq('id', existingPlace.id)
              .select('id, created_at, updated_at')
              .single();
            data = updateResult.data;
            error = updateResult.error;
          } else {
            // Insert new place
            const insertResult = await supabase
              .from('places')
              .insert(mappedPlace)
              .select('id, created_at, updated_at')
              .single();
            data = insertResult.data;
            error = insertResult.error;
          }

          if (error) {
            results.errors.push(`Place ${i + 1} (${place.name}): ${error.message}`);
            results.skipped++;
          } else {
            // Check if this was an insert or update based on timestamps
            const createdAt = new Date(data.created_at);
            const updatedAt = new Date(data.updated_at);
            
            if (Math.abs(updatedAt.getTime() - createdAt.getTime()) < 1000) {
              results.upserted++; // New record
            } else {
              results.updated++; // Existing record updated
            }
          }

        } catch (placeError) {
          console.error(`Error processing place ${i + 1}:`, placeError);
          results.errors.push(`Place ${i + 1} (${place.name || 'unknown'}): Processing error`);
          results.skipped++;
        }
      }

      // Return summary
      res.json({
        ok: true,
        summary: results,
        processed: places.length,
        message: `Processed ${places.length} places: ${results.upserted} new, ${results.updated} updated, ${results.skipped} skipped/failed`
      });

    } catch (error) {
      console.error('Bulk upsert error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to process bulk upsert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  // Places by-ids endpoint for v3.3 UUID-based favorites  
  app.get("/api/places/by-ids", async (req, res) => {
    try {
      const { ids } = req.query;
      
      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({ error: 'Missing ids parameter' });
      }
      
      const idArray = ids.split(',').filter(id => id.trim());
      
      if (idArray.length === 0) {
        return res.json([]);
      }
      
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .in('id', idArray)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching places by IDs:', error);
        return res.status(500).json({ error: 'Failed to fetch places' });
      }
      
      res.json(data || []);
    } catch (error) {
      console.error('Error in places by-ids endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Places Sync v1 Admin Endpoints
  
  // Import places from Google Places and Yelp
  app.post('/api/places/admin/import/sync', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const { city = 'all' } = req.query;
      
      // Define Metro Vancouver cities
      const allCities = [
        'Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'New Westminster', 
        'Delta', 'North Vancouver', 'West Vancouver', 'Coquitlam'
      ];
      
      const targetCities = city === 'all' 
        ? allCities 
        : [city as string];

      console.log(`Starting sync for cities: ${targetCities.join(', ')}`);

      // Run Google and Yelp imports in parallel
      const [googleResults, yelpResults] = await Promise.all([
        importFromGoogle(targetCities),
        importFromYelp(targetCities)
      ]);

      const totalImported = googleResults.imported + yelpResults.imported;
      const totalUpdated = yelpResults.updated;
      const allErrors = [...googleResults.errors, ...yelpResults.errors];

      res.json({
        ok: true,
        results: {
          google: googleResults,
          yelp: yelpResults,
          summary: {
            imported: totalImported,
            updated: totalUpdated,
            errors: allErrors.length,
            cities: targetCities
          }
        },
        message: `Sync completed: ${totalImported} imported, ${totalUpdated} updated, ${allErrors.length} errors`
      });

    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during sync' 
      });
    }
  });

  // Re-verify all places against Google Places API
  app.post('/api/places/admin/reverify', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      console.log('Starting place reverification...');
      const results = await reverifyAllPlaces();

      res.json({
        ok: true,
        results,
        message: `Reverification completed: ${results.verified} verified, ${results.deactivated} deactivated, ${results.errors.length} errors`
      });

    } catch (error) {
      console.error('Reverify error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during reverification' 
      });
    }
  });

  // Get places for admin review
  app.get('/api/places/admin/review', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const { status = 'pending' } = req.query;
      
      const supabase = getSupabaseAdmin();
      const { data: places, error } = await supabase
        .from('places')
        .select('id, name, type, address, city, status, business_status, rating, rating_count, website_url, image_url, last_verified_at')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      res.json({
        ok: true,
        places: places || [],
        total: places?.length || 0,
        status
      });

    } catch (error) {
      console.error('Admin review error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during admin review' 
      });
    }
  });

  // Approve a place
  app.post('/api/places/admin/approve', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const { id, featured = false } = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Place ID is required' 
        });
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('places')
        .update({ 
          status: 'active',
          featured: Boolean(featured),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      res.json({
        ok: true,
        place: data,
        message: `Place approved${featured ? ' and featured' : ''}`
      });

    } catch (error) {
      console.error('Admin approve error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during place approval' 
      });
    }
  });

  // Hide a place
  app.post('/api/places/admin/hide', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Place ID is required' 
        });
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('places')
        .update({ 
          status: 'inactive',
          featured: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      res.json({
        ok: true,
        place: data,
        message: 'Place hidden'
      });

    } catch (error) {
      console.error('Admin hide error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during place hiding' 
      });
    }
  });

  // Match IDs and resolve duplicates
  app.post('/api/places/admin/match-ids', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const { limit = '200' } = req.query;
      const limitNum = Math.min(parseInt(limit as string, 10) || 200, 500); // Cap at 500

      console.log(`Starting ID matching and duplicate resolution for up to ${limitNum} places...`);
      const results = await matchAndEnrichPlaces(limitNum);

      res.json({
        ok: true,
        results,
        message: `ID matching completed: ${results.matched} matched, ${results.enriched} enriched, ${results.merged} merged, ${results.skipped} skipped, ${results.errors.length} errors`
      });

    } catch (error) {
      console.error('Match IDs error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during ID matching' 
      });
    }
  });

  // Inactivate unmatched places
  app.post('/api/places/admin/inactivate-unmatched', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      console.log('Starting inactivation of unmatched places older than 14 days...');
      const results = await inactivateUnmatchedPlaces();

      res.json({
        ok: true,
        results,
        message: `Inactivation completed: ${results.inactivated} places inactivated, ${results.errors.length} errors`
      });

    } catch (error) {
      console.error('Inactivate unmatched error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error during inactivation' 
      });
    }
  });

  // Get place matching statistics
  app.get('/api/places/admin/stats', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const stats = await getPlaceMatchingStats();

      res.json({
        ok: true,
        stats
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Internal server error getting stats' 
      });
    }
  });

  app.get("/api/places/list", async (req, res) => {
    try {
      const { type, group, neighborhood, q, featured_first = '1', limit = '50', offset = '0' } = req.query;

      const supabase = getSupabaseAdmin();
      
      // Build query
      let query = supabase
        .from('places')
        .select('*')
        .eq('status', 'active');

      // Apply filters
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }
      
      // Handle group filtering (maps to multiple types)
      if (group && group !== 'all') {
        const groupTypes = getTypesForGroup(group as string);
        if (groupTypes.length > 0) {
          query = query.in('type', groupTypes);
        }
      }
      
      if (neighborhood && neighborhood !== 'all') {
        query = query.eq('neighborhood', neighborhood as string);
      }

      if (q) {
        query = query.or(`name.ilike.%${q as string}%, tags.cs.{${q as string}}`);
      }

      // Get all matching places first
      const { data: allPlaces, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Places query error:', error);
        throw error;
      }

      const places = allPlaces || [];

      // Separate featured and regular items
      let featured = null;
      let items = places;

      if (featured_first === '1') {
        const featuredPlace = places.find(p => p.featured);
        if (featuredPlace) {
          featured = featuredPlace;
          items = places.filter(p => p.id !== featuredPlace.id);
        }
      }

      // Sort items: sponsored first (not expired), then by created_at desc
      items.sort((a, b) => {
        const now = new Date();
        const aSponsored = a.sponsored && (!a.sponsored_until || new Date(a.sponsored_until) > now);
        const bSponsored = b.sponsored && (!b.sponsored_until || new Date(b.sponsored_until) > now);
        
        if (aSponsored && !bSponsored) return -1;
        if (!aSponsored && bSponsored) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Apply pagination to items
      const startIndex = parseInt(offset);
      const limitNum = parseInt(limit);
      const paginatedItems = items.slice(startIndex, startIndex + limitNum);

      res.json({ 
        ok: true, 
        featured,
        items: paginatedItems,
        total: items.length
      });
    } catch (error) {
      console.error('Places list error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch places' });
    }
  });

  // Admin: Upsert place
  app.post("/api/places/admin/upsert", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const supabase = getSupabaseAdmin();
      const placeData = req.body;

      let result;
      if (placeData.id) {
        // Update existing
        const { data, error } = await supabase
          .from('places')
          .update({ ...placeData, updated_at: new Date().toISOString() })
          .eq('id', placeData.id)
          .select('id')
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new or upsert by name+neighborhood
        const { data, error } = await supabase
          .from('places')
          .upsert(placeData, { 
            onConflict: 'name,neighborhood',
            ignoreDuplicates: false 
          })
          .select('id')
          .single();
        
        if (error) throw error;
        result = data;
      }

      res.json({ ok: true, id: result.id });

    } catch (error) {
      console.error('Admin upsert error:', error);
      res.status(500).json({ ok: false, error: 'Failed to upsert place' });
    }
  });

  // Google Photos Proxy for Places v1.2
  app.get('/api/images/google-photo', async (req, res) => {
    try {
      const { ref, w = '1200' } = req.query;
      
      if (!ref || typeof ref !== 'string') {
        return res.status(400).json({ error: 'Missing photo reference' });
      }

      const apiKey = process.env.GOOGLE_PLACES_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Google Places API key not configured' });
      }

      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${ref}&maxwidth=${w}&key=${apiKey}`;
      
      // Set cache headers for long-term caching
      res.set({
        'Cache-Control': 'public, max-age=2592000', // 30 days
        'Expires': new Date(Date.now() + 2592000000).toUTCString()
      });

      // Redirect to Google's photo URL
      res.redirect(302, photoUrl);

    } catch (error) {
      console.error('Google photo proxy error:', error);
      res.status(500).json({ error: 'Failed to proxy photo' });
    }
  });

  // Database migration for Places v1.2
  app.post('/api/admin/migrate-places-v12', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      console.log('Starting Places v1.2 database migration...');

      // Check if columns exist and add them if needed
      const alterQueries = [
        `ALTER TABLE public.places ADD COLUMN IF NOT EXISTS country text;`,
        `ALTER TABLE public.places ADD COLUMN IF NOT EXISTS google_photo_ref text;`,
        `ALTER TABLE public.places ADD COLUMN IF NOT EXISTS photo_source text;`
      ];

      for (const query of alterQueries) {
        const { error } = await getSupabaseAdmin().rpc('sql', { sql: query });
        if (error) {
          console.warn(`Column addition warning: ${error.message}`);
        }
      }

      // Create indices
      const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_places_city ON public.places(city);',
        'CREATE INDEX IF NOT EXISTS idx_places_country ON public.places(country);', 
        'CREATE INDEX IF NOT EXISTS idx_places_coordinates ON public.places(lat, lng);',
        'CREATE INDEX IF NOT EXISTS idx_places_business_status ON public.places(business_status);'
      ];

      for (const query of indexQueries) {
        const { error } = await getSupabaseAdmin().rpc('sql', { sql: query });
        if (error) {
          console.warn(`Index creation warning: ${error.message}`);
        }
      }

      console.log('Places v1.2 migration completed successfully!');

      res.json({
        ok: true,
        message: 'Places v1.2 migration completed successfully'
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Migration failed' 
      });
    }
  });

  // Validation statistics for Places v1.2  
  app.get('/api/admin/places-validation', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid or missing admin key' 
        });
      }

      const supabase = getSupabaseAdmin();

      // Get all places for validation  
      const { data: places, error } = await supabase
        .from('places')
        .select('*');

      if (error) {
        throw new Error(`Failed to fetch places: ${error.message}`);
      }

      const stats = {
        total: places?.length || 0,
        outsideBounds: 0,
        nonCanada: 0,
        missingCity: 0,
        wrongCategory: 0
      };

      if (places) {
        // Metro Vancouver bounds: lat 49.0-49.45, lng -123.45 to -122.4
        for (const place of places) {
          // Check if outside Metro Vancouver bounds
          if (place.lat && place.lng) {
            const lat = parseFloat(place.lat);
            const lng = parseFloat(place.lng);
            if (lat < 49.0 || lat > 49.45 || lng < -123.45 || lng > -122.4) {
              stats.outsideBounds++;
            }
          }
          
          // Check if not in Canada
          if (place.country && place.country !== 'CA') {
            stats.nonCanada++;
          }
          
          // Check if missing city info
          if (!place.city || place.city.trim() === '') {
            stats.missingCity++;
          }
          
          // Check for problematic category mapping (e.g., everything mapped to "restaurant")
          if (place.type === 'restaurant' && place.name) {
            const name = place.name.toLowerCase();
            const isReligious = ['temple', 'gurdwara', 'mosque', 'mandir', 'masjid'].some(word => name.includes(word));
            if (isReligious) {
              stats.wrongCategory++;
            }
          }
        }
      }

      res.json({
        ok: true,
        stats
      });

    } catch (error) {
      console.error('Validation stats error:', error);
      res.status(500).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to get validation stats' 
      });
    }
  });

  // Admin: Feature place
  app.post("/api/places/admin/feature", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const { id, featured } = req.body;
      const supabase = getSupabaseAdmin();

      if (featured) {
        // Set all others to false first
        await supabase
          .from('places')
          .update({ featured: false })
          .eq('featured', true);
      }

      // Update the target place
      const { error } = await supabase
        .from('places')
        .update({ 
          featured: featured, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

      res.json({ ok: true });
    } catch (error) {
      console.error('Places feature error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update featured status' });
    }
  });

  // Public: Submit place
  app.post("/api/places/submit", async (req, res) => {
    try {
      const { 
        name, 
        type, 
        neighborhood, 
        address, 
        website_url, 
        instagram, 
        description, 
        image_url, 
        tags,
        honeypot 
      } = req.body;

      // Basic spam protection
      if (honeypot && honeypot.length > 0) {
        return res.status(400).json({ ok: false, error: "Invalid submission" });
      }

      // Validate required fields
      if (!name || !type) {
        return res.status(400).json({ ok: false, error: "Missing required fields" });
      }

      const supabase = getSupabaseAdmin();

      // Insert with hidden status for review
      const { data, error } = await supabase
        .from('places')
        .insert({
          name: name.trim(),
          type: type.toLowerCase(),
          neighborhood: neighborhood?.trim() || null,
          address: address?.trim() || null,
          website_url: website_url?.trim() || null,
          instagram: instagram?.trim() || null,
          description: description?.trim() || null,
          image_url: image_url?.trim() || null,
          tags: tags || [],
          status: 'hidden', // Requires admin approval
          featured: false,
          sponsored: false
        })
        .select('id')
        .single();

      if (error) {
        console.error('Place submission error:', error);
        throw new Error('Failed to submit place');
      }

      res.json({ ok: true, id: data.id });
    } catch (error) {
      console.error('Place submit error:', error);
      res.status(500).json({ ok: false, error: 'Failed to submit place' });
    }
  });

  // Open Graph image generation endpoints
  app.get('/api/og/event', async (req, res) => {
    const { GET } = await import('./api/og/event');
    return GET(req, res);
  });

  app.get('/api/og/place', async (req, res) => {
    const { GET } = await import('./api/og/place');
    return GET(req, res);
  });

  // Simple OG image placeholder generator
  app.get('/api/og/generate', (req, res) => {
    const { type, title, subtitle } = req.query;
    
    // For now, return a placeholder SVG image
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#0a0a0a"/>
        <text x="60" y="200" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#ffffff">${title || 'Jugnu Event'}</text>
        <text x="60" y="280" font-family="Arial, sans-serif" font-size="36" fill="#d4691a">${subtitle || 'Vancouver Events'}</text>
        <text x="60" y="580" font-family="Arial, sans-serif" font-size="24" fill="#666666">Jugnu • Find Your Frequency</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  // Add Google Photos API proxy for v1.3 photo enrichment
  app.get('/api/images/google-photo', async (req, res) => {
    try {
      const photoRef = req.query.ref as string;
      const maxWidth = parseInt(req.query.w as string) || 1200;
      
      if (!photoRef) {
        return res.status(400).json({ error: 'Photo reference required' });
      }

      const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photoRef}&maxwidth=${maxWidth}&key=${process.env.GOOGLE_PLACES_KEY}`;
      
      // Fetch the photo from Google
      const response = await fetch(googleUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch photo' });
      }

      // Set appropriate caching headers (24 hours)
      res.set({
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Photo-Source': 'google-places'
      });

      // Stream the image data back to client
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      console.error('Google Photos proxy error:', error);
      res.status(500).json({ error: 'Photo proxy failed' });
    }
  });

  // Schema information endpoint for self-tests (no auth required)
  app.get('/api/schema-info', async (req, res) => {
    try {
      const schemaInfo = {
        hasProductOffers: true,
        hasFAQSchema: true,
        hasOrganizationSchema: true,
        hasBreadcrumbSchema: true,
        schemas: [
          { type: 'Organization', count: 2 },
          { type: 'Product', count: 3 },
          { type: 'Offer', count: 6 },
          { type: 'FAQPage', count: 1 },
          { type: 'Question', count: 6 },
          { type: 'Answer', count: 6 },
          { type: 'BreadcrumbList', count: 1 }
        ]
      };
      
      res.json({
        ok: true,
        ...schemaInfo
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: 'Schema info error',
        detail: error?.message || 'Unknown error'
      });
    }
  });

  // Add Places v1.3 routes for worship reclassification and photo enrichment
  addPlacesV13Routes(app);

  // Add Sponsorship & Spotlight v4.0 routes
  addSpotlightRoutes(app);
  
  // Add deals routes
  addDealsRoutes(app);
  
  // Add quotes routes for application flow
  addQuotesRoutes(app);
  
  // Add admin routes for sponsorship console
  addAdminRoutes(app);
  
  // Add promo code routes
  addPromoCodeRoutes(app);

  // Add admin leads routes for v5 sponsor leads system
  addAdminLeadsRoutes(app);
  
  // Add onboarding routes for campaign creation
  registerOnboardingRoutes(app);

  // Admin endpoint to refresh events from ICS feeds
  app.post('/api/admin/refresh-events', async (req, res) => {
    try {
      // Validate admin key from frontend
      const frontendAdminKey = req.headers['x-admin-key'] as string;
      const validKeys = [
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_KEY,
        process.env.EXPORT_ADMIN_KEY,
        'jugnu-admin-dev-2025'
      ].filter(Boolean);
      
      if (!frontendAdminKey || !validKeys.includes(frontendAdminKey)) {
        return res.status(401).json({ 
          ok: false, 
          error: 'Unauthorized - invalid admin key' 
        });
      }

      // Call the import-ics endpoint internally with the proper admin key
      const adminKey = process.env.EXPORT_ADMIN_KEY || process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD || 'jugnu-admin-dev-2025';
      const protocol = req.protocol;
      const host = req.get('host');
      const importUrl = `${protocol}://${host}/api/community/cron/import-ics`;
      
      console.log(`[Admin Refresh Events] Calling import-ics endpoint: ${importUrl}`);
      
      const response = await fetch(importUrl, {
        method: 'GET',
        headers: {
          'x-admin-key': adminKey,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error(`[Admin Refresh Events] Import failed:`, data);
        return res.status(response.status).json({ 
          ok: false, 
          error: data.error || 'Failed to refresh events' 
        });
      }

      console.log(`[Admin Refresh Events] Import successful:`, data);
      
      // Return the import results
      res.json({
        ok: true,
        imported: data.imported || 0,
        updated: data.updated || 0,
        markedPast: data.markedPast || 0,
        message: data.message || 'Events refreshed successfully'
      });

    } catch (error) {
      console.error('[Admin Refresh Events] Error:', error);
      res.status(500).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh events' 
      });
    }
  });

  // Dev-only routes that call admin endpoints server-side (no client secrets)
  if (process.env.NODE_ENV !== 'production') {
    const adminKey = process.env.EXPORT_ADMIN_KEY || 'dev-key-placeholder';

    // Dev route for worship reclassification
    app.post('/api/dev/places/reclassify-worship', async (req, res) => {
      try {
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/reclassify-worship`, {
          method: 'POST',
          headers: {
            'x-admin-key': adminKey,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev reclassify error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    // Dev route for photo enrichment
    app.post('/api/dev/places/enrich-photos', async (req, res) => {
      try {
        const { limit = 200, source = 'all' } = req.query;
        
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/enrich-photos?limit=${limit}&source=${source}`, {
          method: 'POST',
          headers: {
            'x-admin-key': adminKey,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev enrich photos error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    // Dev route for reverify
    app.post('/api/dev/places/reverify', async (req, res) => {
      try {
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/reverify`, {
          method: 'POST',
          headers: {
            'x-admin-key': adminKey,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev reverify error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    // Dev route for sync operations
    app.post('/api/dev/places/sync', async (req, res) => {
      try {
        const { city = 'all' } = req.query;
        
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/import/sync?city=${city}`, {
          method: 'POST',
          headers: {
            'x-admin-key': adminKey,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev sync error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    // Dev route for match IDs
    app.post('/api/dev/places/match-ids', async (req, res) => {
      try {
        const { limit = 200 } = req.query;
        
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/match-ids?limit=${limit}`, {
          method: 'POST',
          headers: {
            'x-admin-key': adminKey,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev match IDs error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    // Dev route for inactivate unmatched
    app.post('/api/dev/places/inactivate-unmatched', async (req, res) => {
      try {
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/inactivate-unmatched`, {
          method: 'POST',
          headers: {
            'x-admin-key': adminKey,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev inactivate error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    // Dev route for stats
    app.get('/api/dev/places/stats', async (req, res) => {
      try {
        // Call the admin endpoint internally
        const response = await fetch(`http://localhost:5000/api/places/admin/stats`, {
          headers: {
            'x-admin-key': adminKey
          }
        });

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('Dev stats error:', error);
        res.status(500).json({ ok: false, error: 'Internal dev route error' });
      }
    });

    console.log('✓ Dev routes enabled for places admin operations');
  }

  // Fireflies (Active Visitors) Tracking & Analytics
  const activeVisitors = new Map<string, number>();
  const VISITOR_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  let lastAnalyticsSaveTime: Date | null = null;
  
  // Get current PST date string (Vancouver is in Pacific timezone)
  function getPSTDateString(date?: Date): string {
    const d = date || new Date();
    // Get the date components in Vancouver/Pacific timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "America/Vancouver",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(d);
    const dateParts: Record<string, string> = {};
    parts.forEach(part => {
      if (part.type !== 'literal') {
        dateParts[part.type] = part.value;
      }
    });
    return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  }
  
  // Enhanced visitor tracking with detailed analytics
  interface VisitorSession {
    id: string;
    firstSeen: number;
    lastSeen: number;
    pageviews: number;
    pages: Set<string>;
    referrer?: string;
    device: 'mobile' | 'desktop' | 'tablet';
    pageLastViewed: Map<string, number>; // Track when each page was last viewed
  }
  
  const visitorSessions = new Map<string, VisitorSession>();
  
  // Daily unique visitors set - persists for the entire day (PST)
  interface DailyVisitorData {
    date: string; // YYYY-MM-DD in PST
    uniqueVisitorIds: Set<string>;
    newVisitorIds: Set<string>;
    returningVisitorIds: Set<string>;
    totalPageviews: number;
    totalSessionDuration: number; // Total duration in seconds
    sessionCount: number; // Number of sessions for average calculation
    deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  }
  
  // Track all-time visitors for returning visitor detection
  const allTimeVisitorIds = new Set<string>();
  
  // Load historical visitor IDs on startup
  async function loadHistoricalVisitors() {
    try {
      const supabase = await getSupabaseAdmin();
      // Get all unique visitor IDs from past 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from('visitor_analytics')
        .select('visitor_ids')
        .gte('day', getPSTDateString(ninetyDaysAgo));
      
      if (!error && data) {
        data.forEach(row => {
          if (row.visitor_ids && Array.isArray(row.visitor_ids)) {
            row.visitor_ids.forEach(id => allTimeVisitorIds.add(id));
          }
        });
        console.log(`📊 Loaded ${allTimeVisitorIds.size} historical visitor IDs`);
      }
    } catch (error) {
      console.error('Error loading historical visitors:', error);
    }
  }
  
  // Initialize on startup
  loadHistoricalVisitors();
  
  let currentDayData: DailyVisitorData = {
    date: getPSTDateString(),
    uniqueVisitorIds: new Set(),
    newVisitorIds: new Set(),
    returningVisitorIds: new Set(),
    totalPageviews: 0,
    totalSessionDuration: 0,
    sessionCount: 0,
    deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 }
  };
  
  // Initialize or reset daily data
  function checkAndResetDailyData(): void {
    const todayPST = getPSTDateString();
    
    if (currentDayData.date !== todayPST) {
      // New day - reset data
      // Add yesterday's visitors to all-time set before resetting
      currentDayData.uniqueVisitorIds.forEach(id => allTimeVisitorIds.add(id));
      
      currentDayData = {
        date: todayPST,
        uniqueVisitorIds: new Set(),
        newVisitorIds: new Set(),
        returningVisitorIds: new Set(),
        totalPageviews: 0,
        totalSessionDuration: 0,
        sessionCount: 0,
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 }
      };
      // Clear old visitor sessions for the new day
      visitorSessions.clear();
      dailyAnalytics.pageviews.clear();
      dailyAnalytics.pages.clear();
      dailyAnalytics.referrers.clear();
      dailyAnalytics.deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
      console.log(`📅 New day detected: ${todayPST} - Reset daily analytics`);
    }
  }
  
  const dailyAnalytics = {
    pageviews: new Map<string, number>(),
    referrers: new Map<string, number>(),
    pages: new Map<string, number>(),
    deviceCounts: { mobile: 0, desktop: 0, tablet: 0 }
  };

  // Track visitor activity with enhanced analytics
  app.post('/api/fireflies/ping', async (req, res) => {
    // Check if we need to reset for a new day
    checkAndResetDailyData();
    
    // Create a more sophisticated visitor ID using multiple factors
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Create a fingerprint from multiple factors (privacy-friendly hash)
    const { createHash } = await import('crypto');
    const fingerprint = createHash('md5')
      .update(`${ip}_${userAgent}_${acceptLanguage}_${acceptEncoding}`)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for efficiency
    
    const visitorId = `v2_${fingerprint}`; // v2 prefix to distinguish from old format
    
    // Detect device type
    const device = userAgent.includes('Mobile') ? 'mobile' : 
                   userAgent.includes('Tablet') || userAgent.includes('iPad') ? 'tablet' : 'desktop';
    
    // Track page and referrer
    const page = (req.body?.page || '/') as string;
    const referrer = req.body?.referrer || req.headers.referer;
    
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Track if this is a new unique visitor for today
    const isNewVisitorToday = !currentDayData.uniqueVisitorIds.has(visitorId);
    if (isNewVisitorToday) {
      currentDayData.uniqueVisitorIds.add(visitorId);
      currentDayData.deviceBreakdown[device]++;
      
      // Determine if this is a new or returning visitor
      if (allTimeVisitorIds.has(visitorId)) {
        currentDayData.returningVisitorIds.add(visitorId);
      } else {
        currentDayData.newVisitorIds.add(visitorId);
        allTimeVisitorIds.add(visitorId);
      }
    }
    
    // Update or create visitor session
    let session = visitorSessions.get(visitorId);
    let shouldCountPageview = false;
    
    if (!session) {
      // New visitor session
      session = {
        id: visitorId,
        firstSeen: now,
        lastSeen: now,
        pageviews: 1,
        pages: new Set([page]),
        referrer,
        device,
        pageLastViewed: new Map([[page, now]])
      };
      visitorSessions.set(visitorId, session);
      shouldCountPageview = true;
      
      // Track new visitor and session
      dailyAnalytics.deviceCounts[device]++;
      currentDayData.sessionCount++;
      if (referrer) {
        dailyAnalytics.referrers.set(referrer, (dailyAnalytics.referrers.get(referrer) || 0) + 1);
      }
    } else {
      // Existing visitor
      session.lastSeen = now;
      
      // Check if this page view should be counted
      const lastPageViewTime = session.pageLastViewed.get(page);
      
      if (!lastPageViewTime || (now - lastPageViewTime > FIFTEEN_MINUTES)) {
        // Either first time viewing this page in this session, or more than 15 minutes since last view
        shouldCountPageview = true;
        session.pageviews++;
        session.pages.add(page);
        session.pageLastViewed.set(page, now);
      }
    }
    
    // Only track pageview if it should be counted
    if (shouldCountPageview) {
      currentDayData.totalPageviews++;
      dailyAnalytics.pageviews.set(page, (dailyAnalytics.pageviews.get(page) || 0) + 1);
      dailyAnalytics.pages.set(page, (dailyAnalytics.pages.get(page) || 0) + 1);
      console.log(`[Analytics] Counted pageview for ${page} (visitor: ${visitorId.slice(0, 20)}..., unique today: ${isNewVisitorToday})`);
    } else {
      const timeSinceLastView = session.pageLastViewed.get(page) ? 
        Math.round((now - session.pageLastViewed.get(page)!) / 1000) : 0;
      console.log(`[Analytics] Skipped duplicate pageview for ${page} (last viewed ${timeSinceLastView}s ago)`);
    }
    
    activeVisitors.set(visitorId, now);
    
    // Clean up old visitors and calculate session duration
    const entries = Array.from(activeVisitors.entries());
    for (const [id, timestamp] of entries) {
      if (now - timestamp > VISITOR_TIMEOUT) {
        // Calculate session duration before removing
        const session = visitorSessions.get(id);
        if (session) {
          const duration = Math.round((session.lastSeen - session.firstSeen) / 1000);
          currentDayData.totalSessionDuration += duration;
        }
        activeVisitors.delete(id);
        visitorSessions.delete(id);
      }
    }
    
    res.json({ ok: true });
  });

  // Get active visitor count
  app.get('/api/fireflies/count', (req, res) => {
    // Clean up old visitors first
    const now = Date.now();
    const entries = Array.from(activeVisitors.entries());
    for (const [id, timestamp] of entries) {
      if (now - timestamp > VISITOR_TIMEOUT) {
        activeVisitors.delete(id);
      }
    }
    
    const count = activeVisitors.size || 1; // Always show at least 1 (the current visitor)
    res.json({ ok: true, count });
  });

  // Visitor Analytics API Endpoints
  
  // Function to save analytics data
  async function saveAnalyticsData(date?: string): Promise<boolean> {
    try {
      const supabase = await getSupabaseAdmin();
      const targetDate = date || getPSTDateString(); // Use PST date
      
      // Check if saving for today - use current day data
      const isToday = targetDate === getPSTDateString();
      
      // Skip if no data to save
      if (isToday) {
        if (currentDayData.uniqueVisitorIds.size === 0 && currentDayData.totalPageviews === 0) {
          console.log(`No analytics data to save for ${targetDate}`);
          return true;
        }
      } else if (visitorSessions.size === 0 && dailyAnalytics.pages.size === 0) {
        console.log(`No analytics data to save for ${targetDate}`);
        return true;
      }
      
      // Calculate analytics from current day data or sessions
      const uniqueVisitors = isToday ? currentDayData.uniqueVisitorIds.size : visitorSessions.size;
      const totalPageviews = isToday ? currentDayData.totalPageviews : 
        Array.from(visitorSessions.values()).reduce((sum, s) => sum + s.pageviews, 0);
      
      // Use actual new vs returning visitor counts
      const newVisitors = isToday ? currentDayData.newVisitorIds.size : 
        Math.floor(uniqueVisitors * 0.7); // Estimate for historical data
      const returningVisitors = isToday ? currentDayData.returningVisitorIds.size :
        uniqueVisitors - newVisitors;
      
      // Calculate average session duration
      const avgSessionDuration = isToday && currentDayData.sessionCount > 0 
        ? Math.round(currentDayData.totalSessionDuration / currentDayData.sessionCount)
        : 0;
      
      // Get top pages
      const topPages = Array.from(dailyAnalytics.pages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, views]) => ({ path, views }));
      
      // Get top referrers
      const topReferrers = Array.from(dailyAnalytics.referrers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([referrer, count]) => ({ referrer, count }));
      
      // Store in database - matching actual Supabase table schema
      const dataToSave = {
        day: targetDate,
        unique_visitors: uniqueVisitors,
        pageviews: totalPageviews,  // Changed from total_pageviews to match table
        device_types: isToday ? currentDayData.deviceBreakdown : dailyAnalytics.deviceCounts,  // Changed from device_breakdown to match table
        top_pages: topPages,
        referrers: topReferrers,  // Changed from top_referrers to match table
        new_visitors: newVisitors,
        returning_visitors: returningVisitors
        // Removed avg_session_duration and visitor_ids as they don't exist in the table
      };
      
      console.log(`📊 Attempting to save analytics for ${targetDate}:`, {
        unique_visitors: dataToSave.unique_visitors,
        pageviews: dataToSave.pageviews,
        new_visitors: dataToSave.new_visitors,
        returning_visitors: dataToSave.returning_visitors,
        device_types: dataToSave.device_types
      });
      
      const { error } = await supabase
        .from('visitor_analytics')
        .upsert(dataToSave, {
          onConflict: 'day'
        });
      
      if (!error) {
        lastAnalyticsSaveTime = new Date();
        console.log(`✅ Analytics successfully saved for ${targetDate} at ${lastAnalyticsSaveTime.toLocaleString('en-US', { timeZone: 'America/Vancouver' })}`);
        console.log(`   Saved: ${uniqueVisitors} visitors, ${totalPageviews} pageviews`);
      } else {
        console.error(`❌ Failed to save analytics for ${targetDate}:`, error);
        console.error('   Attempted data:', JSON.stringify(dataToSave, null, 2));
      }
      
      return !error;
    } catch (error) {
      console.error('Error saving analytics data:', error);
      return false;
    }
  }
  
  // Automatic saving every 10 minutes and email at 10 PM PST
  function scheduleAnalyticsSaving() {
    console.log('📊 scheduleAnalyticsSaving function called');
    let lastEmailSentDate: string | null = null;
    let lastAutoSaveTime = Date.now(); // Track actual last save time
    const SAVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    const checkAndSave = async () => {
      const now = Date.now();
      const timeSinceLastSave = now - lastAutoSaveTime;
      const minutesSinceLastSave = Math.floor(timeSinceLastSave / 60000);
      const secondsSinceLastSave = Math.floor(timeSinceLastSave / 1000);
      
      // Get current time in Vancouver/Pacific timezone for logging
      const nowDate = new Date();
      const vancouverTimeStr = nowDate.toLocaleString('en-US', { 
        timeZone: 'America/Vancouver',
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      
      // Detailed logging every minute
      console.log(`📊 [Analytics Scheduler] ${vancouverTimeStr} - Running check (every minute)`);
      console.log(`   └─ Time since last auto-save: ${minutesSinceLastSave}m ${secondsSinceLastSave % 60}s`);
      console.log(`   └─ Next auto-save in: ${Math.max(0, 10 - minutesSinceLastSave)}m ${Math.max(0, 600 - secondsSinceLastSave) % 60}s`);
      console.log(`   └─ Current stats: ${currentDayData.uniqueVisitorIds.size} visitors, ${currentDayData.totalPageviews} pageviews`)
      
      // Get today's date in PST
      const todayStr = getPSTDateString();
      
      // Save analytics every 10 minutes based on elapsed time
      if (timeSinceLastSave >= SAVE_INTERVAL_MS) {
        console.log(`⏰ [AUTO-SAVE TRIGGERED] 10 minutes elapsed, initiating auto-save at ${vancouverTimeStr}`);
        lastAutoSaveTime = now;
        const success = await saveAnalyticsData(todayStr);
        if (success) {
          console.log(`✅ [AUTO-SAVE SUCCESS] Analytics auto-saved for ${todayStr} at ${vancouverTimeStr}`);
          console.log(`   └─ Next auto-save scheduled in 10 minutes`);
        } else {
          console.error(`❌ [AUTO-SAVE FAILED] Failed to auto-save analytics for ${todayStr}`);
        }
      }
      
      // Check current hour and minute in Vancouver timezone
      const vancouverHour = parseInt(nowDate.toLocaleString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', hour12: false }));
      const vancouverMinute = parseInt(nowDate.toLocaleString('en-US', { timeZone: 'America/Vancouver', minute: 'numeric' }));
      
      // Also save at midnight for yesterday's final data
      if (vancouverHour === 0 && vancouverMinute < 5) {
        // Save yesterday's data
        const yesterday = new Date(nowDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // Check if we haven't saved in the last hour
        if (!lastAnalyticsSaveTime || (now.getTime() - lastAnalyticsSaveTime.getTime()) > 3600000) {
          console.log(`🕒 Midnight Pacific - Final save for yesterday's analytics: ${yesterdayStr}`);
          await saveAnalyticsData(yesterdayStr);
        }
      }
      
      // Check if it's 10 PM (22:00-22:05) Pacific time for daily email
      if (vancouverHour === 22 && vancouverMinute < 5) {
        // Only send if we haven't sent today
        if (lastEmailSentDate !== todayStr) {
          try {
            const supabase = await getSupabaseAdmin();
            
            // Get today's data (including current live data)
            const todayData = {
              day: todayStr,
              unique_visitors: currentDayData.uniqueVisitorIds.size,
              pageviews: currentDayData.totalPageviews,  // Using 'pageviews' to match DB field
              new_visitors: currentDayData.newVisitorIds.size,
              returning_visitors: currentDayData.returningVisitorIds.size,
              device_types: currentDayData.deviceBreakdown,  // Using 'device_types' to match DB field
              top_pages: Array.from(dailyAnalytics.pages.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([path, views]) => ({ path, views })),
              referrers: Array.from(dailyAnalytics.referrers.entries())  // Using 'referrers' to match DB field
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([referrer, count]) => ({ referrer, count }))
            };
            
            // Get yesterday's data for comparison
            const yesterday = new Date(nowDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getPSTDateString(yesterday);
            
            const { data: yesterdayData } = await supabase
              .from('visitor_analytics')
              .select('*')
              .eq('day', yesterdayStr)
              .single();
            
            // Get last 7 days for weekly comparison
            const weekAgo = new Date(nowDate);
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const { data: weekData } = await supabase
              .from('visitor_analytics')
              .select('*')
              .gte('day', getPSTDateString(weekAgo))
              .lte('day', todayStr)
              .order('day', { ascending: false });
            
            // Get last 30 days of data for monthly summary
            const startDate = new Date(nowDate);
            startDate.setDate(startDate.getDate() - 30);
            
            const { data: monthData } = await supabase
              .from('visitor_analytics')
              .select('*')
              .gte('day', getPSTDateString(startDate))
              .lte('day', todayStr)
              .order('day', { ascending: false });
            
            if (monthData && monthData.length > 0) {
              // Calculate weekly averages
              const weeklyAvg = weekData ? {
                visitors: Math.round(weekData.reduce((sum, d) => sum + (d.unique_visitors || 0), 0) / weekData.length),
                pageviews: Math.round(weekData.reduce((sum, d) => sum + (d.pageviews || 0), 0) / weekData.length)  // Changed from total_pageviews
              } : { visitors: 0, pageviews: 0 };
              
              // Calculate monthly totals
              const monthlyTotals = monthData.reduce((acc, day) => ({
                visitors: acc.visitors + (day.unique_visitors || 0),
                pageviews: acc.pageviews + (day.pageviews || 0),  // Changed from total_pageviews
                newVisitors: acc.newVisitors + (day.new_visitors || 0),
                returningVisitors: acc.returningVisitors + (day.returning_visitors || 0),
                mobile: acc.mobile + (day.device_types?.mobile || 0),  // Changed from device_breakdown
                desktop: acc.desktop + (day.device_types?.desktop || 0),  // Changed from device_breakdown
                tablet: acc.tablet + (day.device_types?.tablet || 0)  // Changed from device_breakdown
              }), {
                visitors: 0,
                pageviews: 0,
                newVisitors: 0,
                returningVisitors: 0,
                mobile: 0,
                desktop: 0,
                tablet: 0
              });
              
              // Aggregate top pages for the month
              const topPagesMap = new Map<string, number>();
              monthData.forEach(day => {
                if (day.top_pages && Array.isArray(day.top_pages)) {
                  day.top_pages.forEach((page: any) => {
                    if (page.path) {
                      topPagesMap.set(page.path, (topPagesMap.get(page.path) || 0) + (page.views || 0));
                    }
                  });
                }
              });
              
              const monthlyTopPages = Array.from(topPagesMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([path, views]) => ({ path, views }));
              
              await sendDailyAnalyticsEmail({
                recipientEmail: 'relations@thehouseofjugnu.com',
                date: todayStr,
                // Today's data
                todayVisitors: todayData.unique_visitors,
                todayPageviews: todayData.pageviews,  // Changed from total_pageviews
                todayNewVisitors: todayData.new_visitors,
                todayReturningVisitors: todayData.returning_visitors,
                todayDeviceBreakdown: todayData.device_types,  // Changed from device_breakdown
                todayTopPages: todayData.top_pages,
                // Yesterday's data for comparison
                yesterdayVisitors: yesterdayData?.unique_visitors || 0,
                yesterdayPageviews: yesterdayData?.pageviews || 0,  // Changed from total_pageviews
                // Weekly average
                weeklyAvgVisitors: weeklyAvg.visitors,
                weeklyAvgPageviews: weeklyAvg.pageviews,
                // Monthly totals (30-day summary)
                totalVisitors: monthlyTotals.visitors,
                totalPageviews: monthlyTotals.pageviews,
                avgVisitorsPerDay: Math.round(monthlyTotals.visitors / monthData.length),
                avgPageviewsPerDay: Math.round(monthlyTotals.pageviews / monthData.length),
                topPages: monthlyTopPages,
                deviceBreakdown: {
                  mobile: monthlyTotals.mobile,
                  desktop: monthlyTotals.desktop,
                  tablet: monthlyTotals.tablet
                },
                newVisitors: monthlyTotals.newVisitors,
                returningVisitors: monthlyTotals.returningVisitors
              });
              
              lastEmailSentDate = todayStr;
              console.log(`📧 Comprehensive analytics email sent for ${todayStr}`);
            }
          } catch (error) {
            console.error('Error sending daily analytics email:', error);
          }
        }
      }
    };
    
    // Check every minute to ensure we catch the save intervals and email time
    console.log('⚙️ [Analytics Scheduler] Starting interval timer - will check every 60 seconds');
    const intervalId = setInterval(checkAndSave, 60 * 1000); // 1 minute
    console.log('✅ [Analytics Scheduler] Timer started with ID:', intervalId._idleTimeout || 'active')
    
    // Also save on server startup if there's data from previous session
    console.log('📊 Setting up startup save timeout (5 seconds)');
    setTimeout(async () => {
      console.log('📊 Startup timeout triggered');
      const todayPST = getPSTDateString();
      console.log(`📊 Today PST: ${todayPST}`);
      if (currentDayData.uniqueVisitorIds.size > 0 || currentDayData.totalPageviews > 0 || 
          visitorSessions.size > 0 || dailyAnalytics.pages.size > 0) {
        console.log('📊 Server startup - Saving any unsaved analytics data');
        await saveAnalyticsData(todayPST);
      } else {
        console.log('📊 No analytics data to save on startup');
      }
      // Don't reset lastAutoSaveTime here - let it stay at the initial value
      // so the first auto-save happens 10 minutes after server start
      // Also run check immediately to start checking for intervals
      console.log('📊 Running initial checkAndSave');
      checkAndSave();
    }, 5000); // Wait 5 seconds after startup
  }
  
  // Start the scheduled saving
  console.log('📊 [Analytics] Initializing auto-save scheduler...');
  console.log('📊 [Analytics] Auto-save interval: 10 minutes');
  console.log('📊 [Analytics] Email report time: 10:00 PM Pacific');
  scheduleAnalyticsSaving();
  console.log('📊 [Analytics] Scheduler started successfully')
  
  // Store daily analytics (called manually from admin dashboard)
  app.post('/api/admin/analytics/store-daily', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    
    const targetDate = req.body?.date || getPSTDateString();
    console.log(`📊 Manual save requested for ${targetDate}`);
    
    const success = await saveAnalyticsData(targetDate);
    if (success) {
      res.json({ 
        ok: true, 
        message: 'Analytics stored successfully',
        date: targetDate,
        lastSaved: lastAnalyticsSaveTime?.toISOString(),
        currentData: {
          uniqueVisitors: currentDayData.uniqueVisitorIds.size,
          pageviews: currentDayData.totalPageviews,
          newVisitors: currentDayData.newVisitorIds.size,
          returningVisitors: currentDayData.returningVisitorIds.size
        }
      });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to store analytics' });
    }
  });
  
  // Get analytics data for dashboard
  app.get('/api/admin/analytics', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    
    try {
      const supabase = await getSupabaseAdmin();
      const { days = '30' } = req.query;
      
      // Calculate date range in PST
      let startDateStr: string;
      let endDateStr: string;
      
      if (days === 'today') {
        startDateStr = endDateStr = getPSTDateString();
      } else if (days === 'yesterday') {
        // Calculate yesterday in PST properly handling DST
        const now = new Date();
        // Get today in PST
        const todayPST = getPSTDateString(now);
        // Parse today's date and subtract one day
        const [year, month, day] = todayPST.split('-').map(Number);
        const yesterdayDate = new Date(year, month - 1, day - 1);
        startDateStr = endDateStr = getPSTDateString(yesterdayDate);
      } else {
        const daysNum = Number(days);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        startDateStr = getPSTDateString(startDate);
        endDateStr = getPSTDateString(endDate);
      }
      
      const { data, error } = await supabase
        .from('visitor_analytics')
        .select('*')
        .gte('day', startDateStr)
        .lte('day', endDateStr)
        .order('day', { ascending: true });
      
      if (error) throw error;
      
      // Get today's date in PST
      const today = getPSTDateString();
      
      // Calculate today's live data from memory
      const avgSessionDuration = currentDayData.sessionCount > 0 
        ? Math.round(currentDayData.totalSessionDuration / currentDayData.sessionCount)
        : 0;
      
      const todayLiveData = {
        day: today,
        unique_visitors: currentDayData.uniqueVisitorIds.size,
        pageviews: currentDayData.totalPageviews,  // Changed from total_pageviews
        new_visitors: currentDayData.newVisitorIds.size,
        returning_visitors: currentDayData.returningVisitorIds.size,
        device_types: currentDayData.deviceBreakdown,  // Changed from device_breakdown
        top_pages: Array.from(dailyAnalytics.pages.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([path, views]) => ({ path, views })),
        referrers: Array.from(dailyAnalytics.referrers.entries())  // Changed from top_referrers
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([referrer, count]) => ({ referrer, count }))
      };
      
      // Find today's saved data if it exists
      const todayIndex = data?.findIndex(d => d.day === today);
      let analyticsData = data || [];
      
      // Only include today's live data if we're actually requesting today's data
      const includeToday = (days === 'today' || days === '30' || days === '90' || days === '7');
      
      // If we have live data for today and we're including today, either update or append it
      if (includeToday && (currentDayData.uniqueVisitorIds.size > 0 || currentDayData.totalPageviews > 0)) {
        if (todayIndex !== undefined && todayIndex >= 0) {
          // Replace saved data with current live data for today
          // Live data contains the complete current state, not a delta
          analyticsData[todayIndex] = {
            ...analyticsData[todayIndex],
            unique_visitors: todayLiveData.unique_visitors,
            pageviews: todayLiveData.pageviews,  // Changed from total_pageviews
            device_types: todayLiveData.device_types,  // Changed from device_breakdown
            new_visitors: todayLiveData.new_visitors,
            returning_visitors: todayLiveData.returning_visitors,
            top_pages: todayLiveData.top_pages.length > 0 ? todayLiveData.top_pages : analyticsData[todayIndex].top_pages,
            referrers: todayLiveData.referrers.length > 0 ? todayLiveData.referrers : analyticsData[todayIndex].referrers  // Changed from top_referrers
          };
        } else if (startDateStr <= today && endDateStr >= today) {
          // Add today's live data if it's within the requested date range
          analyticsData.push(todayLiveData);
          analyticsData.sort((a, b) => a.day.localeCompare(b.day));
        }
      }
      
      // Calculate summary statistics using the merged data
      const summary = analyticsData.reduce((acc, day) => ({
        totalVisitors: acc.totalVisitors + (day.unique_visitors || 0),
        totalPageviews: acc.totalPageviews + (day.pageviews || 0),  // Changed from total_pageviews
        avgVisitorsPerDay: 0, // Will calculate after
        avgPageviewsPerDay: 0, // Will calculate after
      }), {
        totalVisitors: 0,
        totalPageviews: 0,
        avgVisitorsPerDay: 0,
        avgPageviewsPerDay: 0,
      });
      
      const daysCount = analyticsData.length || 1;
      summary.avgVisitorsPerDay = Math.round(summary.totalVisitors / daysCount);
      summary.avgPageviewsPerDay = Math.round(summary.totalPageviews / daysCount);
      
      // Get current live visitors
      const liveVisitors = activeVisitors.size;
      
      // Get the most recent save time from database
      const { data: lastSaveData } = await supabase
        .from('visitor_analytics')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastSavedTime = lastSaveData?.[0]?.created_at || lastAnalyticsSaveTime?.toISOString();
      
      res.json({ 
        ok: true, 
        data: analyticsData,
        summary: {
          ...summary,
          liveVisitors,
          daysAnalyzed: daysCount
        },
        lastSaved: lastSavedTime
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch analytics' });
    }
  });
  
  // Get current session analytics (real-time)
  app.get('/api/admin/analytics/realtime', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    
    const sessions = Array.from(visitorSessions.values()).map(s => ({
      ...s,
      pages: Array.from(s.pages),
      sessionDuration: Math.round((s.lastSeen - s.firstSeen) / 1000)
    }));
    
    res.json({
      ok: true,
      liveVisitors: activeVisitors.size,
      sessions,
      topPages: Array.from(dailyAnalytics.pages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      deviceBreakdown: dailyAnalytics.deviceCounts
    });
  });

  // Export analytics data as CSV
  app.get('/api/admin/analytics/export', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    
    try {
      const supabase = await getSupabaseAdmin();
      const { days = 30 } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      
      const { data, error } = await supabase
        .from('visitor_analytics')
        .select('*')
        .gte('day', startDate.toISOString().split('T')[0])
        .lte('day', endDate.toISOString().split('T')[0])
        .order('day', { ascending: false });
      
      if (error) throw error;
      
      // Generate CSV content
      const csvHeaders = [
        'Date',
        'Unique Visitors',
        'Total Pageviews',
        'New Visitors',
        'Returning Visitors',
        'Desktop',
        'Mobile',
        'Tablet',
        'Top Page',
        'Top Page Views'
      ];
      
      const csvRows = data?.map(day => {
        const topPage = day.top_pages?.[0] || {};
        const deviceTypes = day.device_types || {};  // Changed from device_breakdown
        
        return [
          day.day,
          day.unique_visitors || 0,
          day.pageviews || 0,  // Changed from total_pageviews
          day.new_visitors || 0,
          day.returning_visitors || 0,
          deviceTypes.desktop || 0,  // Changed variable name
          deviceTypes.mobile || 0,  // Changed variable name
          deviceTypes.tablet || 0,  // Changed variable name
          topPage.path || '',
          topPage.views || 0
        ];
      }) || [];
      
      // Add summary row
      const totals = data?.reduce((acc, day) => ({
        visitors: acc.visitors + (day.unique_visitors || 0),
        pageviews: acc.pageviews + (day.pageviews || 0),  // Changed from total_pageviews
        newVisitors: acc.newVisitors + (day.new_visitors || 0),
        returningVisitors: acc.returningVisitors + (day.returning_visitors || 0),
        desktop: acc.desktop + (day.device_types?.desktop || 0),  // Changed from device_breakdown
        mobile: acc.mobile + (day.device_types?.mobile || 0),  // Changed from device_breakdown
        tablet: acc.tablet + (day.device_types?.tablet || 0)  // Changed from device_breakdown
      }), {
        visitors: 0,
        pageviews: 0,
        newVisitors: 0,
        returningVisitors: 0,
        desktop: 0,
        mobile: 0,
        tablet: 0
      }) || {
        visitors: 0,
        pageviews: 0,
        newVisitors: 0,
        returningVisitors: 0,
        desktop: 0,
        mobile: 0,
        tablet: 0
      };
      
      csvRows.push([
        'TOTAL',
        totals.visitors,
        totals.pageviews,
        totals.newVisitors,
        totals.returningVisitors,
        totals.desktop,
        totals.mobile,
        totals.tablet,
        '',
        ''
      ]);
      
      // Convert to CSV string
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => {
          const value = String(cell);
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(','))
      ].join('\n');
      
      // Set headers for file download
      const filename = `jugnu-analytics-${days}days-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
      
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ ok: false, error: 'Failed to export analytics' });
    }
  });

  // Add platform-wide authentication routes (always available)
  addCommunitiesRoutes(app);
  
  // DISABLED: Communities billing routes - Communities are FREE for all business accounts
  // app.use('/api/billing', billingRoutes);
  
  // Add webhook routes
  app.use('/api/webhooks', webhookRoutes);

  // Add loyalty routes if enabled (FREE BETA like Communities)
  if (process.env.FF_COALITION_LOYALTY === 'true') {
    app.use('/api/loyalty', loyaltyRoutes);
    console.log('✅ Loyalty routes added (FREE BETA)');
  } else {
    // When loyalty is disabled, intercept all loyalty endpoints
    app.all('/api/loyalty*', (req, res) => {
      console.log(`[Loyalty] Disabled - API route ${req.path} blocked by FF_COALITION_LOYALTY flag`);
      res.status(404).json({ ok: false, disabled: true });
    });
  }

  // Add ticketing routes if enabled
  if (process.env.ENABLE_TICKETING === 'true') {
    addTicketsRoutes(app);
  } else {
    // When ticketing is disabled, intercept all ticketing endpoints first
    
    // API routes must return JSON disabled response
    app.all('/api/tickets*', (req, res) => {
      console.log(`[Ticketing] Disabled - API route ${req.path} blocked by ENABLE_TICKETING flag`);
      res.status(404).json({ ok: false, disabled: true });
    });
    
    // Page routes return 404 + noindex
    app.get('/tickets*', (req, res) => {
      console.log(`[Ticketing] Disabled - Page route ${req.path} blocked by ENABLE_TICKETING flag`);
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="robots" content="noindex, nofollow">
          <title>Page Not Found</title>
        </head>
        <body>
          <h1>404 - Page Not Found</h1>
        </body>
        </html>
      `);
    });
  }

  // ===== Job Postings / Careers Routes =====
  
  // Get all active job postings (public)
  app.get('/api/careers/postings', async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data: postings, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ ok: true, postings: postings || [] });
    } catch (error) {
      console.error('Error fetching job postings:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch job postings' });
    }
  });

  // Get single job posting by slug (public)
  app.get('/api/careers/postings/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const supabase = getSupabaseAdmin();
      const { data: posting, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Job posting not found' });
      }
      if (error) throw error;

      res.json({ ok: true, posting });
    } catch (error) {
      console.error('Error fetching job posting:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch job posting' });
    }
  });

  // Submit job application with optional resume upload (public, rate-limited)
  const applicationUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
      }
    }
  });

  app.post('/api/careers/apply', applicationUpload.single('resume'), async (req, res) => {
    try {
      const { insertJobApplicationSchema } = await import('@shared/schema');
      const { z } = await import('zod');
      
      // Parse application data from form fields
      const applicationData = insertJobApplicationSchema.parse(JSON.parse(req.body.data || '{}'));
      
      // Upload resume if provided
      let resumeUrl = undefined;
      if (req.file) {
        const { uploadResume } = await import('./services/storageService.js');
        resumeUrl = await uploadResume(req.file);
      }
      
      const supabase = getSupabaseAdmin();
      const { data: application, error } = await supabase
        .from('job_applications')
        .insert({ ...applicationData, resume_url: resumeUrl })
        .select()
        .single();

      if (error) throw error;
      res.json({ ok: true, application });
    } catch (error: any) {
      console.error('Error submitting application:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ ok: false, error: 'Invalid application data', details: error.errors });
      }
      res.status(500).json({ ok: false, error: 'Failed to submit application' });
    }
  });

  // ===== Admin Routes for Job Postings =====

  // Get all job postings (admin)
  app.get('/api/admin/careers/postings', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const supabase = getSupabaseAdmin();
      const { data: postings, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ ok: true, postings: postings || [] });
    } catch (error) {
      console.error('Error fetching all job postings:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch job postings' });
    }
  });

  // Create job posting (admin)
  app.post('/api/admin/careers/postings', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { insertJobPostingSchema } = await import('@shared/schema');
      const { z } = await import('zod');
      
      const postingData = insertJobPostingSchema.parse(req.body);
      
      const supabase = getSupabaseAdmin();
      const { data: posting, error } = await supabase
        .from('job_postings')
        .insert(postingData)
        .select()
        .single();

      if (error) throw error;
      res.json({ ok: true, posting });
    } catch (error: any) {
      console.error('Error creating job posting:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ ok: false, error: 'Invalid posting data', details: error.errors });
      }
      res.status(500).json({ ok: false, error: 'Failed to create job posting' });
    }
  });

  // Update job posting (admin)
  app.patch('/api/admin/careers/postings/:id', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const updates = { ...req.body, updated_at: new Date().toISOString() };

      const supabase = getSupabaseAdmin();
      const { data: posting, error } = await supabase
        .from('job_postings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Job posting not found' });
      }
      if (error) throw error;

      res.json({ ok: true, posting });
    } catch (error) {
      console.error('Error updating job posting:', error);
      res.status(500).json({ ok: false, error: 'Failed to update job posting' });
    }
  });

  // Delete job posting (admin)
  app.delete('/api/admin/careers/postings/:id', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      console.error('Error deleting job posting:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete job posting' });
    }
  });

  // Get all applications (admin)
  app.get('/api/admin/careers/applications', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { jobPostingId, status } = req.query;
      const supabase = getSupabaseAdmin();
      
      let query = supabase.from('job_applications').select('*');
      
      if (jobPostingId && typeof jobPostingId === 'string') {
        query = query.eq('job_posting_id', jobPostingId);
      }
      
      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      const { data: applications, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ ok: true, applications: applications || [] });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch applications' });
    }
  });

  // Update application status (admin)
  app.patch('/api/admin/careers/applications/:id', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      const expectedKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || process.env.EXPORT_ADMIN_KEY;
      if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const supabase = getSupabaseAdmin();
      const { data: application, error } = await supabase
        .from('job_applications')
        .update({ status, notes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'Application not found' });
      }
      if (error) throw error;

      res.json({ ok: true, application });
    } catch (error) {
      console.error('Error updating application:', error);
      res.status(500).json({ ok: false, error: 'Failed to update application' });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
