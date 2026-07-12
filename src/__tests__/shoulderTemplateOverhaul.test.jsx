// shoulderTemplateOverhaul.test.jsx
// Covers the shoulder template overhaul: the user asked for my honest
// review of the existing Shoulder exercise templates, and I flagged two
// real clinical issues -- Frozen Shoulder mixed strengthening in with
// capsule stretching regardless of stage, and Rotator Cuff Tear Rehab
// didn't distinguish conservative management from post-surgical repair,
// which have very different timelines. Fixed by splitting frozen_shoulder
// into 3 staged templates and rct_tear into conservative + 3 post-op
// phases, plus adding 3 templates for conditions the library could
// already mostly support but had no dedicated template for (instability,
// AC joint, SLAP). Also added a `note` field on PROGRAMME_TEMPLATES that
// actually renders in TemplateCard now, used here for real cautions
// (e.g. "confirm surgeon clearance", "timelines vary") rather than being
// silently unused data.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PROGRAMME_TEMPLATES, TEMPLATE_TX, ALL_EXERCISES } from "../sharedClinicalData.js";
import { ExercisePrescriptionModule } from "../ClinicalModules.jsx";

describe("Shoulder template data integrity", () => {
  const shoulderKeys = Object.entries(PROGRAMME_TEMPLATES).filter(([,t]) => t.region === "Shoulder").map(([k]) => k);

  it("has 11 shoulder templates (up from the original 3)", () => {
    expect(shoulderKeys.length).toBe(11);
  });

  it("old ambiguous frozen_shoulder and rct_tear keys no longer exist", () => {
    expect(PROGRAMME_TEMPLATES.frozen_shoulder).toBeUndefined();
    expect(PROGRAMME_TEMPLATES.rct_tear).toBeUndefined();
  });

  it("every exercise referenced by every shoulder template actually exists in the library", () => {
    const failures = [];
    shoulderKeys.forEach(key => {
      PROGRAMME_TEMPLATES[key].exercises.forEach(id => {
        if (!ALL_EXERCISES.find(e => e.id === id)) failures.push(`${key} references missing exercise ${id}`);
      });
    });
    expect(failures).toEqual([]);
  });

  it("every shoulder template has a matching TEMPLATE_TX entry", () => {
    const failures = shoulderKeys.filter(key => !TEMPLATE_TX[key]);
    expect(failures).toEqual([]);
  });

  it("frozen shoulder freezing phase excludes strengthening exercises (no sh_er_band, no sh_wall_slide)", () => {
    const ex = PROGRAMME_TEMPLATES.frozen_shoulder_freezing.exercises;
    expect(ex).not.toContain("sh_er_band");
    expect(ex).not.toContain("sh_wall_slide");
    expect(ex).toContain("sh_pendulum");
  });

  it("frozen shoulder thawing phase is the only stage that includes active strengthening", () => {
    expect(PROGRAMME_TEMPLATES.frozen_shoulder_thawing.exercises).toContain("sh_er_band");
    expect(PROGRAMME_TEMPLATES.frozen_shoulder_frozen.exercises).not.toContain("sh_er_band");
  });

  it("rotator cuff post-op protected phase is passive-only (pendulum) and carries a caution note", () => {
    const t = PROGRAMME_TEMPLATES.rct_postop_protected;
    expect(t.exercises).toEqual(["sh_pendulum"]);
    expect(t.note).toMatch(/timelines vary|surgeon/i);
  });

  it("rotator cuff conservative template now includes the previously-missing empty can and prone ER exercises", () => {
    const ex = PROGRAMME_TEMPLATES.rct_conservative.exercises;
    expect(ex).toContain("sh_empty_can");
    expect(ex).toContain("sh_prone_er");
  });

  it("shoulder instability template avoids capsular stretch exercises (avoid over-stretching an unstable joint)", () => {
    const ex = PROGRAMME_TEMPLATES.shoulder_instability.exercises;
    expect(ex).not.toContain("sh_capsule_stretch");
    expect(ex).not.toContain("sh_ir_stretch");
  });

  it("AC joint template has a referral caution for higher-grade injuries", () => {
    expect(PROGRAMME_TEMPLATES.ac_joint.note).toMatch(/grade III|orthopaedic/i);
  });

  it("SLAP conservative template has a caution against provocative combined abduction/ER loading", () => {
    expect(PROGRAMME_TEMPLATES.slap_conservative.note).toMatch(/abduction/i);
  });
});

describe("Template caution notes actually render in the UI", () => {
  it("the post-op protected phase note is visible when the template card is expanded", () => {
    render(<ExercisePrescriptionModule data={{}} set={vi.fn()} />);
    fireEvent.click(screen.getByText("Protocols & Templates"));
    fireEvent.click(screen.getByText(/💪 Shoulder/));
    fireEvent.click(screen.getByText(/Rotator Cuff Repair — Protected Phase/));
    expect(screen.getByText(/there is little genuine home-exercise component here/)).toBeInTheDocument();
  });
});
