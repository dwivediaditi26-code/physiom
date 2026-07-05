// mmtLabels.test.js
// Regression test for a real gap found by cross-checking every muscle
// actually defined in MMT_DATA (PhysioNeuro.jsx) against the SOAP builders'
// hand-maintained label maps: 38 of 72 real muscles (over half) had no entry
// at all — e.g. "mmt_scm" (Sternocleidomastoid), "mmt_trap_u" (Upper
// Trapezius), "mmt_iliop" (Iliopsoas), "mmt_pirif" (Piriformis) all fell
// through to a raw, underscore-stripped fallback instead of a proper muscle
// name — unlike the advanced-assessment modules (NKT/Kinetic Chain), which
// were verified 47/47 and 21/21 complete. Fixed by deriving the label map
// straight from MMT_DATA (the same source MMTModule's own UI already uses)
// instead of a second, hand-copied list that can silently go stale.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { MMT_DATA } from "../PhysioNeuro.jsx";

describe("MMT labels in the SOAP Objective section", () => {
  it("shows the real muscle name for a muscle that was missing from the old hand-written label list", () => {
    // MMTModule writes keys as `mmt_${m.id}_${side}` where m.id already
    // includes the "mmt_" prefix (e.g. m.id === "mmt_scm"), producing the
    // real double-prefixed key "mmt_mmt_scm_L" — reproduced exactly here
    // rather than guessing at a simplified key.
    const data = { mmt_mmt_scm_L: "3" }; // Sternocleidomastoid, Left, grade 3/5
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Sternocleidomastoid");
    expect(soap.O).not.toMatch(/\bscm\b/i); // would indicate the raw-key fallback fired instead
  });

  it("shows a proper label for Upper Trapezius, another previously-missing muscle", () => {
    const data = { mmt_mmt_trap_u_R: "4" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Trap"); // "Upper Trap" per MMT_DATA's own muscle name
  });

  it("covers every single real muscle defined in MMT_DATA — none fall back to raw key text", () => {
    // Not asserting an exact match to MMT_DATA's (sometimes quite verbose,
    // e.g. "Hamstrings (Biceps Femoris + Semitendinosus + Semimembranosus)")
    // full anatomical name — a hand-curated abbreviation like "Hamstrings" is
    // a perfectly good label and intentionally takes precedence where one
    // exists. What actually matters: no muscle should render as the ugly
    // un-fixed fallback, which is just its own id with "mmt_" stripped and
    // underscores turned into spaces (e.g. "mmt_trap_u" -> "trap u").
    const allMuscles = Object.values(MMT_DATA).flat();
    const failures = [];
    for (const m of allMuscles) {
      const key = `mmt_${m.id}_L`; // real double-prefixed key MMTModule actually writes
      const soap = buildRealtimeSOAP({ [key]: "3" }); // grade 3 so it always lands in the "Weakness" line
      const idFragment = m.id.replace(/^mmt_/, "");       // e.g. "scm", "trap_u"
      const rawFallback = idFragment.replace(/_/g, " ");  // e.g. "trap u"
      const weaknessLine = soap.O.split("\n").find(l => l.includes("(L)")) || "";
      const labelUsed = weaknessLine.split(" (L)")[0].replace("  Weakness: ", "").trim();
      // Case-SENSITIVE on purpose: the real un-fixed fallback produces raw,
      // un-capitalized text (e.g. "supinator"), while a real label is always
      // properly capitalized (e.g. "Supinator") even when the words happen
      // to match — a case-insensitive check would mask that distinction.
      if (labelUsed === rawFallback) {
        failures.push(`${m.id} -> still falling back to raw key text: "${labelUsed}"`);
      }
    }
    expect(failures).toEqual([]);
  });
});
