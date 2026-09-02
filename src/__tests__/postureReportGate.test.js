import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const engine = readFileSync(resolve(process.cwd(), "src/PostureEngine.jsx"), "utf-8");

// Bug: with assessMode="multi" (the default) and only ONE view captured, the
// "Generate & Open PDF" button was disabled and showed "Capture ≥2 views and
// generate composite first" -- even though generateReport() itself already
// falls back to single-view scoreData/findings whenever mvComposite isn't
// available (see isMultiRpt inside generateReport). The gate required
// mvComposite outright based on the view-count MODE, not on how many views
// were actually captured, so a single-view capture made while still in the
// default multi mode could never generate a report.

describe("PDF report generation gate matches what generateReport() actually supports", () => {
  it("computes canGenerate the same way generateReport computes isMultiRpt", () => {
    // Both must require mvComposite AND >=2 captured views for the composite
    // path -- and both must otherwise be satisfiable by scoreData alone.
    expect(engine).toMatch(
      /const isMultiRpt = assessMode === "multi" && mvComposite && Object\.keys\(mvResults\|\|\{\}\)\.length >= 2;/
    );
    expect(engine).toMatch(
      /const hasComposite = assessMode==="multi" && mvComposite && Object\.keys\(mvResults\|\|\{\}\)\.length>=2;/
    );
    expect(engine).toMatch(/const canGenerate = hasComposite \|\| !!scoreData;/);
  });

  it("the button's disabled state is driven by canGenerate, not by mvComposite alone", () => {
    const modalBlock = engine.slice(engine.indexOf("const hasComposite ="), engine.indexOf("const hasComposite =") + 1600);
    expect(modalBlock).toMatch(/disabled=\{!canGenerate\}/);
    // The old bug: disabled={!(assessMode==="multi"?mvComposite:scoreData)}
    expect(modalBlock).not.toMatch(/disabled=\{!\(assessMode==="multi"\?mvComposite:scoreData\)\}/);
  });

  it("the warning message no longer demands 2 views when 1 view is enough", () => {
    // The old message: "Capture ≥2 views and generate composite first" --
    // shown even when a single analysed view was perfectly reportable.
    expect(engine).not.toMatch(/Capture ≥2 views and generate composite first/);
    expect(engine).toMatch(/Capture and analyse at least 1 view/);
  });

  it("single-view capture in multi mode can reach a truthy canGenerate", () => {
    // Direct behavioural check of the boolean logic extracted above, mirroring
    // exactly what the JSX computes: with assessMode="multi", mvComposite=null
    // (only 1 view captured, so no composite was built) and scoreData present
    // (that 1 view was analysed), the OLD gate was false (blocked); the NEW
    // gate must be true.
    const assessMode = "multi";
    const mvComposite = null;         // no composite -- fewer than 2 views
    const mvResults = { anterior: {} }; // exactly 1 view captured
    const scoreData = { score: 74, band: "Good" }; // that 1 view was analysed

    const hasComposite = assessMode==="multi" && mvComposite && Object.keys(mvResults||{}).length>=2;
    const canGenerate = hasComposite || !!scoreData;
    expect(canGenerate).toBe(true);

    // The OLD (buggy) gate, reconstructed for contrast:
    const oldGateAllowed = !!(assessMode==="multi" ? mvComposite : scoreData);
    expect(oldGateAllowed).toBe(false); // this is the bug the user hit
  });

  it("still requires something to report on: no photo analysed at all stays blocked", () => {
    const assessMode = "multi";
    const mvComposite = null;
    const mvResults = {};
    const scoreData = null;
    const hasComposite = assessMode==="multi" && mvComposite && Object.keys(mvResults||{}).length>=2;
    const canGenerate = hasComposite || !!scoreData;
    expect(canGenerate).toBe(false);
  });

  it("2+ views with a real composite still works via the composite path", () => {
    const assessMode = "multi";
    const mvComposite = { compositeScore: 80 };
    const mvResults = { anterior: {}, posterior: {} };
    const scoreData = null; // composite path doesn't need single-view scoreData
    const hasComposite = assessMode==="multi" && mvComposite && Object.keys(mvResults||{}).length>=2;
    const canGenerate = hasComposite || !!scoreData;
    expect(canGenerate).toBe(true);
  });
});
