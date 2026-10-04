import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MedicalRecordsSection, fileToDoc, docTypeOf, isProtocolDoc, withDocType, DOC_TYPES, PROTOCOL_CATEGORY } from "../MedicalRecords.jsx";
import { buildOrthoPostOpAssessSteps } from "../OrthoPostOpAssessment.jsx";
import { buildOrthoAssessSteps } from "../OrthoOutpatientAssessment.jsx";

function Harness({ docs = [], onSave, initial = {} }) {
  const [data, setData] = useState(initial);
  return <MedicalRecordsSection data={data} setData={setData} patientData={{ uploaded_docs: docs }} onSave={onSave} />;
}

const pdf = (name = "report.pdf", size = 2000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });
const savedDoc = (over = {}) => ({ id: "d1", name: "mri.pdf", type: "application/pdf", icon: "📋", dataUrl: "data:application/pdf;base64,AA==", date: "1 Jan 2026", size: "1 KB", ...over });

describe("document types", () => {
  it("offers the expected types, including the surgeon's protocol", () => {
    expect(DOC_TYPES).toEqual(expect.arrayContaining(["Surgeon's protocol", "Scan / X-ray / MRI", "Lab report", "Discharge summary", "Referral letter", "Other"]));
  });
  it("reads the new docType and the legacy surgeon_protocol tag", () => {
    expect(docTypeOf({ docType: "Lab report" })).toBe("Lab report");
    expect(docTypeOf({ category: PROTOCOL_CATEGORY })).toBe("Surgeon's protocol");
    expect(isProtocolDoc({ category: PROTOCOL_CATEGORY })).toBe(true);
    expect(docTypeOf({})).toBe("");
  });
  it("withDocType sets the type and drops the legacy tag; empty clears it", () => {
    const legacy = { id: "x", category: PROTOCOL_CATEGORY };
    expect(withDocType(legacy, "Lab report")).toEqual({ id: "x", docType: "Lab report" });
    expect(withDocType({ id: "x", docType: "Lab report" }, "")).toEqual({ id: "x" });
  });
});

describe("fileToDoc", () => {
  it("builds a document record with the chosen type", async () => {
    const doc = await fileToDoc(pdf(), { docType: "Lab report", source: "assessment" });
    expect(doc).toMatchObject({ name: "report.pdf", type: "application/pdf", docType: "Lab report", source: "assessment", icon: "📋" });
    expect(doc.dataUrl.startsWith("data:application/pdf")).toBe(true);
  });
  it("leaves the type off when none is chosen", async () => {
    expect((await fileToDoc(pdf())).docType).toBeUndefined();
  });
  it("rejects files over 5MB", async () => {
    await expect(fileToDoc(pdf("big.pdf", 5 * 1024 * 1024 + 10))).rejects.toThrow(/5MB/);
  });
});

describe("MedicalRecordsSection", () => {
  it("is titled Medical Records", () => {
    render(<Harness onSave={vi.fn()} />);
    expect(screen.getAllByText("Medical Records").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Surgeon's Protocol/)).toBeNull();
  });

  it("uploads a chosen file with the selected type", async () => {
    const onSave = vi.fn();
    const { container } = render(<Harness onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Type for the next upload"), { target: { value: "Scan / X-ray / MRI" } });
    fireEvent.change(container.querySelector('input[type="file"]:not([capture])'), { target: { files: [pdf("knee-mri.pdf")] } });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [key, docs] = onSave.mock.calls[0];
    expect(key).toBe("uploaded_docs");
    expect(docs[0]).toMatchObject({ name: "knee-mri.pdf", docType: "Scan / X-ray / MRI", source: "assessment" });
  });

  it("offers a camera input for taking a photo", () => {
    const { container } = render(<Harness onSave={vi.fn()} />);
    const cam = container.querySelector('input[capture="environment"]');
    expect(cam).not.toBeNull();
    expect(cam.getAttribute("accept")).toBe("image/*");
  });

  it("lists every record on file (not just protocols) and keeps existing ones when adding", async () => {
    const onSave = vi.fn();
    const docs = [savedDoc(), savedDoc({ id: "d2", name: "protocol.pdf", docType: "Surgeon's protocol" })];
    const { container } = render(<Harness docs={docs} onSave={onSave} />);
    expect(screen.getByText("Records on file (2)")).toBeTruthy();
    expect(screen.getByText("mri.pdf")).toBeTruthy();
    expect(screen.getByText("protocol.pdf")).toBeTruthy();
    fireEvent.change(container.querySelector('input[type="file"]:not([capture])'), { target: { files: [pdf("new.pdf")] } });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][1]).toHaveLength(3);
  });

  it("changes the type of an existing record", () => {
    const onSave = vi.fn();
    render(<Harness docs={[savedDoc()]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Type of mri.pdf"), { target: { value: "Lab report" } });
    expect(onSave).toHaveBeenCalledWith("uploaded_docs", [expect.objectContaining({ id: "d1", docType: "Lab report" })]);
  });

  it("shows a legacy surgeon_protocol file with the right type selected", () => {
    render(<Harness docs={[savedDoc({ category: PROTOCOL_CATEGORY })]} onSave={vi.fn()} />);
    expect(screen.getByLabelText("Type of mri.pdf").value).toBe("Surgeon's protocol");
  });

  it("shows an error for an oversize file and does not save", async () => {
    const onSave = vi.fn();
    const { container } = render(<Harness onSave={onSave} />);
    fireEvent.change(container.querySelector('input[type="file"]:not([capture])'), { target: { files: [pdf("huge.pdf", 5 * 1024 * 1024 + 10)] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/5MB/));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("explains uploads need an open patient when there is no save handler", () => {
    render(<Harness />);
    expect(screen.getByText(/need an open patient record/i)).toBeTruthy();
  });
});

describe("Medical Records step exists in every assessment", () => {
  it("Post-op has it right after Surgical Review", () => {
    const ids = buildOrthoPostOpAssessSteps().map((s) => s.id);
    expect(ids).toContain("medicalRecords");
    expect(ids.indexOf("medicalRecords")).toBe(ids.indexOf("surgicalReview") + 1);
    expect(ids).not.toContain("surgeonProtocol");
  });
  it("Outpatient has it before Final Review", () => {
    const ids = buildOrthoAssessSteps().map((s) => s.id);
    expect(ids).toContain("medicalRecords");
    expect(ids.indexOf("medicalRecords")).toBe(ids.indexOf("review") - 1);
  });
});
