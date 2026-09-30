import { describe, it, expect } from "vitest";
import React from "react";
import { stepIconName, sanitizeStepsMeta, customStepIcon } from "../StepIcons.jsx";

describe("custom step icons are stored as names, not React elements", () => {
  it("heals a legacy element that was corrupted by a JSON round-trip", () => {
    const stored = JSON.parse(JSON.stringify({ a: { icon: <svg data-x />, label: "A" } }));
    // a real Icon element round-trips to {key, ref, props:{name}, ...}
    const legacy = JSON.parse(JSON.stringify({ icon: { key: null, ref: null, props: { name: "heart" } }, label: "Cardio" }));
    expect(stored.a.icon).not.toHaveProperty("$$typeof");
    expect(sanitizeStepsMeta({ x: legacy })).toEqual({ x: { iconName: "heart", label: "Cardio" } });
  });

  it("falls back for unknown or missing icons and keeps the label", () => {
    expect(stepIconName(undefined, "brain")).toBe("brain");
    expect(stepIconName({ iconName: "not-an-icon" }, "brain")).toBe("brain");
    expect(sanitizeStepsMeta({ y: { icon: { props: { name: "nope" } } } })).toEqual({ y: { iconName: undefined, label: "Assessment" } });
  });

  it("is stable across a JSON round-trip (never re-corrupts)", () => {
    const once = sanitizeStepsMeta({ a: { iconName: "brain", label: "A" } });
    const again = sanitizeStepsMeta(JSON.parse(JSON.stringify(once)));
    expect(again).toEqual(once);
  });

  it("customStepIcon always returns a valid element", () => {
    expect(React.isValidElement(customStepIcon({ icon: { props: { name: "heart" } } }, "brain"))).toBe(true);
    expect(React.isValidElement(customStepIcon(undefined, "brain"))).toBe(true);
  });
});
