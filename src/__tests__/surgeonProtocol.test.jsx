import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SurgeonProtocolSection, fileToDoc, isProtocolDoc, PROTOCOL_CATEGORY } from "../SurgeonProtocol.jsx";
import { buildOrthoPostOpAssessSteps } from "../OrthoPostOpAssessment.jsx";

function Harness({ docs = [], onSave }) {
  const [data, setData] = useState({});
  return <SurgeonProtocolSection data={data} setData={setData} patientData={{ uploaded_docs: docs }} onSave={onSave} />;
}

const pdf = (name = "protocol.pdf", size = 2000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

describe("fileToDoc", () => {
  it("builds a Medical-Records-shaped document tagged as the surgeon's protocol", async () => {
    const doc = await fileToDoc(pdf(), { category: PROTOCOL_CATEGORY, source: "assessment" });
    expect(doc).toMatchObject({ name: "protocol.pdf", type: "application/pdf", category: PROTOCOL_CATEGORY, source: "assessment", icon: "📋" });
    expect(doc.dataUrl.startsWith("data:application/pdf")).toBe(true);
    expect(isProtocolDoc(doc)).toBe(true);
  });
  it("rejects files over 5MB", async () => {
    await expect(fileToDoc(pdf("big.pdf", 5 * 1024 * 1024 + 10))).rejects.toThrow(/5MB/);
  });
  it("untagged uploads are not protocol docs", async () => {
    expect(isProtocolDoc(await fileToDoc(pdf()))).toBe(false);
  });
});

describe("SurgeonProtocolSection", () => {
  it("uploads a chosen file into uploaded_docs with the protocol tag", async () => {
    const onSave = vi.fn();
    const { container } = render(<Harness onSave={onSave} />);
    const input = container.querySelector('input[type="file"]:not([capture])');
    fireEvent.change(input, { target: { files: [pdf("discharge.pdf")] } });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [key, docs] = onSave.mock.calls[0];
    expect(key).toBe("uploaded_docs");
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ name: "discharge.pdf", category: PROTOCOL_CATEGORY, source: "assessment" });
  });

  it("offers a camera input for taking a photo", () => {
    const { container } = render(<Harness onSave={vi.fn()} />);
    const cam = container.querySelector('input[capture="environment"]');
    expect(cam).not.toBeNull();
    expect(cam.getAttribute("accept")).toBe("image/*");
  });

  it("keeps existing Medical Records files and lets one be used as the protocol", async () => {
    const onSave = vi.fn();
    const docs = [{ id: "a1", name: "xray.pdf", type: "application/pdf", icon: "📋", dataUrl: "data:application/pdf;base64,AA==", date: "1 Jan 2026", size: "1 KB" }];
    render(<Harness docs={docs} onSave={onSave} />);
    fireEvent.click(screen.getByText("Use as protocol"));
    expect(onSave).toHaveBeenCalledWith("uploaded_docs", [expect.objectContaining({ id: "a1", category: PROTOCOL_CATEGORY })]);
  });

  it("lists protocol files and can unmark one without deleting it", () => {
    const onSave = vi.fn();
    const docs = [{ id: "p1", name: "protocol.pdf", type: "application/pdf", icon: "📋", dataUrl: "data:application/pdf;base64,AA==", date: "1 Jan 2026", size: "1 KB", category: PROTOCOL_CATEGORY }];
    render(<Harness docs={docs} onSave={onSave} />);
    expect(screen.getByText("Attached protocol files (1)")).toBeTruthy();
    fireEvent.click(screen.getByText("Unmark"));
    const saved = onSave.mock.calls[0][1];
    expect(saved).toHaveLength(1);
    expect(saved[0].category).toBeUndefined();
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

describe("wizard step", () => {
  it("Surgeon's Protocol is its own step in the Post-op assessment", () => {
    const ids = buildOrthoPostOpAssessSteps().map((s) => s.id);
    expect(ids).toContain("surgeonProtocol");
    expect(ids.indexOf("surgeonProtocol")).toBe(ids.indexOf("surgicalReview") + 1);
  });
});
