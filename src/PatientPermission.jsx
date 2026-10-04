// Patient permission tick. Students will record real patients, so before a signed-in
// person starts a new patient record they confirm the patient has agreed to it
// (first-time walkthrough follow-up, 2026-10-03). The time of the tick is kept on the
// record as data.consent_confirmed_at. Guests are not asked: nothing they enter is saved.
import React from "react";
import { PC } from "./postureColors.js";

export const PERMISSION_LABEL = "I have this patient's permission to record their details here.";
export const PERMISSION_HINT = "Details are saved to your account. Initials are fine for practice cases.";

export function PatientPermissionCheck({ checked, onChange }) {
  return (
    <label data-testid="patient-permission" style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",marginBottom:14,
      background:PC.s2||"#F8F7FC",border:`1px solid ${PC.border}`,borderRadius:12,cursor:"pointer"}}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)}
        style={{marginTop:3,width:17,height:17,flexShrink:0,accentColor:PC.accent,cursor:"pointer"}} />
      <span style={{fontSize:"0.82rem",lineHeight:1.45,color:PC.text}}>
        <b>{PERMISSION_LABEL}</b>
        <span style={{display:"block",fontSize:"0.76rem",color:PC.muted,marginTop:2}}>{PERMISSION_HINT}</span>
      </span>
    </label>
  );
}

// Used where there is no form to hold the tick (the AI Assessment start).
export function PatientPermissionModal({ onConfirm, onCancel }) {
  const [ok, setOk] = React.useState(false);
  return (
    <div data-testid="patient-permission-modal" role="dialog" aria-modal="true" aria-label="Before you start"
      style={{position:"fixed",inset:0,zIndex:620,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420,background:PC.surface||"#fff",borderRadius:16,padding:"22px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:6}}>Before you start</div>
        <div style={{fontSize:"0.84rem",color:PC.muted,marginBottom:14,lineHeight:1.45}}>
          Anything you record is saved to your account, so please check with the patient first.
        </div>
        <PatientPermissionCheck checked={ok} onChange={setOk} />
        <button type="button" disabled={!ok} onClick={onConfirm}
          style={{width:"100%",padding:"13px",border:"none",borderRadius:14,color:"#fff",fontWeight:800,fontSize:"0.9rem",marginBottom:10,
            background:ok?"linear-gradient(135deg,#7c3aed,#9333ea)":PC.border,cursor:ok?"pointer":"not-allowed"}}>
          Continue
        </button>
        {!ok && <div style={{textAlign:"center",fontSize:"0.76rem",color:PC.muted,margin:"-2px 0 10px"}}>Tick the box above to continue.</div>}
        <button type="button" onClick={onCancel}
          style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${PC.border}`,borderRadius:10,color:PC.muted,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Cancel
        </button>
      </div>
    </div>
  );
}
