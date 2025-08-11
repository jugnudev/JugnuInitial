import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, numeric, uuid } from "drizzle-orm/pg-core";
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CommunityEvent = typeof communityEvents.$inferSelect;
export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;
export type UpdateCommunityEvent = z.infer<typeof updateCommunityEventSchema>;
