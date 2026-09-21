import { useEffect } from "react";

// Handwritten "physio notebook" visual system (2026-09-20, Aditi shared a
// real handwritten-notes Instagram page as the reference: white ruled
// paper, red margin line, yellow highlighter on key terms, red circles
// around key words/numbers, bold underlined all-caps-ish headings, numbered
// sections flowing as continuous notes -- not a grid of app cards). Scoped
// entirely under `.nb-root`, mounted only inside the Low Back Pain page
// (LowBackPainJourney.jsx) -- the rest of Clinical Learning stays as it was.

export const NB_BG = "#F6F3EA";

const NB_CSS = `
.nb-root{
  --nb-bg:#FFFFFF; --nb-paper:#FFFFFF; --nb-ink:#221C10; --nb-ink-soft:#5A5340; --nb-ink-faint:#948B70;
  --nb-line:#D9E0E8; --nb-line-strong:#C7B8A0;
  --nb-red:#B23B32; --nb-red-bg:#FBEBE8;
  --nb-sage:#4C8C3C; --nb-sage-bg:#E7EFDD;
  --nb-mark:#F5DE4A;
  background:var(--nb-bg); color:var(--nb-ink);
  font-family:'Itim','Comic Sans MS',cursive; font-weight:400; line-height:1.5;
}
.nb-root, .nb-root *{ box-sizing:border-box; }
.nb-h1{ font-size:24px; font-weight:400; line-height:1.25; }
.nb-h2{ font-size:19px; font-weight:400; line-height:1.3; }
.nb-h3{ font-size:16px; font-weight:400; }
.nb-sub{ font-size:14.5px; color:var(--nb-ink-soft); }
.nb-label{ font-size:12.5px; font-weight:400; letter-spacing:.02em; color:var(--nb-ink-faint); text-transform:uppercase; }
.nb-body{ font-size:15.5px; color:var(--nb-ink); }
.nb-note{ font-size:13px; color:var(--nb-ink-soft); }
.nb-mark{ background:linear-gradient(180deg,transparent 55%,var(--nb-mark) 55%,var(--nb-mark) 90%,transparent 90%); padding:0 2px; }
.nb-mark-block{ background:var(--nb-mark); padding:1px 5px; border-radius:2px; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:4px; }
.nb-table{ width:100%; border-collapse:collapse; margin:10px 0; background:var(--nb-paper); font-size:14.5px; }
.nb-table th,.nb-table td{ border:1.5px solid var(--nb-ink); padding:7px 9px; text-align:left; }
.nb-table th{ font-weight:700; background:var(--nb-sage-bg); }
.nb-pill{ display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; border-radius:999px; padding:3px 10px; border:1px solid var(--nb-line-strong); background:var(--nb-paper); color:var(--nb-ink-soft); }
.nb-badge{ position:absolute; top:0; right:0; background:var(--nb-ink); color:var(--nb-paper); font-size:12px; font-weight:700; border-radius:999px; padding:2px 11px; }
.nb-link{ font-family:inherit; font-weight:700; font-size:14.5px; color:var(--nb-red); background:none; border:none; padding:4px 0; cursor:pointer; display:inline-flex; align-items:center; gap:4px; }
.nb-notes{
  position:relative; background-color:var(--nb-paper); border-radius:8px; padding:18px 16px 18px 28px; border:1px solid var(--nb-line-strong);
  background-image:
    linear-gradient(to right, transparent 12px, var(--nb-red) 12px, var(--nb-red) 13px, transparent 13px),
    repeating-linear-gradient(to bottom, transparent, transparent 27px, var(--nb-line) 28px);
}
.nb-box{ border:1.5px solid var(--nb-ink); border-radius:4px; padding:10px 13px; margin:12px 0; background:var(--nb-paper); }
.nb-box-red{ border-color:var(--nb-red); }
.nb-divider{ border:none; border-top:1px dashed var(--nb-line-strong); margin:16px 0; }
.nb-index-row{ width:100%; display:flex; align-items:baseline; gap:10px; text-align:left; background:none; border:none; padding:10px 2px; border-bottom:1px dashed var(--nb-line-strong); cursor:pointer; }
@media (prefers-reduced-motion:no-preference){ .nb-step-in{ animation:nb-in .2s ease-out; } }
@keyframes nb-in{ from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:none;} }
.nb-flip{ overflow-x:hidden; }
.nb-flip > *{ will-change:transform; }
@keyframes nb-slide-next-kf{ from{ transform:translateX(28px); opacity:.2; } to{ transform:translateX(0); opacity:1; } }
@keyframes nb-slide-prev-kf{ from{ transform:translateX(-28px); opacity:.2; } to{ transform:translateX(0); opacity:1; } }
.nb-flip-next > *{ animation:nb-slide-next-kf .3s ease-out; }
.nb-flip-prev > *{ animation:nb-slide-prev-kf .3s ease-out; }
@media (prefers-reduced-motion:reduce){ .nb-flip-next > *, .nb-flip-prev > *{ animation:none; } }
`;

