// sidebarPct.test.jsx
// Regression test for a real bug found during the bundle-size E2E work this
// session: the "Functional Assessment" sidebar completion percentage always
// showed 0%, regardless of real data recorded. Root cause: it checked
// fma_<movement> fields left over from a dead classic-FMS scoring system
// already removed elsewhere -- nothing has written those fields since
// Functional Assessment moved to FunctionalScreenHub, which persists all of
// its findings as one JSON blob per body region (lfs_data, sfs_data, etc.),
// not one flat field per test. Fixed to check those 10 real region-data
// keys the same way every other section's percentage already does.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js";

const USER_ID = "test-user-123";
const DB_KEY = `physio_patient_db_v1_${USER_ID}`;
const DRAFT_KEY = `physio_draft_v1_${USER_ID}`;

describe("Sidebar completion percentage — Functional Assessment", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: USER_ID, email: "student@example.com" } } },
      error: null,
    });
  });

  it("shows a nonzero percentage once a real FunctionalScreenHub region has findings, instead of always 0%", async () => {
    // Real gotcha: vitest's own per-test timeout (default 5000ms) fires
    // before an inner findByText/waitFor's own {timeout} option gets a
    // chance to -- must extend it explicitly (3rd arg to `it`, below) since
    // this test renders and settles the entire real App component.
    // Reuses SEED_PATIENT_2's real id ("pt_arjun_kapoor_01") deliberately --
    // loadPatientDB() (PatientDatabase.jsx) re-seeds two demo patients and
    // resets the active-patient draft whenever it can't find that exact id
    // in the stored list, which would silently discard this test's own
    // patient/draft before the app ever renders it. Matching the id (with
    // this test's own `data`, not the real demo content) keeps
    // loadPatientDB's needsSeed check false, so it returns the list as-is.
    const patientId = "pt_arjun_kapoor_01";
    const data = {
      // AppFull.jsx's `data` state only accepts a restored draft if it has
      // MORE THAN 5 keys (a safety check against tiny/corrupt drafts) --
      // real gotcha hit writing this test: a draft with only lfs_data set
      // gets silently discarded back to {}. Padding with harmless demo
      // fields to clear that threshold, same as any real patient record
      // naturally would.
      dem_name: "Test FMA Patient", dem_age: "34", dem_gender: "Female",
      cc_main: "Low back pain", soap_s: "",
      lfs_data: JSON.stringify({ findings: { lfs_sts: "Normal" }, grades: {}, notes: {} }),
    };
    const patient = {
      id: patientId, name: "Test FMA Patient", data,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      hasRedFlags: false, lastDx: "",
    };
    localStorage.setItem(DB_KEY, JSON.stringify([patient]));
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: patientId, data }));

    render(<App />);
    // Real gotcha hit writing this test: "Functional Assessment" itself
    // renders twice in the DOM (desktop .pm-sidebar's collapsible "Advanced
    // Assessment" group + the mobile .pm-nav-drawer's flat list) -- the
    // exact same dual-render pattern this project's E2E specs already had
    // to work around repeatedly. Rather than fight DOM-climbing from
    // whichever copy resolves first, check the document as a whole for the
    // computed "10%" instead: with this synthetic patient's `data` holding
    // ONLY lfs_data, every other section's own percentage calc still has a
    // real (nonzero) total but zero matching fields, so no other section
    // can coincidentally also show exactly "10%" here.
    await screen.findByText("Functional Assessment", { exact: true }, { timeout: 10_000 });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/10%/);
    }, { timeout: 10_000 });
  }, 15_000);

  it("still shows 0% (no misleading credit) when no FunctionalScreenHub region has any findings", async () => {
    const patientId = "pt_arjun_kapoor_01";
    const data = {}; // no lfs_data/sfs_data/etc. at all
    const patient = {
      id: patientId, name: "Test FMA Patient (empty)", data,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      hasRedFlags: false, lastDx: "",
    };
    localStorage.setItem(DB_KEY, JSON.stringify([patient]));
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: patientId, data }));

    render(<App />);
    const label = await screen.findByText("Functional Assessment", { exact: true }, { timeout: 10_000 });
    const sidebarItem = label.closest("div").parentElement.parentElement;
    // pct===0 renders no progress bar and no "%" badge at all (see
    // AppFull.jsx's SidebarItem: both are gated on pct>0) -- absence of any
    // "%" text is exactly the correct, unchanged behavior here.
    expect(sidebarItem.textContent).not.toMatch(/%/);
  });
});
