import { describe, it, expect } from "vitest";
import { arr, str, multicheckState, selectState, specialTestValue, joinMulti, tierOf } from "../reasoningHelpers.js";

describe("reasoningHelpers: checklist answers", () => {
  it("arr splits a ', '-joined multi-select and ignores empties", () => {
    expect(arr({ a: "Sitting, Bending" }, "a")).toEqual(["Sitting", "Bending"]);
    expect(arr({}, "a")).toEqual([]);
    expect(arr({ a: "" }, "a")).toEqual([]);
  });

  it("str trims and defaults to an empty string", () => {
    expect(str({ a: "  night pain " }, "a")).toBe("night pain");
    expect(str({}, "a")).toBe("");
  });

  it("multicheckState reports unknown / absent / present", () => {
    const neg = ["None"];
    expect(multicheckState({}, "k", neg)).toEqual({ state: "unknown", values: [] });
    expect(multicheckState({ k: "None" }, "k", neg)).toEqual({ state: "absent", values: [] });
    expect(multicheckState({ k: "None, Numbness" }, "k", neg)).toEqual({ state: "present", values: ["Numbness"] });
  });

  it("selectState reports unknown / answered", () => {
    expect(selectState({}, "k")).toEqual({ state: "unknown", value: null });
    expect(selectState({ k: "Gradual" }, "k")).toEqual({ state: "answered", value: "Gradual" });
  });
});

describe("reasoningHelpers: limb regions", () => {
  it("specialTestValue reads a string or the first side that has an answer", () => {
    expect(specialTestValue(null)).toBe("");
    expect(specialTestValue("Positive")).toBe("Positive");
    expect(specialTestValue({ left: "Negative", bilateral: "Positive" })).toBe("Negative");
    expect(specialTestValue({ right: "Positive", left: "Negative" })).toBe("Positive");
    expect(specialTestValue({ bilateral: "Positive" })).toBe("Positive");
    expect(specialTestValue(5)).toBe("");
  });

  it("joinMulti turns an array or value into one ', '-joined string", () => {
    expect(joinMulti(["a", "b"])).toBe("a, b");
    expect(joinMulti("a")).toBe("a");
    expect(joinMulti(undefined)).toBe("");
  });

  it("tierOf gives the plain-language strength of match", () => {
    const f = ["finding"];
    expect(tierOf({ excluded: true })).toBe("Unlikely");
    expect(tierOf({ supportingFindings: [] })).toBe("Insufficient data");
    expect(tierOf({ supportingFindings: f, band: "Low" })).toBe("Weak match");
    expect(tierOf({ supportingFindings: f, band: "Moderate" })).toBe("Possible match");
    expect(tierOf({ supportingFindings: f, band: "High" })).toBe("Strong match");
  });
});
