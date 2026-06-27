import { NextResponse } from "next/server";
import { buildAffiliateLink } from "@/lib/affiliate/AffiliateLinkBuilder";
import { getListingDetail } from "@/lib/listings/getListingDetail";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listingId = url.searchParams.get("id");

  if (!listingId) {
    return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
  }

  const listing = await getListingDetail(listingId);

  if (!listing?.affiliateUrl) {
    return NextResponse.json({ error: "Listing has no affiliate link" }, { status: 404 });
  }

  await recordClickIfDatabaseExists(listing.id);

  const trackedUrl = buildAffiliateLink({
    baseUrl: listing.affiliateUrl,
    provider: process.env.AFFILIATE_DEFAULT_PROVIDER === "booking" ? "booking" : "generic",
    partnerId: process.env.AFFILIATE_BOOKING_PARTNER_ID,
    campaign: process.env.LAUNCH_CITY_SLUG ?? "launch_city",
  });

  return NextResponse.redirect(trackedUrl);
}

async function recordClickIfDatabaseExists(listingId: string) {
  if (!process.env.DATABASE_URL) return;
  if (!isUuid(listingId)) return;

  const [{ db }, { clickEvents }] = await Promise.all([
    import("@/db/client"),
    import("@/db/schema"),
  ]);

  await db.insert(clickEvents).values({
    listingId,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
