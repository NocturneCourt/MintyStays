import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Guest Signal Works",
  description:
    "MintyStays explains how Guest Signal is calculated without blending it with Editor Score.",
};

export default function GuestSignalPage() {
  return (
    <main className="detail-shell">
      <article className="detail-main explainer-main">
        <Link className="detail-back" href="/">
          Back to map
        </Link>
        <section className="detail-hero">
          <div className="detail-intro">
            <span className="eyebrow">Transparent formula</span>
            <h1>Guest Signal is not a vibe check.</h1>
            <p className="detail-summary">
              It is a separate machine-auditable score from cooling mentions in
              reviews and qualifying human contributions. Editor Score is a
              different human layer and is never averaged into it.
            </p>
          </div>
          <aside className="detail-score-card">
            <span className="eyebrow">Hard rule</span>
            <p className="score-note">
              Fewer than three cooling mentions means no number. Very old or
              off-season mentions can also remain Unverified when their
              effective sample is too thin.
            </p>
          </aside>
        </section>

        <section className="detail-grid">
          <div className="detail-panel">
            <span className="eyebrow">Inputs</span>
            <h2>What counts</h2>
            <ul className="explainer-list">
              <li>Positive, negative, and neutral cooling mentions.</li>
              <li>Scraped baseline reviews, anonymous reports, and Insider reports.</li>
              <li>Review authored date, because extraction time is not evidence.</li>
              <li>Seasonality, because summer cooling reports matter more.</li>
              <li>Broken or non-working AC mentions authored in the trailing 12 months.</li>
            </ul>
          </div>
          <div className="detail-panel">
            <span className="eyebrow">Weights</span>
            <h2>Who said it</h2>
            <ul className="explainer-list">
              <li>Seeded or licensed review baseline: 1.0x.</li>
              <li>Anonymous contribution: 1.25x.</li>
              <li>Insider Member report: 2.5x.</li>
              <li>Editorial verification sets Editor Score, not Guest Signal.</li>
            </ul>
          </div>
        </section>

        <section className="detail-panel">
          <span className="eyebrow">Formula shape</span>
          <h2>How the number is produced</h2>
          <ol className="explainer-list">
            <li>Count cooling mentions. Below three means Unverified.</li>
            <li>Apply source, authored-date recency, and seasonality weights.</li>
            <li>Calculate the positive-cooling ratio with a conservative prior.</li>
            <li>Compute high, moderate, or low confidence from effective sample size.</li>
            <li>Subtract a soft capped penalty for recent broken-AC evidence.</li>
            <li>Clamp the result to 0-100 and show confidence beside the number.</li>
          </ol>
        </section>
      </article>
    </main>
  );
}
