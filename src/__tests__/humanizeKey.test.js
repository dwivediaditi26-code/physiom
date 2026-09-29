// Summary screens turn raw data-field keys into row labels; short clinical
// keys must read as full terms, not "Bp Sys" / "Hr" / "Cn5".
import { describe, it, expect } from "vitest";
import { humanizeKey } from "../medicalAbbreviations.js";

describe("humanizeKey", () => {
  it.each([
    ["bpSys", "Blood Pressure (Systolic)"],
    ["bpDia", "Blood Pressure (Diastolic)"],
    ["hr", "Heart Rate"],
    ["rr", "Respiratory Rate"],
    ["spo2", "SpO₂ (Oxygen Saturation)"],
    ["temp", "Temperature"],
    ["cn5", "CN V (Trigeminal)"],
    ["duringHR", "During Heart Rate"],
    ["peakBPs", "Peak Blood Pressure"],
    ["duringSpO2", "During SpO₂"],
    ["preRPE", "Pre RPE (Rate of Perceived Exertion)"],
    ["hpc", "History of Presenting Complaint (HPC)"],
  ])("%s -> %s", (key, label) => {
    expect(humanizeKey(key)).toBe(label);
  });

  it("still splits ordinary camelCase and underscores", () => {
    expect(humanizeKey("bedMobility")).toBe("Bed Mobility");
    expect(humanizeKey("keyFindings")).toBe("Key Findings");
    expect(humanizeKey("some_field")).toBe("Some field");
  });
});
