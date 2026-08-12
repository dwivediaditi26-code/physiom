// AuthScreen's pre-login "Explore Demo Patient" entry point (2026-08-12).
// Renders AuthScreen directly (not through App.jsx/Supabase) since the demo
// entry point and the walkthrough it opens never touch Supabase at all --
// only the actual Login/Register/Forgot form submits do.

import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthScreen from "../AuthScreen.jsx";

describe("AuthScreen -- Explore Demo Patient entry point", () => {
  test("shows the demo entry button on the login screen", () => {
    render(<AuthScreen onAuth={() => {}} />);
    expect(screen.getByText(/Explore Demo Patient/i)).toBeInTheDocument();
  });

  test("clicking it opens the walkthrough overlay on step 1", () => {
    render(<AuthScreen onAuth={() => {}} />);
    fireEvent.click(screen.getByText(/Explore Demo Patient/i));
    expect(screen.getByText("Subjective Assessment")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  test("finishing the walkthrough and hitting Create Account lands back on the real Register form", () => {
    render(<AuthScreen onAuth={() => {}} />);
    fireEvent.click(screen.getByText(/Explore Demo Patient/i));
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
    render(<AuthScreen onAuth={() => {}} />);
    fireEvent.click(screen.getByText(/Explore Demo Patient/i));
    fireEvent.click(screen.getByLabelText("Close demo"));
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });
});
