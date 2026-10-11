import { describe, it, expect } from "vitest";
import { orthoStyles } from "../orthoStyles.js";

// 2026-10-10, Aditi's phone screenshot (AI Objective Assessment step): "it is hiding the Back and
// Next bar ... it is cutting it". The round PhysioFeed button in the bottom tabs rises 12px above
// the tab bar (18px negative margin on a 46px circle = 6px above, plus a 6px white ring), and the
// Back/Next bar only left 8px under its buttons, so the round button sat on the lower edge of Next.

const ruleFor = (css, selector) => {
  const m = css.match(new RegExp(`(?:^|\\n)\\s*${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

describe("Ortho wizard Back/Next bar clears the round PhysioFeed button", () => {
  const css = orthoStyles();

  it("leaves at least 14px under the buttons (button + ring rise 12px above the tab bar)", () => {
    const rule = ruleFor(css, ".bottombar");
    const padding = rule.match(/padding:\s*([^;]+);/)?.[1].trim().split(/\s+/).map((v) => parseFloat(v));
    // padding shorthand: top, sides, bottom
    expect(padding?.length).toBe(3);
    expect(padding[2]).toBeGreaterThanOrEqual(14);
  });

  it("stays flush on the tab bar (no floating gap)", () => {
    const rule = ruleFor(css, ".bottombar");
    expect(rule).toContain("bottom: var(--pm-bnav-h, calc(60px + env(safe-area-inset-bottom)));");
  });

  it("keeps the end of the page clear of the bar on tall tab bars (notched phones)", () => {
    const rule = ruleFor(css, ".content");
    // never less than before (150px), and grows with the tab bar's real height
    expect(rule).toMatch(/max\(150px,\s*calc\(var\(--pm-bnav-h,\s*60px\)\s*\+\s*100px\)\)/);
  });
});
