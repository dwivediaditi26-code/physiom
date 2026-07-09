// bodyChartRegions.test.js
// Regression tests for BodyChartPro.jsx's REGIONS data:
//  - Heel was entirely missing as a clickable region (no way to mark heel
//    pain distinct from the general Foot region) -- now exists in posterior
//    and both lateral views, where it's anatomically visible.
//  - Several posterior lower-limb regions (hamstring/thigh, calf, ankle,
//    foot) had their _rt and _lt polygons overlapping in x-coordinates --
//    unlike every other side-pair in the file, which have a clean gap
//    between right and left. Two anterior pairs (ankle, foot) had the same
//    issue. Both were fixed by shifting each side's polygon apart; this
//    test locks in that no _rt/_lt pair overlaps going forward.
import { describe, it, expect } from "vitest";
import { REGIONS } from "../BodyChartPro.jsx";

describe("Body chart — heel region", () => {
  it("exists for posterior (both sides) and both lateral views", () => {
    const ids = REGIONS.map(r => r.id);
    expect(ids).toContain("posterior_heel_rt");
    expect(ids).toContain("posterior_heel_lt");
    expect(ids).toContain("left_lat_heel");
    expect(ids).toContain("right_lat_heel");
  });

  it("every heel region has a valid, non-empty point set", () => {
    const heels = REGIONS.filter(r => r.id.includes("heel"));
    expect(heels.length).toBeGreaterThanOrEqual(4);
    heels.forEach(h => {
      expect(h.pts.length).toBeGreaterThanOrEqual(3);
      h.pts.forEach(([x, y]) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      });
    });
  });
});

describe("Body chart — right/left symmetry", () => {
  it("no _rt/_lt region pair overlaps on the x-axis", () => {
    const byId = Object.fromEntries(REGIONS.map(r => [r.id, r]));
    const checked = new Set();
    const overlaps = [];
    for (const r of REGIONS) {
      if (!r.id.endsWith("_rt")) continue;
      const ltId = r.id.slice(0, -3) + "_lt";
      const lt = byId[ltId];
      if (!lt || checked.has(r.id)) continue;
      checked.add(r.id);
      const xsRt = r.pts.map(p => p[0]);
      const xsLt = lt.pts.map(p => p[0]);
      const overlap = Math.min(Math.max(...xsRt), Math.max(...xsLt)) - Math.max(Math.min(...xsRt), Math.min(...xsLt));
      if (overlap > 0) overlaps.push(`${r.id} vs ${ltId} (overlap ${overlap.toFixed(2)})`);
    }
    expect(overlaps).toEqual([]);
  });
});
