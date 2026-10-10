// regionPhraseMapTyping.test.js -- the matchers "in real time" for Shoulder, Knee, Hip, Ankle/Foot and the spine regions (the Elbow
// version is elbowPhraseMapTyping.test.js): every messy test sentence is typed one keystroke at a time, the way a
// student types into the box, and the matcher runs after each keystroke. Checks: it is fast enough to run on every
// keystroke, it ends in the same place as reading the finished sentence in one go, and chips do not flash up and
// vanish too often. (The screen also waits 0.3 s for a pause before showing chips, which hides most of that flashing.)
import { describe, it, expect } from "vitest";
import * as shoulder from "../shoulderPhraseMap.js";
import * as knee from "../kneePhraseMap.js";
import * as hip from "../hipPhraseMap.js";
import * as ankleFoot from "../ankleFootPhraseMap.js";
import * as thoracic from "../thoracicPhraseMap.js";
import * as cervical from "../cervicalPhraseMap.js";
import * as lumbarSI from "../lumbarSIPhraseMap.js";
import { SHOULDER_A, SHOULDER_B, SHOULDER_C } from "./shoulderWildSets.js";
import { KNEE_A, KNEE_B, KNEE_C } from "./kneeWildSets.js";
import { HIP_A, HIP_B, HIP_C } from "./hipWildSets.js";
import { ANKLE_FOOT_A, ANKLE_FOOT_B, ANKLE_FOOT_C } from "./ankleFootWildSets.js";
import { THORACIC_A, THORACIC_B, THORACIC_C } from "./thoracicWildSets.js";
import { CERVICAL_A, CERVICAL_B, CERVICAL_C } from "./cervicalWildSets.js";
import { LUMBAR_SI_A, LUMBAR_SI_B, LUMBAR_SI_C } from "./lumbarSIWildSets.js";

const REGIONS = [
  { key: "Shoulder", mod: shoulder, rows: [...SHOULDER_A, ...SHOULDER_B, ...SHOULDER_C] },
  { key: "Knee", mod: knee, rows: [...KNEE_A, ...KNEE_B, ...KNEE_C] },
  { key: "Hip", mod: hip, rows: [...HIP_A, ...HIP_B, ...HIP_C] },
  { key: "Ankle/Foot", mod: ankleFoot, rows: [...ANKLE_FOOT_A, ...ANKLE_FOOT_B, ...ANKLE_FOOT_C] },
  { key: "Thoracic", mod: thoracic, rows: [...THORACIC_A, ...THORACIC_B, ...THORACIC_C] },
  { key: "Cervical", mod: cervical, rows: [...CERVICAL_A, ...CERVICAL_B, ...CERVICAL_C] },
  { key: "Lumbar/SI", mod: lumbarSI, rows: [...LUMBAR_SI_A, ...LUMBAR_SI_B, ...LUMBAR_SI_C] },
];
const key = (s) => `${s.field}|${s.option}`;

for (const { key: region, mod, rows } of REGIONS) {
  describe(`${region}: typing one keystroke at a time`, () => {
    const stats = (() => {
      const times = []; let flashSentences = 0;
      const mismatches = [];
      for (const [, text] of rows) {
        const finalSet = new Set(mod.understandStory(text).suggestions.map(key));
        const seen = new Set();
        let last;
        for (let i = 1; i <= text.length; i++) {
          const t0 = performance.now();
          last = mod.understandStory(text.slice(0, i));
          times.push(performance.now() - t0);
          last.suggestions.forEach((s) => seen.add(key(s)));
        }
        if (last.suggestions.map(key).sort().join("|") !== [...finalSet].sort().join("|")) mismatches.push(text);
        if ([...seen].some((x) => !finalSet.has(x))) flashSentences++;
      }
      times.sort((a, b) => a - b);
      return { n: times.length, p99: times[Math.floor(times.length * 0.99)], max: times[times.length - 1], flashSentences, mismatches };
    })();

    it("covers 200+ sentences and 6,000+ keystrokes", () => {
      expect(rows.length).toBeGreaterThanOrEqual(200);
      expect(stats.n).toBeGreaterThanOrEqual(6000);
    });
    it("is fast: 99% of keystrokes take under 10 ms, and none takes over 250 ms", () => {
      expect(stats.p99).toBeLessThan(10);
      expect(stats.max).toBeLessThan(250);
    });
    it("the last keystroke ends in exactly the same suggestions as reading the finished sentence", () => {
      expect(stats.mismatches).toEqual([]);
    });
    it("few sentences show a chip that later vanishes (under 12%)", () => {
      expect(stats.flashSentences / rows.length).toBeLessThan(0.12);
    });
    it("typing into one question's own box is just as fast", () => {
      const samples = ["pain on the outside", "pain when walking", "constant pain never goes away", "no swelling", "both sides hurt", "stairs"];
      const times = [];
      for (const text of samples) for (const field of mod.FIELDS) for (let i = 1; i <= text.length; i++) {
        const t0 = performance.now(); mod.understandField(field, text.slice(0, i)); times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      expect(times[Math.floor(times.length * 0.99)]).toBeLessThan(10);
    });
    it("backspacing a sentence removes its suggestions, and empty text suggests nothing", () => {
      const text = rows.find(([, t, want]) => want.length > 0 && t.length > 25)[1];
      expect(mod.understandStory(text).suggestions.length).toBeGreaterThan(0);
      expect(mod.understandStory(text.slice(0, 3)).suggestions).toEqual([]);
      expect(mod.understandStory("").suggestions).toEqual([]);
    });
  });
}
