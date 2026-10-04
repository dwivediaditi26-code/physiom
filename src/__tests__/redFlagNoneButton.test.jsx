// redFlagNoneButton.test.jsx
// The Red Flag Screen is six empty fields; it was unclear whether blank meant
// "no red flags" (first-time walkthrough, 2026-10-02). A one-tap button now
// answers every question with its negative option.
import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RedFlagScreenSection } from "../orthoOutpatientSections.jsx";

function Harness({ initial = {}, onData }) {
  const [data, setData] = useState({ redFlags: initial });
  onData?.(data);
  return <RedFlagScreenSection data={data} setData={setData} />;
}

describe("Red Flag Screen — No red flags identified", () => {
  it("marks every question negative and the action as proceed, in one tap", () => {
    let latest;
    render(<Harness onData={(d) => { latest = d; }} />);
    fireEvent.click(screen.getByRole("button", { name: /No red flags identified/ }));
    const s = latest.redFlags;
    expect(s.grf_systemic).toBe("None — systemically well");
    expect(s.grf_cancer).toBe("No cancer history");
    expect(s.grf_fracture).toBe("No fracture indicators");
    expect(s.grf_infection).toBe("No infection risk");
    expect(s.grf_neuro).toBe("No neurological red flags");
    expect(s.grf_vascular).toBe("No vascular red flags");
    expect(s.grf_action).toBe("No red flags — proceed with assessment");
    expect(screen.getByRole("button", { name: /✓ No red flags identified/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("clears everything when tapped again", () => {
    let latest;
    render(<Harness onData={(d) => { latest = d; }} />);
    const btn = () => screen.getByRole("button", { name: /No red flags identified/ });
    fireEvent.click(btn());
    fireEvent.click(btn());
    expect(latest.redFlags.grf_systemic).toBe("");
    expect(latest.redFlags.grf_action).toBe("");
  });

  it("keeps answers already given and does not overwrite a chosen action", () => {
    let latest;
    render(<Harness initial={{ grf_cancer: "Past cancer — within last 5 years", grf_action: "GP referral — routine" }} onData={(d) => { latest = d; }} />);
    // A real flag is noted, so the one-tap negative button is not offered.
    expect(screen.queryByRole("button", { name: /No red flags identified/ })).toBeNull();
    expect(latest.redFlags.grf_cancer).toBe("Past cancer — within last 5 years");
  });

  it("only fills blanks when some questions are already answered negative", () => {
    let latest;
    render(<Harness initial={{ grf_systemic: "None — systemically well" }} onData={(d) => { latest = d; }} />);
    fireEvent.click(screen.getByRole("button", { name: /No red flags identified/ }));
    expect(latest.redFlags.grf_vascular).toBe("No vascular red flags");
    expect(latest.redFlags.grf_systemic).toBe("None — systemically well");
  });
});
