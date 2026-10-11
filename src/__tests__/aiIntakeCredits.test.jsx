// aiIntakeCredits.test.jsx -- the "Fill in a paragraph" card and AI credits (Aditi, 2026-10-10).
// Generate with AI costs 1 credit, taken by the server only when the AI answers. With 0 credits the card opens
// Get credits instead of calling the AI. The balance itself is Supabase's (api/parse.js, add_ai_credits.sql).
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const fake = vi.hoisted(() => ({
  snap: { state: "ready", balance: 3, unlimited: false, caseAnalyzed: null, freeLeft: null, refresh: () => {} },
  applied: [],
}));
vi.mock("../aiCredits.js", async () => ({
  ...(await vi.importActual("../aiCredits.js")),
  useAiCredits: () => fake.snap,
  applyServerBalance: (v) => fake.applied.push(v),
}));

const { default: OrthoAIIntakePanel } = await import("../OrthoAIIntakePanel.jsx");
const setCredits = (patch) => { fake.snap = { state: "ready", balance: 3, unlimited: false, caseAnalyzed: null, freeLeft: null, refresh: () => {}, ...patch }; };
const type = (value) => fireEvent.change(screen.getByPlaceholderText(/45-year-old with gradual onset/), { target: { value } });
const response = (init = {}) => ({ ok: true, status: 200, headers: { get: (k) => (k === "X-AI-Credits" ? "2" : null) }, json: async () => ({ chiefComplaint: "Neck pain", region: "Cervical spine" }), ...init });

beforeEach(() => { setCredits({}); fake.applied.length = 0; });
afterEach(() => vi.unstubAllGlobals());

describe("the paragraph card shows what it costs", () => {
  it("says Optional · 1 credit and Generate with AI · 1 credit when credits apply", () => {
    render(<OrthoAIIntakePanel variant="card" requireAuth={() => true} />);
    expect(screen.getByText("Optional · 1 credit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate with AI · 1 credit" })).toBeInTheDocument();
  });

  it("says no price for an admin, or where credits are not set up", () => {
    setCredits({ unlimited: true });
    const { unmount } = render(<OrthoAIIntakePanel variant="card" />);
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate with AI" })).toBeInTheDocument();
    unmount();
    setCredits({ state: "unconfigured" });
    render(<OrthoAIIntakePanel variant="card" />);
    expect(screen.getByRole("button", { name: "Generate with AI" })).toBeInTheDocument();
  });
});

describe("generating", () => {
  it("sends one request id with the paragraph and takes the new balance from the reply", async () => {
    const fetchSpy = vi.fn(async () => response());
    vi.stubGlobal("fetch", fetchSpy);
    render(<OrthoAIIntakePanel variant="card" />);
    type("Neck pain for 3 weeks");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    await screen.findByText("Extracted Patient Information");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][1].headers["X-Request-Id"]).toMatch(/\S{6,}/);
    expect(fake.applied).toContain("2");
  });

  it("with 0 credits it opens Get credits and never calls the AI", () => {
    setCredits({ balance: 0 });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<OrthoAIIntakePanel variant="card" />);
    type("Neck pain for 3 weeks");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    expect(screen.getByRole("dialog", { name: "Get credits" })).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toMatch(/Typing the history yourself is always free/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("if the server answers 402 (out of credits) it opens Get credits and shows no error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ ok: false, status: 402, json: async () => ({ error: "no_credits", balance: 0 }) })));
    render(<OrthoAIIntakePanel variant="card" />);
    type("Neck pain for 3 weeks");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Get credits" })).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fake.applied).toContain("0");
  });

  it("a failed generation shows an error (the server gives the credit back)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ ok: false, status: 502, json: async () => ({ error: "The AI is busy" }) })));
    render(<OrthoAIIntakePanel variant="card" />);
    type("Neck pain for 3 weeks");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/AI is busy/);
  });

  it("a retry after a lost reply reuses the same request id, so it cannot be charged twice", async () => {
    const seen = [];
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      seen.push(init.headers["X-Request-Id"]);
      n += 1;
      if (n === 1) throw new Error("network down");
      return response();
    }));
    render(<OrthoAIIntakePanel variant="card" />);
    type("Neck pain for 3 weeks");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    await screen.findByText("Extracted Patient Information");
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBe(seen[0]);
  });

  it("after a real answer the next paragraph gets a new request id", async () => {
    const seen = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => { seen.push(init.headers["X-Request-Id"]); return response(); }));
    render(<OrthoAIIntakePanel variant="card" />);
    type("Neck pain for 3 weeks");
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    await screen.findByText("Extracted Patient Information");
    fireEvent.click(screen.getByRole("button", { name: "Re-try" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI · 1 credit" }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1]).not.toBe(seen[0]);
  });
});
