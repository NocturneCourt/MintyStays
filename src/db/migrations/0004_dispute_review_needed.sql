ALTER TABLE "listings" ADD COLUMN "review_needed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_contributions" ADD COLUMN "client_ip" text;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_city_source_source_url_idx" ON "listings" USING btree ("city_id","source","source_url");--> statement-breakpoint
CREATE INDEX "listings_review_needed_idx" ON "listings" USING btree ("review_needed");--> statement-breakpoint
CREATE INDEX "user_contributions_listing_ip_created_idx" ON "user_contributions" USING btree ("listing_id","client_ip","created_at");
