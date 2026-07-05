import { RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { ListingFilters } from "@/lib/listings/listingFilters";

export function MapFilters({ filters }: { filters: ListingFilters }) {
  return (
    <form className="filter-bar" action="/" aria-label="Listing filters">
      <label className="filter-field">
        <span>Min Guest Signal</span>
        <input
          type="number"
          name="score"
          min="0"
          max="100"
          placeholder="Any"
          defaultValue={filters.minScore ?? ""}
        />
      </label>
      <label className="filter-field">
        <span>Stay type</span>
        <select name="type" defaultValue={filters.type ?? ""}>
          <option value="">All</option>
          <option value="hotel">Hotels</option>
          <option value="str">Short-term rentals</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Trust tier</span>
        <select name="trustTier" defaultValue={filters.trustTier ?? ""}>
          <option value="">All</option>
          <option value="unverified">Unverified</option>
          <option value="scored">Scored</option>
          <option value="handpicked">Handpicked</option>
          <option value="editor_verified">Editor Verified</option>
        </select>
      </label>
      <button type="submit">
        <SlidersHorizontal size={15} aria-hidden="true" />
        Apply
      </button>
      <Link className="filter-reset" href="/">
        <RotateCcw size={15} aria-hidden="true" />
        Reset
      </Link>
    </form>
  );
}
