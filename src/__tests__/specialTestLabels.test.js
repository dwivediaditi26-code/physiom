// specialTestLabels.test.js
// Regression test: cross-checking all 89 real special tests defined in
// SPECIAL_TESTS_DATA against the SOAP builders' label maps found ST_LABEL_MAP
// (buildRealtimeSOAP — the actual SOAP paragraph + Live SOAP) missing 57 of
// 89 real tests, and ST_NAMES (SOAPNoteModule's table view) missing 10 of 89.
// Lower severity than the ROM gap since there's a reasonable auto-format
// fallback (strip prefix, title-case), so a positive/negative result was
// never silently dropped — but the label could be poorly formatted (e.g. an
// abbreviation test rendered without proper capitalization). Fixed by
// deriving ST_DATA_LABELS from SPECIAL_TESTS_DATA directly.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { SPECIAL_TESTS_DATA } from "../SubjectiveObjective.jsx";

describe("Special test labels in the SOAP Objective section", () => {
  it("shows the real test name for a test that was missing from ST_LABEL_MAP", () => {
    // st_berg_balance was missing from BOTH old maps.
    const data = { st_berg_balance: "Positive" };
    const soap = buildRealtimeSOAP(data);
    const test = Object.values(SPECIAL_TESTS_DATA).flatMap(r => r.tests).find(t => t.id === "st_berg_balance");
    expect(soap.O).toContain(test.label);
  });

  it("covers every real special test — none fall back to the raw auto-formatted key guess", () => {
    // Not requiring an exact match to SPECIAL_TESTS_DATA's (sometimes longer,
    // e.g. "Cervical Distraction Test") label — a hand-curated shorter label
    // ("Cervical Distraction") that already existed for a test intentionally
    // still wins. What actually matters: no test should render using the
    // auto-formatted fallback derived purely from its own key (strip the
    // st_/lx_ prefix, title-case each underscore-separated word), which is
    // what happens when a test has NO entry in either map at all.
    const allTests = Object.values(SPECIAL_TESTS_DATA).flatMap(region => region.tests);
    const failures = [];
    for (const t of allTests) {
      const soap = buildRealtimeSOAP({ [t.id]: "Positive" });
      const rawFallback = t.id.replace(/^(st_|lx_)/, "").split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const posLine = soap.O.split("\n").find(l => l.startsWith("  Positive:")) || "";
      // Exact match on the whole label used, not substring .includes() — a
      // real label like "Cervical Distraction" legitimately CONTAINS the raw
      // fallback text "Distraction" as a substring, which isn't a bug.
      const labelUsed = posLine.replace("  Positive: ", "").trim();
      if (labelUsed === rawFallback) failures.push(`${t.id} -> fell back to raw-key guess "${rawFallback}"`);
    }
    expect(failures).toEqual([]);
  });
});
