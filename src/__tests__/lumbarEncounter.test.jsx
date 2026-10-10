// lumbarEncounter.test.jsx
// Lumbar Case 1 as a patient encounter: the student chooses what to ask and
// examine, the patient gives only the documented answer, the clinical record
// fills up with only what was asked, reasoning questions are checkpoints, and a
// report closes the case. Content checks read lumbarEncounter.js.
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";

vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));
import { trackEvent } from "../analytics/trackEvent.js";
import EncounterEngine from "../physiofeed/learn/EncounterEngine.jsx";
import { ENCOUNTER as E, allQuestions } from "../physiofeed/learn/lumbarEncounter.js";

const QS = allQuestions(E);
const JSON_TEXT = JSON.stringify(E);
beforeEach(() => { localStorage.clear(); trackEvent.mockClear(); });
afterEach(cleanup);

const mount = (onExit = () => {}) => render(<EncounterEngine data={E} onExit={onExit}/>);
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const radio = (label) => screen.getByRole("radio", { name: new RegExp(esc(label)) });
const count = () => screen.getByTestId("engine-count").textContent;
function ask(label) { fireEvent.click(radio(label)); fireEvent.click(screen.getByText("Ask this question")); }
function answer(q, id = q.correct) {
  const box = within(screen.getByTestId(`mcq-${q.id}`));
  fireEvent.click(box.getByText(q.options.find((o) => o.id === id).text));
  fireEvent.click(box.getByText("Submit Answer"));
}
const cont = (label = "Continue") => fireEvent.click(screen.getByText(label));
function playHistory(pick = (q) => q.correct) {
  for (const t of E.topics) { ask(t.label); answer(t.mcq, pick(t.mcq)); cont(); }
  ask(E.safety.label);
  fireEvent.click(radio(E.safety.topics[0].label));
  fireEvent.click(screen.getByText("Ask this question"));
  answer(E.safety.mcq, pick(E.safety.mcq)); cont();
}
function playExam(pick = (q) => q.correct) {
  cont("Move to the physical examination");
  for (const d of E.exam.domains) {
    fireEvent.click(radio(d.label));
    fireEvent.click(screen.getByText("Perform this examination"));
    if (d.mcq) { answer(d.mcq, pick(d.mcq)); cont(); } else fireEvent.click(screen.getByText("Back to the examinations"));
  }
  cont("Continue to the imaging");
}
function playRest(pick = (q) => q.correct) {
  answer(E.imaging.mcq, pick(E.imaging.mcq)); cont();
  answer(E.impression.mcq, pick(E.impression.mcq)); cont();
  answer(E.management.mcq, pick(E.management.mcq));
  E.management.plan.options.slice(0, 3).forEach((p) => fireEvent.click(screen.getByText(p.label)));
  cont("See my case report");
}

