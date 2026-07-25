import { describe, it, expect } from "vitest";
import { spineAssessmentModules } from "../spineLayeredAssessment.js";

describe("spineAssessmentModules — per-condition layered assessment for spine Phase 0.5", () => {
  it("returns condition-specific + region-level layers with module keys for a lumbar disc condition", () => {
    const r = spineAssessmentModules("L02");
    const labels = r.map(m => m.label);
    expect(labels).toEqual(expect.arrayContaining(["Observation", "Posture", "Functional (FMA)", "CPA", "Kinetic chain", "Fascia", "Outcome"]));
    expect(r.every(m => m.key && typeof m.detail === "string" && m.detail.length > 0)).toBe(true);
    // observation is condition-specific to radiculopathy
    expect(r.find(m => m.label === "Observation").detail.toLowerCase()).toMatch(/dermatomal|foot-drop|shift/);
    // outcome is region-level lumbar PROM
    expect(r.find(m => m.label === "Outcome").detail.toLowerCase()).toMatch(/oswestry|rmdq|roland/);
  });
  it("covers all engine condition ids (L/C/T 01–11) with no gaps", () => {
    const ids = [];
    for (const p of ["L","C","T"]) for (let i=1;i<=11;i++) ids.push(p+String(i).padStart(2,"0"));
    const missing = ids.filter(id => spineAssessmentModules(id).length === 0);
    expect(missing).toEqual([]);
  });
  it("maps CPA/Kinetic/Fascia/Outcome to the correct app module keys", () => {
    const byLabel = Object.fromEntries(spineAssessmentModules("C04").map(m => [m.label, m.key]));
    expect(byLabel["CPA"]).toBe("nkt");
    expect(byLabel["Kinetic chain"]).toBe("kinetic");
    expect(byLabel["Fascia"]).toBe("fascia");
    expect(byLabel["Outcome"]).toBe("outcome");
    expect(byLabel["Functional (FMA)"]).toBe("fma");
  });
});
