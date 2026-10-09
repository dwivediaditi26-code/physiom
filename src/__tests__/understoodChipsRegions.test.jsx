// "We understood: ... tap to add" for Shoulder, Knee, Hip and Ankle/Foot (the Elbow version is in
// understoodChips.test.jsx). Same behaviour: nothing is ticked until a chip is tapped; typed words that meant the
// tapped answer are replaced by it; each region loads only its own matcher, and only when someone types.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UnderstoodChips, { PHRASE_FIELDS, hasPhrases } from "../UnderstoodChips.jsx";
import { SUBJECTIVE_REGION_FIELDS, contentKeyForRegion } from "../orthoSubjectiveRegionData.js";

const fieldsOf = (key) => SUBJECTIVE_REGION_FIELDS[key];
const F = (key, id) => fieldsOf(key).find((f) => f.id === id);

function Field({ k, id, value, onPick = () => {} }) {
  return <UnderstoodChips mode="field" contentKey={k} field={F(k, id)} value={value} onPick={onPick} />;
}

// [region key, question, what the student typed, the answer offered, what tapping passes on]
const FIELD_CASES = [
  ["shoulder", "aggravating", "overhead", "Overhead reaching", "Overhead reaching"],
  ["shoulder", "radiation", "dard kohni tak jata hai", "Down to elbow", "Down to elbow"],
  ["knee", "location", "ghutne ke peeche dard", "Behind the knee (popliteal)", "Behind the knee (popliteal)"],
  ["knee", "givingWay", "seedhiyon par ghutna jawab de deta hai", "Yes — on stairs", "Yes — on stairs"],
  ["hip", "location", "groin pain", "Anterior groin", "Anterior groin"],
  ["hip", "mechanical", "snapping on the outside of the hip", "External snapping (lateral, IT band)", "External snapping (lateral, IT band)"],
  ["ankleFoot", "location", "outer ankle", "Lateral ankle ligaments", "Lateral ankle ligaments"],
  ["ankleFoot", "swelling", "no swelling", "None", "None"],
];

describe.each(["shoulder", "knee", "hip", "ankleFoot"])("%s: chips under one question's box", (key) => {
  it.each(FIELD_CASES.filter((c) => c[0] === key))("%s / %s: typing %j offers %s", async (_k, id, typed, offered, passes) => {
    const onPick = vi.fn();
    render(<Field k={key} id={id} value={typed} onPick={onPick} />);
    const chip = await screen.findByRole("button", { name: new RegExp(offered.replace(/[()/]/g, "\\$&")) });
    expect(screen.getByText(/We understood/)).toBeInTheDocument();
    fireEvent.click(chip);
    expect(onPick).toHaveBeenCalledWith(passes);
  });

  it("shows nothing for gibberish or text that is too short", async () => {
    for (const text of ["", "ab", "asdfgh qwerty"]) {
      const { unmount } = render(<Field k={key} id={PHRASE_FIELDS[key][0]} value={text} />);
      await new Promise((r) => setTimeout(r, 60));
      expect(screen.queryByTestId("understood-chips")).toBeNull();
      unmount();
    }
  });

  it("only offers the questions it has phrases for", () => {
    expect(hasPhrases(key, PHRASE_FIELDS[key][0])).toBe(true);
    expect(hasPhrases(key, "function")).toBe(false);
    expect(hasPhrases(key, "notAQuestion")).toBe(false);
  });
});

describe("chips under the free-story box, region by region", () => {
  function Story({ k, text, regionData = {}, onPick = () => {} }) {
    return <UnderstoodChips mode="story" contentKey={k} text={text} fields={fieldsOf(k)} regionData={regionData} onPick={onPick} />;
  }
  it("Shoulder: one story gives answers for several questions, each labelled", async () => {
    const onPick = vi.fn();
    render(<Story k="shoulder" text="pain when I reach up, cannot sleep on that side, ice helps" onPick={onPick} />);
    fireEvent.click(await screen.findByRole("button", { name: /Aggravating movement: Overhead reaching/ }));
    expect(onPick).toHaveBeenCalledWith("aggravating", "Overhead reaching");
    expect(screen.getByRole("button", { name: /Aggravating movement: Lying on the shoulder/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Relieving factor: Ice \/ heat/ })).toBeInTheDocument();
  });
  it("Knee: giving way and locking are offered as their own questions", async () => {
    render(<Story k="knee" text="knee gives way on the stairs and it locks and I cannot straighten it" />);
    expect(await screen.findByRole("button", { name: /Giving way\?: Yes — on stairs/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Locking\?: Yes — true mechanical locking/ })).toBeInTheDocument();
  });
  it("Hip: its own 24-hour pattern answers, not the standard six", async () => {
    render(<Story k="hip" text="stiff in the morning and the groin hurts on stairs" />);
    expect(await screen.findByRole("button", { name: /24-hour pattern: Morning stiffness/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aggravating movement: Stairs/ })).toBeInTheDocument();
  });
  it("Ankle/Foot: swelling is offered as its own question", async () => {
    render(<Story k="ankleFoot" text="heel pain, the ankle is always swollen" />);
    expect(await screen.findByRole("button", { name: /Swelling: Moderate/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pain location: Plantar heel \/ arch/ })).toBeInTheDocument();
  });
  it("skips answers already ticked in the questions below", async () => {
    render(<Story k="shoulder" text="pain when I reach up and lying on that shoulder" regionData={{ aggravating: "Overhead reaching" }} />);
    expect(await screen.findByRole("button", { name: /Lying on the shoulder/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Overhead reaching/ })).toBeNull();
  });
  it("a story with nothing understood shows nothing", async () => {
    render(<Story k="hip" text="I have been feeling a bit tired lately" />);
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByTestId("understood-chips")).toBeNull();
  });
  it("updates live and the tapped chip disappears at once", async () => {
    const { rerender } = render(<Story k="knee" text="pain behind the" />);
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByTestId("understood-chips")).toBeNull();
    rerender(<Story k="knee" text="pain behind the knee" />);
    expect(await screen.findByRole("button", { name: /Behind the knee/ })).toBeInTheDocument();
    rerender(<Story k="knee" text="pain behind the knee" regionData={{ location: "Behind the knee (popliteal)" }} />);
    await waitFor(() => expect(screen.queryByTestId("understood-chips")).toBeNull());
  });
});

describe("which screens get chips", () => {
  it("every region the form can show maps onto a matcher, except the spine regions that have none yet", () => {
    const withChips = ["shoulder", "upperArm", "elbow", "forearm", "wrist", "hand", "hip", "thigh", "knee", "leg", "ankle", "foot"];
    for (const id of withChips) expect(PHRASE_FIELDS[contentKeyForRegion({ id })], id).toBeTruthy();
    for (const id of ["cervical", "thoracic", "lumbar", "sacrum", "pelvis"]) expect(PHRASE_FIELDS[contentKeyForRegion({ id })], id).toBeUndefined();
  });
});
