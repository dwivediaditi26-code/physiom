import { describe, it, expect } from "vitest";
import { demographicsFromPatient, initialDemographics } from "../orthoDemographicsSeed.js";

describe("demographicsFromPatient", () => {
  it("reads what the quick New assessment form leaves on the patient record", () => {
    // startQuickAssessment() in AppFull.jsx seeds exactly these keys.
    const patient = {
      dem_name: "Riya Sharma", dem_age: "34", dem_sex: "Female", dem_phone: "9876543210",
      demographics: { name: "Riya Sharma", age: "34", sex: "Female" },
      chiefComplaint: "", cc_main: "",
    };
    expect(demographicsFromPatient(patient)).toEqual({ name: "Riya Sharma", age: "34", sex: "Female", phone: "9876543210" });
  });

  it("reads the flat keys the New Patient form leaves (name, age, sex, occupation, address)", () => {
    const patient = { dem_name: "Arjun Kapoor", dem_age: "41", dem_sex: "Male", dem_occupation: "Teacher", dem_address: "Pune" };
    expect(demographicsFromPatient(patient)).toEqual({ name: "Arjun Kapoor", age: "41", sex: "Male", occupation: "Teacher", address: "Pune" });
  });

  it("leaves out anything empty or missing, and copes with no patient at all", () => {
    expect(demographicsFromPatient({ dem_name: "  ", dem_age: "", dem_sex: undefined })).toEqual({});
    expect(demographicsFromPatient(undefined)).toEqual({});
    expect(demographicsFromPatient(null)).toEqual({});
  });

  it("turns a numeric age into text", () => {
    expect(demographicsFromPatient({ dem_age: 34 })).toEqual({ age: "34" });
  });
});

describe("initialDemographics", () => {
  it("uses what the clinician typed over the AI intake's guess, and keeps the AI's other fields", () => {
    const ai = { age: "35", sex: "Female", occupation: "Nurse" };
    const patient = { dem_name: "Riya Sharma", dem_age: "34" };
    expect(initialDemographics(ai, patient)).toEqual({ age: "34", sex: "Female", occupation: "Nurse", name: "Riya Sharma" });
  });

  it("is empty when there is nothing from either source", () => {
    expect(initialDemographics(undefined, undefined)).toEqual({});
  });

  it("is just the AI details when the patient record has none", () => {
    expect(initialDemographics({ age: "35" }, {})).toEqual({ age: "35" });
  });
});
