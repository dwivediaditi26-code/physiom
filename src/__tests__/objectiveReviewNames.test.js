// objectiveReviewNames.test.js -- 2026-10-11, Aditi's "Review So Far" screenshot of the AI assessment: ROM rows read
// "ROM — ext" / "ROM — latl", MMT rows "mmt — mmt_scm_left", and a Functional Screen row "obs_time". Those are internal ids;
// the review should print the movement / muscle / question names the clinician saw on screen.
import { describe, it, expect } from "vitest";
import { formatConditionObjectiveSection } from "../ConditionObjectiveAssessment.jsx";

const rowsFor = (data) => formatConditionObjectiveSection(data).groups.flatMap((g) => g.rows);

describe("AI Objective rows in Review", () => {
  it("shows ROM movement names, not ids", () => {
    const rows = rowsFor({ conditionAssessment_cervical: { "C01::rom::ext": "70", "C01::rom::latl": "33", "C01::rom::rotr": "72" } });
    expect(rows.map((r) => r.label)).toEqual(["ROM — Extension", "ROM — Side Flex Left", "ROM — Rotation Right"]);
    expect(rows.map((r) => r.value)).toEqual(["70", "33", "72"]);
  });

  it("shows MMT muscle names with the side, not mmt_<id>_<side>", () => {
    const rows = rowsFor({ conditionAssessment_cervical: { "C01::mmt::mmt_scm_left": "2+", "C01::mmt::mmt_scm_right": "2+" } });
    expect(rows.map((r) => r.label)).toEqual(["MMT — Sternocleidomastoid (Left)", "MMT — Sternocleidomastoid (Right)"]);
  });

  it("shows left and right on a two-sided joint's ROM", () => {
    const rows = rowsFor({ conditionAssessment_shoulder: { "S01::rom::flex_left": "150", "S01::rom::flex_right": "170" } });
    expect(rows.map((r) => r.label)).toEqual(["ROM — Flexion (Left)", "ROM — Flexion (Right)"]);
  });

  it("never prints a raw mmt_ or obs_ id", () => {
    const rows = rowsFor({ conditionAssessment_cervical: { "C01::rom::ext": "70", "C01::mmt::mmt_dnf_left": "2", "C01::mmt::mmt_trap_u_right": "4+" } });
    rows.forEach((r) => expect(r.label).not.toMatch(/mmt_|^mmt|obs_/));
  });

  it("shows the Functional Screen question behind an obs_ answer", () => {
    const rows = rowsFor({ conditionAssessment_cervical: { "C01::functionalScreen::obs_time": "20–37 seconds (mild deficit)" } });
    expect(rows.map((r) => r.label)).toEqual(["Functional Screen — Chin tuck hold duration?"]);
  });
});
