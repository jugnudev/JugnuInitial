import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSupabaseAdmin } from "./supabaseAdmin";

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

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
