"use client";

import Link from "next/link";
import { useState } from "react";

export type ReviewQueueItem = {
  id: string;
  name: string;
  cityName: string;
  guestSignalScore: number | null;
  editorScore:
    | "verified_cold"
    | "verified_adequate"
    | "verified_weak"
    | "verified_broken"
    | null;
  updatedAt: string;
};

export function ReviewQueue({ initialItems }: { initialItems: ReviewQueueItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function resolveListing(listingId: string) {
    setResolvingId(listingId);
    setMessage(null);

    try {
      const response = await fetch(`/api/editor/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNeeded: false }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not resolve review");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== listingId));
    } catch {
      setMessage("Could not resolve review");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <section className="review-queue" aria-labelledby="review-queue-title">
      <header className="review-queue-header">
        <div>
          <p className="eyebrow">Editor operations</p>
          <h1 id="review-queue-title">Cooling review queue</h1>
          <p>{items.length} listing{items.length === 1 ? "" : "s"} need review.</p>
        </div>
        <Link className="secondary-link" href="/">
          Back to map
        </Link>
      </header>

      {message ? (
        <p className="form-message error" role="alert">
          {message}
        </p>
      ) : null}

      {items.length ? (
        <div className="review-queue-list">
          {items.map((item) => (
            <article className="review-queue-item" key={item.id}>
              <div>
                <h2>{item.name}</h2>
                <p>
                  {item.cityName} · Guest Signal: {formatGuestSignal(item.guestSignalScore)}
                  {item.editorScore ? ` · Editor Score: ${formatEditorScore(item.editorScore)}` : ""}
                </p>
                <p>Flagged or updated {formatDate(item.updatedAt)}.</p>
              </div>
              <div className="review-queue-actions">
                <Link href={`/listings/${item.id}`}>Open listing</Link>
                <Link href={`/admin/listings/${item.id}`}>Edit listing</Link>
                <button
                  type="button"
                  disabled={resolvingId === item.id}
                  onClick={() => resolveListing(item.id)}
                >
                  {resolvingId === item.id ? "Resolving" : "Mark reviewed"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="review-queue-empty">No listings are waiting for review.</p>
      )}
    </section>
  );
}

function formatGuestSignal(score: number | null) {
  return score == null ? "Unverified" : `${score}/100`;
}

function formatEditorScore(score: ReviewQueueItem["editorScore"]) {
  return score?.replace("verified_", "") ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
