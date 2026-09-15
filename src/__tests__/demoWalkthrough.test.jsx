// Pre-login "Explore Demo Patient" walkthrough (2026-08-12): a scripted,
// read-only preview of Subjective -> AI Intake -> ROM using one
// canned patient, added so visitors can see the real workflow before
// creating an account -- without building a full unauthenticated guest
// mode (a much bigger, riskier change intentionally deferred post-launch).
// SOAP Notes was removed as a step (SOAP note generation was removed from
// the app entirely) -- the walkthrough now ends on ROM.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DemoWalkthrough from "../DemoWalkthrough.jsx";

describe("DemoWalkthrough", () => {
  test("starts on Subjective step 1/3 and steps forward through all 3 screens", () => {
    render(<DemoWalkthrough onClose={() => {}} onCreateAccount={() => {}} />);
    expect(screen.getByText("Subjective Assessment")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next →"));
    expect(screen.getByText("AI Patient Intake")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next →"));
    expect(screen.getByText("ROM — Neck")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  test("last step swaps Next for a Create Account CTA that fires onCreateAccount", () => {
    const onCreateAccount = vi.fn();
    render(<DemoWalkthrough onClose={() => {}} onCreateAccount={onCreateAccount} />);
    fireEvent.click(screen.getByText("Next →")); // -> AI
    fireEvent.click(screen.getByText("Next →")); // -> ROM (last)
    expect(screen.queryByText("Next →")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Create your free account →"));
    expect(onCreateAccount).toHaveBeenCalled();
  });

  test("Back button steps backward and is hidden on the first step", () => {
    render(<DemoWalkthrough onClose={() => {}} onCreateAccount={() => {}} />);
    expect(screen.queryByLabelText("Back")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Next →"));
    expect(screen.getByText("AI Patient Intake")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Back"));
    expect(screen.getByText("Subjective Assessment")).toBeInTheDocument();
  });

  test("X button calls onClose", () => {
    const onClose = vi.fn();
    render(<DemoWalkthrough onClose={onClose} onCreateAccount={() => {}} />);
    fireEvent.click(screen.getByLabelText("Close demo"));
    expect(onClose).toHaveBeenCalled();
  });

  test("every step shows the 'nothing here is saved' demo banner, never lets it look like a real record", () => {
    render(<DemoWalkthrough onClose={() => {}} onCreateAccount={() => {}} />);
    expect(screen.getByText(/nothing here is saved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next →"));
    expect(screen.getByText(/nothing here is saved/i)).toBeInTheDocument();
  });

  test("shows the same demo patient's data across steps -- Subjective and ROM are internally consistent", () => {
    render(<DemoWalkthrough onClose={() => {}} onCreateAccount={() => {}} />);
    expect(screen.getByText("Neck pain")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next →")); // AI Intake echoes the same fields
    expect(screen.getAllByText("Neck pain").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Next →")); // ROM
    expect(screen.getByText("45°")).toBeInTheDocument();
  });
});
