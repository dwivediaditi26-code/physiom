import React, { useState } from "react";
import { useAiCredits, creditsEnforced } from "./aiCredits.js";
import CreditsSheet from "./CreditsSheet.jsx";

// "0 credits" + "Get credits" in the header bar of the AI Objective page (Aditi, 2026-10-10, from her reference
// design). Shows nothing where credits are not switched on (SQL not run) or for a guest (no account, no credits).
export default function CreditsBadge({ requireAuth }) {
  const credits = useAiCredits();
  const [open, setOpen] = useState(false);
  if (!creditsEnforced(credits.state, !!requireAuth)) return null;
  // A guest has no account, so no credits: show "0 credits" and let Get credits ask them to sign in.
  const guest = credits.state === "guest";
  const empty = guest || (!credits.unlimited && credits.state === "ready" && credits.balance < 1);
  const label = credits.state === "error" ? "Credits unavailable" : credits.unlimited ? "Unlimited" : `${guest ? 0 : credits.balance} credit${!guest && credits.balance === 1 ? "" : "s"}`;
  const onGetCredits = () => {
    if (guest && requireAuth && !requireAuth("Get credits", "Sign in to get credits and keep track of them.")) return;
    setOpen(true);
  };
  return (
    <>
      <span className="topbar-credits" data-testid="credits-row">
        <span className={"topbar-credit-chip" + (empty ? " topbar-credit-chip-empty" : "")} data-testid="credit-balance">
          <span aria-hidden="true">🪙</span> {label}
        </span>
        {!credits.unlimited && (
          <button type="button" className="topbar-credit-link" onClick={onGetCredits}>Get credits</button>
        )}
      </span>
      <CreditsSheet open={open} onClose={() => setOpen(false)} balance={credits.balance} unlimited={credits.unlimited} signedIn />
    </>
  );
}
