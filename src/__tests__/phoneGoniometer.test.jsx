// phoneGoniometer.test.jsx
// Regression/behaviour test for the phone-tilt goniometer feature added to
// ROMModule: a small button next to each ROM numeric field opens a modal
// that reads the phone's DeviceOrientation tilt as a single-axis
// inclinometer (zero at start position, capture the delta at end-range),
// then writes the rounded angle into that field. Covers: unsupported
// browser fallback, Android-style (no permission prompt) flow end-to-end,
// and iOS-style (requestPermission) grant/deny flows.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
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

  it("Android-style flow: no permission prompt, zero + capture writes the rounded delta angle into the correct field", () => {
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    // deliberately no .requestPermission -- matches real Android Chrome
    const setMock = vi.fn();
    render(<ROMModule data={{}} set={setMock} navContext={{ romRegion: "Knee" }} />);

    const btn = screen.getAllByTitle("Measure with phone")[0];
    fireEvent.click(btn);

    // granted immediately (no prompt step) -- live tilt starts unset
    expect(screen.getByText("Zero at start position")).toBeInTheDocument();

    fireOrientation(10);
    expect(screen.getByText("10.0°")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Zero at start position"));

    fireOrientation(55);
    expect(screen.getByText("45°")).toBeInTheDocument(); // |55 - 10|

    fireEvent.click(screen.getByText("Use this value"));
    expect(setMock).toHaveBeenCalledWith("rom_kflex_L_arom", "45");
    // modal closes after capture
    expect(screen.queryByText(/Measure with phone/)).not.toBeInTheDocument();
  });

  it("iOS-style flow: requires an explicit permission tap before the sensor UI appears", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    window.DeviceOrientationEvent.requestPermission = requestPermission;
    const setMock = vi.fn();
    render(<ROMModule data={{}} set={setMock} navContext={{ romRegion: "Knee" }} />);

    fireEvent.click(screen.getAllByTitle("Measure with phone")[0]);
    expect(screen.getByText("Enable motion sensor")).toBeInTheDocument();
    expect(screen.queryByText("Zero at start position")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Enable motion sensor"));
      await Promise.resolve();
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Zero at start position")).toBeInTheDocument();
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
