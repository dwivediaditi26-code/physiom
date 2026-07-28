import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";

describe("Documentation coverage — SOAP surfaces all added tests & scales", () => {
  it("shows new special tests (positive/negative/other) in the O section", () => {
    const data = {
      dem_name:"Test", cc_main:"lbp",
      st_active_slr:"Positive — heavy, improves with pelvic compression",
      st_passive_lumbar_ext:"Positive — LBP that eases on lowering",
      st_pheasant:"Negative",
      st_farfan_torsion:"Positive — usual back pain reproduced",
      st_bicycle_van_gelderen:"Neurogenic — eases with forward lean",
      st_stoop:"Positive — flexion relieves leg pain",
      st_adson:"Negative",
      st_costoclavicular:"Positive — arm symptoms reproduced",
      st_roos_east:"Positive — symptoms before 3 min",
      st_cyriax_release:"Positive — paraesthesia reproduced",
      st_t1_nerve_stretch:"Positive — scapular/medial arm pain",
      st_rib_spring:"Positive — painful/stiff level",
      st_passive_scapular_approx:"Positive — upper thoracic/scapular pain",
      st_forestier_bowstring:"Positive — contralateral bowstring tightening",
    };
    const t = JSON.stringify(buildRealtimeSOAP(data));
    for (const n of ["Active Straight Leg Raise","Passive Lumbar Extension","Pheasant","Farfan","Bicycle","Stoop",
                     "Adson","Costoclavicular","Roos","Cyriax Release","First Thoracic Nerve Root","Rib Springing",
                     "Passive Scapular Approximation","Forestier"]) {
      expect(t, n+" missing from SOAP").toContain(n);
    }
  });

  it("surfaces every completed scale regardless of save path (om_history_ AND raw fields)", () => {
    const data = {
      dem_name:"Test", cc_main:"multi",
      // via om_history_
      om_history_startback: JSON.stringify([{score:6,date:"2026-07-28"}]),
      om_history_womac: JSON.stringify([{score:55,date:"2026-07-28"}]),
      // via RAW fields only (no om_history_): MAS + BBS
      mas_elbow_flex:"2 — Marked increase through most of ROM, easily moved",
      mas_wrist_flex:"2 — Marked increase through most of ROM, easily moved",
      ...Object.fromEntries(Array.from({length:14},(_,i)=>[`bbs_${i+1}`,"4"])),
      // new outcome scales via raw fields
      ...Object.fromEntries(Array.from({length:8},(_,i)=>[`visap_${i+1}`,i===7?"30 — Competing at full level":"10 — No pain / full"])),
    };
    const t = JSON.stringify(buildRealtimeSOAP(data));
    for (const n of ["STarT Back","WOMAC","MAS","Berg Balance","VISA-P"]) {
      expect(t, n+" missing from SOAP").toContain(n);
    }
  });
});
