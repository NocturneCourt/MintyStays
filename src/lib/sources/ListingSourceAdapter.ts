import { z } from "zod";

const httpUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "URL must use http or https");

const cityMetadataSchema = z.object({
  name: z.string().trim().min(1).max(160),
  country: z.string().trim().min(1).max(120),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  isActive: z.boolean().optional(),
});

const evidenceSourceSchema = z.object({
  label: z.string().trim().min(1).max(160).optional(),
  url: httpUrlSchema.optional(),
  observedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for observedAt")
    .optional(),
  paraphrased: z.boolean().optional(),
});

const photoGalleryItemSchema = z.object({
  url: httpUrlSchema,
  attribution: z.string().trim().max(240).optional(),
});

const reviewExcerptSchema = z.preprocess(
  (value) => (typeof value === "string" ? { text: value } : value),
  z.object({
    text: z.string().trim().min(1).max(4_000),
    authoredAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for authoredAt")
      .optional(),
  }),
);

export const seedListingSchema = z.object({
  citySlug: z.string().trim().min(1).max(120),
  city: cityMetadataSchema.optional(),
  name: z.string().trim().min(1).max(160),
  type: z.enum(["hotel", "str"]),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  address: z.string().trim().max(240).optional(),
  source: z.string().trim().min(1).max(120),
  sourceUrl: httpUrlSchema.optional(),
  affiliateBaseUrl: httpUrlSchema.optional(),
  imageUrl: httpUrlSchema.optional(),
  imageAttribution: z.string().trim().max(240).optional(),
  photoGallery: z.array(photoGalleryItemSchema).max(12).optional(),
  acType: z.enum(["split", "central", "portable", "none"]).optional(),
  evidenceSummary: z.string().trim().max(2_000).optional(),
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
  city: cityMetadataSchema.extend({
    slug: z.string().trim().min(1).max(120),
  }),
  listings: z.array(seedListingSchema.omit({ city: true, citySlug: true })),
});

export type SeedListing = z.infer<typeof seedListingSchema>;
export type SeedFile = z.infer<typeof seedFileSchema>;

export interface ListingSourceAdapter {
  readonly sourceName: string;
  importCity(input: { citySlug: string; path?: string }): Promise<SeedListing[]>;
}
