import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HowToUseCard from "../HowToUse.jsx";
import { HOW_TO_TOPICS } from "../howToUseContent.js";

describe("How to use PhysioMind page", () => {
  it("is closed until opened, then lists every guide", () => {
    render(<HowToUseCard />);
    expect(screen.queryByText("Start a new assessment")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /How to use PhysioMind/ }));
    for (const t of HOW_TO_TOPICS) expect(screen.getByText(t.title)).toBeTruthy();
  });

  it("opens straight away when asked to (a link from elsewhere)", () => {
    render(<HowToUseCard defaultOpen />);
    expect(screen.getByText("First time here")).toBeTruthy();
  });

  it("shows the numbered steps of one guide at a time", () => {
    render(<HowToUseCard defaultOpen />);
    fireEvent.click(screen.getByRole("button", { name: /Start a new assessment/ }));
    expect(screen.getByText("＋ New Assessment")).toBeTruthy(); // a button name is picked out in bold
    expect(screen.getByText(/It needs the patient's name and age/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reports and sharing/ }));
    expect(screen.queryByText(/It needs the patient's name and age/)).toBeNull();
    expect(screen.getByText("Generate PDF Report")).toBeTruthy();
    // tapping the open guide closes it again
    fireEvent.click(screen.getByRole("button", { name: /Reports and sharing/ }));
    expect(screen.queryByText("Generate PDF Report")).toBeNull();
  });

  it("every guide has steps, and nothing is blank", () => {
    const ids = new Set();
    for (const t of HOW_TO_TOPICS) {
      expect(ids.has(t.id), `duplicate id ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(t.title.trim()).not.toBe("");
      expect(t.steps.length).toBeGreaterThan(0);
      for (const s of t.steps) expect(s.trim().length).toBeGreaterThan(10);
      expect((t.steps.join(" ").match(/\*\*/g) || []).length % 2, `unbalanced ** in ${t.id}`).toBe(0);
    }
  });
});

// The guide names buttons and labels as written on screen. If one of them is
// renamed or removed in the app, the guide would quietly send people looking
// for something that is not there -- so check each still exists in the source.
describe("the guide only names things the app really has", () => {
  const srcDir = path.resolve(__dirname, "..");
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "__tests__" || e.name === "__mocks__" || e.name === "node_modules") return [];
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : (/\.(jsx|js)$/.test(e.name) && e.name !== "howToUseContent.js" ? [full] : []);
  });
  const appSource = walk(srcDir).map((f) => fs.readFileSync(f, "utf8")).join("\n");

  const NAMED_ON_SCREEN = [
    "＋ New Assessment", "Search patients", "not saved as patients", "Generate PDF Report",
    "Share as Clinical Discussion", "Copy assessment as text", "Save Assessment", "Start Session",
    "AI Assisted Assessment", "Use Template", "Offline mode", "Clinic details for reports",
    "Delete account", "Sign out", "A new version of PhysioMind is ready", "Couldn't load your saved patients",
    "Saved on this device", "Saved to cloud", "Not in the cloud yet", "Outpatient / Musculoskeletal",
    "General Assessment", "Advanced Assessment", "Start assessment", "Start Assessment", "Final Review",
    "Practical Skills", "Clinical Cases", "Case Discussion", "✏️ Edit", "Add to Home Screen",
  ];

  for (const label of NAMED_ON_SCREEN) {
    it(`"${label}" exists in the app`, () => { expect(appSource.includes(label)).toBe(true); });
  }

  it("every label the guide puts in bold is on the list above or is a plain tab/button word", () => {
    const bold = new Set();
    for (const t of HOW_TO_TOPICS) for (const s of t.steps) for (const m of s.matchAll(/\*\*(.+?)\*\*/g)) bold.add(m[1]);
    const plain = new Set(["Home", "Clinical", "PhysioFeed", "Learn", "Profile", "Settings", "Assess", "Patients", "Today", "Next", "Back",
      "Next →", "Continue", "Final Review", "Ortho", "Neuro", "Cardio", "Edit", "Review", "Refresh", "Later", "Try again", "Share", "Install",
      "AI Assessment", "Sessions", "Clinical → Patients", "Clinical → Today", "Notifications", "Sign out", "Delete account", "Offline mode",
      "Saved on this device", "Saved to cloud", "Start Session", "Settings"]);
    const known = (b) => NAMED_ON_SCREEN.some((n) => b.includes(n) || n.includes(b)) || plain.has(b)
      || b === "✓ Saved to cloud" || b === "● Saved on this device" || b === "⚠ Not in the cloud yet — will retry"
      || b === "drafts not saved as patients" || b === "Search patients…" || b === "Outpatient / Musculoskeletal"
      || b === "Couldn't load your saved patients" || b === "A new version of PhysioMind is ready"
      || b === "Clinic details for reports" || b === "Next →" || b === "Continue";
    const unknown = [...bold].filter((b) => !known(b));
    expect(unknown).toEqual([]);
  });
});
