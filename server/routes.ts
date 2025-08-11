import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { createHash } from "crypto";
import ical from "node-ical";
import he from "he";
import { insertCommunityEventSchema, updateCommunityEventSchema } from "@shared/schema";

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
            
            // Generate a stable unique identifier based on core event details
            const stableIdentifier = createHash('sha1')
              .update(`${title}|${startAt.toISOString()}|${venue || ''}|${address || ''}`)
              .digest('hex');

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
              tags,
              ticketsUrl,
              sourceUrl,
              imageUrl,
              priceFrom,
              neighborhood: null,
              featured: false,
            };

            // Check if event exists by stable identifier (title + start_at + venue)
            const { data: existingEvent } = await supabase
              .from('community_events')
              .select('id, source_hash')
              .eq('title', title)
              .eq('start_at', startAt.toISOString())
              .eq('venue', venue || null)
              .single();

            if (existingEvent) {
              // Only update if content has changed
              if (existingEvent.source_hash !== contentHash) {
                const { error: updateError } = await supabase
                  .from('community_events')
                  .update({
                    description: eventData.description,
                    category: eventData.category,
                    end_at: eventData.endAt,
                    timezone: eventData.timezone,
                    organizer: eventData.organizer,
                    status: eventData.status,
                    tags: eventData.tags,
                    tickets_url: eventData.ticketsUrl,
                    source_url: eventData.sourceUrl,
                    image_url: eventData.imageUrl,
                    price_from: eventData.priceFrom,
                    source_hash: contentHash,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingEvent.id);
                
                if (updateError) {
                  console.error(`Failed to update event "${eventData.title}":`, updateError);
                } else {
                  updated++;
                  console.log(`Updated event: ${title}`);
                }
              } else {
                console.log(`No changes for event: ${title}`);
              }
            } else {
              // Insert new event
              const { error: insertError } = await supabase
                .from('community_events')
                .insert({
                  title: eventData.title,
                  description: eventData.description,
                  category: eventData.category,
                  start_at: eventData.startAt,
                  end_at: eventData.endAt,
                  timezone: eventData.timezone,
                  venue: eventData.venue,
                  address: eventData.address,
                  city: eventData.city,
                  organizer: eventData.organizer,
                  status: eventData.status,
                  source_hash: eventData.sourceHash,
                  tags: eventData.tags,
                  tickets_url: eventData.ticketsUrl,
                  source_url: eventData.sourceUrl,
                  image_url: eventData.imageUrl,
                  price_from: eventData.priceFrom,
                  neighborhood: eventData.neighborhood,
                  featured: eventData.featured,
                });
              
              if (insertError) {
                console.error(`Failed to insert event "${eventData.title}":`, insertError);
              } else {
                imported++;
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

      let query = supabase
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

      res.json({ ok: true, events: data || [] });
    } catch (error) {
      console.error("Weekly events error:", error);
      res.status(500).json({ ok: false, error: "server_error" });
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
      res.status(500).json({ ok: false, error: "server_error", details: error.message });
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

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
