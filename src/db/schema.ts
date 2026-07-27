import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
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
export const acTypeEnum = pgEnum("ac_type", ["split", "central", "portable", "none"]);
export const guestSignalStatusEnum = pgEnum("guest_signal_status", [
  "unverified",
  "scored",
]);
export const guestSignalConfidenceEnum = pgEnum("guest_signal_confidence", [
  "low",
  "moderate",
  "high",
]);
export const trustTierEnum = pgEnum("trust_tier", [
  "unverified",
  "scored",
  "handpicked",
  "editor_verified",
]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "disputed"]);
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
export const contributorTypeEnum = pgEnum("contributor_type", ["anonymous", "insider"]);
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
    guestSignalConfidence: guestSignalConfidenceEnum("guest_signal_confidence"),
    editorScore: editorScoreEnum("editor_score"),
    isHandpicked: boolean("is_handpicked").notNull().default(false),
    editorVerifiedAt: timestamp("editor_verified_at", { withTimezone: true }),
    trustTier: trustTierEnum("trust_tier").notNull().default("unverified"),
    evidenceSummary: text("evidence_summary"),
    reviewCountAnalyzed: integer("review_count_analyzed").notNull().default(0),
    lastSeededAt: timestamp("last_seeded_at", { withTimezone: true }),
    status: listingStatusEnum("status").notNull().default("active"),
    reviewNeeded: boolean("review_needed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index("listings_city_id_idx").on(table.cityId),
    cityLatIdx: index("listings_city_lat_idx").on(table.cityId, table.lat),
    cityLngIdx: index("listings_city_lng_idx").on(table.cityId, table.lng),
    citySourceUrlIdx: uniqueIndex("listings_city_source_source_url_idx").on(
      table.cityId,
      table.source,
      table.sourceUrl,
    ),
    statusIdx: index("listings_status_idx").on(table.status),
    reviewNeededIdx: index("listings_review_needed_idx").on(table.reviewNeeded),
    typeIdx: index("listings_type_idx").on(table.type),
    trustTierIdx: index("listings_trust_tier_idx").on(table.trustTier),
    scoreIdx: index("listings_guest_signal_score_idx").on(table.guestSignalScore),
    guestSignalRangeCheck: check(
      "listings_guest_signal_range_check",
      sql`${table.guestSignalScore} IS NULL OR ${table.guestSignalScore} BETWEEN 0 AND 100`,
    ),
    guestSignalStatusCheck: check(
      "listings_guest_signal_status_check",
      sql`(${table.guestSignalStatus} = 'scored') = (${table.guestSignalScore} IS NOT NULL)`,
    ),
    guestSignalConfidenceCheck: check(
      "listings_guest_signal_confidence_check",
      sql`(${table.guestSignalStatus} = 'scored') = (${table.guestSignalConfidence} IS NOT NULL)`,
    ),
    editorVerificationCheck: check(
      "listings_editor_verification_check",
      sql`${table.editorScore} IS NULL OR ${table.editorVerifiedAt} IS NOT NULL`,
    ),
  }),
);

export const rawReviews = pgTable(
  "raw_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    source: reviewSourceEnum("source").notNull(),
    sourceUrl: text("source_url"),
    contentHash: text("content_hash").notNull(),
    rawText: text("raw_text").notNull(),
    authoredAt: timestamp("authored_at", { withTimezone: true }),
    collectedAt: timestamp("collected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    listingIdx: index("raw_reviews_listing_id_idx").on(table.listingId),
    contentHashIdx: index("raw_reviews_content_hash_idx").on(table.contentHash),
    listingContentHashIdx: uniqueIndex("raw_reviews_listing_content_hash_idx").on(
      table.listingId,
      table.contentHash,
    ),
  }),
);

export const coolingExtractions = pgTable(
  "cooling_extractions",
  {
    rawReviewId: uuid("raw_review_id")
      .notNull()
      .references(() => rawReviews.id, { onDelete: "cascade" }),
    extractionVersion: text("extraction_version").notNull(),
    mentionsCooling: boolean("mentions_cooling").notNull(),
    coolingSentiment: coolingSentimentEnum("cooling_sentiment").notNull(),
    acTypeHint: acTypeEnum("ac_type_hint"),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    model: text("model").notNull(),
    extractedAt: timestamp("extracted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.rawReviewId, table.extractionVersion],
    }),
    versionIdx: index("cooling_extractions_version_idx").on(table.extractionVersion),
    confidenceCheck: check(
      "cooling_extractions_confidence_check",
      sql`${table.confidence} BETWEEN 0 AND 1`,
    ),
  }),
);

