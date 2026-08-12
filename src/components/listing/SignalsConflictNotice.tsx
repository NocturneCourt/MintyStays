import type { PublicListing } from "@/lib/listings/types";
import { describeSignalsConflict } from "@/lib/scoring/signalsConflict";

export function SignalsConflictNotice({
  listing,
  variant,
}: {
  listing: PublicListing;
  variant: "compact" | "panel";
}) {
  if (!listing.signalsConflict || !listing.editorScore) {
    return null;
  }

  if (variant === "compact") {
    return (
      <span className="signals-conflict-pill" role="status">
        Signals disagree
      </span>
    );
  }

  return (
    <aside className="signals-conflict-panel" aria-label="Signals disagree">
      <strong>Signals disagree</strong>
      <p>
        {describeSignalsConflict(listing.editorScore)} Both scores remain visible and
        unchanged.
      </p>
    </aside>
  );
}
