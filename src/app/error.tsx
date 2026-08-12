"use client";

import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MintyStays page render failed", error);
  }, [error]);

  return (
    <main className="error-shell">
      <section className="error-card" role="alert">
        <p className="eyebrow">Cooling data unavailable</p>
        <h1>We could not load this page.</h1>
        <p>
          The listing service may be restarting. Try again in a moment, or
          return to the map once it is available.
        </p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}
