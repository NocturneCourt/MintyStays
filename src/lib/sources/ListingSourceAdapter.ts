import { z } from "zod";

const evidenceSourceSchema = z.object({
  label: z.string().min(1).optional(),
  url: z.string().url().optional(),
  observedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for observedAt")
    .optional(),
  paraphrased: z.boolean().optional(),
});

const reviewExcerptSchema = z.preprocess(
  (value) => (typeof value === "string" ? { text: value } : value),
  z.object({
    text: z.string().min(1),
    authoredAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for authoredAt")
      .optional(),
  }),
);

export const seedListingSchema = z.object({
  citySlug: z.string().min(1),
  city: z
    .object({
      name: z.string().min(1),
      country: z.string().min(1),
      lat: z.number(),
      lng: z.number(),
      isActive: z.boolean().optional(),
    })
    .optional(),
  name: z.string().min(1),
  type: z.enum(["hotel", "str"]),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  affiliateBaseUrl: z.string().url().optional(),
  acType: z.enum(["split", "central", "portable", "none"]).optional(),
  evidenceSummary: z.string().optional(),
  evidenceSource: evidenceSourceSchema.optional(),
  editorial: z
    .object({
      handpicked: z.boolean().optional(),
      editorVerified: z.boolean().optional(),
      editorScore: z
        .enum([
          "verified_cold",
          "verified_adequate",
          "verified_weak",
          "verified_broken",
        ])
        .optional(),
    })
    .optional(),
  reviewExcerpts: z.array(reviewExcerptSchema).default([]),
});

export const seedFileSchema = z.object({
  city: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    country: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    isActive: z.boolean().optional(),
  }),
  listings: z.array(seedListingSchema.omit({ city: true, citySlug: true })),
});

export type SeedListing = z.infer<typeof seedListingSchema>;
export type SeedFile = z.infer<typeof seedFileSchema>;

export interface ListingSourceAdapter {
  readonly sourceName: string;
  importCity(input: { citySlug: string; path?: string }): Promise<SeedListing[]>;
}
