ALTER TABLE "listings" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "image_attribution" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "photo_gallery" jsonb;