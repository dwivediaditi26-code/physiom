// patientFiles.test.jsx
// Attached files (scans, lab reports ...) now go to a private storage bucket and the patient record keeps
// only a reference. The one rule that matters most: the file is never dropped from the record unless it
// was found in storage with the right size. Supabase is mocked (never remove this).
import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  session: { user: { id: "user-1" } },
  lastUploadSize: 0,
  upload: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(() => Promise.resolve({ error: null })),
  createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: "https://files.example/signed?t=1" }, error: null })),
  download: vi.fn(),
}));
vi.mock("../supabase.js", () => ({
  supabase: {
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: h.session } })) },
    storage: { from: vi.fn(() => ({ upload: h.upload, list: h.list, remove: h.remove, createSignedUrl: h.createSignedUrl, download: h.download })) },
  },
  authHeader: vi.fn().mockResolvedValue({}),
}));

import { moveDocToCloud, useMoveDocsToCloud, getDocViewUrl, removeDocFile, getDocBlobUrl, dataUrlToBlob, isCloudDoc, FILES_BUCKET } from "../patientFiles.js";
import { MedicalRecordsSection, attachFile } from "../MedicalRecords.jsx";

const B64 = btoa("hello pdf");            // 9 bytes
const inline = (over = {}) => ({ id: "d1", name: "MRI scan (1).pdf", type: "application/pdf", icon: "📋", size: "1 KB", date: "1 Jan 2026", dataUrl: `data:application/pdf;base64,${B64}`, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  h.session = { user: { id: "user-1" } };
  h.upload.mockImplementation((path, blob) => { h.lastUploadSize = blob.size; return Promise.resolve({ error: null }); });
  h.list.mockImplementation((folder, opts) => Promise.resolve({ data: [{ name: opts.search, metadata: { size: h.lastUploadSize } }], error: null }));
});

