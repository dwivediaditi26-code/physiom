import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useVoiceInput } from "../hooks/useVoiceInput.js";
import { VoiceMicButton } from "../components/VoiceMicButton.jsx";

// A stand-in for the browser's speech engine that lets the test "speak".
let engine;
class FakeRecognition {
  constructor() { engine = this; this.started = false; }
  start() { this.started = true; }
  stop() { this.started = false; this.onend?.(); }
  // Mimics SpeechRecognitionEvent: `results` holds every segment so far,
  // `resultIndex` is where this event's new/changed ones begin.
  say(results, resultIndex) {
    this.onresult?.({
      resultIndex,
      results: results.map(([text, isFinal]) => Object.assign([{ transcript: text }], { isFinal })),
    });
  }
}

describe("useVoiceInput (shared voice typing)", () => {
  beforeEach(() => { window.SpeechRecognition = FakeRecognition; });
  afterEach(() => { delete window.SpeechRecognition; vi.restoreAllMocks(); });

  it("appends dictated words to what was already in the field", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useVoiceInput("knee pain", onChange));
    act(() => result.current.toggle());
    expect(result.current.recording).toBe(true);
    act(() => engine.say([["for two weeks", true]], 0));
    expect(onChange).toHaveBeenLastCalledWith("knee pain for two weeks");
  });

  it("does not repeat words when the engine re-sends an already-finished segment", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useVoiceInput("", onChange));
    act(() => result.current.toggle());
    act(() => engine.say([["worse on stairs", true]], 0));
    // A second event starts at index 1, so index 0 must not be counted again.
    act(() => engine.say([["worse on stairs", true], ["and at night", true]], 1));
    expect(onChange).toHaveBeenLastCalledWith("worse on stairs and at night");
  });

  it("ignores words that are still being worked out (not final yet)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useVoiceInput("", onChange));
    act(() => result.current.toggle());
    act(() => engine.say([["wor", false]], 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops recording when toggled again", () => {
    const { result } = renderHook(() => useVoiceInput("", vi.fn()));
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.recording).toBe(false);
  });

  it("tells the user when the browser has no speech engine", () => {
    delete window.SpeechRecognition;
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { result } = renderHook(() => useVoiceInput("", vi.fn()));
    act(() => result.current.toggle());
    expect(alertSpy).toHaveBeenCalledWith("Voice input requires the Chrome browser.");
    expect(result.current.recording).toBe(false);
  });
});

describe("VoiceMicButton", () => {
  it("shows the mic, then a stop square while recording, and reports clicks", () => {
    const onClick = vi.fn();
    const { rerender } = render(<VoiceMicButton recording={false} onClick={onClick} />);
    fireEvent.click(screen.getByTitle("Speak"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<VoiceMicButton recording={true} onClick={onClick} />);
    expect(screen.getByTitle("Stop recording").textContent).toBe("⏹");
  });
});