export const coolingExtractionQuarantine = pgTable(
  "cooling_extraction_quarantine",
  {
    rawReviewId: uuid("raw_review_id")
      .notNull()
      .references(() => rawReviews.id, { onDelete: "cascade" }),
    extractionVersion: text("extraction_version").notNull(),
    rawOutput: text("raw_output"),
    error: text("error").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.rawReviewId, table.extractionVersion],
    }),
  }),
);

export const reviewSignals = pgTable(
  "review_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    rawReviewId: uuid("raw_review_id").references(() => rawReviews.id, {
      onDelete: "cascade",
    }),
    source: reviewSourceEnum("source").notNull(),
    rawExcerpt: text("raw_excerpt").notNull(),
    coolingSentiment: coolingSentimentEnum("cooling_sentiment").notNull(),
    acTypeHint: acTypeEnum("ac_type_hint"),
    authoredAt: timestamp("authored_at", { withTimezone: true }),
    extractedAt: timestamp("extracted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    listingIdx: index("review_signals_listing_id_idx").on(table.listingId),
    rawReviewIdx: uniqueIndex("review_signals_raw_review_id_idx").on(table.rawReviewId),
    sourceIdx: index("review_signals_source_idx").on(table.source),
    authoredAtIdx: index("review_signals_authored_at_idx").on(table.authoredAt),
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
    clientIp: text("client_ip"),
    vote: contributionVoteEnum("vote").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index("user_contributions_listing_id_idx").on(table.listingId),
    sessionIdx: index("user_contributions_session_id_idx").on(table.sessionId),
    userIdx: index("user_contributions_user_id_idx").on(table.userId),
    listingIpCreatedIdx: index("user_contributions_listing_ip_created_idx").on(
      table.listingId,
      table.clientIp,
      table.createdAt,
    ),
    anonymousOnceIdx: uniqueIndex("user_contributions_listing_session_idx").on(
      table.listingId,
      table.sessionId,
    ),
    contributorIdentityCheck: check(
      "user_contributions_identity_check",
      sql`(
        ${table.contributorType} = 'anonymous'
        AND ${table.sessionId} IS NOT NULL
        AND ${table.userId} IS NULL
      ) OR (
        ${table.contributorType} = 'insider'
        AND ${table.userId} IS NOT NULL
      )`,
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
  rawReviews: many(rawReviews),
  userContributions: many(userContributions),
  clickEvents: many(clickEvents),
}));

export const rawReviewsRelations = relations(rawReviews, ({ one, many }) => ({
  listing: one(listings, {
    fields: [rawReviews.listingId],
    references: [listings.id],
  }),
  coolingExtractions: many(coolingExtractions),
  quarantinedExtractions: many(coolingExtractionQuarantine),
  reviewSignal: one(reviewSignals),
}));

export const coolingExtractionsRelations = relations(coolingExtractions, ({ one }) => ({
  rawReview: one(rawReviews, {
    fields: [coolingExtractions.rawReviewId],
    references: [rawReviews.id],
  }),
}));

export const coolingExtractionQuarantineRelations = relations(
  coolingExtractionQuarantine,
  ({ one }) => ({
    rawReview: one(rawReviews, {
      fields: [coolingExtractionQuarantine.rawReviewId],
      references: [rawReviews.id],
    }),
  }),
);

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
  rawReview: one(rawReviews, {
    fields: [reviewSignals.rawReviewId],
    references: [rawReviews.id],
  }),
}));

export const userContributionsRelations = relations(userContributions, ({ one }) => ({
  listing: one(listings, {
    fields: [userContributions.listingId],
    references: [listings.id],
  }),
  user: one(users, {
    fields: [userContributions.userId],
    references: [users.id],
  }),
}));

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
export type RawReview = typeof rawReviews.$inferSelect;
export type NewRawReview = typeof rawReviews.$inferInsert;
export type CoolingExtraction = typeof coolingExtractions.$inferSelect;
export type NewCoolingExtraction = typeof coolingExtractions.$inferInsert;
export type CoolingExtractionQuarantine =
  typeof coolingExtractionQuarantine.$inferSelect;
export type NewCoolingExtractionQuarantine =
  typeof coolingExtractionQuarantine.$inferInsert;
export type UserContribution = typeof userContributions.$inferSelect;
export type NewUserContribution = typeof userContributions.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClickEvent = typeof clickEvents.$inferSelect;
export type NewClickEvent = typeof clickEvents.$inferInsert;
