// sessionExercisePrescription.test.jsx
// Regression test: Exercise Prescription (data.tx_exercise_prescription --
// a separate, standing treatment programme from hep_programme, see
// ExercisePrescriptionModule in the Treatment tab) was being prescribed for
// patients but never appeared anywhere in the Sessions feature. Sessions'
// "Exercises" section only ever read hep_programme.
//
// Fix: added a dedicated "Exercise Prescription" section to
// SessionDetailView, shown for both a new session (live view of
// tx_exercise_prescription, with remove support and a link to the full
// picker on the Treatment tab for adding/editing dosage) and a past session
// (a frozen snapshot captured at save time, same pattern already used for
// Exercises/Modalities/Treatment).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickVisitForm } from "../AppModules.jsx";

const PC = { accent:"#7c3aed", a2:"#9333ea", a3:"#059669", a4:"#b45309", s2:"#f5f0fb", s3:"#ede7f6", surface:"#fff", border:"#E0E0E2", text:"#0D0D0D", muted:"#6B6B6B" };

describe("Exercise Prescription visibility in Sessions", () => {
  it("shows prescribed exercises when opening a new session", () => {
    const data = { tx_exercise_prescription: [
      { id: "rx1", name: "Bridging", sets: "3", reps: "12", customSets: "3", customReps: "12" },
    ] };
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={data} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText("＋ New session"));
    expect(screen.getByText("Bridging")).toBeTruthy();
  });

  it("removing a prescribed exercise updates tx_exercise_prescription directly", () => {
    const data = { tx_exercise_prescription: [
      { id: "rx1", name: "Bridging", sets: "3", reps: "12", customSets: "3", customReps: "12" },
    ] };
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={data} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText("＋ New session"));
    const removeButtons = screen.getAllByTitle("Remove");
    fireEvent.click(removeButtons[removeButtons.length - 1]); // last Remove = Exercise Prescription section
    expect(setMock).toHaveBeenCalledWith("tx_exercise_prescription", []);
  });

  it("the add/edit link navigates to the Treatment tab instead of a fake inline form", () => {
    const navToMock = vi.fn();
    const data = { tx_exercise_prescription: [] };
    render(<QuickVisitForm PC={PC} data={data} set={vi.fn()} navTo={navToMock} />);
    fireEvent.click(screen.getByText("＋ New session"));
    fireEvent.click(screen.getByText(/Add \/ edit in Exercise Prescription/));
    expect(navToMock).toHaveBeenCalledWith("treatment");
  });

  it("saving a new session snapshots the prescription onto the tx_sessions entry", () => {
    const data = { tx_exercise_prescription: [
      { id: "rx1", name: "Bridging", sets: "3", reps: "12", customSets: "3", customReps: "12" },
    ] };
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={data} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText("＋ New session"));
    fireEvent.click(screen.getByText("Save & Go to SOAP →"));
    const [, savedSessions] = setMock.mock.calls.find(c => c[0] === "tx_sessions");
    expect(savedSessions[0].exercisePrescription).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Bridging" })])
    );
  });

  it("a past session shows the CURRENT live prescription, not a frozen snapshot -- " +
      "Exercise Prescription is a standing programme, not a per-visit event, so exercises " +
      "picked after a session was saved must still show up when that session is reopened", () => {
    const sessions = [{
      id: "s1", date: "01/07/2026", sessionNo: 1,
      exercisePrescription: [{ id: "rx-old", name: "Old prescribed exercise", detail: "3x10" }],
    }];
    const data = { tx_sessions: sessions, tx_exercise_prescription: [
      { id: "rx-new", name: "Currently prescribed exercise", sets: "3", reps: "12" },
    ] };
    render(<QuickVisitForm PC={PC} data={data} set={vi.fn()} navTo={() => {}} />);
    fireEvent.click(screen.getByText(/Session 1/));
    expect(screen.getByText("Currently prescribed exercise")).toBeTruthy();
    expect(screen.queryByText("Old prescribed exercise")).toBeNull();
  });

  it("removing a prescribed exercise from a past session view also removes it live", () => {
    const sessions = [{ id: "s1", date: "01/07/2026", sessionNo: 1 }];
    const data = { tx_sessions: sessions, tx_exercise_prescription: [
      { id: "rx1", name: "Bridging", sets: "3", reps: "12" },
    ] };
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={data} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText(/Session 1/));
    fireEvent.click(screen.getByTitle("Remove"));
    expect(setMock).toHaveBeenCalledWith("tx_exercise_prescription", []);
  });
});
