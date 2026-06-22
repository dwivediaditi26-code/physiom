// PhysioMind Pro AppFull v3.3 — 23 May 2026 — clearRect overlay wipe fix + bilateral knee merge
import React, { useState, useCallback, useRef, useEffect, useMemo, Component, Suspense, lazy } from "react";
import { createPortal } from "react-dom";

// ─── Math Utilities (hoisted to top — used throughout app) ───────────────────
const mid = (a, b) => a && b ? { x:(a.x+b.x)/2, y:(a.y+b.y)/2, visibility: Math.min(a.visibility||0,b.visibility||0) } : null;
const vis = (lm, i, thresh=0.4) => (lm[i]?.visibility||0) > thresh;
const px  = (lm, i, W, H) => lm[i] ? [lm[i].x*W, lm[i].y*H] : null;
const r1  = v => v !== null && v !== undefined && !isNaN(v) ? Math.round(v*10)/10 : null;
const r2  = v => v !== null && v !== undefined && !isNaN(v) ? Math.round(v*100)/100 : null;
const MIN_VIS = 0.45;          // overlay drawing threshold — shows dot even if uncertain
const CLINICAL_MIN_VIS = 0.65; // clinical findings threshold — only fire when confident

function calcAngleDeg(a, b) {
  if (!a || !b) return null;
  let angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  if (angle > 90)  angle -= 180;
  if (angle < -90) angle += 180;
  return Math.round(angle * 10) / 10;
}


// ═══════════════════════════════════════════════════════════════
// LAZY LOADING WRAPPER
// Heavy modules only load when the user navigates to that tab
// Initial bundle: ~300KB instead of 2.4MB
// ═══════════════════════════════════════════════════════════════

// Loading spinner shown while lazy chunk loads
function TabLoader() {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"60px 20px", gap:16,
    }}>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:"3px solid #ede7f6",
        borderTop:"3px solid #7c3aed",
        animation:"spin 0.8s linear infinite",
      }}/>
      <div style={{fontSize:"0.75rem", color:"#7e6a9a", fontWeight:500}}>
        Loading module...
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Wrapper: catches errors in lazy components gracefully
class LazyBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:24, color:"#dc2626", fontSize:"0.8rem",
        background:"#fff5f5", borderRadius:10, border:"1px solid #fca5a5"}}>
        ⚠ Module failed to load. Please refresh the page.
        <div style={{fontSize:"0.65rem", marginTop:4, color:"#6b7280"}}>
          {this.state.error.message}
        </div>
      </div>
    );
    return this.props.children;
  }
}

// Convenience wrapper
function LazyTab({ children }) {
  return (
    <LazyBoundary>
      <Suspense fallback={<TabLoader />}>
        {children}
      </Suspense>
    </LazyBoundary>
  );
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:32,fontFamily:"monospace",background:"#fff",color:"#c00",whiteSpace:"pre-wrap"}}>
        <h2>Runtime Error</h2>
        <p>{this.state.error?.message}</p>
        <pre>{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}


