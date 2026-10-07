// patientFiles.js -- where a patient's attached files (scans, lab reports, protocols) are kept.
//
// They used to live INSIDE the patient record as base64 text. A 5 MB file became ~6.7 MB of text
// that was re-sent on every save and counted against the phone's few MB of local storage, so a
// couple of attachments could make saving fail. Now the file itself goes to a private Supabase
// Storage bucket ("patient-files") and the record keeps only a small reference:
//
//     { id, name, type, size, date, docType, source, storagePath: "<user id>/<doc id>-<name>" }
//
// Old records that still hold the file inline ({ ..., dataUrl }) keep working everywhere, and are
// moved over one at a time by moveDocToCloud(). The inline copy is dropped ONLY after the uploaded
// file has been found in storage with the right size -- anything else leaves the record untouched.
//
// Needs supabase/add_patient_files_storage.sql to have been run once. Until then (or when signed
// out, or offline) uploads simply stay inline, exactly as before.
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";

export const FILES_BUCKET = "patient-files";
const VIEW_LINK_SECONDS = 600;
const viewLinks = new Map(); // storagePath -> { url, until }

export const isCloudDoc = (doc) => Boolean(doc && doc.storagePath);
export const isInlineDoc = (doc) => Boolean(doc && !doc.storagePath && doc.dataUrl);

async function currentUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

const safeName = (name) => String(name || "record").replace(/[^\w.\-]+/g, "_").slice(-80) || "record";

export function dataUrlToBlob(dataUrl) {
  const [head, b64 = ""] = String(dataUrl).split(",");
  const mime = (head.match(/data:(.*?)[;,]/) || [])[1] || "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Is the file really in storage, with the size we sent? (list() is the one call that reports sizes.)
async function storedSizeMatches(path, expectedBytes) {
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const file = path.slice(slash + 1);
  const { data, error } = await supabase.storage.from(FILES_BUCKET).list(folder, { search: file, limit: 20 });
  if (error || !Array.isArray(data)) return false;
  const hit = data.find((o) => o.name === file);
  return Boolean(hit) && Number(hit.metadata?.size) === expectedBytes;
}

// Puts an inline file in cloud storage. Returns { doc, moved }: when moved, doc has storagePath and no
// dataUrl; otherwise doc is returned exactly as it came in, with `reason` saying why (signed_out, or the
// storage error). Never throws, never loses the file.
export async function moveDocToCloud(doc) {
  if (!isInlineDoc(doc)) return { doc, moved: false, reason: doc?.storagePath ? "already_in_cloud" : "no_file" };
  const uid = await currentUserId();
  if (!uid) return { doc, moved: false, reason: "signed_out" };
  try {
    const blob = dataUrlToBlob(doc.dataUrl);
    const path = `${uid}/${doc.id}-${safeName(doc.name)}`;
    const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, blob, { contentType: doc.type || blob.type || "application/octet-stream", upsert: true });
    if (error) return { doc, moved: false, reason: error.message || "upload_failed" };
    if (!(await storedSizeMatches(path, blob.size))) return { doc, moved: false, reason: "not_confirmed" };
    const { dataUrl, ...rest } = doc;
    return { doc: { ...rest, storagePath: path }, moved: true };
  } catch (e) {
    return { doc, moved: false, reason: e?.message || "upload_failed" };
  }
}

// Best effort: the record is already updated, so a failed delete only leaves a stray private file.
export async function removeDocFile(doc) {
  if (!isCloudDoc(doc)) return;
  viewLinks.delete(doc.storagePath);
  try { await supabase.storage.from(FILES_BUCKET).remove([doc.storagePath]); } catch { /* ignore */ }
}

