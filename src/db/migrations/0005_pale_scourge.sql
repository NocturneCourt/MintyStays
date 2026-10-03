ALTER TABLE "listings" DROP CONSTRAINT "listings_editor_verification_check";--> statement-breakpoint
ALTER TABLE "user_contributions" DROP CONSTRAINT "user_contributions_identity_check";--> statement-breakpoint
CREATE UNIQUE INDEX "user_contributions_listing_user_idx" ON "user_contributions" USING btree ("listing_id","user_id") WHERE "user_contributions"."contributor_type" = 'insider';--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_latitude_range_check" CHECK ("cities"."lat" BETWEEN -90 AND 90);--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_longitude_range_check" CHECK ("cities"."lng" BETWEEN -180 AND 180);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_latitude_range_check" CHECK ("listings"."lat" BETWEEN -90 AND 90);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_longitude_range_check" CHECK ("listings"."lng" BETWEEN -180 AND 180);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_review_count_check" CHECK ("listings"."review_count_analyzed" >= 0);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_editor_verification_check" CHECK (("listings"."editor_score" IS NULL) = ("listings"."editor_verified_at" IS NULL));--> statement-breakpoint
ALTER TABLE "user_contributions" ADD CONSTRAINT "user_contributions_identity_check" CHECK ((
        "user_contributions"."contributor_type" = 'anonymous'
        AND "user_contributions"."session_id" IS NOT NULL
        AND "user_contributions"."user_id" IS NULL
      ) OR (
        "user_contributions"."contributor_type" = 'insider'
        AND "user_contributions"."user_id" IS NOT NULL
        AND "user_contributions"."session_id" IS NULL
      ));
