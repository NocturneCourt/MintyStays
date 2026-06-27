import { z } from "zod";

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
  reviewExcerpts: z.array(z.string().min(1)).default([]),
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
