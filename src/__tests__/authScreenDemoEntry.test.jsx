// AuthScreen's two pre-login "try it" entry points (2026-08-12): the real
// interactive Guest Mode ("Try the full app") and the scripted Explore Demo
// Patient walkthrough. Renders AuthScreen directly (not through App.jsx/
// Supabase) since neither entry point touches Supabase -- only the actual
// Login/Register/Forgot form submits do. Guest Mode itself (App.jsx's
// guestMode branch, rendering the real AppInner with isGuest=true) is
// covered separately in guestMode.test.jsx.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthScreen from "../AuthScreen.jsx";

describe("AuthScreen -- Try the full app (real Guest Mode entry)", () => {
  test("shows the guest-mode entry button and fires onTryGuest when clicked", () => {
    const onTryGuest = vi.fn();
    render(<AuthScreen onAuth={() => {}} onTryGuest={onTryGuest} />);
    fireEvent.click(screen.getByText(/Try the full app/i));
    expect(onTryGuest).toHaveBeenCalled();
  });
});

describe("AuthScreen -- Explore Demo Patient (scripted walkthrough) entry point", () => {
  test("shows the guided-demo entry link on the login screen", () => {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    expect(screen.getByText(/guided demo/i)).toBeInTheDocument();
  });

  test("clicking it opens the walkthrough overlay on step 1", () => {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    fireEvent.click(screen.getByText(/guided demo/i));
    expect(screen.getByText("Subjective Assessment")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  test("finishing the walkthrough and hitting Create Account lands back on the real Register form", () => {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    fireEvent.click(screen.getByText(/guided demo/i));
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.click(screen.getByText("Create your free account →"));
    // Walkthrough closed, AuthScreen switched to its real register view
    expect(screen.queryByText("Subjective Assessment")).not.toBeInTheDocument();
    expect(screen.getByText("Start free")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dr. Aditi")).toBeInTheDocument();
  });

  test("closing the walkthrough (X) returns to the login screen untouched", () => {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    fireEvent.click(screen.getByText(/guided demo/i));
    fireEvent.click(screen.getByLabelText("Close demo"));
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });
});
