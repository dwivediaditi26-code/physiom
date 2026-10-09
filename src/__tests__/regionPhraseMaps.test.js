// regionPhraseMaps.test.js -- the same structure and round-trip checks for every region's everyday-phrase
// matcher (Shoulder, Knee, Hip, Ankle/Foot). Elbow has its own, longer file (elbowPhraseMap.test.js).
//
//  1. Structure: every option a matcher can suggest is a real option of the Subjective form, spelled exactly;
//     every option of every covered question has phrases in English, Hinglish and Hindi; no phrase is listed twice.
//  2. Round trip: every drafted phrase, put in a sentence, gives back its own option (typed into its own
//     question's box, and inside a free story), whatever the capital letters or spacing.
//  3. The chips screen knows exactly the questions each matcher covers.
import { describe, it, expect } from "vitest";
import { SUBJECTIVE_REGION_FIELDS } from "../orthoSubjectiveRegionData.js";
import { PHRASE_FIELDS } from "../UnderstoodChips.jsx";
import * as shoulder from "../shoulderPhraseMap.js";

export const MATCHERS = [
  { key: "shoulder", mod: shoulder, phrases: shoulder.SHOULDER_PHRASES },
];

const HINGLISH_MARKERS = /\b(dard|haath|kandh[ea]|ghutn[ae]|kulh[ae]|takhn[ae]|pair|edi|nahi|raat|subah|kamzor|sunnpan|jhunjhuni|uthana|uthane|pakad|sujan|chot|gir|dono|kaam|kabhi|hamesha|lagatar|bina|apne|dheere|zyada|koi|aaram|neend|achanak|sekai|dawai|ke|ki|ka|me|se|par)\b/i;

for (const { key, mod, phrases } of MATCHERS) {
  describe(`${key}: structure of the phrase list`, () => {
    const formFields = Object.fromEntries(SUBJECTIVE_REGION_FIELDS[key].map((f) => [f.id, f]));

    it("covers exactly the questions the chips screen expects", () => {
      expect([...mod.FIELDS].sort()).toEqual([...PHRASE_FIELDS[key]].sort());
    });

    it("every covered question exists in the form", () => {
      expect(mod.FIELDS.filter((f) => !formFields[f])).toEqual([]);
    });

    it("every option it can suggest exists, spelled exactly, in the Subjective form", () => {
      const missing = [];
      for (const field of mod.FIELDS) {
        const real = new Set(formFields[field].options);
        for (const option of Object.keys(phrases[field])) if (!real.has(option)) missing.push(`${field}: ${option}`);
      }
      expect(missing).toEqual([]);
    });

    it("every option of the covered questions has phrases (nothing in the form is left out)", () => {
      const left = [];
      for (const field of mod.FIELDS) for (const option of formFields[field].options) if (!phrases[field][option]) left.push(`${field}: ${option}`);
      expect(left).toEqual([]);
    });

    it("every option has at least 8 drafted phrases", () => {
      const thin = [];
      for (const field of mod.FIELDS) for (const [option, list] of Object.entries(phrases[field])) if (list.length < 8) thin.push(`${field}: ${option} (${list.length})`);
      expect(thin).toEqual([]);
    });

    it("each of English, Hinglish and Hindi (Devanagari) is represented for every option", () => {
      const lacking = [];
      for (const field of mod.FIELDS) for (const [option, list] of Object.entries(phrases[field])) {
        const text = list.join(" ");
        if (!/[ऀ-ॿ]/.test(text)) lacking.push(`${field}: ${option} has no Hindi`);
        if (!HINGLISH_MARKERS.test(list.filter((p) => !/[ऀ-ॿ]/.test(p)).join(" "))) lacking.push(`${field}: ${option} has no Hinglish`);
      }
      expect(lacking).toEqual([]);
    });

    it("no non-bare phrase is listed twice across the whole list", () => {
      const seen = new Map(); const dups = [];
      for (const p of mod.allPhrases().filter((x) => !x.bare)) {
        const prior = seen.get(p.key);
        if (prior && (prior.field !== p.field || prior.option !== p.option)) dups.push(`"${p.key}" -> ${prior.field}/${prior.option} AND ${p.field}/${p.option}`);
        seen.set(p.key, p);
      }
      expect(dups).toEqual([]);
    });

    it("no bare word points at two different options inside one question", () => {
      const seen = new Map(); const dups = [];
      for (const p of mod.allPhrases().filter((x) => x.bare)) {
        const k = p.field + "|" + p.key; const prior = seen.get(k);
        if (prior && prior !== p.option) dups.push(`${p.field}: "${p.key}" -> ${prior} AND ${p.option}`);
        seen.set(k, p.option);
      }
      expect(dups).toEqual([]);
    });

    it("has a few hundred phrases and a few dozen word-order rules", () => {
      expect(mod.PHRASE_COUNT).toBeGreaterThanOrEqual(300);
      expect(mod.RULE_COUNT).toBeGreaterThanOrEqual(25);
    });
  });

  describe(`${key}: round trip -- every drafted phrase gives back its own option`, () => {
    it("typed into its own question's box (all phrases, including bare words)", () => {
      const failures = [];
      for (const p of mod.allPhrases()) {
        const got = mod.understandField(p.field, `since two weeks ${p.key} thanks`).byField[p.field] || [];
        if (!got.includes(p.option)) failures.push(`${p.field}/${p.option}: "${p.key}" -> ${JSON.stringify(got)}`);
      }
      expect(failures).toEqual([]);
    });

    it("written inside a free story (phrases that carry their own context)", () => {
      const failures = [];
      for (const p of mod.allPhrases().filter((x) => !x.bare)) {
        const got = mod.understandStory(`since two weeks ${p.key} thanks`).byField[p.field] || [];
        if (!got.includes(p.option)) failures.push(`${p.field}/${p.option}: "${p.key}" -> ${JSON.stringify(got)}`);
      }
      expect(failures).toEqual([]);
    });

    it("capital letters, extra spaces, tabs and new lines make no difference", () => {
      const failures = [];
      for (const p of mod.allPhrases().filter((x) => !x.bare && !/[ऀ-ॿ]/.test(x.key))) {
        const messy = `\n  SINCE   TWO WEEKS\t${p.key.toUpperCase().split(" ").join("   ")}!!!  `;
        const got = mod.understandStory(messy).byField[p.field] || [];
        if (!got.includes(p.option)) failures.push(`${p.field}/${p.option}: "${p.key}"`);
      }
      expect(failures).toEqual([]);
    });
  });
}
