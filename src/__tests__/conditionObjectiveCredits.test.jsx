// conditionObjectiveCredits.test.jsx -- AI credits on the AI Objective page (Aditi, 2026-10-10).
//
// First Analyze Case of a case = 1 credit; the first 3 meaningful re-analyses are free, then 1 credit each; an
// unchanged analysis and a saved one are always free. Every region shows 2 conditions to everyone; the rest are
// locked until the case is analyzed and stay open afterwards even at 0 credits. Admins are never charged.
// The balance itself lives in Supabase (supabase/add_ai_credits.sql); here aiCredits.js is replaced by a fake.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const fake = vi.hoisted(() => ({
  snap: { state: "ready", balance: 5, unlimited: false, caseAnalyzed: null, freeLeft: 3, refresh: () => {} },
  spend: vi.fn(),
}));
vi.mock("../aiCredits.js", async () => ({
  ...(await vi.importActual("../aiCredits.js")),
  useAiCredits: () => fake.snap,
  spendAnalysis: (...args) => fake.spend(...args),
}));

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");

const CERVICAL = [{ id: "cervical", label: "Cervical" }];
const RADICULOPATHY = {
  subjective: { chiefComplaint: "Neck pain with tingling into the right arm", onset: "Gradual", regions: { cervical: {
    location: "Neck, Right upper trapezius", radiation: "Radiates into right arm/hand", dermatomal: "C6 — thumb/index finger",
    mechanismType: "No clear mechanism — insidious onset", armPresent: "Yes — unilateral (R)", armNeuro: "Objective numbness on testing",
    aggMovements: "Extension — looking up, Combined extension + rotation (right) — quadrant position",
    relMovements: "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)",
    redFlagsMyelopathy: "No myelopathy signs", redFlagsVbi: "No VBI signs", redFlagsInstability: "No instability signs", redFlagsOther: "No other red flags",
  } } },
};

let latestData = null;
function Harness({ initialData, requireAuth }) {
  const [data, setDataRaw] = React.useState({ __caseId: "case-1", ...initialData });
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  latestData = data;
  return <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={CERVICAL} requireAuth={requireAuth} />;
}

const cards = () => [...document.querySelectorAll(".obj-match-row .obj-match-card")];
const locked = () => document.querySelectorAll(".obj-match-card-locked");
const mainButton = () => document.querySelector(".obj-analyze-btn");
const label = () => mainButton().textContent.replace(/[✦→]/g, "").trim(); // the button also holds two small icons
const pcts = () => [...document.querySelectorAll(".obj-match-card .obj-match-pct")].map((n) => n.textContent.trim());
const sheet = () => screen.queryByRole("dialog", { name: "Get credits" });
const setCredits = (patch) => { fake.snap = { state: "ready", balance: 5, unlimited: false, caseAnalyzed: null, freeLeft: 3, refresh: () => {}, ...patch }; };

beforeEach(() => {
  setCredits({});
  fake.spend.mockReset();
  fake.spend.mockResolvedValue({ ok: true, reason: "first", charged: true, balance: 4, freeLeft: 3 });
});

