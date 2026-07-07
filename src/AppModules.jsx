// AppModules.jsx — PDF reports, HEP helpers, QuickVisit, Intake, Onboarding
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState } from "react";
import { downloadPDFFromHTML } from "./sharedClinicalData.js";
import { EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES, TEMPLATE_TX } from "./sharedClinicalData.js";
function PdfReportsModal({ data, dx, onClose, patients=[] }) {
  const [generating, setGenerating] = useState(null);
  const [done, setDone] = useState({});

  const d = data || {};
  const patName = d.dem_name || "Patient";
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const dob = d.dem_dob || "--";
  const age = d.dem_age || "--";
  const sex = d.dem_sex || d.dem_gender || "--";
  const occ = d.dem_occupation || "--";
  const gp = d.dem_gp || "--";
  const refNo = d.dem_ins_ref || "--";
  const insurer = d.dem_insurer || "--";
  const refSource = d.dem_referral || "--";

  const brand = { primary:"#1a3a5c", accent:"#2563eb", teal:"#0891b2", green:"#059669", red:"#dc2626", amber:"#d97706", purple:"#7c3aed", grey:"#6b7280", lightGrey:"#f1f5f9", border:"#e2e8f0", midGrey:"#94a3b8" };

  const escHtml = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const val = (k, fallback="--") => escHtml(d[k]||fallback);
  const arr = (k) => { const v=d[k]; return Array.isArray(v)?v:(typeof v==="string"?v:"").split("|||").filter(Boolean); };

  const pdfHeader = (title, subtitle, color) => {
    const reportNo = d.report_no || ("RPT-" + today.replace(/\s/g,""));
    const inlineLogo = `<img src="/logo.svg" alt="PhysioMind" style="height:68px;width:auto;display:block;" />`;
    return `<div style="background:#fff;border-bottom:1px solid #e2e8f0;">
      <div style="padding:14px 32px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:18px;">
          ${inlineLogo}
          <div style="border-left:2px solid #e2e8f0;padding-left:18px;margin-left:4px;">
            <div style="font-size:8.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">${title}</div>
            <div style="font-size:10px;color:#64748b;margin-top:1px;">${subtitle}</div>
          </div>
        </div>
        <div style="display:flex;gap:28px;text-align:right;">
          <div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">Patient</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${escHtml(patName)}</div>
            <div style="font-size:10px;color:#64748b;">${escHtml(sex)} &middot; ${escHtml(String(age))} yrs &middot; ${escHtml(dob)}</div>
          </div>
          <div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">Report</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${escHtml(reportNo)}</div>
            <div style="font-size:10px;color:#64748b;">${today}</div>
          </div>
        </div>
      </div>
      <div style="background:linear-gradient(to right,#3730a3,#7c3aed,#a855f7);padding:6px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">Smarter Assessment &middot; Better Outcomes</span>
        <span style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.8px;text-transform:uppercase;">Confidential Medical Document</span>
      </div>
    </div>`;
  };

  const pdfFooter = (docName) => {
    const therapistName = d.therapist_name || "Your Physiotherapist";
    return '<div style="background:#1e293b;padding:10px 40px;display:flex;justify-content:space-between;align-items:center;">'
      + '<div style="color:#94a3b8;font-size:8px;">PhysioMind &middot; ' + docName + '</div>'
      + '<div style="color:#64748b;font-size:8px;text-align:center;"><span style="color:#c9a84c;font-weight:700;">CONFIDENTIAL</span> &mdash; For Authorised Healthcare Professionals Only &middot; Not for Distribution</div>'
      + '<div style="color:#94a3b8;font-size:8px;">Page 1 &middot; ' + today + '</div>'
      + '</div>';
  };

  const sectionCard = (title, icon, content, borderColor) => '<div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">'
    + '<div style="padding:11px 16px;border-bottom:2px solid '+borderColor+'20;display:flex;align-items:center;gap:8px;">'
    + '<div style="width:28px;height:28px;background:'+borderColor+'12;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;border:1px solid '+borderColor+'25;">'+icon+'</div>'
    + '<span style="font-size:11px;font-weight:700;color:'+borderColor+';text-transform:uppercase;letter-spacing:1px;font-family:Georgia,serif;">'+title+'</span>'
    + '<div style="flex:1;height:1px;background:'+borderColor+'15;margin-left:4px;"></div>'
    + '</div>'
    + '<div style="padding:14px 16px;">'+content+'</div>'
    + '</div>';

  const badge = (text, color) => `<span style="display:inline-block;padding:3px 8px;background:${color}15;border:1px solid ${color}40;border-radius:5px;font-size:9px;font-weight:700;color:${color};margin:2px 3px 2px 0;">${escHtml(text)}</span>`;

  // Exercise SVG illustrations -- matches PhysioReports_4 ExerciseSVG component
  const exerciseSvgHtml = function(idx, color) {
    var svgs = [
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#f0f9ff" rx="8"/><ellipse cx="50" cy="28" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="38" y="47" width="24" height="38" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><path d="M50,38 Q42,45 44,53" stroke="'+color+'" stroke-width="2" fill="none" stroke-dasharray="3,2"/><text x="50" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Chin Tuck</text></svg>',
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fff7ed" rx="8"/><rect x="88" y="5" width="8" height="110" rx="3" fill="#e2e8f0"/><ellipse cx="48" cy="28" rx="16" ry="18" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="34" y="45" width="24" height="36" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="33" y="56" width="10" height="26" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1"/><path d="M44,60 L82,55" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2"/><path d="M44,68 L82,68" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2"/><text x="48" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Cervical Retraction</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#f0fdf4" rx="8"/><rect x="5" y="75" width="120" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="52" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="36" y="38" width="60" height="28" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="36" cy="46" rx="9" ry="9" fill="#fde8d0" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="96" cy="46" rx="9" ry="9" fill="#fde8d0" stroke="'+color+'" stroke-width="1.5"/><path d="M36,46 L20,40" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3,2"/><path d="M96,46 L112,40" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3,2"/><text x="65" y="93" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Scapular Retraction</text></svg>',
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fdf4ff" rx="8"/><ellipse cx="50" cy="30" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="38" y="49" width="24" height="36" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><path d="M60,22 Q75,15 78,28" stroke="'+color+'" stroke-width="2" fill="none"/><path d="M78,22 L85,15" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="2,2" fill="none"/><text x="50" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Levator Stretch</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#eff6ff" rx="8"/><rect x="50" y="60" width="30" height="12" rx="5" fill="#c7d7f0" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="65" cy="42" rx="30" ry="18" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="65" cy="28" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><text x="65" y="92" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Thoracic Extension</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#f5f3ff" rx="8"/><rect x="118" y="5" width="8" height="90" rx="3" fill="#e2e8f0"/><ellipse cx="68" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="55" y="35" width="24" height="32" rx="7" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="57" y="65" width="10" height="25" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="69" y="65" width="10" height="25" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><path d="M79,40 Q100,30 116,20" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2" fill="none"/><path d="M79,52 Q100,52 116,52" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2" fill="none"/><text x="65" y="97" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Wall Angels</text></svg>',
      '<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#fdf4ff" rx="8"/><ellipse cx="22" cy="50" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="34" y="42" width="50" height="30" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="50" y="68" width="50" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="50" y="55" width="65" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-25,75,62)"/><text x="60" y="95" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Clamshell</text></svg>',
      '<svg viewBox="0 0 80 120" width="80" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="120" fill="#eff6ff" rx="8"/><ellipse cx="40" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="26" y="34" width="28" height="35" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="28" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(15,34,80)"/><rect x="40" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-15,46,80)"/><text x="40" y="115" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Mini Squat</text></svg>',
      '<svg viewBox="0 0 140 110" width="120" height="94" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="110" fill="#f0fdf4" rx="8"/><rect x="5" y="85" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="35" y="42" width="55" height="22" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="37" y="62" width="12" height="25" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="62" y="58" width="50" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-8,87,64)"/><text x="60" y="100" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Hip Flexor Stretch</text></svg>',
    ];
    return svgs[idx % svgs.length];
  };

  const postureSvg = () => {
    const fhp = d.post_fhp || "";
    const sh = d.post_sh || "";
    const kyphosis = d.post_kyphosis || "";
    const lordosis = d.post_lordosis || "";
    const pelvis = d.post_pelvis || "";
    return `<svg viewBox="0 0 220 340" width="160" height="248" style="display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626"/></marker></defs>
      <rect width="220" height="340" fill="#f8fafc" rx="10"/>
      <line x1="110" y1="10" x2="110" y2="330" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"/>
      <ellipse cx="${fhp&&fhp.includes("Moderate")?120:fhp&&fhp.includes("Severe")?128:110}" cy="38" rx="22" ry="26" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="${fhp&&fhp.includes("Severe")?112:106}" y="62" width="14" height="22" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <line x1="${sh&&sh.includes("elevated")?62:68}" y1="${sh&&sh.includes("elevated")?84:88}" x2="${sh&&sh.includes("elevated")?158:152}" y2="${sh&&sh.includes("elevated")?88:84}" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="${sh&&sh.includes("elevated")?62:68}" cy="${sh&&sh.includes("elevated")?84:88}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="${sh&&sh.includes("elevated")?158:152}" cy="${sh&&sh.includes("elevated")?88:84}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <path d="M104,84 Q${kyphosis&&kyphosis.includes("increased")?98:104},120 ${kyphosis&&kyphosis.includes("increased")?98:104},145" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M${kyphosis&&kyphosis.includes("increased")?98:104},145 Q${lordosis&&lordosis.includes("increased")?116:104},170 ${lordosis&&lordosis.includes("increased")?114:104},190" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M68,88 L74,190 L148,190 L152,88 Z" fill="#dde8f8" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="110" cy="${pelvis&&pelvis.includes("anterior")?196:192}" rx="36" ry="20" fill="#c7d7f0" stroke="#2563eb" strokeWidth="1.5"/>
      <rect x="90" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="90" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="99" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      <ellipse cx="121" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      ${fhp&&!fhp.includes("Normal")?'<text x="135" y="35" fontSize="8" fill="#dc2626" fontWeight="700">FHP</text>':""}
      ${sh&&sh.includes("elevated")?'<text x="30" y="80" fontSize="8" fill="#dc2626" fontWeight="700">Sh elev.</text>':""}
      ${kyphosis&&kyphosis.includes("increased")?'<text x="20" y="120" fontSize="8" fill="#d97706" fontWeight="700">Kyph+</text>':""}
      ${lordosis&&lordosis.includes("increased")?'<text x="140" y="170" fontSize="8" fill="#d97706" fontWeight="700">Lord+</text>':""}
      ${pelvis&&pelvis.includes("anterior")?'<text x="150" y="200" fontSize="8" fill="#7c3aed" fontWeight="700">APT</text>':""}
      <line x1="110" y1="15" x2="110" y2="325" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
    </svg>`;
  };

  const exerciseSvgs = {
    bridge: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#f0f9ff" rx="8"/><rect x="5" y="75" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="30" cy="68" rx="14" ry="11" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="40" y="50" width="60" height="25" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="38" y="72" width="18" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><rect x="82" y="72" width="18" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Glute Bridge</text></svg>`,
    bird_dog: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#f0fdf4" rx="8"/><rect x="5" y="72" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="35" y="42" width="60" height="22" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="42" y="62" width="14" height="18" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><rect x="82" y="62" width="14" height="18" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><path d="M35,52 L18,45 L8,42" stroke="#059669" strokeWidth="2" fill="none"/><path d="M95,52 L112,45 L122,42" stroke="#059669" strokeWidth="2" fill="none"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Bird Dog</text></svg>`,
    clam: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#fdf4ff" rx="8"/><ellipse cx="22" cy="50" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="34" y="42" width="50" height="30" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="50" y="68" width="50" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="50" y="55" width="65" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-25,75,62)"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Clamshell</text></svg>`,
    squat: `<svg viewBox="0 0 80 120" width="80" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="120" fill="#eff6ff" rx="8"/><ellipse cx="40" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="26" y="34" width="28" height="35" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="28" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(15,34,80)"/><rect x="40" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-15,46,80)"/><text x="8" y="115" fontSize="7" fill="#1a3a5c" fontWeight="700">Mini Squat</text></svg>`,
    stretch: `<svg viewBox="0 0 140 110" width="120" height="94" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="110" fill="#f0fdf4" rx="8"/><rect x="5" y="85" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="35" y="42" width="55" height="22" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="37" y="62" width="12" height="25" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="62" y="58" width="50" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-8,87,64)"/><text x="5" y="100" fontSize="7" fill="#1a3a5c" fontWeight="700">Hip Flexor Stretch</text></svg>`,
    chin_tuck: `<svg viewBox="0 0 100 120" width="100" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fff7ed" rx="8"/><ellipse cx="50" cy="28" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="38" y="46" width="24" height="35" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><path d="M50,36 Q42,42 44,50" stroke="#d97706" strokeWidth="2" fill="none" strokeDasharray="3,2"/><text x="5" y="112" fontSize="7" fill="#1a3a5c" fontWeight="700">Chin Tuck (DNF)</text></svg>`,
  };

  const gatherExercises = () => {
    // ── 1. Real data: hep_programme array (Quick Visit / HEP module) ────────
    const hep = Array.isArray(d.hep_programme) ? d.hep_programme : [];
    if (hep.length > 0) {
      return hep.map(ex => ({
        name:        ex.name || "Unnamed Exercise",
        sets:        ex.customSets  || ex.sets  || "3",
        reps:        ex.customReps  || ex.reps  || "10",
        hold:        ex.customHold  || ex.hold  || "",
        rest:        ex.customRest  || ex.rest  || "60s",
        freq:        ex.customFreq  || ex.freq  || "Daily",
        phase:       ex.phase       || "Phase 1",
        notes:       ex.notes       || "",
        target:      ex.target      || ex.muscle || "",
        progression: ex.progression || "",
      }));
    }
    // ── 2. Manual entries: ex_name_1..12 ────────────────────────────────────
    const exs = [];
    for (let i = 1; i <= 12; i++) {
      const name = d[`ex_name_${i}`] || d[`exercise_${i}_name`] || "";
      if (!name) continue;
      exs.push({
        name, sets: d[`ex_sets_${i}`] || "3", reps: d[`ex_reps_${i}`] || "10",
        hold: d[`ex_hold_${i}`] || "", rest: d[`ex_rest_${i}`] || "60s",
        freq: d[`ex_freq_${i}`] || "Daily", phase: d[`ex_phase_${i}`] || "Phase 1",
        notes: d[`ex_notes_${i}`] || "", target: d[`ex_target_${i}`] || "",
        progression: d[`ex_progression_${i}`] || "",
      });
    }
    if (exs.length === 0) {
      const dxLabel = (dx?.dx?.[0]?.label||"").toLowerCase();
      const cc = (Array.isArray(d.cc_location)?d.cc_location.join(" "):(d.cc_location||"")).toLowerCase();
      const isLumbar = dxLabel.includes("lumbar")||dxLabel.includes("back")||cc.includes("back")||cc.includes("lumbar");
      const isCervical = dxLabel.includes("cervical")||dxLabel.includes("neck")||cc.includes("neck");
      const isKnee = dxLabel.includes("knee")||cc.includes("knee");
      if (isLumbar) return [
        {name:"Pelvic Tilt",sets:"3",reps:"15",hold:"3s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Motor Control",notes:"Flatten lower back against floor. Breathe normally.",target:"Lumbar stabilisers, transversus abdominis",progression:"Progress to dead bug exercise"},
        {name:"Glute Bridge",sets:"3",reps:"12",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 1 -- Motor Control",notes:"Drive through heels, squeeze glutes at top. Maintain neutral spine.",target:"Gluteus maximus, hamstrings, lumbar extensors",progression:"Single-leg bridge when pain-free"},
        {name:"Bird Dog",sets:"3",reps:"10",hold:"5s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Stability",notes:"Opposite arm and leg, maintain neutral spine. No rotation of pelvis.",target:"Multifidus, gluteus maximus, deep core",progression:"Add resistance band around wrists"},
        {name:"Cat-Cow Stretch",sets:"2",reps:"12",hold:"",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Mobility",notes:"Slow controlled movement, breathe throughout. Avoid pain range.",target:"Spinal mobility, paraspinals",progression:""},
      ];
      if (isCervical) return [
        {name:"Chin Tuck (DNF Activation)",sets:"3",reps:"10",hold:"10s",rest:"30s",freq:"3x Daily",phase:"Phase 1 -- Motor Control",notes:"Nod chin down without flexing neck. Feel length at back of neck. Do not use hands.",target:"Deep neck flexors (longus colli/capitis)",progression:"Add finger resistance on chin"},
        {name:"Cervical Rotation Stretch",sets:"3",reps:"5",hold:"20s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Mobility",notes:"Turn head to pain-free side first. Gently assist with hand at end range.",target:"Cervical rotators, SCM",progression:""},
        {name:"Scapular Retraction",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Squeeze shoulder blades together. No shrug or elevation. Keep chin tucked.",target:"Lower and middle trapezius, rhomboids",progression:"Add resistance band"},
        {name:"Levator Scapulae Stretch",sets:"3",reps:"3",hold:"30s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Flexibility",notes:"Ear to shoulder then rotate chin toward armpit. Breathe and relax into stretch.",target:"Levator scapulae, upper trapezius",progression:""},
      ];
      if (isKnee) return [
        {name:"Quad Set",sets:"3",reps:"15",hold:"5s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Activation",notes:"Flatten knee to surface, contract quad hard. Feel thigh muscle tighten.",target:"Quadriceps (VMO focus)",progression:"Straight leg raise"},
        {name:"Short Arc Quad",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 1 -- Strengthening",notes:"Pillow under knee at 90 degrees. Extend to full extension. Slow and controlled.",target:"Quadriceps, VMO",progression:"Add ankle weight (0.5kg)"},
        {name:"Mini Squat (0-45 deg)",sets:"3",reps:"12",hold:"",rest:"60s",freq:"Daily",phase:"Phase 2 -- Functional",notes:"Controlled descent, weight through heels. Stop before pain. Use wall for balance.",target:"Quadriceps, glutes, knee stabilisers",progression:"Increase depth to 60 degrees"},
        {name:"Terminal Knee Extension (TKE)",sets:"3",reps:"15",hold:"",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Band behind knee. Fully extend from 30 degrees flexion. Slow return.",target:"Quadriceps (VMO), knee joint proprioception",progression:"Increase band resistance"},
      ];
      return [
        {name:"Diaphragmatic Breathing",sets:"1",reps:"10",hold:"5s",rest:"",freq:"3x Daily",phase:"Phase 1 -- Foundation",notes:"Belly breathing. Hands on abdomen and chest. Belly should rise first. Exhale fully.",target:"Diaphragm, core activation, pain modulation",progression:""},
        {name:"Transversus Abdominis Activation",sets:"3",reps:"10",hold:"10s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Motor Control",notes:"Draw navel gently toward spine. Breathe normally. Do not suck stomach in or hold breath.",target:"Transversus abdominis, pelvic floor",progression:"Add limb loading"},
        {name:"Hip Hinge Pattern",sets:"3",reps:"10",hold:"",rest:"60s",freq:"Daily",phase:"Phase 2 -- Functional",notes:"Hinge at hips, maintain neutral spine. Soft knees. Push hips back. Flat back.",target:"Gluteus maximus, hamstrings, spinal extensors",progression:"Add light weight or resistance band"},
        {name:"Prone Hip Extension",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Squeeze glute, lift leg 10cm from surface. Maintain neutral pelvis. No rotation.",target:"Gluteus maximus, hamstrings",progression:"Add ankle weight"},
      ];
    }
    return exs;
  };

  const gatherTechniques = () => {
    // ── 1. Real data: tx_techniques array (TreatmentTechniquesModule) ───────
    const txArr = Array.isArray(d.tx_techniques) ? d.tx_techniques : [];
    if (txArr.length > 0) {
      return txArr.map(t => {
        if (t.type === "manual") return {
          name:      t.technique || "Joint Mobilisation",
          area:      [t.region, t.laterality].filter(Boolean).join(" — "),
          duration:  t.dosage || t.duration || "",
          rationale: [t.grade ? `Grade ${t.grade}` : "", t.response || ""].filter(Boolean).join(". "),
        };
        if (t.type === "dn") return {
          name:      `Dry Needling — ${t.dn_muscle || "Muscle"}`,
          area:      [t.laterality, t.dn_depth ? `depth ${t.dn_depth}mm` : ""].filter(Boolean).join(", "),
          duration:  `${t.dn_needles || "1"} needle${t.dn_needles!="1"?"s":""}${t.dn_twitch ? ` · LTR: ${t.dn_twitch}` : ""}`,
          rationale: t.response || t.notes || "Myofascial trigger point release",
        };
        if (t.type === "st") return {
          name:      t.st_technique || "Soft Tissue Therapy",
          area:      t.st_region || t.laterality || "",
          duration:  t.duration || t.dosage || "",
          rationale: t.response || "",
        };
        // fallback for unknown types
        return {
          name:      t.technique || t.name || "Manual Technique",
          area:      t.region || t.area || "",
          duration:  t.dosage || t.duration || "",
          rationale: t.rationale || t.response || "",
        };
      });
    }
    // ── 2. Manual entries: tx_name_1..10 ────────────────────────────────────
    const techs = [];
    for (let i = 1; i <= 10; i++) {
      const name = d[`tx_name_${i}`] || d[`technique_${i}`] || "";
      if (!name) continue;
      techs.push({ name, area: d[`tx_area_${i}`] || "", duration: d[`tx_duration_${i}`] || "", rationale: d[`tx_rationale_${i}`] || "" });
    }
    return techs;
  };

  const buildAssessmentPdf = () => {
    // ── helpers ──────────────────────────────────────────────────────────
    const v  = (k, fb="") => escHtml(d[k] || fb);
    const av = (k) => { const x = d[k]; return Array.isArray(x) ? x : (typeof x === "string" ? x : "").split("|||").filter(Boolean); };
    const hasAny = (...keys) => keys.some(k => d[k] && String(d[k]).trim() !== "");
    const sec = (icon, title, color, body) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
        <div style="background:${color};padding:6px 12px;display:flex;align-items:center;gap:7px;">
          <span style="font-size:14px;">${icon}</span>
          <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:0.3px;">${title}</span>
        </div>
        <div style="padding:10px 12px;background:#fff;">${body}</div>
      </div>`;
    const fieldRow = (label, value) => value && value !== "--" ? `
      <div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:9px;font-weight:600;color:#6b7280;min-width:120px;flex-shrink:0;padding-top:1px;">${label}</span>
        <span style="font-size:10px;color:#1e293b;flex:1;">${value}</span>
      </div>` : "";
    const grid2 = (items) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${items.join("")}</div>`;
    const miniField = (label, value) => (!value || value === "--") ? "" : `
      <div style="background:#f8fafc;border-radius:6px;padding:6px 8px;border:1px solid #e2e8f0;">
        <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${label}</div>
        <div style="font-size:10px;color:#1e293b;font-weight:500;">${value}</div>
      </div>`;
    const tagList = (items, color="#dc2626", bg="#fee2e2") => items.length ? items.map(i =>
      `<span style="display:inline-block;font-size:9px;font-weight:600;padding:2px 7px;border-radius:10px;background:${bg};color:${color};margin:2px 2px 2px 0;">${escHtml(i)}</span>`).join("") : "";
    const badge = (text, color="#dc2626", bg="#fee2e2") =>
      `<span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;background:${bg};color:${color};white-space:nowrap;">${escHtml(text)}</span>`;
    const testRow = (name, result) => {
      const isPos = /positive|abnormal|restricted|present|reduced|elevated|absent|weak|impaired/i.test(result);
      const isNeg = /negative|normal|full|wn|intact|equal|bilateral/i.test(result);
      const dot = isPos ? `<span style="color:#dc2626;font-weight:800;margin-right:4px;">+</span>` :
                  isNeg ? `<span style="color:#059669;font-weight:800;margin-right:4px;">−</span>` :
                          `<span style="color:#94a3b8;font-weight:800;margin-right:4px;">·</span>`;
      return `<div style="display:flex;gap:4px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        ${dot}
        <span style="font-weight:600;color:#334155;min-width:130px;">${escHtml(name)}</span>
        <span style="color:#64748b;flex:1;">${escHtml(result)}</span>
      </div>`;
    };
    const romRow = (movement, left, right, normal, limitedSide) => {
      if (!left && !right) return "";
      const statusColor = limitedSide ? "#dc2626" : "#059669";
      const statusText  = limitedSide ? `↓ ${limitedSide}` : "WNL";
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${movement}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${right||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#94a3b8;">${normal}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;font-weight:700;color:${statusColor};">${statusText}</td>
      </tr>`;
    };
    const mmtRow = (muscle, left, right) => {
      if (!left && !right) return "";
      const low = (v) => v && parseFloat(v) < 5;
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${muscle}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(left)?"#dc2626":"#059669"};font-weight:${low(left)?"700":"400"};">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(right)?"#dc2626":"#059669"};font-weight:${low(right)?"700":"400"};">${right||"—"}</td>
      </tr>`;
    };

    // ── patient meta ──────────────────────────────────────────────────────
    const patName   = v("dem_name", "Patient");
    const dob       = v("dem_dob");
    const sex       = v("dem_sex");
    const occ       = v("dem_occupation");
    const employer  = v("dem_employer");
    const gp        = v("dem_gp");
    const referral  = v("dem_referral");
    const consent   = v("dem_consent");
    const therapist = v("therapist_name", "___________________");
    const ahpra     = v("therapist_qual", "___________________");
    const clinicAddr = d.clinic_address || "PhysioMind Pro";

    // ── region prefix (for agg/eas) ──────────────────────────────────────
    const regionKey = (() => {
      const r = (d.cc_body_region || "").toLowerCase();
      if (r.includes("lumbar") || r.includes("lower back") || r.includes("lx")) return "lx";
      if (r.includes("cervical") || r.includes("neck") || r.includes("cx")) return "cx";
      if (r.includes("shoulder")) return "sh";
      if (r.includes("knee")) return r.includes("right") ? "knr" : "knl";
      if (r.includes("hip")) return "hip";
      if (r.includes("ankle")) return "ank";
      if (r.includes("elbow")) return "elb";
      if (r.includes("thoracic")) return "tx";
      if (r.includes("wrist")) return "wr";
      return "lx"; // default
    })();

    // ── subjective fields ─────────────────────────────────────────────────
    const cc        = v("cc_main");
    const onset     = v("cc_onset");
    const duration  = v("cc_duration");
    const mechanism = v("cc_mechanism");
    const quality   = v("cc_quality");
    const behaviour = v("cc_24h_pattern") || v("cc_behaviour");
    const vasNow    = v("cc_vas_now");
    const vasWorst  = v("cc_vas_worst");
    const vasBest   = v("cc_vas_best");
    const bodyRegion = v("cc_body_region");

    // aggravating — try region-specific then generic
    const aggMov  = av(`${regionKey}_agg_mov`);
    const aggAct  = av(`${regionKey}_agg_act`);
    const aggPost = av(`${regionKey}_agg_post`);
    const aggAll  = [...aggMov, ...aggAct, ...aggPost];
    const relMov  = av(`${regionKey}_rel_mov`);
    const relPost = av(`${regionKey}_rel_post`);
    const relMed  = av(`${regionKey}_rel_med`);
    const relAll  = [...relMov, ...relPost, ...relMed];

    // red flags
    const rfFields = ["grf_systemic","grf_cancer","grf_fracture","grf_infection","grf_neuro","grf_vascular",
                      `${regionKey}_rf_cauda`,`${regionKey}_rf_fracture`,`${regionKey}_rf_inflammatory`,`${regionKey}_rf_serious`];
    const rfItems = rfFields.flatMap(k => av(k)).filter(x => !/^no /i.test(x) && x.length > 2);
    const rfAction = v("grf_action") || v(`${regionKey}_rf_notes`);
    const yfItems = av(`${regionKey}_yf_beliefs`).concat(av(`${regionKey}_yf_emotion`));

    // PMH
    const pmhConds  = av("pmh_conditions").join(", ") || v("pmh_conditions");
    const pmhMeds   = v("pmh_medications") || v("med_allergies");
    const pmhAllerg = v("med_allergies") || v("pmh_allergies");
    const pmhSurg   = v("pmh_surgical");
    const pmhFam    = v("pmh_family");

    // goals / lifestyle
    const goal      = v("ar_goal_function") || v("goal_main");
    const goalBelief = v("goal_belief") || v("goal_concern");
    const lsExercise = v("ls_exercise");
    const lsSleep    = v("ls_sleep_quality");
    const lsStress   = v("ls_stress");
    const lsWork     = av("ls_occ_demands").join(", ");
    const lsNotes    = v("ls_notes");

    // clinician notes
    const ccNotes  = v("cc_notes");
    const hxNotes  = v("hx_notes");
    const goalNotes = v("goal_notes");

    // ── objective fields ──────────────────────────────────────────────────
    // Observation
    const obsGait    = v("obs_gait");
    const obsPosture = v("obs_posture");
    const obsSwelling = v("obs_swelling");
    const obsWasting = v("obs_muscle_wasting");
    const obsOther   = v("obs_other");

    // Palpation
    const palpTend  = v("palp_tenderness") || v("palp_tender");
    const palpTone  = v("palp_tone") || v("palp_muscle_tone");
    const palpSwel  = v("palp_swelling") || v("palp_swelling_notes");
    const palpOther = v("palp_other") || v("palp_notes");

    // ROM — collect all filled rom_ keys
    const romEntries = [];
    const romPairs = [
      ["Lumbar flexion",   "rom_lx_flex",    "", "lx_flexion",    "", "80°",  ""],
      ["Lumbar extension", "rom_lx_ext",     "", "lx_extension",  "", "25°",  ""],
      ["Lumbar lat flex",  "rom_lx_lat_l",   "rom_lx_lat_r",      "", "25°",  ""],
      ["Cervical flex",    "rom_cx_flex",     "",               "", "50°",  ""],
      ["Cervical ext",     "rom_cx_ext",      "",               "", "60°",  ""],
      ["Cervical rot L",   "rom_cx_rot_l",    "rom_cx_rot_r",   "", "80°",  ""],
      ["Shoulder flex",    "rom_sh_flex_l",   "rom_sh_flex_r",  "", "180°", ""],
      ["Shoulder abd",     "rom_sh_abd_l",    "rom_sh_abd_r",   "", "180°", ""],
      ["Shoulder ER",      "rom_sh_er_l",     "rom_sh_er_r",    "", "90°",  ""],
      ["Shoulder IR",      "rom_sh_ir_l",     "rom_sh_ir_r",    "", "70°",  ""],
      ["Elbow flex",       "rom_elb_flex_l",  "rom_elb_flex_r", "", "145°", ""],
      ["Wrist flex",       "rom_wr_flex_l",   "rom_wr_flex_r",  "", "80°",  ""],
      ["Hip flex",         "rom_hip_flex_l",  "rom_hip_flex_r", "", "120°", ""],
      ["Hip abd",          "rom_hip_abd_l",   "rom_hip_abd_r",  "", "45°",  ""],
      ["Knee flex",        "rom_knee_flex_l", "rom_knee_flex_r","", "140°", ""],
      ["Knee ext",         "rom_knee_ext_l",  "rom_knee_ext_r", "", "0°",   ""],
      ["Ankle DF",         "rom_ankle_df_l",  "rom_ankle_df_r", "", "20°",  ""],
      ["Ankle PF",         "rom_ankle_pf_l",  "rom_ankle_pf_r", "", "50°",  ""],
    ];
    const romRows = romPairs.map(([name, lk, rk, , norm]) => {
      const lv = d[lk] || ""; const rv = d[rk] || "";
      if (!lv && !rv) return "";
      const limited = (lv && /^[0-9]/.test(lv) && parseFloat(lv) < parseFloat(norm)) ? "L" :
                      (rv && /^[0-9]/.test(rv) && parseFloat(rv) < parseFloat(norm)) ? "R" :
                      (lv && /−|lag|limit|restrict/i.test(lv)) ? "L" :
                      (rv && /−|lag|limit|restrict/i.test(rv)) ? "R" : "";
      return romRow(name, lv, rv, norm, limited);
    }).filter(Boolean);

    // MMT
    const mmtPairs = [
      ["Quadriceps",        "mmt_quad_l",      "mmt_quad_r"],
      ["Hamstrings",        "mmt_hams_l",       "mmt_hams_r"],
      ["Glut maximus",      "mmt_glut_max_l",   "mmt_glut_max_r"],
      ["Glut medius",       "mmt_glut_med_l",   "mmt_glut_med_r"],
      ["Hip flexors",       "mmt_hip_flex_l",   "mmt_hip_flex_r"],
      ["Gastroc/soleus",    "mmt_gastroc_l",    "mmt_gastroc_r"],
      ["Tib anterior",      "mmt_tib_ant_l",    "mmt_tib_ant_r"],
      ["EHL (L5)",          "mmt_ehl_l",        "mmt_ehl_r"],
      ["Deltoid",           "mmt_deltoid_l",    "mmt_deltoid_r"],
      ["Rotator cuff",      "mmt_rc_l",         "mmt_rc_r"],
      ["Biceps",            "mmt_biceps_l",     "mmt_biceps_r"],
      ["Triceps",           "mmt_triceps_l",    "mmt_triceps_r"],
      ["Wrist ext",         "mmt_wr_ext_l",     "mmt_wr_ext_r"],
      ["Deep neck flex",    "mmt_dnf_l",        "mmt_dnf_r"],
    ];
    const mmtRows = mmtPairs.map(([name, lk, rk]) => mmtRow(name, d[lk]||"", d[rk]||"")).filter(Boolean);

    // Functional screen
    const fsLabels = {
      kfs_squat:"Double leg squat", kfs_lunge:"Forward lunge", kfs_step_down:"Step down",
      kfs_single_leg:"Single leg squat", kfs_hop:"Single leg hop",
      lfs_flexion:"Lumbar flexion", lfs_extension:"Lumbar extension", lfs_rot:"Lumbar rotation",
      lfs_lateral:"Lateral bend", lfs_squat:"Squat pattern",
      sfs_overhead:"Overhead reach", sfs_push:"Push-up", sfs_pull:"Pull pattern",
      hfs_squat:"Hip single leg squat", hfs_hinge:"Hip hinge", hfs_lunge:"Hip lunge",
      afs_raise:"Calf raise", afs_lunge:"Ankle lunge", afs_hop:"Hop & stick",
    };
    const fsGradeColor = (g) => g >= 2 ? "#dc2626" : g === 1 ? "#d97706" : "#059669";
    const fsGradeLabel = (g) => g >= 2 ? "Abnormal" : g === 1 ? "Compensated" : "Normal";
    const fsScreens = ["kfs_data","lfs_data","sfs_data","hfs_data","afs_data"];
    const fsRows = [];
    fsScreens.forEach(key => {
      if (!d[key]) return;
      try {
        const parsed = typeof d[key] === "string" ? JSON.parse(d[key]) : d[key];
        const grades = parsed.grades || {};
        const notes  = parsed.notes  || {};
        Object.entries(grades).forEach(([id, g]) => {
          const gn = parseInt(g) || 0;
          const label = fsLabels[id] || id.replace(/_/g," ");
          const note  = notes[id] ? escHtml(notes[id]) : "";
          fsRows.push(`<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${escHtml(label)}</td>
            <td style="font-size:9px;padding:4px 6px;text-align:center;">
              <span style="font-weight:700;color:${fsGradeColor(gn)};">${gn} — ${fsGradeLabel(gn)}</span>
            </td>
            <td style="font-size:9px;padding:4px 6px;color:#64748b;">${note}</td>
          </tr>`);
        });
      } catch {}
    });

    // Special tests
    const stKeys = Object.keys(d).filter(k => (k.startsWith("st_") || k.startsWith("lx_slr") || k.startsWith("lx_slump") || k.startsWith("lx_kemp")) && d[k] && String(d[k]).trim());
    const stPos = stKeys.filter(k => /positive|abnormal/i.test(d[k]||""));
    const stNeg = stKeys.filter(k => /negative|normal/i.test(d[k]||"") && !/positive/i.test(d[k]||""));
    const stOth = stKeys.filter(k => !stPos.includes(k) && !stNeg.includes(k));
    const stLabel = (k) => k.replace(/^(st_|lx_)/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

    // Neurological
    const neuroFields = [
      ["L3 sensation", "n_l3_right", "n_l3_left"],
      ["L4 sensation", "n_l4_right", "n_l4_left"],
      ["L5 sensation", "n_l5_right", "n_l5_left"],
      ["S1 sensation", "n_s1_right", "n_s1_left"],
      ["C5 sensation", "n_c5_right", "n_c5_left"],
      ["C6 sensation", "n_c6_right", "n_c6_left"],
      ["C7 sensation", "n_c7_right", "n_c7_left"],
      ["Patellar reflex",  "n_ref_patella_right",  "n_ref_patella_left"],
      ["Achilles reflex",  "n_ref_achilles_right", "n_ref_achilles_left"],
      ["Biceps reflex",    "n_ref_biceps_right",   "n_ref_biceps_left"],
      ["Triceps reflex",   "n_ref_triceps_right",  "n_ref_triceps_left"],
      ["Babinski",         "n_babinski_right",      "n_babinski_left"],
      ["Neural tension",   "n_slr_right",           "n_slr_left"],
      ["Upper limb tension","n_ultt_right",          "n_ultt_left"],
    ];
    const neuroRows = neuroFields.map(([name, rk, lk]) => {
      const rv = d[rk]||""; const lv = d[lk]||"";
      if (!rv && !lv) return "";
      const val = [rv&&`R: ${rv}`, lv&&`L: ${lv}`].filter(Boolean).join(" · ");
      const abnormal = /reduced|absent|impaired|weak|positive|abnormal/i.test(val);
      return `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        <span style="min-width:120px;font-weight:600;color:#334155;flex-shrink:0;">${name}</span>
        <span style="color:${abnormal?"#dc2626":"#334155"};">${escHtml(val)}</span>
      </div>`;
    }).filter(Boolean);
    // Also check free-text neuro fields
    const neuroNotes = v("neuro_clinician_notes") || v("n_notes");

    // Gait
    const gaitObs   = v("gait_observation") || v("obs_gait");
    const gaitDev   = v("gait_deviations");
    const gaitTrend = v("gait_trendelenburg");
    const gaitStep  = v("gait_step_length");
    const gaitNotes = v("gait_notes");

    // Outcome measures
    const omOdi    = v("om_odi_score")  || v("om_odi");
    const omNdi    = v("om_ndi_score")  || v("om_ndi");
    const omPsfs   = v("om_psfs_score") || v("om_psfs");
    const omDash   = v("om_dash_score") || v("om_dash");
    const omLefs   = v("om_lefs_score") || v("om_lefs");
    const omKoosPain = v("om_koos_pain"); const omKoosSport = v("om_koos_sport"); const omKoosQol = v("om_koos_qol");
    const omReport = d.om_report?.scores || {};

    // Advanced assessment
    const kcNotes   = v("kc_notes");
    const fasc      = v("fa_passive_tension") || v("fa_densification");
    const fascNotes = v("fa_compensation_map") || v("fa_remote_test");
    const nktNotes  = v("nkt_notes");
    const cyriaxNotes = v("cyriax_notes") || v("sttt_notes");

    // Diagnosis
    const dxMain  = v("soap_a_diagnosis") || v("soap_a");
    const dxIcd   = v("soap_icd10");
    const dxAssess = v("soap_assessment");
    const dxList  = dx?.dx || [];

    // ── CSS ───────────────────────────────────────────────────────────────
    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{background:#fff;max-width:860px;margin:0 auto 0;box-shadow:0 4px 40px rgba(0,0,0,0.12);page-break-after:always;}
      .page:last-child{page-break-after:auto;}
      .body{padding:22px 32px 28px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;padding:6px 6px;text-align:left;border-bottom:1px solid #e2e8f0;}
      @media print{body{background:white;}.page{box-shadow:none;max-width:100%;}}
    `;

    // ── PAGE FOOTER ───────────────────────────────────────────────────────
    const pgFooter = (n, total) => `
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:7px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;color:#94a3b8;">PhysioMind Pro · CONFIDENTIAL · Patient: ${escHtml(patName)}</span>
        <span style="font-size:8px;color:#94a3b8;">${today} · Page ${n} of ${total}</span>
      </div>`;

    // ── PAGE 1: DEMOGRAPHICS + SUBJECTIVE ────────────────────────────────
    const page1 = `<div class="page">
      ${pdfHeader("Physiotherapy Assessment Report", "Initial Clinical Evaluation", "#1e3a5f")}
      <div class="body">

        ${sec("👤","Patient details","#334155", `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px;">
            ${miniField("Full name", v("dem_name"))}
            ${miniField("Date of birth / Age", dob + (sex ? " · " + sex : ""))}
            ${miniField("Occupation", occ)}
            ${miniField("Referring GP", gp)}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
            ${miniField("Date of assessment", today)}
            ${miniField("Session type", "Initial assessment")}
            ${miniField("Clinician", therapist)}
            ${miniField("AHPRA / Reg no.", ahpra)}
          </div>
        `)}

        ${sec("📋","Chief complaint","#1e3a5f", `
          ${cc && cc !== "--" ? `<div style="border-left:3px solid #1e3a5f;padding:7px 10px;background:#f0f4ff;border-radius:0 6px 6px 0;font-size:10px;font-style:italic;color:#334155;margin-bottom:9px;">"${escHtml(cc)}"</div>` : ""}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${miniField("Body region", bodyRegion)}
            ${miniField("Mechanism / onset", onset)}
            ${miniField("Duration", duration)}
            ${miniField("Pain behaviour", behaviour || quality)}
          </div>
        `)}

        ${sec("📊","Pain scores (NRS /10)","#991b1b", `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <div style="background:#fef2f2;border-radius:8px;padding:10px;text-align:center;border:1px solid #fecaca;">
              <div style="font-size:26px;font-weight:700;color:#dc2626;line-height:1;">${vasNow||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Current</div>
            </div>
            <div style="background:#f5f3ff;border-radius:8px;padding:10px;text-align:center;border:1px solid #ddd6fe;">
              <div style="font-size:26px;font-weight:700;color:#7c3aed;line-height:1;">${vasWorst||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Worst</div>
            </div>
            <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;border:1px solid #bbf7d0;">
              <div style="font-size:26px;font-weight:700;color:#059669;line-height:1;">${vasBest||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Best</div>
            </div>
          </div>
        `)}

        ${(aggAll.length > 0 || relAll.length > 0) ? sec("⬆️","Aggravating & easing factors","#78350f", `
          ${aggAll.length ? `<div style="margin-bottom:8px;"><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Aggravating</div>${tagList(aggAll,"#991b1b","#fee2e2")}</div>` : ""}
          ${relAll.length ? `<div><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Easing</div>${tagList(relAll,"#166534","#dcfce7")}</div>` : ""}
        `) : ""}

        ${sec("🚩","Red & yellow flags","#991b1b", `
          <div style="margin-bottom:6px;">
            ${rfItems.length > 0
              ? `<div style="font-size:8.5px;font-weight:700;color:#991b1b;margin-bottom:4px;">Red flags identified:</div>${tagList(rfItems,"#991b1b","#fee2e2")}`
              : `<span style="font-size:9.5px;color:#059669;font-weight:600;">✓ No red flags identified — safe to proceed</span>`
            }
          </div>
          ${yfItems.length ? `<div><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Yellow flags</div>${tagList(yfItems,"#854d0e","#fef9c3")}</div>` : ""}
          ${rfAction && rfAction !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;">${rfAction}</div>` : ""}
        `)}

        ${sec("🏥","Past medical history & medications","#4c1d95", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${miniField("Medical history", pmhConds)}
            ${miniField("Current medications", pmhMeds)}
            ${miniField("Allergies", pmhAllerg)}
            ${miniField("Previous surgery", pmhSurg)}
            ${miniField("Family history", pmhFam)}
            ${miniField("Previous physiotherapy", v("hx_previous_injury") || v("hx_providers"))}
          </div>
          ${hxNotes && hxNotes !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;padding:5px 8px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;">${hxNotes}</div>` : ""}
        `)}

        ${sec("🎯","Goals & lifestyle","#0f6e56", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            ${miniField("Patient goal", goal)}
            ${miniField("Patient belief / concern", goalBelief)}
            ${miniField("Exercise", lsExercise)}
            ${miniField("Sleep quality", lsSleep)}
            ${miniField("Stress level", lsStress)}
            ${miniField("Work demands", lsWork)}
          </div>
          ${lsNotes && lsNotes !== "--" ? `<div style="font-size:9px;color:#64748b;padding:5px 8px;background:#f0fdf4;border-radius:5px;border:1px solid #bbf7d0;">${lsNotes}</div>` : ""}
          ${goalNotes && goalNotes !== "--" ? `<div style="font-size:9px;color:#64748b;margin-top:4px;padding:5px 8px;background:#f0fdf4;border-radius:5px;border:1px solid #bbf7d0;">${goalNotes}</div>` : ""}
        `)}

        ${ccNotes && ccNotes !== "--" ? sec("📝","Clinician notes — subjective","#334155", `<div style="font-size:10px;color:#334155;line-height:1.6;">${ccNotes}</div>`) : ""}

      </div>
      ${pgFooter(1, 2)}
    </div>`;

    // ── PAGE 2: OBJECTIVE FINDINGS ────────────────────────────────────────
    const obsHasData = hasAny("obs_gait","obs_posture","obs_swelling","obs_muscle_wasting","obs_other");
    const palpHasData = hasAny("palp_tenderness","palp_tender","palp_tone","palp_muscle_tone","palp_swelling","palp_notes","palp_other");
    const romHasData  = romRows.length > 0;
    const mmtHasData  = mmtRows.length > 0;
    const fsHasData   = fsRows.length > 0;
    const stHasData   = stKeys.length > 0;
    const neuroHasData = neuroRows.length > 0 || neuroNotes !== "--";
    const gaitHasData = hasAny("gait_observation","obs_gait","gait_deviations","gait_notes");
    const omHasData   = hasAny("om_odi_score","om_odi","om_ndi_score","om_ndi","om_psfs_score","om_lefs_score","om_koos_pain","om_koos_sport");
    const advHasData  = hasAny("kc_notes","fa_passive_tension","fa_densification","fa_compensation_map","nkt_notes","cyriax_notes","sttt_notes");

    const page2 = `<div class="page">
      ${pdfHeader("Objective Findings", "Assessment & Advanced Assessment", "#0f6e56")}
      <div class="body">

        ${(obsHasData || palpHasData) ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${obsHasData ? sec("👁️","Observation","#334155", `
            ${obsGait    && obsGait    !== "--" ? fieldRow("Gait", obsGait) : ""}
            ${obsPosture && obsPosture !== "--" ? fieldRow("Posture", obsPosture) : ""}
            ${obsSwelling && obsSwelling !== "--" ? fieldRow("Swelling", obsSwelling) : ""}
            ${obsWasting && obsWasting !== "--" ? fieldRow("Muscle wasting", obsWasting) : ""}
            ${obsOther   && obsOther   !== "--" ? fieldRow("Other", obsOther) : ""}
          `) : ""}
          ${palpHasData ? sec("🖐️","Palpation","#334155", `
            ${palpTend  && palpTend  !== "--" ? fieldRow("Tenderness", palpTend) : ""}
            ${palpTone  && palpTone  !== "--" ? fieldRow("Muscle tone", palpTone) : ""}
            ${palpSwel  && palpSwel  !== "--" ? fieldRow("Swelling", palpSwel) : ""}
            ${palpOther && palpOther !== "--" ? fieldRow("Other", palpOther) : ""}
          `) : ""}
        </div>` : ""}

        ${romHasData ? sec("📐","Range of motion","#0f6e56", `
          <table><thead><tr>
            <th style="width:35%">Movement</th>
            <th style="width:15%;text-align:center;">Left</th>
            <th style="width:15%;text-align:center;">Right</th>
            <th style="width:15%;text-align:center;">Normal</th>
            <th style="width:20%;text-align:center;">Status</th>
          </tr></thead><tbody>${romRows.join("")}</tbody></table>
        `) : ""}

        ${(mmtHasData || fsHasData) ? `
        <div style="display:grid;grid-template-columns:${mmtHasData && fsHasData ? "1fr 1fr" : "1fr"};gap:10px;">
          ${mmtHasData ? sec("💪","Manual muscle testing (MMT)","#1e3a5f", `
            <table><thead><tr>
              <th>Muscle</th>
              <th style="text-align:center;">L</th>
              <th style="text-align:center;">R</th>
            </tr></thead><tbody>${mmtRows.join("")}</tbody></table>
          `) : ""}
          ${fsHasData ? sec("🏃","Functional movement screen","#14532d", `
            <table><thead><tr>
              <th>Test</th>
              <th style="width:120px;">Grade</th>
              <th>Notes</th>
            </tr></thead><tbody>${fsRows.join("")}</tbody></table>
          `) : ""}
        </div>` : ""}

        ${stHasData ? sec("🔬","Special tests","#78350f", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
            <div>
              ${stPos.length ? `<div style="font-size:8.5px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Positive</div>
              ${stPos.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
              ${stOth.length ? `<div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:6px 0 4px;">Other findings</div>
              ${stOth.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
            </div>
            <div>
              ${stNeg.length ? `<div style="font-size:8.5px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Negative</div>
              ${stNeg.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
            </div>
          </div>
        `) : ""}

        ${neuroHasData ? sec("⚡","Neurological findings","#312e81", `
          ${neuroRows.join("")}
          ${neuroNotes && neuroNotes !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;padding:5px 8px;background:#eef2ff;border-radius:5px;">${neuroNotes}</div>` : ""}
        `) : ""}

        ${gaitHasData ? sec("🚶","Gait analysis","#1e3a5f", `
          ${gaitObs  && gaitObs  !== "--" ? fieldRow("Observation", gaitObs) : ""}
          ${gaitDev  && gaitDev  !== "--" ? fieldRow("Deviations", gaitDev) : ""}
          ${gaitTrend && gaitTrend !== "--" ? fieldRow("Trendelenburg", gaitTrend) : ""}
          ${gaitStep && gaitStep !== "--" ? fieldRow("Step length", gaitStep) : ""}
          ${gaitNotes && gaitNotes !== "--" ? fieldRow("Notes", gaitNotes) : ""}
        `) : ""}

        ${omHasData ? sec("📈","Outcome measures","#0f6e56", `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
            ${omOdi   && omOdi   !== "--" ? `<div style="text-align:center;background:#fef2f2;border-radius:8px;padding:8px 4px;border:1px solid #fecaca;"><div style="font-size:18px;font-weight:700;color:#dc2626;">${omOdi}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">ODI</div></div>` : ""}
            ${omNdi   && omNdi   !== "--" ? `<div style="text-align:center;background:#fef2f2;border-radius:8px;padding:8px 4px;border:1px solid #fecaca;"><div style="font-size:18px;font-weight:700;color:#dc2626;">${omNdi}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">NDI</div></div>` : ""}
            ${omLefs  && omLefs  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omLefs}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">LEFS</div></div>` : ""}
            ${omPsfs  && omPsfs  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omPsfs}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">PSFS</div></div>` : ""}
            ${omDash  && omDash  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omDash}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">DASH</div></div>` : ""}
            ${omKoosPain && omKoosPain !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosPain}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS Pain</div></div>` : ""}
            ${omKoosSport && omKoosSport !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosSport}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS Sport</div></div>` : ""}
            ${omKoosQol && omKoosQol !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosQol}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS QoL</div></div>` : ""}
          </div>
          ${Object.keys(omReport).length ? `<div style="margin-top:8px;font-size:9px;color:#64748b;">${Object.entries(omReport).map(([k,v2])=>`<b>${k.toUpperCase()}</b>: ${v2}`).join(" · ")}</div>` : ""}
        `) : ""}

        ${advHasData ? sec("🔭","Advanced assessment","#4c1d95", `
          ${kcNotes && kcNotes !== "--" ? fieldRow("Kinetic chain", kcNotes) : ""}
          ${fascNotes && fascNotes !== "--" ? fieldRow("Fascia / SBL", fascNotes) : ""}
          ${nktNotes && nktNotes !== "--" ? fieldRow("CPA / NKT pattern", nktNotes) : ""}
          ${cyriaxNotes && cyriaxNotes !== "--" ? fieldRow("STTT / Cyriax", cyriaxNotes) : ""}
        `) : ""}

        ${(dxMain && dxMain !== "--") || dxList.length > 0 ? sec("🩺","Clinical diagnosis","#1e3a5f", `
          ${dxList.length > 0 ? dxList.slice(0,4).map((dx2, i) => `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #f1f5f9;">
              <div style="width:18px;height:18px;border-radius:50%;background:${["#1e3a5f","#334155","#475569","#64748b"][i]};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;">${i+1}</div>
              <div>
                <div style="font-size:10.5px;font-weight:700;color:#1e293b;">${escHtml(dx2.diagnosis||"")}</div>
                <div style="font-size:8.5px;color:#64748b;margin-top:1px;">${dx2.icd10||""} ${dx2.confidence ? "· Confidence: " + Math.round(dx2.confidence) + "%" : ""}</div>
              </div>
            </div>`).join("") : ""}
          ${dxMain && dxMain !== "--" ? `<div style="margin-top:8px;font-size:10px;color:#334155;line-height:1.6;padding:8px;background:#f0f4ff;border-radius:6px;">${dxMain}</div>` : ""}
          ${dxIcd  && dxIcd  !== "--" ? `<div style="margin-top:4px;font-size:9px;color:#64748b;">ICD-10: ${dxIcd}</div>` : ""}
          ${dxAssess && dxAssess !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#334155;line-height:1.6;">${dxAssess}</div>` : ""}
        `) : ""}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:8px 4px;margin-top:4px;">
          <div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:18px;">Physiotherapist signature:</div>
            <div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div>
            <div style="font-size:8px;color:#94a3b8;">Name · AHPRA registration no. · Date</div>
          </div>
          <div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:18px;">Next review / follow-up:</div>
            <div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div>
            <div style="font-size:8px;color:#94a3b8;">Date · Treating clinician · Location</div>
          </div>
        </div>

      </div>
      ${pgFooter(2, 2)}
    </div>`;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Assessment Report — ${escHtml(patName)}</title>
      <style>${css}</style>
    </head><body>${page1}${page2}</body></html>`;
  };


  const buildTreatmentPdf = () => {
    const exercises = gatherExercises();
    const techniques = gatherTechniques();
    const sessions = Array.isArray(d.tx_sessions) ? [...d.tx_sessions] : [];
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Musculoskeletal Dysfunction");
    const phaseColors = {"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const groupedExercises = exercises.reduce((acc, ex) => { const p = ex.phase || "Phase 1"; if(!acc[p]) acc[p]=[]; acc[p].push(ex); return acc; }, {});
    const svgKeys = Object.keys(exerciseSvgs);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Treatment Plan - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Physiotherapy Treatment Plan","Evidence-Based Clinical Management Program","#059669")}
<div class="body">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
    <div style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Patient Details</div>${[["Patient",escHtml(patName)],["DOB / Age",`${escHtml(dob)} / ${escHtml(String(age))}`],["Sex",escHtml(sex)],["Occupation",escHtml(occ)]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(5,150,105,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</span></div>`).join("")}</div>
    <div style="background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Working Diagnosis &amp; Plan</div><div style="font-size:13px;font-weight:800;color:#1a3a5c;margin-bottom:8px;line-height:1.3;">${dxLabel}</div>${[["Pain (VAS Now)",(d.pa_vas_now||d.cc_vas_now||"--")+"/10"],["Treatment Frequency",d.tx_frequency||d.soap_frequency||"2&ndash;3x per week"],["Expected Duration",d.tx_duration_plan||d.tx_plan_duration||"6&ndash;8 wks"],["Sessions Planned",d.tx_plan_sessions||d.plan_sessions||"--"],["Sessions Done",String(sessions.length)||"0"],["Plan Start",d.tx_plan_start||"--"]].filter(([,v])=>v&&v!=="--").map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(37,99,235,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(String(v))}</span></div>`).join("")}</div>
  </div>
  ${sectionCard("Treatment Goals","&#127919;",`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">${[
    ["Short-Term (2&ndash;4 wks)","#0891b2",[d.ar_goal_pain||"Pain reduction &ge;30% on VAS",d.ar_goal_function||"Improve functional ROM","Reduce swelling/inflammation"]],
    ["Medium-Term (4&ndash;8 wks)","#2563eb",[d.ar_goal_str||"Restore muscle strength to 4+/5",d.ar_goal_func||"Functional task independence","Return to work/leisure activities"]],
    ["Long-Term (8&ndash;12 wks)","#059669",[d.ar_goal_return||"Full return to prior activity","Self-management strategies","Prevent recurrence"]],
  ].map(([title,color,goals])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:8px;padding:12px;"><div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>${goals.map(g=>`<div style="font-size:9.5px;color:#1a3a5c;padding:4px 0;border-bottom:1px solid ${color}15;display:flex;gap:6px;align-items:flex-start;"><span style="color:${color};font-weight:700;flex-shrink:0;">&#10003;</span><span>${escHtml(String(g))}</span></div>`).join("")}</div>`).join("")}</div>`,"#059669")}
  ${sectionCard("Manual Therapy &amp; Treatment Techniques","&#129330;",`<table><thead><tr><th>Technique</th><th>Target Area</th><th>Duration / Dosage</th><th>Evidence Base</th></tr></thead><tbody>${techniques.length>0?techniques.map(t=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(t.name)}</td><td style="font-size:10px;">${escHtml(t.area)}</td><td style="font-size:10px;">${escHtml(t.duration)}</td><td style="font-size:9.5px;color:#6b7280;">${escHtml(t.rationale)}</td></tr>`).join(""):
[["Soft Tissue Mobilisation","Hypertonic muscles / trigger points","5&ndash;10 min per area","Level 1A &mdash; Cochrane Review"],["Joint Mobilisation (Grade III&ndash;IV)","Restricted articular joint segments","3 sets PA pressure","Level 1B &mdash; RCT evidence"],["Therapeutic Ultrasound","Periarticular / tendon tissue","1MHz, 1.0 W/cm&sup2;, 5 min","Level 2B"],["Dry Needling / IMS","Myofascial trigger points","As clinically indicated","Level 1B &mdash; multiple RCTs"],["Taping (Kinesio / Rigid)","Joint support / proprioception","72 hrs per application","Level 2"],["TENS / Electrotherapy","Pain modulation (gate control)","80Hz, 20 min","Level 2B &mdash; analgesic effect"],].map(([tech,target,dose,ev])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${tech}</td><td style="font-size:10px;">${target}</td><td style="font-size:10px;">${dose}</td><td style="font-size:9px;color:#6b7280;">${ev}</td></tr>`).join("")}</tbody></table>`,"#d97706")}
  ${Object.entries(groupedExercises).map(([phase,exs])=>{const pColor=phaseColors[phase]||"#2563eb";return sectionCard(`Exercise Prescription &mdash; ${phase}`,"&#127959;",`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">${exs.map((ex,i)=>{const svgType=svgKeys[i%svgKeys.length];return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;"><div style="background:${pColor}10;border-bottom:1px solid ${pColor}20;padding:8px 12px;display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</span><span style="font-size:11px;font-weight:700;color:#1a3a5c;">${escHtml(ex.name)}</span></div><div style="padding:10px 12px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">${[["Sets",ex.sets],["Reps",ex.reps],ex.hold?["Hold",ex.hold]:null,["Rest",ex.rest],["Frequency",ex.freq]].filter(Boolean).map(([l,v])=>`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;text-align:center;"><div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:700;color:${pColor};">${escHtml(v)}</div></div>`).join("")}</div>${ex.target?`<div style="font-size:8.5px;color:#0891b2;margin-bottom:4px;"><strong>Target:</strong> ${escHtml(ex.target)}</div>`:""}${ex.notes?`<div style="background:#fff;border-radius:6px;padding:6px 8px;font-size:8.5px;color:#6b7280;line-height:1.5;border:1px solid #e2e8f0;">${escHtml(ex.notes)}</div>`:""}${ex.progression?`<div style="margin-top:5px;font-size:8px;color:#059669;"><strong>&#11014; Progression:</strong> ${escHtml(ex.progression)}</div>`:""}</div></div>`;}).join("")}</div>`,pColor);}).join("")}
  ${(()=>{
    const vasBaseline = sessions.length>0 ? (parseFloat(sessions[sessions.length-1].vasStart)||0) : (parseFloat(d.pa_vas_now||d.cc_vas_now)||0);
    const vasNow      = sessions.length>0 ? (parseFloat(sessions[0].vasEnd||sessions[0].vasStart)||0) : vasBaseline;
    const targetVas   = Math.max(0, vasBaseline-3);
    const psfsNow     = d.om_psfs1_now||d.psfs_score||"";
    const psfsGoal    = d.om_psfs1_goal||"7";
    const vasDiff     = vasBaseline - vasNow;
    const vasPct      = vasBaseline>0 ? Math.round((vasDiff/vasBaseline)*100) : 0;
    const progColor   = vasDiff>0?"#059669":vasDiff<0?"#dc2626":"#6b7280";
    const sessionRows = sessions.length>0
      ? sessions.slice().reverse().map((s,i)=>{
          const vs=parseFloat(s.vasStart||"0")||0, ve=parseFloat(s.vasEnd||s.vasStart||"0")||0;
          const vc=vs-ve, vCol=vc>0?"#059669":vc<0?"#dc2626":"#6b7280";
          const arrow=vc>0?"&#9660;":vc<0?"&#9650;":"&harr;";
          const tx=String(s.treatmentGiven||s.treatment||""); const txShort=tx.slice(0,65)+(tx.length>65?"…":"");
          const resp=String(s.response||""); const respShort=resp.slice(0,60)+(resp.length>60?"…":"");
          return `<tr style="background:${i%2===0?"#fff":"#f8fafc"};border-bottom:1px solid #e2e8f0;">
            <td style="font-size:9px;font-weight:700;color:#2563eb;padding:6px 8px;white-space:nowrap;">S${escHtml(String(s.sessionNo||i+1))}</td>
            <td style="font-size:9px;color:#6b7280;padding:6px 8px;white-space:nowrap;">${escHtml(s.date||"")}</td>
            <td style="font-size:9px;padding:6px 8px;white-space:nowrap;"><span style="font-weight:700;color:#dc2626;">${vs}/10</span> <span style="color:${vCol};font-weight:700;">${arrow}</span> <span style="font-weight:700;color:${vCol};">${ve}/10</span></td>
            <td style="font-size:9px;color:#374151;padding:6px 8px;">${escHtml(txShort)}</td>
            <td style="font-size:8.5px;color:#6b7280;padding:6px 8px;">${escHtml(respShort)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;padding:16px;font-size:9px;color:#94a3b8;">No sessions logged yet — use Quick Visit to record each treatment session.</td></tr>`;
    return sectionCard("Outcome Measures &amp; Session Log","&#128200;",`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Baseline &amp; Target</div>
          <table><thead><tr><th>Measure</th><th>Baseline</th><th>Target</th></tr></thead><tbody>
            ${[["VAS Pain",vasBaseline?vasBaseline+"/10":"--",vasBaseline?"&le;"+targetVas+"/10":"--"],["VAS Worst",d.pa_vas_worst?d.pa_vas_worst+"/10":"--","&le;5/10"],["PSFS Score",psfsNow?psfsNow+"/10":"--",psfsNow?"&ge;"+psfsGoal+"/10":"--"],["Patient Goal",escHtml(d.ar_goal_function||d.ar_goal_pain||"--"),"Achieved"]].filter(([,b])=>b&&b!=="--").map(([m,b,t])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;padding:5px 6px;">${m}</td><td style="font-size:9px;font-weight:700;color:#dc2626;padding:5px 6px;">${b}</td><td style="font-size:9px;font-weight:700;color:#059669;padding:5px 6px;">${t}</td></tr>`).join("")}
          </tbody></table>
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Progress Summary</div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0;">
            ${[["Sessions Completed",String(sessions.length),"#1a3a5c"],["VAS Baseline",vasBaseline?vasBaseline+"/10":"Not recorded","#dc2626"],["VAS Current",vasNow&&sessions.length?vasNow+"/10":"Not recorded",progColor],["Pain Change",sessions.length&&vasBaseline?(vasDiff>=0?"-":"+")+(Math.abs(vasPct))+"%":"--",progColor]].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #e2e8f0;"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:700;color:${c};">${v}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Session History</div>
      <div style="overflow-x:auto;"><table style="min-width:600px;"><thead><tr><th style="width:40px;">Sess.</th><th style="width:75px;">Date</th><th style="width:110px;">Pain (Start&#8594;End)</th><th>Treatment Given</th><th style="width:160px;">Response</th></tr></thead>
        <tbody>${sessionRows}</tbody>
      </table></div>
    `,"#0891b2");
  })()}
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Therapist Signature:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Name / AHPRA: ___________________</div></div><div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Date:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Review Date: ___________________</div></div></div>
</div>
${pdfFooter("Treatment Plan")}
</div></body></html>`;
  };

  const buildHomeExercisePdf = () => {
    const exercises = gatherExercises();
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Your Condition");
    const nextAppt = d.next_appointment || "_______________________";
    const physioName = d.therapist_name || "Your Physiotherapist";
    const clinicName = d.clinic_name || "PhysioMind Clinic";
    const clinicPhone = d.clinic_phone || "";
    const svgKeys = Object.keys(exerciseSvgs);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Program - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:24px 36px;}.ex-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;break-inside:avoid;box-shadow:0 2px 8px rgba(0,0,0,0.05);}.ex-body{display:grid;grid-template-columns:130px 1fr;}.ex-img{background:#f8fafc;padding:12px;display:flex;align-items:center;justify-content:center;border-right:1px solid #e2e8f0;}.ex-content{padding:14px 16px;}.dosage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(75px,1fr));gap:8px;margin-bottom:10px;}.dosage-chip{text-align:center;padding:7px 6px;border-radius:8px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Home Exercise Program","Your Personalised Daily Rehabilitation Protocol","#7c3aed")}
<div class="body">
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:16px;align-items:flex-start;">
    <div style="font-size:28px;flex-shrink:0;">&#127968;</div>
    <div><div style="font-size:14px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">Hello, ${escHtml(patName.split(" ")[0]||patName)}!</div><div style="font-size:10.5px;color:#6b7280;line-height:1.6;">This personalised home exercise program has been designed specifically for you by <strong style="color:#1a3a5c;">${escHtml(physioName)}</strong> to help manage <strong style="color:#7c3aed;">${dxLabel}</strong>. Performing these exercises consistently is essential for your recovery.</div><div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">${[["&#128197;","Program Start",today],["&#128222;","Next Appointment",escHtml(nextAppt)],["&#127973;","Clinic",escHtml(clinicName)]].map(([icon,l,v])=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><span>${icon}</span><div><div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</div></div></div>`).join("")}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">${[
    ["&#128680;","Stop if you feel...","Sharp or shooting pain &bull; Numbness / tingling &bull; Sudden severe pain &bull; Dizziness or nausea","#dc2626"],
    ["&#9989;","Good pain is OK","Mild muscle ache/burn = normal. This means your muscles are working. Soreness lasting &lt;24h is acceptable.","#059669"],
    ["&#128222;","When to call us",`Contact ${escHtml(clinicName)} if symptoms worsen significantly. Do not push through severe pain.${clinicPhone?" Ph: "+escHtml(clinicPhone):""}`, "#2563eb"],
  ].map(([icon,title,text,color])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:10px;padding:12px 14px;"><div style="font-size:18px;margin-bottom:6px;">${icon}</div><div style="font-size:10px;font-weight:700;color:${color};margin-bottom:5px;">${title}</div><div style="font-size:9px;color:#6b7280;line-height:1.5;">${text}</div></div>`).join("")}</div>
  <div style="margin-bottom:14px;font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #7c3aed;padding-bottom:8px;">Your Exercises &mdash; ${exercises.length} Total</div>
  ${exercises.map((ex,i)=>{
    const phaseColors2={"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const pColor=phaseColors2[ex.phase]||"#7c3aed";
    const svgType=svgKeys[i%svgKeys.length];
    const steps=ex.notes?[ex.notes]:["Get into the starting position as shown in the illustration.","Move slowly and in a controlled manner throughout.","Hold for the time indicated, then return to start position.","Breathe normally throughout &mdash; do not hold your breath."];
    return `<div class="ex-card">
      <div style="background:linear-gradient(135deg,${pColor}15,${pColor}05);border-bottom:1px solid ${pColor}30;padding:12px 16px;display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#1a3a5c;">${escHtml(ex.name)}</div><div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap;"><span style="display:inline-block;padding:3px 8px;background:${pColor}15;border:1px solid ${pColor}40;border-radius:5px;font-size:9px;font-weight:700;color:${pColor};">${escHtml(ex.phase||"Phase 1")}</span>${ex.target?`<span style="display:inline-block;padding:3px 8px;background:#0891b215;border:1px solid #0891b240;border-radius:5px;font-size:9px;font-weight:700;color:#0891b2;">${escHtml(ex.target)}</span>`:""}</div></div>
        <div style="text-align:right;"><div style="font-size:9px;color:#6b7280;">Frequency</div><div style="font-size:12px;font-weight:800;color:${pColor};">${escHtml(ex.freq||"Daily")}</div></div>
      </div>
      <div class="ex-body">
        <div class="ex-img">${exerciseSvgHtml(i, pColor)}</div>
        <div class="ex-content">
          <div class="dosage-grid">${[["Sets",ex.sets,pColor],["Reps",ex.reps,"#2563eb"],ex.hold?["Hold",ex.hold,"#0891b2"]:null,["Rest",ex.rest||"30s","#6b7280"]].filter(Boolean).map(([l,v,c])=>`<div class="dosage-chip" style="background:${c}10;border:1px solid ${c}30;"><div style="font-size:7.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${l}</div><div style="font-size:14px;font-weight:800;color:${c};line-height:1.2;">${escHtml(v)}</div></div>`).join("")}</div>
          <div style="margin-bottom:8px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Instructions</div>${steps.map((step,si)=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e2e8f0;align-items:flex-start;font-size:10px;line-height:1.5;"><div style="width:20px;height:20px;min-width:20px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;">${si+1}</div><span style="color:#1a3a5c;">${escHtml(step)}</span></div>`).join("")}</div>
          ${ex.progression?`<div style="margin-top:6px;padding:6px 10px;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:6px;font-size:8.5px;"><strong style="color:#059669;">&#11014; When easier, progress to:</strong> ${escHtml(ex.progression)}</div>`:""}
        </div>
      </div>
    </div>`;
  }).join("")}
  ${sectionCard("Weekly Compliance Tracker","&#128197;",`<div style="margin-bottom:8px;font-size:10px;color:#6b7280;">Tick each day you complete your exercises. Aim for consistency!</div><table><thead><tr style="background:#f1f5f9;"><th style="width:35%;">Exercise</th>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=>`<th style="text-align:center;font-size:9px;font-weight:700;color:#6b7280;">${day}</th>`).join("")}</tr></thead><tbody>${exercises.map((ex,i)=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${i+1}. ${escHtml(ex.name)}</td>${Array(7).fill(0).map(()=>`<td style="text-align:center;padding:8px;"><div style="width:22px;height:22px;border:1.5px solid #e2e8f0;border-radius:4px;margin:0 auto;"></div></td>`).join("")}</tr>`).join("")}</tbody></table><div style="margin-top:12px;font-size:9px;color:#6b7280;">Pain Score Today (0&ndash;10): ___ / 10 &nbsp;&nbsp;&nbsp; Overall feeling: &#9633; Great &nbsp; &#9633; OK &nbsp; &#9633; Struggling</div>`,"#0891b2")}
  ${sectionCard("7-Day Pain Diary","&#128212;",`<div style="font-size:9px;color:#6b7280;margin-bottom:10px;">Record your pain and how you are feeling each day. Bring this to your next appointment.</div><table><thead><tr><th>Date</th><th>Morning Pain (0&ndash;10)</th><th>Evening Pain (0&ndash;10)</th><th>Exercises Done?</th><th>Notes</th></tr></thead><tbody>${Array(7).fill(0).map((_,i)=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;color:#94a3b8;padding:10px;">Day ${i+1}</td><td style="padding:10px;"><div style="width:60px;border-bottom:1px solid #e2e8f0;height:18px;"></div></td><td style="padding:10px;"><div style="width:60px;border-bottom:1px solid #e2e8f0;height:18px;"></div></td><td style="padding:10px;"><div style="display:flex;gap:8px;font-size:9px;"><span>&#9633; Yes</span><span>&#9633; No</span></div></td><td style="padding:10px;"><div style="width:100%;border-bottom:1px solid #e2e8f0;height:18px;"></div></td></tr>`).join("")}</tbody></table>`,"#7c3aed")}
  ${sectionCard("Lifestyle Advice","&#128161;",`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${[["&#10052;","Ice / Heat","Apply ice (cold pack wrapped in cloth) for 15&ndash;20 min if swollen or inflamed. Apply heat for stiffness or muscle tightness. Never apply directly to skin.","#0891b2"],["&#128716;","Activity Modification","Stay as active as possible within your pain limits. Avoid complete bed rest. Short, frequent walks are beneficial.","#059669"],["&#129506;","Posture Awareness","Be mindful of your posture during daily activities, especially sitting and lifting. Apply the postural cues discussed in your session.","#7c3aed"],["&#128222;","When to Seek Help","Return to your physiotherapist or GP immediately if: symptoms significantly worsen, new symptoms develop, or you experience any new neurological symptoms.","#dc2626"],].map(([icon,title,text,color])=>`<div style="background:${color}06;border:1px solid ${color}20;border-radius:8px;padding:10px 12px;"><div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;"><span style="font-size:14px;">${icon}</span><span style="font-size:10px;font-weight:700;color:${color};">${title}</span></div><div style="font-size:9px;color:#6b7280;line-height:1.5;">${text}</div></div>`).join("")}</div>`,"#059669")}
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;"><div><div style="font-size:12px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">${escHtml(clinicName)}</div>${clinicPhone?`<div style="font-size:11px;font-weight:600;color:#2563eb;margin-top:4px;">&#128222; ${escHtml(clinicPhone)}</div>`:""}</div><div style="border-left:1px solid rgba(124,58,237,0.2);padding-left:16px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Next Appointment</div><div style="font-size:14px;font-weight:800;color:#7c3aed;">${escHtml(nextAppt)}</div><div style="font-size:9px;color:#6b7280;margin-top:4px;">Bring this program to your session</div></div></div>
</div>
${pdfFooter("Home Exercise Program &mdash; Patient Copy")}
</div></body></html>`;
  };

  const buildPostureReportPdf = () => {
    const postScore = d.posture_score || d.post_score || "N/A";
    const postBand  = d.posture_band  || d.post_band  || "N/A";
    const cva       = d.post_cva      || d.cva_angle  || "N/A";
    const fhp       = d.post_fhp_dist || d.fhp_dist   || "N/A";
    const shAngle   = d.post_shoulder_angle || d.shoulder_angle || "N/A";
    const kyph      = d.post_kyphosis_angle || d.kyphosis_angle || "N/A";
    const lord      = d.post_lordosis_angle || d.lordosis_angle || "N/A";
    const pelv      = d.post_pelvic_tilt    || d.pelvic_tilt    || "N/A";
    const reliability = d.posture_reliability || "N/A";
    const view      = d.posture_view || "Anterior";
    const DEFECT_LABELS = {
      forward_head:"Forward Head Posture (CVA reduced)",rounded_shoulders:"Rounded/Protracted Shoulders",
      thoracic_kyphosis:"Increased Thoracic Kyphosis",lumbar_hyperlordosis:"Lumbar Hyperlordosis",
      anterior_pelvic_tilt:"Anterior Pelvic Tilt",posterior_pelvic_tilt:"Posterior Pelvic Tilt",
      lateral_pelvic_tilt:"Lateral Pelvic Tilt",genu_valgum:"Knee Medial Tendency (clinical assessment required)",
      genu_varum:"Knee Lateral Tendency (clinical assessment required)",foot_pronation:"Foot Overpronation / Flat Arch",
      foot_supination:"Foot Supination / High Arch",scoliosis:"Lateral Spinal Curvature Tendency (clinical assessment required)",
      head_tilt:"Lateral Head Tilt",scapular_winging:"Scapular Winging",
    };
    const DEFECT_MUSCLES = {
      forward_head:{tight:["Upper trapezius","SCM","Suboccipitals"],weak:["Deep neck flexors","Lower trapezius"]},
      rounded_shoulders:{tight:["Pec major","Pec minor","Subscapularis"],weak:["Lower trapezius","Rhomboids"]},
      thoracic_kyphosis:{tight:["Pec major/minor","Ant intercostals"],weak:["Thoracic extensors","Lower trap"]},
      lumbar_hyperlordosis:{tight:["Iliopsoas","QL","Lumbar erectors"],weak:["Gluteus maximus","TA"]},
      anterior_pelvic_tilt:{tight:["Iliopsoas","Rectus femoris","TFL"],weak:["Gluteus maximus","Hamstrings"]},
      posterior_pelvic_tilt:{tight:["Hamstrings","Gluteus max","Rect abdominis"],weak:["Hip flexors","Lumb ext"]},
      lateral_pelvic_tilt:{tight:["Ipsilateral QL","Ipsilateral TFL"],weak:["Contralateral glut med"]},
      genu_valgum:{tight:["TFL","IT band","Hip adductors"],weak:["Glut med","VMO","Hip ext rotators"]},
      genu_varum:{tight:["IT band","Biceps femoris"],weak:["Hip adductors","VMO"]},
      foot_pronation:{tight:["Gastrocnemius","Soleus","Peroneals"],weak:["Tib posterior","Intrinsic foot"]},
      foot_supination:{tight:["IT band","Plantar fascia"],weak:["Peroneals","Intrinsic foot muscles"]},
      scoliosis:{tight:["Ipsilateral paraspinals","Ipsilateral QL"],weak:["Contralateral paraspinals"]},
      head_tilt:{tight:["Ipsilat upper trap","SCM","Levator scap"],weak:["Contralat lateral neck flexors"]},
      scapular_winging:{tight:["Pec minor","Ant shoulder"],weak:["Serratus anterior","Lower trapezius"]},
    };
    const DEFECT_RX = {
      forward_head:"Chin tucks x15 daily - DNF activation - Pec minor stretch",
      rounded_shoulders:"Band pull-apart x20 - Face pulls x15 - Pec doorway stretch",
      thoracic_kyphosis:"Foam roller extension T4-T8 - T-spine rotation - Prone Y-T-W",
      lumbar_hyperlordosis:"Hip flexor couch stretch - Glute bridges 3x15 - Dead bug",
      anterior_pelvic_tilt:"Pelvic tilts - Couch stretch - Glute activation",
      posterior_pelvic_tilt:"Hip flexor stretching - Lumbar extension - Cat-cow",
      lateral_pelvic_tilt:"Side-lying hip abduction - Clamshells - QL stretch",
      genu_valgum:"Clamshells - Monster walks - Single-leg squat with knee tracking",
      genu_varum:"IT band foam rolling - Hip adductor strengthening",
      foot_pronation:"Short foot exercise - Calf raises - Tib posterior strengthening",
      foot_supination:"Peroneal strengthening - Single-leg balance - Lateral band walks",
      scoliosis:"Schroth breathing - Concave-side stretch - Convex-side strengthening",
      head_tilt:"Contralat cervical lat flexion stretch - Upper trap SMR",
      scapular_winging:"Serratus ant wall push-ups - Lower trap Y-T-W",
    };
    const selectedDefects = Object.keys(DEFECT_LABELS).filter(function(id) { return d["posture_defect_" + id]; });
    const dxLabel = escHtml((dx && dx.dx && dx.dx[0] && dx.dx[0].label) ? dx.dx[0].label : (d.cc_main || "Postural Dysfunction"));
    const scoreNum = parseFloat(postScore) || 0;
    const scoreColor = scoreNum >= 75 ? "#059669" : scoreNum >= 50 ? "#d97706" : "#dc2626";
    const photoImg = d.posture_photo_url || d.posture_captured_img || "";

    // Pre-build all HTML sections as plain strings -- no nested template literals
    var patientCells = [
      ["Patient", escHtml(patName)],
      ["DOB / Age", escHtml(dob) + " / " + escHtml(String(age))],
      ["Occupation", escHtml(occ)],
      ["Report Date", today],
      ["Referring GP", escHtml(gp)],
      ["Insurer", escHtml(insurer)],
      ["Method", "AI Landmark Detection"],
      ["View", escHtml(view)],
    ].map(function(p) {
      return '<div><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">' + p[0] + '</div>'
           + '<div style="font-size:10px;font-weight:600;color:#1a3a5c;">' + p[1] + '</div></div>';
    }).join("");

    var circ50 = 2 * Math.PI * 50;
    var dash = (scoreNum / 100) * circ50;
    var scoreRing = '<svg viewBox="0 0 120 120" width="110" height="110" style="display:block;margin:0 auto 8px;">'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="10"/>'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="' + scoreColor + '" stroke-width="10" stroke-dasharray="' + dash + ' ' + circ50 + '" stroke-linecap="round" transform="rotate(-90 60 60)"/>'
      + '<text x="60" y="54" text-anchor="middle" fill="' + scoreColor + '" font-size="22" font-weight="800">' + (scoreNum || "N/A") + '</text>'
      + '<text x="60" y="68" text-anchor="middle" fill="#94a3b8" font-size="9">/100</text>'
      + '<text x="60" y="82" text-anchor="middle" fill="' + scoreColor + '" font-size="8" font-weight="700">' + escHtml(postBand) + '</text>'
      + '</svg>';

    var scoreLegend = [["75-100","Excellent","#059669"],["50-74","Moderate","#d97706"],["25-49","Poor","#dc2626"],["0-24","Critical","#7f1d1d"]]
      .map(function(r) {
        return '<div style="background:' + r[2] + '12;border-radius:5px;padding:4px 6px;border:1px solid ' + r[2] + '30;">'
             + '<div style="font-size:8px;font-weight:700;color:' + r[2] + ';">' + r[1] + '</div>'
             + '<div style="font-size:7px;color:#94a3b8;">' + r[0] + '</div></div>';
      }).join("");

    var measData = [
      // Normal values per Yip 2008 (CVA), Magee 6th ed. (kyphosis, lordosis, shoulder), Lee & Nussbaum (head tilt)
      {label:"CVA (Yip 2008 norm >55°)",value:cva,  normal:"&gt;55&deg;",bad:parseFloat(cva)<49,        warn:parseFloat(cva)<55,          bc:"#dc2626"},
      {label:"Forward Head Posture",  value:fhp,     normal:"&lt;20mm",   bad:parseFloat(fhp)>30,        warn:parseFloat(fhp)>20,          bc:"#dc2626"},
      {label:"Shoulder Asymmetry",    value:shAngle, normal:"&lt;2.5&deg;",bad:parseFloat(shAngle)>5,   warn:parseFloat(shAngle)>2.5,     bc:"#d97706"},
      {label:"Thoracic Kyphosis Est.",value:kyph,    normal:"20–45&deg;", bad:parseFloat(kyph)>50,      warn:parseFloat(kyph)>45,         bc:"#d97706"},
      {label:"Lumbar Lordosis Est.",  value:lord,    normal:"40–60&deg;", bad:parseFloat(lord)>65||parseFloat(lord)<30, warn:false,       bc:"#d97706"},
      {label:"Pelvic Tilt (proxy)",   value:pelv,    normal:"0–5&deg;",   bad:false,                     warn:false,                       bc:"#6b7280"},
    ];
    var measCards = measData.map(function(m) {
      var c = (m.bad && m.value !== "N/A") ? m.bc : (m.warn && m.value !== "N/A") ? "#d97706" : (m.value === "N/A" ? "#94a3b8" : "#059669");
      var status = m.value === "N/A" ? "N/A" : m.bad ? "Outside Normal" : m.warn ? "Borderline" : "Normal";
      return '<div style="background:' + c + '08;border:1px solid ' + c + '25;border-radius:8px;padding:9px 11px;border-left:3px solid ' + c + ';">'
           + '<div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">' + m.label + '</div>'
           + '<div style="font-size:18px;font-weight:800;color:' + c + ';line-height:1;">' + escHtml(String(m.value)) + '</div>'
           + '<div style="display:flex;justify-content:space-between;margin-top:3px;">'
           + '<span style="font-size:7.5px;color:#94a3b8;">Norm: ' + m.normal + '</span>'
           + '<span style="font-size:7.5px;font-weight:700;color:' + c + ';">' + status + '</span>'
           + '</div></div>';
    }).join("");

    var defectRows = selectedDefects.map(function(id, i) {
      var label = DEFECT_LABELS[id] || id;
      var sev = d["posture_defect_" + id + "_severity"] || "mild";
      var sc = sev === "severe" ? "#dc2626" : sev === "moderate" ? "#d97706" : "#059669";
      var muscles = DEFECT_MUSCLES[id];
      var tight = muscles ? muscles.tight.slice(0,2).join(", ") : "N/A";
      var rx = DEFECT_RX[id] || "Clinical assessment required";
      return '<tr style="background:' + (i%2===0?"#fff":"#f8fafc") + ';">'
           + '<td style="font-size:9.5px;font-weight:700;color:#1a3a5c;">' + escHtml(label) + '</td>'
           + '<td><span style="padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;background:' + sc + '15;color:' + sc + ';">' + sev.charAt(0).toUpperCase() + sev.slice(1) + '</span></td>'
           + '<td style="font-size:8.5px;color:#6b7280;">' + escHtml(tight) + '</td>'
           + '<td style="font-size:8.5px;color:#1a3a5c;">' + rx + '</td></tr>';
    }).join("");

    var defectSection = selectedDefects.length > 0
      ? sectionCard("Regional Postural Findings", "&#128450;",
          '<table><thead><tr><th>Region / Defect</th><th>Severity</th><th>Tight Structures</th><th>Clinical Action</th></tr></thead>'
          + '<tbody>' + defectRows + '</tbody></table>', "#64748b")
      : sectionCard("Regional Postural Findings", "&#128450;",
          '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:10px;">No postural defects recorded. Use the Posture Defect Assessment module to document findings.</div>',
          "#64748b");

    var hasUCS = selectedDefects.some(function(id) { return id==="forward_head"||id==="rounded_shoulders"||id==="thoracic_kyphosis"; });
    var hasLCS = selectedDefects.some(function(id) { return id==="anterior_pelvic_tilt"||id==="lumbar_hyperlordosis"; });
    var regionSet = {};
    selectedDefects.forEach(function(id) {
      regionSet[(id.indexOf("foot")>=0||id.indexOf("genu")>=0)?"Lower Limb":(id.indexOf("thoracic")>=0||id.indexOf("shoulder")>=0||id.indexOf("scapular")>=0)?"Thoracic":"Spinal/Pelvic"] = 1;
    });
    var regions = Object.keys(regionSet).join(", ") || "N/A";
    var scoreMsg = scoreNum < 50 ? "Priority intervention required." : scoreNum < 75 ? "Moderate dysfunction -- structured correction indicated." : "Good alignment -- maintenance program recommended.";

    var bioCards = [
      {title:"Upper Crossed Pattern Tendency", active:hasUCS, text:"Possible overactivity: upper trapezius/pectorals. Possible underactivity: deep neck flexors. May contribute to forward head and shoulder protraction tendency. Clinical muscle testing required to confirm.", color:"#dc2626"},
      {title:"Lower Crossed Pattern Tendency", active:hasLCS, text:"Possible overactivity: hip flexors/lumbar extensors. Possible underactivity: glutes/TA. May contribute to anterior pelvic tilt tendency. Clinical assessment required to confirm.", color:"#d97706"},
      {title:"Kinetic Chain Impact",   active:true,   text:"Compensatory load across the kinetic chain. " + selectedDefects.length + " defect(s) identified across " + regions + " regions.", color:"#0891b2"},
      {title:"Postural Load Index",    active:true,   text:"AI Posture Score: " + scoreNum + "/100 (" + escHtml(postBand) + "). " + scoreMsg, color:scoreColor},
    ].map(function(item) {
      return '<div style="background:' + item.color + '06;border:1px solid ' + item.color + '20;border-radius:8px;padding:10px 12px;' + (!item.active?"opacity:0.45;":"") + '">'
           + '<div style="font-size:9px;font-weight:700;color:' + item.color + ';margin-bottom:4px;">' + item.title + '</div>'
           + '<div style="font-size:9px;color:#6b7280;line-height:1.6;">' + item.text + '</div></div>';
    }).join("");

    var bioSection = selectedDefects.length > 0
      ? sectionCard("Biomechanical Correlation","&#129518;",
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + bioCards + '</div>', "#7c3aed")
      : "";

    var firstLabel = selectedDefects.length > 0 ? (DEFECT_LABELS[selectedDefects[0]] || "primary deficit") : "";
    var immItems = selectedDefects.length > 0
      ? ["Address " + firstLabel, scoreNum < 50 ? "Refer for comprehensive postural assessment" : "Postural education and awareness", "Ergonomic review"]
      : ["Postural education","Ergonomic review","Activity modification"];

    var recoCols = [
      {priority:"Immediate",           items:immItems,                                                                                    color:"#dc2626"},
      {priority:"Short-Term (2-4 wks)",items:["Targeted muscle activation","Manual therapy - restricted segments","Daily HEP program"],  color:"#d97706"},
      {priority:"Long-Term (6-12 wks)",items:["Postural re-education","Progressive strengthening","Self-management and prevention"],      color:"#059669"},
    ].map(function(col) {
      var rows = col.items.map(function(item) {
        return '<div style="display:flex;gap:5px;margin-bottom:4px;align-items:flex-start;">'
             + '<span style="color:' + col.color + ';font-weight:700;font-size:10px;flex-shrink:0;">-&gt;</span>'
             + '<span style="font-size:8.5px;color:#475569;line-height:1.5;">' + item + '</span></div>';
      }).join("");
      return '<div style="background:' + col.color + '06;border:1px solid ' + col.color + '25;border-radius:8px;padding:9px 11px;">'
           + '<div style="font-size:8.5px;font-weight:800;color:' + col.color + ';text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px;">' + col.priority + '</div>'
           + rows + '</div>';
    }).join("");

    var recoSection = sectionCard("Clinical Recommendations","&#128203;",
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;">' + recoCols + '</div>', "#059669");

    var methodRows = [
      ["AI Engine","MediaPipe BlazePose"],
      ["View", escHtml(view)],
      ["Reliability", escHtml(reliability)],
      ["Landmarks","33 body landmarks"],
      ["Calibration", d.posture_calibration || "Auto"],
      ["Platform","PhysioMind AI"],
    ].map(function(r) {
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0;">'
           + '<span style="font-size:8.5px;color:#94a3b8;">' + r[0] + '</span>'
           + '<span style="font-size:8.5px;font-weight:600;color:#1a3a5c;">' + r[1] + '</span></div>';
    }).join("");

    var photoBlock = photoImg
      ? '<img src="' + photoImg + '" style="width:100%;border-radius:8px;margin-bottom:6px;object-fit:cover;max-height:220px;" alt="Postural photo"/>'
      : '<div style="background:#f1f5f9;border-radius:8px;height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #cbd5e1;margin-bottom:8px;">'
        + '<div style="font-size:9px;font-weight:700;color:#6b7280;margin-bottom:3px;">AI-Analysed Photo</div>'
        + '<div style="font-size:8px;color:#94a3b8;">with Landmark Overlay</div></div>';

    var sigRow = [["Treating Physiotherapist",""],["Signature",""],["Date / Stamp", today]].map(function(p) {
      return '<div>'
           + '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">' + p[0] + '</div>'
           + '<div style="height:30px;border-bottom:1.5px solid #334155;margin-bottom:3px;display:flex;align-items:flex-end;">'
           + '<span style="font-size:10px;font-weight:600;color:#1e293b;">' + escHtml(p[1]) + '</span></div></div>';
    }).join("");

    return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Posture Analysis Report - PhysioMind</title>"
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:7px 9px;text-align:left;}td{padding:6px 9px;font-size:10px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>"
      + "</head><body><div class=\"page\">"
      + pdfHeader("Posture Screening Report","AI-Assisted Posture Screening &middot; Education only, not a medical diagnosis &middot; PhysioMind","#0a1628")
      + "<div class=\"body\">"
      + "<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;padding:13px;background:#f1f5f9;border-radius:10px;border:1px solid #e2e8f0;\">" + patientCells + "</div>"
      + "<div style=\"background:linear-gradient(135deg,#0a1628,#1a3358);border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:14px;align-items:center;border:1px solid #1a3358;\">"
      + "<div style=\"flex:1;\">"
      + "<div style=\"font-size:9px;color:#e8c96e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;\">Clinical Diagnosis</div>"
      + "<div style=\"font-size:14px;font-weight:800;color:#fff;\">" + dxLabel + "</div>"
      + "<div style=\"font-size:8.5px;color:rgba(255,255,255,0.5);margin-top:2px;\">MediaPipe BlazePose AI &middot; 33 landmarks &middot; " + escHtml(view) + " view</div>"
      + "</div><div style=\"flex-shrink:0;text-align:center;\">" + scoreRing + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 230px;gap:18px;align-items:start;\">"
      + "<div>"
      + sectionCard("Quantitative Postural Measurements","&#128207;",
          "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:12px;\">" + measCards + "</div>"
          + "<div style=\"padding:8px 11px;background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.15);border-radius:7px;font-size:8.5px;color:#1a3a5c;\">"
          + "<strong style=\"color:#2563eb;\">AI Reliability:</strong> " + escHtml(reliability)
          + " &nbsp;&middot;&nbsp; <strong>View:</strong> " + escHtml(view)
          + " &nbsp;&middot;&nbsp; <strong>Calibration:</strong> " + (d.posture_calibration || "Auto") + "</div>",
          "#0891b2")
      + defectSection
      + bioSection
      + recoSection
      + "</div>"
      + "<div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;\">Overall Posture Score</div>"
      + scoreRing
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:5px;\">" + scoreLegend + "</div></div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;\">Postural Photo</div>"
      + photoBlock
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;margin-top:3px;\">Assessment Method</div>"
      + methodRows + "</div>"
      + "<div style=\"background:#fef3c7;border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:9px 11px;\">"
      + "<div style=\"font-size:8px;font-weight:700;color:#92400e;margin-bottom:3px;\">Clinical Disclaimer</div>"
      + "<div style=\"font-size:8px;color:#92400e;line-height:1.6;\">AI-assisted assessment is a clinical decision support tool. All measurements require clinical correlation and must be interpreted by a qualified physiotherapist.</div></div>"
      + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;\">" + sigRow + "</div>"
      + "</div>"
      + pdfFooter("Postural Analysis Report &mdash; PhysioMind AI Platform")
      + "</div></body></html>";
  };

  const openPdf = (htmlContent) => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for PDF generation"); return; }
    win.document.open(); win.document.write(htmlContent); win.document.close();
    setTimeout(() => { try { win.print(); } catch(e) {} }, 800);
  };

  const generatePdf = async (type) => {
    setGenerating(type);
    await new Promise(r => setTimeout(r, 400));
    try {
      let html = "";
      if (type === "assessment") html = buildAssessmentPdf();
      else if (type === "treatment") html = buildTreatmentPdf();
      else if (type === "hep") html = buildHomeExercisePdf();
      else if (type === "posture") html = buildPostureReportPdf();
      openPdf(html);
      setDone(p => ({...p, [type]: true}));
    } catch(e) { console.error(e); alert("Error generating PDF: " + e.message); }
    setGenerating(null);
  };

  const reports = [
    { id:"assessment", icon:"&#129321;", title:"Assessment Report", subtitle:"Initial Clinical Evaluation", desc:"Comprehensive physiotherapy assessment: demographics, pain scores, ROM table, postural analysis with anatomical diagram, special tests, clinical diagnosis, neurological & palpation findings, and signed clinical summary.", color:"#1a3a5c", gradient:"linear-gradient(135deg,#1a3a5c,#2563eb)", tags:["Demographics","VAS Scores","Posture Diagram","ROM Table","Diagnosis","Special Tests","Signature"], pages:"2-3 pages" },
    { id:"treatment", icon:"&#127959;", title:"Treatment Plan", subtitle:"Clinical Management Program", desc:"Evidence-based treatment plan with phased exercise prescription, manual therapy techniques and dosage, SMART goals timeline, outcome measures with baselines, reassessment schedule, and clinical precautions.", color:"#059669", gradient:"linear-gradient(135deg,#065f46,#059669)", tags:["Phased Exercises","Manual Therapy","SMART Goals","Outcome Measures","Precautions","Reassessment"], pages:"2-3 pages" },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#ffffff",borderRadius:20,maxWidth:760,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.4)"}}>
        <div style={{background:"linear-gradient(135deg,#1a3a5c 0%,#2563eb 50%,#7c3aed 100%)",borderRadius:"20px 20px 0 0",padding:"24px 28px",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:"24px"}}>📄</span>
                <div><h2 style={{margin:0,fontSize:"1.3rem",fontWeight:800,letterSpacing:"-0.3px"}}>Clinical PDF Reports</h2><p style={{margin:"2px 0 0",fontSize:"0.75rem",opacity:0.8}}>Assessment &amp; Treatment PDF — patient-specific</p></div>
              </div>
              {patName !== "Patient" && <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:"rgba(255,255,255,0.12)",borderRadius:8,width:"fit-content"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#34d399"}}/><span style={{fontSize:"0.8rem",fontWeight:600}}>{patName}</span>{age && age !== "--" && <span style={{fontSize:"0.82rem",opacity:0.7}}>&#183; Age {age}</span>}</div>}
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"8px 14px",fontSize:"0.8rem",fontWeight:600}}>✕ Close</button>
          </div>
        </div>
        <div style={{padding:"24px 28px"}}>
          <div style={{background:"rgba(37,99,235,0.06)",border:"1px solid rgba(37,99,235,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:"16px",flexShrink:0}}>💡</span>
            <div style={{fontSize:"0.78rem",color:"#1e40af",lineHeight:1.6}}>Each PDF opens in a new browser tab. Use <strong>Print -&gt; Save as PDF</strong> (enable Background Graphics for full colour). Data is pulled from your current patient assessment automatically.</div>
          </div>
          <div style={{display:"grid",gap:14}}>
            {reports.map(report => (
              <div key={report.id} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:0}}>
                  <div style={{padding:"18px 20px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                      <div style={{width:44,height:44,background:report.gradient,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}} dangerouslySetInnerHTML={{__html:report.icon}}/>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h3 style={{margin:0,fontSize:"1rem",fontWeight:800,color:"#1e293b"}}>{report.title}</h3><span style={{fontSize:"0.82rem",padding:"2px 7px",borderRadius:5,background:"rgba(100,116,139,0.12)",color:"#64748b",fontWeight:600}}>{report.pages}</span></div>
                        <p style={{margin:0,fontSize:"0.75rem",color:"#64748b",fontWeight:500}}>{report.subtitle}</p>
                      </div>
                    </div>
                    <p style={{margin:"0 0 10px",fontSize:"0.78rem",color:"#475569",lineHeight:1.6}}>{report.desc}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{report.tags.map(tag=><span key={tag} style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:5,background:report.color+"12",border:`1px solid ${report.color}25`,color:report.color,fontWeight:600}}>{tag}</span>)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"18px 20px",borderLeft:"1px solid #e2e8f0",minWidth:130,gap:10}}>
                    {done[report.id] && <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(5,150,105,0.1)",border:"1px solid rgba(5,150,105,0.3)",borderRadius:8}}><span style={{color:"#059669",fontSize:"0.75rem",fontWeight:700}}>✓ Generated</span></div>}
                    <button data-pdf-type={report.id} onClick={()=>generatePdf(report.id)} disabled={generating!==null} style={{width:"100%",padding:"12px 16px",background:generating===report.id?"#94a3b8":report.gradient,border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:generating?"not-allowed":"pointer",opacity:generating&&generating!==report.id?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                      {generating===report.id?"⏳ Generating...":"📥 Generate PDF"}
                    </button>
                    <div style={{fontSize:"0.75rem",color:"#94a3b8",textAlign:"center",lineHeight:1.4}}>Opens in new tab<br/>Print → Save as PDF</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:18,padding:"16px 20px",background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04))",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div><div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e293b"}}>Generate Both Reports</div><div style={{fontSize:"0.82rem",color:"#64748b",marginTop:2}}>Download Assessment &amp; Treatment PDFs for <strong>{patName}</strong></div></div>
            <button onClick={async()=>{for(const r of reports){await generatePdf(r.id);await new Promise(res=>setTimeout(res,1500));}}} disabled={generating!==null} style={{padding:"12px 22px",background:"linear-gradient(135deg,#1a3a5c,#7c3aed)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.8rem",cursor:generating?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0,boxShadow:"0 2px 12px rgba(124,58,237,0.3)"}}>
              📄 Generate All
            </button>
          </div>


          <div style={{marginTop:14,padding:"12px 16px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10}}>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>💡 Tips for best results</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
              {["Complete patient demographics before generating","Add exercises in the Exercise Prescription module","Record ROM measurements for detailed tables","Run AI Diagnosis first for diagnostic content","Use Chrome or Edge for best PDF quality","Enable Print: Background Graphics for full colour"].map(tip=>(
                <div key={tip} style={{fontSize:"0.82rem",color:"#94a3b8",display:"flex",gap:6,alignItems:"flex-start",padding:"2px 0"}}><span style={{color:"#7c3aed",fontWeight:700,flexShrink:0}}>→</span>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







// ── HEP protocol helpers — versioned home programme with WhatsApp/PDF send ──
function hepDose(e){ const st=e.customSets||e.sets, rp=e.customReps||e.reps, hd=e.customHold||e.hold, fq=e.customFreq||e.freq; return `${st}×${rp}${hd?` · hold ${hd}s`:""}${fq?` · ${fq}`:""}`; }
function buildHepWhatsAppText(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length) return "";
  const v=parseInt(d.hep_version)||1;
  const lines=prog.map((e,i)=>`${i+1}. ${e.name} — ${hepDose(e)}`);
  return `🏥 ${d.clinic_name||"PhysioMind"} — Home Exercise Programme (v${v})\nPatient: ${d.dem_name||""}\nDate: ${new Date().toLocaleDateString("en-GB")}\n\n${lines.join("\n")}\n\nStop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.`;
}
function sendHepWhatsApp(d){
  const text=buildHepWhatsAppText(d);
  if(!text){alert("No exercises in the home protocol yet.");return;}
  const phone=String(d.dem_phone||d.dem_contact||"").replace(/[^0-9]/g,"");
  const url=phone.length>=10?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,"_blank");
}
function downloadHepPdf(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length){alert("No exercises in the home protocol yet.");return;}
  const v=parseInt(d.hep_version)||1;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Programme</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}body{background:#fff;color:#1a1a2e;font-size:11px;line-height:1.55}.header{border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}.logo{font-size:20px;font-weight:900;color:#7c3aed}.meta{text-align:right;font-size:10px;color:#555}.ex{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}.ex-h{background:#7c3aed;color:#fff;padding:8px 12px;display:flex;justify-content:space-between}.ex-t{font-size:12px;font-weight:800}.ex-b{padding:10px 12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.st{background:#f5f3ff;border-radius:6px;padding:5px 8px;text-align:center}.sv{font-size:13px;font-weight:900;color:#7c3aed}.sl{font-size:8px;color:#64748b;text-transform:uppercase}.desc{font-size:10.5px;color:#334155;margin-bottom:6px}.cues{background:#fefce8;border-left:3px solid #fbbf24;padding:5px 8px;font-size:10px;color:#713f12}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div class="header"><div><div class="logo">PhysioMind</div><div style="font-size:11px;color:#555;margin-top:2px">Home Exercise Programme — v${v}</div></div><div class="meta"><div><b>Patient:</b> ${d.dem_name||"—"}</div><div><b>Date:</b> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div></div></div>
<p style="font-size:10px;color:#555;margin-bottom:14px">Perform exercises as prescribed. Stop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.</p>
${prog.map((ex,i)=>`<div class="ex"><div class="ex-h"><span class="ex-t">${i+1}. ${ex.name}</span><span style="font-size:9px;opacity:0.85">${ex.phase||""}</span></div><div class="ex-b"><div class="grid"><div class="st"><div class="sv">${ex.customSets||ex.sets||"—"}</div><div class="sl">Sets</div></div><div class="st"><div class="sv">${ex.customReps||ex.reps||"—"}</div><div class="sl">Reps</div></div><div class="st"><div class="sv">${(ex.customHold||ex.hold)?(ex.customHold||ex.hold)+"s":"—"}</div><div class="sl">Hold</div></div><div class="st"><div class="sv" style="font-size:9px">${ex.customFreq||ex.freq||"—"}</div><div class="sl">Freq</div></div></div><div class="desc">${ex.desc||""}</div>${ex.cues?`<div class="cues">💡 ${ex.cues}</div>`:""}</div></div>`).join("")}
<div class="footer">Generated by PhysioMind · ${new Date().toLocaleString()}</div>
</body></html>`;
  try{ downloadPDFFromHTML(html, `HEP_v${v}_${d.dem_name||"Patient"}_${Date.now()}.pdf`); }
  catch(e){ const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>{try{w.print();}catch(_){}},500); }
}

function QuickVisitForm({ PC, data, set, navTo }) {
  const sessionsArr = Array.isArray(data.tx_sessions)?data.tx_sessions:[];
  const lastSession = sessionsArr[0];
  const sessionNo = sessionsArr.length+1;
  const [qv, setQv] = useState({pain_today:data.cc_vas_now||"",pain_after:"",treatment:lastSession?.treatmentGiven||"",response:"",next_plan:""});
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState([]);          // protocol change descriptions this visit
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("library");   // "library" | "templates"
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerRegion, setPickerRegion] = useState("all");
  const [openTemplate, setOpenTemplate] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDose, setEditDose] = useState({sets:"",reps:"",hold:""});
  const [removeId, setRemoveId] = useState(null);
  const txOptions = ["Joint mobilisation","Soft tissue massage","Dry needling","Exercise therapy","TENS/IFT","Neural mobilisation","Taping/strapping","Education & advice","Postural correction","Manual therapy","Other"];
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const lbl = {fontSize:"0.8rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};

  const prog = Array.isArray(data.hep_programme)?data.hep_programme:[];

  const addExercise = (ex) => {
    if(prog.find(p=>p.id===ex.id)) { setPickerOpen(false); return; }
    set("hep_programme",[...prog,{...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}]);
    setPending(p=>[...p,`＋ ${ex.name}`]);
    setPickerOpen(false); setPickerSearch("");
  };
  const removeExercise = (id,reason) => {
    const ex=prog.find(p=>p.id===id);
    set("hep_programme",prog.filter(p=>p.id!==id));
    setPending(p=>[...p,`− ${ex?.name||id}${reason?` (${reason.toLowerCase()})`:""}`]);
    setRemoveId(null);
  };
  const startProgress = (e) => { setEditId(e.id); setEditDose({sets:String(e.customSets||e.sets||""),reps:String(e.customReps||e.reps||""),hold:String(e.customHold||e.hold||"")}); };
  const applyProgress = () => {
    const ex=prog.find(p=>p.id===editId); if(!ex){setEditId(null);return;}
    set("hep_programme",prog.map(p=>p.id===editId?{...p,customSets:editDose.sets,customReps:editDose.reps,customHold:editDose.hold,progressedSession:sessionNo}:p));
    setPending(p=>[...p,`↑ ${ex.name} ${editDose.sets}×${editDose.reps}${editDose.hold?` · ${editDose.hold}s`:""}`]);
    setEditId(null);
  };

  const addTx = (t) => setQv(p=>({...p,treatment:p.treatment?(p.treatment.includes(t)?p.treatment:`${p.treatment}, ${t}`):t}));
  const addTemplate = (key) => {
    const t=PROGRAMME_TEMPLATES[key]; if(!t) return;
    const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean).filter(e=>!prog.find(p=>p.id===e.id));
    if(exs.length){
      set("hep_programme",[...prog,...exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}))]);
      setPending(p=>[...p,`＋ ${t.label} template (${exs.length} exercise${exs.length!==1?"s":""})`]);
    }
  };
  const pickerResults = (()=>{
    if(!pickerOpen) return [];
    let pool = pickerRegion==="all" ? ALL_EXERCISES : (Object.values(EXERCISE_DB[pickerRegion]?.categories||{}).flat());
    const q=pickerSearch.trim().toLowerCase();
    if(q) pool=pool.filter(e=>e.name.toLowerCase().includes(q)||String(e.target||"").toLowerCase().includes(q));
    return pool.filter(e=>!prog.find(p=>p.id===e.id)).slice(0,8);
  })();

  const saveQuick = () => {
    set("cc_vas_now",qv.pain_today);
    let hepNote="";
    if(pending.length){
      const version=(parseInt(data.hep_version)||1)+1;
      set("hep_version",version);
      const log=Array.isArray(data.hep_log)?data.hep_log:[];
      set("hep_log",[{session:sessionNo,date:new Date().toLocaleDateString("en-GB"),changes:pending,version},...log]);
      hepNote=`HEP v${version}: ${pending.join(" · ")}`;
    }
    set("soap_extra_p",[qv.next_plan,hepNote].filter(Boolean).join(" | "));
    const entry = {id:(Date.now()).toString(36),date:new Date().toLocaleDateString("en-GB"),sessionNo,type:"Follow-up Treatment",vasStart:qv.pain_today,vasEnd:qv.pain_after||qv.pain_today,treatmentGiven:qv.treatment,response:qv.response,nextPlan:qv.next_plan,hepChanges:pending,savedAt:new Date().toISOString()};
    set("tx_sessions",[entry,...sessionsArr]);
    setPending([]);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
    navTo("soap");
  };

  const Pill=({bg,col,children,onClick,title})=>(
    <span onClick={onClick} title={title} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:7,background:bg,color:col,fontSize:"0.8rem",fontWeight:800,cursor:"pointer",flexShrink:0,userSelect:"none"}}>{children}</span>
  );

  return(
    <div>
      <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>1 · Today — Session {sessionNo}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={lbl}>Pain — start of session (NRS 0–10)</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 5" value={qv.pain_today} onChange={e=>setQv(p=>({...p,pain_today:e.target.value}))}/></div>
        <div><label style={lbl}>Pain — end of session (NRS 0–10)</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 3" value={qv.pain_after} onChange={e=>setQv(p=>({...p,pain_after:e.target.value}))}/></div>
        <div><label style={lbl}>Treatment given {lastSession?.treatmentGiven?<span style={{textTransform:"none",fontWeight:500}}>(copied from S{lastSession.sessionNo||sessionNo-1})</span>:null}</label><input style={inp} placeholder="Tap chips below or type…" value={qv.treatment} onChange={e=>setQv(p=>({...p,treatment:e.target.value}))}/></div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
        {txOptions.map(t=>(
          <button key={t} onClick={()=>setQv(p=>({...p,treatment:p.treatment?(p.treatment.includes(t)?p.treatment:`${p.treatment}, ${t}`):t}))}
            style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(t)?PC.accent:PC.border}`,background:qv.treatment.includes(t)?`${PC.accent}14`:"transparent",color:qv.treatment.includes(t)?PC.accent:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{t}</button>
        ))}
      </div>
      <div style={{marginBottom:10}}><label style={lbl}>Patient response</label><input style={inp} placeholder="e.g. Good improvement, less pain on movement" value={qv.response} onChange={e=>setQv(p=>({...p,response:e.target.value}))}/></div>
      <div style={{marginBottom:12}}><label style={lbl}>Plan for next session</label><input style={inp} placeholder="e.g. Progress to single-leg squat" value={qv.next_plan} onChange={e=>setQv(p=>({...p,next_plan:e.target.value}))}/></div>

      {/* ── 2 · Home protocol — edit per session ── */}
      <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>2 · Home protocol {prog.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· v{parseInt(data.hep_version)||1} · {prog.length} exercise{prog.length!==1?"s":""}</span>}</div>
      {prog.length===0&&(
        <div style={{padding:"10px 12px",background:PC.s2,borderRadius:9,fontSize:"0.8rem",color:PC.muted,marginBottom:8}}>No protocol yet — add exercises below or build it in the Exercise Prescription tab.</div>
      )}
      {prog.map(e=>(
        <div key={e.id} style={{marginBottom:5}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:e.addedSession===sessionNo?`${PC.accent}10`:PC.s2,border:`1px solid ${e.addedSession===sessionNo?PC.accent+"35":PC.border}`,borderRadius:9}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{e.name}
                {e.addedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.accent}}>＋ just added</span>}
                {e.progressedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.a3}}>↑ progressed</span>}
              </div>
              <div style={{fontSize:"0.82rem",color:PC.muted}}>{hepDose(e)}</div>
            </div>
            <Pill bg={`${PC.a3}18`} col={PC.a3} title="Progress dosage" onClick={()=>startProgress(e)}>↑</Pill>
            <Pill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>setRemoveId(removeId===e.id?null:e.id)}>−</Pill>
          </div>
          {editId===e.id&&(
            <div style={{display:"flex",gap:6,alignItems:"center",padding:"7px 10px",background:`${PC.a3}08`,border:`1px dashed ${PC.a3}40`,borderRadius:9,marginTop:3}}>
              {["sets","reps","hold"].map(f=>(
                <input key={f} style={{...inp,width:62,padding:"5px 7px",fontSize:"0.82rem"}} placeholder={f} value={editDose[f]} onChange={ev=>setEditDose(p=>({...p,[f]:ev.target.value}))}/>
              ))}
              <span style={{fontSize:"0.78rem",color:PC.muted}}>sets × reps · hold s</span>
              <button onClick={applyProgress} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:7,border:"none",background:PC.a3,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Apply</button>
            </div>
          )}
          {removeId===e.id&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"7px 10px",background:"rgba(220,38,38,0.05)",border:"1px dashed rgba(220,38,38,0.35)",borderRadius:9,marginTop:3,alignItems:"center"}}>
              <span style={{fontSize:"0.8rem",color:"#dc2626",fontWeight:700}}>Why?</span>
              {["Mastered","Aggravating","Replaced","Other"].map(r=>(
                <button key={r} onClick={()=>removeExercise(e.id,r)} style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(220,38,38,0.3)",background:"transparent",color:"#dc2626",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>{r}</button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add exercise — library picker */}
      {!pickerOpen?(
        <div onClick={()=>setPickerOpen(true)} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer",marginBottom:10}}>＋ Add exercise from library</div>
      ):(
        <div style={{border:`1.5px solid ${PC.accent}35`,borderRadius:11,padding:"10px",marginBottom:10,background:`${PC.accent}06`}}>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            {[["library","📚 Library"],["templates","📦 Templates"]].map(([m,l])=>(
              <button key={m} onClick={()=>setPickerMode(m)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${pickerMode===m?PC.accent:PC.border}`,background:pickerMode===m?`${PC.accent}15`:"transparent",color:pickerMode===m?PC.accent:PC.muted,fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>{l}</button>
            ))}
            <button onClick={()=>setPickerOpen(false)} style={{padding:"0 10px",borderRadius:8,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,cursor:"pointer",fontWeight:700}}>✕</button>
          </div>
          {pickerMode==="templates"&&(
            <div>
              {Object.entries(PROGRAMME_TEMPLATES).map(([key,t])=>{
                const tx=TEMPLATE_TX[key];
                const isOpen=openTemplate===key;
                return(
                  <div key={key} style={{marginBottom:4}}>
                    <div onClick={()=>setOpenTemplate(isOpen?null:key)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${isOpen?PC.accent+"45":PC.border}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{t.label}</div>
                        <div style={{fontSize:"0.78rem",color:PC.muted}}>{t.exercises.length} exercises{tx?` · ${(tx.manual||[]).length} manual · ${(tx.machine||[]).length} machine`:""}</div>
                      </div>
                      <span style={{fontSize:"0.75rem",color:PC.accent,fontWeight:800}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"8px 10px",border:`1px dashed ${PC.accent}35`,borderTop:"none",borderRadius:"0 0 8px 8px",background:`${PC.accent}05`}}>
                        <button onClick={()=>{addTemplate(key);setOpenTemplate(null);}} style={{width:"100%",padding:"8px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:"pointer",marginBottom:7}}>＋ Add {t.exercises.length} exercises to protocol</button>
                        {tx&&(tx.manual||[]).length>0&&(
                          <div style={{marginBottom:5}}>
                            <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>🤲 Manual — tap to add to treatment</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {tx.manual.map(m=><button key={m} onClick={()=>addTx(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(m)?PC.accent:PC.border}`,background:qv.treatment.includes(m)?`${PC.accent}14`:PC.surface,color:qv.treatment.includes(m)?PC.accent:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{qv.treatment.includes(m)?"✓ ":""}{m}</button>)}
                            </div>
                          </div>
                        )}
                        {tx&&(tx.machine||[]).length>0&&(
                          <div>
                            <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>⚡ Machine — tap to add to treatment</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {tx.machine.map(m=><button key={m} onClick={()=>addTx(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(m)?PC.a2:PC.border}`,background:qv.treatment.includes(m)?`${PC.a2}14`:PC.surface,color:qv.treatment.includes(m)?PC.a2:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{qv.treatment.includes(m)?"✓ ":""}{m}</button>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {pickerMode==="library"&&(
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <input autoFocus style={{...inp,flex:1}} placeholder="Search exercises… e.g. plank, chin tuck" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}/>
            <select style={{...inp,width:120}} value={pickerRegion} onChange={e=>setPickerRegion(e.target.value)}>
              <option value="all">All regions</option>
              {Object.entries(EXERCISE_DB).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>
          )}
          {pickerMode==="library"&&pickerResults.length===0&&<div style={{fontSize:"0.66rem",color:PC.muted,padding:"4px 2px"}}>No matches — try another term or region.</div>}
          {pickerMode==="library"&&pickerResults.map(ex=>(
            <div key={ex.id} onClick={()=>addExercise(ex)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${PC.border}`,marginBottom:4}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{ex.name}</div>
                <div style={{fontSize:"0.78rem",color:PC.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.sets}×{ex.reps}{ex.hold?` · ${ex.hold}s`:""} · {ex.freq} · {ex.target}</div>
              </div>
              <span style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,flexShrink:0}}>＋ Add</span>
            </div>
          ))}
        </div>
      )}

      {pending.length>0&&(
        <div style={{padding:"8px 11px",background:`${PC.accent}0a`,border:`1px solid ${PC.accent}25`,borderRadius:9,fontSize:"0.75rem",color:PC.text,marginBottom:10,lineHeight:1.6}}>
          <span style={{fontWeight:800,color:PC.accent}}>This session:</span> {pending.join(" · ")} <span style={{color:PC.muted}}>(will be logged as v{(parseInt(data.hep_version)||1)+1} on save)</span>
        </div>
      )}

      <button onClick={saveQuick} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",marginBottom:8}}>
        {saved?"✅ Saved — opening SOAP to sign…":"Save & Go to SOAP →"}
      </button>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>sendHepWhatsApp(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a3}40`,background:`${PC.a3}10`,color:PC.a3,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📲 Send protocol — WhatsApp</button>
        <button onClick={()=>downloadHepPdf(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a2}40`,background:`${PC.a2}10`,color:PC.a2,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📄 PDF handout</button>
      </div>
    </div>
  );
}

function IntakeForm({ PC, currentUser, onCancel, onSubmit }) {
  // Fills the "nothing saves until you finish the whole intake form" gap:
  // before a patient record exists there's nowhere in Supabase to attach
  // this data to yet, and saving it to the cloud before the student has even
  // reached the Consent tab's "I consent to storage of my data" checkbox
  // would undercut the consent flow itself — so this is a local-only,
  // short-lived draft (namespaced per signed-in user, same reasoning as the
  // per-user patient DB) that just survives an accidental reload/crash/tab
  // close mid-intake. It's deleted the moment the form is submitted or
  // cancelled — it's scratch space, not a permanent record.
  const draftKey = `physio_intake_draft_v1_${currentUser?.id || "anon"}`;
  const [restoredDraft] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
      return !!(raw && typeof raw === "object" && Object.keys(raw).length > 0);
    } catch { return false; }
  });
  const [fd, setFd] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch { return {}; }
  });
  const [tab, setTab] = React.useState("essential");
  const set = (k,v) => setFd(p=>({...p,[k]:v}));

  React.useEffect(() => {
    if (Object.keys(fd).length === 0) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(fd)); } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [fd, draftKey]);

  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch {} };
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.82rem",marginBottom:0};
  const lbl = {fontSize:"0.78rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};
  const field = (label, node) => (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{label}</label>
      {node}
    </div>
  );
  const sel = (k, opts) => (
    <select style={inp} value={fd[k]||""} onChange={e=>set(k,e.target.value)}>
      <option value="">—</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  const tabs = [{id:"essential",label:"Essential"},{id:"contact",label:"Contact"},{id:"clinical",label:"Clinical"},{id:"consent",label:"Consent"}];
  const tabStyle = (id) => ({
    padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:"0.8rem", fontWeight:tab===id?700:500,
    background: tab===id ? PC.accent : PC.s2,
    color: tab===id ? "#fff" : PC.muted,
  });
  const canSubmit = fd.dem_name?.trim() && fd.consent_treat;
  return (
    <div>
      {restoredDraft && (
        <div style={{padding:"7px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,fontSize:"0.75rem",color:PC.muted,marginBottom:14}}>
          ↺ Restored what you'd already typed before this got interrupted.
        </div>
      )}
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {tabs.map(t=><button key={t.id} style={tabStyle(t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* Essential */}
      {tab==="essential" && (
        <div>
          {field("Full name *", <input style={inp} placeholder="e.g. Riya Sharma" value={fd.dem_name||""} onChange={e=>set("dem_name",e.target.value)} autoFocus/>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>{field("Date of birth", <input type="date" style={inp} value={fd.dem_dob||""} onChange={e=>set("dem_dob",e.target.value)}/>)}</div>
            <div>{field("Age", <input style={inp} type="number" placeholder="e.g. 34" value={fd.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>)}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>{field("Sex", sel("dem_sex",["Female","Male","Non-binary","Prefer not to say"]))}</div>
            <div>{field("Dominant hand", sel("dem_hand",["Right","Left","Ambidextrous"]))}</div>
          </div>
          {field("Occupation", <input style={inp} placeholder="e.g. Teacher, Desk worker" value={fd.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>)}
          {field("Chief complaint *", <input style={inp} placeholder="e.g. Lower back pain, knee injury" value={fd.cc_main||""} onChange={e=>set("cc_main",e.target.value)}/>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{field("Pain now (0–10)", <input style={inp} type="number" min="0" max="10" placeholder="0–10" value={fd.cc_vas_now||""} onChange={e=>set("cc_vas_now",e.target.value)}/>)}</div>
            <div>{field("Duration", <input style={inp} placeholder="e.g. 3 weeks, 6 months" value={fd.cc_duration||""} onChange={e=>set("cc_duration",e.target.value)}/>)}</div>
          </div>
        </div>
      )}

      {/* Contact */}
      {tab==="contact" && (
        <div>
          {field("Phone number", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>)}
          {field("Email address", <input style={inp} type="email" placeholder="patient@email.com" value={fd.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
          {field("Address", <input style={inp} placeholder="Street, City, Postcode" value={fd.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>)}
          {field("Emergency contact name", <input style={inp} placeholder="Full name" value={fd.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}
          {field("Emergency contact phone", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}
        </div>
      )}

      {/* Clinical */}
      {tab==="clinical" && (
        <div>
          {field("Referring doctor / GP", <input style={inp} placeholder="Dr. Name, Hospital" value={fd.dem_referral_dr||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
          {field("Referral source", sel("dem_referral_source",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
          {field("Insurance / Fund", <input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={fd.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
          {field("Policy / Member number", <input style={inp} placeholder="Optional" value={fd.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
          {field("Relevant medical history", <textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={fd.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
          {field("Current medications", <input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={fd.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
        </div>
      )}

      {/* Consent */}
      {tab==="consent" && (
        <div>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:14,marginBottom:14,fontSize:"0.82rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Consent to Treatment</strong><br/>
            I consent to physiotherapy assessment and treatment. I understand I may withdraw consent at any time. Treatment goals and procedures have been explained to me.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:14}}>
            <input type="checkbox" checked={!!fd.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>I consent to physiotherapy assessment and treatment <span style={{color:"#ef4444"}}>*</span></span>
          </label>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:14,marginBottom:14,fontSize:"0.82rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Data Storage Consent</strong><br/>
            Your clinical data is stored locally on this device only. It is not shared with third parties. You may request deletion at any time.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:14}}>
            <input type="checkbox" checked={!!fd.consent_data} onChange={e=>set("consent_data",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:500}}>I consent to storage of my clinical data on this device</span>
          </label>
          {!fd.consent_treat && (
            <div style={{padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,fontSize:"0.78rem",color:"#ef4444",fontWeight:600}}>
              ⚠ Treatment consent is required to create a patient record.
            </div>
          )}
          <div style={{marginTop:12,padding:"8px 12px",background:PC.s3,borderRadius:8,fontSize:"0.75rem",color:PC.muted}}>
            Consent date: {new Date().toLocaleDateString("en-GB")} · Clinician: Dr. Demo
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={()=>{clearDraft();onCancel();}} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.82rem"}}>Cancel</button>
        <button disabled={!canSubmit} onClick={()=>{clearDraft();onSubmit(fd);}} style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:canSubmit?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#ccc",color:"#fff",fontWeight:800,cursor:canSubmit?"pointer":"not-allowed",fontSize:"0.82rem"}}>
          {canSubmit ? "Start Assessment →" : "Complete Consent tab first"}
        </button>
      </div>
    </div>
  );
}

function OnboardingModal({ PC, onDismiss }) {
  const STEPS = [
    { icon:"🩺", title:"Welcome to PhysioMind Pro", desc:"A posture screening & education tool. AI-assisted posture screening, notes, outcome trackers, and general movement suggestions. For education only — not a medical device, and not medical advice.", color:"#7c3aed" },
    { icon:"👤", title:"Start with a Patient",        desc:'Tap "New Patient" on the dashboard to create a record. Fill in the name and chief complaint — everything else can be added as you go.',           color:"#0891b2" },
    { icon:"📋", title:"Assess Step by Step",          desc:"Work through the left-hand menu: Subjective → Posture → ROM → Special Tests → SOAP. Each module saves automatically as you type.",             color:"#059669" },
    { icon:"✨", title:"Generate SOAP & Send HEP",     desc:"Once assessed, use the SOAP module to generate an AI clinical note, then build a Home Exercise Programme and send it via WhatsApp or PDF.",   color:"#d97706" },
  ];
  const [step, setStep] = React.useState(0);
  const s = STEPS[step];
  return (
    <div onClick={onDismiss} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:PC.surface,borderRadius:20,padding:"28px 24px 22px",maxWidth:400,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.45)",border:`1px solid ${s.color}44`,textAlign:"center"}}>
        {/* Step dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {STEPS.map((_,i)=>(<div key={i} style={{width:i===step?20:7,height:7,borderRadius:99,background:i===step?s.color:PC.border,transition:"all 0.3s"}}/>))}
        </div>
        <div style={{fontSize:"2.8rem",marginBottom:14,lineHeight:1}}>{s.icon}</div>
        <div style={{fontWeight:900,fontSize:"1.15rem",color:PC.text,marginBottom:10,letterSpacing:"-0.3px"}}>{s.title}</div>
        <div style={{fontSize:"0.88rem",color:PC.muted,lineHeight:1.65,marginBottom:24}}>{s.desc}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center"}}>
          {step > 0 && (
            <button onClick={()=>setStep(n=>n-1)} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${PC.border}`,background:PC.s2,color:PC.muted,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>← Back</button>
          )}
          {step < STEPS.length-1 ? (
            <button onClick={()=>setStep(n=>n+1)} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Next →</button>
          ) : (
            <button onClick={onDismiss} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Let's go 🚀</button>
          )}
        </div>
        <button onClick={onDismiss} style={{marginTop:14,background:"none",border:"none",color:PC.muted,fontSize:"0.75rem",cursor:"pointer",textDecoration:"underline"}}>Skip tour</button>
      </div>
    </div>
  );
}

// ── Exports ──────────────────────────────────────────────────────────────────
export { PdfReportsModal, QuickVisitForm, IntakeForm, OnboardingModal };
