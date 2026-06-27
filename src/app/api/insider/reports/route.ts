import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listings } from "@/db/schema";
import { buildAuthOptions } from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";
import { toAuthPrincipal } from "@/lib/auth/roles";
import { submitInsiderReport } from "@/lib/contributions/insiderReportService";

const insiderReportSchema = z.object({
  listingId: z.string().min(1),
  vote: z.enum(["confirm_cold", "dispute_weak", "broken"]),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth is not enabled" }, { status: 404 });
  }

  const parsed = insiderReportSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
  }

  const authOptions = await buildAuthOptions();
  const session = await getServerSession(authOptions);
  const principal = toAuthPrincipal(session?.user);

  if (principal.kind === "anonymous") {
    return NextResponse.json(
      { error: "Insider access is required" },
      { status: 401 },
    );
  }

  const { db } = await import("@/db/client");
  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, parsed.data.listingId))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const result = await submitInsiderReport(db, {
    listingId: parsed.data.listingId,
    userId: principal.userId,
    vote: parsed.data.vote,
    comment: parsed.data.comment,
  });

  return NextResponse.json(
    {
      status: result.status,
      listingStatus: result.listingStatus,
      guestSignal: result.guestSignal,
    },
    { status: result.status === "duplicate" ? 409 : 201 },
  );
}