// ─── Global Mobile-Responsive Styles ─────────────────────────────────────────
const MOBILE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { overflow-x: hidden; max-width: 100vw; }
  body { -webkit-text-size-adjust: 100%; touch-action: manipulation; }

  /* ── Layout shell ── */
  .pm-shell { display: flex; flex-direction: column; min-height: 100vh; overflow-x: hidden; }

  /* ── Header ── */
  .pm-header { padding: 0 12px !important; }
  .pm-header-inner { height: 50px !important; gap: 8px; }
  .pm-logo-sub { display: none; }
  @media (min-width: 480px) { .pm-logo-sub { display: block; } }
  @media (min-width: 640px) { .pm-header { padding: 0 20px !important; } .pm-header-inner { height: 54px !important; } }

  /* ── Mobile nav drawer ── */
  .pm-nav-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 150; }
  .pm-nav-drawer {
    position: fixed; left: 0; top: 0; bottom: 0; width: 240px; max-width: 80vw;
    background: #ffffff; border-right: 1px solid #d8cce8;
    z-index: 160; overflow-y: auto; padding: 54px 0 20px;
    transform: translateX(-100%); transition: transform 0.25s ease;
  }
  .pm-nav-drawer.open { transform: translateX(0); }

  /* ── Sidebar (desktop) ── */
  .pm-sidebar {
    width: 195px; min-width: 195px; display: flex; flex-direction: column;
    border-right: 1px solid #d8cce8; background: #f5f0fb;
    position: sticky; top: 54px; height: calc(100vh - 54px); overflow-y: auto;
  }
  @media (max-width: 767px) { .pm-sidebar { display: none !important; } }

  /* ── Hamburger button ── */
  .pm-hamburger {
    display: none; background: transparent; border: 1px solid #d8cce8;
    border-radius: 7px; color: #7c3aed; padding: 6px 9px; cursor: pointer;
    font-size: 1rem; line-height: 1; flex-shrink: 0;
  }
  @media (max-width: 767px) { .pm-hamburger { display: flex; align-items: center; justify-content: center; } }

  /* ── Main content — breathing room ── */
  .pm-main { flex: 1; padding: 18px; overflow-y: auto; overflow-x: hidden; min-width: 0; }
  @media (min-width: 640px) { .pm-main { padding: 28px 32px; } }

  /* ── Body wrapper ── */
  .pm-body { display: flex; flex: 1; max-width: 1400px; margin: 0 auto; width: 100%; min-width: 0; overflow-x: hidden; }

  /* ── Cards & panels — more breathable ── */
  .pm-card { padding: 14px 16px !important; }
  @media (min-width: 480px) { .pm-card { padding: 18px 20px !important; } }
  @media (min-width: 640px) { .pm-card { padding: 22px 24px !important; } }

  /* ── Grids → stack on mobile ── */
  .pm-grid-2 { display: grid; grid-template-columns: 1fr; gap: 8px; }
  @media (min-width: 480px) { .pm-grid-2 { grid-template-columns: 1fr 1fr; } }

  .pm-grid-3 { display: grid; grid-template-columns: 1fr; gap: 8px; }
  @media (min-width: 480px) { .pm-grid-3 { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 768px) { .pm-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }

  .pm-grid-auto { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; }
  @media (max-width: 400px) { .pm-grid-auto { grid-template-columns: 1fr 1fr; } }

  /* ── Flex rows → wrap ── */
  .pm-flex-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
  .pm-flex-wrap > * { min-width: 0; }

  /* ── Button groups ── */
  .pm-btn-row { display: flex; flex-wrap: wrap; gap: 7px; }
  .pm-btn-row > button, .pm-btn-row > a { flex: 1 1 auto; min-width: 80px; text-align: center; }

  /* ── Camera / video / canvas ── */
  .pm-camera-wrap { width: 100%; max-width: 100%; overflow: hidden; height: 100%; }
  .pm-camera-wrap video,
  .pm-camera-wrap canvas { width: 100% !important; max-width: 100% !important; height: 100% !important; object-fit: cover !important; }

  /* ── Camera aspect container ── */
  .pm-cam-aspect { position: relative; width: 100%; background: #f5f0fb; border-radius: 14px; overflow: hidden; aspect-ratio: unset; height: 70vh; max-height: 70vh; }
  @media (max-width: 480px) { .pm-cam-aspect { height: 60vh; max-height: 60vh; border-radius: 10px; } }
  @media (orientation: landscape) and (max-width: 900px) { .pm-cam-aspect { height: 85vh; max-height: 85vh; } }

  /* ── Modals ── */
  .pm-modal-wrap { padding: 12px !important; }
  .pm-modal-box { padding: 16px !important; border-radius: 12px !important; max-height: 88vh !important; }
  @media (min-width: 480px) { .pm-modal-wrap { padding: 20px !important; } .pm-modal-box { padding: 24px !important; } }

  /* ── Tables ── */
  .pm-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pm-table-wrap table { min-width: 480px; }

  /* ── Typography hierarchy — medical professional ── */
  .pm-title { font-size: clamp(1rem, 3vw, 1.35rem); font-weight: 700; letter-spacing: -0.3px; }
  .pm-subtitle { font-size: clamp(0.75rem, 2vw, 0.9rem); font-weight: 600; }
  .pm-label { font-size: clamp(0.65rem, 1.6vw, 0.72rem); font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: inherit; opacity: 0.65; }
  .pm-value { font-size: clamp(0.82rem, 2vw, 0.95rem); font-weight: 500; }
  .pm-section-title { font-size: clamp(0.62rem, 1.5vw, 0.68rem); font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; }
  .pm-metric-value { font-size: clamp(1.4rem, 4vw, 2.2rem); font-weight: 800; letter-spacing: -1px; line-height: 1; }
  .pm-metric-label { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; opacity: 0.6; }

  /* ── SVG illustrations ── */
  .pm-svg-wrap { overflow-x: auto; }
  .pm-svg-wrap svg { max-width: 100%; height: auto; }

  /* ── Diagnosis panel ── */
  .pm-dx-entry { flex-direction: column; gap: 6px; }
  @media (min-width: 480px) { .pm-dx-entry { flex-direction: row; } }

  /* ── Measurement chips ── */
  .pm-chip-row { display: flex; flex-wrap: wrap; gap: 5px; }

  /* ── Comparison viewer ── */
  .pm-compare-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 420px) { .pm-compare-grid { grid-template-columns: 1fr 1fr; } }

  /* ── Bottom nav drawer (mobile only) ── */
  .pm-bnav {
    display: none; position: fixed; bottom: 0; left: 0; right: 0;
    z-index: 140; flex-direction: column;
    background: #ffffff; border-top: 1px solid #d8cce8;
    transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
    max-height: 80vh;
  }
  @media (max-width: 767px) { .pm-bnav { display: flex; } }
  @media (max-width: 767px) {
    .pm-live-chip { display: none !important; }
    .pm-patients-btn { display: none !important; }
    .pm-header { padding: 0 12px !important; }
  }
  /* .pm-bnav.bnav-hidden — removed: nav is now always visible */

  /* Pull handle — removed (nav is now always visible) */
  .pm-bnav-handle { display: none !important; }

  /* Tab strip — always visible inside drawer */
  .pm-bnav-tabs {
    display: flex; overflow-x: auto; scrollbar-width: none;
    border-bottom: 1px solid #d8cce8; flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .pm-bnav-tabs::-webkit-scrollbar { display: none; }
  .pm-bnav-tab {
    flex: 1 0 auto; min-width: 60px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 3px;
    padding: 10px 4px 9px; background: transparent; border: none;
    cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .pm-bnav-tab.active { background: rgba(124,58,237,0.07); border-bottom-color: #7c3aed; }
  .pm-bnav-tab-icon { font-size: 1.05rem; line-height: 1; }
  .pm-bnav-tab-label { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.3px; color: #7e6a9a; white-space: nowrap; text-transform: uppercase; }
  .pm-bnav-tab.active .pm-bnav-tab-label { color: #7c3aed; }

  /* Expandable sub-nav panel */
  .pm-bnav-panel {
    overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;
    padding: 6px 8px 8px; display: none; flex-direction: column; gap: 2px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
  .pm-bnav-panel.open { display: flex; }

  /* Sub-nav items */
  .pm-bnav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 9px; cursor: pointer;
    border: 1px solid transparent; transition: all 0.13s; font-family: inherit;
    background: transparent; width: 100%; text-align: left; min-height: 44px;
  }
  .pm-bnav-item.active { background: rgba(124,58,237,0.10); border-color: rgba(124,58,237,0.22); }
  .pm-bnav-item-icon { font-size: 1.1rem; flex-shrink: 0; opacity: 0.75; }
  .pm-bnav-item.active .pm-bnav-item-icon { opacity: 1; }
  .pm-bnav-item-label { font-size: 0.88rem; font-weight: 600; color: #3b1f6b; flex: 1; }
  .pm-bnav-item.active .pm-bnav-item-label { color: #7c3aed; font-weight: 700; }
  .pm-bnav-item-pct { font-size: 0.55rem; font-weight: 700; color: #9a82c0; background: #f0ebff; padding: 1px 5px; border-radius: 4px; }
  .pm-bnav-item-done { font-size: 0.55rem; color: #059669; font-weight: 800; }

  /* Run Diagnose row at bottom of panel */
  .pm-bnav-dx {
    margin-top: 4px; padding: 11px 14px; border-radius: 9px; cursor: pointer;
    background: linear-gradient(135deg,#7c3aed,#9333ea); border: none;
    color: #fff; font-weight: 800; font-size: 0.76rem; font-family: inherit;
    width: 100%; letter-spacing: 0.3px;
  }

  /* Safe-area padding for main content */
  @media (max-width: 767px) { .pm-main { padding-bottom: calc(62px + env(safe-area-inset-bottom) + 10px) !important; } }

  /* ── Landscape mobile ── */
  @media (orientation: landscape) and (max-width: 900px) {
    .pm-header-inner { height: 44px !important; }
    .pm-main { padding: 10px !important; padding-bottom: calc(52px + env(safe-area-inset-bottom) + 10px) !important; }
  }

  /* ── Prevent text overflow ── */
  .pm-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  /* ── Form inputs full-width ── */
  input, select, textarea { max-width: 100%; }

  /* ── Images ── */
  img { max-width: 100%; height: auto; }

  /* ── Overflow guard ── */
  .pm-overflow-guard { overflow-x: hidden; max-width: 100%; }

  /* ── Pulse animation for alerts ── */
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }
  /* ── Fade in for cards ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .pm-fade-in { animation: fadeUp 0.25s ease forwards; }

  /* ── Live indicator pulse for SOAP real-time engine ── */
  @keyframes pm-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
    50% { opacity: 0.5; box-shadow: 0 0 0 6px rgba(16,185,129,0.05); }
  }

  /* ── Theme transitions ── */
  *, *::before, *::after {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.1s ease !important;
  }
  /* Exceptions — no transition on SVG, canvas, animations */
  svg *, canvas, .no-transition, input[type=range] { transition: none !important; }

  /* ── Light mode overrides ── */
  [data-theme="light"] .pm-bnav { background: #ffffff !important; border-top: 1px solid #d8cce8 !important; }
  [data-theme="light"] .pm-bnav-tab.active { background: rgba(124,58,237,0.08) !important; }
  [data-theme="light"] .pm-bnav-tab-label { color: #7e6a9a !important; }
  [data-theme="light"] .pm-bnav-tab.active .pm-bnav-tab-label { color: #7c3aed !important; }
  [data-theme="light"] .pm-bnav-handle { background: #ffffff !important; border-color: #d8cce8 !important; }
  [data-theme="light"] .pm-bnav-item-label { color: #3b1f6b !important; }
  [data-theme="light"] .pm-bnav-item.active .pm-bnav-item-label { color: #7c3aed !important; }
  [data-theme="light"] .pm-nav-overlay { background: rgba(90,40,130,0.35) !important; }
  [data-theme="light"] input, [data-theme="light"] select, [data-theme="light"] textarea { color-scheme: light; }
  [data-theme="light"] input[type=range] { accent-color: #7c3aed; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #f5f0fb; }
  ::-webkit-scrollbar-thumb { background: #d8cce8; border-radius: 4px; }

  [data-theme="dark"] ::-webkit-scrollbar { width: 6px; }
  [data-theme="dark"] ::-webkit-scrollbar-track { background: #f5f0fb; }
  [data-theme="dark"] ::-webkit-scrollbar-thumb { background: #d8cce8; border-radius: 4px; }

  /* ── Light mode SVG text ── */
  [data-theme="light"] svg text { fill: #374151; }
`;

function MobileStyleInjector() {
  useEffect(() => {
    const id = "pm-mobile-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id; el.textContent = MOBILE_CSS;
    document.head.appendChild(el);
    // Set initial theme from localStorage before first paint
    try {
      const t = localStorage.getItem("physio_theme") || "light";
      document.documentElement.setAttribute("data-theme", t);
      document.body.style.background = "#faf8fc";
    } catch {}
    return () => { const s = document.getElementById(id); if (s) s.remove(); };
  }, []);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME SYSTEM — Dark (default) + Light mode
// ═══════════════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    // Mauve & White — elegant clinical
    bg:"#faf8fc",      surface:"#ffffff",  s2:"#f5f0fb",  s3:"#ede7f6",
    border:"#d8cce8",  accent:"#7c3aed",  a2:"#9333ea",  a3:"#059669",
    a4:"#b45309",      a5:"#dc2626",      text:"#1a1025", muted:"#7e6a9a",
    red:"#dc2626",     green:"#059669",   yellow:"#b45309", purple:"#7c3aed",
    card:"#ffffff",    inputBg:"#f5f0fb", inputBorder:"#c8b8e0",
    navBg:"#f5f0fb",   headerBg:"#ffffff",
    shadow:"rgba(90,40,130,0.10)", isDark:false,
    accentSoft:"rgba(124,58,237,0.08)", accentBorder:"rgba(124,58,237,0.22)",
    successSoft:"rgba(5,150,105,0.07)", warnSoft:"rgba(180,83,9,0.07)",
    dangerSoft:"rgba(220,38,38,0.07)",
    blue:"#7c3aed",
  },
  light: {
    // Same mauve/white palette
    bg:"#faf8fc",      surface:"#ffffff",  s2:"#f5f0fb",  s3:"#ede7f6",
    border:"#d8cce8",  accent:"#7c3aed",  a2:"#9333ea",  a3:"#059669",
    a4:"#b45309",      a5:"#dc2626",      text:"#1a1025", muted:"#7e6a9a",
    red:"#dc2626",     green:"#059669",   yellow:"#b45309", purple:"#7c3aed",
    card:"#ffffff",    inputBg:"#f5f0fb", inputBorder:"#c8b8e0",
    navBg:"#f5f0fb",   headerBg:"#ffffff",
    shadow:"rgba(90,40,130,0.10)", isDark:false,
    accentSoft:"rgba(124,58,237,0.08)", accentBorder:"rgba(124,58,237,0.22)",
    successSoft:"rgba(5,150,105,0.07)", warnSoft:"rgba(180,83,9,0.07)",
    dangerSoft:"rgba(220,38,38,0.07)",
    blue:"#7c3aed",
  }
};

// Global theme state — read by all components via getC()
let _currentTheme = "light";
try { _currentTheme = localStorage.getItem("physio_theme") || "light"; } catch {}
let _themeListeners = [];
function getC() { return THEMES[_currentTheme]; }
function setTheme(t) {
  _currentTheme = t;
  try { localStorage.setItem("physio_theme", t); } catch {}
  document.documentElement.setAttribute("data-theme", t);
  _themeListeners.forEach(fn => fn(t));
}
function useTheme() {
  const [theme, setT] = useState(_currentTheme);
  useEffect(() => {
    const fn = (t) => setT(t);
    _themeListeners.push(fn);
    return () => { _themeListeners = _themeListeners.filter(f => f !== fn); };
  }, []);
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark"), C: THEMES[theme] };
}

// Backwards-compatible C for components that use it statically
// These will update when theme changes via useTheme() in App

const C = getC();

export { TabLoader, LazyBoundary, LazyTab, ErrorBoundary, MobileStyleInjector, MOBILE_CSS };
export { THEMES, getC, setTheme, useTheme, C };
export { mid, vis, px, r1, r2, MIN_VIS, CLINICAL_MIN_VIS, calcAngleDeg };
