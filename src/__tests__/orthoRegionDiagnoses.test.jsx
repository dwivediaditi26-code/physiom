import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { diagnosisOptionsFor, regionBucketsOf, REGION_CONDITIONS } from "../orthoRegionDiagnoses.js";
import { DiagnosisSection } from "../clinicalInterpretation.jsx";
import cervical from "../cervicalConditions.json";
import thoracic from "../thoracicConditions.json";
import lumbar from "../lumbarConditions.json";
import shoulder from "../shoulderConditions.json";
import hip from "../hipConditions.json";
import knee from "../kneeConditions.json";
import ankleFoot from "../ankleFootConditions.json";
import elbowWristHand from "../elbowWristHandConditions.json";

const FILES = { cervical, thoracic, lumbar, shoulder, hip, knee, ankleFoot, elbowWristHand };

describe("region diagnosis lists", () => {
  it("are the same condition names the Objective step uses (copy has not drifted)", () => {
    for (const [bucket, file] of Object.entries(FILES)) {
      expect(REGION_CONDITIONS[bucket], bucket).toEqual(Object.values(file).map((c) => c.name));
    }
  });

  it("use the app's own region rule (sacrum/pelvis -> lumbar, forearm/hand -> elbow-wrist-hand, foot -> ankle)", () => {
    expect(regionBucketsOf([{ id: "sacrum" }, { id: "pelvis" }])).toEqual(["lumbar"]);
    expect(regionBucketsOf([{ id: "forearm" }, { id: "hand" }, { id: "elbow" }])).toEqual(["elbowWristHand"]);
    expect(regionBucketsOf([{ id: "foot" }, { id: "ankle" }])).toEqual(["ankleFoot"]);
    expect(regionBucketsOf([{ id: "upperArm" }])).toEqual(["shoulder"]);
    expect(regionBucketsOf([{ id: "thigh" }, { id: "wholeBody" }, { id: "multiple" }])).toEqual([]);
  });

  it("knee: real knee diagnoses; differential adds what is normally considered", () => {
    const o = diagnosisOptionsFor([{ id: "knee", side: "Right" }]);
    expect(o.label).toBe("Knee");
    expect(o.diagnoses).toContain("ACL Tear / Insufficiency");
    expect(o.diagnoses).toContain("Patellofemoral Pain Syndrome (PFPS)");
    expect(o.differentials).toContain("Meniscal Tear");
    expect(o.differentials).toContain("Hip referral");
    expect(o.differentials).toContain("Lumbar referral (L3-L4)");
  });

  it("keeps 'exclude' and red-flag prompts out of diagnoses but in the differential", () => {
    const o = diagnosisOptionsFor([{ id: "shoulder" }]);
    expect(o.diagnoses.some((n) => /exclude/i.test(n))).toBe(false);
    expect(o.differentials.some((n) => /Cervical Referral/.test(n))).toBe(true);
    const c = diagnosisOptionsFor([{ id: "cervical" }]);
    expect(c.diagnoses.some((n) => /Serious Pathology/.test(n))).toBe(false);
    expect(c.differentials.some((n) => /Serious Pathology/.test(n))).toBe(true);
  });

  it("drops the internal '(Hand model)' / '(Wrist model)' tags and joins several regions", () => {
    const o = diagnosisOptionsFor([{ id: "hand" }, { id: "knee" }]);
    expect(o.label).toBe("Elbow / Wrist / Hand / Knee");
    expect(o.diagnoses.some((n) => /model\)|, Hand model/i.test(n))).toBe(false);
    expect(o.diagnoses).toContain("Carpal Tunnel Syndrome (Median Nerve)");
    expect(o.diagnoses).toContain("Meniscal Tear");
  });

  it("gives nothing for a region without a list of its own", () => {
    expect(diagnosisOptionsFor([{ id: "thigh" }])).toMatchObject({ diagnoses: [], differentials: [] });
  });
});

function Harness({ regions }) {
  const [data, setData] = useState({});
  return (
    <>
      <DiagnosisSection data={data} setData={setData} kind="ortho" selectedRegions={regions} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </>
  );
}
const saved = () => JSON.parse(screen.getByTestId("data").textContent);

describe("Ortho Diagnosis page, by region", () => {
  it("lets you pick the region's physiotherapy diagnosis and still type your own", () => {
    render(<Harness regions={[{ id: "knee" }]} />);
    const box = screen.getByPlaceholderText("Tap to pick a Knee diagnosis, or type your own");
    fireEvent.focus(box);
    fireEvent.click(screen.getByText("Meniscal Tear"));
    expect(saved().diagnosis.physiotherapyDiagnosis).toBe("Meniscal Tear");
    fireEvent.change(box, { target: { value: "Meniscal Tear, Post-traumatic effusion" } });
    expect(saved().diagnosis.physiotherapyDiagnosis).toBe("Meniscal Tear, Post-traumatic effusion");
  });

  it("offers the region's differential, not the generic list", () => {
    render(<Harness regions={[{ id: "shoulder" }]} />);
    const differential = screen.getByPlaceholderText("Tap to pick from the list, or type your own"); // the physiotherapy diagnosis box has its own region hint
    fireEvent.focus(differential);
    expect(screen.getByText("Adhesive Capsulitis (Frozen Shoulder)")).toBeTruthy();
    expect(screen.getByText("Thoracic outlet syndrome")).toBeTruthy();
    expect(screen.queryByText("Ligament sprain")).toBeNull();
  });

  it("falls back to a typed diagnosis and the general differential list when the region has no list", () => {
    render(<Harness regions={[{ id: "thigh" }]} />);
    expect(screen.getByPlaceholderText("Type your clinical diagnosis")).toBeTruthy();
    fireEvent.focus(screen.getByPlaceholderText("Tap to pick from the list, or type your own"));
    expect(screen.getByText("Ligament sprain")).toBeTruthy();
  });
});
