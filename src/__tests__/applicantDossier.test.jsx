// What a lister sees when someone applies: the CV and a snapshot of the applicant's profile.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ApplicantProfileSheet from "../physiofeed/components/opportunities/ApplicantProfileSheet.jsx";
import ApplicantPipeline from "../physiofeed/components/opportunities/ApplicantPipeline.jsx";

const applicant = {
  id: "1", name: "Priya Sharma", headline: "Physiotherapy Intern", location: "Indore", initials: "PS", gradient: "violet", verified: true,
  status: "new", appliedAgo: "2d", skills: ["Dry needling", "Taping"], note: "I would love to join your clinic.",
  resumeUrl: "https://example.com/priya-cv.pdf", resumeName: "Priya_CV.pdf",
  bio: "Final year BPT with a sports interest.",
  currentRole: { title: "Physiotherapy Intern", organization: "M.Y. hospital", range: "Apr 2026 – Present" },
  experienceList: [{ id: "e1", title: "Trainee", organization: "City Clinic", range: "Jan 2026 – Mar 2026" }],
  educationList: [{ id: "d1", title: "BPT", subtitle: "MGM Medical College", when: "Jul 2022" }],
  certificationList: [{ id: "c1", title: "Dry needling", issuer: "IAFM", when: "July 2025", credentialId: "DN-123" }],
  areaOfPractice: ["Sports"], clinicalInterests: ["Low back pain"],
};
const opp = { id: "o1", title: "Physiotherapist" };
const noop = () => {};

describe("lister's applicant profile sheet", () => {
  it("shows the CV button and the full profile snapshot", () => {
    render(<ApplicantProfileSheet applicant={applicant} opp={opp} onClose={noop} onPass={noop} onShortlist={noop} onMessage={noop} />);
    const cv = screen.getByRole("link", { name: /Open CV/ });
    expect(cv.getAttribute("href")).toBe("https://example.com/priya-cv.pdf");
    expect(cv.textContent).toMatch(/Priya_CV\.pdf/);
    for (const t of ["Final year BPT with a sports interest.", "M.Y. hospital", "Trainee", "City Clinic", "MGM Medical College", "IAFM", "Credential ID: DN-123", "Low back pain", "Dry needling"]) {
      expect(screen.getAllByText(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/I would love to join/)).toBeTruthy();
  });

  it("says plainly when there is no CV, and shows no empty phone/email lines", () => {
    render(<ApplicantProfileSheet applicant={{ ...applicant, resumeUrl: "" }} opp={opp} onClose={noop} onPass={noop} onShortlist={noop} onMessage={noop} />);
    expect(screen.getByText("No CV uploaded.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Open CV/ })).toBeNull();
  });
});

describe("applicant list", () => {
  it("shows the current role and that a CV is attached", () => {
    render(<ApplicantPipeline opp={opp} applicants={[applicant]} onBack={noop} onOpenApplicant={noop} onPass={noop} onShortlist={noop} onChat={noop} />);
    expect(screen.getByText(/Now: Physiotherapy Intern · M.Y. hospital/)).toBeTruthy();
    expect(screen.getByText(/CV attached/)).toBeTruthy();
  });
});
