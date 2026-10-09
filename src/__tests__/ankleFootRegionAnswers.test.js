// Ankle / Foot: the Subjective form saves answers under the region's own id
// (regions.ankle / regions.foot). The matcher used to read regions.ankleFoot, which
// nothing writes, so ticked answers never reached it. Same bug as Elbow/Wrist/Hand.
import { describe, it, expect } from "vitest";
import { runAnkleFootDifferential, hasAnkleFootChecklistData } from "../orthoAnkleFootReasoning.js";

const sprain = {
  location: "Lateral ankle ligaments",
  mechanism: "Inversion sprain (rolled inward)",
  aggravating: "Walking / running",
  swelling: "Moderate — persistent low-grade swelling",
};
const withAnswers = (regions) => ({ demographics: { age: "28" }, subjective: { chiefComplaint: "Rolled my ankle", regions } });
const matched = (res) => res.conditions.filter((c) => c.supportingMatched.length > 0);

describe("Ankle / Foot reads the answers the form really saves", () => {
  it("regions.ankle is picked up", () => {
    const data = withAnswers({ ankle: sprain });
    expect(hasAnkleFootChecklistData(data)).toBe(true);
    expect(matched(runAnkleFootDifferential(data)).length).toBeGreaterThan(0);
  });

  it("regions.foot is picked up too", () => {
    const data = withAnswers({ foot: { location: "Plantar heel / arch", aggravating: "First steps in the morning" } });
    expect(matched(runAnkleFootDifferential(data)).length).toBeGreaterThan(0);
  });

  it("the older regions.ankleFoot key still works", () => {
    expect(matched(runAnkleFootDifferential(withAnswers({ ankleFoot: sprain }))).length).toBeGreaterThan(0);
  });

  it("nothing ticked -> nothing supports any condition", () => {
    expect(matched(runAnkleFootDifferential(withAnswers({ ankle: {} }))).length).toBe(0);
  });
});
