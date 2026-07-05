import { z } from "zod";

const envSchema = z.object({
  AUTH_ENABLED: z.enum(["true", "false"]).default("false"),
  AUTH_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  LAUNCH_CITY_SLUG: z.string().min(1).default("lisbon"),
  MAP_STYLE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export type LaunchEnv = z.infer<typeof envSchema>;

export type EnvCheckResult = {
  env: LaunchEnv;
  errors: string[];
  warnings: string[];
};

export function checkLaunchEnv(
  env: Record<string, string | undefined> = process.env,
): EnvCheckResult {
  const normalized = {
    AUTH_ENABLED: env["AUTH_ENABLED"] || "false",
    AUTH_SECRET: blankToUndefined(env["AUTH_SECRET"]),
    DATABASE_URL: blankToUndefined(env["DATABASE_URL"]),
    EMAIL_FROM: blankToUndefined(env["EMAIL_FROM"]),
    EMAIL_PROVIDER_API_KEY: blankToUndefined(env["EMAIL_PROVIDER_API_KEY"]),
    LAUNCH_CITY_SLUG: env["LAUNCH_CITY_SLUG"] || "lisbon",
    MAP_STYLE_URL: blankToUndefined(env["MAP_STYLE_URL"]),
    NEXT_PUBLIC_SITE_URL:
      env["NEXT_PUBLIC_SITE_URL"] || "http://localhost:3000",
  };
  const parsed = envSchema.safeParse(normalized);
  const errors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  const value = parsed.success ? parsed.data : envSchema.parse({});
  const warnings: string[] = [];

  if (!value.DATABASE_URL) {
    warnings.push("DATABASE_URL is not set; public pages will use seed fallback data.");
  }

  if (value.AUTH_ENABLED === "true") {
    if (!value.DATABASE_URL) {
      errors.push("DATABASE_URL is required when AUTH_ENABLED=true.");
    }

    if (!value.AUTH_SECRET) {
      errors.push("AUTH_SECRET is required when AUTH_ENABLED=true.");
    }

    if (!value.EMAIL_FROM || !value.EMAIL_PROVIDER_API_KEY) {
      errors.push(
        "EMAIL_FROM and EMAIL_PROVIDER_API_KEY are required when AUTH_ENABLED=true.",
      );
    }
  } else if (!value.AUTH_SECRET) {
    warnings.push("AUTH_SECRET should be set before deploy, even with auth hidden.");
  }

  if (!value.NEXT_PUBLIC_SITE_URL.includes("mintystays.com")) {
    warnings.push("NEXT_PUBLIC_SITE_URL is not mintystays.com.");
  }

  return {
    env: value,
    errors,
    warnings,
  };
}

function blankToUndefined(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}
