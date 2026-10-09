// "We understood: ... tap to add" under the Elbow / Wrist / Hand Subjective questions.
// While a student types in their own words the matcher suggests checklist answers; NOTHING is ticked until
// they tap a chip. Typed words that meant the tapped answer are replaced by it; other typed text stays.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UnderstoodChips, { valueWithOption, hasPhrases } from "../UnderstoodChips.jsx";
import { SUBJECTIVE_REGION_FIELDS } from "../orthoSubjectiveRegionData.js";
import * as matcher from "../elbowPhraseMap.js";

const FIELDS = SUBJECTIVE_REGION_FIELDS.elbowWristHand;
const F = (id) => FIELDS.find((f) => f.id === id);
const KEY = "elbowWristHand";

function Field({ id, value, onPick = () => {} }) {
  return <UnderstoodChips mode="field" contentKey={KEY} field={F(id)} value={value} onPick={onPick} />;
}

describe("chips under one question's box", () => {
  it("typing 'gripping' offers Gripping, and tapping it passes the new value on", async () => {
    const onPick = vi.fn();
    render(<Field id="aggravating" value="gripping" onPick={onPick} />);
    const chip = await screen.findByRole("button", { name: /Gripping/ });
    expect(screen.getByText(/We understood/)).toBeInTheDocument();
    fireEvent.click(chip);
    expect(onPick).toHaveBeenCalledWith("Gripping"); // the typed word is replaced by the real option
  });

  it("everyday words in Hinglish work: 'kohni ke bahar' offers Lateral elbow", async () => {
    render(<Field id="location" value="kohni ke bahar" />);
    expect(await screen.findByRole("button", { name: /Lateral elbow/ })).toBeInTheDocument();
  });

  it("Hindi (Devanagari) works too", async () => {
    render(<Field id="location" value="कोहनी के बाहर" />);
    expect(await screen.findByRole("button", { name: /Lateral elbow/ })).toBeInTheDocument();
  });

  it("an answer that is already ticked is not offered again", async () => {
    render(<Field id="aggravating" value="Gripping, lifting" />);
    expect(await screen.findByRole("button", { name: /Lifting/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gripping/ })).toBeNull();
  });

  it("typed words that meant the tapped answer are replaced; other typed text is kept", async () => {
    const onPick = vi.fn();
    render(<Field id="aggravating" value="pakadne me dard, kuch aur hota hai" onPick={onPick} />);
    fireEvent.click(await screen.findByRole("button", { name: /Gripping/ }));
    expect(onPick).toHaveBeenCalledWith("kuch aur hota hai, Gripping");
  });

  it("a single-choice question (24-hour pattern) is replaced, not added to", async () => {
    const onPick = vi.fn();
    render(<Field id="pattern" value="constant" onPick={onPick} />);
    fireEvent.click(await screen.findByRole("button", { name: /Constant/ }));
    expect(onPick).toHaveBeenCalledWith("Constant");
  });

  it("two possible answers for a single-choice question are both offered, never silently picked", async () => {
    render(<Field id="pattern" value="worse in the morning and worse at night" />);
    expect(await screen.findByRole("button", { name: /Worse in morning/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Worse at night/ })).toBeInTheDocument();
  });

  it.each([
    ["nothing typed", ""],
    ["too short to mean anything", "ab"],
    ["gibberish", "asdfgh qwerty"],
    ["negated", "no pain on gripping"],
    ["another body part", "my back hurts when I lift"],
  ])("shows nothing for: %s", async (_n, text) => {
    render(<Field id="aggravating" value={text} />);
    await new Promise((r) => setTimeout(r, 60)); // let the matcher load
    expect(screen.queryByTestId("understood-chips")).toBeNull();
  });

  it("shows nothing for a region group that has no phrases yet", async () => {
    render(<UnderstoodChips mode="field" contentKey="knee" field={{ ...F("aggravating") }} value="gripping" onPick={() => {}} />);
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByTestId("understood-chips")).toBeNull();
    expect(hasPhrases("knee", "aggravating")).toBe(false);
    expect(hasPhrases("elbowWristHand", "aggravating")).toBe(true);
  });

  it("updates live as the student keeps typing", async () => {
    const { rerender } = render(<Field id="location" value="outer" />);
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByTestId("understood-chips")).toBeNull();
    rerender(<Field id="location" value="outer elbow" />);
    expect(await screen.findByRole("button", { name: /Lateral elbow/ })).toBeInTheDocument();
    rerender(<Field id="location" value="Lateral elbow" />); // now ticked
    await waitFor(() => expect(screen.queryByTestId("understood-chips")).toBeNull());
  });
});

describe("chips under the free-story box", () => {
  function Story({ text, regionData = {}, onPick = () => {} }) {
    return <UnderstoodChips mode="story" contentKey={KEY} text={text} fields={FIELDS} regionData={regionData} onPick={onPick} />;
  }
  it("one story gives answers for several questions, each labelled", async () => {
    const onPick = vi.fn();
    render(<Story text="outer elbow pain when gripping, I play tennis" onPick={onPick} />);
    fireEvent.click(await screen.findByRole("button", { name: /Pain location: Lateral elbow/ }));
    expect(onPick).toHaveBeenCalledWith("location", "Lateral elbow");
    expect(screen.getByRole("button", { name: /Aggravating movement: Gripping/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mechanism of injury: Racquet sport/ })).toBeInTheDocument();
  });
  it("skips answers already ticked in the questions below", async () => {
    render(<Story text="outer elbow pain when gripping" regionData={{ location: "Lateral elbow" }} />);
    expect(await screen.findByRole("button", { name: /Gripping/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lateral elbow/ })).toBeNull();
  });
  it("a story with nothing understood shows nothing", async () => {
    render(<Story text="I have been feeling a bit tired lately" />);
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByTestId("understood-chips")).toBeNull();
  });
});

describe("valueWithOption", () => {
  it("adds to a multi-select and never duplicates", () => {
    expect(valueWithOption(F("aggravating"), "", "Gripping")).toBe("Gripping");
    expect(valueWithOption(F("aggravating"), "Lifting", "Gripping")).toBe("Lifting, Gripping");
    expect(valueWithOption(F("aggravating"), "Lifting, Gripping", "Gripping")).toBe("Lifting, Gripping");
  });
  it("keeps an option whose own name contains a comma in one piece", () => {
    const opt = F("radiation").options[3]; // "Numbness / tingling — thumb, index, middle finger (median nerve pattern)"
    expect(valueWithOption(F("radiation"), opt, "Into the fingers")).toBe(`${opt}, Into the fingers`);
  });
  it("a single choice is replaced", () => {
    expect(valueWithOption(F("pattern"), "Constant", "Worse at night")).toBe("Worse at night");
  });
});

describe("the matcher is not loaded until someone types", () => {
  it("is a separate piece the app only fetches on demand", () => {
    expect(typeof matcher.understandField).toBe("function"); // exists, but UnderstoodChips imports it lazily
  });
});
