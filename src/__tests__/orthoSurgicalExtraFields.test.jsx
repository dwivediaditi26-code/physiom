import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SurgicalDetailsSection } from "../orthoSurgicalDetails.jsx";

function Harness({ regions, conditionId, initial = {} }) {
  const [data, setData] = useState({ surgicalReview: initial });
  return <SurgicalDetailsSection data={data} setData={setData} sectionKey="surgicalReview" selectedRegions={regions} conditionId={conditionId} />;
}

const has = (label) => { const m = screen.queryAllByText(label, { exact: false }); return m.length ? m : null; };

describe("operative extra fields", () => {
  it("hides them when there was no surgery", () => {
    render(<Harness regions={[{ id: "hip" }]} conditionId="jointReplacement" initial={{ procedureStatus: "No surgery" }} />);
    expect(has("Operative details")).toBeNull();
  });

  it("shows universal + hip implant fields for a hip replacement", () => {
    render(<Harness regions={[{ id: "hip", side: "Right" }]} conditionId="jointReplacement" initial={{ procedureStatus: "Post-operative", procedure: "Total hip arthroplasty" }} />);
    ["Operative details", "Implant manufacturer / model", "Femoral stem type", "Acetabular cup / liner", "Bearing surface", "Hip precautions duration", "Physiotherapy start date"].forEach((l) => expect(has(l)).not.toBeNull());
    expect(has("Cervical spine")).toBeNull();
  });

  it("hip fracture fixation does not ask for stem / cup fields", () => {
    render(<Harness regions={[{ id: "hip" }]} conditionId="fractureORIF" initial={{ procedureStatus: "Post-operative", procedure: "Femoral neck fixation" }} />);
    expect(has("Femoral stem type")).toBeNull();
    expect(has("Hip precautions")).not.toBeNull();
  });

  it("knee replacement shows polyethylene insert and patellar resurfacing; spine fields stay hidden", () => {
    render(<Harness regions={[{ id: "knee" }]} conditionId="jointReplacement" initial={{ procedureStatus: "Revision surgery", procedure: "Total knee arthroplasty" }} />);
    expect(has("Polyethylene insert")).not.toBeNull();
    expect(has("Patellar resurfacing")).not.toBeNull();
    expect(has("Number of fused levels")).toBeNull();
  });

  it("cervical spine shows collar + swallowing; lumbar shows BLT + dural tear", () => {
    const { unmount } = render(<Harness regions={[{ id: "cervical" }]} conditionId="spineSurgery" initial={{ procedureStatus: "Post-operative" }} />);
    expect(has("Collar type and duration")).not.toBeNull();
    expect(has("Swallowing / voice symptoms")).not.toBeNull();
    expect(has("Dural tear")).toBeNull();
    unmount();
    render(<Harness regions={[{ id: "lumbar" }]} conditionId="spineSurgery" initial={{ procedureStatus: "Post-operative" }} />);
    expect(has("Bending / lifting / twisting restrictions")).not.toBeNull();
    expect(has("Dural tear")).not.toBeNull();
    expect(has("Swallowing")).toBeNull();
  });

  it("typing into an extra field keeps the value", () => {
    render(<Harness regions={[{ id: "hip" }]} conditionId="jointReplacement" initial={{ procedureStatus: "Post-operative", procedure: "Total hip arthroplasty" }} />);
    const input = screen.getByPlaceholderText("Exactly as ordered — they differ by approach and surgeon");
    fireEvent.change(input, { target: { value: "No flexion past 90°" } });
    expect(input.value).toBe("No flexion past 90°");
  });
});
