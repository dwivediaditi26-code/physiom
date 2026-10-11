// creditsAdminTools.test.jsx -- the admin test tools in the Get credits box (Aditi, 2026-10-11: "so I don't have to run SQL every time").
// Only an admin sees them; they act on the admin's OWN account (the database refuses anyone else).
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const fake = vi.hoisted(() => ({
  snap: { state: "ready", balance: 50, unlimited: false, isAdmin: true, adminPays: true, caseAnalyzed: null, freeLeft: null, refresh: () => {} },
  setBalance: vi.fn(async () => ({ ok: true })),
  setPays: vi.fn(async () => ({ ok: true })),
  resetCase: vi.fn(async () => ({ ok: true })),
}));
vi.mock("../aiCredits.js", async () => ({
  ...(await vi.importActual("../aiCredits.js")),
  useAiCredits: () => fake.snap,
  adminSetBalance: (...a) => fake.setBalance(...a),
  adminSetPays: (...a) => fake.setPays(...a),
  adminResetCase: (...a) => fake.resetCase(...a),
}));

const { default: CreditsSheet } = await import("../CreditsSheet.jsx");
const open = (props) => render(<CreditsSheet open onClose={() => {}} balance={50} signedIn {...props} />);
beforeEach(() => {
  fake.snap = { state: "ready", balance: 50, unlimited: false, isAdmin: true, adminPays: true, caseAnalyzed: null, freeLeft: null, refresh: () => {} };
  Object.values(fake).forEach((f) => f.mockClear?.());
});

describe("admin test tools", () => {
  it("are shown to an admin and hidden from everyone else", () => {
    const { unmount } = open({ isAdmin: true });
    expect(screen.getByTestId("admin-credit-tools")).toBeInTheDocument();
    unmount();
    open({ isAdmin: false });
    expect(screen.queryByTestId("admin-credit-tools")).toBeNull();
  });

  it("the 'charge me like a normal user' switch reflects and changes the admin's setting", async () => {
    open({ isAdmin: true, caseKey: "c:cervical" });
    const box = screen.getByRole("checkbox", { name: /Charge me like a normal user/ });
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    await waitFor(() => expect(fake.setPays).toHaveBeenCalledWith(false, "c:cervical"));
    expect((await screen.findByRole("status")).textContent).toMatch(/now unlimited/);
  });

  it("sets the admin's own balance from the buttons (0, 1, 5, 50, 500)", async () => {
    open({ isAdmin: true });
    const tools = within(screen.getByTestId("admin-credit-tools"));
    fireEvent.click(tools.getByRole("button", { name: "5" }));
    await waitFor(() => expect(fake.setBalance).toHaveBeenCalledWith(5, undefined));
    expect((await screen.findByRole("status")).textContent).toMatch(/You now have 5 credits/);
    fireEvent.click(tools.getByRole("button", { name: "1" }));
    expect((await screen.findByText(/You now have 1 credit\./))).toBeInTheDocument();
    expect(tools.getAllByRole("button").map((b) => b.textContent)).toEqual(["0", "1", "5", "50", "500"]);
  });

  it("Reset this case appears only where a case is open, and calls the reset", async () => {
    const { unmount } = open({ isAdmin: true });
    expect(screen.queryByRole("button", { name: "Reset this case" })).toBeNull();
    unmount();
    open({ isAdmin: true, caseKey: "c:cervical" });
    fireEvent.click(screen.getByRole("button", { name: "Reset this case" }));
    await waitFor(() => expect(fake.resetCase).toHaveBeenCalledWith("c:cervical"));
    expect((await screen.findByRole("status")).textContent).toMatch(/first analysis again/);
  });

  it("says so when the change did not go through", async () => {
    fake.setBalance.mockResolvedValueOnce({ ok: false, reason: "error" });
    open({ isAdmin: true });
    fireEvent.click(within(screen.getByTestId("admin-credit-tools")).getByRole("button", { name: "0" }));
    expect((await screen.findByRole("status")).textContent).toMatch(/Couldn't do that/);
  });

  it("are not shown to a signed-out visitor even if flagged admin", () => {
    open({ isAdmin: true, signedIn: false });
    expect(screen.queryByTestId("admin-credit-tools")).toBeNull();
  });
});
