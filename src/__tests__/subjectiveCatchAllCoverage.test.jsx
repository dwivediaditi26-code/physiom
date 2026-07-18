// Regression test for Phase-4 request: "whatever we fill in any area in
// subjective it should show in all three -- soap notes, soap live and
// patient profile." A field-coverage audit found ~75 global fields and
// ~130 region-specific fields (of the app's 441-field Subjective catalog)
// that were captured correctly but never displayed on at least one of the
// three surfaces (many on all three) -- lifestyle, sleep, sport, extended
// history/PMH, and dozens of region-specific fields per body area.
//
// Rather than hand-writing narrative lines for ~200 individual fields
// across three files, all three surfaces now render a generic "Additional
// documented findings" fallback driven directly off the shared field
// catalog (sharedClinicalData.js's UNIV_S/REG_MOD_S, via the new
// listGlobalCatalogFields/listRegionCatalogFields helpers), excluding only
// the fields each surface already narrates by name. This test picks a
// handful of concretely-confirmed-missing fields -- global (hx_episodes,
// sl_hours, sp_sport, pmh_family) and region-specific (cx_ha_present,
// shl_stiffness) -- and checks they now surface on all three screens.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { buildRealtimeSOAP, SOAPNoteModule } from "../ClinicalModules.jsx";
import { PatientProfileModal } from "../PatientDatabase.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) } }));

const data = {
  dem_name: "Test Patient", dem_age: "40", dem_sex: "Male",
  cx_selected_regions: JSON.stringify(["Cervical spine", "Shoulder (L)"]),
  cc_main: "Neck and shoulder pain",
  cc_duration: "2–6 weeks (subacute)", cc_onset: "Gradual — insidious",
  // Global fields confirmed missing from at least 2 of 3 surfaces pre-fix:
  hx_episodes: "2–3 episodes",
  pmh_family: "Mother has rheumatoid arthritis",
  sl_hours: "5–6 hours per night",
  sp_sport: "Recreational tennis, twice weekly",
  // Region-specific fields confirmed missing from all 3 surfaces pre-fix:
  cx_ha_present: "Yes — headaches associated with neck pain",
  shl_stiffness: "Morning stiffness lasting under 30 minutes",
};

describe("Additional documented findings catch-all closes real cross-surface gaps", () => {
  it("Live SOAP text includes previously-missing global and region fields", () => {
    const text = buildRealtimeSOAP(data);
    expect(text.S).toContain("2–3 episodes");
    expect(text.S).toContain("rheumatoid arthritis");
    expect(text.S).toContain("5–6 hours per night");
    expect(text.S).toContain("Recreational tennis");
    expect(text.S).toContain("headaches associated with neck pain");
    expect(text.S).toContain("Morning stiffness lasting under 30 minutes");
  });

  it("SOAP Notes card view includes the same previously-missing fields", () => {
    const { container } = render(<SOAPNoteModule data={data} set={vi.fn()} initialTab="S" />);
    expect(container.innerHTML).toContain("2–3 episodes");
    expect(container.innerHTML).toContain("rheumatoid arthritis");
    expect(container.innerHTML).toContain("5–6 hours per night");
    expect(container.innerHTML).toContain("Recreational tennis");
    expect(container.innerHTML).toContain("headaches associated with neck pain");
    expect(container.innerHTML).toContain("Morning stiffness lasting under 30 minutes");
  });

  it("Patient Profile includes the same previously-missing fields", () => {
    const patient = { id: "p1", data };
    const { container } = render(
      <PatientProfileModal patient={patient} onClose={vi.fn()} onLoadAssessment={vi.fn()} onSaveField={vi.fn()} onNav={vi.fn()} initialTab="subjective" />
    );
    expect(container.innerHTML).toContain("2–3 episodes");
    expect(container.innerHTML).toContain("rheumatoid arthritis");
    expect(container.innerHTML).toContain("5–6 hours per night");
    expect(container.innerHTML).toContain("Recreational tennis");
    expect(container.innerHTML).toContain("headaches associated with neck pain");
    expect(container.innerHTML).toContain("Morning stiffness lasting under 30 minutes");
  });

  it("still shows already-curated fields (no regression) alongside catch-all content", () => {
    const text = buildRealtimeSOAP(data);
    expect(text.S).toContain("Neck and shoulder pain");
  });
});
