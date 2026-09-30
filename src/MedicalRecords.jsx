import React, { useRef, useState } from "react";
import { SectionIntro, TextField, TextArea, DateField, Alert } from "./orthoFieldKit.jsx";

/* ============================================================
   MEDICAL RECORDS — upload or photograph a patient's documents during
   ANY assessment (Ortho IPD / OPD / Post-op, Neuro, Cardio), or from the
   Medical Records tab on the patient profile.

   Files live in ONE store, patient.data.uploaded_docs — the same one the
   Medical Records "Documents" tab reads — so a file added in an assessment
   shows on the profile and vice versa. Each file can carry a type (Scan /
   X-ray, Lab report, Surgeon's protocol, ...). Small notes (source, date,
   key points) live in the assessment section itself.

   Stored as base64 inside the patient record, so photos are downscaled
   before saving and files are capped at 5 MB.
   ============================================================ */

export const PROTOCOL_CATEGORY = "surgeon_protocol"; // legacy tag from the first version

export const DOC_TYPES = [
  "Surgeon's protocol",
  "Scan / X-ray / MRI",
  "Lab report",
  "Discharge summary",
  "Referral letter",
  "Prescription",
  "Consent form",
  "Other",
];

export const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1800;
const DOWNSCALE_ABOVE_BYTES = 700 * 1024;
export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx";

// A file's type: the new docType, or the legacy surgeon_protocol tag from the first version.
export function docTypeOf(doc) {
  if (!doc) return "";
  if (doc.docType) return doc.docType;
  return doc.category === PROTOCOL_CATEGORY ? "Surgeon's protocol" : "";
}
export function isProtocolDoc(doc) {
  return docTypeOf(doc) === "Surgeon's protocol";
}
// Returns a copy with the type set (or cleared) and the legacy tag dropped.
export function withDocType(doc, type) {
  const { category, docType, ...rest } = doc;
  return type ? { ...rest, docType: type } : rest;
}

export function formatFileSize(bytes) {
  return bytes > 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target.result);
    r.onerror = () => reject(new Error("Could not read that file."));
    r.readAsDataURL(file);
  });
}

// Re-encode a large photo as a smaller JPEG so a phone camera picture fits the size cap.
async function downscaleImage(file) {
  const src = await readAsDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not open that image."));
    i.src = src;
  });
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function dataUrlBytes(dataUrl) {
  const b64 = dataUrl.split(",")[1] || "";
  return Math.floor((b64.length * 3) / 4);
}

/* File -> document record (same shape as the Medical Records uploader).
   Rejects with a readable message; never throws anything else. */
export async function fileToDoc(file, { docType = null, source = "medical_records" } = {}) {
  if (!file) throw new Error("No file chosen.");
  const isImage = (file.type || "").startsWith("image/");
  let dataUrl;
  let type = file.type || "application/octet-stream";
  let name = file.name || "record";
  if (isImage && file.size > DOWNSCALE_ABOVE_BYTES && !/heic/i.test(type + name)) {
    dataUrl = await downscaleImage(file);
    type = "image/jpeg";
    name = name.replace(/\.[^.]+$/, "") + ".jpg";
  } else {
    if (file.size > MAX_DOC_BYTES) throw new Error("File too large. Maximum size is 5MB.");
    dataUrl = await readAsDataUrl(file);
  }
  const bytes = dataUrlBytes(dataUrl);
  if (bytes > MAX_DOC_BYTES) throw new Error("File too large. Maximum size is 5MB.");
  const now = new Date();
  return {
    id: now.getTime().toString() + Math.random().toString(36).slice(2, 6),
    name,
    date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    size: formatFileSize(bytes),
    type,
    icon: type.includes("pdf") ? "📋" : type.includes("image") ? "🖼" : "📄",
    dataUrl,
    uploadedAt: now.toISOString(),
    ...(docType ? { docType } : {}),
    source,
  };
}

export function openDoc(doc) {
  try {
    const [head, b64] = doc.dataUrl.split(",");
    const mime = (head.match(/data:(.*?);/) || [])[1] || doc.type || "application/octet-stream";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([arr], { type: mime })), "_blank");
  } catch {
    alert("Could not open this file. Try downloading it instead.");
  }
}

export function downloadDoc(doc) {
  const a = document.createElement("a");
  a.href = doc.dataUrl;
  a.download = doc.name;
  a.click();
}

const box = { border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, background: "#fff" };
const miniBtn = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 12, fontWeight: 700 };

