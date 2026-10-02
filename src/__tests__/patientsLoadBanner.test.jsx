import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import PatientsLoadBanner from "../PatientsLoadBanner.jsx";

afterEach(() => { vi.useRealTimers(); });

describe("PatientsLoadBanner", () => {
  it("says nothing when everything loaded", () => {
    const { container } = render(<PatientsLoadBanner state="ok" hasPatients onRetry={() => {}} />);
    expect(container.textContent).toBe("");
  });

  it("only says 'Loading' if it is slow and there is nothing on screen yet", () => {
    vi.useFakeTimers();
    const { rerender } = render(<PatientsLoadBanner state="loading" hasPatients={false} onRetry={() => {}} />);
    expect(screen.queryByText(/Loading your saved patients/)).toBeNull();
    act(() => { vi.advanceTimersByTime(1300); });
    expect(screen.getByText(/Loading your saved patients/)).toBeTruthy();
    rerender(<PatientsLoadBanner state="loading" hasPatients onRetry={() => {}} />);
    expect(screen.queryByText(/Loading your saved patients/)).toBeNull();
  });

  it("explains a failure, says the patients are safe, and Try again retries", () => {
    const onRetry = vi.fn();
    render(<PatientsLoadBanner state="error" hasPatients={false} onRetry={onRetry} />);
    expect(screen.getByText(/safe in the cloud/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("names how many could not be opened", () => {
    render(<PatientsLoadBanner state="error" skipped={2} hasPatients onRetry={() => {}} />);
    expect(screen.getByText(/Couldn't open 2 saved patients/)).toBeTruthy();
  });

  it("can be dismissed", () => {
    render(<PatientsLoadBanner state="error" hasPatients onRetry={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
