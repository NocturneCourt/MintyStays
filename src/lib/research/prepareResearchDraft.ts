import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const researchListingSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(["hotel", "str"]),
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    source: z.string().min(1).default("research_capture"),
    sourceUrl: z.string().url().optional(),
    affiliateBaseUrl: z.string().url().optional(),
    acType: z.enum(["split", "central", "portable", "none"]).optional(),
    evidenceSourceLabel: z.string().optional(),
    evidenceSourceUrl: z.string().url().optional(),
    authoredDates: z.array(dateSchema).optional(),
    capturePath: z.string().optional(),
    captureText: z.string().optional(),
  })
  .refine((listing) => listing.capturePath || listing.captureText, {
    message: "Each research listing needs capturePath or captureText.",
  });

export const researchCaptureFileSchema = z.object({
  city: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    country: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    isActive: z.boolean().default(true),
  }),
  observedAt: dateSchema,
  listings: z.array(researchListingSchema).min(1),
});

export type ResearchCaptureFile = z.infer<typeof researchCaptureFileSchema>;

const csvColumns = [
  "city_name",
  "city_country",
  "city_lat",
  "city_lng",
  "city_is_active",
  "name",
  "type",
  "lat",
  "lng",
  "address",
  "source",
  "source_url",
  "affiliate_base_url",
  "ac_type",
  "evidence_summary",
  "evidence_source_label",
  "evidence_source_url",
  "evidence_observed_at",
  "evidence_is_paraphrased",
  "handpicked",
  "editor_verified",
  "editor_score",
  "review_excerpts",
  "review_authored_dates",
] as const;

const coolingKeywordPattern =
  /\b(?:a\/?c|air[-\s]?(?:con|conditioning|conditioner)|cool(?:ed|ing)?|cold|hot|stuffy|stifling|fan|fans|temperature|thermostat|climate control)\b/i;

export type ResearchDraftOptions = {
  baseDir?: string;
  maxCandidatesPerListing?: number;
};

export async function buildResearchDraftCsv(
  rawInput: unknown,
  options: ResearchDraftOptions = {},
) {
  const input = researchCaptureFileSchema.parse(rawInput);
  const rows = await Promise.all(
    input.listings.map(async (listing) => {
      const captureText =
        listing.captureText ??
        (await readFile(resolve(options.baseDir ?? process.cwd(), listing.capturePath!), "utf8"));
      const candidates = extractCoolingCandidates(captureText, {
        maxCandidates: options.maxCandidatesPerListing,
      });

      return csvColumns.map((column) => {
        switch (column) {
          case "city_name":
            return input.city.name;
          case "city_country":
            return input.city.country;
          case "city_lat":
            return input.city.lat;
          case "city_lng":
            return input.city.lng;
          case "city_is_active":
            return input.city.isActive;
          case "name":
            return listing.name;
          case "type":
            return listing.type;
          case "lat":
            return listing.lat;
          case "lng":
            return listing.lng;
          case "address":
            return listing.address;
          case "source":
            return listing.source;
          case "source_url":
            return listing.sourceUrl;
          case "affiliate_base_url":
            return listing.affiliateBaseUrl;
          case "ac_type":
            return listing.acType;
          case "evidence_summary":
            return candidates.length
              ? `DRAFT ONLY: ${candidates.length} cooling candidate(s) captured. Paraphrase before seed import.`
              : "DRAFT ONLY: no cooling candidate found in capture.";
          case "evidence_source_label":
            return listing.evidenceSourceLabel ?? "Tool-assisted research capture";
          case "evidence_source_url":
            return listing.evidenceSourceUrl ?? listing.sourceUrl;
          case "evidence_observed_at":
            return input.observedAt;
          case "evidence_is_paraphrased":
            return false;
          case "handpicked":
            return false;
          case "editor_verified":
            return false;
          case "editor_score":
            return "";
          case "review_excerpts":
            return candidates.join("|");
          case "review_authored_dates":
            return listing.authoredDates?.slice(0, candidates.length).join("|") ?? "";
        }
      });
    }),
  );

  return [csvColumns.join(","), ...rows.map((row) => row.map(toCsvValue).join(","))].join(
    "\n",
  );
}

export async function buildResearchDraftCsvFromFile(
  inputPath: string,
  options: Omit<ResearchDraftOptions, "baseDir"> = {},
) {
  const absoluteInputPath = resolve(process.cwd(), inputPath);
  const raw = JSON.parse(await readFile(absoluteInputPath, "utf8")) as unknown;

  return buildResearchDraftCsv(raw, {
    ...options,
    baseDir: dirname(absoluteInputPath),
  });
}

export function extractCoolingCandidates(
  text: string,
  options: { maxCandidates?: number } = {},
) {
  const maxCandidates = options.maxCandidates ?? 5;
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const chunk of splitCandidateChunks(text)) {
    const normalized = normalizeCandidate(chunk);
    if (!normalized || !coolingKeywordPattern.test(normalized)) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push(normalized);
    if (candidates.length >= maxCandidates) break;
  }

  return candidates;
}

function splitCandidateChunks(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9"'])/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function normalizeCandidate(value: string) {
  const cleaned = value
    .replace(/^[-*#+>\s]+/, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/[`*_]/g, "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 12) return "";
  return cleaned.length > 240 ? `${cleaned.slice(0, 237).trim()}...` : cleaned;
}

function toCsvValue(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
