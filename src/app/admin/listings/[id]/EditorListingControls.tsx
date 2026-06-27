"use client";

import { useState, useTransition } from "react";
import type { EditorScore, TrustTier } from "@/lib/scoring/trustTier";

type EditableListing = {
  id: string;
  name: string;
  isHandpicked: boolean;
  editorScore: EditorScore | null;
  editorVerifiedAt: Date | string | null;
  trustTier: TrustTier;
  guestSignalScore: number | null;
  guestSignalStatus: "unverified" | "scored";
};

const editorScoreOptions: { value: EditorScore; label: string }[] = [
  { value: "verified_cold", label: "Verified Cold" },
  { value: "verified_adequate", label: "Verified Adequate" },
  { value: "verified_weak", label: "Verified Weak" },
  { value: "verified_broken", label: "Verified Broken" },
];

export function EditorListingControls({ listing }: { listing: EditableListing }) {
  const [isHandpicked, setIsHandpicked] = useState(listing.isHandpicked);
  const [editorVerified, setEditorVerified] = useState(
    Boolean(listing.editorVerifiedAt && listing.editorScore),
  );
  const [editorScore, setEditorScore] = useState<EditorScore | "">(
    listing.editorScore ?? "",
  );
  const [trustTier, setTrustTier] = useState(listing.trustTier);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/editor/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isHandpicked,
          editorVerified,
          editorScore: editorScore || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { listing?: EditableListing; error?: string }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "Editorial update failed");
        return;
      }

      if (payload?.listing) {
        setTrustTier(payload.listing.trustTier);
      }

      setMessage("Editorial fields saved");
    });
  }

  return (
    <section className="editor-form" aria-label="Editorial listing controls">
      <div>
        <h1>{listing.name}</h1>
        <p>
          Guest Signal:{" "}
          {listing.guestSignalScore == null
            ? "Unverified"
            : `${listing.guestSignalScore}/100`}{" "}
          ({listing.guestSignalStatus})
        </p>
        <p>Current trust tier: {formatTrustTier(trustTier)}</p>
      </div>

      <label className="editor-checkbox">
        <input
          type="checkbox"
          checked={isHandpicked}
          onChange={(event) => setIsHandpicked(event.target.checked)}
        />
        Handpicked
      </label>

      <label className="editor-checkbox">
        <input
          type="checkbox"
          checked={editorVerified}
          onChange={(event) => {
            setEditorVerified(event.target.checked);

            if (!event.target.checked) {
              setEditorScore("");
            }
          }}
        />
        Editor Verified
      </label>

      <label className="editor-field">
        Editor Score
        <select
          value={editorScore}
          disabled={!editorVerified}
          onChange={(event) => setEditorScore(event.target.value as EditorScore)}
        >
          <option value="">Not set</option>
          {editorScoreOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" disabled={isPending} onClick={submit}>
        {isPending ? "Saving" : "Save editorial fields"}
      </button>

      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}

function formatTrustTier(tier: TrustTier) {
  switch (tier) {
    case "editor_verified":
      return "Editor Verified";
    case "handpicked":
      return "Handpicked";
    case "scored":
      return "Scored";
    case "unverified":
      return "Unverified";
  }
}
