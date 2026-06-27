import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAuthOptions } from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";
import { canAccessEditor } from "@/lib/auth/roles";
import {
  EditorialInvariantError,
  EditorialListingNotFoundError,
  updateEditorialListing,
} from "@/lib/editorial/editorialService";

const editorialUpdateSchema = z
  .object({
    isHandpicked: z.boolean().optional(),
    editorVerified: z.boolean().optional(),
    editorScore: z
      .enum([
        "verified_cold",
        "verified_adequate",
        "verified_weak",
        "verified_broken",
      ])
      .nullable()
      .optional(),
  })
  .strict();

type EditorListingRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: EditorListingRouteContext,
) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth is not enabled" }, { status: 404 });
  }

  const parsed = editorialUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid editorial payload" },
      { status: 400 },
    );
  }

  const authOptions = await buildAuthOptions();
  const session = await getServerSession(authOptions);

  if (!canAccessEditor(session?.user)) {
    return NextResponse.json(
      { error: "Editor access is required" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const { db } = await import("@/db/client");

  try {
    const listing = await updateEditorialListing(db, {
      listingId: id,
      ...parsed.data,
    });

    return NextResponse.json({ listing });
  } catch (error) {
    if (error instanceof EditorialListingNotFoundError) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (error instanceof EditorialInvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
