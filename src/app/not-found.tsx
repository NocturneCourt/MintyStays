import Link from "next/link";
import { Snowflake } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="error-shell">
      <section className="error-card" aria-labelledby="not-found-title">
        <span className="brand-mark" aria-hidden="true">
          <Snowflake size={20} />
        </span>
        <span className="eyebrow">404 / off the map</span>
        <h1 id="not-found-title">That stay isn&apos;t here.</h1>
        <p>The link may be stale, or this listing may have left the launch city.</p>
        <Link className="booking-link" href="/">
          Return to the map
        </Link>
      </section>
    </main>
  );
}
