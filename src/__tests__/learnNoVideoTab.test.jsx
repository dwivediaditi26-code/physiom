// learnNoVideoTab.test.jsx -- 2026-10-10, Aditi: "wherever there is video showing ... like in ROM in
// the learn section, in MMT or anything. Remove that video section." Every Learn detail page used to
// have a Learn / Technique / Video / Quiz tab bar whose Video tab only said "Video coming soon".
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TabbedDetail from "../physiofeed/learn/TabbedDetail.jsx";

const LEARN_DIR = path.resolve(__dirname, "../physiofeed/learn");

describe("Learn detail pages have no Video tab", () => {
  it("the shared detail screen offers Learn, Technique and Quiz only", () => {
    render(<TabbedDetail badge="Test" title="Biceps reflex" learn={<p>learn body</p>} technique={<p>technique body</p>} onBack={() => {}} />);
    const names = screen.getAllByRole("button").map((b) => b.textContent.trim());
    expect(names).toEqual(expect.arrayContaining(["Learn", "Technique", "Quiz"]));
    expect(names).not.toContain("Video");
    expect(screen.queryByText(/Video coming soon/i)).toBeNull();
  });

  it("the three tabs still switch content", () => {
    render(<TabbedDetail badge="Test" title="Biceps reflex" learn={<p>learn body</p>} technique={<p>technique body</p>} onBack={() => {}} />);
    expect(screen.getByText("learn body")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Technique" }));
    expect(screen.getByText("technique body")).toBeTruthy();
  });

  it("no Learn screen still builds a Video tab or the placeholder", () => {
    const files = fs.readdirSync(LEARN_DIR).filter((f) => /\.jsx?$/.test(f));
    const offenders = files.filter((f) => /VideoTab|Video coming soon|tab === "Video"|videoName/.test(fs.readFileSync(path.join(LEARN_DIR, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
