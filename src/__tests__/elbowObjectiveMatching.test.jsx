// "AI Objective Assessment" for the Elbow / Wrist / Hand group.
//  1. A student who picked ONLY Elbow must be matched against elbow conditions --
//     not wrist or hand ones (Trigger finger used to appear in an Elbow assessment).
//  2. When nothing useful has been ticked in Subjective the page says so plainly,
//     instead of showing "Live Match" with every condition at 0%.
//  3. The Re-analyze button is gone: the list updates by itself, the button only
//     replayed an "Analyzing..." animation and changed nothing.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { runElbowWristHandDifferential } from "../orthoElbowWristHandReasoning.js";

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");

function Harness({ initialData, selectedRegions }) {
  const [data, setDataRaw] = React.useState(initialData);
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  return <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={selectedRegions} />;
}

const ELBOW = [{ id: "elbow", label: "Elbow" }];
const WRIST = [{ id: "wrist", label: "Wrist" }];
const BOTH = [{ id: "elbow", label: "Elbow" }, { id: "wrist", label: "Wrist" }];

// A textbook tennis elbow, ticked the way the Subjective checklist records it.
const tennisElbow = {
  demographics: { age: "35" },
  subjective: {
    chiefComplaint: "Outer elbow pain",
    regions: {
      elbowWristHand: {
        location: ["Lateral elbow"],
        mechanism: ["Racquet sport (lateral elbow)", "Repetitive gripping / lifting"],
        aggravating: ["Gripping", "Wrist extension against resistance"],
        pattern: "Mechanical",
        neuro: ["None"],
        redFlags: ["None of the above"],
      },
    },
  },
};

const cardNames = () => [...document.querySelectorAll(".obj-match-card .obj-match-name")].map((n) => n.textContent);
const WRIST_OR_HAND = /Trigger Finger|Carpal Tunnel|De Quervain|TFCC|Scapholunate|Scaphoid|Distal Radius|CMC|ECU|Digital Osteoarthritis|Dupuytren|Raynaud|Thumb Ulnar|Finger Sprain|Wrist Osteoarthritis/i;

describe("Elbow / Wrist / Hand matching only uses the regions that were picked", () => {
  const names = (res) => res.conditions.map((c) => c.name);

  it("Elbow only -> elbow conditions only, tennis elbow on top", () => {
    const res = runElbowWristHandDifferential(tennisElbow, ELBOW);
    expect(res.conditions.length).toBeGreaterThan(0);
    expect(names(res).some((n) => WRIST_OR_HAND.test(n))).toBe(false);
    expect(names(res)[0]).toMatch(/Lateral epicondylalgia/i);
  });

  it("Wrist only -> wrist conditions only (no elbow ones)", () => {
    const res = runElbowWristHandDifferential(tennisElbow, WRIST);
    expect(names(res).some((n) => /epicondylalgia|Radial tunnel|Pronator|Cubital|Distal biceps|UCL/i.test(n))).toBe(false);
  });

  it("Elbow + Wrist -> both groups can appear", () => {
    const all = names(runElbowWristHandDifferential(tennisElbow, BOTH)).join(" | ");
    expect(all).toMatch(/Lateral epicondylalgia/i);
    expect(all).toMatch(/Trigger finger|ECU|Carpal|Quervain|TFCC/i);
  });

  it("no region given -> unchanged behaviour (all three groups)", () => {
    const all = names(runElbowWristHandDifferential(tennisElbow)).join(" | ");
    expect(all).toMatch(/Lateral epicondylalgia/i);
    expect(all).toMatch(/Trigger finger/i);
  });
});

describe("AI Objective Assessment page for Elbow", () => {
  it("shows only elbow conditions, ranked, with tennis elbow first", () => {
    render(<Harness initialData={tennisElbow} selectedRegions={ELBOW} />);
    const names = cardNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => WRIST_OR_HAND.test(n))).toBe(false);
    expect(names[0]).toMatch(/Lateral Epicondylalgia/i);
    expect(screen.getByText("Live Match")).toBeInTheDocument();
  });

  it("with nothing ticked it says so plainly: no 'Live Match', no 0% cards", () => {
    render(<Harness initialData={{ demographics: { age: "35" }, subjective: { chiefComplaint: "Outer elbow pain for 3 weeks, worse when gripping" } }} selectedRegions={ELBOW} />);
    expect(screen.getByText(/Nothing to match yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Live Match")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    // The conditions are still there to open and examine.
    expect(cardNames().length).toBeGreaterThan(0);
    expect(cardNames().some((n) => WRIST_OR_HAND.test(n))).toBe(false);
  });

  it("has no Re-analyze button", () => {
    render(<Harness initialData={tennisElbow} selectedRegions={ELBOW} />);
    expect(screen.queryByRole("button", { name: /Re-analyze/i })).not.toBeInTheDocument();
  });
});
