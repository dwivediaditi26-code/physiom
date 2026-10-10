// lumbarCase1.test.jsx
// Lumbar Case 1: the nine-screen case played by CaseEngine. Content checks read
// the case data (lumbarCase1.js); interaction checks play the real screens.
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";

vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));
import { trackEvent } from "../analytics/trackEvent.js";
import CaseEngine from "../physiofeed/learn/CaseEngine.jsx";
import { LUMBAR_CASE_1 } from "../physiofeed/learn/lumbarCase1.js";

const C = LUMBAR_CASE_1;
const SCREENS = C.screens;
const ALL_Q = SCREENS.flatMap((s) => s.mcqs);
const JSON_TEXT = JSON.stringify(C);

beforeEach(() => { localStorage.clear(); trackEvent.mockClear(); });
afterEach(cleanup);

function mount(onExit = () => {}) { return render(<CaseEngine data={C} onExit={onExit}/>); }
function answerQ(q, id) {
  const box = within(screen.getByTestId(`mcq-${q.id}`));
  fireEvent.click(box.getByText(q.options.find((o) => o.id === id).text));
  fireEvent.click(box.getByText("Submit Answer"));
}
function finishScreen(n, pick = (q) => q.correct) {
  const s = SCREENS[n];
  if (s.needs === "examPicker") fireEvent.click(screen.getByText("General observation and gait"));
  s.mcqs.forEach((q) => answerQ(q, pick(q)));
  if (s.needs === "planBuilder") ["Patient education and shared understanding", "Graded walking and activity tolerance", "Individualised exercise"].forEach((t) => fireEvent.click(screen.getByText(t)));
}
function goNext(n) { fireEvent.click(screen.getByText(SCREENS[n].nextLabel)); }
function playTo(last, pick) { for (let n = 0; n < last; n++) { finishScreen(n, pick); goNext(n); } }

describe("Lumbar Case 1 — content (source case accuracy)", () => {
  it("has nine screens and the right title", () => {
    expect(SCREENS).toHaveLength(9);
    expect(C.title).toBe("Lumbar Case 1");
    expect(C.crumbs.join(">")).toBe("Clinical Learning>Musculoskeletal>Lumbar Spine>Lumbar Cases");
  });
  it("every MCQ has 4 options, one correct answer, and a reason for every option", () => {
    const ids = new Set();
    for (const q of ALL_Q) {
      expect(ids.has(q.id)).toBe(false); ids.add(q.id);
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.id === q.correct)).toHaveLength(1);
      for (const o of q.options) expect(o.why.length).toBeGreaterThan(10);
      expect(q.options.find((o) => o.id === q.correct).why.startsWith("Correct")).toBe(true);
    }
    expect(ALL_Q.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4", "q5", "q6a", "q6b", "q7", "q8", "q9"]);
  });
  it("keeps the documented values unchanged", () => {
    for (const t of ["49 years", "14 months", "six months", "both gluteal regions", "SLR right: 50°", "SLR left: 50°", "approximately 2 cm above the knee",
      "approximately 40° to each side", "Oswestry Disability Score 72%", "VAS pain 7.5 after 15 minutes of standing or sitting", "Mild bilateral L4–L5 facet degeneration",
      "Minor disc bulges at L4–L5 and L5–S1", "cholecystectomy six years ago", "6 kg", "antidepressants for three months"]) expect(JSON_TEXT).toContain(t);
  });
  it("marks the slump test as not evaluated and still to check", () => {
    const s5 = SCREENS[4].reveal.find((b) => b.type === "groups");
    const slump = s5.groups.flatMap((g) => g.items).find((i) => /Slump/.test(i.text));
    expect(slump.text).toBe("Slump test: not evaluated.");
    expect(slump.tag).toBe("STILL TO CHECK");
  });
  it("does not invent red-flag answers: the safety prompts are all questions, none claimed negative", () => {
    const safety = SCREENS[2].blocks.find((b) => b.type === "safety");
    for (const g of safety.groups) for (const q of g.items) expect(q.endsWith("?")).toBe(true);
    expect(JSON_TEXT).not.toMatch(/red flags? (were |have been )?(excluded|ruled out|negative|clear)/i);
    expect(JSON_TEXT).not.toMatch(/no red flags/i);
  });
  it("does not confirm radiculopathy, a disc herniation or a facet source", () => {
    expect(JSON_TEXT).not.toMatch(/confirmed (L5 )?radiculopathy(?! due)/i);
    expect(JSON_TEXT).toContain("does not confirm a single structural pain generator");
  });
  it("lists the three clinical references and no invented textbook details", () => {
    expect(C.references).toHaveLength(3);
    expect(C.references[0].url).toBe("https://www.nice.org.uk/guidance/ng59/chapter/recommendations");
    expect(C.references[1].url).toBe("https://www.who.int/publications/b/71563");
    expect(C.references[1].url2).toBe("https://www.ncbi.nlm.nih.gov/books/NBK599213/");
    expect(C.references[2].points.join(" ")).toMatch(/have not been supplied/);
  });
});

