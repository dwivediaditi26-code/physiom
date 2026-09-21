import { useEffect } from "react";

// Handwritten "clinical notebook" visual system for Clinical Learning
// (2026-09-20, Aditi's brief: "handwritten typography system... beautiful
// handwritten physiotherapy notebook that became an interactive mobile
// app"). One font (Kalam) for every piece of text, hierarchy from size/
// weight/color/underline only, warm paper surfaces instead of the app's
// usual white-and-violet Tailwind cards. Scoped entirely under `.nb-root`
// so it never leaks into the rest of Learn (Practical Skills, Study Mode)
// or the wider app.

export const NB_BG = "#FBF5E7";

const NB_CSS = `
.nb-root{
  --nb-bg:#FBF5E7; --nb-paper:#FFFDF6; --nb-ink:#332B1E; --nb-ink-soft:#6E664F; --nb-ink-faint:#A99C7C;
  --nb-line:#E6D9B8; --nb-line-strong:#D4C193;
  --nb-sage:#5C7A52; --nb-sage-bg:#E7EFDD; --nb-sage-ink:#3B5230;
  --nb-terra:#B85E33; --nb-terra-bg:#F6E2CF; --nb-terra-ink:#8A431C;
  --nb-blue:#3E6C86; --nb-blue-bg:#DCEAF0; --nb-blue-ink:#264C60;
  --nb-berry:#9C3B4C; --nb-berry-bg:#F5DBE0; --nb-berry-ink:#732433;
  --nb-mark:#F6D65A;
  background:var(--nb-bg); color:var(--nb-ink);
  font-family:'Kalam','Comic Sans MS',cursive; line-height:1.55;
}
.nb-root, .nb-root *{ box-sizing:border-box; }
.nb-h1{ font-size:26px; font-weight:700; line-height:1.25; }
.nb-h2{ font-size:20px; font-weight:700; line-height:1.3; }
.nb-h3{ font-size:16.5px; font-weight:700; }
.nb-sub{ font-size:14.5px; color:var(--nb-ink-soft); }
.nb-label{ font-size:12px; font-weight:700; letter-spacing:.02em; color:var(--nb-ink-faint); text-transform:uppercase; }
.nb-body{ font-size:15.5px; color:var(--nb-ink); }
.nb-note{ font-size:13px; color:var(--nb-ink-soft); }
.nb-mark{ background:linear-gradient(180deg,transparent 58%,var(--nb-mark) 58%,var(--nb-mark) 92%,transparent 92%); padding:0 1px; }
.nb-card{ background:var(--nb-paper); border:1.5px solid var(--nb-line); border-radius:18px; padding:14px 16px; }
.nb-card + .nb-card{ margin-top:12px; }
.nb-pill{ display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; border-radius:999px; padding:4px 11px; border:1.5px solid var(--nb-line-strong); background:var(--nb-paper); color:var(--nb-ink-soft); }
.nb-pill-active{ background:var(--nb-ink); border-color:var(--nb-ink); color:var(--nb-paper); }
.nb-btn{ font-family:inherit; font-weight:700; font-size:15px; border-radius:16px; padding:12px 18px; border:2px solid var(--nb-ink); background:var(--nb-ink); color:var(--nb-paper); display:flex; align-items:center; justify-content:center; gap:6px; }
.nb-btn:active{ transform:scale(.99); }
.nb-btn-outline{ background:transparent; color:var(--nb-ink); }
.nb-sticky{ background:var(--nb-mark); border-radius:4px 14px 4px 14px; padding:12px 14px; transform:rotate(-0.6deg); box-shadow:2px 3px 0 rgba(51,43,30,.08); }
.nb-check{ width:22px; height:22px; border:2px solid var(--nb-line-strong); border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.nb-check-on{ border-color:var(--nb-sage); background:var(--nb-sage-bg); }
@media (prefers-reduced-motion:no-preference){ .nb-step-in{ animation:nb-in .25s ease-out; } }
@keyframes nb-in{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }
`;

let injected = false;
export function useNotebookFont() {
  useEffect(() => {
    if (document.getElementById("nb-font")) return;
    const l = document.createElement("link");
    l.id = "nb-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap";
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
  foundational:{ label: "Foundational / textbook", dot: "#8C8368" },
};
export function EvidenceBadge({ tier }) {
  const t = TIERS[tier] || TIERS.foundational;
  return (
    <span className="nb-pill" style={{ marginBottom: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: t.dot, display: "inline-block" }} aria-hidden="true" />
      {t.label}
    </span>
  );
}

// A loose, hand-drawn connecting line between journey steps.
export function DoodleConnector({ done }) {
  return (
    <svg width="24" height="34" viewBox="0 0 24 34" aria-hidden="true" style={{ display: "block", margin: "0 auto" }}>
      <path d="M12 1 C 8 10, 16 14, 11 22 C 8 27, 15 29, 12 33" fill="none" stroke={done ? "var(--nb-sage)" : "var(--nb-line-strong)"} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={done ? "0" : "1 6"} />
    </svg>
  );
}

// A hand-drawn arrow, used inline between short flow labels ("Normal -> What changes").
export function DoodleArrow() {
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M1 8 C 10 5, 16 11, 22 7" fill="none" stroke="var(--nb-ink-faint)" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 4 C 19 6, 21 7, 23 7 C 21 8, 19 10, 18 12" fill="none" stroke="var(--nb-ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A wobbly hand-drawn circle, used to ring a key term.
export function DoodleCircle({ children }) {
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "1px 9px" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M6 20 C 4 6, 30 2, 50 3 C 74 4, 97 8, 94 21 C 97 33, 68 38, 48 37 C 26 38, 3 34, 6 20 Z" fill="none" stroke="var(--nb-terra)" strokeWidth="2.2" />
      </svg>
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
}
