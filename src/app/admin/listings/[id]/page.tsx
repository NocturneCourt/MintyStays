import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { notFound } from "next/navigation";
import { buildAuthOptions } from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";
import { canAccessEditor } from "@/lib/auth/roles";
import { EditorListingControls } from "./EditorListingControls";

type AdminListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminListingPage({ params }: AdminListingPageProps) {
  if (!isAuthEnabled()) {
    notFound();
  }

  const authOptions = await buildAuthOptions();
  const session = await getServerSession(authOptions);

  if (!canAccessEditor(session?.user)) {
    notFound();
  }

  const { id } = await params;
  const [{ db }, { listings }] = await Promise.all([
    import("@/db/client"),
    import("@/db/schema"),
  ]);
  const [listing] = await db
    .select({
      id: listings.id,
      name: listings.name,
      isHandpicked: listings.isHandpicked,
      editorScore: listings.editorScore,
      editorVerifiedAt: listings.editorVerifiedAt,
      trustTier: listings.trustTier,
      guestSignalScore: listings.guestSignalScore,
      guestSignalStatus: listings.guestSignalStatus,
    })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  if (!listing) {
    notFound();
  }

  return (
    <main className="detail-shell">
      <EditorListingControls listing={listing} />
    </main>
  );
}
