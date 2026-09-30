import { describe, it, expect } from "vitest";
import { resolveSurgicalOptions, resolveSiteOptions, resolveIncisionOptions, withFallbacks } from "../orthoSurgicalLibrary.js";

const R = (id, side) => ({ id, side });
const label = (r) => [r.side, r.id[0].toUpperCase() + r.id.slice(1)].filter(Boolean).join(" ");

describe("surgical option lists — region + condition specific", () => {
  it("hip fracture includes the fixation types and approaches from the review", () => {
    const o = resolveSurgicalOptions([R("hip")], "fractureORIF");
    expect(o.procedures).toContain("Femoral neck fixation");
    expect(o.procedures).toContain("Intertrochanteric fracture fixation");
    expect(o.procedures).toContain("Subtrochanteric fracture fixation");
    expect(o.approaches).toContain("Posterior (Kocher-Langenbeck)");
    expect(o.fixation).toContain("Cephalomedullary nail (PFN / PFNA / TFN / Gamma)");
  });

  it("existing entries stay first and are not duplicated", () => {
    const o = resolveSurgicalOptions([R("hip")], "jointReplacement");
    expect(o.procedures[0]).toBe("Total hip arthroplasty");
    expect(new Set(o.procedures).size).toBe(o.procedures.length);
    expect(new Set(o.approaches).size).toBe(o.approaches.length);
  });

  it("THR lists implant fixation, bearing surface and revision options", () => {
    const o = resolveSurgicalOptions([R("hip")], "jointReplacement");
    expect(o.fixation).toEqual(expect.arrayContaining(["Cemented", "Uncemented", "Hybrid", "Reverse hybrid", "Dual-mobility cup", "Ceramic-on-ceramic"]));
    expect(o.procedures).toContain("Hip resurfacing");
  });

  it("knee replacement lists CR / PS / constrained / hinged designs", () => {
    const o = resolveSurgicalOptions([R("knee")], "jointReplacement");
    expect(o.fixation).toEqual(expect.arrayContaining(["Cruciate-retaining (CR)", "Posterior-stabilized (PS)", "Constrained condylar", "Rotating-hinge"]));
    expect(o.approaches).toContain("Lateral parapatellar");
  });

  it("regions that had no curated list now do (thigh, leg, forearm fractures)", () => {
    expect(resolveSurgicalOptions([R("thigh")], "fractureORIF").procedures).toContain("Femoral shaft fixation");
    expect(resolveSurgicalOptions([R("leg")], "fractureORIF").procedures).toContain("Tibial shaft fixation");
    expect(resolveSurgicalOptions([R("forearm")], "fractureORIF").procedures).toContain("ORIF both-bone forearm");
  });

  it("previously empty operation × region combinations are filled", () => {
    expect(resolveSurgicalOptions([R("hip")], "arthroscopy").procedures).toContain("Labral repair");
    expect(resolveSurgicalOptions([R("hip")], "tendonRepair").procedures).toContain("Gluteal tendon repair (gluteus medius / minimus)");
    expect(resolveSurgicalOptions([R("knee")], "tendonRepair").procedures).toContain("Quadriceps tendon repair");
    expect(resolveSurgicalOptions([R("ankle")], "jointReplacement").procedures).toContain("Total ankle replacement");
    expect(resolveSurgicalOptions([R("elbow")], "jointReplacement").procedures).toContain("Total elbow arthroplasty");
    expect(resolveSurgicalOptions([R("knee")], "ligamentReconstruction").procedures).toContain("PCL reconstruction");
  });

  it("spine lists differ by region and include fusion approaches / implants", () => {
    const c = resolveSurgicalOptions([R("cervical")], "spineSurgery");
    expect(c.procedures).toEqual(expect.arrayContaining(["Cervical fusion (ACDF)", "Cervical disc replacement (arthroplasty)", "Laminoplasty"]));
    expect(c.fixation).toContain("Artificial disc");
    const l = resolveSurgicalOptions([R("lumbar")], "spineSurgery");
    expect(l.procedures).toEqual(expect.arrayContaining(["TLIF", "PLIF", "ALIF", "OLIF (oblique)"]));
    expect(l.approaches).toContain("Oblique (OLIF)");
  });

  it("multiple regions union their lists", () => {
    const o = resolveSurgicalOptions([R("hip", "Right"), R("knee", "Left")], "fractureORIF");
    expect(o.procedures).toEqual(expect.arrayContaining(["Femoral neck fixation", "Tibial plateau fixation"]));
  });

  it("deformity correction is region-aware", () => {
    expect(resolveSurgicalOptions([R("pelvis")], "deformityCorrection").procedures).toContain("Periacetabular osteotomy (PAO)");
    expect(resolveSurgicalOptions([R("foot")], "deformityCorrection").procedures).toContain("Bunion correction (hallux valgus) — osteotomy");
  });
});

describe("surgical site options", () => {
  it("returns the region with side plus its sub-sites", () => {
    const o = resolveSiteOptions([R("hip", "Right")], label);
    expect(o[0]).toBe("Right Hip");
    expect(o).toContain("Right Hip — Pelvis / acetabulum");
    expect(o).toContain("Right Hip — Proximal femur (neck)");
  });
  it("falls back when no region is selected", () => {
    expect(resolveSiteOptions([], label)).toEqual(["Not specified"]);
  });
});

describe("incision type options", () => {
  it("differs by region for the same operation", () => {
    const hip = resolveIncisionOptions([R("hip")], "jointReplacement");
    const knee = resolveIncisionOptions([R("knee")], "jointReplacement");
    expect(hip).toContain("Direct anterior (Smith-Petersen)");
    expect(knee).toContain("Midline anterior with medial parapatellar arthrotomy");
    expect(hip).not.toContain("Midline anterior with medial parapatellar arthrotomy");
  });
  it("differs by operation for the same region", () => {
    const acl = resolveIncisionOptions([R("knee")], "ligamentReconstruction");
    expect(acl[0]).toMatch(/portals/i);
    expect(acl).toContain("Graft-harvest incision — hamstring (anteromedial tibial)");
  });
  it("spine incisions are region specific", () => {
    expect(resolveIncisionOptions([R("cervical")], "spineSurgery")).toContain("Anterior transverse (skin crease)");
    expect(resolveIncisionOptions([R("lumbar")], "spineSurgery")).toContain("Paramedian / Wiltse (muscle-splitting)");
  });
  it("amputation incisions come from the operation group when the region has none", () => {
    expect(resolveIncisionOptions([R("knee")], "amputation")).toContain("Long posterior flap");
  });
  it("withFallbacks appends Not documented / Unknown / Other", () => {
    expect(withFallbacks(["A"])).toEqual(["A", "Not documented", "Unknown", "Other"]);
  });
});
