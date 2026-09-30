import React, { useRef, useState } from "react";
import { SectionIntro, TextField, TextArea, DateField, Alert } from "./orthoFieldKit.jsx";

/* ============================================================
   SURGEON'S PROTOCOL — upload / photograph the surgeon's written
   rehabilitation protocol during an assessment, or from Medical Records.

   Files live in the SAME store the Medical Records "Documents" tab uses
   (patient.data.uploaded_docs), tagged with category "surgeon_protocol",
   so a protocol added here shows up in Medical Records and one added in
   Medical Records shows up here. Small text notes (key restrictions,
   received date, source) live in the assessment section itself.

   Stored as base64 inside the patient record, same as existing documents,
   so photos are downscaled before saving and files are capped at 5 MB.
   ============================================================ */

export const PROTOCOL_CATEGORY = "surgeon_protocol";
export const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1800;
const DOWNSCALE_ABOVE_BYTES = 700 * 1024;
export const PROTOCOL_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx";

export function isProtocolDoc(doc) {
  return !!doc && doc.category === PROTOCOL_CATEGORY;
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
export async function fileToDoc(file, { category = null, source = "medical_records" } = {}) {
  if (!file) throw new Error("No file chosen.");
  const isImage = (file.type || "").startsWith("image/");
  let dataUrl;
  let type = file.type || "application/octet-stream";
  let name = file.name || "protocol";
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
    ...(category ? { category } : {}),
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

export function SurgeonProtocolSection({ data, setData, patientData, onSave }) {
  const section = data.surgeonProtocol || {};
  const setField = (k, v) => setData((prev) => ({ ...prev, surgeonProtocol: { ...(prev.surgeonProtocol || {}), [k]: v } }));
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const allDocs = Array.isArray(patientData?.uploaded_docs) ? patientData.uploaded_docs : [];
  const protocolDocs = allDocs.filter(isProtocolDoc);
  const otherDocs = allDocs.filter((d) => !isProtocolDoc(d));
  const canSave = typeof onSave === "function";

  // Keep a readable list of attached names inside the section so the Final Review /
  // report shows what was attached without needing the patient record.
  const commit = (nextDocs) => {
    onSave("uploaded_docs", nextDocs);
    const names = nextDocs.filter(isProtocolDoc).map((d) => d.name).join(", ");
    setField("attachedFiles", names);
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      const added = [];
      for (const f of files) added.push(await fileToDoc(f, { category: PROTOCOL_CATEGORY, source: "assessment" }));
      commit([...added, ...allDocs]);
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const markAsProtocol = (id) => commit(allDocs.map((d) => (d.id === id ? { ...d, category: PROTOCOL_CATEGORY } : d)));
  const removeFromProtocol = (id) => commit(allDocs.map((d) => { if (d.id !== id) return d; const { category, ...rest } = d; return rest; }));
  const deleteDoc = (doc) => {
    if (!window.confirm(`Delete "${doc.name}" from this patient's records? This cannot be undone.`)) return;
    commit(allDocs.filter((d) => d.id !== doc.id));
  };

  return (
    <>
      <SectionIntro
        icon="📎"
        title="Surgeon's Protocol"
        info="Attach the surgeon's written rehabilitation protocol or discharge orders. Keep the surgeon's wording — do not paraphrase it into a new plan. Files are also saved in Medical Records."
      />
      <Alert tone="amber">The surgeon's written protocol and restrictions take priority over any generic protocol in this app.</Alert>

      <input ref={fileRef} type="file" accept={PROTOCOL_ACCEPT} multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      <div
        data-testid="protocol-dropzone"
        onClick={() => canSave && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (canSave) addFiles(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${dragOver ? "#7c3aed" : "#a78bfa"}`, background: dragOver ? "#ede9fe" : "#f5f3ff", borderRadius: 16, padding: "24px 16px", textAlign: "center", cursor: canSave ? "pointer" : "not-allowed", marginBottom: 10, opacity: canSave ? 1 : 0.6 }}
      >
        <div style={{ fontSize: 32, marginBottom: 6 }}>{busy ? "⏳" : "📤"}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#7c3aed" }}>{busy ? "Uploading…" : "Tap to upload the protocol"}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>or drag and drop here · PDF, photo, Word · up to 5 MB each</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" disabled={!canSave || busy} onClick={() => fileRef.current?.click()} style={{ ...miniBtn, flex: 1, padding: "10px" }}>📁 Choose file</button>
        <button type="button" disabled={!canSave || busy} onClick={() => cameraRef.current?.click()} style={{ ...miniBtn, flex: 1, padding: "10px" }}>📷 Take photo</button>
      </div>
      {!canSave && <div style={{ fontSize: 12, color: "#b45309", marginBottom: 10 }}>Uploads need an open patient record — create or select the patient first.</div>}
      {error && <div role="alert" style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 700, marginBottom: 10 }}>{error}</div>}

      <div className="subheading">Attached protocol files ({protocolDocs.length})</div>
      {protocolDocs.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>No protocol attached yet.</div>}
      {protocolDocs.map((doc) => (
        <div key={doc.id} style={box}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer" }} onClick={() => openDoc(doc)}>
            {doc.type?.includes("image") ? <img src={doc.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18 }}>{doc.icon}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => openDoc(doc)}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.date} · {doc.size}</div>
          </div>
          <button type="button" title="Download" style={miniBtn} onClick={() => downloadDoc(doc)}>⬇</button>
          <button type="button" title="Keep in Medical Records but not as the protocol" style={miniBtn} onClick={() => removeFromProtocol(doc.id)}>Unmark</button>
          <button type="button" title="Delete" style={{ ...miniBtn, color: "#dc2626" }} onClick={() => deleteDoc(doc)}>🗑</button>
        </div>
      ))}

      {otherDocs.length > 0 && (
        <>
          <div className="subheading">Use a file from Medical Records</div>
          {otherDocs.map((doc) => (
            <div key={doc.id} style={box}>
              <span style={{ fontSize: 18 }}>{doc.icon || "📄"}</span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
              <button type="button" style={miniBtn} onClick={() => openDoc(doc)}>View</button>
              <button type="button" style={{ ...miniBtn, background: "#f5f3ff", color: "#7c3aed" }} onClick={() => markAsProtocol(doc.id)}>Use as protocol</button>
            </div>
          ))}
        </>
      )}

      <div className="subheading">Protocol details</div>
      <TextField label="Protocol source / surgeon" value={section.source} onChange={(v) => setField("source", v)} placeholder="e.g. Dr. Mehta — discharge summary" />
      <DateField label="Protocol received on" value={section.receivedDate} onChange={(v) => setField("receivedDate", v)} />
      <TextArea label="Key restrictions & milestones (copied from the protocol)" value={section.keyPoints} onChange={(v) => setField("keyPoints", v)} placeholder="e.g. PWB 6 weeks · no flexion beyond 90° until week 4 · brace until clinic review" />
    </>
  );
}
