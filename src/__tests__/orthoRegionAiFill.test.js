import { describe, it, expect } from "vitest";
import { regionFieldsFromParse } from "../orthoRegionAiFill.js";
import { splitMultiValue } from "../orthoFieldKit.jsx";
import { subjectiveFieldsForRegion } from "../orthoSubjectiveRegionData.js";
import { AI_REGION_CASES } from "../../e2e/ai-region-cases.js";

const picked = (value, regionId, fieldId) => splitMultiValue(value, (subjectiveFieldsForRegion({ id: regionId }).find((f) => f.id === fieldId) || {}).options || []);

describe("AI parse -> region-specific subjective fields", () => {
  AI_REGION_CASES.forEach((c) => {
    it(`${c.id}: ticks what was said, nothing else`, () => {
      const filled = regionFieldsFromParse(c.region, c.parse);
      Object.entries(c.expect).forEach(([key, options]) => {
        const [rid, field] = key.split(".");
        options.forEach((o) => expect(picked(filled[field], c.region.id, field), `${key} should include "${o}" (got "${filled[field] || ""}")`).toContain(o));
      });
      Object.entries(c.forbid || {}).forEach(([key, options]) => {
        const [rid, field] = key.split(".");
        options.forEach((o) => expect(picked(filled[field], c.region.id, field), `${key} must NOT include "${o}"`).not.toContain(o));
      });
    });
    if (c.expectNarrative) {
      it(`${c.id}: reads yes/no screens from the narrative itself`, () => {
        const filled = regionFieldsFromParse(c.region, { ...c.parse, _narrative: c.narrative });
        Object.entries(c.expectNarrative).forEach(([key, options]) => {
          const [, field] = key.split(".");
          options.forEach((o) => expect(picked(filled[field], c.region.id, field)).toContain(o));
        });
      });
    }
  });
});
