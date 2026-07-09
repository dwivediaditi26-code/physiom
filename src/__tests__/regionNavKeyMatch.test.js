// regionNavKeyMatch.test.js
// Regression test for a real bug: the "Guided assessment workflow" smart
// action grid on the region-specific clinical review tabs (Task 5) only
// rendered for Shoulder (L)/(R) and Knee (L)/(R). Every other region --
// Cervical, Thoracic, Lumbar/SI, Hip/Groin, Ankle/Foot, Elbow/Wrist/Hand --
// silently showed nothing when its tab was selected, and tab colours fell
// back to the generic accent purple instead of their intended region colour.
//
// Root cause: runEngineV6's per-region results are keyed by the specific,
// laterality-suffixed selection string (e.g. "Elbow (R)", "Ankle/Foot (L)"),
// but REGION_NAV and RC_S only define one shared entry per region *family*
// (bare "Elbow/Wrist/Hand", "Ankle / Foot", etc). Shoulder and Knee happened
// to work because those two are the only families REGION_NAV/RC_S key
// per-side rather than as a bare family name -- every other region's lookup
// was silently missing the whole time; the region tabs just made the gap
// visible by isolating each region's content instead of stacking everything
// together.
//
// The fix: REGION_FAMILY_KEY (previously a local `_RKEY2` redeclared inside
// runEngineV6, now a shared module-level export) translates the specific
// selection string to the family key before every REGION_NAV/RC_S lookup.
// This test enumerates every region string runEngineV6 can actually produce
// and asserts each one resolves to a real, non-empty REGION_NAV entry and a
// real RC_S colour -- so this exact silent-miss class of bug can't return
// for any region without failing here first.
import { describe, it, expect } from "vitest";
import { REGION_NAV, REGION_FAMILY_KEY, RC_S } from "../SubjectiveObjective.jsx";

const ALL_SELECTABLE_REGIONS = [
  "Cervical (L)", "Cervical (R)",
  "Thoracic (L)", "Thoracic (R)",
  "Lumbar/SI (L)", "Lumbar/SI (R)",
  "Shoulder (L)", "Shoulder (R)",
  "Elbow (L)", "Elbow (R)",
  "Wrist/Hand (L)", "Wrist/Hand (R)",
  "Hip/Groin (L)", "Hip/Groin (R)",
  "Knee (L)", "Knee (R)",
  "Ankle/Foot (L)", "Ankle/Foot (R)",
];

describe("REGION_NAV / RC_S resolve for every selectable region, not just Shoulder/Knee", () => {
  for (const region of ALL_SELECTABLE_REGIONS) {
    it(`"${region}" resolves to a non-empty smart action grid`, () => {
      const key = REGION_FAMILY_KEY[region] || region;
      const buttons = REGION_NAV[key] || [];
      expect(buttons.length).toBeGreaterThan(0);
    });

    it(`"${region}" resolves to a real RC_S colour, not the generic fallback`, () => {
      const key = REGION_FAMILY_KEY[region] || region;
      expect(RC_S[key]).toBeTruthy();
    });
  }
});
