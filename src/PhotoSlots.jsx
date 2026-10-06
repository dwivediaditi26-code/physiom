import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImage, uploadErrorMessage } from "./services/cloudinary.js";

// PhotoSlots -- a row of reference-photo slots (4 for a Kinetic Chain test),
// each one a fixed Cloudinary id known before any photo exists. Tapping an
// empty slot uploads straight from the browser; tapping a photo opens it
// full size, where it can be replaced. Because the id never changes, the same
// photo shows on every screen and for every user that asks for that id.
//
// Inline styles only (no CSS classes): this renders both inside the Ortho
// screens (plain CSS) and PhysioFeed's Learn area (Tailwind).
const BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";
const MAX_RETRIES = 3;

export default function PhotoSlots({ ids, label = "Reference photos" }) {
  const [failed, setFailed] = useState({});
  const [versions, setVersions] = useState({});
  const [uploading, setUploading] = useState(null);
  const [zoom, setZoom] = useState(null);
  const fileInputRef = useRef(null);
  const targetRef = useRef(0);
  const retries = useRef({});

  const src = (i, size) => `${BASE}/f_auto,q_auto,${size}/${ids[i]}${versions[i] ? `?v=${versions[i]}` : ""}`;
  const pick = (i) => { targetRef.current = i; fileInputRef.current?.click(); };

  // Cloudinary can take a moment to derive the transformed image for a
  // brand-new upload, so the first request right after uploading may 404
  // even though the upload worked -- retry a few times before showing "add".
  function onImgError(i) {
    if (versions[i] && (retries.current[i] || 0) < MAX_RETRIES) {
      retries.current[i] = (retries.current[i] || 0) + 1;
      setTimeout(() => setVersions((v) => ({ ...v, [i]: Date.now() })), 1500);
      return;
    }
    setFailed((f) => ({ ...f, [i]: true }));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const i = targetRef.current;
    if (!file) return;
    setUploading(i);
    try {
      await uploadImage(file, ids[i]);
      retries.current[i] = 0;
      setFailed((f) => ({ ...f, [i]: false }));
      setVersions((v) => ({ ...v, [i]: Date.now() }));
    } catch (err) {
      alert(uploadErrorMessage(err));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div style={{ margin: "10px 0" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} data-testid="photo-slots-input" />
      {/* A flex row, not a grid: utils.jsx collapses any inline "repeat(4," grid to ONE
          column on phones, which stacked these into four huge full-width tiles. */}
      <div data-testid="photo-slots-row" style={{ display: "flex", gap: 8 }}>
        {ids.map((id, i) => {
          const has = !failed[i];
          return (
            <button
              key={id}
              type="button"
              data-testid={`photo-slot-${i + 1}`}
              aria-label={has ? `View photo ${i + 1}` : `Add photo ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); has ? setZoom(i) : pick(i); }}
              style={{ position: "relative", flex: "1 1 0", minWidth: 0, aspectRatio: "1 / 1", padding: 0, overflow: "hidden", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: has ? "1px solid #E5E7EB" : "1.5px dashed #C4B5FD", background: has ? "#F9FAFB" : "#FAF8FF" }}
            >
              {has ? (
                <img src={src(i, "w_300,h_300,c_fill")} alt="" onError={() => onImgError(i)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2, color: "#7C3AED" }}>
                  <span style={{ fontSize: 20 }} aria-hidden="true">{uploading === i ? "⏳" : "📷"}</span>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700 }}>{uploading === i ? "Uploading…" : `Add ${i + 1}`}</span>
                </span>
              )}
              {has && uploading === i && (
                <span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>⏳</span>
              )}
            </button>
          );
        })}
      </div>
      {zoom !== null && createPortal(
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={src(zoom, "w_1200,c_limit")} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} />
          <div style={{ position: "absolute", top: 16, left: 16, color: "#fff", fontSize: 13, fontWeight: 700 }}>Photo {zoom + 1} of {ids.length}</div>
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 10 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); pick(zoom); }} disabled={uploading !== null}
              style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              📷 {uploading === zoom ? "Uploading…" : "Replace photo"}
            </button>
            <button type="button" aria-label="Close" onClick={(e) => { e.stopPropagation(); setZoom(null); }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
