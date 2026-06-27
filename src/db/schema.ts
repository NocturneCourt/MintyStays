import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const listingTypeEnum = pgEnum("listing_type", ["hotel", "str"]);
export const acTypeEnum = pgEnum("ac_type", [
  "split",
  "central",
  "portable",
  "none",
]);
export const guestSignalStatusEnum = pgEnum("guest_signal_status", [
  "unverified",
  "scored",
]);
export const trustTierEnum = pgEnum("trust_tier", [
  "unverified",
  "scored",
  "handpicked",
  "editor_verified",
]);
export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "disputed",
]);
export const reviewSourceEnum = pgEnum("review_source", [
  "scraped",
  "insider",
  "anonymous",
  "editorial",
]);
export const coolingSentimentEnum = pgEnum("cooling_sentiment", [
  "positive",
  "negative",
  "neutral",
]);
export const contributorTypeEnum = pgEnum("contributor_type", [
  "anonymous",
  "insider",
]);
export const contributionVoteEnum = pgEnum("contribution_vote", [
  "confirm_cold",
  "dispute_weak",
  "broken",
]);
export const userRoleEnum = pgEnum("user_role", ["insider", "editor"]);
export const editorScoreEnum = pgEnum("editor_score", [
  "verified_cold",
  "verified_adequate",
  "verified_weak",
  "verified_broken",
]);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    slug: text("slug").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("cities_slug_idx").on(table.slug),
    activeIdx: index("cities_is_active_idx").on(table.isActive),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("insider"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: listingTypeEnum("type").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    address: text("address"),
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    affiliateUrl: text("affiliate_url"),
    acType: acTypeEnum("ac_type"),
    guestSignalScore: integer("guest_signal_score"),
    guestSignalStatus: guestSignalStatusEnum("guest_signal_status")
      .notNull()
      .default("unverified"),
    editorScore: editorScoreEnum("editor_score"),
    isHandpicked: boolean("is_handpicked").notNull().default(false),
    editorVerifiedAt: timestamp("editor_verified_at", { withTimezone: true }),
    trustTier: trustTierEnum("trust_tier").notNull().default("unverified"),
    evidenceSummary: text("evidence_summary"),
    reviewCountAnalyzed: integer("review_count_analyzed").notNull().default(0),
    lastSeededAt: timestamp("last_seeded_at", { withTimezone: true }),
    status: listingStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index("listings_city_id_idx").on(table.cityId),
    statusIdx: index("listings_status_idx").on(table.status),
    typeIdx: index("listings_type_idx").on(table.type),
    trustTierIdx: index("listings_trust_tier_idx").on(table.trustTier),
    scoreIdx: index("listings_guest_signal_score_idx").on(table.guestSignalScore),
  }),
);

export const reviewSignals = pgTable(
  "review_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    source: reviewSourceEnum("source").notNull(),
    rawExcerpt: text("raw_excerpt").notNull(),
    coolingSentiment: coolingSentimentEnum("cooling_sentiment").notNull(),
    acTypeHint: acTypeEnum("ac_type_hint"),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull(),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index("review_signals_listing_id_idx").on(table.listingId),
    sourceIdx: index("review_signals_source_idx").on(table.source),
    extractedAtIdx: index("review_signals_extracted_at_idx").on(table.extractedAt),
  }),
);

export const userContributions = pgTable(
  "user_contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    contributorType: contributorTypeEnum("contributor_type").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id"),
    vote: contributionVoteEnum("vote").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index("user_contributions_listing_id_idx").on(table.listingId),
    sessionIdx: index("user_contributions_session_id_idx").on(table.sessionId),
    userIdx: index("user_contributions_user_id_idx").on(table.userId),
    anonymousOnceIdx: uniqueIndex("user_contributions_listing_session_idx").on(
      table.listingId,
      table.sessionId,
    ),
  }),
);

export const clickEvents = pgTable(
  "click_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index("click_events_listing_id_idx").on(table.listingId),
    createdAtIdx: index("click_events_created_at_idx").on(table.createdAt),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const citiesRelations = relations(cities, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  city: one(cities, {
    fields: [listings.cityId],
    references: [cities.id],
  }),
  reviewSignals: many(reviewSignals),
  userContributions: many(userContributions),
  clickEvents: many(clickEvents),
}));

export const usersRelations = relations(users, ({ many }) => ({
  contributions: many(userContributions),
  clickEvents: many(clickEvents),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const reviewSignalsRelations = relations(reviewSignals, ({ one }) => ({
  listing: one(listings, {
    fields: [reviewSignals.listingId],
    references: [listings.id],
  }),
}));

export const userContributionsRelations = relations(
  userContributions,
  ({ one }) => ({
    listing: one(listings, {
      fields: [userContributions.listingId],
      references: [listings.id],
    }),
    user: one(users, {
      fields: [userContributions.userId],
      references: [users.id],
    }),
  }),
);

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  listing: one(listings, {
    fields: [clickEvents.listingId],
    references: [listings.id],
  }),
  user: one(users, {
    fields: [clickEvents.userId],
    references: [users.id],
  }),
}));

export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ReviewSignal = typeof reviewSignals.$inferSelect;
export type NewReviewSignal = typeof reviewSignals.$inferInsert;
export type UserContribution = typeof userContributions.$inferSelect;
export type NewUserContribution = typeof userContributions.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClickEvent = typeof clickEvents.$inferSelect;
export type NewClickEvent = typeof clickEvents.$inferInsert;
