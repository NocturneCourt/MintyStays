CREATE INDEX "listings_city_lat_idx" ON "listings" USING btree ("city_id","lat");--> statement-breakpoint
CREATE INDEX "listings_city_lng_idx" ON "listings" USING btree ("city_id","lng");--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_guest_signal_range_check" CHECK ("listings"."guest_signal_score" IS NULL OR "listings"."guest_signal_score" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_guest_signal_status_check" CHECK (("listings"."guest_signal_status" = 'scored') = ("listings"."guest_signal_score" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_guest_signal_confidence_check" CHECK (("listings"."guest_signal_status" = 'scored') = ("listings"."guest_signal_confidence" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_editor_verification_check" CHECK ("listings"."editor_score" IS NULL OR "listings"."editor_verified_at" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "user_contributions" ADD CONSTRAINT "user_contributions_identity_check" CHECK ((
        "user_contributions"."contributor_type" = 'anonymous'
        AND "user_contributions"."session_id" IS NOT NULL
        AND "user_contributions"."user_id" IS NULL
      ) OR (
        "user_contributions"."contributor_type" = 'insider'
        AND "user_contributions"."user_id" IS NOT NULL
      ));