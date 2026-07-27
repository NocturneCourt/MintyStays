import { NextResponse } from "next/server";
import { checkLaunchEnv } from "@/lib/config/env";

export async function GET() {
  const result = checkLaunchEnv();
  const envOk = result.errors.length === 0;
  const databaseConfigured = Boolean(result.env.DATABASE_URL);
  const database = await probeDatabase(result.env.DATABASE_URL);
  const ok = envOk && database.ok;

  return NextResponse.json(
    {
      ok,
      authEnabled: result.env.AUTH_ENABLED === "true",
      databaseConfigured,
      database,
      launchCitySlug: result.env.LAUNCH_CITY_SLUG,
      warnings: result.warnings,
      errors: [
        ...result.errors,
        ...(database.ok ? [] : [database.error ?? "Database probe failed"]),
      ],
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function probeDatabase(databaseUrl: string | undefined): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!databaseUrl) {
    // Local seed mode is allowed when env check does not require DB.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "DATABASE_URL is required in production" };
    }
    return { ok: true, error: undefined };
  }

  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/db/client"),
      import("drizzle-orm"),
    ]);
    await db.execute(sql`select 1`);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database probe failed";
    console.error("Health database probe failed", error);
    return { ok: false, error: message };
  }
}