let injected = false;
export function useNotebookFont() {
  useEffect(() => {
    if (document.getElementById("nb-font")) return;
    const l = document.createElement("link");
    l.id = "nb-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Itim&display=swap";
    document.head.appendChild(l);
  }, []);
}
export function NotebookFont() {
  useNotebookFont();
  if (injected) return <style>{NB_CSS}</style>;
  injected = true;
  return <style>{NB_CSS}</style>;
}

// Evidence-tier badge -- only ever attach the tier that can actually be
// justified for that specific claim (see conditions/lowBackPain.js).
const TIERS = {
  strong:      { label: "Strong evidence", dot: "#4C8C3C" },
  moderate:    { label: "Moderate evidence", dot: "#3E6C86" },
  limited:     { label: "Limited / uncertain", dot: "#C99A2E" },
  foundational:{ label: "Foundational / textbook", dot: "#948B70" },
};
export function EvidenceBadge({ tier }) {
  const t = TIERS[tier] || TIERS.foundational;
  return (
    <span className="nb-pill" style={{ marginBottom: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: t.dot, display: "inline-block" }} aria-hidden="true" />
      {t.label}
    </span>
  );
}

// A loose, hand-drawn connecting line -- used both between contents-page
// entries (colored by progress) and between lines of flowing notes on a
// page (quiet, neutral ink).
export function DoodleConnector({ color = "var(--nb-line-strong)", dashed = false, short = false }) {
  const h = short ? 20 : 34;
  return (
    <svg width="20" height={h} viewBox={`0 0 20 ${h}`} aria-hidden="true" style={{ display: "block", margin: short ? "2px 0 2px 4px" : "0 auto" }}>
      <path d={short ? "M10 1 C 7 6, 13 9, 10 13 C 7 16, 12 17, 10 19" : "M10 1 C 6 10, 14 14, 9 22 C 6 27, 13 29, 10 33"} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray={dashed ? "1 6" : "0"} />
    </svg>
  );
}

// A wobbly hand-drawn underline, dropped just below a heading.
export function Underline({ width = 130, color = "var(--nb-ink)" }) {
  return (
    <svg width={width} height="8" viewBox="0 0 130 8" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", marginTop: 1 }}>
      <path d="M2 5 C 22 2, 42 7, 64 4 C 86 1, 108 6, 128 3" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// A wobbly hand-drawn red circle around a key term or number.
export function DoodleCircle({ children }) {
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "1px 10px" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M6 20 C 4 6, 30 2, 50 3 C 74 4, 97 8, 94 21 C 97 33, 68 38, 48 37 C 26 38, 3 34, 6 20 Z" fill="none" stroke="var(--nb-red)" strokeWidth="2" />
      </svg>
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
}
