export type AuthFeatureEnv = Record<string, string | undefined>;

export function isAuthEnabled(env: AuthFeatureEnv = process.env) {
  return env["AUTH_ENABLED"] === "true";
}
