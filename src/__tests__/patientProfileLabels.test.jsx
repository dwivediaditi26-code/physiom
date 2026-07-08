// patientProfileLabels.test.jsx
// Regression tests for a real, screenshot-confirmed set of bugs in Patient
// Profile's Assessment tab (PatientDatabase.jsx's PatientProfileModal) --
// this view had its OWN separately hand-maintained label maps (MMT_LABEL_MAP,
// SPECIAL_TEST_NAMES, OM_NAMES) and ad-hoc raw-key fallbacks, completely
// independent from the ones already fixed for the SOAP note, so every one of
// those earlier fixes never reached Patient Profile at all.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// PatientDatabase.jsx imports the real supabase client (used by
// syncPatientsToSupabase on save actions). Mocking it here even though this
// test only renders the modal read-only -- matches the established safety
// rule so this can never accidentally touch the production project.
vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { PatientProfileModal } = await import("../PatientDatabase.jsx");

function renderProfile(data) {
  return render(
    <PatientProfileModal
      patient={{ id: "p1", name: "Test Patient", data }}
      onClose={() => {}}
      onSaveField={() => {}}
      onNav={() => {}}
      initialTab="assessment"
    />
  );
}

describe("Patient Profile — MMT labels", () => {
  it("shows the real muscle name (per MMT_DATA: 'ECRL + ECRB') instead of a raw fragment like 'Ecrb'", () => {
    // Real double-prefixed key format, same as confirmed in mmtLabels.test.js
    const data = { mmt_mmt_ecrb_L: "4" };
    renderProfile(data);
    expect(screen.getByText("ECRL + ECRB")).toBeInTheDocument();
  });
});

describe("Patient Profile — CPA labels", () => {
  it("shows real NKT muscle names instead of raw codes like 'dnf'/'tib_ant'", () => {
    // Real ids verified against NKT_REGIONS directly.
    const data = { nkt_dnf: "Inhibited", nkt_tib_ant: "Inhibited", nkt_biceps: "Overactive" };
    renderProfile(data);
    expect(screen.getByText(/Deep Neck Flexors/i)).toBeInTheDocument();
    expect(screen.getByText("Tibialis Anterior")).toBeInTheDocument();
    expect(screen.queryByText(/^dnf$/)).not.toBeInTheDocument();
  });
});

describe("Patient Profile — STTT / Cyriax", () => {
  it("picks up real cyriax_ prefixed keys, not just the legacy cy_ prefix", () => {
    // Previously cyKeys only matched k.startsWith("cy_") -- the real
    // per-region data (cyriax_<region>_<fieldtype>_<testid>) never appeared
    // in Patient Profile at all regardless of what was recorded.
    const data = { cyriax_shoulder_act_rom_sh_a_abd: "170" };
    renderProfile(data);
    expect(screen.getByText("Abduction")).toBeInTheDocument();
  });

  it("resolves a two-word region (wrist_hand) correctly instead of a garbled fallback", () => {
    const data = { cyriax_wrist_hand_act_rom_wr_a_flex: "60" };
    renderProfile(data);
    expect(screen.getByText("Wrist Flexion")).toBeInTheDocument();
    expect(screen.queryByText(/Hand Act Rom/)).not.toBeInTheDocument();
  });
});

describe("Patient Profile — Neurological", () => {
  it("groups a Neural Tension test under Neural Tension, not Dermatomes", () => {
    // Exact real bug from a live screenshot: "NT SLR" appeared under the
    // DERMATOMES heading because the grouping switch had no explicit branch
    // for nt_ keys and dumped everything unrecognized into Dermatomes.
    const data = { nt_slr_left: "Positive at 45 degrees", nt_slr_right: "Negative" };
    renderProfile(data);
    expect(screen.getByText("Neural Tension")).toBeInTheDocument();
    expect(screen.getByText(/Straight Leg Raise/)).toBeInTheDocument();
  });

  it("shows GCS when recorded, which previously never appeared anywhere in the profile", () => {
    const data = { gcs_eye: "3", gcs_verbal: "3", gcs_motor: "1" };
    renderProfile(data);
    expect(screen.getByText("Glasgow Coma Scale")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument(); // 3+3+1 total
  });
});

describe("Patient Profile — Outcome Measures", () => {
  it("uses the real scale label for a scale missing from the old hand-copied OM_NAMES map", () => {
    const data = { om_history_nihss: JSON.stringify([{ score: 4, date: "2026-07-05" }]) };
    renderProfile(data);
    expect(screen.getByText(/NIHSS/)).toBeInTheDocument();
  });
});

describe("Patient Profile — Palpation", () => {
  it("shows a recorded palpation pin, which previously had no section at all", () => {
    const pins = [{ id: "a1", label: "Upper Trapezius", structures: "Upper trap / levator scapulae", side: "front", tenderness: "Moderate tenderness", temp: "Warm", texture: ["Boggy"], notes: "Reproduces referred pain" }];
    const data = { palp_pins: JSON.stringify(pins) };
    renderProfile(data);
    // Sec's title span combines the icon and title into one text node
    // (e.g. "🖐️ Palpation"), so this needs a substring/regex match.
    expect(screen.getByText(/Palpation/)).toBeInTheDocument();
    expect(screen.getByText("Upper Trapezius")).toBeInTheDocument();
    expect(screen.getByText("Moderate tenderness")).toBeInTheDocument();
  });
});

describe("Patient Profile — Techniques applied", () => {
  it("shows a manual therapy / modality technique, which previously never appeared anywhere in the profile", () => {
    // Confirmed real gap: tx_techniques is written correctly by both the Tx
    // Techniques tab and the quick-template chips (type:"quick" entries),
    // and both Live SOAP and SOAP Notes already resolve it via a
    // type-branching label fallback -- but Patient Profile never read
    // data.tx_techniques at all, so it was invisible here regardless of how
    // it was added.
    const data = { tx_techniques: [{ id: "a1", type: "quick", technique: "Suboccipital release" }] };
    render(
      <PatientProfileModal
        patient={{ id: "p1", name: "Test Patient", data }}
        onClose={() => {}}
        onSaveField={() => {}}
        onNav={() => {}}
        initialTab="treatment"
      />
    );
    expect(screen.getByText(/Techniques applied/)).toBeInTheDocument();
    expect(screen.getByText("Suboccipital release")).toBeInTheDocument();
  });
});
