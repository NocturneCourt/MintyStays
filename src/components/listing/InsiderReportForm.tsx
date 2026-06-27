"use client";

import { useState, type FormEvent } from "react";
import type { PublicListing } from "@/lib/listings/types";

type SubmissionState =
  | { kind: "idle"; message: string }
  | { kind: "submitting"; message: string }
  | { kind: "success"; message: string }
  | { kind: "duplicate"; message: string }
  | { kind: "error"; message: string };

export function InsiderReportForm({
  listingId,
}: {
  listingId: PublicListing["id"];
}) {
  const [vote, setVote] = useState("confirm_cold");
  const [comment, setComment] = useState("");
  const [state, setState] = useState<SubmissionState>({
    kind: "idle",
    message: "Insider reports are attributable and weighted above anonymous input.",
  });

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting", message: "Saving Insider report..." });

    const response = await fetch("/api/insider/reports", {
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
        message: "You already sent an Insider report for this listing.",
      });
      return;
    }

    if (!response.ok) {
      setState({
        kind: "error",
        message: "Could not save that Insider report.",
      });
      return;
    }

    setState({
      kind: "success",
      message:
        vote === "confirm_cold"
          ? "Insider cold-room confirmation recorded."
          : "Insider dispute recorded for cooling review.",
    });
    setComment("");
  }

  return (
    <form className="contribution-form insider-report-form" onSubmit={submitReport}>
      <div>
        <h2>Insider report</h2>
        <p className="score-note">
          Signed-in Insider reports affect Guest Signal with higher weight and
          remain attributable.
        </p>
      </div>
      <fieldset>
        <legend>Cooling report</legend>
        <label>
          <input
            type="radio"
            name="insider-vote"
            value="confirm_cold"
            checked={vote === "confirm_cold"}
            onChange={(event) => setVote(event.target.value)}
          />
          Confirm cold
        </label>
        <label>
          <input
            type="radio"
            name="insider-vote"
            value="dispute_weak"
            checked={vote === "dispute_weak"}
            onChange={(event) => setVote(event.target.value)}
          />
          Dispute weak
        </label>
        <label>
          <input
            type="radio"
            name="insider-vote"
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
          placeholder="Report what you experienced directly..."
        />
      </label>
      <button type="submit" disabled={state.kind === "submitting"}>
        Send Insider report
      </button>
      <p className={`form-message ${state.kind}`} role="status">
        {state.message}
      </p>
    </form>
  );
}
