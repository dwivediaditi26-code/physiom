// A patient with attached documents must keep them across a reload. The unsaved-draft copy in
// localStorage used to go stale (it cannot hold a few MB) and was then loaded over the record.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { slimForDraft, writeDraft, restoreDraftData } from "../patientDraft.js";

const KEY = "physio_draft_v1_u1";
const doc = (id) => ({ id, name: `${id}.pdf`, type: "application/pdf", size: "3 MB", dataUrl: "data:application/pdf;base64," + "A".repeat(2000) });
const patient = (docs, updatedAt = "2026-10-09T10:00:00.000Z") => ({ id: "p1", updatedAt, data: { dem_name: "Asha", uploaded_docs: docs, a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("what goes into the draft", () => {
  it("leaves the attached files' content out and keeps their names", () => {
    const slim = slimForDraft({ dem_name: "Asha", uploaded_docs: [doc("d1"), doc("d2")] });
    expect(slim.uploaded_docs.map((d) => d.name)).toEqual(["d1.pdf", "d2.pdf"]);
    expect(slim.uploaded_docs.every((d) => !("dataUrl" in d))).toBe(true);
    expect(JSON.stringify(slim).length).toBeLessThan(1000);
  });

  it("does not touch data without attached files, and does not change the original", () => {
    const plain = { dem_name: "Asha" };
    expect(slimForDraft(plain)).toBe(plain);
    const withDocs = { uploaded_docs: [doc("d1")] };
    slimForDraft(withDocs);
    expect(withDocs.uploaded_docs[0].dataUrl).toBeTruthy();
  });

  it("stamps the draft with the time it was saved", () => {
    const before = Date.now();
    expect(writeDraft(KEY, "p1", { dem_name: "Asha" })).toBe(true);
    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved.pid).toBe("p1");
    expect(saved.savedAt).toBeGreaterThanOrEqual(before);
  });

  it("removes the old draft when the new one cannot be saved, so it cannot go stale", () => {
    writeDraft(KEY, "p1", { dem_name: "old" });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(writeDraft(KEY, "p1", { dem_name: "new" })).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("what is used after a reload", () => {
  const raw = (data, savedAt) => ({ pid: "p1", data, savedAt });

  it("puts the patient's attached files back into a draft that has none", () => {
    const record = patient([doc("d1"), doc("d2")]);
    const draft = slimForDraft(record.data);
    const used = restoreDraftData(raw(draft, Date.parse(record.updatedAt) + 5000), record);
    expect(used.uploaded_docs).toHaveLength(2);
    expect(used.uploaded_docs.every((d) => d.dataUrl)).toBe(true);
    expect(used.dem_name).toBe("Asha");
  });

  it("uses the patient record when it is newer than the draft (the draft is stale)", () => {
    const record = patient([doc("d1"), doc("d2")], "2026-10-09T10:00:10.000Z");
    const staleDraft = { dem_name: "Asha", a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }; // saved before the files were added
    const used = restoreDraftData(raw(staleDraft, Date.parse("2026-10-09T10:00:00.000Z")), record);
    expect(used).toBe(record.data);
    expect(used.uploaded_docs).toHaveLength(2);
  });

  it("keeps what was typed after the last save of the record (the draft is newer)", () => {
    const record = patient([doc("d1")], "2026-10-09T10:00:00.000Z");
    const draft = { ...slimForDraft(record.data), dem_name: "Asha Rao" };
    const used = restoreDraftData(raw(draft, Date.parse("2026-10-09T10:00:05.000Z")), record);
    expect(used.dem_name).toBe("Asha Rao");
    expect(used.uploaded_docs[0].dataUrl).toBeTruthy();
  });

  it("an old-style draft (no time stamp, files inside) is used as it is", () => {
    const record = patient([doc("d1")]);
    const legacy = { ...record.data, uploaded_docs: [doc("d1"), doc("d9")] };
    const used = restoreDraftData({ pid: "p1", data: legacy }, record);
    expect(used.uploaded_docs).toHaveLength(2);
  });

  it("with no saved record it uses the draft, and with no draft the record", () => {
    expect(restoreDraftData(raw({ x: 1 }, 1), undefined)).toEqual({ x: 1 });
    const record = patient([]);
    expect(restoreDraftData({ pid: "p1" }, record)).toBe(record.data);
  });
});
