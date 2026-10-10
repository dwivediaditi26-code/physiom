// phraseEngineStory.test.js -- the rule flag `story`: a rule may also need a word from ANYWHERE in the note, even from another
// sentence. A clinician writes "Sudden. After a fall. Cannot lift the arm." in fragments; each sentence is read on its own otherwise.
import { describe, it, expect } from "vitest";
import { createPhraseMatcher } from "../phraseEngine.js";

const phrases = { flags: { "Cannot lift": ["~placeholder phrase"], "Other": ["~another placeholder"] } };
const matcher = createPhraseMatcher({
  phrases,
  singleChoiceFields: [],
  ownWords: "arm shoulder",
  foreignWords: "knee",
  rules: ({ rule }) => {
    rule("flags", "Cannot lift", ["cannot unable", "lift raise", "arm"], 6, { selfNeg: true, story: "fall fell accident injury" });
    rule("flags", "Other", ["cannot unable", "lift raise", "arm"], 6, { selfNeg: true });
  },
});
const sug = (t) => matcher.understandStory(t).suggestions.map((s) => s.option);

describe("rule flag: story", () => {
  it("is satisfied by a word in another sentence", () => {
    expect(sug("Fell on the stairs. Cannot lift the arm.")).toContain("Cannot lift");
    expect(sug("Cannot lift the arm. Fell on the stairs yesterday.")).toContain("Cannot lift");
  });
  it("is not satisfied when the word is nowhere in the note", () => {
    expect(sug("Cannot lift the arm.")).not.toContain("Cannot lift");
    expect(sug("Cannot lift the arm.")).toContain("Other");
  });
  it("a negated word does not count (English and Hinglish)", () => {
    expect(sug("No injury. Cannot lift the arm.")).not.toContain("Cannot lift");
    expect(sug("Without any injury, cannot lift the arm.")).not.toContain("Cannot lift");
  });
  it("the word still counts when a different, un-negated mention exists", () => {
    expect(sug("No accident at work, but fell at home. Cannot lift the arm.")).toContain("Cannot lift");
  });
  it("works in a long note (the rules read it in chunks)", () => {
    const filler = Array.from({ length: 120 }, () => "word").join(" ");
    expect(sug(`Fell on the stairs. ${filler}. Cannot lift the arm.`)).toContain("Cannot lift");
  });
});
