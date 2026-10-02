import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// profiles.select("is_admin")... resolves to whatever the test sets; session user is fixed.
let isAdmin;
vi.mock("../supabase.js", () => {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve({ data: { is_admin: isAdmin }, error: null }) };
  return { supabase: { from: vi.fn(() => chain), auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: "u-1" } } } })) } } };
});

import BodyChartPro from "../BodyChartPro.jsx";

beforeEach(() => { localStorage.clear(); isAdmin = false; });

describe("body chart: nothing meant for the app's builders reaches a physio", () => {
  it("says it is loading while the picture loads (no 'upload to Cloudinary' instructions)", () => {
    render(<BodyChartPro />);
    expect(screen.getByText("Loading body chart…")).toBeTruthy();
    expect(screen.queryByText(/Not Uploaded/i)).toBeNull();
    expect(screen.queryByText(/Cloudinary/i)).toBeNull();
  });

  it("if the picture really cannot load, says so plainly and offers Try again", () => {
    const { container } = render(<BodyChartPro />);
    fireEvent.error(container.querySelector("img"));
    expect(screen.getByText(/body picture couldn't load/i)).toBeTruthy();
    expect(screen.queryByText(/Cloudinary/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Loading body chart…")).toBeTruthy();
  });

  it("an ordinary account has no Admin button", async () => {
    render(<BodyChartPro />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/🔧 Admin/)).toBeNull();
    expect(screen.getByText(/Draw Radiation/)).toBeTruthy();
  });

  it("an admin account still has it", async () => {
    isAdmin = true;
    render(<BodyChartPro />);
    expect(await screen.findByText(/🔧 Admin/)).toBeTruthy();
  });
});
