// Elbow/Wrist/Hand red-flag checklist wording must reach the engine (it used to be
// ignored: the option text never contained the phrases normalize.ts searches for).
import { describe, it, expect } from "vitest";
import { runElbowWristHandDifferential } from "../orthoElbowWristHandReasoning.js";

const run = (redFlags) => runElbowWristHandDifferential({
  demographics: { age: "30", sex: "Male" },
  subjective: { chiefComplaint: "wrist pain", onset: "", regions: { elbowWristHand: { redFlags } } },
});
const sig = (r) => JSON.stringify({ rf: r.redFlag, c: (r.conditions || []).map((c) => [c.name, c.score, (c.supportingMatched || []).length]) });

// "Sudden inability to extend a finger (tendon rupture)" now carries the engine's phrase too, but
// that flag only moves a condition once other findings are present, so it has no stand-alone effect to assert.
describe("Elbow/Wrist/Hand red flags", () => {
  const base = sig(run("None of the above"));
  it.each([
    "Snuffbox tenderness after a fall (possible scaphoid fracture)",
    "Hot / red / swollen joint",
    "Rapidly increasing swelling / severe pain (compartment syndrome)",
  ])("'%s' changes the result", (opt) => {
    expect(sig(run(opt))).not.toBe(base);
  });

  it("hot swollen joint and compartment syndrome raise the stop", () => {
    expect(run("Hot / red / swollen joint").redFlag.triggered).toBe(true);
    expect(run("Rapidly increasing swelling / severe pain (compartment syndrome)").redFlag.triggered).toBe(true);
  });
});
