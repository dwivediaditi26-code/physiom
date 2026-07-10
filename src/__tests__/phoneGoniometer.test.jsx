// phoneGoniometer.test.jsx
// Regression/behaviour test for the phone-tilt goniometer feature added to
// ROMModule: a small button next to each ROM numeric field opens a modal
// that reads the phone's DeviceOrientation tilt as a single-axis
// inclinometer. It mirrors real goniometry technique: Step 1 zeroes the
// phone against the movement's real "Fixed" landmark (parsed out of
// ROM_DATA's existing gonio placement string, e.g. knee flexion's "Fixed:
// lateral femur..."), then Step 2 has the phone relocated onto the "Moving"
// landmark, reading the live angle continuously (like a goniometer needle)
// until the value is captured into the field. Covers: unsupported browser
// fallback, Android-style (no permission prompt) flow end-to-end including
// the landmark text, iOS-style (requestPermission) grant/deny flows, and
// re-zero.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ROMModule } from "../PhysioNeuro.jsx";

const fireOrientation = (beta) => {
  const evt = new Event("deviceorientation");
  evt.beta = beta;
  evt.gamma = null;
  act(() => { window.dispatchEvent(evt); });
};

describe("Phone goniometer (ROM module)", () => {
  const origDOE = window.DeviceOrientationEvent;
  afterEach(() => {
    if (origDOE === undefined) delete window.DeviceOrientationEvent;
    else window.DeviceOrientationEvent = origDOE;
  });

  it("falls back gracefully with no crash when the browser exposes no motion sensor", () => {
    delete window.DeviceOrientationEvent;
    const setMock = vi.fn();
    render(<ROMModule data={{}} set={setMock} navContext={{ romRegion: "Knee" }} />);
    const btn = screen.getAllByTitle("Measure with phone")[0];
    fireEvent.click(btn);
    expect(screen.getByText(/Measure with phone/)).toBeInTheDocument();
    expect(screen.getByText(/doesn't expose a motion sensor/)).toBeInTheDocument();
  });

  it("Android-style flow: shows the real Fixed/Moving landmarks for this movement and writes the rounded delta angle on capture", () => {
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    // deliberately no .requestPermission -- matches real Android Chrome
    const setMock = vi.fn();
    render(<ROMModule data={{}} set={setMock} navContext={{ romRegion: "Knee" }} />);

    const btn = screen.getAllByTitle("Measure with phone")[0];
    fireEvent.click(btn);

    // Step 1: real "Fixed" landmark from knee flexion's gonio string, not a
    // generic instruction -- this is the whole point of the change.
    expect(screen.getByText(/lateral femur \(greater trochanter to condyle line\)/)).toBeInTheDocument();
    expect(screen.getByText("Zero here")).toBeInTheDocument();

    fireOrientation(10);
    fireEvent.click(screen.getByText("Zero here"));

    // Step 2 now appears with the real "Moving" landmark, and the baseline
    // stays locked (10) while the live reading continues to update.
    expect(screen.getByText(/lateral fibula to lateral malleolus/)).toBeInTheDocument();
    expect(screen.getByText(/Locked at 0°/)).toBeInTheDocument();

    fireOrientation(55);
    expect(screen.getByText("45°")).toBeInTheDocument(); // |55 - 10|, baseline unchanged

    fireEvent.click(screen.getByText("Use this value"));
    expect(setMock).toHaveBeenCalledWith("rom_kflex_L_arom", "45");
    // modal closes after capture
    expect(screen.queryByText(/Measure with phone/)).not.toBeInTheDocument();
  });

  it("re-zeroing resets the baseline instead of stacking onto the old one", () => {
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    render(<ROMModule data={{}} set={vi.fn()} navContext={{ romRegion: "Knee" }} />);
    fireEvent.click(screen.getAllByTitle("Measure with phone")[0]);

    fireOrientation(10);
    fireEvent.click(screen.getByText("Zero here"));
    fireOrientation(40);
    expect(screen.getByText("30°")).toBeInTheDocument();

    // re-zero at the new position (40) instead of the old one (10)
    fireEvent.click(screen.getByText(/Locked at 0°/));
    fireEvent.click(screen.getByText("Zero here"));
    fireOrientation(65);
    expect(screen.getByText("25°")).toBeInTheDocument(); // |65 - 40|, not 55
  });

  it("iOS-style flow: requires an explicit permission tap before Step 1 appears", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    window.DeviceOrientationEvent.requestPermission = requestPermission;
    const setMock = vi.fn();
    render(<ROMModule data={{}} set={setMock} navContext={{ romRegion: "Knee" }} />);

    fireEvent.click(screen.getAllByTitle("Measure with phone")[0]);
    expect(screen.getByText("Enable motion sensor")).toBeInTheDocument();
    expect(screen.queryByText("Zero here")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Enable motion sensor"));
      await Promise.resolve();
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Zero here")).toBeInTheDocument();
  });

  it("iOS-style flow: a denied permission shows an explanatory message instead of crashing", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    window.DeviceOrientationEvent.requestPermission = requestPermission;
    render(<ROMModule data={{}} set={vi.fn()} navContext={{ romRegion: "Knee" }} />);

    fireEvent.click(screen.getAllByTitle("Measure with phone")[0]);
    await act(async () => {
      fireEvent.click(screen.getByText("Enable motion sensor"));
      await Promise.resolve();
    });

    expect(screen.getByText(/Motion access was denied/)).toBeInTheDocument();
  });

  it("manual number entry still works untouched alongside the phone-measure button", () => {
    const setMock = vi.fn();
    render(<ROMModule data={{}} set={setMock} navContext={{ romRegion: "Knee" }} />);
    const inputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: "90" } });
    expect(setMock).toHaveBeenCalledWith("rom_kflex_L_arom", "90");
  });
});
