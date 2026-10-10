// The admin page's "How fast the app opens" section, in plain words.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile: { isAdmin: true } }) }));

import AdminAnalyticsPage from "../physiofeed/pages/AdminAnalyticsPage.jsx";

const baseSummary = {
  state: { totalUsers: 3, totalPatients: 5, totalPosts: 0, totalOpportunities: 0, totalApplications: 0 },
  trends: { dau: 1, wau: 2, mau: 3, totalEventsInRange: 30, featureCounts: [] },
  insights: [], recentEvents: [], pageStats: [], assessmentStats: [], userActivity: [], growth: {}, errors: [],
};
const row = (key, loads, medianOpenMs, p90OpenMs, slowPct) => ({ key, loads, students: 2, medianOpenMs, p90OpenMs, slowPct, medianPatientsMs: medianOpenMs + 500, p90PatientsMs: p90OpenMs + 500, patientsNotReady: 0, patientsFailed: 0 });

function show(speedStats) {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ...baseSummary, speedStats }) }));
  return render(<MemoryRouter><AdminAnalyticsPage /></MemoryRouter>);
}

beforeEach(() => { vi.clearAllMocks(); });

describe("How fast the app opens", () => {
  it("shows typical time, slowest tenth and the share over 5 s, per connection", async () => {
    show({
      total: { ...row("all", 40, 2100, 6400, 18), patientsNotReady: 2, patientsFailed: 1, students: 12 },
      byConnection: [row("4g", 30, 1800, 3000, 5), row("3g", 8, 5200, 9800, 62), row("unknown", 2, 2500, 2600, 0)],
      byVisit: [],
    });
    await waitFor(() => expect(screen.getByText("How fast the app opens")).toBeTruthy());
    expect(screen.getByText("2.1 s")).toBeTruthy();        // typical
    expect(screen.getByText("6.4 s")).toBeTruthy();        // slowest 1 in 10
    expect(screen.getByText("18%")).toBeTruthy();          // over 5 s
    expect(screen.getByText(/40 opens by 12 students/)).toBeTruthy();
    expect(screen.getByText(/still not ready after 30 s on 2 opens/)).toBeTruthy();
    expect(screen.getByText("Good (4G or wifi)")).toBeTruthy();
    expect(screen.getByText("Weak (3G)")).toBeTruthy();
    expect(screen.getByText("62%")).toBeTruthy();
    expect(screen.getByText("Not reported (e.g. iPhone)")).toBeTruthy();
  });

  it("says so when there are no timings yet", async () => {
    show({ total: null, byConnection: [], byVisit: [] });
    await waitFor(() => expect(screen.getByText(/No timings yet/)).toBeTruthy());
  });
});
