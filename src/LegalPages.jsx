// LegalPages.jsx — Privacy Policy + Terms of Service
// Modal-based — opens from auth screen and app footer

import React from "react";

const A="#7c3aed",TX="#1a1025",MU="#7e6a9a",BD="#d8cce8",S2="#f5f0fb";

const prose={fontSize:"0.84rem",color:TX,lineHeight:1.8};
const h2={fontSize:"1rem",fontWeight:700,color:TX,margin:"22px 0 8px",letterSpacing:"-0.2px"};
const h3={fontSize:"0.85rem",fontWeight:700,color:A,margin:"16px 0 6px"};
const li={marginBottom:4,paddingLeft:4};

function Modal({title,children,onClose}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,8,30,0.75)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,
        width:"100%",maxWidth:680,maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 24px 64px rgba(124,58,237,0.18)"}}>
        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${BD}`,display:"flex",
          justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:"1.05rem",color:TX}}>{title}</div>
            <div style={{fontSize:"0.68rem",color:MU,marginTop:2}}>PhysioMind — Last updated June 2026</div>
          </div>
          <button onClick={onClose} style={{background:S2,border:`1px solid ${BD}`,borderRadius:8,
            width:32,height:32,cursor:"pointer",fontSize:"1rem",color:MU,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",...prose}}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── PRIVACY POLICY ───────────────────────────────────────────────────────────
export function PrivacyPolicy({onClose}){
  return(
    <Modal title="Privacy Policy" onClose={onClose}>
      <p>PhysioMind ("we", "our", "us") is committed to protecting the privacy and security of personal and clinical data. This policy explains what data we collect, how we use it, and your rights.</p>

      <h2 style={h2}>1. Who we are</h2>
      <p>PhysioMind is a clinical assessment platform for physiotherapists and rehabilitation professionals. We are operated by <strong>PhysioMind Technologies</strong> (India). For questions, contact: <a href="mailto:privacy@physiomind.in" style={{color:A}}>privacy@physiomind.in</a></p>

      <h2 style={h2}>2. Data we collect</h2>
      <h3 style={h3}>2a. Clinician account data</h3>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>Name, email address, clinic name</li>
        <li style={li}>Encrypted password (stored by Supabase — we never see it)</li>
        <li style={li}>Usage logs (login time, features used) for service improvement</li>
      </ul>
      <h3 style={h3}>2b. Patient clinical data</h3>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>Patient demographics: name, age, gender, occupation</li>
        <li style={li}>Clinical assessment data: ROM measurements, special test results, SOAP notes, diagnosis</li>
        <li style={li}>Posture analysis images and AI-generated measurements (stored locally on device, not uploaded to our servers)</li>
        <li style={li}>Body chart pain mapping data</li>
        <li style={li}>Exercise prescription records</li>
      </ul>
      <h3 style={h3}>2c. Data we do NOT collect</h3>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>Posture photos are processed entirely on your device using AI (MediaPipe/ViTPose) — they are never sent to our servers</li>
        <li style={li}>We do not sell data to third parties</li>
        <li style={li}>We do not use patient data for advertising</li>
      </ul>

      <h2 style={h2}>3. How we use your data</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}><strong>Providing the service:</strong> storing and syncing patient records across your devices</li>
        <li style={li}><strong>Authentication:</strong> verifying your identity when you log in</li>
        <li style={li}><strong>Service improvement:</strong> understanding which features are used most (anonymised)</li>
        <li style={li}><strong>Support:</strong> responding to your help requests</li>
      </ul>

      <h2 style={h2}>4. Data storage and security</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>All data is stored on <strong>Supabase</strong> (PostgreSQL), hosted on AWS infrastructure</li>
        <li style={li}>Row Level Security ensures each clinician can only access their own patients</li>
        <li style={li}>All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
        <li style={li}>Clinical images for the Cloudinary image library are uploaded by you and stored under your Cloudinary account</li>
        <li style={li}>We maintain regular automated backups</li>
      </ul>

      <h2 style={h2}>5. Data sharing</h2>
      <p>We share data only with:</p>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}><strong>Supabase</strong> — database and authentication provider</li>
        <li style={li}><strong>Cloudinary</strong> — clinical image hosting (images you explicitly upload)</li>
        <li style={li}><strong>Vercel</strong> — app hosting (no patient data stored here)</li>
        <li style={li}><strong>Law enforcement</strong> — only if required by Indian law or court order</li>
      </ul>
      <p>We do <strong>not</strong> share data with insurers, pharmaceutical companies, advertisers, or data brokers.</p>

      <h2 style={h2}>6. Your rights (India DPDP Act 2023 + GDPR)</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}><strong>Access:</strong> request a copy of all data we hold about you</li>
        <li style={li}><strong>Correction:</strong> update inaccurate data at any time within the app</li>
        <li style={li}><strong>Deletion:</strong> request deletion of your account and all associated patient data</li>
        <li style={li}><strong>Portability:</strong> export your full patient database as CSV/PDF</li>
        <li style={li}><strong>Objection:</strong> opt out of non-essential data processing</li>
      </ul>
      <p>To exercise these rights, email <a href="mailto:privacy@physiomind.in" style={{color:A}}>privacy@physiomind.in</a></p>

      <h2 style={h2}>7. Patient data — your responsibility</h2>
      <p>As a clinician, you are the <strong>data controller</strong> for your patients' information. You are responsible for:</p>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>Obtaining appropriate consent from patients before entering their data</li>
        <li style={li}>Complying with applicable healthcare data regulations in your jurisdiction</li>
        <li style={li}>Not entering data for patients who have not consented</li>
      </ul>

      <h2 style={h2}>8. AI features disclaimer</h2>
      <p>PhysioMind's AI posture analysis features (using MediaPipe and ViTPose) are provided <strong>for clinical screening and educational purposes only</strong>. They are not a substitute for hands-on clinical assessment by a qualified physiotherapist. Do not use AI analysis results as the sole basis for diagnosis or treatment.</p>

      <h2 style={h2}>9. Data retention</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>Active account data: retained while your account is active</li>
        <li style={li}>After account deletion: all data deleted within 30 days</li>
        <li style={li}>Backup copies: purged within 90 days of deletion request</li>
      </ul>

      <h2 style={h2}>10. Changes to this policy</h2>
      <p>We will notify you by email at least 14 days before any material change to this privacy policy. Continued use of the service after notification constitutes acceptance.</p>

      <h2 style={h2}>11. Contact</h2>
      <p>Privacy queries: <a href="mailto:privacy@physiomind.in" style={{color:A}}>privacy@physiomind.in</a><br/>
      Grievance Officer (India): <a href="mailto:grievance@physiomind.in" style={{color:A}}>grievance@physiomind.in</a> (as required under IT Act 2000)</p>
    </Modal>
  );
}

// ─── TERMS OF SERVICE ─────────────────────────────────────────────────────────
export function TermsOfService({onClose}){
  return(
    <Modal title="Terms of Service" onClose={onClose}>
      <p>By creating an account or using PhysioMind, you agree to these terms. Please read them carefully.</p>

      <h2 style={h2}>1. Service description</h2>
      <p>PhysioMind is a clinical assessment and practice management platform for physiotherapists. It provides tools for patient assessment, SOAP documentation, exercise prescription, and posture analysis.</p>

      <h2 style={h2}>2. Eligibility</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>You must be a qualified or student physiotherapist, or other licensed healthcare professional</li>
        <li style={li}>You must be 18 years or older</li>
        <li style={li}>By registering, you confirm you have the authority to enter patient data and appropriate patient consent</li>
      </ul>

      <h2 style={h2}>3. Free trial and subscription</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>New accounts receive a 14-day free trial with full access</li>
        <li style={li}>After the trial, a subscription is required to continue accessing your data</li>
        <li style={li}>Subscriptions are billed monthly. Cancel anytime — no lock-in.</li>
        <li style={li}>No refunds for partial months, except where required by law</li>
      </ul>

      <h2 style={h2}>4. Acceptable use</h2>
      <p>You agree NOT to:</p>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>Enter patient data without appropriate patient consent</li>
        <li style={li}>Share your login credentials with others</li>
        <li style={li}>Attempt to access other clinicians' patient data</li>
        <li style={li}>Use the platform for any unlawful purpose</li>
        <li style={li}>Reverse-engineer, copy, or redistribute the software</li>
      </ul>

      <h2 style={h2}>5. Clinical responsibility</h2>
      <p><strong>PhysioMind is a clinical tool, not a medical device.</strong> All clinical decisions remain the sole responsibility of the treating clinician. AI-powered features (posture analysis, auto-generated SOAP text, diagnosis suggestions) are assistive tools only and must be reviewed and confirmed by a qualified professional before clinical use.</p>

      <h2 style={h2}>6. Data ownership</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>You own all patient data you enter into the platform</li>
        <li style={li}>You can export or delete your data at any time</li>
        <li style={li}>We do not claim ownership of your clinical records</li>
      </ul>

      <h2 style={h2}>7. Limitation of liability</h2>
      <p>PhysioMind is provided "as is". To the maximum extent permitted by law, we are not liable for any clinical outcomes, patient harm, data loss, or business losses arising from use of the platform. Our total liability to you shall not exceed the amount you paid in the 3 months preceding any claim.</p>

      <h2 style={h2}>8. Termination</h2>
      <ul style={{paddingLeft:18,margin:"6px 0"}}>
        <li style={li}>You may cancel your account at any time from the settings page</li>
        <li style={li}>We may suspend accounts that violate these terms</li>
        <li style={li}>Upon termination, export your data within 30 days before it is deleted</li>
      </ul>

      <h2 style={h2}>9. Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>

      <h2 style={h2}>10. Contact</h2>
      <p>For terms-related queries: <a href="mailto:legal@physiomind.in" style={{color:A}}>legal@physiomind.in</a></p>
    </Modal>
  );
}
