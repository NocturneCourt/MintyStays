import { NextResponse } from "next/server";
import { checkLaunchEnv } from "@/lib/config/env";

export function GET() {
  const result = checkLaunchEnv();
  const ok = result.errors.length === 0;

  return NextResponse.json(
    {
      ok,
      authEnabled: result.env.AUTH_ENABLED === "true",
      databaseConfigured: Boolean(result.env.DATABASE_URL),
      launchCitySlug: result.env.LAUNCH_CITY_SLUG,
      warnings: result.warnings,
      errors: result.errors,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
