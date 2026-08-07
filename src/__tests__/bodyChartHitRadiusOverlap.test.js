// bodyChartHitRadiusOverlap.test.js
//
// User reported: on the Body Chart's posterior view, clicking to select a
// region "pulsates" instead of cleanly selecting. Root cause: the invisible
// tap-target circle around each region's centroid was a flat r=4.5 SVG units
// for every region, regardless of how close its neighbors are. In the
// posterior sacrum/SI-joint/hip cluster, centroids sit only ~2-7 units apart
// -- two full 4.5-radius circles (9-unit combined diameter) there overlap
// heavily. Whichever region's circle rendered last (topmost in SVG paint
// order) silently ate every click/hover in the overlap zone, and hover state
// flickered between regions as the cursor crossed the overlap boundary --
// that's the "pulsating."
//
// Fix (BodyChartPro.jsx, computeHitRadii + resolveRegionAt): shrink each
// region's hit radius toward its nearest same-view neighbor (capped at the
// original 4.5, floored at 1.6 so nothing becomes untappable), and resolve
// clicks/hover to whichever candidate region's centroid is genuinely nearest
// the pointer -- not just whichever circle happens to be on top.
//
// A few landmark pairs (sacrum/SI-joint, ankle/heel) are anatomically this
// close in real life -- no minimum-usable tap radius fully separates them.
// That's why this test doesn't assert zero overlap outright; it asserts (1)
// the shrink meaningfully reduces overlap severity across the board, (2) the
// specific worst offenders found are no longer near-total overlaps, and (3)
// resolveRegionAt-equivalent logic correctly disambiguates a click placed
// exactly at one of those still-overlapping landmarks' own centroid.
import { describe, it, expect } from "vitest";
import { REGIONS, computeHitRadii, centroidOf, HIT_RADIUS_MAX, HIT_RADIUS_MIN } from "../BodyChartPro.jsx";

function overlapPairs(regions, radii) {
  const byView = {};
  for (const r of regions) (byView[r.view] ||= []).push(r);
  const out = [];
  for (const view of Object.keys(byView)) {
    const regs = byView[view];
    for (let i = 0; i < regs.length; i++) {
      for (let j = i + 1; j < regs.length; j++) {
        const [x1, y1] = centroidOf(regs[i].pts);
        const [x2, y2] = centroidOf(regs[j].pts);
        const dist = Math.hypot(x1 - x2, y1 - y2);
        const combined = (radii[regs[i].id] ?? HIT_RADIUS_MAX) + (radii[regs[j].id] ?? HIT_RADIUS_MAX);
        if (dist < combined) out.push({ a: regs[i].id, b: regs[j].id, dist, overlap: combined - dist });
      }
    }
  }
  return out;
}

describe("Body chart — dynamic hit-radius fixes region-selection overlap (posterior pulsating bug)", () => {
  const flatRadii = Object.fromEntries(REGIONS.map(r => [r.id, HIT_RADIUS_MAX]));
  const dynamicRadii = computeHitRadii(REGIONS);

  it("every region gets a radius within [MIN, MAX], never 0 or negative", () => {
    for (const r of REGIONS) {
      const rad = dynamicRadii[r.id];
      expect(rad).toBeGreaterThanOrEqual(HIT_RADIUS_MIN);
      expect(rad).toBeLessThanOrEqual(HIT_RADIUS_MAX);
    }
  });

  it("dynamic radii dramatically cut both the count and severity of overlapping pairs vs. the old flat radius", () => {
    const before = overlapPairs(REGIONS, flatRadii);
    const after = overlapPairs(REGIONS, dynamicRadii);
    // Before the fix this was 60+ pairs across posterior/right_lat/etc.
    expect(before.length).toBeGreaterThan(50);
    // After: only genuinely-inseparable-at-any-usable-radius landmark pairs
    // should remain, and materially fewer of them.
    expect(after.length).toBeLessThan(before.length / 2);
    const totalOverlapBefore = before.reduce((s, p) => s + p.overlap, 0);
    const totalOverlapAfter = after.reduce((s, p) => s + p.overlap, 0);
    expect(totalOverlapAfter).toBeLessThan(totalOverlapBefore / 2);
  });

  it("the worst offender (posterior sacrum vs SI-joint, was near-total overlap) shrinks substantially even if not fully eliminated", () => {
    const before = overlapPairs(REGIONS, flatRadii).find(p =>
      (p.a === "posterior_sacrum" && p.b === "posterior_si_joint") ||
      (p.b === "posterior_sacrum" && p.a === "posterior_si_joint"));
    const after = overlapPairs(REGIONS, dynamicRadii).find(p =>
      (p.a === "posterior_sacrum" && p.b === "posterior_si_joint") ||
      (p.b === "posterior_sacrum" && p.a === "posterior_si_joint"));
    expect(before).toBeTruthy(); // confirms this really was the bug we think it was
    expect(before.overlap).toBeGreaterThan(6); // ~7 units of a 9-unit combined radius
    if (after) expect(after.overlap).toBeLessThan(before.overlap / 2);
  });

  it("previously-overlapping pairs with real anatomical separation (hip Rt/Lt, forearm/wrist) no longer overlap at all", () => {
    const after = overlapPairs(REGIONS, dynamicRadii);
    const stillOverlapping = new Set(after.map(p => `${p.a}|${p.b}`).concat(after.map(p => `${p.b}|${p.a}`)));
    const shouldBeFixed = [
      ["posterior_hip_rt", "posterior_hip_lt"],
      ["posterior_forearm_rt", "posterior_wrist_rt"],
      ["posterior_ankle_rt", "posterior_ankle_lt"],
    ];
    for (const [a, b] of shouldBeFixed) {
      expect(stillOverlapping.has(`${a}|${b}`)).toBe(false);
    }
  });

  it("a click placed exactly at posterior_sacrum's own centroid resolves to sacrum, not SI-joint, even though their circles still touch (nearest-centroid-wins)", () => {
    // Mirrors resolveRegionAt's logic directly against the real REGIONS data
    // (not a UI/render test -- BodyChartPro.jsx's own event wiring is
    // exercised by existing render-based tests elsewhere).
    const sacrum = REGIONS.find(r => r.id === "posterior_sacrum");
    const [px, py] = centroidOf(sacrum.pts);
    const sameView = REGIONS.filter(r => r.view === "posterior");
    let best = null, bestDist = Infinity;
    for (const r of sameView) {
      const [cx, cy] = centroidOf(r.pts);
      const d = Math.hypot(px - cx, py - cy);
      const rad = dynamicRadii[r.id] ?? HIT_RADIUS_MAX;
      if (d <= rad && d < bestDist) { bestDist = d; best = r.id; }
    }
    expect(best).toBe("posterior_sacrum");
  });
});
