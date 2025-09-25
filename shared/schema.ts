import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, numeric, uuid, integer, date, jsonb, index } from "drizzle-orm/pg-core";
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
// TICKETING MODULE TABLES (Completely Isolated)
// ============================================

// Organizers who can create and manage ticketed events
export const ticketsOrganizers = pgTable("tickets_organizers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  stripeAccountId: text("stripe_account_id").unique(), // Deprecated for MoR model
  status: text("status").notNull().default("active"), // active | suspended (removed pending)
  businessName: text("business_name"),
  businessEmail: text("business_email"),
  email: text("email").notNull(), // NOT NULL email for MoR payouts
  // MoR payout fields
  payoutMethod: text("payout_method").notNull().default("etransfer"), // etransfer | paypal | manual
  payoutEmail: text("payout_email"), // Email for payouts (can be different from business email)
  legalName: text("legal_name"), // Full legal name for tax purposes
  defaultShareBps: integer("default_share_bps").default(9000), // Default 90% to organizer, 10% platform fee
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Ticketed events created by organizers
export const ticketsEvents = pgTable("tickets_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: uuid("organizer_id").notNull().references(() => ticketsOrganizers.id),
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

// Orders placed by buyers
export const ticketsOrders = pgTable("tickets_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => ticketsEvents.id),
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  buyerPhone: text("buyer_phone"),
  status: text("status").notNull().default("pending"), // pending | paid | refunded | partially_refunded | canceled
  subtotalCents: integer("subtotal_cents").notNull(),
  feesCents: integer("fees_cents").notNull().default(0),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("CAD"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  discountCode: text("discount_code"),
  discountAmountCents: integer("discount_amount_cents").default(0),
  refundedAmountCents: integer("refunded_amount_cents").default(0),
  // MoR Financial Tracking Fields
  stripeChargeId: text("stripe_charge_id"), // For fee calculation
  stripeFeeCents: integer("stripe_fee_cents"), // Actual Stripe processing fee
  platformFeeCents: integer("platform_fee_cents"), // Jugnu platform fee
  netToOrganizerCents: integer("net_to_organizer_cents"), // Amount organizer receives
  payoutId: uuid("payout_id").references(() => ticketsPayouts.id), // Linked when paid out
  payoutStatus: text("payout_status").notNull().default("pending"), // pending | in_progress | paid
  placedAt: timestamp("placed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  payoutStatusIdx: index("orders_payout_status_idx").on(table.payoutStatus),
  payoutIdIdx: index("orders_payout_id_idx").on(table.payoutId),
  eventPayoutIdx: index("orders_event_payout_idx").on(table.eventId, table.payoutStatus),
}));

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
  organizerId: uuid("organizer_id").notNull().references(() => ticketsOrganizers.id),
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
  organizerId: uuid("organizer_id").notNull().references(() => ticketsOrganizers.id),
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
export const insertTicketsOrganizerSchema = createInsertSchema(ticketsOrganizers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
export type TicketsOrganizer = typeof ticketsOrganizers.$inferSelect;
export type InsertTicketsOrganizer = z.infer<typeof insertTicketsOrganizerSchema>;
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
// Communities - One per verified organizer
export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isPrivate: boolean("is_private").notNull().default(false),
  membershipPolicy: text("membership_policy").notNull().default("approval_required"), // approval_required | open | closed
  status: text("status").notNull().default("active"), // active | suspended | archived
});

// Community memberships - Join requests and approvals
export const communityMemberships = pgTable("community_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("pending"), // pending | approved | declined | left
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().default(sql`now()`),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id),
  role: text("role").notNull().default("member"), // member | moderator | admin
});

// Community posts/announcements - Member-only content
export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  communityId: uuid("community_id").notNull().references(() => communities.id, { onDelete: 'cascade' }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  postType: text("post_type").notNull().default("announcement"), // announcement | update | event
  isPinned: boolean("is_pinned").notNull().default(false),
  status: text("status").notNull().default("published"), // published | draft | archived
});

// Authentication & Organizer Insert Schemas
export const insertAuthCodeSchema = createInsertSchema(authCodes).omit({
  id: true,
  createdAt: true,
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
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type CommunityMembership = typeof communityMemberships.$inferSelect;
export type InsertCommunityMembership = z.infer<typeof insertCommunityMembershipSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
