import React, { useState } from "react";

// Mandatory two-tier consent gate shown before any patient-facing camera
// capture opens (posture assessment, functional movement screening).
// Required under DPDP Act 2023 Sec 6 (informed consent before collecting
// biometric/photographic data) and Apple Guideline 5.1.1 / 1.4.1.
export default function PatientCameraConsent({ onConfirm, onCancel }) {
  const [consentObtained, setConsentObtained] = useState(false);
  const [noPiiUnderstood, setNoPiiUnderstood] = useState(false);
  const canProceed = consentObtained && noPiiUnderstood;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 18,
    }}>
      <div style={{
        background: "var(--pm-card-bg, #fff)", borderRadius: 16,
        maxWidth: 420, width: "100%", padding: "24px 22px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700 }}>
          Patient Privacy &amp; Consent Verification
        </h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#475569", margin: "0 0 14px" }}>
          This is an observational alignment tool for educational documentation only.
          Please confirm before opening the camera:
        </p>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, fontSize: 13.5, lineHeight: 1.45, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consentObtained}
            onChange={(e) => setConsentObtained(e.target.checked)}
            style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0 }}
          />
          <span>
            I certify that informed verbal or written consent has been obtained
            from the patient (or legal guardian) for photographic posture
            documentation strictly for clinical education and case documentation.
          </span>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18, fontSize: 13.5, lineHeight: 1.45, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={noPiiUnderstood}
            onChange={(e) => setNoPiiUnderstood(e.target.checked)}
            style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0 }}
          />
          <span>
            I confirm that no government identification numbers, full names, or
            unmasked patient facial images will be stored in this assessment.
          </span>
        </label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
          >
            Cancel Assessment
          </button>
          <button
            onClick={onConfirm}
            disabled={!canProceed}
            style={{
              padding: "9px 16px", borderRadius: 10, border: "none",
              background: canProceed ? "var(--pm-primary, #7c3aed)" : "#c4b5fd",
              color: "#fff", fontWeight: 600, fontSize: 13.5,
              cursor: canProceed ? "pointer" : "not-allowed",
            }}
          >
            Confirm &amp; Proceed to Camera
          </button>
        </div>
      </div>
    </div>
  );
}
