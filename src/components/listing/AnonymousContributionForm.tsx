"use client";

import { useState, type FormEvent } from "react";
import type { PublicListing } from "@/lib/listings/types";

type SubmissionState =
  | { kind: "idle"; message: string }
  | { kind: "submitting"; message: string }
  | { kind: "success"; message: string }
  | { kind: "duplicate"; message: string }
  | { kind: "error"; message: string };

export function AnonymousContributionForm({
  listingId,
}: {
  listingId: PublicListing["id"];
}) {
  const [vote, setVote] = useState("confirm_cold");
  const [comment, setComment] = useState("");
  const [state, setState] = useState<SubmissionState>({
    kind: "idle",
    message: "No account needed. One cooling report per listing per browser session.",
  });

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting", message: "Saving your cooling report..." });

    const response = await fetch("/api/contributions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listingId,
        vote,
        comment: comment.trim() || undefined,
      }),
    });

    if (response.status === 409) {
      setState({
        kind: "duplicate",
        message: "You already sent a cooling report for this listing.",
      });
      return;
    }

    if (!response.ok) {
      setState({
        kind: "error",
        message: "Could not save that report. Try again in a moment.",
      });
      return;
    }

    setState({
      kind: "success",
      message:
        vote === "confirm_cold"
          ? "Thanks. Your cold-room confirmation was recorded."
          : "Thanks. This listing is flagged for cooling review.",
    });
    setComment("");
  }

  return (
    <form className="contribution-form" onSubmit={submitContribution}>
      <div>
        <h2>How was the cooling?</h2>
        <p className="score-note">
          Anonymous reports feed the Guest Signal layer and stay separate from
          Editor Score.
        </p>
      </div>
      <fieldset>
        <legend>Cooling report</legend>
        <label>
          <input
            type="radio"
            name="vote"
            value="confirm_cold"
            checked={vote === "confirm_cold"}
            onChange={(event) => setVote(event.target.value)}
          />
          Confirm cold
        </label>
        <label>
          <input
            type="radio"
            name="vote"
            value="dispute_weak"
            checked={vote === "dispute_weak"}
            onChange={(event) => setVote(event.target.value)}
          />
          Dispute weak
        </label>
        <label>
          <input
            type="radio"
            name="vote"
            value="broken"
            checked={vote === "broken"}
            onChange={(event) => setVote(event.target.value)}
          />
          Report broken AC
        </label>
      </fieldset>
      <label className="comment-field">
        Optional note
        <textarea
          value={comment}
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Room cooled fast, AC was capped, unit was broken..."
        />
      </label>
      <button type="submit" disabled={state.kind === "submitting"}>
        Send report
      </button>
      <p className={`form-message ${state.kind}`} role="status">
        {state.message}
      </p>
    </form>
  );
}
