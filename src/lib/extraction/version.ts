export const DEFAULT_COOLING_EXTRACTION_VERSION = "cooling-v1";

export function getCoolingExtractionVersion(
  env: Record<string, string | undefined> = process.env,
) {
  return env.COOLING_EXTRACTION_VERSION?.trim() || DEFAULT_COOLING_EXTRACTION_VERSION;
}
