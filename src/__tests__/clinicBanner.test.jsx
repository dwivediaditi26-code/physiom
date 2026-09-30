import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClinicDetailsBanner } from "../DashboardModules.jsx";

const user = (meta) => ({ id: "u1", user_metadata: meta });
beforeEach(() => localStorage.clear());

describe("ClinicDetailsBanner", () => {
  it("shows for a signed-in therapist with missing details and opens Profile", () => {
    const onNav = vi.fn();
    render(<ClinicDetailsBanner currentUser={user({ clinic_name: "Care" })} onNav={onNav} />);
    fireEvent.click(screen.getByText("Add now"));
    expect(onNav).toHaveBeenCalledWith("profile");
  });
  it("hides when name, address and phone are all saved", () => {
    const { container } = render(<ClinicDetailsBanner currentUser={user({ clinic_name: "a", clinic_address: "b", clinic_phone: "c" })} onNav={() => {}} />);
    expect(container.textContent).toBe("");
  });
  it("hides for guests", () => {
    const { container } = render(<ClinicDetailsBanner currentUser={null} onNav={() => {}} />);
    expect(container.textContent).toBe("");
  });
  it("Later snoozes it and stays hidden after a remount", () => {
    const { unmount } = render(<ClinicDetailsBanner currentUser={user({})} onNav={() => {}} />);
    fireEvent.click(screen.getByText("Later"));
    expect(screen.queryByText("Add now")).toBeNull();
    unmount();
    const { container } = render(<ClinicDetailsBanner currentUser={user({})} onNav={() => {}} />);
    expect(container.textContent).toBe("");
  });
});
