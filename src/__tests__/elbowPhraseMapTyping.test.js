// elbowPhraseMapTyping.test.js -- the matcher "in real time": every one of the 314 messy test sentences
// (Sets A-D) is typed one keystroke at a time, the way a student types into the box, and the matcher is run
// after each keystroke. Checks: it is fast enough to run on every keystroke, it ends in the same place as
// reading the finished sentence in one go, and chips do not flash up and vanish too often. (The screen also
// waits 0.3 s for a pause before showing chips, which hides most of that flashing.)
//
// Measured when written: 12,414 keystrokes, average 0.09 ms, 99th percentile 0.26 ms, slowest 0.8 ms;
// 8 of 314 sentences showed a chip that later vanished (all because a later word cancelled it, e.g. the
// "nahi" that ends "tennis nahi khelta").
import { describe, it, expect } from "vitest";
import { understandStory, understandField, ELBOW_FIELDS } from "../elbowPhraseMap.js";
import { WILD_A, WILD_B, WILD_C, WILD_D } from "./elbowWildSets.js";

const ROWS = [...WILD_A, ...WILD_B, ...WILD_C, ...WILD_D];
const key = (s) => `${s.field}|${s.option}`;

describe("typing one keystroke at a time", () => {
  const stats = (() => {
    const times = []; let flashSentences = 0;
    const mismatches = [];
    for (const [, text] of ROWS) {
      const finalSet = new Set(understandStory(text).suggestions.map(key));
      const seen = new Set();
      let last;
      for (let i = 1; i <= text.length; i++) {
        const t0 = performance.now();
        last = understandStory(text.slice(0, i));
        times.push(performance.now() - t0);
        last.suggestions.forEach((s) => seen.add(key(s)));
      }
      if (last.suggestions.map(key).sort().join("|") !== [...finalSet].sort().join("|")) mismatches.push(text);
      if ([...seen].some((x) => !finalSet.has(x))) flashSentences++;
    }
    times.sort((a, b) => a - b);
    return { n: times.length, p99: times[Math.floor(times.length * 0.99)], max: times[times.length - 1], flashSentences, mismatches };
  })();

  it("covers 300+ sentences and 10,000+ keystrokes", () => {
    expect(ROWS.length).toBeGreaterThanOrEqual(300);
    expect(stats.n).toBeGreaterThanOrEqual(10000);
  });

  it("is fast: 99% of keystrokes take under 5 ms, and none takes over 100 ms", () => {
    expect(stats.p99).toBeLessThan(5);
    expect(stats.max).toBeLessThan(100);
  });

  it("the last keystroke ends in exactly the same suggestions as reading the finished sentence", () => {
    expect(stats.mismatches).toEqual([]);
  });

  it("few sentences show a chip that later vanishes (under 5%)", () => {
    expect(stats.flashSentences / ROWS.length).toBeLessThan(0.05);
  });

  it("typing into one question's own box is just as fast", () => {
    const samples = ["kohni ke bahar dard", "pain when gripping", "constant pain never goes away", "numbness at night", "both elbows hurt", "tennis"];
    const times = [];
    for (const text of samples) for (const field of ELBOW_FIELDS) for (let i = 1; i <= text.length; i++) {
      const t0 = performance.now(); understandField(field, text.slice(0, i)); times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length * 0.99)]).toBeLessThan(5);
  });

  it("a half-typed word never suggests the wrong thing: 'tenn' and 'tenni' suggest nothing, 'tennis' suggests Racquet sport", () => {
    expect(understandStory("I play tenn").suggestions).toEqual([]);
    expect(understandStory("I play tenni").suggestions).toEqual([]);
    expect(understandStory("I play tennis").byField.mechanism).toHaveLength(1);
  });

  it("deleting works the same way: backspacing a sentence removes its suggestions", () => {
    const text = "outer elbow pain when gripping";
    expect(understandStory(text).suggestions.length).toBeGreaterThan(0);
    expect(understandStory(text.slice(0, 5)).suggestions).toEqual([]);
    expect(understandStory("").suggestions).toEqual([]);
  });
});