// A short-lived link for showing a picture (thumbnails). Inline files return their own data.
export async function getDocViewUrl(doc) {
  if (!doc) return null;
  if (doc.dataUrl) return doc.dataUrl;
  if (!isCloudDoc(doc)) return null;
  const cached = viewLinks.get(doc.storagePath);
  if (cached && cached.until > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(doc.storagePath, VIEW_LINK_SECONDS);
  if (error || !data?.signedUrl) return null;
  viewLinks.set(doc.storagePath, { url: data.signedUrl, until: Date.now() + (VIEW_LINK_SECONDS - 60) * 1000 });
  return data.signedUrl;
}

export function useDocViewUrl(doc) {
  const [url, setUrl] = useState(doc?.dataUrl || null);
  useEffect(() => {
    let live = true;
    if (doc?.dataUrl) { setUrl(doc.dataUrl); return undefined; }
    setUrl(null);
    if (isCloudDoc(doc)) getDocViewUrl(doc).then((u) => { if (live) setUrl(u); }).catch(() => {});
    return () => { live = false; };
  }, [doc?.dataUrl, doc?.storagePath]);
  return url;
}

// The file as a blob: link (what opening and downloading use, so PDFs show the same way for inline and
// cloud files). Returns null when the file cannot be fetched right now.
export async function getDocBlobUrl(doc) {
  if (!doc) return null;
  try {
    if (doc.dataUrl) return URL.createObjectURL(dataUrlToBlob(doc.dataUrl));
    if (!isCloudDoc(doc)) return null;
    const { data, error } = await supabase.storage.from(FILES_BUCKET).download(doc.storagePath);
    if (error || !data) return null;
    return URL.createObjectURL(data.type ? data : new Blob([data], { type: doc.type || "application/octet-stream" }));
  } catch {
    return null;
  }
}

// Opens the file in a new tab. The tab is opened straight away, inside the tap, because phones refuse
// to open one after a wait; the file is put in it once it has been fetched.
export async function openDocFile(doc, onProblem = (m) => window.alert(m)) {
  const tab = window.open("", "_blank");
  const url = await getDocBlobUrl(doc);
  if (!url) {
    try { tab?.close(); } catch { /* ignore */ }
    onProblem("Could not open this file. Check your connection and try again.");
    return false;
  }
  if (tab) tab.location.href = url;
  else {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }
  return true;
}

export async function downloadDocFile(doc, onProblem = (m) => window.alert(m)) {
  const url = await getDocBlobUrl(doc);
  if (!url) { onProblem("Could not download this file. Check your connection and try again."); return false; }
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.name || "record";
  a.click();
  return true;
}

// Moves a patient's older, inline files to cloud storage in the background, one at a time, whenever
// their records are on screen and the person is signed in and online. `save(nextDocs)` is the same
// save the screen uses for any edit. Changes made meanwhile (a new type, a deleted file) are kept: the
// result is merged into the CURRENT list, and only the files that really moved lose their inline copy.
// A file that cannot be moved is left exactly as it is and is tried again the next time the screen opens.
export function useMoveDocsToCloud(docs, save) {
  const latest = useRef(docs);
  latest.current = docs;
  const saveRef = useRef(save);
  saveRef.current = save;
  const tried = useRef(new Set());
  const key = (Array.isArray(docs) ? docs : []).filter(isInlineDoc).map((d) => d.id).join("|");
  useEffect(() => {
    if (!key || typeof saveRef.current !== "function") return;
    const todo = (latest.current || []).filter((d) => isInlineDoc(d) && !tried.current.has(d.id));
    if (todo.length === 0) return;
    todo.forEach((d) => tried.current.add(d.id));
    (async () => {
      const movedById = new Map();
      for (const d of todo) {
        const r = await moveDocToCloud(d);
        if (r.moved) movedById.set(d.id, r.doc);
        else if (r.reason === "signed_out") return;
      }
      if (movedById.size === 0) return;
      const current = latest.current || [];
      const stillThere = new Set(current.map((d) => d.id));
      // deleted while it was moving: take the stored copy away again
      for (const [id, moved] of movedById) if (!stillThere.has(id)) removeDocFile(moved);
      const next = current.map((d) => {
        const moved = movedById.get(d.id);
        if (!moved || !isInlineDoc(d)) return d;
        const { dataUrl, ...rest } = d;
        return { ...rest, storagePath: moved.storagePath };
      });
      if (next.some((d, i) => d !== current[i])) saveRef.current(next);
    })();
  }, [key]);
}
