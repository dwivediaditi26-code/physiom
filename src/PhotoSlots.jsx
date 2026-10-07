import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImage, uploadErrorMessage } from "./services/cloudinary.js";
import { useIsAdmin } from "./useIsAdmin.js";

// PhotoSlots -- a swipe-left/right gallery of reference-photo slots (4 for a
// Kinetic Chain test), one big photo at a time with dots underneath, the same
// way the Cardio/Neuro info cards (InfoCard.jsx) slide. Each slot is a fixed
// Cloudinary id known before any photo exists. Tapping an empty slot uploads
// straight from the browser; the camera button on a photo replaces it;
// tapping a photo opens it full size. Because the id never changes, the same
// photo shows on every screen and for every user that asks for that id.
//
// Only an admin sees the empty "Add" slots (that is where photos get
// uploaded). Everyone else sees just the photos that have actually been
// uploaded, and nothing at all -- not even the heading -- when there are none.
// `scale` shrinks the gallery (0.6 = 40% smaller) and centres it.
//
// Inline styles only (no CSS classes): this renders both inside the Ortho
// screens (plain CSS) and PhysioFeed's Learn area (Tailwind).
const BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";
const MAX_RETRIES = 3;

// Keyed on the first id so opening a different test starts again on photo 1
// instead of carrying the last test's slide / failed-photo state over.
export default function PhotoSlots(props) {
  return <PhotoSlotsGallery key={props.ids[0]} {...props} />;
}

function PhotoSlotsGallery({ ids, label = "Reference photos", scale = 1 }) {
  const isAdmin = useIsAdmin();
  const [failed, setFailed] = useState({});
  const [loaded, setLoaded] = useState({});
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);
  const [versions, setVersions] = useState({});
  const [uploading, setUploading] = useState(null);
  const [zoom, setZoom] = useState(null);
  const fileInputRef = useRef(null);
  const targetRef = useRef(0);
  const retries = useRef({});

  const src = (i, size) => `${BASE}/f_auto,q_auto,${size}/${ids[i]}${versions[i] ? `?v=${versions[i]}` : ""}`;
  const pick = (i) => { targetRef.current = i; fileInputRef.current?.click(); };
  // A non-admin only sees a slot once its photo has really loaded. The slot
  // still renders (hidden) so the browser fetches the photo to find out.
  const shown = (i) => isAdmin || (!!loaded[i] && !failed[i]);
  const shownSlots = ids.map((_, i) => i).filter(shown);

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

  // The slides sit side by side in a scroll-snap track, so a finger swipe (or
  // trackpad / shift-wheel) moves between them natively; the dots follow it.
  function onTrackScroll() {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.max(0, Math.min(shownSlots.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
  }
  function goTo(i) {
    const el = trackRef.current;
    setActive(i);
    if (!el) return;
    if (el.scrollTo) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    else el.scrollLeft = i * el.clientWidth;
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
    <div style={{ margin: shownSlots.length ? "10px 0" : 0 }}>
      {shownSlots.length > 0 && <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#6b7280", marginBottom: 6 }}>{label}</div>}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} data-testid="photo-slots-input" />
      {/* The gallery itself, centred at `scale` of the card width. Slides sit side by
          side in a scroll-snap track -- no inline grid here: utils.jsx
          collapses any inline "repeat(N," grid to one column on phones. */}
      <div data-testid="photo-slots-frame" style={{ width: `${Math.round(scale * 100)}%`, margin: "0 auto", display: shownSlots.length ? undefined : "none" }}>
      <div ref={trackRef} data-testid="photo-slots-track" onScroll={onTrackScroll}
        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch", borderRadius: 14 }}>
        {ids.map((id, i) => {
          const has = !failed[i];
          if (!isAdmin && !has) return null;
          return (
            <div key={id} style={{ display: shown(i) ? undefined : "none", flex: "0 0 100%", minWidth: 0, scrollSnapAlign: "center", scrollSnapStop: "always", position: "relative", aspectRatio: "1 / 1" }}>
              <button
                type="button"
                data-testid={`photo-slot-${i + 1}`}
                aria-label={has ? `View photo ${i + 1}` : `Add photo ${i + 1}`}
                onClick={(e) => { e.stopPropagation(); if (has) setZoom(i); else if (isAdmin) pick(i); }}
                style={{ display: "block", width: "100%", height: "100%", padding: 0, overflow: "hidden", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                  border: has ? "1px solid #E5E7EB" : "1.5px dashed #C4B5FD", background: has ? "#F9FAFB" : "#FAF8FF" }}
              >
                {has ? (
                  <img src={src(i, "w_900,c_limit")} alt="" onLoad={() => setLoaded((l) => ({ ...l, [i]: true }))} onError={() => onImgError(i)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                ) : (
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, color: "#7C3AED" }}>
                    <span style={{ fontSize: 34 }} aria-hidden="true">{uploading === i ? "⏳" : "🖼️"}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{uploading === i ? "Uploading…" : `Tap to add photo ${i + 1}`}</span>
                  </span>
                )}
              </button>
              {has && isAdmin && (
                <button type="button" aria-label={`Replace photo ${i + 1}`} disabled={uploading !== null}
                  onClick={(e) => { e.stopPropagation(); pick(i); }}
                  style={{ position: "absolute", top: 10, right: 10, width: 38, height: 38, borderRadius: "50%", border: "none", padding: 0, background: "rgba(20,10,45,.55)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {uploading === i ? "…" : "📷"}
                </button>
              )}
              {has && uploading === i && (
                <span style={{ position: "absolute", inset: 0, borderRadius: 14, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>⏳</span>
              )}
            </div>
          );
        })}
      </div>
      {shownSlots.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
          {shownSlots.map((slot, k) => (
            <button key={ids[slot]} type="button" aria-label={`Show photo ${k + 1} of ${shownSlots.length}`} aria-current={k === active ? "true" : undefined} onClick={() => goTo(k)}
              style={{ border: "none", background: "none", padding: "6px 3px", cursor: "pointer" }}>
              <span style={{ display: "block", height: 8, width: k === active ? 22 : 8, borderRadius: 4, background: k === active ? "#7C3AED" : "#DDD6FE", transition: "width .2s" }} />
            </button>
          ))}
        </div>
      )}
      </div>
      {zoom !== null && createPortal(
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={src(zoom, "w_1200,c_limit")} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} />
          <div style={{ position: "absolute", top: 16, left: 16, color: "#fff", fontSize: 13, fontWeight: 700 }}>Photo {isAdmin ? zoom + 1 : shownSlots.indexOf(zoom) + 1} of {isAdmin ? ids.length : shownSlots.length}</div>
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 10 }}>
            {isAdmin && (
              <button type="button" onClick={(e) => { e.stopPropagation(); pick(zoom); }} disabled={uploading !== null}
                style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                📷 {uploading === zoom ? "Uploading…" : "Replace photo"}
              </button>
            )}
            <button type="button" aria-label="Close" onClick={(e) => { e.stopPropagation(); setZoom(null); }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
