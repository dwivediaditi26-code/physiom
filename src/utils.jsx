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
  .pm-header-inner { height: 52px !important; gap: 8px; }
  .pm-logo-sub { display: none; }
  @media (min-width: 480px) { .pm-logo-sub { display: block; } }
  @media (min-width: 640px) { .pm-header { padding: 0 20px !important; } .pm-header-inner { height: 56px !important; } }

  /* ── Mobile nav drawer ── */
  .pm-nav-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 150; }
  .pm-nav-drawer {
    position: fixed; left: 0; top: 0; bottom: 0; width: 260px; max-width: 82vw;
    background: #ffffff; border-right: 1px solid #d8cce8;
    z-index: 160; overflow-y: auto; padding: 60px 0 24px;
    transform: translateX(-100%); transition: transform 0.25s ease;
    box-shadow: 4px 0 24px rgba(0,0,0,0.12);
  }
  .pm-nav-drawer.open { transform: translateX(0); }

  /* ── Sidebar (desktop only) ── */
  .pm-sidebar {
    width: 195px; min-width: 195px; display: flex; flex-direction: column;
    border-right: 1px solid #d8cce8; background: #f5f0fb;
    position: sticky; top: 54px; height: calc(100vh - 54px); overflow-y: auto;
  }
  @media (max-width: 767px) { .pm-sidebar { display: none !important; } }

  /* ── Hamburger ── */
  .pm-hamburger {
    display: none; background: transparent; border: 1px solid #d8cce8;
    border-radius: 8px; color: #7c3aed; padding: 8px 11px; cursor: pointer;
    font-size: 1.1rem; line-height: 1; flex-shrink: 0; min-height: 40px; min-width: 40px;
    align-items: center; justify-content: center;
  }
  @media (max-width: 767px) { .pm-hamburger { display: flex; } }

  /* ── Main content ── */
  .pm-main { flex: 1; padding: 14px 14px 0 14px; overflow-y: auto; overflow-x: hidden; min-width: 0; }
  @media (min-width: 480px) { .pm-main { padding: 20px 20px 0 20px; } }
  @media (min-width: 640px) { .pm-main { padding: 28px 32px; } }

  /* ── Body wrapper ── */
  .pm-body { display: flex; flex: 1; max-width: 1400px; margin: 0 auto; width: 100%; min-width: 0; overflow-x: hidden; }

  /* ── Cards ── */
  .pm-card { padding: 14px 14px !important; border-radius: 12px !important; }
  @media (min-width: 480px) { .pm-card { padding: 18px 20px !important; } }
  @media (min-width: 640px) { .pm-card { padding: 22px 24px !important; } }

  /* ── Global touch targets — EVERY button/input gets 44px min ── */
  @media (max-width: 767px) {
    button:not(.pm-bnav-tab):not(.pm-bnav-item):not(.pm-bnav-dx):not(.pm-rom-qual-btn):not(.pm-region-chip) {
      min-height: 40px;
    }
    input, select, textarea {
      min-height: 44px !important;
      font-size: 16px !important;
      padding: 10px 12px !important;
      border-radius: 8px !important;
    }
    select { padding-right: 32px !important; }
    label { font-size: 0.82rem !important; font-weight: 600 !important; margin-bottom: 5px !important; display: block; }
  }

  /* ── Grids → stack on mobile ── */
  .pm-grid-2 { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 480px) { .pm-grid-2 { grid-template-columns: 1fr 1fr; } }

  .pm-grid-3 { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 480px) { .pm-grid-3 { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 768px) { .pm-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }

  .pm-grid-auto { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  @media (max-width: 400px) { .pm-grid-auto { grid-template-columns: 1fr 1fr; } }

  /* ── Flex rows ── */
  .pm-flex-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
  .pm-flex-wrap > * { min-width: 0; }

  /* ── Button groups ── */
  .pm-btn-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .pm-btn-row > button, .pm-btn-row > a { flex: 1 1 auto; min-width: 90px; text-align: center; min-height: 44px; }

  /* ── Camera ── */
  .pm-camera-wrap { width: 100%; max-width: 100%; overflow: hidden; height: 100%; }
  .pm-camera-wrap video, .pm-camera-wrap canvas { width: 100% !important; max-width: 100% !important; height: 100% !important; object-fit: cover !important; }
  .pm-cam-aspect { position: relative; width: 100%; background: #f5f0fb; border-radius: 14px; overflow: hidden; aspect-ratio: unset; height: 70vh; max-height: 70vh; }
  @media (max-width: 480px) { .pm-cam-aspect { height: 60vh; max-height: 60vh; border-radius: 10px; } }
  @media (orientation: landscape) and (max-width: 900px) { .pm-cam-aspect { height: 85vh; max-height: 85vh; } }

  /* ── Modals ── */
  .pm-modal-wrap { padding: 10px !important; }
  .pm-modal-box { padding: 16px !important; border-radius: 14px !important; max-height: 90vh !important; width: 100% !important; }
  @media (min-width: 480px) { .pm-modal-wrap { padding: 20px !important; } .pm-modal-box { padding: 24px !important; } }

  /* ── Tables ── */
  .pm-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pm-table-wrap table { min-width: 480px; }

  /* ── Typography ── */
  .pm-title { font-size: clamp(1rem, 3.5vw, 1.35rem); font-weight: 700; letter-spacing: -0.3px; }
  .pm-subtitle { font-size: clamp(0.8rem, 2.2vw, 0.9rem); font-weight: 600; }
  .pm-label { font-size: clamp(0.7rem, 1.8vw, 0.75rem); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .pm-value { font-size: clamp(0.85rem, 2.2vw, 0.95rem); font-weight: 500; }
  .pm-section-title { font-size: clamp(0.65rem, 1.6vw, 0.72rem); font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; }
  .pm-metric-value { font-size: clamp(1.6rem, 5vw, 2.2rem); font-weight: 800; letter-spacing: -1px; line-height: 1; }
  .pm-metric-label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; opacity: 0.6; }

  /* ── SVG ── */
  .pm-svg-wrap { overflow-x: auto; }
  .pm-svg-wrap svg { max-width: 100%; height: auto; }

  /* ── Diagnosis panel ── */
  .pm-dx-entry { flex-direction: column; gap: 6px; }
  @media (min-width: 480px) { .pm-dx-entry { flex-direction: row; } }

  /* ── Measurement chips ── */
  .pm-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }

  /* ── Comparison viewer ── */
  .pm-compare-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 420px) { .pm-compare-grid { grid-template-columns: 1fr 1fr; } }

  /* ── Bottom nav (mobile only) ── */
  .pm-bnav {
    display: none; position: fixed; bottom: 0; left: 0; right: 0;
    z-index: 140; flex-direction: column;
    background: #ffffff; border-top: 2px solid #ede9f8;
    box-shadow: 0 -4px 20px rgba(124,58,237,0.10);
    max-height: 75vh;
  }
  @media (max-width: 767px) { .pm-bnav { display: flex; } }
  @media (max-width: 767px) {
    .pm-live-chip { display: none !important; }
    .pm-patients-btn { display: none !important; }
    .pm-header { padding: 0 12px !important; }
  }

  .pm-bnav-handle { display: none !important; }

  /* ── Tab strip ── */
  .pm-bnav-tabs {
    display: flex; overflow-x: auto; scrollbar-width: none;
    border-top: 1px solid #ede9f8; flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom);
    background: #faf8ff;
  }
  .pm-bnav-tabs::-webkit-scrollbar { display: none; }
  .pm-bnav-tab {
    flex: 1 0 auto; min-width: 56px; max-width: 80px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 4px;
    padding: 10px 6px 8px; background: transparent; border: none; border-top: 3px solid transparent;
    cursor: pointer; font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
    min-height: 52px;
  }
  .pm-bnav-tab.active { background: rgba(124,58,237,0.06); border-top-color: #7c3aed; }
  .pm-bnav-tab-icon { font-size: 1.2rem; line-height: 1; }
  .pm-bnav-tab-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2px; color: #9a82c0; white-space: nowrap; text-transform: uppercase; }
  .pm-bnav-tab.active .pm-bnav-tab-label { color: #7c3aed; }

  /* ── Sub-nav panel ── */
  .pm-bnav-panel {
    overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;
    padding: 8px 10px; display: none; flex-direction: column; gap: 3px;
    padding-bottom: calc(6px + env(safe-area-inset-bottom));
    max-height: calc(75vh - 56px);
  }
  .pm-bnav-panel.open { display: flex; }

  /* ── Sub-nav items ── */
  .pm-bnav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 16px; border-radius: 10px; cursor: pointer;
    border: 1px solid transparent; transition: all 0.13s; font-family: inherit;
    background: transparent; width: 100%; text-align: left; min-height: 52px;
  }
  .pm-bnav-item.active { background: rgba(124,58,237,0.10); border-color: rgba(124,58,237,0.25); }
  .pm-bnav-item:active { background: rgba(124,58,237,0.15); }
  .pm-bnav-item-icon { font-size: 1.2rem; flex-shrink: 0; opacity: 0.8; }
  .pm-bnav-item.active .pm-bnav-item-icon { opacity: 1; }
  .pm-bnav-item-label { font-size: 0.92rem; font-weight: 600; color: #3b1f6b; flex: 1; }
  .pm-bnav-item.active .pm-bnav-item-label { color: #7c3aed; font-weight: 700; }
  .pm-bnav-item-pct { font-size: 0.6rem; font-weight: 700; color: #9a82c0; background: #f0ebff; padding: 2px 7px; border-radius: 5px; }
  .pm-bnav-item-done { font-size: 0.7rem; color: #059669; font-weight: 800; }

  /* ── Patient panel PDF buttons ── */
  .pm-bnav-pdf-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border-radius: 10px; cursor: pointer;
    border: 1px solid rgba(124,58,237,0.2); transition: all 0.13s;
    background: rgba(124,58,237,0.06); width: 100%; text-align: left;
    min-height: 52px; font-family: inherit; font-size: 0.92rem; font-weight: 700;
    color: #5b21b6;
  }
  .pm-bnav-pdf-btn:active { background: rgba(124,58,237,0.15); }

  /* ── Diagnose button ── */
  .pm-bnav-dx {
    margin-top: 6px; padding: 14px 16px; border-radius: 10px; cursor: pointer;
    background: linear-gradient(135deg,#7c3aed,#9333ea); border: none;
    color: #fff; font-weight: 800; font-size: 0.82rem; font-family: inherit;
    width: 100%; letter-spacing: 0.3px; min-height: 52px;
  }

  /* ── Safe area ── */
  @media (max-width: 767px) { .pm-main { padding-bottom: calc(68px + env(safe-area-inset-bottom) + 10px) !important; } }

  /* ── Landscape mobile ── */
  @media (orientation: landscape) and (max-width: 900px) {
    .pm-header-inner { height: 44px !important; }
    .pm-main { padding: 10px !important; padding-bottom: calc(54px + env(safe-area-inset-bottom) + 10px) !important; }
  }

  /* ── Overflow prevention ── */
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

  /* ════════════════════════════════════════════════════
     RESPONSIVE GRID OVERRIDES
     !important overrides React inline styles globally
     across all components — no per-file edits needed.
  ════════════════════════════════════════════════════ */

  /* 3/4-col explicit grids → 2-col at ≤480px */
  @media (max-width: 480px) {
    [style*="1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
    [style*="repeat(3,"] { grid-template-columns: 1fr 1fr !important; }
    [style*="repeat(4,"] { grid-template-columns: 1fr 1fr !important; }
    [style*="80px 1fr"]  { grid-template-columns: 44px 1fr 1fr !important; }
    [style*="90px 1fr"]  { grid-template-columns: 44px 1fr 1fr !important; }
  }

  /* All multi-col fr grids → 1-col at ≤400px */
  @media (max-width: 400px) {
    [style*="1fr 1fr"]   { grid-template-columns: 1fr !important; }
    [style*="repeat(2,"] { grid-template-columns: 1fr !important; }
    [style*="repeat(3,"] { grid-template-columns: 1fr !important; }
    [style*="repeat(4,"] { grid-template-columns: 1fr !important; }
    [style*="80px 1fr"]  { grid-template-columns: 1fr !important; }
    [style*="90px 1fr"]  { grid-template-columns: 1fr !important; }
  }

  /* Action bars (space-between) → wrap on tiny screens */
  @media (max-width: 380px) {
    [style*="space-between"] { flex-wrap: wrap !important; gap: 8px !important; }
  }

  /* Stepper row — horizontal scroll */
  .pm-stepper-row {
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 4px;
  }
  .pm-stepper-row::-webkit-scrollbar { display: none; }

  /* Touch targets */
  @media (max-width: 767px) {
    button:not(.pm-rom-qual-btn) { min-height: 40px !important; }
  }

  /* ── Show/hide helpers ── */
  .pm-mobile-only { display: none; }
  @media (max-width: 767px) {
    .pm-mobile-only { display: block; }
    .pm-desktop-only { display: none !important; }
  }

  /* ── Mobile-only compact header ── */
  .pm-mobile-hdr { display: none; }
  @media (max-width: 767px) {
    .pm-mobile-hdr {
      display: flex; align-items: center; gap: 9px;
      padding: 10px 14px; position: sticky; top: 0; z-index: 101;
      min-height: 64px; flex-shrink: 0;
    }
    .pm-mobile-hdr .pm-hamburger { min-height: 32px !important; min-width: 32px !important; padding: 5px 7px !important; }
    /* Hide desktop header and both patient bars on mobile */
    .pm-header { display: none !important; }
    .pm-patient-bar { display: none !important; }
  }

  /* ── Mobile inline search bar ── */
  .pm-mobile-search {
    display: none;
  }
  @media (max-width: 767px) {
    .pm-mobile-search {
      display: flex; align-items: center; gap: 7px;
      padding: 4px 10px; position: sticky; top: 42px; z-index: 100;
      border-bottom: 1px solid #e8dff8;
    }
    .pm-mobile-search input {
      min-height: 34px !important; padding: 5px 10px !important;
      font-size: 0.82rem !important; border-radius: 7px !important;
      font-size: 16px !important;
    }
    .pm-mobile-search-cancel {
      font-size: 0.78rem; font-weight: 700; background: none; border: none;
      cursor: pointer; padding: 0 2px; min-height: 32px !important; white-space: nowrap;
    }
  }

  /* ── Region chips (scrollable pill row) ── */
  .pm-region-chips-scroll {
    display: flex; gap: 5px; overflow-x: auto; scrollbar-width: none;
    padding: 4px 0; -webkit-overflow-scrolling: touch; margin-bottom: 8px;
  }
  .pm-region-chips-scroll::-webkit-scrollbar { display: none; }
  .pm-region-chip {
    flex-shrink: 0; border-radius: 99px; padding: 4px 11px;
    font-size: 0.72rem; font-weight: 600; cursor: pointer;
    border: 1px solid #d8cce8; background: transparent; color: #6b5b95;
    white-space: nowrap; font-family: inherit; min-height: 28px !important;
    display: flex; align-items: center; gap: 4px; transition: all 0.15s;
  }
  .pm-region-chip.active {
    background: #7c3aed; border-color: #7c3aed; color: #fff;
  }
  .pm-region-chip-count {
    font-size: 0.62rem; font-weight: 700;
    background: rgba(124,58,237,0.15); color: #7c3aed;
    border-radius: 99px; padding: 0 5px; min-width: 16px; text-align: center;
  }
  .pm-region-chip.active .pm-region-chip-count {
    background: rgba(255,255,255,0.25); color: #fff;
  }

  /* ── Compact test cards on mobile ── */
  @media (max-width: 767px) {
    .pm-test-card-hdr { padding: 8px 10px !important; }
    .pm-stepper-wrap { padding: 7px 10px 5px !important; margin-bottom: 10px !important; border-radius: 10px !important; }
    .pm-stepper-dot { width: 22px !important; height: 22px !important; font-size: 9px !important; }
    .pm-stepper-label { font-size: 7px !important; margin-top: 3px !important; letter-spacing: 0 !important; }
    .pm-section-stats { padding: 8px 10px !important; margin-bottom: 8px !important; }
    /* Compact inline section/module title rows */
    .pm-module-title-row { padding: 4px 0 4px !important; margin-bottom: 6px !important; }
    .pm-module-title-row .pm-module-sub { display: none !important; }

    /* Outcome Measures action buttons — always side by side */
    .pm-outcome-actions { display: flex !important; flex-direction: row !important; }
    .pm-outcome-actions button { flex: 1 !important; }

    /* ROM controls — compact on mobile */
    .pm-rom-controls { gap: 4px !important; margin-bottom: 6px !important; flex-wrap: nowrap !important; }
    .pm-rom-controls button { padding: 4px 8px !important; font-size: 0.68rem !important; min-height: 30px !important; }
    /* ROM session snapshots — single compact row */
    .pm-rom-snapshots { padding: 5px 10px !important; margin-bottom: 8px !important; border-radius: 8px !important; flex-wrap: nowrap !important; }
    .pm-rom-snapshots > span { font-size: 0.58rem !important; white-space: nowrap !important; }
    /* Neuro sub-module chips */
    .pm-neuro-tabs { margin-bottom: 12px !important; }

    /* ROM quality/pain micro-buttons — override min-height */
    .pm-rom-qual-btn { min-height: 24px !important; padding: 3px 7px !important; font-size: 0.6rem !important; line-height: 1.3 !important; }

    /* Pain NRS slider cards — compact on mobile */
    .pm-pain-slider { padding: 6px 10px !important; }
    .pm-pain-num { font-size: 1.1rem !important; min-width: 28px !important; }
    .pm-pain-slider input[type="range"] { height: 22px !important; }

    /* Group section headings (FULL ROM / MMT / NEURO ASSESSMENT) — hide on mobile */
    .pm-group-head { display: none !important; }
  }
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


/* ══════════════════════════════════════════════════════════
   RegionPickerButton — shared collapsible region selector
   Used by: ROM, MMT, Special Tests, Cyriax/STTT
   ══════════════════════════════════════════════════════════ */
function RegionPickerButton({ regions, active, onSelect, label="Body Region", accentColor }) {
  const [open, setOpen] = React.useState(false);
  const C = getC();
  const acc = accentColor || C.accent;

  // Find active region object (supports {key,label,icon,color} or just string)
  const activeObj = regions.find(r => (typeof r === "string" ? r : r.key) === active);
  const activeLabel = activeObj ? (typeof activeObj === "string" ? activeObj : (activeObj.label || activeObj.key)) : (active || "Select");
  const activeIcon  = activeObj && typeof activeObj !== "string" ? (activeObj.icon || "📍") : "📍";
  const activeColor = activeObj && typeof activeObj !== "string" ? (activeObj.color || acc) : acc;

  // Count filled for each region if provided
  return (
    <div style={{ marginBottom: 14, borderRadius: 14, overflow: "hidden", border: `1.5px solid ${open ? activeColor+"55" : C.border}`, background: C.surface, boxShadow: open ? `0 4px 24px ${activeColor}18` : "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s, border-color 0.2s" }}>
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", border: "none", background: open
            ? `linear-gradient(135deg, ${activeColor}18 0%, ${activeColor}08 100%)`
            : C.s2,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          padding: "13px 16px", fontFamily: "inherit", transition: "background 0.2s",
        }}>
        {/* Region icon badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${activeColor}30, ${activeColor}18)`,
          border: `1.5px solid ${activeColor}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.15rem", transition: "all 0.2s",
        }}>
          {activeIcon}
        </div>
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: activeColor, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 2 }}>
            {open ? "Choose Region" : label}
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeLabel}
          </div>
        </div>
        {/* Filled badge + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {activeObj && activeObj.filled > 0 && (
            <span style={{ background: activeColor, color: "#fff", borderRadius: 99, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 800 }}>
              {activeObj.filled}
            </span>
          )}
          {activeObj && activeObj.positives > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 800 }}>
              ⚠{activeObj.positives}
            </span>
          )}
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: open ? `${activeColor}20` : C.s3,
            border: `1px solid ${open ? activeColor+"40" : C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: open ? activeColor : C.muted, fontSize: "0.75rem", transition: "all 0.2s",
          }}>
            {open ? "▲" : "▼"}
          </div>
        </div>
      </button>

      {/* ── Region grid ── */}
      {open && (
        <div style={{ padding: "10px 12px 12px", borderTop: `1px solid ${C.border}`, background: C.s2 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {regions.map((r, i) => {
              const key   = typeof r === "string" ? r : r.key;
              const lbl   = typeof r === "string" ? r : (r.label || r.key);
              const icon  = typeof r === "string" ? "📍" : (r.icon || "📍");
              const color = typeof r === "string" ? acc : (r.color || acc);
              const filled = r.filled || 0;
              const positives = r.positives || 0;
              const isAct = key === active;
              return (
                <button key={i} type="button"
                  onClick={() => { onSelect(key); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "9px 14px", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${isAct ? color : (filled > 0 ? color+"50" : C.border)}`,
                    background: isAct ? `${color}18` : C.surface,
                    color: isAct ? color : (filled > 0 ? color : C.muted),
                    fontFamily: "inherit", fontWeight: isAct ? 700 : 500,
                    fontSize: "0.82rem", transition: "all 0.13s",
                    boxShadow: isAct ? `0 0 0 2px ${color}30` : "none",
                    minHeight: 44,
                  }}>
                  <span style={{ fontSize: "1rem" }}>{icon}</span>
                  <span>{lbl}</span>
                  {positives > 0 && (
                    <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "1px 6px", fontSize: "0.7rem", fontWeight: 800, marginLeft: 2 }}>⚠{positives}</span>
                  )}
                  {filled > 0 && positives === 0 && (
                    <span style={{ background: color, color: "#fff", borderRadius: 99, padding: "1px 6px", fontSize: "0.7rem", fontWeight: 800, marginLeft: 2 }}>{filled}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


// ── RegionChips: horizontal scrollable chip row for region selection ──
function RegionChips({ regions, active, onSelect }) {
  return (
    <div className="pm-region-chips-scroll">
      {regions.map(r => (
        <button
          key={r.key}
          className={"pm-region-chip" + (active === r.key ? " active" : "")}
          onClick={() => onSelect(r.key)}
        >
          {r.label}
          {r.filled > 0 && (
            <span className="pm-region-chip-count">{r.filled}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export { TabLoader, LazyBoundary, LazyTab, ErrorBoundary, MobileStyleInjector, MOBILE_CSS, RegionPickerButton, RegionChips };
export { THEMES, getC, setTheme, useTheme, C };
export { mid, vis, px, r1, r2, MIN_VIS, CLINICAL_MIN_VIS, calcAngleDeg };
