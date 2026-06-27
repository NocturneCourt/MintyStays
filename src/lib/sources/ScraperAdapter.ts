import type { ListingSourceAdapter } from "./ListingSourceAdapter";

export class ScraperAdapter implements ListingSourceAdapter {
  readonly sourceName = "scraper";

  async importCity(): Promise<never> {
    throw new Error(
      "ScraperAdapter is a replaceable stub. Core logic must use ListingSourceAdapter.",
    );
  }
}
