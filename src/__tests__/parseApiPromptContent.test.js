// Regression coverage for /api/parse's system prompt content itself
// (the chiefComplaint chronicity bug found via real-transcript QA, and
// the 7 fields added to close the "should have been extracted
// automatically" gap it also found). This is a Vercel serverless
// function, not a plain exported module, so rather than refactor it
// just to make the prompt importable (real risk for a file that ships
// straight to production), this reads the source text directly -- a
// deliberately blunt check that the specific bug can't silently come
// back and that the new fields are actually in the shipped prompt,
// without needing a live Groq call.

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "api/parse.js"), "utf-8");

describe("/api/parse system prompt content", () => {
  test("no longer uses 'Chronic' in the chiefComplaint worked example (the exact QA-reported bug: 3 weeks labelled chronic)", () => {
    expect(src).not.toContain("Chronic mechanical low back pain, no red flags");
  });

  test("explicitly instructs the model not to invent a chronicity/duration adjective in chiefComplaint", () => {
    expect(src).toMatch(/chiefComplaint[\s\S]{0,400}chronicity/i);
  });

  test("schema includes all 7 fields added from the QA review", () => {
    for (const field of [
      "hasBladderBowelSymptoms",
      "priorEpisodeCount",
      "priorEpisodeOutcome",
      "medicalHistory",
      "medications",
      "functionalLimitations",
      "patientGoals",
    ]) {
      expect(src).toContain(`"${field}"`);
    }
  });

  test("still preserves the zero-hallucination instruction block", () => {
    expect(src).toContain("DO NOT HALLUCINATE");
    expect(src).toContain("_confidence");
    expect(src).toContain("_sourceQuotes");
  });
});
