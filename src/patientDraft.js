// patientDraft.js -- the quick-recovery copy of what is being typed (kept in localStorage).
//
// Two things went wrong once medical-record files were attached (they are stored inside the
// patient record and can be several MB):
//  1. localStorage holds about 5 MB in total, so saving the draft started failing silently and
//     the draft on disk stayed at its OLD, smaller version;
//  2. on the next start that old draft was loaded and written over the patient record, which
//     dropped the attached files (locally, and then in the cloud with the next autosave).
// So: the files themselves are never put in the draft (the patient record holds them), the
// draft is stamped with the time it was saved, a draft older than the patient record is not
// used, and a draft that cannot be saved is removed instead of being left behind to go stale.

// The data with each attached file's content left out (name, type, size... are kept).
export function slimForDraft(data) {
  if (!data || !Array.isArray(data.uploaded_docs)) return data;
  return { ...data, uploaded_docs: data.uploaded_docs.map((d) => { if (!d || typeof d !== "object") return d; const { dataUrl, ...rest } = d; return rest; }) };
}

export function writeDraft(key, pid, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ pid: pid || null, data: slimForDraft(data), savedAt: Date.now() }));
    return true;
  } catch {
    try { localStorage.removeItem(key); } catch { /* storage blocked */ }
    return false;
  }
}

const hasFileContent = (docs) => Array.isArray(docs) && docs.some((d) => d && d.dataUrl);

// What to use as the working data when a draft exists for this patient. `patient` is the saved
// record (may be undefined). Returns the draft's data, with the patient's attached files put
// back in, or the patient's own data when it is newer than the draft.
export function restoreDraftData(raw, patient) {
  const draft = raw && raw.data;
  if (!draft) return patient?.data || {};
  const record = patient?.data;
  if (!record) return draft;
  const recordTime = Date.parse(patient.updatedAt);
  if (raw.savedAt && !Number.isNaN(recordTime) && recordTime > raw.savedAt) return record; // the record is newer than the draft
  if (Array.isArray(record.uploaded_docs) && !hasFileContent(draft.uploaded_docs)) {
    return { ...draft, uploaded_docs: record.uploaded_docs };
  }
  return draft;
}
