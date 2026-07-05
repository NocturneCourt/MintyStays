CREATE TYPE "public"."guest_signal_confidence" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "guest_signal_confidence" "guest_signal_confidence";--> statement-breakpoint
ALTER TABLE "review_signals" ADD COLUMN "authored_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "review_signals_authored_at_idx" ON "review_signals" USING btree ("authored_at");