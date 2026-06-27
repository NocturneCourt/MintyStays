CREATE TYPE "public"."ac_type" AS ENUM('split', 'central', 'portable', 'none');--> statement-breakpoint
CREATE TYPE "public"."contribution_vote" AS ENUM('confirm_cold', 'dispute_weak', 'broken');--> statement-breakpoint
CREATE TYPE "public"."contributor_type" AS ENUM('anonymous', 'insider');--> statement-breakpoint
CREATE TYPE "public"."cooling_sentiment" AS ENUM('positive', 'negative', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."editor_score" AS ENUM('verified_cold', 'verified_adequate', 'verified_weak', 'verified_broken');--> statement-breakpoint
CREATE TYPE "public"."guest_signal_status" AS ENUM('unverified', 'scored');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('hotel', 'str');--> statement-breakpoint
CREATE TYPE "public"."review_source" AS ENUM('scraped', 'insider', 'anonymous', 'editorial');--> statement-breakpoint
CREATE TYPE "public"."trust_tier" AS ENUM('unverified', 'scored', 'handpicked', 'editor_verified');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('insider', 'editor');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"slug" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"session_id" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "listing_type" NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"city_id" uuid NOT NULL,
	"address" text,
	"source" text NOT NULL,
	"source_url" text,
	"affiliate_url" text,
	"ac_type" "ac_type",
	"guest_signal_score" integer,
	"guest_signal_status" "guest_signal_status" DEFAULT 'unverified' NOT NULL,
	"editor_score" "editor_score",
	"is_handpicked" boolean DEFAULT false NOT NULL,
	"editor_verified_at" timestamp with time zone,
	"trust_tier" "trust_tier" DEFAULT 'unverified' NOT NULL,
	"evidence_summary" text,
	"review_count_analyzed" integer DEFAULT 0 NOT NULL,
	"last_seeded_at" timestamp with time zone,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"source" "review_source" NOT NULL,
	"raw_excerpt" text NOT NULL,
	"cooling_sentiment" "cooling_sentiment" NOT NULL,
	"ac_type_hint" "ac_type",
	"weight" numeric(5, 2) NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"contributor_type" "contributor_type" NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"vote" "contribution_vote" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" "user_role" DEFAULT 'insider' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_signals" ADD CONSTRAINT "review_signals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contributions" ADD CONSTRAINT "user_contributions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contributions" ADD CONSTRAINT "user_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cities_is_active_idx" ON "cities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "click_events_listing_id_idx" ON "click_events" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "click_events_created_at_idx" ON "click_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "listings_city_id_idx" ON "listings" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_type_idx" ON "listings" USING btree ("type");--> statement-breakpoint
CREATE INDEX "listings_trust_tier_idx" ON "listings" USING btree ("trust_tier");--> statement-breakpoint
CREATE INDEX "listings_guest_signal_score_idx" ON "listings" USING btree ("guest_signal_score");--> statement-breakpoint
CREATE INDEX "review_signals_listing_id_idx" ON "review_signals" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "review_signals_source_idx" ON "review_signals" USING btree ("source");--> statement-breakpoint
CREATE INDEX "review_signals_extracted_at_idx" ON "review_signals" USING btree ("extracted_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_contributions_listing_id_idx" ON "user_contributions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "user_contributions_session_id_idx" ON "user_contributions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_contributions_user_id_idx" ON "user_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_contributions_listing_session_idx" ON "user_contributions" USING btree ("listing_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");