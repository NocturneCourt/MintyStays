CREATE TABLE "cooling_extraction_quarantine" (
	"raw_review_id" uuid NOT NULL,
	"extraction_version" text NOT NULL,
	"raw_output" text,
	"error" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cooling_extraction_quarantine_raw_review_id_extraction_version_pk" PRIMARY KEY("raw_review_id","extraction_version")
);
--> statement-breakpoint
CREATE TABLE "cooling_extractions" (
	"raw_review_id" uuid NOT NULL,
	"extraction_version" text NOT NULL,
	"mentions_cooling" boolean NOT NULL,
	"cooling_sentiment" "cooling_sentiment" NOT NULL,
	"ac_type_hint" "ac_type",
	"confidence" numeric(4, 3) NOT NULL,
	"model" text NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cooling_extractions_raw_review_id_extraction_version_pk" PRIMARY KEY("raw_review_id","extraction_version"),
	CONSTRAINT "cooling_extractions_confidence_check" CHECK ("cooling_extractions"."confidence" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "raw_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"source" "review_source" NOT NULL,
	"source_url" text,
	"content_hash" text NOT NULL,
	"raw_text" text NOT NULL,
	"authored_at" timestamp with time zone,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_signals" ADD COLUMN "raw_review_id" uuid;--> statement-breakpoint
ALTER TABLE "cooling_extraction_quarantine" ADD CONSTRAINT "cooling_extraction_quarantine_raw_review_id_raw_reviews_id_fk" FOREIGN KEY ("raw_review_id") REFERENCES "public"."raw_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooling_extractions" ADD CONSTRAINT "cooling_extractions_raw_review_id_raw_reviews_id_fk" FOREIGN KEY ("raw_review_id") REFERENCES "public"."raw_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_reviews" ADD CONSTRAINT "raw_reviews_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cooling_extractions_version_idx" ON "cooling_extractions" USING btree ("extraction_version");--> statement-breakpoint
CREATE INDEX "raw_reviews_listing_id_idx" ON "raw_reviews" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "raw_reviews_content_hash_idx" ON "raw_reviews" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_reviews_listing_content_hash_idx" ON "raw_reviews" USING btree ("listing_id","content_hash");--> statement-breakpoint
ALTER TABLE "review_signals" ADD CONSTRAINT "review_signals_raw_review_id_raw_reviews_id_fk" FOREIGN KEY ("raw_review_id") REFERENCES "public"."raw_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_signals_raw_review_id_idx" ON "review_signals" USING btree ("raw_review_id");--> statement-breakpoint
INSERT INTO "raw_reviews" (
	"id",
	"listing_id",
	"source",
	"content_hash",
	"raw_text",
	"authored_at",
	"collected_at"
)
SELECT
	"id",
	"listing_id",
	"source",
	md5(lower(regexp_replace(btrim("raw_excerpt"), '\s+', ' ', 'g')) || ':' || "id"::text),
	"raw_excerpt",
	"authored_at",
	"extracted_at"
FROM "review_signals"
WHERE "source" = 'scraped'
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "review_signals"
SET "raw_review_id" = "id"
WHERE "source" = 'scraped';--> statement-breakpoint
INSERT INTO "cooling_extractions" (
	"raw_review_id",
	"extraction_version",
	"mentions_cooling",
	"cooling_sentiment",
	"ac_type_hint",
	"confidence",
	"model",
	"extracted_at"
)
SELECT DISTINCT ON ("raw_review_id")
	"raw_review_id",
	'cooling-v1',
	true,
	"cooling_sentiment",
	"ac_type_hint",
	1.000,
	'legacy-signal-backfill',
	"extracted_at"
FROM "review_signals"
WHERE "source" = 'scraped' AND "raw_review_id" IS NOT NULL
ORDER BY "raw_review_id", "extracted_at" DESC
ON CONFLICT ("raw_review_id", "extraction_version") DO NOTHING;--> statement-breakpoint
ALTER TABLE "review_signals" DROP COLUMN "weight";