export function MedicalRecordsSection({ data, setData, patientData, onSave }) {
  const section = data.medicalRecords || data.surgeonProtocol || {};
  const setField = (k, v) => setData((prev) => ({ ...prev, medicalRecords: { ...(prev.medicalRecords || prev.surgeonProtocol || {}), [k]: v } }));
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadType, setUploadType] = useState("");

  const docs = Array.isArray(patientData?.uploaded_docs) ? patientData.uploaded_docs : [];
  const canSave = typeof onSave === "function";

  // Keep a readable list of attached files inside the section so the Final Review /
  // report shows what was attached without needing the patient record.
  const commit = (nextDocs) => {
    onSave("uploaded_docs", nextDocs);
    setField("attachedFiles", nextDocs.map((d) => (docTypeOf(d) ? `${d.name} (${docTypeOf(d)})` : d.name)).join(", "));
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      const added = [];
      for (const f of files) added.push(await fileToDoc(f, { docType: uploadType || null, source: "assessment" }));
      commit([...added, ...docs]);
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const setType = (id, type) => commit(docs.map((d) => (d.id === id ? withDocType(d, type) : d)));
  const deleteDoc = (doc) => {
    if (!window.confirm(`Delete "${doc.name}" from this patient's records? This cannot be undone.`)) return;
    commit(docs.filter((d) => d.id !== doc.id));
  };
  const typeSelect = (value, onChange, label) => (
    <select aria-label={label} value={value || ""} onChange={(e) => onChange(e.target.value)}
      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, fontFamily: "inherit", maxWidth: "100%" }}>
      <option value="">Type: not set</option>
      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );

  return (
    <>
      <SectionIntro
        icon="📎"
        title="Medical Records"
        info="Attach the patient's reports, scans, discharge summary, referral letter or the surgeon's protocol — by uploading a file or taking a photo. Everything is also saved in Medical Records on the patient profile."
      />
      <Alert tone="amber">If a surgeon's or doctor's written orders are attached, they take priority over any generic protocol in this app.</Alert>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6 }}>What are you attaching? (applies to the next upload)</div>
        {typeSelect(uploadType, setUploadType, "Type for the next upload")}
      </div>

      <input ref={fileRef} type="file" accept={DOC_ACCEPT} multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      <div
        data-testid="records-dropzone"
        onClick={() => canSave && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (canSave) addFiles(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${dragOver ? "#7c3aed" : "#a78bfa"}`, background: dragOver ? "#ede9fe" : "#f5f3ff", borderRadius: 16, padding: "24px 16px", textAlign: "center", cursor: canSave ? "pointer" : "not-allowed", marginBottom: 10, opacity: canSave ? 1 : 0.6 }}
      >
        <div style={{ fontSize: 32, marginBottom: 6 }}>{busy ? "⏳" : "📤"}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>{busy ? "Uploading…" : "Tap to upload a record"}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>or drag and drop here · PDF, photo, Word · up to 5 MB each</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" disabled={!canSave || busy} onClick={() => fileRef.current?.click()} style={{ ...miniBtn, flex: 1, padding: "10px" }}>📁 Choose file</button>
        <button type="button" disabled={!canSave || busy} onClick={() => cameraRef.current?.click()} style={{ ...miniBtn, flex: 1, padding: "10px" }}>📷 Take photo</button>
      </div>
      {!canSave && <div style={{ fontSize: 12, color: "#b45309", marginBottom: 10 }}>Uploads need an open patient record — create or select the patient first.</div>}
      {error && <div role="alert" style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 700, marginBottom: 10 }}>{error}</div>}

      <div className="subheading">Records on file ({docs.length})</div>
      {docs.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>No records attached yet.</div>}
      {docs.map((doc) => (
        <div key={doc.id} style={{ ...box, flexWrap: "wrap" }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer" }} onClick={() => openDoc(doc)}>
            {doc.type?.includes("image") ? <img src={doc.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18 }}>{doc.icon || "📄"}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 120, cursor: "pointer" }} onClick={() => openDoc(doc)}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.date} · {doc.size}</div>
          </div>
          <button type="button" title="Download" style={miniBtn} onClick={() => downloadDoc(doc)}>⬇</button>
          <button type="button" title="Delete" style={{ ...miniBtn, color: "#dc2626" }} onClick={() => deleteDoc(doc)}>🗑</button>
          <div style={{ flexBasis: "100%" }}>{typeSelect(docTypeOf(doc), (v) => setType(doc.id, v), `Type of ${doc.name}`)}</div>
        </div>
      ))}

      <div className="subheading">Notes</div>
      <TextField label="Source / doctor / hospital" value={section.source} onChange={(v) => setField("source", v)} placeholder="e.g. Dr. Mehta — discharge summary" />
      <DateField label="Records received on" value={section.receivedDate} onChange={(v) => setField("receivedDate", v)} />
      <TextArea label="Key points from the records" value={section.keyPoints} onChange={(v) => setField("keyPoints", v)} placeholder="e.g. MRI: L4–L5 disc bulge · PWB 6 weeks per surgeon · Hb 9.8" />
    </>
  );
}
