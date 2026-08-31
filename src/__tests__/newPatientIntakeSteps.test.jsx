// The top-header "+ New" intake (2026-08-31, Aditi: "new patient should
// [be] 6 ques max for demographic data or patient details and then ask for
// neuro ortho cardio sports"). Locks in the two things that request is
// about: step 1 asks six patient-detail questions and no more, and step 2
// is the specialty question -- which now actually decides what gets stored
// on the record, instead of every new patient silently becoming Ortho.
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { IntakeForm } from "../AppModules.jsx";

const PC = { accent:"#7c3aed", a2:"#9333ea", a3:"#059669", text:"#111", muted:"#666",
             border:"#eee", surface:"#fff", s2:"#f7f7fb", s3:"#f1f1f6" };

const renderForm = (onSubmit = vi.fn()) => {
  render(<IntakeForm PC={PC} currentUser={{ id:"u1" }} onCancel={()=>{}} onSubmit={onSubmit}/>);
  return onSubmit;
};

// Fills the two required step-1 answers and advances to the specialty step.
const goToSpecialtyStep = () => {
  fireEvent.change(screen.getByPlaceholderText("e.g. Riya Sharma"), { target:{ value:"Riya Sharma" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. Lower back pain, knee injury"), { target:{ value:"Low back pain" } });
  fireEvent.click(screen.getByRole("button", { name: /Next: choose specialty/i }));
};

describe("New Patient intake — 6 questions, then specialty", () => {
  beforeEach(() => { localStorage.clear(); });

  test("step 1 shows exactly 6 patient-detail questions", () => {
    renderForm();
    // Six visible inputs/selects, no more -- the rest of the old four-tab
    // intake is behind "More details (optional)".
    const controls = document.querySelectorAll("input, select, textarea");
    expect(controls.length).toBe(6);
    ["Full name *","Age","Sex","Phone number","Occupation","Chief complaint *"]
      .forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
  });

  test("the rest of the intake is still there, just optional behind More details", () => {
    renderForm();
    expect(screen.queryByPlaceholderText("patient@email.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/More details \(optional\)/i));
    expect(screen.getByPlaceholderText("patient@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dr. Name, Hospital")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Diabetes, hypertension, previous surgeries...")).toBeInTheDocument();
  });

  test("step 1 will not advance without a name and chief complaint", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /Name & chief complaint first/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("e.g. Riya Sharma"), { target:{ value:"Riya Sharma" } });
    expect(screen.getByRole("button", { name: /Name & chief complaint first/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("e.g. Lower back pain, knee injury"), { target:{ value:"Low back pain" } });
    fireEvent.click(screen.getByRole("button", { name: /Next: choose specialty/i }));
    expect(screen.getByText(/Which specialty is this assessment\?/i)).toBeInTheDocument();
  });

  test("step 2 asks the specialty question, with Sports/Pedia honestly marked SOON", () => {
    renderForm();
    goToSpecialtyStep();
    const grid = within(screen.getByTestId("intake-specialty-grid"));
    ["Ortho","Neuro","Cardio","Sports","Pedia"].forEach(l => expect(grid.getByText(l)).toBeInTheDocument());
    expect(grid.getAllByText("SOON").length).toBe(2);
    // A not-yet-built specialty can't be selected, so it can't be submitted.
    fireEvent.click(grid.getByText("Sports"));
    fireEvent.click(screen.getByRole("checkbox", { name:/I consent to physiotherapy assessment and treatment/i }));
    expect(screen.getByRole("button", { name: /Pick a specialty/i })).toBeDisabled();
  });

  test("submitting records the chosen specialty and still requires consent", () => {
    const onSubmit = renderForm();
    goToSpecialtyStep();
    const grid = within(screen.getByTestId("intake-specialty-grid"));
    fireEvent.click(grid.getByText("Neuro"));
    // Specialty picked but consent not given yet -- still blocked, same hard
    // requirement the old Consent tab enforced.
    expect(screen.getByRole("button", { name: /Consent required/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name:/I consent to physiotherapy assessment and treatment/i }));
    fireEvent.click(screen.getByRole("button", { name: /Start Neuro Assessment/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      dem_name: "Riya Sharma",
      cc_main: "Low back pain",
      assessment_specialty: "neuro",
      consent_treat: true,
    });
  });
});
