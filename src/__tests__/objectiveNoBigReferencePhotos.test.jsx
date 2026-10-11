// objectiveNoBigReferencePhotos.test.jsx -- 2026-10-10, Aditi (screenshot of the AI Objective
// Assessment, Kinetic chain tab): "remove this big image from kinetic n functional". The large
// "Reference photos" gallery under each Kinetic Chain and Functional Screen card is gone from the
// AI Objective Assessment page, for everyone including admins. (The standalone Kinetic Chain and
// Functional screens keep their own, smaller gallery.)
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../useIsAdmin.js", () => ({ useIsAdmin: () => true }));

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");

function openTopic(label) {
  const tab = [...document.querySelectorAll(".obj-subtopic-tab")].find((b) => b.textContent.startsWith(label));
  fireEvent.click(tab);
}

function Harness() {
  const [data, setDataRaw] = React.useState({});
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  return <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />;
}

describe("AI Objective Assessment has no big reference photo", () => {
  it("Kinetic chain tab shows its card but no Reference photos gallery, even for an admin", () => {
    render(<Harness />);
    openTopic("Kinetic chain");
    expect(screen.getAllByText("Kinetic Chain").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Reference photos/i)).toBeNull();
    expect(screen.queryByTestId("photo-slots-frame")).toBeNull();
  });

  it("Functional tab shows its card but no Reference photos gallery, even for an admin", () => {
    render(<Harness />);
    openTopic("Functional");
    expect(screen.getAllByText("Functional Screen").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Reference photos/i)).toBeNull();
    expect(screen.queryByTestId("photo-slots-frame")).toBeNull();
  });

  // 2026-10-10, Aditi (circled the small pose icon beside the title): "remove this circle svg".
  it("Kinetic chain and Functional titles have no little pose icon beside them", () => {
    render(<Harness />);
    for (const topic of ["Kinetic chain", "Functional"]) {
      openTopic(topic);
      const rows = document.querySelectorAll(".movement-name-row");
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => expect(row.querySelector('svg[viewBox="0 0 48 48"]')).toBeNull());
    }
  });
});