describe("credits on the Analyze card", () => {
  it("shows the cost on the button (the balance and Get credits live in the header bar, see creditsBadge.test)", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    expect(label()).toBe("Analyze Case · 1 Credit");
    expect(screen.queryByTestId("credit-balance")).toBeNull();
  });

  it("locks every condition except the region's first two, until the case is analyzed", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    const total = cards().length;
    expect(total).toBeGreaterThan(3);
    expect(locked().length).toBe(total - 2);
    expect(cards()[0].classList.contains("obj-match-card-locked")).toBe(false);
    expect(cards()[1].classList.contains("obj-match-card-locked")).toBe(false);
    expect(cards()[2].classList.contains("obj-match-card-locked")).toBe(true);
    expect(screen.getByTestId("locked-conditions-note").textContent).toMatch(/unlock when you analyze/);
    expect(screen.queryByText(/Explore sample conditions/)).toBeNull(); // no heading above the cards (Aditi, 2026-10-11)
    expect(document.querySelector(".obj-analyze-card").textContent).toMatch(/conditions below are educational previews, not results for this patient/);
    expect([...document.querySelectorAll(".obj-match-preview")].map((n) => n.textContent)).toEqual(["View preview ›", "View preview ›", ...Array(total - 2).fill("🔒 Locked")]);
  });

  it("tapping a locked condition does not open it", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    const before = document.querySelector(".obj-match-card-active")?.textContent;
    fireEvent.click(cards()[4]);
    expect(document.querySelector(".obj-match-card-active")?.textContent).toBe(before);
    expect(cards()[4].getAttribute("aria-disabled")).toBe("true");
  });

  it("Analyze Case spends through the server, then shows the scores and unlocks everything", async () => {
    render(<Harness initialData={RADICULOPATHY} />);
    fireEvent.click(screen.getByRole("button", { name: /Analyze Case · 1 Credit/ }));
    await waitFor(() => expect(label()).toBe("View Analysis"));
    expect(fake.spend).toHaveBeenCalledTimes(1);
    expect(fake.spend.mock.calls[0][0]).toBe("case-1:cervical");
    expect(pcts().some((t) => /^\d+%$/.test(t))).toBe(true);
    expect(locked().length).toBe(0);
    expect(screen.queryByTestId("locked-conditions-note")).toBeNull();
  });

  it("with 0 credits Analyze Case opens Get credits and does not analyze or spend", () => {
    setCredits({ balance: 0 });
    render(<Harness initialData={RADICULOPATHY} />);
    fireEvent.click(screen.getByRole("button", { name: /Analyze Case · 1 Credit/ }));
    expect(sheet()).toBeInTheDocument();
    expect(fake.spend).not.toHaveBeenCalled();
    expect(pcts()).toEqual([]);
    expect(locked().length).toBe(cards().length - 2); // still only 2 open
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(sheet()).toBeNull();
  });

  it("if the server says there are not enough credits, it opens Get credits and does not analyze", async () => {
    fake.spend.mockResolvedValue({ ok: false, reason: "insufficient", balance: 0 });
    render(<Harness initialData={RADICULOPATHY} />);
    fireEvent.click(screen.getByRole("button", { name: /Analyze Case · 1 Credit/ }));
    await waitFor(() => expect(sheet()).toBeInTheDocument());
    expect(pcts()).toEqual([]);
    expect(latestData.conditionAssessment_cervical?.__analysis).toBeUndefined();
  });

  it("if the credits cannot be checked it says so and does not analyze", async () => {
    fake.spend.mockResolvedValue({ ok: false, reason: "error" });
    render(<Harness initialData={RADICULOPATHY} />);
    fireEvent.click(screen.getByRole("button", { name: /Analyze Case · 1 Credit/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn't check your credits/);
    expect(pcts()).toEqual([]);
  });

  it("a saved analysis opens at 0 credits: scores shown, nothing locked, View Analysis is free", async () => {
    const first = render(<Harness initialData={RADICULOPATHY} />);
    fireEvent.click(screen.getByRole("button", { name: /Analyze Case · 1 Credit/ }));
    await waitFor(() => expect(label()).toBe("View Analysis"));
    const saved = JSON.parse(JSON.stringify(latestData));
    first.unmount();
    fake.spend.mockClear();
    setCredits({ balance: 0, caseAnalyzed: true, freeLeft: 3 });
    render(<Harness initialData={saved} />);
    expect(label()).toBe("View Analysis");
    expect(pcts().some((t) => /^\d+%$/.test(t))).toBe(true);
    expect(locked().length).toBe(0);
    fireEvent.click(mainButton());
    expect(fake.spend).not.toHaveBeenCalled();
    expect(sheet()).toBeNull();
  });
});

describe("re-analysis allowance", () => {
  const stale = { ...RADICULOPATHY, conditionAssessment_cervical: { __analysis: { sig: "[]", at: 1 } } };

  it("while free re-analyses are left: Update Analysis costs nothing and the counter says how many", () => {
    setCredits({ freeLeft: 2, caseAnalyzed: true });
    render(<Harness initialData={stale} />);
    expect(label()).toBe("Update Analysis");
    expect(screen.getByTestId("free-reanalyses").textContent).toBe("2 free re-analyses remaining for this case");
  });

  it("says 'remaining' correctly for one", () => {
    setCredits({ freeLeft: 1, caseAnalyzed: true });
    render(<Harness initialData={stale} />);
    expect(screen.getByTestId("free-reanalyses").textContent).toBe("1 free re-analysis remaining for this case");
  });

  it("after the 3 free ones: Update Analysis · 1 Credit, and the counter says each update costs a credit", () => {
    setCredits({ freeLeft: 0, caseAnalyzed: true });
    render(<Harness initialData={stale} />);
    expect(label()).toBe("Update Analysis · 1 Credit");
    expect(screen.getByTestId("free-reanalyses").textContent).toMatch(/each update costs 1 credit/);
  });

  it("a paid update with 0 credits opens Get credits instead of spending", () => {
    setCredits({ freeLeft: 0, balance: 0, caseAnalyzed: true });
    render(<Harness initialData={stale} />);
    fireEvent.click(mainButton());
    expect(sheet()).toBeInTheDocument();
    expect(fake.spend).not.toHaveBeenCalled();
  });

  it("a free update works even at 0 credits", async () => {
    setCredits({ freeLeft: 3, balance: 0, caseAnalyzed: true });
    fake.spend.mockResolvedValue({ ok: true, reason: "free_reanalysis", charged: false, balance: 0, freeLeft: 2 });
    render(<Harness initialData={stale} />);
    fireEvent.click(mainButton());
    await waitFor(() => expect(label()).toBe("View Analysis"));
    expect(sheet()).toBeNull();
  });
});

describe("who is charged", () => {
  it("an admin sees no cost, no balance link and no locks, and is never sent to the spend call", () => {
    setCredits({ unlimited: true });
    render(<Harness initialData={RADICULOPATHY} />);
    expect(label()).toBe("Analyze Case");
    expect(locked().length).toBe(0);
    fireEvent.click(mainButton());
    expect(fake.spend).not.toHaveBeenCalled();
    expect(pcts().some((t) => /^\d+%$/.test(t))).toBe(true);
  });

  it("a guest is asked to sign in and nothing is spent or analyzed", () => {
    setCredits({ state: "guest", balance: 0 });
    const requireAuth = vi.fn(() => false);
    render(<Harness initialData={RADICULOPATHY} requireAuth={requireAuth} />);
    expect(locked().length).toBe(cards().length - 2);
    fireEvent.click(mainButton());
    expect(requireAuth).toHaveBeenCalled();
    expect(fake.spend).not.toHaveBeenCalled();
    expect(pcts()).toEqual([]);
  });

  it("where credits are not set up yet, everything stays free and open", () => {
    setCredits({ state: "unconfigured" });
    render(<Harness initialData={RADICULOPATHY} />);
    expect(label()).toBe("Analyze Case");
    expect(screen.queryByTestId("credits-row")).toBeNull();
    expect(locked().length).toBe(0);
    fireEvent.click(mainButton());
    expect(fake.spend).not.toHaveBeenCalled();
    expect(pcts().some((t) => /^\d+%$/.test(t))).toBe(true);
  });
});
