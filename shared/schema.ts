import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, numeric, uuid, integer, date, jsonb, index, check, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Main user accounts for the platform
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep varchar for compatibility
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  socialInstagram: text("social_instagram"),
  socialTwitter: text("social_twitter"),
  socialLinkedin: text("social_linkedin"),
  emailVerified: boolean("email_verified").notNull().default(false),
  status: text("status").notNull().default("active"), // active | suspended | pending_verification
  role: text("role").notNull().default("user"), // user | organizer | admin
  emailNotifications: boolean("email_notifications").notNull().default(true),
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  newsletter: boolean("newsletter").notNull().default(false),
  
  // Additional profile fields for better customer profiling
  phoneNumber: text("phone_number"), // Optional phone number
  dateOfBirth: date("date_of_birth"), // Optional birth date for demographics
  gender: text("gender"), // Optional: male | female | non-binary | prefer-not-to-say | other
  preferredLanguage: text("preferred_language").default("en"), // Language preference
  timezone: text("timezone").default("America/Vancouver"), // User's timezone
  marketingOptInSource: text("marketing_opt_in_source"), // How they opted into marketing
  referralSource: text("referral_source"), // How they heard about the platform
});

export const communityEvents = pgTable("community_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // concert | parties | comedy | festival | other
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("America/Vancouver"),
  isAllDay: boolean("is_all_day").notNull().default(false),
  venue: text("venue"),
  address: text("address"),
  neighborhood: text("neighborhood"),
  city: text("city").notNull().default("Vancouver, BC"),
  organizer: text("organizer"),
  ticketsUrl: text("tickets_url"),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  priceFrom: numeric("price_from"),
  tags: text("tags").array(),
  status: text("status").notNull().default("upcoming"), // upcoming | soldout | canceled | past | pending
  featured: boolean("featured").notNull().default(false),
  sourceHash: text("source_hash"),
  sourceUid: text("source_uid"), // ICS VEVENT UID when present
  canonicalKey: text("canonical_key"), // normalized(title, start local, venue)
});

// Sponsor Tables
export const sponsorCampaigns = pgTable("sponsor_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  name: text("name").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  headline: text("headline"),
  subline: text("subline"),
  ctaText: text("cta_text"),
  clickUrl: text("click_url").notNull(),
  placements: text("placements").array().notNull().default(sql`ARRAY['home_hero','events_banner']`),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isSponsored: boolean("is_sponsored").notNull().default(true),
  tags: text("tags").array().default(sql`'{}'`),
  freqCapPerUserPerDay: integer("freq_cap_per_user_per_day").notNull().default(1),
  needsMakegood: boolean("needs_makegood").notNull().default(false),
});

export const sponsorCreatives = pgTable("sponsor_creatives", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  campaignId: uuid("campaign_id").references(() => sponsorCampaigns.id, { onDelete: 'cascade' }),
  placement: text("placement").notNull(),
  imageDesktopUrl: text("image_desktop_url"),
  imageMobileUrl: text("image_mobile_url"),
  logoUrl: text("logo_url"),
  alt: text("alt"),
});

