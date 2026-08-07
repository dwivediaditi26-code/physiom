// Automated accessibility coverage (part of the item-5 testing pass:
// E2E/adversarial/accessibility gaps -- this app had zero a11y-specific
// tests before this file). Uses jest-axe (axe-core under the hood) against
// jsdom-rendered output of the two screens a clinician spends the most time
// in: the Subjective Assessment form and the AI Assistant chat.
//
// jsdom can't compute real visual layout/paint, so axe automatically skips
// rules that need it (color-contrast chief among them) -- this catches the
// DOM-structural class of issues instead: missing form labels, missing
// button/input accessible names, invalid ARIA usage, duplicate ids, etc.
// That's a real, useful subset, not full WCAG coverage -- a genuine visual
// contrast/keyboard-trap/focus-order audit still needs a real browser (see
// the e2e/ Playwright suite's own limitations noted in HANDOFF.md).
import React from "react";
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";
import AIAssistant from "../AIAssistant.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

describe("Accessibility — Subjective Assessment form", () => {
  test("no axe violations with no region selected (empty/initial state)", async () => {
    const { container } = render(
      <SubjectiveModule data={{}} set={() => {}} onNav={() => {}} onTabChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("no axe violations with a region selected and its fields rendered (Cervical)", async () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    const { container, getByTestId } = render(
      <SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />
    );
    getByTestId("subj-group-tab-Cervical (R)").click();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("Accessibility — AI Assistant chat", () => {
  test("no axe violations on initial render (no patient loaded)", async () => {
    const { container } = render(<AIAssistant data={{}} onClose={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("no axe violations with a patient loaded and set() available", async () => {
    const { container } = render(
      <AIAssistant data={{ dem_name: "Test Patient", cc_main: "Left shoulder pain" }} set={() => {}} onClose={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
