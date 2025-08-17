import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, numeric, uuid, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const communityEvents = pgTable("community_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // concert | club | comedy | festival | other
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
