// persistentHighlightVisibility.test.js
// Regression test for a real bug found after Task 6 shipped: the
// persistent highlight (.physio-highlight-persist, injected by
// PhysioNeuro.jsx) was invisible in production. Root cause: every
// highlighted element across ROM, MMT, Neurological, Special Tests, STTT,
// Kinetic Chain, and NKT sets its own inline `background` and `border`
// style (the codebase-wide `style={{background:C.surface, border:...}}`
// card pattern). Inline styles beat non-!important CSS class rules, so
// only the class's border-color (which had !important) was actually
// winning -- background tint and box-shadow glow were silently cancelled,
// making the "persistent" highlight look like nothing happened.
//
// applyPersistentHighlight's class-toggling logic already had coverage
// (persistentHighlight.test.js), which is exactly why this bug slipped
// through: those tests only check *whether* the class is present, not
// whether the underlying CSS can actually out-rank a real element's
// inline styles. This test locks in the actual fix.
//
// Reads the source file directly rather than round-tripping through
// jsdom's <style> textContent -- jsdom's CSSOM silently truncates/
// re-serializes multi-rule stylesheets in ways that don't reflect what a
// real browser does, which would make this test unreliable in either
// direction.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "../PhysioNeuro.jsx"), "utf-8");

describe(".physio-highlight-persist CSS — must win over inline card styles", () => {
  it("declares background, box-shadow, and border-color all with !important", () => {
    const ruleMatch = source.match(/\.physio-highlight-persist\s*\{([^}]*)\}/);
    expect(ruleMatch).toBeTruthy();
    const rule = ruleMatch[1];

    // Every element this class is applied to already sets its own inline
    // background and border -- so without !important here, this class
    // silently loses and renders no visible highlight at all.
    expect(rule).toMatch(/background:[^;]*!important/);
    expect(rule).toMatch(/box-shadow:[^;]*!important/);
    expect(rule).toMatch(/border-color:[^;]*!important/);
  });
});
