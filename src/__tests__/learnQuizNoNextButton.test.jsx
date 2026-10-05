import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RomMovementDetail from "../physiofeed/learn/RomMovementDetail.jsx";
import { ROM_DATA } from "../sharedClinicalData.js";

// 2026-10-05, Aditi: on the Quiz tab only "Next question" shows -- the
// "Next movement" button is not shown there (it stays on the other tabs).
const region = Object.keys(ROM_DATA)[0];
const list = ROM_DATA[region];

describe("Learn > Range of motion > Quiz tab", () => {
  it("shows Next movement on Learn, and hides it on the Quiz tab", () => {
    render(<RomMovementDetail movement={list[0]} region={region} list={list} onBack={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("button", { name: new RegExp(`Next movement: ${list[1].mv.replace(/[()]/g, "\\$&")}`) })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quiz" }));
    expect(screen.queryByRole("button", { name: /Next movement/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Technique" }));
    expect(screen.getByRole("button", { name: /Next movement/ })).toBeTruthy();
  });
});
