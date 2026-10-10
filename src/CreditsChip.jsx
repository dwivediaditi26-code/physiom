import React from "react";
import { useCredits } from "./useCredits.js";

// Header chip: "🪙 N credits" for one counter, plus "Get credits" once it hits 0.
// kind = "parser" | "analyze". Hidden for admins (unlimited) and until the balance is known.
export default function CreditsChip({ kind }) {
  const c = useCredits();
  const n = c[kind];
  if (c.unlimited || n == null) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} data-testid={`credits-chip-${kind}`}>
      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 999, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>
        🪙 {n} {n === 1 ? "credit" : "credits"}
      </span>
      {n === 0 && (
        <a href="mailto:physiomind3@gmail.com?subject=PhysioMind%20AI%20credits" style={{ color: "#6d28d9", fontWeight: 700, fontSize: "0.75rem", border: "1px solid #6d28d9", borderRadius: 8, padding: "3px 8px", textDecoration: "none", whiteSpace: "nowrap" }}>
          Get credits
        </a>
      )}
    </span>
  );
}