describe("moveDocToCloud", () => {
  it("uploads to the user's own folder, checks the stored size, then drops the inline copy", async () => {
    const { doc, moved } = await moveDocToCloud(inline());
    expect(moved).toBe(true);
    expect(h.upload).toHaveBeenCalledTimes(1);
    const [path, blob, opts] = h.upload.mock.calls[0];
    expect(path).toBe("user-1/d1-MRI_scan_1_.pdf");
    expect(blob.size).toBe(9);
    expect(opts.contentType).toBe("application/pdf");
    expect(doc.storagePath).toBe(path);
    expect(doc.dataUrl).toBeUndefined();
    expect(doc).toMatchObject({ id: "d1", name: "MRI scan (1).pdf", type: "application/pdf", date: "1 Jan 2026" });
    expect(isCloudDoc(doc)).toBe(true);
  });

  it("keeps the file inside the record when the upload fails (bucket not set up, offline ...)", async () => {
    h.upload.mockResolvedValueOnce({ error: { message: "Bucket not found" } });
    const original = inline();
    const { doc, moved, reason } = await moveDocToCloud(original);
    expect(moved).toBe(false);
    expect(reason).toMatch(/bucket not found/i);
    expect(doc).toBe(original);
    expect(doc.dataUrl).toBeTruthy();
  });

  it("keeps the file inside the record when the stored size is not what was sent", async () => {
    h.list.mockResolvedValueOnce({ data: [{ name: "d1-MRI_scan_1_.pdf", metadata: { size: 3 } }], error: null });
    const { doc, moved, reason } = await moveDocToCloud(inline());
    expect(moved).toBe(false);
    expect(reason).toBe("not_confirmed");
    expect(doc.dataUrl).toBeTruthy();
  });

  it("keeps the file inside the record when the file cannot be found in storage afterwards", async () => {
    h.list.mockResolvedValueOnce({ data: [], error: null });
    expect((await moveDocToCloud(inline())).moved).toBe(false);
    h.list.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect((await moveDocToCloud(inline())).moved).toBe(false);
  });

  it("does nothing when signed out (guest) -- the file stays inside the record", async () => {
    h.session = null;
    const original = inline();
    const r = await moveDocToCloud(original);
    expect(r).toMatchObject({ moved: false, reason: "signed_out" });
    expect(r.doc).toBe(original);
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("does nothing for a file that is already in the cloud, or has no file", async () => {
    const cloud = { id: "d2", name: "x.pdf", storagePath: "user-1/d2-x.pdf" };
    expect((await moveDocToCloud(cloud)).moved).toBe(false);
    expect((await moveDocToCloud({ id: "d3", name: "empty" })).moved).toBe(false);
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("a thrown error never loses the file", async () => {
    h.upload.mockImplementationOnce(() => { throw new Error("network exploded"); });
    const original = inline();
    const r = await moveDocToCloud(original);
    expect(r.moved).toBe(false);
    expect(r.doc).toBe(original);
  });
});

describe("reading a file back", () => {
  it("an inline file shows itself; a cloud file gets a short-lived link that is reused", async () => {
    expect(await getDocViewUrl(inline())).toMatch(/^data:/);
    const cloud = { id: "c1", storagePath: "user-1/c1-a.png" };
    const first = await getDocViewUrl(cloud);
    const second = await getDocViewUrl(cloud);
    expect(first).toBe("https://files.example/signed?t=1");
    expect(second).toBe(first);
    expect(h.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(h.createSignedUrl).toHaveBeenCalledWith("user-1/c1-a.png", expect.any(Number));
  });

  it("opens a cloud file from the bytes the signed-in user is allowed to download", async () => {
    URL.createObjectURL = vi.fn(() => "blob:made");
    h.download.mockResolvedValueOnce({ data: new Blob(["x"], { type: "application/pdf" }), error: null });
    expect(await getDocBlobUrl({ id: "c2", storagePath: "user-1/c2-a.pdf" })).toBe("blob:made");
    h.download.mockResolvedValueOnce({ data: null, error: { message: "gone" } });
    expect(await getDocBlobUrl({ id: "c3", storagePath: "user-1/c3-a.pdf" })).toBeNull();
  });

  it("converts a data URL back into the same bytes", async () => {
    const blob = dataUrlToBlob(`data:application/pdf;base64,${B64}`);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(9);
  });

  it("deleting a cloud file removes it from storage; an inline file touches nothing", async () => {
    await removeDocFile({ id: "c4", storagePath: "user-1/c4-a.pdf" });
    expect(h.remove).toHaveBeenCalledWith(["user-1/c4-a.pdf"]);
    h.remove.mockClear();
    await removeDocFile(inline());
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("uses the private bucket", () => {
    expect(FILES_BUCKET).toBe("patient-files");
  });
});

describe("Medical Records step", () => {
  const pdf = (name = "report.pdf") => new File([new Uint8Array(2000)], name, { type: "application/pdf" });
  function Harness({ docs = [], onSave }) {
    const [data, setData] = useState({});
    return <MedicalRecordsSection data={data} setData={setData} patientData={{ uploaded_docs: docs }} onSave={onSave} />;
  }

  it("signed in: the saved record holds a reference, not the file", async () => {
    const onSave = vi.fn();
    const { container } = render(<Harness onSave={onSave} />);
    fireEvent.change(container.querySelector('input[type="file"]:not([capture])'), { target: { files: [pdf("knee.pdf")] } });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [key, docs] = onSave.mock.calls[0];
    expect(key).toBe("uploaded_docs");
    expect(docs[0].storagePath).toMatch(/^user-1\//);
    expect(docs[0].dataUrl).toBeUndefined();
    expect(docs[0]).toMatchObject({ name: "knee.pdf", source: "assessment" });
  });

  it("storage unavailable: the file still saves inside the record, and the clinician is told", async () => {
    h.upload.mockResolvedValue({ error: { message: "Bucket not found" } });
    const onSave = vi.fn();
    const { container } = render(<Harness onSave={onSave} />);
    fireEvent.change(container.querySelector('input[type="file"]:not([capture])'), { target: { files: [pdf()] } });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][1][0].dataUrl).toMatch(/^data:/);
    expect(screen.getByRole("status").textContent).toMatch(/cloud storage/i);
  });

  it("signed out: stays inside the record with no warning", async () => {
    h.session = null;
    const onSave = vi.fn();
    const { container } = render(<Harness onSave={onSave} />);
    fireEvent.change(container.querySelector('input[type="file"]:not([capture])'), { target: { files: [pdf()] } });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][1][0].dataUrl).toMatch(/^data:/);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("deleting a record removes its stored file too", async () => {
    const onSave = vi.fn();
    window.confirm = vi.fn(() => true);
    render(<Harness docs={[{ id: "c9", name: "old.pdf", type: "application/pdf", icon: "📋", date: "1 Jan 2026", size: "1 KB", storagePath: "user-1/c9-old.pdf" }]} onSave={onSave} />);
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onSave).toHaveBeenCalledWith("uploaded_docs", []);
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith(["user-1/c9-old.pdf"]));
  });

  it("attachFile resolves the same document shape fileToDoc makes", async () => {
    const { doc, moved } = await attachFile(pdf("a.pdf"), { docType: "Lab report", source: "medical_records" });
    expect(moved).toBe(true);
    expect(doc).toMatchObject({ name: "a.pdf", docType: "Lab report", source: "medical_records" });
  });
});

describe("older files move to the cloud while the records are open", () => {
  function Mover({ initial, onSave }) {
    const [docs, setDocs] = useState(initial);
    useMoveDocsToCloud(docs, (next) => { setDocs(next); onSave(next); });
    return <div data-testid="state">{JSON.stringify(docs.map((d) => ({ id: d.id, inline: Boolean(d.dataUrl), cloud: d.storagePath || null, docType: d.docType || null })))}</div>;
  }
  const state = () => JSON.parse(screen.getByTestId("state").textContent);

  it("moves every inline file, keeps the rest of each record, and saves once", async () => {
    const onSave = vi.fn();
    render(<Mover initial={[inline({ id: "a", docType: "Lab report" }), inline({ id: "b", name: "two.pdf" }), { id: "c", name: "c.pdf", storagePath: "user-1/c-c.pdf" }]} onSave={onSave} />);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(state()).toEqual([
      { id: "a", inline: false, cloud: "user-1/a-MRI_scan_1_.pdf", docType: "Lab report" },
      { id: "b", inline: false, cloud: "user-1/b-two.pdf", docType: null },
      { id: "c", inline: false, cloud: "user-1/c-c.pdf", docType: null },
    ]);
  });

  it("leaves a file alone when it cannot be moved, and does not retry in a loop", async () => {
    h.upload.mockResolvedValue({ error: { message: "offline" } });
    const onSave = vi.fn();
    render(<Mover initial={[inline({ id: "a" })]} onSave={onSave} />);
    await new Promise((r) => setTimeout(r, 60));
    expect(onSave).not.toHaveBeenCalled();
    expect(state()[0].inline).toBe(true);
    expect(h.upload).toHaveBeenCalledTimes(1);
  });

  it("does nothing when signed out", async () => {
    h.session = null;
    const onSave = vi.fn();
    render(<Mover initial={[inline({ id: "a" })]} onSave={onSave} />);
    await new Promise((r) => setTimeout(r, 40));
    expect(onSave).not.toHaveBeenCalled();
    expect(h.upload).not.toHaveBeenCalled();
  });
});
