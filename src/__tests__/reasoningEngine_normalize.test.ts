import { normalizeFromData, runShoulderReasoningFromData } from "../reasoningEngine/index";

describe("normalizeFromData (flat app record -> typed engine inputs)", () => {
  it("maps special tests, ROM and MMT from the flat data object", () => {
    const data = {
      cc_main: "Right shoulder pain",
      cc_onset: "insidious, no injury",
      sh_agg_mov: "overhead reaching",
      sh_hawkins: "positive",
      sh_neer: "positive",
      sh_painful_arc: "positive",
      sh_abduction_arom: "140", sh_abduction_prom: "165",
      mmt_supraspinatus_L: "4", mmt_supraspinatus_R: "3",
      palp_pins: JSON.stringify([{ structures: ["greater tuberosity"] }]),
    };
    const { subjective, objective, region } = normalizeFromData(data);
    expect(region).toBe("shoulder");
    expect(subjective.overheadAggravation).toBe(true);
    expect(subjective.onsetInsidious).toBe(true);
    expect(objective.specialTests.hawkins).toBe(true);
    expect(objective.specialTests.painful_arc).toBe(true);
    expect(objective.rom[0].movement).toBe("Abduction");
    // worse side wins on MMT (grade 3, not 4)
    expect(objective.mmt[0].grade).toBe(3);
    expect(objective.palpation.tenderStructures).toContain("greater tuberosity");
  });

  it("runs the full pipeline from a flat record and returns a ranked differential", () => {
    const data = {
      cc_main: "shoulder pain overhead",
      sh_agg_mov: "overhead",
      sh_hawkins: "positive", sh_neer: "positive", sh_painful_arc: "positive", sh_empty_can: "positive",
    };
    const r = runShoulderReasoningFromData(data);
    expect(r.stopped).toBe(false);
    expect(r.differentials.length).toBeGreaterThan(0);
    expect(r.differentials[0].name).toMatch(/Subacromial/);
  });

  it("never fabricates findings — an empty record yields no positive tests", () => {
    const { objective } = normalizeFromData({});
    expect(Object.keys(objective.specialTests)).toHaveLength(0);
    expect(objective.rom).toHaveLength(0);
    expect(objective.mmt).toHaveLength(0);
  });
});
