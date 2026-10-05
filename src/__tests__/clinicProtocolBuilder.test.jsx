// "My Clinic Protocol": name it (e.g. Knee Osteoarthritis), add exercises / techniques / modalities,
// save, then add the whole thing to a patient's plan or today's session in one tap.
import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const saved = [];
let stored = [];
vi.mock("../clinicProtocols.js", () => ({
  listClinicProtocols: vi.fn(async () => stored),
  saveClinicProtocol: vi.fn(async (p) => { saved.push(p); return { id: "p1", ...p }; }),
  deleteClinicProtocol: vi.fn(async () => {}),
}));

import ClinicProtocolBuilder, { isModality } from "../ClinicProtocolBuilder.jsx";
import { NeuroCarePlanSection } from "../NeuroCarePlan.jsx";
import { requestSessionLaunch } from "../txSessions.js";

beforeEach(() => { saved.length = 0; stored = []; });

describe("ClinicProtocolBuilder", () => {
  it("needs a name and at least one item, and says so", () => {
    render(<ClinicProtocolBuilder onCancel={() => {}} onSaved={() => {}} />);
    fireEvent.click(screen.getByText(/Save protocol/));
    expect(screen.getByRole("alert").textContent).toMatch(/name/i);
    fireEvent.change(screen.getByPlaceholderText("e.g. Knee Osteoarthritis"), { target: { value: "Knee Osteoarthritis" } });
    fireEvent.click(screen.getByText(/Save protocol/));
    expect(screen.getByRole("alert").textContent).toMatch(/at least one/i);
    expect(saved).toHaveLength(0);
  });

  it("saves a named protocol with an exercise from the library, a quick modality and a technique", async () => {
    const onSaved = vi.fn();
    render(<ClinicProtocolBuilder onCancel={() => {}} onSaved={onSaved} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Knee Osteoarthritis"), { target: { value: "Knee Osteoarthritis" } });
    fireEvent.change(screen.getByLabelText("Search exercise library"), { target: { value: "bridge" } });
    fireEvent.click(screen.getAllByText("＋ Add")[0]);
    expect(screen.getByRole("tab", { name: /Exercises 1/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Modalities/ }));
    fireEvent.click(screen.getByText("＋ TENS"));
    expect(screen.getByRole("tab", { name: /Modalities 1/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Techniques/ }));
    fireEvent.click(screen.getByText(/Add manually/));
    fireEvent.click(screen.getByText("Add to protocol"));
    expect(screen.getByRole("tab", { name: /Techniques 1/ })).toBeTruthy();

    fireEvent.click(screen.getByText(/Save protocol/));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const p = saved[0];
    expect(p.name).toBe("Knee Osteoarthritis");
    expect(p.exercises).toHaveLength(1);
    expect(p.exercises[0]).toMatchObject({ name: expect.any(String), sets: expect.anything() });
    expect(p.techniques.filter(isModality)).toEqual([expect.objectContaining({ name: "TENS", modality: true })]);
    expect(p.techniques.filter((t) => !isModality(t))).toHaveLength(1);
  });

  it("editing keeps the id so it updates the same protocol", async () => {
    const initial = { id: "abc", name: "Shoulder", exercises: [{ id: "x1", name: "Pendulum", sets: 3, reps: 10 }], techniques: [] };
    render(<ClinicProtocolBuilder initial={initial} onCancel={() => {}} onSaved={() => {}} />);
    fireEvent.click(screen.getByText(/Save protocol/));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toMatchObject({ id: "abc", name: "Shoulder" });
  });
});

describe("using a saved protocol in a session", () => {
  const plan = { problems: [], goals: [], treatments: [], sessions: [] };
  const store = { data: {} };
  function Harness() {
    const [data, setD] = useState(store.data);
    requestSessionLaunch();
    return <NeuroCarePlanSection data={data} setData={(u) => { const n = typeof u === "function" ? u(store.data) : u; store.data = n; setD(n); }} initialPhase="sessions" />;
  }
  it("Add all puts every exercise, technique and modality on the plan and ticks it for today", async () => {
    stored = [{ id: "p1", name: "Knee Osteoarthritis", region: "Knee",
      exercises: [{ id: "ex-1", name: "Straight leg raise", sets: 3, reps: 10, freq: "Daily" }],
      techniques: [{ type: "other", technique: "Heat / Cold", name: "Heat / Cold", modality: true, category: "Technique" },
                   { type: "manual", technique: "AP", name: "AP mobilisation", category: "Technique" }] }];
    store.data = { neuroCarePlan: { ...plan } };
    render(<Harness />);
    fireEvent.click(screen.getByText("＋ Add exercise from library"));
    fireEvent.click(await screen.findByText("My Clinic Protocol"));
    expect(await screen.findByText("Knee Osteoarthritis")).toBeTruthy();
    fireEvent.click(screen.getByText("＋ Add all"));
    const t = store.data.neuroCarePlan.treatments;
    expect(t.map((x) => x.name).sort()).toEqual(["AP mobilisation", "Heat / Cold", "Straight leg raise"]);
    expect(t.find((x) => x.name === "Straight leg raise").exerciseId).toBe("ex-1");
    // and they show up ticked in today's session
    fireEvent.click(await screen.findByRole("tab", { name: /Exercises 1\/1/ }));
    expect(screen.getByText("Straight leg raise")).toBeTruthy();
  });
});