describe("Lumbar Case 1 encounter — content", () => {
  it("has 12 reasoning questions: 6 history, safety, 2 examination, imaging, impression, management", () => {
    expect(QS).toHaveLength(12);
    expect(new Set(QS.map((q) => q.id)).size).toBe(12);
  });
  it("every question has 4 options, one correct answer, and a reason for every option", () => {
    for (const q of QS) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.id === q.correct)).toHaveLength(1);
      for (const o of q.options) expect(o.why.length).toBeGreaterThan(10);
      expect(q.options.find((o) => o.id === q.correct).why.startsWith("Correct")).toBe(true);
      for (const o of q.options.filter((x) => x.id !== q.correct)) expect(o.why.startsWith("Incorrect")).toBe(true);
    }
  });
  it("keeps the documented values unchanged", () => {
    for (const t of ["49 years", "approximately 14 months", "about 15 years", "SLR right: 50°.", "SLR left: 50°.", "approximately 2 cm above the knee", "approximately 40° bilaterally",
      "Oswestry Disability Score: 72%", "VAS pain: 7.5 after 15 minutes of standing or sitting", "Mild bilateral L4–L5 facet degeneration", "Minor disc bulges at L4–L5 and L5–S1",
      "antidepressant medication for three months", "Off work for six months", "approximately 6 kg"]) expect(JSON_TEXT).toContain(t);
  });
  it("marks the slump test as not evaluated and still to check", () => {
    const slump = E.exam.domains.find((d) => d.id === "neural").findings.find((f) => /Slump/.test(f.text));
    expect(slump).toMatchObject({ text: "Slump test: not evaluated.", tag: "STILL TO CHECK" });
  });
  it("does not invent red-flag answers", () => {
    expect(JSON_TEXT).not.toMatch(/no red flags/i);
    expect(JSON_TEXT).not.toMatch(/red flags? (were |have been )?(excluded|ruled out|negative|clear)/i);
    expect(E.safety.note.warning).toBe("This specific information is not provided in the supplied case.");
    for (const t of E.safety.topics) for (const q of t.questions) expect(q.endsWith("?")).toBe(true);
  });
  it("does not diagnose a structure or radiculopathy as confirmed (only in options marked incorrect)", () => {
    for (const q of QS) {
      const correct = q.options.find((o) => o.id === q.correct).text;
      expect(correct).not.toMatch(/(?<!not )confirm(s|ed)? (a |the )?(disc|nerve-root|radiculopathy|facet)/i);
    }
  });
  it("the correct option is not always the longest or 'B' — answers are spread", () => {
    expect(new Set(QS.map((q) => q.correct)).size).toBeGreaterThanOrEqual(2);
  });
  it("derived reasons are flagged so they can be checked", () => {
    const derived = QS.flatMap((q) => q.options).filter((x) => x.derived);
    expect(derived.length).toBeGreaterThan(0);
    for (const x of derived) expect(x.why.startsWith("Incorrect")).toBe(true);
  });
  it("has the three references with no invented textbook details", () => {
    expect(E.references).toHaveLength(3);
    expect(E.references[0].url).toBe("https://www.nice.org.uk/guidance/ng59/chapter/recommendations");
    expect(E.references[1].url2).toBe("https://www.ncbi.nlm.nih.gov/books/NBK599213/");
    expect(E.references[2].points.join(" ")).toMatch(/have not been supplied/);
  });
});

