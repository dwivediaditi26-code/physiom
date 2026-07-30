import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
function makeStore(initial){ let s={...initial}; return { get:()=>s, set:(p)=>{s={...s,...p};} }; }

describe("Generic Phase 0.5 for the regions without a bespoke screen", () => {
  test("Hip shows a Phase 0.5 condition-matches card after Run analysis", () => {
    const { get, set } = makeStore({
      cx_selected_regions: JSON.stringify(["Hip / Groin"]),
      cc_main: "right groin pain, worse deep squat and pivoting",
      hp_loc_pattern: "Groin-dominant — likely intra-articular (FAI / OA / labral)",
      st_fadir_test: "Positive — anterior groin pain (FAI / labral tear)",
    });
    render(<SubjectiveModule data={get()} set={set} onNav={()=>{}} onTabChange={()=>{}} />);
    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Hip \/ Groin condition matches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Femoroacetabular impingement|labral|osteoarthritis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Objective assessment — for this condition/i).length).toBeGreaterThan(0);
  });
  test("Knee shows a Phase 0.5 card", () => {
    const { get, set } = makeStore({
      cx_selected_regions: JSON.stringify(["Knee (R)"]),
      cc_main: "knee twisted playing football, gave way, swelling",
      st_lachmans: "Grade 3 (> 10mm, soft end-feel — complete ACL rupture)",
      st_effusion: "Large effusion (visible swelling)",
    });
    render(<SubjectiveModule data={get()} set={set} onNav={()=>{}} onTabChange={()=>{}} />);
    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Knee \(R\) condition matches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ACL/i).length).toBeGreaterThan(0);
  });

  test("Ankle/Foot family shows a Phase 0.5 card (runs ankle + foot engines)", () => {
    const { get, set } = makeStore({
      cx_selected_regions: JSON.stringify(["Ankle / Foot"]),
      cc_main: "medial plantar heel pain, worst first steps in the morning",
      af_loc: "Plantar fascia — medial heel / origin",
      af_morning: "First step severely painful — then eases (plantar fascia classic)",
      st_windlass_test: "Positive",
    });
    render(<SubjectiveModule data={get()} set={set} onNav={()=>{}} onTabChange={()=>{}} />);
    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Ankle \/ Foot condition matches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/plantar fasci/i).length).toBeGreaterThan(0);
  });
  test("Elbow/Wrist/Hand family shows a Phase 0.5 card", () => {
    const { get, set } = makeStore({
      cx_selected_regions: JSON.stringify(["Elbow/Wrist/Hand"]),
      cc_main: "lateral elbow pain, tennis, worse gripping",
      ew_loc: "Lateral elbow — lateral epicondyle / extensor origin",
      ew_moi: "Sport — racquet (lateral elbow — tennis elbow)",
      st_cozens: "Positive — lateral epicondyle pain (lateral epicondylalgia)",
    });
    render(<SubjectiveModule data={get()} set={set} onNav={()=>{}} onTabChange={()=>{}} />);
    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Elbow\/Wrist\/Hand condition matches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/epicondylalgia/i).length).toBeGreaterThan(0);
  });
});