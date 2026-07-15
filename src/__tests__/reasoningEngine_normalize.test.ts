import { normalizeFromData, runShoulderReasoningFromData } from "../reasoningEngine/index";

describe("normalizeFromData (flat app record -> typed engine inputs, real field ids)", () => {
  it("maps st_ special tests, rom_ ROM and mmt_mmt_ MMT from the flat data object", () => {
    const data = {
      cc_main: "Right shoulder pain",
      cc_onset: "insidious, no injury",
      sh_agg_mov: "overhead reaching",
      st_hawkins: "Positive — subacromial pain",
      st_neer: "Positive — anterior shoulder pain (impingement)",
      st_empty_can: "Positive — painful (tendinopathy)",
      rom_sabd_L_arom: "140", rom_sabd_L_prom: "165",
      mmt_mmt_supra_L: "4", mmt_mmt_supra_R: "3",
      palp_pins: JSON.stringify([{ structures: ["greater tuberosity"] }]),
    };
    const { subjective, objective, region } = normalizeFromData(data);
    expect(region).toBe("shoulder");
    expect(subjective.overheadAggravation).toBe(true);
    expect(subjective.onsetInsidious).toBe(true);
    expect(objective.specialTests.hawkins).toBe(true);
    expect(objective.specialTests.neer).toBe(true);
    expect(objective.specialTests.empty_can).toBe(true);
    expect(objective.rom[0].movement).toBe("Abduction");
    // worse side wins on MMT (grade 3, not 4)
    expect(objective.mmt[0].grade).toBe(3);
    expect(objective.palpation.tenderStructures).toContain("greater tuberosity");
  });

  it("runs the full pipeline from a flat record and returns a ranked differential", () => {
    const data = {
      cc_main: "shoulder pain overhead",
      sh_agg_mov: "overhead",
      st_hawkins: "Positive — subacromial pain",
      st_neer: "Positive — anterior shoulder pain (impingement)",
      st_empty_can: "Positive — painful (tendinopathy)",
    };
    const r = runShoulderReasoningFromData(data);
    expect(r.stopped).toBe(false);
    expect(r.differentials.length).toBeGreaterThan(0);
    expect(r.differentials[0].name).toMatch(/Subacromial|tendinopathy/i);
  });

  it("never fabricates findings — an empty record yields no positive tests", () => {
    const { objective } = normalizeFromData({});
    expect(Object.keys(objective.specialTests)).toHaveLength(0);
    expect(objective.rom).toHaveLength(0);
    expect(objective.mmt).toHaveLength(0);
  });

  it("derives drop-arm from a massive-tear external-rotation-lag result", () => {
    const { objective } = normalizeFromData({ st_er_lag: "Positive — full lag (massive RC tear)" });
    expect(objective.specialTests.er_lag).toBe(true);
    expect(objective.specialTests.drop_arm).toBe(true);
  });
});