describe("Lumbar Case 1 encounter — playing it", () => {
  it("opens at 1/12 with the patient's words, the patient information and the first question choices", () => {
    mount();
    expect(count()).toBe("1/12");
    expect(screen.getByTestId("engine-title")).toHaveTextContent("1. Meet Your Patient");
    expect(screen.getByTestId("engine-quote")).toHaveTextContent("I injured my back at work");
    expect(screen.getByText("49 years")).toBeInTheDocument();
    expect(screen.getByText("Ask this question")).toBeDisabled();
    expect(screen.getAllByRole("radio")).toHaveLength(7); // 6 history topics + safety screening
    expect(screen.queryByText(/Information added to your clinical record/)).not.toBeInTheDocument();
  });

  it("asking a question shows only that patient response and adds only its facts to the record", () => {
    mount();
    ask(E.topics[0].label);
    expect(screen.getByTestId("engine-quote")).toHaveTextContent("installing car upholstery");
    expect(within(screen.getByTestId("record-added")).getByText("Onset: work-related injury.")).toBeInTheDocument();
    expect(screen.queryByText(/Sitting tolerance/)).not.toBeInTheDocument();
    expect(screen.getByText("Submit Answer")).toBeDisabled();
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
  });

  it("selecting does not reveal the answer; Submit opens the feedback page with every reason, a key learning point and Continue", () => {
    mount();
    const t = E.topics[0];
    ask(t.label);
    fireEvent.click(screen.getByText(t.mcq.options[0].text));
    expect(screen.queryByTestId("feedback")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Submit Answer"));
    expect(screen.getByTestId("engine-title")).toHaveTextContent("Feedback");
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(screen.getByText(/The best answer is B/)).toBeInTheDocument();
    for (const o of t.mcq.options) expect(screen.getByTestId(`why-${t.mcq.id}-${o.id}`)).toBeInTheDocument();
    expect(screen.getByText("(your choice)")).toBeInTheDocument();
    expect(screen.getByTestId("takeaway")).toHaveTextContent(t.keyPoint);
  });

  it("a correct answer says Correct; Continue returns to the choices without that question and moves progress on", () => {
    mount();
    const t = E.topics[0];
    ask(t.label); answer(t.mcq); expect(screen.getByText("Correct")).toBeInTheDocument();
    cont();
    expect(count()).toBe("2/12");
    expect(screen.getByTestId("engine-title")).toHaveTextContent("What would you like to ask next?");
    expect(screen.queryByRole("radio", { name: new RegExp(esc(t.label)) })).not.toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    // the record so far has only what was asked
    fireEvent.click(screen.getByText(/Your clinical record so far/));
    expect(screen.getByText(/Onset: work-related injury\./)).toBeInTheDocument();
    expect(screen.queryByText(/Sitting tolerance/)).not.toBeInTheDocument();
  });

  it("cannot be submitted twice; one attempt is recorded with the existing analytics call", async () => {
    mount();
    const t = E.topics[0];
    ask(t.label); answer(t.mcq);
    expect(JSON.parse(localStorage.getItem("pm_case_lumbar-case-1_v3")).answers[t.mcq.id].attempts).toBe(1);
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("case_mcq_submitted", expect.objectContaining({ entityType: "case", entityId: "lumbar-case-1", properties: expect.objectContaining({ question: t.mcq.id, selected: "B", correct: true, attempt: 1 }) })));
    expect(trackEvent.mock.calls.filter((c) => c[0] === "case_mcq_submitted")).toHaveLength(1);
  });

  it("Back from a patient response returns to the choices with nothing recorded", () => {
    mount();
    ask(E.topics[1].label);
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getAllByRole("radio")).toHaveLength(7);
  });

  it("safety screening: the question stays hidden until a topic is opened; the note says the answer is not in the case; feedback shows the escalation warning", () => {
    mount();
    ask(E.safety.label);
    expect(screen.queryByTestId(`mcq-${E.safety.mcq.id}`)).not.toBeInTheDocument();
    fireEvent.click(radio(E.safety.topics[0].label));
    fireEvent.click(screen.getByText("Ask this question"));
    const note = within(screen.getByTestId("safety-note"));
    expect(note.getByText("This specific information is not provided in the supplied case.")).toBeInTheDocument();
    expect(note.getByText(/Do not assume that the answer is negative/)).toBeInTheDocument();
    expect(screen.getByText(/Any new loss of bowel control\?/)).toBeInTheDocument();
    answer(E.safety.mcq, "A");
    expect(screen.getByText(/Escalation required if present/)).toBeInTheDocument();
    expect(screen.getByTestId(`why-${E.safety.mcq.id}-C`)).toHaveTextContent(/cauda equina/);
  });

  it("history is complete only after every topic and safety screening; then the examination starts", () => {
    mount();
    playHistory();
    expect(count()).toBe("8/12");
    expect(screen.getByTestId("engine-title")).toHaveTextContent("History complete");
    cont("Move to the physical examination");
    expect(screen.getByTestId("engine-title")).toHaveTextContent("Physical Examination");
  });

  it("examination: all six domains are needed; findings are the documented values; teaching-only domains show a teaching point", () => {
    mount();
    playHistory();
    cont("Move to the physical examination");
    fireEvent.click(radio("Neural mobility (SLR, slump)"));
    fireEvent.click(screen.getByText("Perform this examination"));
    const f = within(screen.getByTestId("exam-findings"));
    expect(f.getByText("SLR right: 50°.")).toBeInTheDocument();
    expect(f.getByText("SLR left: 50°.")).toBeInTheDocument();
    expect(f.getByText(/Slump test: not evaluated\./)).toBeInTheDocument();
    expect(screen.getByTestId("takeaway")).toHaveTextContent(/proof of nerve-root compression/);
    fireEvent.click(screen.getByText("Back to the examinations"));
    expect(screen.queryByText("Continue to the imaging")).not.toBeInTheDocument();
    expect(screen.getByText("Perform this examination")).toBeDisabled(); // nothing chosen yet
  });

  it("imaging: X-ray / CT tabs with the documented captions, then the question", () => {
    mount();
    playHistory(); playExam();
    expect(screen.getByText("Mild bilateral L4–L5 facet degeneration.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "CT Scan" }));
    expect(screen.getByText("Minor disc bulges at L4–L5 and L5–S1, with no nerve-root involvement reported.")).toBeInTheDocument();
    expect(screen.getByText(/Schematic only/)).toBeInTheDocument();
  });

  it("the clinical impression page shows the record the student built; the model impression appears only after answering", () => {
    mount();
    playHistory(); playExam();
    answer(E.imaging.mcq); cont();
    const rec = within(screen.getByTestId("full-record"));
    expect(rec.getByText(/Onset: work-related injury\./)).toBeInTheDocument();
    expect(rec.getByText(/SLR right: 50°\./)).toBeInTheDocument();
    expect(screen.queryByTestId("impression")).not.toBeInTheDocument();
    answer(E.impression.mcq);
    expect(within(screen.getByTestId("impression")).getByText(/does not confirm a single structural pain generator/)).toBeInTheDocument();
  });

  it("management: Continue needs exactly three priorities; each is checked against the documented problems", () => {
    mount();
    playHistory(); playExam();
    answer(E.imaging.mcq); cont(); answer(E.impression.mcq); cont();
    answer(E.management.mcq);
    expect(screen.getByText("See my case report").closest("button")).toBeDisabled();
    const opts = E.management.plan.options;
    opts.slice(0, 3).forEach((p) => fireEvent.click(screen.getByText(p.label)));
    expect(screen.getByTestId("plan-count")).toHaveTextContent("3 of 3");
    expect(screen.getByText(opts[3].label).closest("button")).toBeDisabled();
    expect(screen.getByTestId("plan-feedback")).toHaveTextContent(/Documented:/);
    expect(screen.getByText("See my case report").closest("button")).not.toBeDisabled();
  });

  it("full journey: the report lists what was asked, discovered, still to ask, the reasoning and the plan; restart asks first", () => {
    const exit = vi.fn();
    mount(exit);
    playHistory((q) => (q.id === "q_easing" ? "A" : q.correct)); playExam(); playRest();
    expect(count()).toBe("12/12");
    expect(screen.getByTestId("completion")).toHaveTextContent("You have completed Lumbar Case 1. Review how your clinical reasoning developed from the initial complaint to the final management plan.");
    expect(within(screen.getByTestId("rep-asked")).getAllByRole("listitem").length).toBe(E.topics.length + 1);
    expect(within(screen.getByTestId("rep-record")).getByText(/Oswestry Disability Score: 72%/)).toBeInTheDocument();
    expect(within(screen.getByTestId("rep-safety")).getByText(/Infection or inflammatory features/)).toBeInTheDocument(); // not opened by the student
    expect(screen.getByTestId("final-score")).toHaveTextContent("11 of 12");
    expect(within(screen.getByTestId("rep-score")).getByText(new RegExp(esc(E.topics.find((t) => t.id === "easing").mcq.q)))).toBeInTheDocument();
    expect(within(screen.getByTestId("rep-plan")).getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(screen.getByLabelText("Show only the ones I got wrong"));
    expect(within(screen.getByTestId("final-review")).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByText("Restart Lumbar Case 1"));
    expect(screen.getByText(/Restarting clears all your answers/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Keep my answers"));
    expect(screen.getByTestId("completion")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Return to Lumbar Cases"));
    expect(exit).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Restart Lumbar Case 1"));
    fireEvent.click(screen.getByText("Yes, restart"));
    expect(count()).toBe("1/12");
    expect(screen.getAllByRole("radio")).toHaveLength(7);
  });

  it("progress is kept when the case is closed and opened again", () => {
    const { unmount } = mount();
    ask(E.topics[0].label); answer(E.topics[0].mcq); cont();
    unmount();
    mount();
    expect(count()).toBe("2/12");
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("the references panel opens with all three references", () => {
    mount();
    fireEvent.click(screen.getByLabelText("References"));
    const p = within(screen.getByTestId("references-panel"));
    expect(p.getByText(/NICE/)).toBeInTheDocument();
    expect(p.getByText(/World Health Organization/)).toBeInTheDocument();
    expect(p.getByText(/Supplied source case/)).toBeInTheDocument();
  });
});
