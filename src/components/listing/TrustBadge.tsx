import { BadgeCheck, Gauge, Sparkles, TimerReset } from "lucide-react";
import type { TrustTier } from "@/lib/scoring/trustTier";

export function TrustBadge({ tier }: { tier: TrustTier }) {
  return (
    <span className={`trust-badge ${tier}`}>
      {renderTierIcon(tier)}
      {formatTier(tier)}
    </span>
  );
}

function formatTier(tier: TrustTier) {
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

function renderTierIcon(tier: TrustTier) {
  switch (tier) {
    case "editor_verified":
      return <BadgeCheck size={13} aria-hidden="true" />;
    case "handpicked":
      return <Sparkles size={13} aria-hidden="true" />;
    case "scored":
      return <Gauge size={13} aria-hidden="true" />;
    case "unverified":
      return <TimerReset size={13} aria-hidden="true" />;
  }
}
