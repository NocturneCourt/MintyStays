import { getServerSession } from "next-auth/next";
import { notFound } from "next/navigation";
import { ListingDetail } from "@/components/listing/ListingDetail";
import { buildAuthOptions } from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";
import { canAccessEditor, canAccessInsider } from "@/lib/auth/roles";
import { getListingDetail } from "@/lib/listings/getListingDetail";

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const listing = await getListingDetail(id);

  if (!listing) {
    notFound();
  }

  const authState = await getAuthState();

  return <ListingDetail listing={listing} authState={authState} />;
}

async function getAuthState() {
  if (!isAuthEnabled()) {
    return { enabled: false as const };
  }

  const authOptions = await buildAuthOptions();
  const session = await getServerSession(authOptions);

  return {
    enabled: true as const,
    canAccessInsider: canAccessInsider(session?.user),
    canAccessEditor: canAccessEditor(session?.user),
  };
}
