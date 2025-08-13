import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { createHash } from "crypto";
import ical from "node-ical";
import he from "he";

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

import { insertCommunityEventSchema, updateCommunityEventSchema } from "@shared/schema";

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

      if (!firstNameTrimmed || firstNameTrimmed.length > 80) {
        return res.status(400).json({ ok: false, error: "invalid_first_name" });
      }
      
      if (!lastNameTrimmed || lastNameTrimmed.length > 80) {
        return res.status(400).json({ ok: false, error: "invalid_last_name" });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ ok: false, error: "invalid_email" });
      }

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
        first_name: firstNameTrimmed,
        last_name: lastNameTrimmed,
        name: `${firstNameTrimmed} ${lastNameTrimmed}`, // Keep for backwards compatibility
        event_slug: eventSlug,
        source: sourceParam,
        user_agent: userAgent,
        consent: true,
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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

  // Community Events - ICS Import Cron Endpoint
  app.get("/api/community/cron/import-ics", async (req, res) => {
    try {
      // Require admin key
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const icsUrls = process.env.COMMUNITY_ICS_URLS;
      if (!icsUrls) {
        return res.json({ ok: true, imported: 0, updated: 0, markedPast: 0, message: "No ICS URLs configured" });
      }

      const supabase = getSupabaseAdmin();
      const urls = icsUrls.split(',').map(url => url.trim()).filter(Boolean);
      let imported = 0;
      let updated = 0;

      const timezone = process.env.CITY_TZ || 'America/Vancouver';
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
            
            // Ensure dates are stored as UTC ISO strings
            startAt = new Date(calendarEvent.start);
            endAt = calendarEvent.end ? new Date(calendarEvent.end) : new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
            
            // Extract venue and address from location
            const location = calendarEvent.location || '';
            const [venue, ...addressParts] = location.split(',').map((s: string) => s.trim());
            const address = addressParts.join(', ') || null;

            let organizer = calendarEvent.organizer ? 
              (typeof calendarEvent.organizer === 'string' ? calendarEvent.organizer : 
               (calendarEvent.organizer as any)?.params?.CN || 
               (calendarEvent.organizer as any)?.val || 
               String(calendarEvent.organizer)) : null;
            
            const status = startAt >= oneDayAgo ? 'upcoming' : 'past';
            
            // Parse structured data from DESCRIPTION
            const description = calendarEvent.description || '';
            let ticketsUrl: string | null = null;
            let sourceUrl: string | null = null;
            let imageUrl: string | null = null;
            let tags: string[] = [];
            let priceFrom: number | null = null;
            
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
              .replace(/\s+/g, ' ') // Normalize whitespace
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
                organizer = organizerMatch[1].trim();
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
                  return !(/^(tickets|source|image|tags|organizer|pricefrom)\s*:\s*/i.test(trimmed));
                });
              
              // Collapse multiple blank lines and trim
              cleanDescription = cleanLines
                .join('\n')
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ newlines with 2
                .trim();
            }
            
            // Determine category from tags first, then infer from content
            let category = 'other';
            const validCategories = ['concert', 'club', 'comedy', 'festival'];
            const tagCategory = tags.find(tag => validCategories.includes(tag));
            
            if (tagCategory) {
              category = tagCategory;
            } else {
              // Infer category from title and description
              const combinedText = `${title} ${cleanDescription || description}`.toLowerCase();
              
              if (/(concert|live|tour|singer|band|diljit|atif|arijit)/i.test(combinedText)) {
                category = 'concert';
              } else if (/(club|dj|night|party|bollywood night|desi night|bhangra)/i.test(combinedText)) {
                category = 'club';
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

            // v2.7 Two-step upsert strategy for solid deduplication
            const upsertPayload = {
              title: eventData.title,
              description: eventData.description,
              category: eventData.category,
              start_at: eventData.startAt,
              end_at: eventData.endAt,
              timezone: eventData.timezone,
              // is_all_day: eventData.isAllDay, // Commented out until column exists
              venue: eventData.venue,
              address: eventData.address,
              city: eventData.city,
              organizer: eventData.organizer,
              status: eventData.status,
              source_hash: eventData.sourceHash,
              source_uid: eventData.sourceUid,
              canonical_key: eventData.canonicalKey,
              tags: eventData.tags,
              tickets_url: eventData.ticketsUrl,
              source_url: eventData.sourceUrl,
              image_url: eventData.imageUrl,
              price_from: eventData.priceFrom,
              neighborhood: eventData.neighborhood,
              featured: eventData.featured,
              updated_at: new Date().toISOString(),
            };

            let upsertResult;

            // Step 1: If we have a source_uid, upsert by that first
            if (sourceUid) {
              const { error: sourceUidError, data: sourceUidData } = await supabase
                .from('community_events')
                .upsert(upsertPayload, { 
                  onConflict: 'source_uid',
                  ignoreDuplicates: false 
                })
                .select();
              
              if (sourceUidError) {
                console.error(`Failed to upsert by source_uid for "${title}":`, sourceUidError);
              } else {
                upsertResult = sourceUidData;
                console.log(`Upserted by source_uid: ${title}`);
              }
            }

            // Step 2: Always ensure canonical match too (covers multi-feed same event)
            const { error: canonicalError, data: canonicalData } = await supabase
              .from('community_events')
              .upsert(upsertPayload, { 
                onConflict: 'canonical_key',
                ignoreDuplicates: false 
              })
              .select();
            
            if (canonicalError) {
              console.error(`Failed to upsert by canonical_key for "${title}":`, canonicalError);
            } else {
              if (!upsertResult) {
                upsertResult = canonicalData;
              }
              
              // Track stats based on operation type
              if (canonicalData && canonicalData.length > 0) {
                // Check if this was an insert or update by comparing created/updated timestamps
                const event = canonicalData[0];
                if (new Date(event.created_at).getTime() === new Date(event.updated_at).getTime()) {
                  imported++;
                  console.log(`Inserted new event: ${title}`);
                } else {
                  updated++;
                  console.log(`Updated existing event: ${title}`);
                }
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

      res.json({ ok: true, imported, updated, markedPast });
    } catch (error) {
      console.error("ICS import error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // Schema Migration - Add columns and backfill categories
  app.post("/api/community/admin/migrate", async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    try {
      const supabase = getSupabaseAdmin();

      // Try to add columns using a simple query (may fail if already exist, which is fine)
      try {
        await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE public.community_events 
            ADD COLUMN IF NOT EXISTS description text,
            ADD COLUMN IF NOT EXISTS category text,
            ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false;
          `
        });
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
          else if (event.tags?.includes('club')) category = 'club';
          else if (event.tags?.includes('comedy')) category = 'comedy';
          else if (event.tags?.includes('festival')) category = 'festival';
          else {
            // Infer from title and description
            const combinedText = `${event.title} ${event.description || ''}`.toLowerCase();
            
            if (/(concert|live|tour|singer|band|atif|arijit|diljit)/i.test(combinedText)) {
              category = 'concert';
            } else if (/(club|dj|night|party|bollywood night|desi night|bhangra)/i.test(combinedText)) {
              category = 'club';
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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

  app.get("/api/community/weekly", async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      const { category, range } = req.query;
      
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
      
      // Compute date range in Vancouver timezone
      const timezone = process.env.CITY_TZ || 'America/Vancouver';
      const nowTz = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
      
      // Default to month (30 days), allow ?range=week for 7 days
      const daysAhead = range === 'week' ? 7 : 30;
      const endDateTz = new Date(nowTz.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      
      // Convert back to UTC for database filtering
      const now = new Date();
      const endDate = new Date(endDateTz.getTime() + (new Date().getTimezoneOffset() * 60 * 1000));

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
            neighborhood, city, organizer, tickets_url, source_url, 
            image_url, price_from, tags, status, featured, source_hash,
            canonical_key
          `)
          .in('status', ['upcoming', 'soldout'])
          .gte('start_at', now.toISOString())
          .lte('start_at', endDate.toISOString())
          .order('canonical_key')
          .order('start_at', { ascending: true })
          .order('updated_at', { ascending: false });
      } else {
        // Fallback to regular query
        query = supabase
          .from('community_events')
          .select(`
            id, created_at, updated_at, title, description, category,
            start_at, end_at, timezone, venue, address, 
            neighborhood, city, organizer, tickets_url, source_url, 
            image_url, price_from, tags, status, featured, source_hash
          `)
          .in('status', ['upcoming', 'soldout'])
          .gte('start_at', now.toISOString())
          .lte('start_at', endDate.toISOString())
          .order('start_at', { ascending: true });
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
    if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
    if (!adminKey || adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
        venue, 
        city, 
        image_url, 
        message, 
        rights_confirmed,
        honeypot 
      } = req.body;

      // Basic spam protection
      if (honeypot && honeypot.length > 0) {
        return res.status(400).json({ ok: false, error: "Invalid submission" });
      }

      // Validate required fields
      if (!organizer_name || !email || !event_url || !category || !rights_confirmed) {
        return res.status(400).json({ ok: false, error: "Missing required fields" });
      }

      // Validate URLs
      try {
        new URL(event_url);
        if (image_url) new URL(image_url);
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid URL format" });
      }

      const supabase = getSupabaseAdmin();

      // Insert feature request
      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          organizer_name: organizer_name.trim(),
          email: email.toLowerCase().trim(),
          event_url: event_url.trim(),
          category: category.toLowerCase(),
          title: title?.trim() || null,
          start_iso: start_iso || null,
          venue: venue?.trim() || null,
          city: city?.trim() || 'Vancouver, BC',
          image_url: image_url?.trim() || null,
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

      res.json({ ok: true, id: data.id });
    } catch (error) {
      console.error('Feature request error:', error);
      res.status(500).json({ ok: false, error: 'Failed to submit request' });
    }
  });

  // v2.9 Admin: List pending feature requests
  app.get("/api/community/admin/feature-requests", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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

      const { places } = req.body;
      
      if (!Array.isArray(places)) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Request body must contain an array of places' 
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
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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
      console.error('Places upsert error:', error);
      res.status(500).json({ ok: false, error: 'Failed to upsert place' });
    }
  });

  // Admin: Feature place
  app.post("/api/places/admin/feature", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.EXPORT_ADMIN_KEY) {
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

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