describe("Lumbar Case 1 — playing it", () => {
  it("opens on screen 1 with the patient quote, hides the answers, and needs a choice before Submit", () => {
    mount();
    expect(screen.getByTestId("engine-count")).toHaveTextContent("Screen 1 of 9");
    expect(screen.getByTestId("engine-title")).toHaveTextContent("Lumbar Case 1: Meet Your Patient");
    expect(screen.getByTestId("engine-quote")).toHaveTextContent("installing car upholstery");
    expect(screen.getByText("Submit Answer")).toBeDisabled();
    expect(screen.queryByText(/^Correct\./)).not.toBeInTheDocument();
    expect(screen.queryByTestId("why-q1-B")).not.toBeInTheDocument();
    expect(screen.getByText("Start Subjective Assessment").closest("button")).toBeDisabled();
  });

  it("selecting an option does not reveal the answer; Submit reveals a reason for every option and the takeaway", () => {
    mount();
    const q = SCREENS[0].mcqs[0];
    fireEvent.click(screen.getByText(q.options[0].text));
    expect(screen.queryByTestId("why-q1-A")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Submit Answer"));
    for (const o of q.options) expect(screen.getByTestId(`why-q1-${o.id}`)).toHaveTextContent(o.why.slice(0, 20));
    expect(screen.getByText(/Not quite — the right answer is B/)).toBeInTheDocument();
    expect(screen.getByTestId("takeaway")).toHaveTextContent(SCREENS[0].takeaway);
    expect(screen.getByText("Start Subjective Assessment").closest("button")).not.toBeDisabled();
  });

  it("cannot be submitted twice, and records one attempt with the existing analytics call", async () => {
    mount();
    const q = SCREENS[0].mcqs[0];
    answerQ(q, "B");
    expect(screen.queryByText("Submit Answer")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("pm_case_lumbar-case-1_v1")).answers.q1.attempts).toBe(1);
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith("case_mcq_submitted", expect.objectContaining({ entityType: "case", entityId: "lumbar-case-1", properties: expect.objectContaining({ question: "q1", selected: "B", correct: true, attempt: 1 }) })));
    expect(trackEvent.mock.calls.filter((c) => c[0] === "case_mcq_submitted")).toHaveLength(1);
  });

  it("Back keeps answers; going Back and Continue does not reset the case", () => {
    mount();
    finishScreen(0); goNext(0);
    expect(screen.getByTestId("engine-count")).toHaveTextContent("Screen 2 of 9");
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("engine-count")).toHaveTextContent("Screen 1 of 9");
    expect(screen.getByTestId("why-q1-B")).toBeInTheDocument();
    expect(screen.queryByText("Submit Answer")).not.toBeInTheDocument();
  });

  it("screen 2 shows the documented history sections, expandable", () => {
    mount();
    playTo(1);
    expect(screen.getByText("Structured history (tap a section)")).toBeInTheDocument();
    expect(screen.getByText("Onset and duration")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Symptom location and distribution"));
    expect(screen.getByText("Leg pain: none reported.")).toBeInTheDocument();
    expect(screen.getAllByText(/Approximately 15 minutes/).length).toBeGreaterThan(0);
  });

  it("screen 3: safety prompts are questions; the escalation warning appears only after answering", () => {
    mount();
    playTo(2);
    expect(screen.getByText(/does not list the patient's answers/)).toBeInTheDocument();
    expect(screen.queryByText(/Escalation required if present/)).not.toBeInTheDocument();
    answerQ(SCREENS[2].mcqs[0], "A"); // wrong choice
    expect(screen.getByText(/Escalation required if present/)).toBeInTheDocument();
    expect(screen.getByTestId("why-q3-C")).toHaveTextContent(/cauda equina/);
  });

  it("screen 5: needs an examination chosen first; findings stay hidden until submitted, then show the documented values", () => {
    mount();
    playTo(4);
    expect(screen.queryByText("SLR right: 50°.")).not.toBeInTheDocument();
    const q = SCREENS[4].mcqs[0];
    const box = within(screen.getByTestId("mcq-q5"));
    fireEvent.click(box.getByText(q.options[1].text));
    expect(box.getByText("Submit Answer")).toBeDisabled();
    fireEvent.click(screen.getByText("Lumbar active range of motion"));
    fireEvent.click(box.getByText("Submit Answer"));
    expect(screen.getByText("SLR right: 50°.")).toBeInTheDocument();
    expect(screen.getByText("SLR left: 50°.")).toBeInTheDocument();
    expect(screen.getByText("Slump test: not evaluated.")).toBeInTheDocument();
    expect(screen.getByText("No neurological abnormality detected in the supplied case.")).toBeInTheDocument();
    expect(screen.getByText(/do not establish nerve-root compression/)).toBeInTheDocument();
  });

  it("screen 6 has two questions and needs both before Continue; imaging text is exact", () => {
    mount();
    playTo(5);
    expect(screen.getByText("Mild bilateral L4–L5 facet degeneration.")).toBeInTheDocument();
    expect(screen.getByText("Minor disc bulges at L4–L5 and L5–S1, with no nerve-root involvement reported.")).toBeInTheDocument();
    answerQ(SCREENS[5].mcqs[0], "C");
    expect(screen.getByText(SCREENS[5].nextLabel).closest("button")).toBeDisabled();
    answerQ(SCREENS[5].mcqs[1], "B");
    expect(screen.getByText(SCREENS[5].nextLabel).closest("button")).not.toBeDisabled();
  });

  it("screen 7 shows the model impression only after submission", () => {
    mount();
    playTo(6);
    expect(screen.queryByTestId("impression")).not.toBeInTheDocument();
    answerQ(SCREENS[6].mcqs[0], "B");
    expect(screen.getByTestId("impression")).toHaveTextContent(/does not establish a single structural pain generator|do not establish a single structural pain generator/);
  });

  it("screen 8: plan builder needs exactly three priorities before Continue", () => {
    mount();
    playTo(7);
    answerQ(SCREENS[7].mcqs[0], "C");
    expect(screen.getByTestId("plan-count")).toHaveTextContent("0 of 3");
    expect(screen.getByText(SCREENS[7].nextLabel).closest("button")).toBeDisabled();
    for (const t of ["Patient education and shared understanding", "Graded walking and activity tolerance", "Psychological support when appropriate"]) fireEvent.click(screen.getByText(t));
    expect(screen.getByTestId("plan-count")).toHaveTextContent("3 of 3");
    expect(screen.getByText("Individualised exercise").closest("button")).toBeDisabled();
    expect(screen.getByTestId("plan-feedback")).toHaveTextContent(/antidepressants for three months/);
    expect(screen.getByText(SCREENS[7].nextLabel).closest("button")).not.toBeDisabled();
  });

  it("full journey: screen 9 shows the report, review of answers, restart (with confirm) and return", () => {
    const exit = vi.fn();
    mount(exit);
    playTo(8);
    expect(screen.getByTestId("engine-count")).toHaveTextContent("Screen 9 of 9");
    expect(screen.getByTestId("case-report")).toHaveTextContent("Oswestry Disability Score 72%");
    answerQ(SCREENS[8].mcqs[0], "A"); // wrong on purpose
    expect(screen.getByTestId("final-review")).toBeInTheDocument();
    expect(screen.getByTestId("final-score")).toHaveTextContent("9 of 10");
    fireEvent.click(screen.getByLabelText("Show only the ones I got wrong"));
    expect(within(screen.getByTestId("final-review")).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByText("Restart Lumbar Case 1"));
    expect(screen.getByText(/Restarting clears all your answers/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Keep my answers"));
    expect(screen.getByTestId("final-review")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Return to Lumbar Cases"));
    expect(exit).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Restart Lumbar Case 1"));
    fireEvent.click(screen.getByText("Yes, restart"));
    expect(screen.getByTestId("engine-count")).toHaveTextContent("Screen 1 of 9");
    expect(screen.queryByTestId("why-q1-B")).not.toBeInTheDocument();
  });

  it("progress is kept when the case is closed and opened again", () => {
    const { unmount } = mount();
    finishScreen(0); goNext(0);
    unmount();
    mount();
    expect(screen.getByTestId("engine-count")).toHaveTextContent("Screen 2 of 9");
  });

  it("the references panel opens with all three references", () => {
    mount();
    fireEvent.click(screen.getByText("References"));
    const p = within(screen.getByTestId("references-panel"));
    expect(p.getByText(/NICE/)).toBeInTheDocument();
    expect(p.getByText(/World Health Organization/)).toBeInTheDocument();
    expect(p.getByText(/Supplied source case/)).toBeInTheDocument();
  });
});
