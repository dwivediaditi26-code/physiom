import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, Eye, EyeOff, ImageOff } from "lucide-react";
import { XRAY } from "./xrayTheme.jsx";

const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clampPan(pan, zoom, box) {
  if (!box || zoom <= 1) return { x: 0, y: 0 };
  const maxX = (box.width * (zoom - 1)) / 2;
  const maxY = (box.height * (zoom - 1)) / 2;
  return { x: Math.max(-maxX, Math.min(maxX, pan.x)), y: Math.max(-maxY, Math.min(maxY, pan.y)) };
}

function dist(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

// One reusable radiograph viewer: zoom (wheel / pinch / double-click), pan
// when zoomed, reset, an in-place fullscreen overlay, and an annotation
// overlay that is always a separate layer on top of the image -- never
// baked into the source photo -- so it can be toggled and stays aligned as
// the image resizes (percentage coordinates, not pixels).
export default function RadiographViewer({ image, forceHideAnnotations = false, aspectRatio = "4 / 3" }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef(null);
  const dragStart = useRef(null);
  const pinchStart = useRef(null);

  const annotations = image?.annotations || [];
  const hasAnnotations = annotations.length > 0 && !forceHideAnnotations;
  const labelsOn = showLabels && !forceHideAnnotations;

  // setZoom's functional-updater form always sees the latest zoom, so these
  // never need `zoom` in a dependency array or closure.
  const applyZoom = (next) => {
    setZoom((z) => {
      const resolved = typeof next === "function" ? next(z) : next;
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, resolved));
      setPan((p) => clampPan(p, clamped, boxRef.current?.getBoundingClientRect()));
      return clamped;
    });
  };

  // Wheel zoom and two-finger pinch both need preventDefault to stop the
  // page from scrolling/zooming instead -- React attaches wheel/touchmove
  // listeners as passive by default, which silently drops preventDefault,
  // so both are wired here as native listeners with passive:false instead
  // of JSX onWheel/onTouchMove props.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const wheelHandler = (e) => {
      e.preventDefault();
      applyZoom((z) => z - e.deltaY * 0.0025);
    };
    const touchMoveHandler = (e) => {
      if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault();
        const scale = dist(e.touches[0], e.touches[1]) / pinchStart.current.d;
        applyZoom(pinchStart.current.z * scale);
      } else if (e.touches.length === 1 && dragStart.current && dragging) {
        const box = el.getBoundingClientRect();
        setPan(clampPan({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y }, zoom, box));
      }
    };
    el.addEventListener("wheel", wheelHandler, { passive: false });
    el.addEventListener("touchmove", touchMoveHandler, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheelHandler);
      el.removeEventListener("touchmove", touchMoveHandler);
    };
  }, [dragging, zoom]);

  const onDoubleClick = () => applyZoom((z) => (z > 1 ? 1 : 2.2));

  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const box = boxRef.current?.getBoundingClientRect();
    setPan(clampPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }, zoom, box));
  };
  const endDrag = () => setDragging(false);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchStart.current = { d: dist(e.touches[0], e.touches[1]), z: zoom };
    } else if (e.touches.length === 1 && zoom > 1) {
      setDragging(true);
      dragStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };
  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) setDragging(false);
  };

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const hasImage = !!image?.cloudinaryName && !failed;
  const src = hasImage ? `${CLOUDINARY_BASE}/f_auto,q_auto/${image.cloudinaryName}` : null;

  const frame = (
    <div style={{ background: XRAY.bg, border: `1px solid ${XRAY.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div
        ref={boxRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio,
          background: "#0B0B0C",
          overflow: "hidden",
          touchAction: zoom > 1 ? "none" : "pan-y",
          cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
        }}
        onDoubleClick={onDoubleClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {hasImage ? (
          <img
            src={src}
            alt={image.alt || "Radiograph"}
            onError={() => setFailed(true)}
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragging ? "none" : "transform 0.15s ease-out",
              userSelect: "none",
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#8B8B8F", padding: 20, textAlign: "center" }}>
            <ImageOff size={30} />
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#C7C7CB" }}>Radiograph pending clinical approval</div>
            <div style={{ fontSize: 11.5, color: "#8B8B8F", maxWidth: 240 }}>A licensed image will appear here once sourced and reviewed. Layout and annotations are ready.</div>
          </div>
        )}

        {hasImage && labelsOn && (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {annotations.map((a) => (
                <line key={`ln-${a.id}`} x1={a.x} y1={a.y} x2={a.labelX} y2={a.labelY} stroke="#22C55E" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              ))}
              {annotations.map((a) => (
                <circle key={`dot-${a.id}`} cx={a.x} cy={a.y} r={1.1} fill="#22C55E" stroke="#fff" strokeWidth={0.3} />
              ))}
            </svg>
            {annotations.map((a) => (
              <div
                key={`lbl-${a.id}`}
                style={{ position: "absolute", left: `${a.labelX}%`, top: `${a.labelY}%`, transform: "translate(-50%, -50%)", pointerEvents: "none" }}
              >
                <span style={{ display: "inline-block", background: "rgba(20,20,22,0.85)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>
                  {a.label}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderTop: `1px solid ${XRAY.border}`, background: XRAY.bgWarm, flexWrap: "wrap" }}>
        <ViewerButton icon={ZoomOut} label="Zoom out" onClick={() => applyZoom(zoom - 0.5)} />
        <ViewerButton icon={ZoomIn} label="Zoom in" onClick={() => applyZoom(zoom + 0.5)} />
        <ViewerButton icon={RotateCcw} label="Reset view" onClick={reset} />
        {hasAnnotations && (
          <ViewerButton icon={labelsOn ? EyeOff : Eye} label={labelsOn ? "Hide labels" : "Show labels"} onClick={() => setShowLabels((s) => !s)} active={labelsOn} />
        )}
        <span style={{ flex: 1 }} />
        <ViewerButton icon={fullscreen ? Minimize : Maximize} label={fullscreen ? "Exit full screen" : "Full screen"} onClick={() => setFullscreen((f) => !f)} />
      </div>

      {image && (image.projection || image.source) && (
        <div style={{ padding: "8px 12px 10px", fontSize: 11, color: XRAY.gray, lineHeight: 1.5, borderTop: `1px solid ${XRAY.border}` }}>
          {[image.projection, image.side].filter(Boolean).join(" · ")}
          {image.source && <span> — {image.source}{image.attribution ? `, ${image.attribution}` : ""}</span>}
        </div>
      )}
    </div>
  );

  if (!fullscreen) return frame;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,10,11,0.96)", display: "flex", alignItems: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 680, margin: "0 auto" }}>{frame}</div>
    </div>
  );
}

function ViewerButton({ icon: Icon, label, onClick, active }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 9,
        border: `1px solid ${active ? XRAY.green : XRAY.border}`,
        background: active ? XRAY.greenSoft : "#fff",
        color: active ? XRAY.greenDark : XRAY.gray,
        cursor: "pointer",
      }}
    >
      <Icon size={15} />
    </button>
  );
}
