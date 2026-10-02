import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));
vi.mock("../supabase.js", () => ({ supabase: { auth: { updateUser: vi.fn(() => Promise.resolve()) } } }));

import InstallPrompt from "../InstallPrompt.jsx";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
let uaSpy;

beforeEach(() => {
  uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(IPHONE);
  window.matchMedia = () => ({ matches: false });
  delete window.navigator.standalone;
  delete window.Capacitor;
});
afterEach(() => { uaSpy.mockRestore(); delete window.navigator.standalone; delete window.Capacitor; });

describe("InstallPrompt (the one Add to Home Screen popup)", () => {
  it("shows the Share -> Add to Home Screen steps on iPhone Safari", () => {
    render(<InstallPrompt currentUser={null} />);
    expect(screen.getByRole("dialog", { name: /Add PhysioMind to your Home Screen/ })).toBeTruthy();
    expect(screen.getByText(/Add to Home Screen/, { selector: "b" })).toBeTruthy();
  });

  it("sits above the bottom tab bar instead of covering it", () => {
    render(<InstallPrompt currentUser={null} />);
    const style = screen.getByRole("dialog").getAttribute("style");
    expect(style).toContain("--pm-bnav-h");
    expect(style).not.toMatch(/bottom:\s*12px/);
  });

  it("is not shown inside the installed app", () => {
    window.navigator.standalone = true;
    render(<InstallPrompt currentUser={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is not shown inside the Android / iPhone app", () => {
    window.Capacitor = { isNativePlatform: () => true };
    render(<InstallPrompt currentUser={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
