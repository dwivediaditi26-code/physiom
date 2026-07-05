// appSmoke.test.jsx
// First checkpoint: does the real App component (same one production ships)
// mount at all inside jsdom without crashing? This has to pass before any
// deeper interaction testing is worth attempting.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// CRITICAL: never let a test touch the real production Supabase project.
vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe("App smoke test", () => {
  it("mounts without throwing", () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it("renders some recognizable app chrome after mount", async () => {
    render(<App />);
    // Don't assert on exact text yet (unknown at this point) — just confirm
    // the root actually has content, i.e. it didn't render a blank tree.
    const root = document.body;
    expect(root.textContent.trim().length).toBeGreaterThan(0);
  });
});
