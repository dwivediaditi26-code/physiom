// soapFontSizes.test.js
// Regression test for the SOAP Notes typography redesign: the module's
// text ranged from 9px to 13px across S/O/A/P (labels 11px, the shared
// input/textarea style at 0.78rem =~12.5px, plenty of metadata down at
// 9-10px), which was hard to read and -- for the input fields
// specifically -- under the 16px threshold that keeps iOS Safari from
// auto-zooming the page on focus. All four sections (Subjective,
// Objective, Assessment, Plan) share the same style objects (lbl, inp,
// val_, secTitle, etc.) and numeric fontSize convention, so this checks
// the whole module in one pass rather than section by section.
//
// Reads the source directly rather than rendering + reading computed
// styles -- see persistentHighlightVisibility.test.js for why jsdom's
// CSS handling isn't reliable enough to trust for this kind of check.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "../ClinicalModules.jsx"), "utf-8");

function extractSoapModule(src) {
  const lines = src.split("\n");
  const startIdx = lines.findIndex(l => l.startsWith("function SOAPNoteModule("));
  expect(startIdx).toBeGreaterThan(-1);
  // Next top-level `function Name(` after the start marks the end.
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^function [A-Za-z]+\(/.test(lines[i])) { endIdx = i; break; }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

describe("SOAP Notes module — unified type scale across S/O/A/P", () => {
  const soapSource = extractSoapModule(source);

  it("has no fontSize below 12px anywhere in the module", () => {
    const numeric = [...soapSource.matchAll(/fontSize:([\d.]+)(?![.\d])/g)].map(m => parseFloat(m[1]));
    expect(numeric.length).toBeGreaterThan(0); // sanity: did we actually find the module content
    const tooSmall = numeric.filter(n => n < 12);
    expect(tooSmall).toEqual([]);
  });

  it("has no rem-based fontSize left (module now uses a consistent px scale)", () => {
    expect(soapSource).not.toMatch(/fontSize:"[\d.]+rem"/);
  });

  it("shared input/textarea style (inp) is exactly 16px -- avoids iOS Safari auto-zoom on focus", () => {
    const inpMatch = soapSource.match(/const inp\s*=\s*\{[^}]*\}/);
    expect(inpMatch).toBeTruthy();
    expect(inpMatch[0]).toMatch(/fontSize:16(?![.\d])/);
  });

  it("shared label style (lbl) matches the sub-label style (subLbl) -- same size across S/O/A/P", () => {
    const lblMatch = soapSource.match(/const lbl\s*=\s*\{[^}]*\}/);
    const subLblMatch = soapSource.match(/const subLbl\s*=\s*\{[^}]*\}/);
    expect(lblMatch).toBeTruthy();
    expect(subLblMatch).toBeTruthy();
    const lblSize = lblMatch[0].match(/fontSize:([\d.]+)/)[1];
    const subLblSize = subLblMatch[0].match(/fontSize:([\d.]+)/)[1];
    expect(lblSize).toBe(subLblSize);
  });
});
