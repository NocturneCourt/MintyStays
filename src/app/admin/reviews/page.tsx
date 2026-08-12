import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { notFound } from "next/navigation";
import { buildAuthOptions } from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";
import { canAccessEditor } from "@/lib/auth/roles";
import { ReviewQueue, type ReviewQueueItem } from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function AdminReviewQueuePage() {
  if (!isAuthEnabled()) {
    notFound();
  }

  const authOptions = await buildAuthOptions();
  const session = await getServerSession(authOptions);

  if (!canAccessEditor(session?.user)) {
    notFound();
  }

  const [{ db }, { cities, listings }] = await Promise.all([
    import("@/db/client"),
    import("@/db/schema"),
  ]);

  const rows = await db
    .select({
      id: listings.id,
      name: listings.name,
      cityName: cities.name,
      guestSignalScore: listings.guestSignalScore,
      editorScore: listings.editorScore,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .where(eq(listings.reviewNeeded, true))
    .orderBy(desc(listings.updatedAt));

  const queueItems: ReviewQueueItem[] = rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <main className="detail-shell">
      <ReviewQueue initialItems={queueItems} />
    </main>
  );
}
