import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildAuthOptions } from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";

type AuthRouteContext = {
  params: Promise<{
    nextauth: string[];
  }>;
};

async function authHandler(request: NextRequest, context: AuthRouteContext) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth is not enabled" }, { status: 404 });
  }

  const authOptions = await buildAuthOptions();

  return NextAuth(request, context, authOptions);
}

export { authHandler as GET, authHandler as POST };
