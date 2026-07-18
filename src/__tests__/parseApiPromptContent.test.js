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

// Round-3 QA review (real transcript: left shoulder, 3-6 month history,
// house-move lifting) found the extraction was otherwise excellent but
// had specific, repeating hallucination patterns: inventing a pain
// quality ("Sharp") and a previous episode with zero supporting
// evidence, forcing hedged patient language ("maybe that's got
// something to do with it") into a confident fixed mechanism ("Lifting
// injury"), missing the patient's stated fear/concern, missing a
// treatment already tried for the CURRENT episode (conflated into the
// prior-episode fields instead), and dropping explicit negative
// findings ("no numbness", "no pins and needles"). Fixed with more
// precise per-field instructions plus a closing evidence-check pass.
describe("/api/parse system prompt: round-3 anti-hallucination fixes", () => {
  test("onset instructs against forcing hedged/uncertain patient language into a confident mechanism", () => {
    expect(src).toMatch(/onset[\s\S]{0,600}hedges/i);
    expect(src).toContain("onsetContext");
  });

  test("painQuality instructs against inferring a quality the patient never said", () => {
    expect(src).toMatch(/painQuality[\s\S]{0,400}Never pick a quality/);
  });

  test("neuroSymptoms instructs that an explicit denial must be recorded, not left empty", () => {
    expect(src).toMatch(/neuroSymptoms[\s\S]{0,500}EXPLICITLY denies/);
  });

  test("priorEpisodeCount/Outcome instruct against treating a long current episode or a same-episode treatment as a prior episode", () => {
    expect(src).toMatch(/priorEpisodeCount[\s\S]{0,500}SEPARATE, distinct occurrence/);
    expect(src).toContain("priorTreatmentTried");
    expect(src).toMatch(/priorEpisodeOutcome[\s\S]{0,600}Do NOT use this for a treatment tried during the CURRENT episode/);
  });

  test("schema includes the 3 new round-3 fields", () => {
    for (const field of ["patientConcern", "onsetContext", "priorTreatmentTried"]) {
      expect(src).toContain(`"${field}"`);
    }
  });

  test("includes a closing evidence-verification pass referencing the real reported hallucinations", () => {
    expect(src).toContain("FINAL CHECK");
    expect(src).toMatch(/could you point to the actual words in the transcript/);
  });
});
