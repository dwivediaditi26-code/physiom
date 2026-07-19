// Regression coverage for /api/lumbarReasoning's system prompt content --
// this is the user's own clinician-authored "Adaptive Lumbar Clinical
// Reasoning Engine" prompt, reproduced verbatim in api/lumbarReasoning.js
// plus an appended OUTPUT FORMAT section. Mirrors the pattern established
// in parseApiPromptContent.test.js: read the serverless function's source
// text directly (no live Groq call needed) and assert the clinically
// load-bearing phrases and structure are actually present and haven't
// been silently altered or truncated.
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "api/lumbarReasoning.js"), "utf-8");

describe("/api/lumbarReasoning system prompt: clinician-authored reasoning sequence", () => {
  test("frames the model as a reasoning clinician, not an immediate diagnoser", () => {
    expect(src).toMatch(/NOT to diagnose immediately or display every available assessment/);
  });

  test("includes all 4 reasoning steps in order", () => {
    const iStep1 = src.indexOf("Step 1 - Extract Clinical Clues");
    const iStep2 = src.indexOf("Step 2 - Clinical Pattern Recognition");
    const iStep3 = src.indexOf("Step 3 - Prioritize Objective Examination");
    const iStep4 = src.indexOf("Step 4 - Clinical Summary");
    expect(iStep1).toBeGreaterThan(-1);
    expect(iStep2).toBeGreaterThan(iStep1);
    expect(iStep3).toBeGreaterThan(iStep2);
    expect(iStep4).toBeGreaterThan(iStep3);
  });

  test("Step 1 covers the full clinical clue checklist", () => {
    for (const clue of [
      "Pain location", "Symptom behaviour", "Onset", "Mechanism of injury",
      "Pain severity", "Pain irritability", "Duration", "Aggravating factors",
      "Relieving factors", "Functional limitations", "Morning stiffness",
      "Night pain", "Neurological symptoms", "Red flags", "Previous episodes",
      "Occupation", "Sports/activity demands", "Age", "Psychosocial factors",
    ]) {
      expect(src).toContain(clue);
    }
  });

  test("Step 2 lists all 10 candidate lumbar patterns and never confirms a diagnosis", () => {
    for (const pattern of [
      "Mechanical lumbar pain", "Discogenic pain", "Lumbar radiculopathy",
      "Lumbar spinal stenosis", "Facet joint syndrome", "SI joint dysfunction",
      "Instability", "Inflammatory back pain", "Nociplastic pain", "Serious pathology",
    ]) {
      expect(src).toContain(pattern);
    }
    expect(src).toContain("Presentation suggests-not confirmed diagnosis");
    expect(src).toMatch(/Never state a confirmed diagnosis/);
  });

  test("Step 2 requires High/Moderate/Low probability assignment", () => {
    expect(src).toMatch(/High Probability, Moderate Probability, or Low Probability/);
  });

  test("Step 3 covers all 6 objective examination categories with priority ranking", () => {
    for (const category of [
      "Observation", "Lumbar ROM", "MMT", "Functional Assessment",
      "Kinetic Chain Assessment", "Special Tests",
    ]) {
      expect(src).toContain(category);
    }
    expect(src).toMatch(/High Priority, Moderate Priority, or Optional/);
  });

  test("Special Tests are explicitly gated by pattern, not exhaustively listed", () => {
    expect(src).toMatch(/Never display unnecessary tests/);
    expect(src).toContain("Straight Leg Raise");
    expect(src).toContain("Kemp's Test");
    expect(src).toContain("Laslett Cluster");
    expect(src).toContain("Prone Instability Test");
    expect(src).toContain("Schober Test");
  });

  test("includes the evidence-based source list", () => {
    for (const source of [
      "Magee", "McKenzie", "Maitland", "Sahrmann", "Butler",
      "Richardson & Hodges", "Hides", "NICE",
    ]) {
      expect(src).toContain(source);
    }
  });

  test("appends a grounding rule so findings can't be invented beyond the given narrative", () => {
    expect(src).toMatch(/Ground every clue, hypothesis, and recommendation in the Subjective Assessment text/);
  });

  test("output format specifies hypotheses, a 6-category objectivePlan, and a clinicalSummary", () => {
    expect(src).toContain('"clinicalClues"');
    expect(src).toContain('"hypotheses"');
    expect(src).toContain('"objectivePlan"');
    for (const key of ["observation", "rom", "mmt", "functional", "kineticChain", "specialTests"]) {
      expect(src).toContain(`"${key}"`);
    }
    expect(src).toContain('"clinicalSummary"');
  });

  test("instructs against padding empty categories just to fill them", () => {
    expect(src).toMatch(/do not pad a list just to fill it/);
  });
});