export const sponsorPortalTokens = pgTable("sponsor_portal_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  campaignId: uuid("campaign_id").references(() => sponsorCampaigns.id, { onDelete: 'cascade' }),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});

export const sponsorMetricsDaily = pgTable("sponsor_metrics_daily", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").references(() => sponsorCampaigns.id, { onDelete: 'cascade' }),
  creativeId: uuid("creative_id"),
  day: date("day").notNull(), // Using 'day' column for consistency
  placement: text("placement").notNull(),
  billableImpressions: integer("billable_impressions").default(0),
  rawViews: integer("raw_views").default(0),
  uniqueUsers: integer("unique_users").default(0),
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Visitor Analytics Table
export const visitorAnalytics = pgTable("visitor_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  day: date("day").notNull().unique(), // Unique constraint to ensure one record per day
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  totalPageviews: integer("total_pageviews").notNull().default(0),
  newVisitors: integer("new_visitors").notNull().default(0),
  returningVisitors: integer("returning_visitors").notNull().default(0),
  avgSessionDuration: integer("avg_session_duration").default(0), // in seconds
  topPages: jsonb("top_pages").default(sql`'[]'::jsonb`), // Array of { path: string, views: number }
  topReferrers: jsonb("top_referrers").default(sql`'[]'::jsonb`), // Array of { referrer: string, count: number }
  deviceBreakdown: jsonb("device_breakdown").default(sql`'{"mobile": 0, "desktop": 0, "tablet": 0}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// New tables for sponsorship refresh
export const sponsorPromoRedemptions = pgTable("sponsor_promo_redemptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sponsorEmail: text("sponsor_email").notNull(),
  promoCode: text("promo_code").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().default(sql`now()`),
  notes: text("notes"),
});

export const sponsorGuaranteeTargets = pgTable("sponsor_guarantee_targets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  placement: text("placement").notNull(),
  weekViewableImpressionsTarget: integer("week_viewable_impressions_target").notNull().default(0),
  weekClicksTarget: integer("week_clicks_target"), // nullable - optional clicks target
  effectiveFrom: date("effective_from").notNull().default(sql`now()::date`),
});

export const sponsorBookingDays = pgTable("sponsor_booking_days", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").references(() => sponsorCampaigns.id, { onDelete: 'cascade' }),
  placement: text("placement").notNull(),
  day: date("day").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const sponsorEmailFeatures = pgTable("sponsor_email_features", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").notNull().references(() => sponsorCampaigns.id, { onDelete: 'cascade' }),
  scheduledFor: date("scheduled_for").notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'sent', 'canceled'
  notes: text("notes")
});

export const sponsorQuotes = pgTable("sponsor_quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`now() + interval '7 days'`),
  packageCode: text("package_code").notNull(), // events_spotlight | homepage_feature | full_feature
  duration: text("duration").notNull(), // weekly | daily
  numWeeks: integer("num_weeks").notNull().default(1),
  selectedDates: jsonb("selected_dates").notNull().default(sql`'[]'::jsonb`), // for daily bookings
  startDate: date("start_date"),
  endDate: date("end_date"),
  addOns: jsonb("add_ons").notNull().default(sql`'[]'::jsonb`), // [{code, price}]
  basePriceCents: integer("base_price_cents").notNull(),
  promoApplied: boolean("promo_applied").notNull().default(false),
  promoCode: text("promo_code"),
  currency: text("currency").notNull().default("CAD"),
  totalCents: integer("total_cents").notNull()
});

export const sponsorLeads = pgTable("sponsor_leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  status: text("status").notNull().default("new"), // new | reviewing | approved | rejected
  source: text("source").notNull().default("web"),
  // Contact
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  instagram: text("instagram"),
  website: text("website"),
  // Selection & pricing
  quoteId: uuid("quote_id").references(() => sponsorQuotes.id),
  packageCode: text("package_code").notNull(),
  duration: text("duration").notNull(),
  numWeeks: integer("num_weeks").notNull().default(1),
  selectedDates: jsonb("selected_dates").notNull().default(sql`'[]'::jsonb`),
  startDate: date("start_date"),
  endDate: date("end_date"),
  addOns: jsonb("add_ons").notNull().default(sql`'[]'::jsonb`),
  promoApplied: boolean("promo_applied").notNull().default(false),
  promoCode: text("promo_code"),
  currency: text("currency").notNull().default("CAD"),
  subtotalCents: integer("subtotal_cents").notNull(),
  addonsCents: integer("addons_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  // Campaign  
  placement: text("placement").notNull(), // Single placement selection - derived from package
  objective: text("objective"),
  ackExclusive: boolean("ack_exclusive").notNull().default(false),
  ackGuarantee: boolean("ack_guarantee").notNull().default(false),
  // Creatives - Support for all placements
  desktopAssetUrl: text("desktop_asset_url"),  // Legacy field - kept for backward compatibility
  mobileAssetUrl: text("mobile_asset_url"),    // Legacy field - kept for backward compatibility
  eventsDesktopAssetUrl: text("events_desktop_asset_url"),  // Events page desktop creative
  eventsMobileAssetUrl: text("events_mobile_asset_url"),    // Events page mobile creative
  homeDesktopAssetUrl: text("home_desktop_asset_url"),      // Homepage desktop creative
  homeMobileAssetUrl: text("home_mobile_asset_url"),        // Homepage mobile creative
  creativeLinks: text("creative_links"),
  // Notes
  comments: text("comments"),
  adminNotes: text("admin_notes")
});

// ============================================
// TICKETING MODULE TABLES
// ============================================
// Note: Organizers are managed in the main organizers table (line 643)
// with Stripe Connect fields integrated there

// Ticketed events created by organizers
export const ticketsEvents = pgTable("tickets_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  description: text("description"),
  venue: text("venue"),
  city: text("city").notNull().default("Vancouver"),
  province: text("province").notNull().default("BC"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"), // draft | published | archived
  coverUrl: text("cover_url"),
  allowRefundsUntil: timestamp("allow_refunds_until", { withTimezone: true }),
  feeStructure: jsonb("fee_structure").default(sql`'{"type": "buyer_pays", "serviceFeePercent": 5}'::jsonb`),
  taxSettings: jsonb("tax_settings").default(sql`'{"collectTax": true, "gstPercent": 5, "pstPercent": 7}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Ticket tiers/types for events (General Admission, VIP, Early Bird, etc.)
export const ticketsTiers = pgTable("tickets_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => ticketsEvents.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("CAD"),
  capacity: integer("capacity"),
  maxPerOrder: integer("max_per_order").default(10),
  salesStartAt: timestamp("sales_start_at", { withTimezone: true }),
  salesEndAt: timestamp("sales_end_at", { withTimezone: true }),
  visibility: text("visibility").notNull().default("public"), // public | hidden
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Orders placed by buyers (Stripe Connect - direct payments to businesses)
export const ticketsOrders = pgTable("tickets_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => ticketsEvents.id),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  buyerPhone: text("buyer_phone"),
  status: text("status").notNull().default("pending"), // pending | paid | refunded | partially_refunded | canceled
  subtotalCents: integer("subtotal_cents").notNull(),
  applicationFeeCents: integer("application_fee_cents").notNull().default(0), // Platform fee collected via Stripe Connect
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("CAD"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  discountCode: text("discount_code"),
  discountAmountCents: integer("discount_amount_cents").default(0),
  refundedAmountCents: integer("refunded_amount_cents").default(0),
  placedAt: timestamp("placed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Line items within orders
export const ticketsOrderItems = pgTable("tickets_order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => ticketsOrders.id, { onDelete: 'cascade' }),
  tierId: uuid("tier_id").notNull().references(() => ticketsTiers.id),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  taxCents: integer("tax_cents").notNull().default(0),
  feesCents: integer("fees_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Individual tickets with QR codes
export const ticketsTickets = pgTable("tickets_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderItemId: uuid("order_item_id").notNull().references(() => ticketsOrderItems.id, { onDelete: 'cascade' }),
  tierId: uuid("tier_id").notNull().references(() => ticketsTiers.id),
  serial: text("serial").notNull(),
  qrToken: text("qr_token").notNull().unique(),
  status: text("status").notNull().default("valid"), // valid | used | refunded | canceled
  usedAt: timestamp("used_at", { withTimezone: true }),
  scannedBy: text("scanned_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Temporary capacity reservations for inventory management
export const ticketsCapacityReservations = pgTable("tickets_capacity_reservations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tierId: uuid("tier_id").notNull().references(() => ticketsTiers.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull(),
  reservationId: text("reservation_id").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  tierIdIdx: index("capacity_reservations_tier_id_idx").on(table.tierId),
  expiresAtIdx: index("capacity_reservations_expires_at_idx").on(table.expiresAt),
  tierExpiresIdx: index("capacity_reservations_tier_expires_idx").on(table.tierId, table.expiresAt),
}));

// Discount codes for events
export const ticketsDiscounts = pgTable("tickets_discounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => ticketsEvents.id, { onDelete: 'cascade' }),
  code: text("code").notNull(),
  type: text("type").notNull(), // percent | fixed
  value: numeric("value").notNull(), // percentage (0-100) or fixed amount in cents
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: text("status").notNull().default("active"), // active | expired | exhausted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Webhook processing log
export const ticketsWebhooks = pgTable("tickets_webhooks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: text("kind").notNull(), // stripe_payment | stripe_refund | etc.
  payloadJson: jsonb("payload_json").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"), // pending | processed | failed
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Audit log for all ticketing actions
export const ticketsAudit = pgTable("tickets_audit", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorType: text("actor_type").notNull(), // user | organizer | admin | system
  actorId: text("actor_id"),
  action: text("action").notNull(), // event_created | ticket_purchased | refund_issued | etc.
  targetType: text("target_type"), // event | order | ticket | etc.
  targetId: text("target_id"),
  metaJson: jsonb("meta_json"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// MoR Financial Ledger - tracks all revenue transactions
export const ticketsLedger = pgTable("tickets_ledger", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
  orderId: uuid("order_id").references(() => ticketsOrders.id), // nullable for adjustments
  payoutId: uuid("payout_id").references(() => ticketsPayouts.id), // linked when paid out
  type: text("type").notNull(), // sale | refund | chargeback | adjustment
  amountCents: integer("amount_cents").notNull(), // signed - negative for refunds/chargebacks
  currency: text("currency").notNull().default("CAD"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  organizerIdIdx: index("ledger_organizer_id_idx").on(table.organizerId),
  typeIdx: index("ledger_type_idx").on(table.type),
  payoutIdIdx: index("ledger_payout_id_idx").on(table.payoutId),
}));

// MoR Payout Management - batched payments to organizers
export const ticketsPayouts = pgTable("tickets_payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("CAD"),
  method: text("method").notNull(), // etransfer | paypal | manual
  reference: text("reference"), // transaction ID or reference number
  status: text("status").notNull().default("draft"), // draft | ready | paid | failed
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (table) => ({
  organizerIdIdx: index("payouts_organizer_id_idx").on(table.organizerId),
  statusIdx: index("payouts_status_idx").on(table.status),
  periodIdx: index("payouts_period_idx").on(table.periodStart, table.periodEnd),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityEventSchema = createInsertSchema(communityEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCommunityEventSchema = createInsertSchema(communityEvents).omit({
  createdAt: true,
}).partial();

export const insertSponsorCampaignSchema = createInsertSchema(sponsorCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorPromoRedemptionSchema = createInsertSchema(sponsorPromoRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export const insertSponsorGuaranteeTargetSchema = createInsertSchema(sponsorGuaranteeTargets).omit({
  id: true,
});

export const insertSponsorBookingDaySchema = createInsertSchema(sponsorBookingDays).omit({
  id: true,
});

export const insertSponsorEmailFeatureSchema = createInsertSchema(sponsorEmailFeatures).omit({
  id: true,
});

export const insertSponsorQuoteSchema = createInsertSchema(sponsorQuotes).omit({
  id: true,
  createdAt: true,
  expiresAt: true,
});

export const insertSponsorLeadSchema = createInsertSchema(sponsorLeads).omit({
  id: true,
  createdAt: true,
});

export const insertVisitorAnalyticsSchema = createInsertSchema(visitorAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Ticketing Insert Schemas
// Note: Organizers use the main insertOrganizerSchema from line ~1500

export const insertTicketsEventSchema = createInsertSchema(ticketsEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketsTierSchema = createInsertSchema(ticketsTiers).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsOrderSchema = createInsertSchema(ticketsOrders).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsOrderItemSchema = createInsertSchema(ticketsOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsTicketSchema = createInsertSchema(ticketsTickets).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsDiscountSchema = createInsertSchema(ticketsDiscounts).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsWebhookSchema = createInsertSchema(ticketsWebhooks).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsAuditSchema = createInsertSchema(ticketsAudit).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsLedgerSchema = createInsertSchema(ticketsLedger).omit({
  id: true,
  createdAt: true,
});

export const insertTicketsPayoutSchema = createInsertSchema(ticketsPayouts).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CommunityEvent = typeof communityEvents.$inferSelect;
export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;
export type UpdateCommunityEvent = z.infer<typeof updateCommunityEventSchema>;

export type SponsorCampaign = typeof sponsorCampaigns.$inferSelect;
export type InsertSponsorCampaign = z.infer<typeof insertSponsorCampaignSchema>;
export type SponsorCreative = typeof sponsorCreatives.$inferSelect;
export type SponsorPortalToken = typeof sponsorPortalTokens.$inferSelect;
export type SponsorMetricsDaily = typeof sponsorMetricsDaily.$inferSelect;
export type SponsorPromoRedemption = typeof sponsorPromoRedemptions.$inferSelect;
export type InsertSponsorPromoRedemption = z.infer<typeof insertSponsorPromoRedemptionSchema>;
export type SponsorGuaranteeTarget = typeof sponsorGuaranteeTargets.$inferSelect;
export type InsertSponsorGuaranteeTarget = z.infer<typeof insertSponsorGuaranteeTargetSchema>;
export type SponsorBookingDay = typeof sponsorBookingDays.$inferSelect;
export type InsertSponsorBookingDay = z.infer<typeof insertSponsorBookingDaySchema>;
export type SponsorEmailFeature = typeof sponsorEmailFeatures.$inferSelect;
export type InsertSponsorEmailFeature = z.infer<typeof insertSponsorEmailFeatureSchema>;
export type SponsorQuote = typeof sponsorQuotes.$inferSelect;
export type InsertSponsorQuote = z.infer<typeof insertSponsorQuoteSchema>;
export type SponsorLead = typeof sponsorLeads.$inferSelect;
export type InsertSponsorLead = z.infer<typeof insertSponsorLeadSchema>;
export type VisitorAnalytics = typeof visitorAnalytics.$inferSelect;
export type InsertVisitorAnalytics = z.infer<typeof insertVisitorAnalyticsSchema>;

// Ticketing Type Exports
// Note: Use main Organizer type from line ~1500 instead of separate TicketsOrganizer
export type TicketsEvent = typeof ticketsEvents.$inferSelect;
export type InsertTicketsEvent = z.infer<typeof insertTicketsEventSchema>;
export type TicketsTier = typeof ticketsTiers.$inferSelect;
export type InsertTicketsTier = z.infer<typeof insertTicketsTierSchema>;
export type TicketsOrder = typeof ticketsOrders.$inferSelect;
export type InsertTicketsOrder = z.infer<typeof insertTicketsOrderSchema>;
export type TicketsOrderItem = typeof ticketsOrderItems.$inferSelect;
export type InsertTicketsOrderItem = z.infer<typeof insertTicketsOrderItemSchema>;
export type TicketsTicket = typeof ticketsTickets.$inferSelect;
export type InsertTicketsTicket = z.infer<typeof insertTicketsTicketSchema>;
export type TicketsDiscount = typeof ticketsDiscounts.$inferSelect;
export type InsertTicketsDiscount = z.infer<typeof insertTicketsDiscountSchema>;
export type TicketsWebhook = typeof ticketsWebhooks.$inferSelect;
export type InsertTicketsWebhook = z.infer<typeof insertTicketsWebhookSchema>;
export type TicketsAudit = typeof ticketsAudit.$inferSelect;
export type InsertTicketsAudit = z.infer<typeof insertTicketsAuditSchema>;
export type TicketsLedger = typeof ticketsLedger.$inferSelect;
export type InsertTicketsLedger = z.infer<typeof insertTicketsLedgerSchema>;
export type TicketsPayout = typeof ticketsPayouts.$inferSelect;
export type InsertTicketsPayout = z.infer<typeof insertTicketsPayoutSchema>;

// ============ COMMUNITIES TABLES ============
// Main user accounts for Communities (separate from basic users table)

// Email-based authentication codes for passwordless login
export const authCodes = pgTable("auth_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  code: text("code").notNull(), // 6-digit verification code
  purpose: text("purpose").notNull().default("login"), // login | signup | password_reset
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`now() + interval '10 minutes'`),
  usedAt: timestamp("used_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
});

// Organizer applications (before approval)
export const organizerApplications = pgTable("organizer_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessName: text("business_name").notNull(),
  businessWebsite: text("business_website"),
  businessDescription: text("business_description").notNull(),
  businessType: text("business_type").notNull(), // event_organizer | venue | artist | promoter | other
  yearsExperience: integer("years_experience"),
  sampleEvents: text("sample_events"),
  socialMediaHandles: jsonb("social_media_handles").default(sql`'{}'::jsonb`),
  businessEmail: text("business_email").notNull(),
  businessPhone: text("business_phone"),
  businessAddress: text("business_address"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | under_review
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),
});

// Approved organizers (separate from tickets_organizers)
export const organizers = pgTable("organizers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: uuid("application_id").references(() => organizerApplications.id),
  businessName: text("business_name").notNull(),
  businessWebsite: text("business_website"),
  businessDescription: text("business_description"),
  businessType: text("business_type").notNull(),
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("active"), // active | suspended | inactive
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().default(sql`now()`),
  
  // Stripe Connect ticketing fields
  stripeAccountId: text("stripe_account_id").unique(),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").notNull().default(false),
  stripeDetailsSubmitted: boolean("stripe_details_submitted").notNull().default(false),
  platformFeeBps: integer("platform_fee_bps").notNull().default(0), // No platform fees - subscription model (0 = 0%)
});

// User sessions for platform auth
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`now() + interval '30 days'`),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().default(sql`now()`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
});

// ============ COMMUNITY GROUPS FEATURE ============
// Communities - Organizers can create multiple communities
export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  welcomeText: text("welcome_text"),
  imageUrl: text("image_url"),
  coverUrl: text("cover_url"),
  isPrivate: boolean("is_private").notNull().default(false),
  membershipPolicy: text("membership_policy").notNull().default("approval_required"), // approval_required | open | invite_only
  chatMode: text("chat_mode").notNull().default("owner_only"), // disabled | owner_only | moderators_only | all_members
  chatSlowmodeSeconds: integer("chat_slowmode_seconds").notNull().default(0),
  autoModeration: boolean("auto_moderation").notNull().default(false),
  bannedWords: text("banned_words").array().default(sql`'{}'`),
  allowMemberPosts: boolean("allow_member_posts").notNull().default(false),
  
  // Permissions for moderators
  moderatorCanPost: boolean("moderator_can_post").notNull().default(true),
  moderatorCanCreateEvents: boolean("moderator_can_create_events").notNull().default(true),
  moderatorCanCreatePolls: boolean("moderator_can_create_polls").notNull().default(true),
  moderatorCanManageMembers: boolean("moderator_can_manage_members").notNull().default(false),
  
  // Permissions for regular members
  memberCanPost: boolean("member_can_post").notNull().default(false),
  memberCanComment: boolean("member_can_comment").notNull().default(true),
  memberCanCreateEvents: boolean("member_can_create_events").notNull().default(false),
  memberCanCreatePolls: boolean("member_can_create_polls").notNull().default(false),
  
  // Tab visibility settings
  showEventsTab: boolean("show_events_tab").notNull().default(true), // Controls if Events tab is visible to members
  
  subscriptionStatus: text("subscription_status").notNull().default("trialing"), // trialing | active | past_due | canceled
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  totalMembers: integer("total_members").notNull().default(0),
  totalPosts: integer("total_posts").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().default(sql`now()`),
  status: text("status").notNull().default("active"), // active | suspended | archived
});

// Community memberships - Join requests and approvals
export const communityMemberships = pgTable("community_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("pending"), // pending | approved | declined | left
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().default(sql`now()`),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: varchar("approved_by").references(() => users.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  leftAt: timestamp("left_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().default(sql`now()`),
  postsCount: integer("posts_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  inAppNotifications: boolean("in_app_notifications").notNull().default(true),
  isMuted: boolean("is_muted").notNull().default(false),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),
  mutedBy: varchar("muted_by").references(() => users.id),
  muteReason: text("mute_reason"),
  role: text("role").notNull().default("member"), // member | moderator | admin
});

// Community posts/announcements - Member-only content
export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  body: text("body"),
  excerpt: text("excerpt"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkText: text("link_text"),
  linkDescription: text("link_description"),
  primaryLinkUrl: text("primary_link_url"),
  primaryLinkText: text("primary_link_text"),
  primaryLinkClicks: integer("primary_link_clicks").notNull().default(0),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  expireAt: timestamp("expire_at", { withTimezone: true }),
  allowComments: boolean("allow_comments").notNull().default(true),
  allowReactions: boolean("allow_reactions").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  uniqueViewers: integer("unique_viewers").notNull().default(0),
  reactionCount: integer("reaction_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImageUrl: text("og_image_url"),
  category: text("category"),
  tags: text("tags").array(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  postType: text("post_type").notNull().default("announcement"), // announcement | update | event
  isPinned: boolean("is_pinned").notNull().default(false),
  status: text("status").notNull().default("published"), // published | draft | archived
  postAsBusiness: boolean("post_as_business").notNull().default(true), // Show community name/avatar instead of user
});

// Post image galleries (1-6 images per post)
export const communityPostImages = pgTable("community_post_images", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  altText: text("alt_text"),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  mimeType: text("mime_type"),
  displayOrder: integer("display_order").notNull().default(0),
});

// Post reactions with proper constraint
export const communityPostReactions = pgTable("community_post_reactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  reactionType: text("reaction_type").notNull(), // fire | like | celebrate | star
}, (table) => ({
  // Unique constraint: one reaction per user per post
  uniqueUserPost: unique().on(table.postId, table.userId),
  reactionTypeCheck: check("community_post_reactions_reaction_type_check", 
    sql`${table.reactionType} IN ('fire', 'like', 'celebrate', 'star')`)
}));

// Comments on posts
export const communityComments: any = pgTable("community_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentCommentId: uuid("parent_comment_id").references((): any => communityComments.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isHidden: boolean("is_hidden").notNull().default(false),
  hiddenBy: varchar("hidden_by").references(() => users.id),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  hideReason: text("hide_reason"),
  likeCount: integer("like_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
});

// Comment likes
export const communityCommentLikes = pgTable("community_comment_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  commentId: uuid("comment_id").notNull().references(() => communityComments.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
});

// Community chat messages
export const communityChatMessages = pgTable("community_chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isAnnouncement: boolean("is_announcement").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Polls with proper constraints
export const communityPolls = pgTable("community_polls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  postId: uuid("post_id").references(() => communityPosts.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  description: text("description"),
  pollType: text("poll_type").notNull().default("single"), // single | multiple
  allowMultipleVotes: boolean("allow_multiple_votes").notNull().default(false),
  showResultsBeforeVote: boolean("show_results_before_vote").notNull().default(false),
  anonymousVoting: boolean("anonymous_voting").notNull().default(false),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  isClosed: boolean("is_closed").notNull().default(false),
  totalVotes: integer("total_votes").notNull().default(0),
  uniqueVoters: integer("unique_voters").notNull().default(0),
});

// Poll options
export const communityPollOptions = pgTable("community_poll_options", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  pollId: uuid("poll_id").notNull().references(() => communityPolls.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
  votePercentage: numeric("vote_percentage", { precision: 5, scale: 2 }).default("0"),
});

// Poll votes
export const communityPollVotes = pgTable("community_poll_votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  pollId: uuid("poll_id").notNull().references(() => communityPolls.id, { onDelete: 'cascade' }),
  optionId: uuid("option_id").notNull().references(() => communityPollOptions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
});

// Post analytics
export const communityPostAnalytics = pgTable("community_post_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  impressions: integer("impressions").notNull().default(0),
  uniqueViewers: integer("unique_viewers").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  reactions: integer("reactions").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  avgTimeOnPage: integer("avg_time_on_page").default(0), // in seconds
});

// Community-level analytics
export const communityAnalytics = pgTable("community_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  totalMembers: integer("total_members").notNull().default(0),
  newMembers: integer("new_members").notNull().default(0),
  activeMembers: integer("active_members").notNull().default(0),
  totalPosts: integer("total_posts").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  totalReactions: integer("total_reactions").notNull().default(0),
  pageviews: integer("pageviews").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  avgSessionDuration: integer("avg_session_duration").default(0), // in seconds
  topPosts: jsonb("top_posts").default(sql`'[]'::jsonb`), // Array of {postId, views, engagement}
  memberActivity: jsonb("member_activity").default(sql`'{}'::jsonb`), // Activity breakdown
});

// Community subscriptions
export const communitySubscriptions = pgTable("community_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }).unique(),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"), // Current price ID (monthly)
  plan: text("plan").notNull().default("free"), // free | monthly
  status: text("status").notNull().default("trialing"), // trialing | active | past_due | canceled | paused | expired
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAt: timestamp("cancel_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  trialStart: timestamp("trial_start", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  memberLimit: integer("member_limit").notNull().default(100),
  pricePerMonth: integer("price_per_month"), // in cents (2000 = $20)
  features: jsonb("features").default(sql`'{}'::jsonb`), // Feature flags/limits
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`) // Additional Stripe metadata
});

// Community billing payments
export const communityPayments = pgTable("community_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  subscriptionId: uuid("subscription_id").references(() => communitySubscriptions.id),
  communityId: uuid("community_id").notNull().references(() => communities.id),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid").notNull(), // Amount in cents
  currency: text("currency").notNull().default("CAD"),
  status: text("status").notNull(), // succeeded | failed | pending | refunded
  description: text("description"),
  billingPeriodStart: timestamp("billing_period_start", { withTimezone: true }),
  billingPeriodEnd: timestamp("billing_period_end", { withTimezone: true }),
  failureReason: text("failure_reason"),
  receiptUrl: text("receipt_url"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
});

// Community billing events for webhook tracking
export const communityBillingEvents = pgTable("community_billing_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  stripeEventId: text("stripe_event_id").unique().notNull(),
  eventType: text("event_type").notNull(),
  communityId: uuid("community_id").references(() => communities.id),
  subscriptionId: uuid("subscription_id").references(() => communitySubscriptions.id),
  processed: boolean("processed").notNull().default(false),
  data: jsonb("data").notNull(),
  error: text("error"),
});

// Community notifications
export const communityNotifications = pgTable("community_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  recipientId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // post_published | comment_reply | mention | membership_approved | etc
  title: text("title").notNull(),
  body: text("body"),
  postId: uuid("post_id"),
  commentId: uuid("comment_id"),
  pollId: uuid("poll_id"),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  isEmailSent: boolean("is_email_sent").notNull().default(false),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
});

// Email queue for community notifications
export const communityEmailQueue = pgTable("community_email_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }),
  templateId: text("template_id").notNull(),
  subject: text("subject").notNull(),
  variables: jsonb("variables").default(sql`'{}'::jsonb`),
  status: text("status").notNull().default("pending"), // pending | sent | failed
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
});

// Community admin audit log
export const communityAdminAudit = pgTable("community_admin_audit", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(), // member_removed | post_deleted | settings_changed | etc
  targetType: text("target_type"), // user | post | comment | settings | etc
  targetId: text("target_id"),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Community deals/offers
export const communityDeals = pgTable("community_deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  imageUrl: text("image_url"),
  dealType: text("deal_type").notNull().default("discount"), // discount | voucher | exclusive_access | freebie
  discountType: text("discount_type"), // percent | fixed_amount
  discountValue: numeric("discount_value"),
  promoCode: text("promo_code"),
  redeemUrl: text("redeem_url"),
  termsConditions: text("terms_conditions"),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  memberTierRequired: text("member_tier_required"), // all | premium | founding | etc
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
});

// Deal redemption tracking
export const communityDealRedemptions = pgTable("community_deal_redemptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  dealId: uuid("deal_id").notNull().references(() => communityDeals.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().default(sql`now()`),
  redemptionCode: text("redemption_code"),
  notes: text("notes"),
});

// Community invite links
export const communityInviteLinks = pgTable("community_invite_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  code: text("code").notNull().unique(),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  role: text("role").notNull().default("member"), // member | moderator
  autoApprove: boolean("auto_approve").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // campaign tracking, etc
});

// ============ COMMUNITY GIVEAWAYS ============
// Main giveaways table
export const communityGiveaways = pgTable("community_giveaways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  giveawayType: text("giveaway_type").notNull(), // random_draw | first_come | task_based | points_based
  prizeTitle: text("prize_title").notNull(),
  prizeDescription: text("prize_description"),
  prizeValue: numeric("prize_value"),
  prizeCurrency: text("prize_currency").default("CAD"),
  prizeImageUrl: text("prize_image_url"),
  numberOfWinners: integer("number_of_winners").notNull().default(1),
  maxEntriesPerUser: integer("max_entries_per_user"),
  entryCostType: text("entry_cost_type"), // free | points | action
  entryCostValue: integer("entry_cost_value").default(0),
  minMemberDays: integer("min_member_days").default(0),
  requiredRoles: text("required_roles").array().default(sql`ARRAY['member', 'moderator', 'owner']`),
  requireEmailVerified: boolean("require_email_verified").default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  drawAt: timestamp("draw_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"), // draft | active | ended | drawn | completed | cancelled
  isFeatured: boolean("is_featured").default(false),
  autoDraw: boolean("auto_draw").default(true),
  totalEntries: integer("total_entries").default(0),
  uniqueParticipants: integer("unique_participants").default(0),
  allowEntryRemoval: boolean("allow_entry_removal").default(true),
  showParticipantCount: boolean("show_participant_count").default(true),
  showEntriesBeforeEnd: boolean("show_entries_before_end").default(false),
  anonymousEntries: boolean("anonymous_entries").default(false),
  termsConditions: text("terms_conditions"),
  rules: text("rules"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
});

// Giveaway entries
export const communityGiveawayEntries = pgTable("community_giveaway_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  giveawayId: uuid("giveaway_id").notNull().references(() => communityGiveaways.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryCount: integer("entry_count").default(1),
  entryMethod: text("entry_method"),
  pointsSpent: integer("points_spent").default(0),
  isValid: boolean("is_valid").default(true),
  invalidationReason: text("invalidation_reason"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => ({
  uniqueGiveawayUser: unique().on(table.giveawayId, table.userId),
}));

// Giveaway winners
export const communityGiveawayWinners = pgTable("community_giveaway_winners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  giveawayId: uuid("giveaway_id").notNull().references(() => communityGiveaways.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: integer("position").notNull(),
  prizeVariant: text("prize_variant"),
  status: text("status").notNull().default("pending"), // pending | contacted | confirmed | claimed | fulfilled | forfeited
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  contactEmail: text("contact_email"),
  contactNotes: text("contact_notes"),
  shippingInfo: jsonb("shipping_info"),
  drawnBy: uuid("drawn_by").references(() => users.id),
  drawMethod: text("draw_method").default("random"),
}, (table) => ({
  uniqueGiveawayWinner: unique().on(table.giveawayId, table.userId),
}));

// Giveaway tasks (for task-based giveaways)
export const communityGiveawayTasks = pgTable("community_giveaway_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  giveawayId: uuid("giveaway_id").notNull().references(() => communityGiveaways.id, { onDelete: 'cascade' }),
  taskType: text("task_type").notNull(), // join_community | invite_member | create_post | comment | react | share | custom
  title: text("title").notNull(),
  description: text("description"),
  entriesReward: integer("entries_reward").default(1),
  pointsReward: integer("points_reward").default(0),
  required: boolean("required").default(false),
  maxCompletions: integer("max_completions"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  requiresVerification: boolean("requires_verification").default(false),
  verificationUrl: text("verification_url"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
});

// Giveaway task completions
export const communityGiveawayTaskCompletions = pgTable("community_giveaway_task_completions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  taskId: uuid("task_id").notNull().references(() => communityGiveawayTasks.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  giveawayId: uuid("giveaway_id").notNull().references(() => communityGiveaways.id, { onDelete: 'cascade' }),
  completedAt: timestamp("completed_at", { withTimezone: true }).default(sql`now()`),
  completionProof: text("completion_proof"),
  verified: boolean("verified").default(false),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationNotes: text("verification_notes"),
  entriesGranted: integer("entries_granted").default(0),
  pointsGranted: integer("points_granted").default(0),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
}, (table) => ({
  uniqueTaskUser: unique().on(table.taskId, table.userId),
}));

// Giveaway audit log
export const communityGiveawayAuditLog = pgTable("community_giveaway_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  giveawayId: uuid("giveaway_id").notNull().references(() => communityGiveaways.id, { onDelete: 'cascade' }),
  actorId: uuid("actor_id").references(() => users.id),
  actorType: text("actor_type").default("user"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  description: text("description"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
});

// Notification preferences per user per community
export const communityNotificationPreferences = pgTable("community_notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: 'cascade' }), // null = global preferences
  
  // Channel preferences
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(false),
  
  // Notification type preferences
  newPosts: boolean("new_posts").notNull().default(true),
  postComments: boolean("post_comments").notNull().default(true),
  commentReplies: boolean("comment_replies").notNull().default(true),
  mentions: boolean("mentions").notNull().default(true),
  pollResults: boolean("poll_results").notNull().default(true),
  membershipUpdates: boolean("membership_updates").notNull().default(true),
  communityAnnouncements: boolean("community_announcements").notNull().default(true),
  newDeals: boolean("new_deals").notNull().default(true),
  
  // Email frequency
  emailFrequency: text("email_frequency").notNull().default("immediate"), // immediate | daily | weekly | never
  emailDigestTime: text("email_digest_time").default("09:00"), // Time in HH:MM format
  emailDigestTimezone: text("email_digest_timezone").default("America/Vancouver"),
  
  // Last digest sent timestamp
  lastDigestSentAt: timestamp("last_digest_sent_at", { withTimezone: true }),
});

// Notification Preferences Insert Schema
export const insertCommunityNotificationPreferencesSchema = createInsertSchema(communityNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Authentication & Organizer Insert Schemas
export const insertAuthCodeSchema = createInsertSchema(authCodes).omit({
  id: true,
  createdAt: true,
  code: true, // Auto-generated by createAuthCode function
});

export const insertOrganizerApplicationSchema = createInsertSchema(organizerApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizerSchema = createInsertSchema(organizers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  token: true, // Auto-generated by createSession function
});

// Community Insert Schemas
export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityMembershipSchema = createInsertSchema(communityMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityPostImageSchema = createInsertSchema(communityPostImages).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPostReactionSchema = createInsertSchema(communityPostReactions).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityCommentSchema = createInsertSchema(communityComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityCommentLikeSchema = createInsertSchema(communityCommentLikes).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityChatMessageSchema = createInsertSchema(communityChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPollSchema = createInsertSchema(communityPolls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityPollOptionSchema = createInsertSchema(communityPollOptions).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPollVoteSchema = createInsertSchema(communityPollVotes).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityPostAnalyticsSchema = createInsertSchema(communityPostAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityAnalyticsSchema = createInsertSchema(communityAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertCommunitySubscriptionSchema = createInsertSchema(communitySubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityPaymentSchema = createInsertSchema(communityPayments).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityBillingEventSchema = createInsertSchema(communityBillingEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityNotificationSchema = createInsertSchema(communityNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityEmailQueueSchema = createInsertSchema(communityEmailQueue).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityAdminAuditSchema = createInsertSchema(communityAdminAudit).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityDealSchema = createInsertSchema(communityDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityDealRedemptionSchema = createInsertSchema(communityDealRedemptions).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityInviteLinkSchema = createInsertSchema(communityInviteLinks).omit({
  id: true,
  createdAt: true,
});

// Giveaway Insert Schemas
export const insertCommunityGiveawaySchema = createInsertSchema(communityGiveaways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityGiveawayEntrySchema = createInsertSchema(communityGiveawayEntries).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityGiveawayWinnerSchema = createInsertSchema(communityGiveawayWinners).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityGiveawayTaskSchema = createInsertSchema(communityGiveawayTasks).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityGiveawayTaskCompletionSchema = createInsertSchema(communityGiveawayTaskCompletions).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityGiveawayAuditLogSchema = createInsertSchema(communityGiveawayAuditLog).omit({
  id: true,
  createdAt: true,
});

// Authentication & Organizer Type Exports
export type AuthCode = typeof authCodes.$inferSelect;
export type InsertAuthCode = z.infer<typeof insertAuthCodeSchema>;
export type OrganizerApplication = typeof organizerApplications.$inferSelect;
export type InsertOrganizerApplication = z.infer<typeof insertOrganizerApplicationSchema>;
export type Organizer = typeof organizers.$inferSelect;
export type InsertOrganizer = z.infer<typeof insertOrganizerSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

// Community Type Exports
export type Community = typeof communities.$inferSelect & {
  memberCount?: number; // Alias for totalMembers for frontend compatibility
  postCount?: number; // Alias for totalPosts for frontend compatibility
};
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type CommunityMembership = typeof communityMemberships.$inferSelect;
export type InsertCommunityMembership = z.infer<typeof insertCommunityMembershipSchema>;
// Extended membership type with user information for display
export type CommunityMembershipWithUser = CommunityMembership & {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    createdAt: string;
    role: string;
  };
};
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPostImage = typeof communityPostImages.$inferSelect;
export type InsertCommunityPostImage = z.infer<typeof insertCommunityPostImageSchema>;
export type CommunityPostReaction = typeof communityPostReactions.$inferSelect;
export type InsertCommunityPostReaction = z.infer<typeof insertCommunityPostReactionSchema>;
export type CommunityComment = typeof communityComments.$inferSelect;
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;
export type CommunityCommentLike = typeof communityCommentLikes.$inferSelect;
export type InsertCommunityCommentLike = z.infer<typeof insertCommunityCommentLikeSchema>;
export type CommunityChatMessage = typeof communityChatMessages.$inferSelect;
export type InsertCommunityChatMessage = z.infer<typeof insertCommunityChatMessageSchema>;
export type CommunityPoll = typeof communityPolls.$inferSelect;
export type InsertCommunityPoll = z.infer<typeof insertCommunityPollSchema>;
export type CommunityPollOption = typeof communityPollOptions.$inferSelect;
export type InsertCommunityPollOption = z.infer<typeof insertCommunityPollOptionSchema>;
export type CommunityPollVote = typeof communityPollVotes.$inferSelect;
export type InsertCommunityPollVote = z.infer<typeof insertCommunityPollVoteSchema>;
export type CommunityPostAnalytics = typeof communityPostAnalytics.$inferSelect;
export type InsertCommunityPostAnalytics = z.infer<typeof insertCommunityPostAnalyticsSchema>;
export type CommunityAnalytics = typeof communityAnalytics.$inferSelect;
export type InsertCommunityAnalytics = z.infer<typeof insertCommunityAnalyticsSchema>;
export type CommunitySubscription = typeof communitySubscriptions.$inferSelect;
export type InsertCommunitySubscription = z.infer<typeof insertCommunitySubscriptionSchema>;
export type CommunityPayment = typeof communityPayments.$inferSelect;
export type InsertCommunityPayment = z.infer<typeof insertCommunityPaymentSchema>;
export type CommunityBillingEvent = typeof communityBillingEvents.$inferSelect;
export type InsertCommunityBillingEvent = z.infer<typeof insertCommunityBillingEventSchema>;
export type CommunityNotification = typeof communityNotifications.$inferSelect;
export type InsertCommunityNotification = z.infer<typeof insertCommunityNotificationSchema>;
export type CommunityEmailQueue = typeof communityEmailQueue.$inferSelect;
export type InsertCommunityEmailQueue = z.infer<typeof insertCommunityEmailQueueSchema>;
export type CommunityAdminAudit = typeof communityAdminAudit.$inferSelect;
export type InsertCommunityAdminAudit = z.infer<typeof insertCommunityAdminAuditSchema>;
export type CommunityDeal = typeof communityDeals.$inferSelect;
export type InsertCommunityDeal = z.infer<typeof insertCommunityDealSchema>;
export type CommunityDealRedemption = typeof communityDealRedemptions.$inferSelect;
export type InsertCommunityDealRedemption = z.infer<typeof insertCommunityDealRedemptionSchema>;
export type CommunityInviteLink = typeof communityInviteLinks.$inferSelect;
export type InsertCommunityInviteLink = z.infer<typeof insertCommunityInviteLinkSchema>;
export type CommunityNotificationPreferences = typeof communityNotificationPreferences.$inferSelect;
export type InsertCommunityNotificationPreferences = z.infer<typeof insertCommunityNotificationPreferencesSchema>;

// Giveaway Type Exports
export type CommunityGiveaway = typeof communityGiveaways.$inferSelect;
export type InsertCommunityGiveaway = z.infer<typeof insertCommunityGiveawaySchema>;
export type CommunityGiveawayEntry = typeof communityGiveawayEntries.$inferSelect;
export type InsertCommunityGiveawayEntry = z.infer<typeof insertCommunityGiveawayEntrySchema>;
export type CommunityGiveawayWinner = typeof communityGiveawayWinners.$inferSelect;
export type InsertCommunityGiveawayWinner = z.infer<typeof insertCommunityGiveawayWinnerSchema>;
export type CommunityGiveawayTask = typeof communityGiveawayTasks.$inferSelect;
export type InsertCommunityGiveawayTask = z.infer<typeof insertCommunityGiveawayTaskSchema>;
export type CommunityGiveawayTaskCompletion = typeof communityGiveawayTaskCompletions.$inferSelect;
export type InsertCommunityGiveawayTaskCompletion = z.infer<typeof insertCommunityGiveawayTaskCompletionSchema>;
export type CommunityGiveawayAuditLog = typeof communityGiveawayAuditLog.$inferSelect;
export type InsertCommunityGiveawayAuditLog = z.infer<typeof insertCommunityGiveawayAuditLogSchema>;

// Job Postings / Careers
export const jobPostings = pgTable("job_postings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  department: text("department").notNull(), // e.g., "Marketing", "Events", "Community", "Tech"
  type: text("type").notNull().default("volunteer"), // volunteer | part-time | full-time | contract
  location: text("location").notNull().default("Remote"), // Remote | Vancouver | Hybrid
  description: text("description").notNull(),
  responsibilities: text("responsibilities").array().notNull().default(sql`'{}'`),
  qualifications: text("qualifications").array().notNull().default(sql`'{}'`),
  benefits: text("benefits").array().default(sql`'{}'`), // What they get in return
  time_commitment: text("time_commitment"), // e.g., "5-10 hours/week"
  is_active: boolean("is_active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  sort_order: integer("sort_order").notNull().default(0),
});

export const jobApplications = pgTable("job_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  job_posting_id: uuid("job_posting_id").references(() => jobPostings.id, { onDelete: 'cascade' }).notNull(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resume_url: text("resume_url"), // Link to uploaded resume
  portfolio_url: text("portfolio_url"),
  linkedin_url: text("linkedin_url"),
  cover_letter: text("cover_letter"),
  why_join: text("why_join"), // Why do you want to join Jugnu?
  availability: text("availability"), // When can you start?
  status: text("status").notNull().default("pending"), // pending | reviewing | interviewed | accepted | rejected
  notes: text("notes"), // Admin notes
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  created_at: true,
  updated_at: true,
  status: true,
  notes: true,
});

export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;

// Loyalty Program Tables

// User loyalty wallets
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  totalPoints: integer("total_points").notNull().default(0),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // For future use (e.g., flags, notes)
}, (table) => ({
  userIdIdx: index("wallets_user_id_idx").on(table.userId),
}));

// Merchant loyalty configuration
export const merchantLoyaltyConfig = pgTable("merchant_loyalty_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: 'cascade' }).unique(),
  issueRate: integer("issue_rate").notNull().default(25), // JP per $1 (0-150)
  capPercent: numeric("cap_percent", { precision: 5, scale: 2 }).notNull().default("0.20"), // 0.20 = 20%
  homeBoostMultiplier: numeric("home_boost_multiplier", { precision: 3, scale: 2 }).default("1.00"), // 1.00 = no boost, 1.25 = 25% boost
  pointBankIncluded: integer("point_bank_included").notNull().default(0), // Included JP from subscription
  pointBankPurchased: integer("point_bank_purchased").notNull().default(0), // Purchased JP from top-ups
  loyaltyEnabled: boolean("loyalty_enabled").notNull().default(false), // Gates access
  billingDate: timestamp("billing_date", { withTimezone: true }), // Next billing date
  subscriptionId: text("subscription_id"), // Stripe subscription ID
}, (table) => ({
  organizerIdIdx: index("merchant_loyalty_config_organizer_id_idx").on(table.organizerId),
}));

// Immutable loyalty ledger for all transactions
export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  type: text("type").notNull(), // mint | burn | adjust | reverse
  userId: uuid("user_id").notNull().references(() => users.id),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
  points: integer("points").notNull(), // Positive for mint, negative for burn
  centsValue: integer("cents_value"), // CAD cents value of transaction
  bucketUsed: text("bucket_used"), // Included | Purchased (for merchant tracking)
  reference: text("reference"), // External reference (bill ID, etc.)
  reversedOf: uuid("reversed_of").references((): any => loyaltyLedger.id), // If this reverses another transaction
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Additional data (bill amount, etc.)
}, (table) => ({
  userIdIdx: index("loyalty_ledger_user_id_idx").on(table.userId),
  organizerIdIdx: index("loyalty_ledger_organizer_id_idx").on(table.organizerId),
  createdAtIdx: index("loyalty_ledger_created_at_idx").on(table.createdAt),
  typeIdx: index("loyalty_ledger_type_idx").on(table.type),
}));

// Per-merchant earned breakdown (display only)
export const userMerchantEarnings = pgTable("user_merchant_earnings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: 'cascade' }),
  totalEarned: integer("total_earned").notNull().default(0), // Total JP earned from this merchant
}, (table) => ({
  userOrganizerUnique: unique("user_merchant_earnings_user_organizer_unique").on(table.userId, table.organizerId),
  userIdIdx: index("user_merchant_earnings_user_id_idx").on(table.userId),
  organizerIdIdx: index("user_merchant_earnings_organizer_id_idx").on(table.organizerId),
}));

// Insert schemas and types for loyalty tables
export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMerchantLoyaltyConfigSchema = createInsertSchema(merchantLoyaltyConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoyaltyLedgerSchema = createInsertSchema(loyaltyLedger).omit({
  id: true,
  createdAt: true,
});

export const insertUserMerchantEarningsSchema = createInsertSchema(userMerchantEarnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type MerchantLoyaltyConfig = typeof merchantLoyaltyConfig.$inferSelect;
export type InsertMerchantLoyaltyConfig = z.infer<typeof insertMerchantLoyaltyConfigSchema>;
export type LoyaltyLedger = typeof loyaltyLedger.$inferSelect;
export type InsertLoyaltyLedger = z.infer<typeof insertLoyaltyLedgerSchema>;
export type UserMerchantEarning = typeof userMerchantEarnings.$inferSelect;
export type InsertUserMerchantEarning = z.infer<typeof insertUserMerchantEarningsSchema>;
