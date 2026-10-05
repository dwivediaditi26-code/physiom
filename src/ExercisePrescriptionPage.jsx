import React from "react";
import { nextSessionNo } from "./txSessions.js";
import { ExercisePrescriptionSection } from "./orthoExercisePrescription.jsx";

// The Exercise tab (and Learn > Exercise Prescription) now opens the
// redesigned exercise builder (treatment-type tiles, library sheet, dosage
// steppers) instead of ClinicalModules.jsx's older ExercisePrescriptionModule.
// The redesigned section keeps its programme at data.exercisePrescription
// .programme; every other screen (SOAP, Home Protocol, session notes) reads
// data.tx_exercise_prescription -- so this adapter presents that array to the
// section as its programme and writes every change straight back to it, and
// keeps the Home Protocol change log (hep_log) the old module wrote.
export default function ExercisePrescriptionPage({ data, set }) {
  const programme = Array.isArray(data?.tx_exercise_prescription) ? data.tx_exercise_prescription : [];
  const view = { ...(data || {}), exercisePrescription: { programme } };

  const sessionNo = () => nextSessionNo(data?.tx_sessions);
  const logChanges = (changes) => {
    if (!set || !changes.length) return;
    const log = Array.isArray(data?.hep_log) ? data.hep_log : [];
    set("hep_log", [{ session: sessionNo(), date: new Date().toLocaleDateString("en-GB"), changes, version: parseInt(data?.hep_version) || 1 }, ...log]);
  };

  const setData = (updater) => {
    if (!set) return;
    const next = typeof updater === "function" ? updater(view) : updater;
    const nextProgramme = next?.exercisePrescription?.programme;
    if (!Array.isArray(nextProgramme) || nextProgramme === programme) return;
    const had = new Set(programme.map((e) => e.id));
    const has = new Set(nextProgramme.map((e) => e.id));
    const stamped = nextProgramme.map((e) => (had.has(e.id) ? e : { ...e, addedSession: sessionNo(), addedDate: new Date().toISOString() }));
    set("tx_exercise_prescription", stamped);
    logChanges([
      ...nextProgramme.filter((e) => !had.has(e.id)).map((e) => `＋ ${e.name}`),
      ...programme.filter((e) => !has.has(e.id)).map((e) => `− ${e.name}`),
    ]);
  };

  return <ExercisePrescriptionSection data={view} setData={setData} selectedRegions={[]} />;
}
