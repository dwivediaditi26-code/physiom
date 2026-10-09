// LegalPages.jsx — Privacy Policy + Terms of Service
// Modal-based — opens from auth screen and app footer

import React from "react";

// Bump when the Terms or Privacy Policy text changes in a way users must accept
// again. Saved on the account at signup (AuthScreen.jsx) next to the date.
export const LEGAL_VERSION="2026-10";

const A="#7c3aed",TX="#1a1025",MU="#7e6a9a",BD="#d8cce8",S2="#f5f0fb";

const prose={fontSize:"0.84rem",color:TX,lineHeight:1.8};
const h2={fontSize:"1rem",fontWeight:700,color:TX,margin:"22px 0 8px",letterSpacing:"-0.2px"};
const h3={fontSize:"0.85rem",fontWeight:700,color:A,margin:"16px 0 6px"};
const li={marginBottom:4,paddingLeft:4};
const ul={paddingLeft:18,margin:"6px 0"};

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
            <div style={{fontSize:"0.68rem",color:MU,marginTop:2}}>PhysioMind — Last updated October 2026</div>
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
      <p>PhysioMind ("we", "our", "us") is committed to protecting the privacy and security of personal and clinical data. This policy explains what data we collect, how we use it, who sees it, and your rights.</p>

      <h2 style={h2}>1. Who we are</h2>
      <p>PhysioMind is an educational and practice-support platform for physiotherapy students, physiotherapists and rehabilitation professionals, operated by <strong>Aditi Dwivedi</strong> (India). PhysioMind is not yet a registered company — this policy will be updated with formal entity details if/when incorporation happens. For questions, contact: <a href="mailto:physiomind3@gmail.com" style={{color:A}}>physiomind3@gmail.com</a></p>

      <h2 style={h2}>2. Data we collect</h2>
      <h3 style={h3}>2a. Clinician account data</h3>
      <ul style={ul}>
        <li style={li}>Name, email address, clinic name</li>
        <li style={li}>Encrypted password (stored by Supabase — we never see it)</li>
      </ul>
      <h3 style={h3}>2b. Patient clinical data</h3>
      <ul style={ul}>
        <li style={li}>Patient demographics: name, age, gender, occupation</li>
        <li style={li}>Clinical assessment data: ROM measurements, special test results, SOAP notes, diagnosis</li>
        <li style={li}>Posture and movement-screening photos: captured via your device camera, analysed on-device using AI (MediaPipe/ViTPose) to compute angle measurements, and then synced to our database as part of the patient's record so you can access it across your devices. The face is automatically obscured above the nose bridge before the photo is saved. You must obtain the patient's informed consent before any capture — the app requires this via an on-screen consent step before the camera opens.</li>
        <li style={li}>Body chart pain mapping data</li>
        <li style={li}>Exercise prescription records</li>
      </ul>
      <h3 style={h3}>2c. PhysioFeed (community) data</h3>
      <ul style={ul}>
        <li style={li}><strong>Your profile:</strong> name, photo, role, location, workplace, about text, education, achievements, publications and clinical CV details you choose to add. <strong>Your profile is visible to other PhysioMind users — treat anything you put on it as public.</strong></li>
        <li style={li}>Posts, comments, stories, poll votes, follows, saved items, and any photos or videos you upload</li>
        <li style={li}>Direct messages and message requests, and the blocks and reports you make</li>
        <li style={li}>Job and opportunity posts you create, and applications you send (your profile and the message you write)</li>
        <li style={li}>Notifications sent to you and, if you turn on reminders, a push registration for your device (a token issued by your browser's or phone's notification service)</li>
      </ul>
      <h3 style={h3}>2d. Usage and device data</h3>
      <ul style={ul}>
        <li style={li}>While you are signed in, the app records which screens and features you use and when. If the app crashes, it also records technical details: the error message, the page you were on, and your device and browser type.</li>
        <li style={li}>These records are linked to your account so we can find and fix problems. They do not contain the contents of your patient records.</li>
        <li style={li}>We also use Vercel Analytics, which counts page visits and visitors.</li>
      </ul>
      <h3 style={h3}>2e. What we do not do with this data</h3>
      <ul style={ul}>
        <li style={li}>The AI pose analysis itself (landmark detection, angle calculation) runs entirely on your device — the pose-estimation model never sends the raw photo to our servers merely to compute the measurement, only the resulting image and measurements are synced for your own record-keeping</li>
        <li style={li}>We do not sell data to third parties</li>
        <li style={li}>We do not use patient data for advertising</li>
      </ul>

      <h2 style={h2}>3. How we use your data</h2>
      <ul style={ul}>
        <li style={li}><strong>Providing the service:</strong> storing and syncing patient records across your devices</li>
        <li style={li}><strong>Authentication:</strong> verifying your identity when you log in</li>
        <li style={li}><strong>Community features:</strong> showing your profile and posts to other users, delivering messages, applications and notifications</li>
        <li style={li}><strong>Safety and moderation:</strong> reviewing reports and removing content or accounts that break our Terms</li>
        <li style={li}><strong>Service improvement:</strong> understanding which features are used and finding and fixing errors. We use these records only to run and improve PhysioMind, never for advertising.</li>
        <li style={li}><strong>Support:</strong> responding to your help requests</li>
      </ul>

      <h2 style={h2}>4. Data storage and security</h2>
      <ul style={ul}>
        <li style={li}>All data is stored on <strong>Supabase</strong> (PostgreSQL), hosted on AWS infrastructure</li>
        <li style={li}>Row Level Security ensures each clinician can only access their own patients</li>
        <li style={li}>Data held on our servers is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
        <li style={li}>Your browser also keeps a local cache of your patient list for speed and offline access. For signed-in accounts, this local cache is separately encrypted (AES-256-GCM) with a key held only in your device's memory for the session — a lost or stolen device without an active login cannot have this cache read off its disk. This does not protect data while you are actively signed in and using the app, since it must be readable to you at that point; no purely client-side scheme can prevent that.</li>
        <li style={li}>In Guest Mode (no account), nothing is sent to our servers at all — your data stays in your browser's local storage only, unencrypted, and is never synced or backed up. It is lost if you clear your browser data.</li>
        <li style={li}>Clinical images for the Cloudinary image library are uploaded by you and stored under your Cloudinary account</li>
        <li style={li}>Posture and movement-screening photos of patients are stored in your Supabase database, scoped to your account by Row Level Security, with the patient's face automatically obscured before storage</li>
        <li style={li}>Photos and videos you upload to PhysioFeed are kept in Supabase file storage and can be opened by anyone who has the file's link. Do not upload anything you would not want others to see.</li>
        <li style={li}>Direct messages are visible only to the people in the conversation. We do not read them as a matter of routine; we may open them only to look into a report, to follow the law, or to fix a technical fault.</li>
        <li style={li}>We maintain regular automated backups</li>
      </ul>

      <h2 style={h2}>5. Data sharing</h2>
      <p>We share data only with:</p>
      <ul style={ul}>
        <li style={li}><strong>Other PhysioMind users</strong> — what you put on your PhysioFeed profile, posts, comments and stories, and the messages and applications you send to specific people</li>
        <li style={li}><strong>Supabase</strong> — database, file storage and authentication provider</li>
        <li style={li}><strong>Cloudinary</strong> — clinical image hosting (images you explicitly upload)</li>
        <li style={li}><strong>Vercel</strong> — app hosting and Vercel Analytics (page visits and visitor counts; no patient records are stored here)</li>
        <li style={li}><strong>Sentry</strong> — crash reporting, where switched on. It receives technical error details (the error message, the page and your device and browser type), not patient records.</li>
        <li style={li}><strong>Groq</strong> — AI inference provider. When you use the AI intake in an assessment (describing the patient's history in your own words), that text is sent to Groq to sort it into structured fields, which you review and edit before anything is saved. Groq is also used to draft summaries of published research articles for the Evidence library; no patient data is sent for that. Per Groq's published policy, inputs and outputs are not used to train models, and are not retained beyond transient troubleshooting logs (kept a maximum of 30 days) unless we enable longer retention, which we do not.</li>
        <li style={li}><strong>Your browser's or device's speech service</strong> — only if you use a microphone (voice typing) button. Voice typing uses the speech-to-text built into your browser or device, not a PhysioMind service. Depending on which one you use, your voice may be sent to its maker to be turned into text (for example Google for Chrome and most Android devices, or Apple for Safari and iPhone), under that company's own privacy policy. PhysioMind never receives or stores the audio, only the resulting text, which you can edit before saving. If you prefer, type instead of dictating.</li>
        <li style={li}><strong>Your browser's or phone's notification service</strong> (for example Google, Apple or Mozilla) — only if you turn on reminders, to deliver them to your device</li>
        <li style={li}><strong>Font and file delivery services</strong> (Google Fonts, jsDelivr, Hugging Face) — the app downloads fonts and the files for on-device posture analysis from them. Like any website, they can see your IP address; they never receive your photos or patient data.</li>
        <li style={li}><strong>Law enforcement</strong> — only if required by Indian law or court order</li>
      </ul>
      <p>We do <strong>not</strong> share data with insurers, pharmaceutical companies, advertisers, or data brokers.</p>

      <h2 style={h2}>6. Your rights (India DPDP Act 2023 + GDPR)</h2>
      <ul style={ul}>
        <li style={li}><strong>Access:</strong> request a copy of all data we hold about you</li>
        <li style={li}><strong>Correction:</strong> update inaccurate data at any time within the app</li>
        <li style={li}><strong>Deletion:</strong> delete your account yourself, instantly, from the "Delete account" button in the app. This removes your account, profile, patient records, posts, comments, stories, applications, notifications and messages from our live database straight away. Messages you sent also disappear from the other person's inbox. Photos, videos, documents and CVs you uploaded to PhysioFeed file storage are erased at the same time.</li>
        <li style={li}><strong>Portability:</strong> download your full patient database as a JSON file at any time, including as an offered step before deleting your account</li>
        <li style={li}><strong>Withdraw consent / object:</strong> stop using any optional feature at any time (for example, turn off reminders), or opt out of non-essential data processing by emailing us</li>
      </ul>
      <p>To exercise these rights, email <a href="mailto:physiomind3@gmail.com" style={{color:A}}>physiomind3@gmail.com</a></p>

      <h2 style={h2}>7. Patient data — your responsibility</h2>
      <p>As a clinician, you are the <strong>data controller</strong> for your patients' information. You are responsible for:</p>
      <ul style={ul}>
        <li style={li}>Obtaining appropriate consent from patients before entering their data. If a patient is under 18, you need the consent of a parent or guardian.</li>
        <li style={li}>Complying with applicable healthcare data regulations in your jurisdiction</li>
        <li style={li}>Not entering data for patients who have not consented</li>
        <li style={li}>Never putting anything that identifies a patient (name, phone number, hospital number, face) into a PhysioFeed post, comment or case discussion</li>
      </ul>

      <h2 style={h2}>8. AI features disclaimer</h2>
      <p>PhysioMind's AI features (posture analysis using MediaPipe and ViTPose, AI intake, and any AI-drafted text) are provided <strong>for screening, documentation support and educational purposes only</strong>. AI output can be wrong. It is not a substitute for hands-on clinical assessment by a qualified physiotherapist. Do not use AI results as the sole basis for diagnosis or treatment.</p>

      <h2 style={h2}>9. Data retention</h2>
      <ul style={ul}>
        <li style={li}>Active account data: retained while your account is active</li>
        <li style={li}>After account deletion: your account and its records (see section 6) are deleted from our live database immediately — deletion is real-time and self-service, triggered by you from within the app</li>
        <li style={li}>Backup copies: purged within 90 days of deletion request</li>
        <li style={li}>Deleting a single patient: the record disappears from the app at once, but a safety copy is kept for 30 days so that a mistaken delete can be undone. After 30 days it is erased permanently and automatically. To erase it sooner, email us.</li>
        <li style={li}>Usage and error records (section 2d): kept for as long as needed to run and improve the service</li>
      </ul>

      <h2 style={h2}>10. If something goes wrong</h2>
      <p>If a security incident affects your personal data, we will tell you without undue delay, and we will inform the Data Protection Board of India where the law requires it.</p>

      <h2 style={h2}>11. Where your data is processed</h2>
      <p>Your data is processed on servers run by our providers (Supabase on AWS, Vercel, Groq and Cloudinary), which may be outside India. By using PhysioMind you understand that your data may be transferred outside India.</p>

      <h2 style={h2}>12. Changes to this policy</h2>
      <p>We will notify you by email at least 14 days before any material change to this privacy policy. Continued use of the service after notification constitutes acceptance.</p>

      <h2 style={h2}>13. Contact</h2>
      <p>Privacy queries: <a href="mailto:physiomind3@gmail.com" style={{color:A}}>physiomind3@gmail.com</a><br/>
      Grievance Officer (India): Aditi Dwivedi — <a href="mailto:physiomind3@gmail.com" style={{color:A}}>physiomind3@gmail.com</a> (as required under the IT Act 2000 and Digital Personal Data Protection Act 2023). We aim to acknowledge grievances within 7 days and resolve them within 30 days.</p>
    </Modal>
  );
}

// ─── TERMS OF SERVICE ─────────────────────────────────────────────────────────
export function TermsOfService({onClose}){
  return(
    <Modal title="Terms of Service" onClose={onClose}>
      <p>By creating an account or using PhysioMind, you agree to these terms. Please read them carefully.</p>

      <h2 style={h2}>1. Service description</h2>
      <p>PhysioMind is an educational and practice-support platform for physiotherapy students and physiotherapists. It provides learning material, tools for patient assessment and SOAP documentation, exercise prescription and posture analysis, and PhysioFeed, a professional community with profiles, posts, case discussions, messaging, news, evidence summaries and job and opportunity listings.</p>

      <h2 style={h2}>2. Eligibility</h2>
      <ul style={ul}>
        <li style={li}>You must be a qualified or student physiotherapist, or other licensed healthcare professional</li>
        <li style={li}>You must be 18 years or older</li>
        <li style={li}>By registering, you confirm you have the authority to enter patient data and appropriate patient consent</li>
      </ul>

      <h2 style={h2}>3. Pricing</h2>
      <p>PhysioMind is currently free to use. If we introduce paid plans, we will tell you at least 30 days before anything you use today becomes paid, and your data will stay available for export for at least 30 days. The price, billing and refund terms of any paid plan will be shown to you before you are asked to pay.</p>

      <h2 style={h2}>4. Acceptable use</h2>
      <p>You agree NOT to:</p>
      <ul style={ul}>
        <li style={li}>Enter patient data without appropriate patient consent</li>
        <li style={li}>Put anything that identifies a patient into a PhysioFeed post, comment or case discussion</li>
        <li style={li}>Share your login credentials with others</li>
        <li style={li}>Attempt to access other clinicians' patient data</li>
        <li style={li}>Use the platform for any unlawful purpose</li>
        <li style={li}>Reverse-engineer, copy, or redistribute the software</li>
      </ul>

      <h2 style={h2}>5. Community and your content</h2>
      <p>PhysioFeed is a professional community. You are responsible for everything you post, upload, send or apply with. There is no tolerance for content or behaviour that is:</p>
      <ul style={ul}>
        <li style={li}>abusive, harassing, threatening, hateful or discriminatory</li>
        <li style={li}>sexually explicit, violent or otherwise objectionable</li>
        <li style={li}>false or misleading, including false health claims, fake credentials or fake job listings</li>
        <li style={li}>spam or advertising we have not agreed to</li>
        <li style={li}>sharing someone else's private information, or infringing someone else's copyright</li>
      </ul>
      <p>You keep ownership of what you post. You give PhysioMind a non-exclusive, worldwide, royalty-free licence to store, display and deliver your content inside PhysioMind so that the service can work, for as long as the content remains on the service.</p>
      <p>You can report a post and block a user from inside the app. We review reports as soon as we can, and we may remove content, and suspend or close accounts, that break these terms. To reach us about content, email <a href="mailto:physiomind3@gmail.com" style={{color:A}}>physiomind3@gmail.com</a>.</p>

      <h2 style={h2}>6. Jobs, opportunities and other users</h2>
      <p>PhysioMind is a platform where users find and contact each other. We do not check employers, listings, workshops, courses or applicants, and we are not a party to any arrangement between users. Check any opportunity yourself before you share documents, pay money or accept a position.</p>

      <h2 style={h2}>7. Educational content and clinical responsibility</h2>
      <p><strong>PhysioMind is an educational and practice-support tool, not a medical device.</strong> Learning material, information cards, quizzes and reference content are based on published sources and are for education only. They can contain mistakes and become out of date, so check them against current guidelines and your own training.</p>
      <p>All clinical decisions remain the sole responsibility of the treating clinician. AI-powered features (posture analysis, AI intake, auto-generated text, diagnosis suggestions) are assistive only and must be reviewed and confirmed by a qualified professional before clinical use.</p>

      <h2 style={h2}>8. Data ownership</h2>
      <ul style={ul}>
        <li style={li}>You own all patient data you enter into the platform</li>
        <li style={li}>You can export or delete your data at any time</li>
        <li style={li}>We do not claim ownership of your clinical records</li>
      </ul>

      <h2 style={h2}>9. Our content and software</h2>
      <p>The PhysioMind software, name, logo, learning material, clinical reference content and images are owned by PhysioMind or its licensors. You may use them inside the app for your own learning and practice, but you may not copy, sell or redistribute them.</p>

      <h2 style={h2}>10. Limitation of liability</h2>
      <p>PhysioMind is provided "as is". To the maximum extent permitted by law, we are not liable for any clinical outcomes, patient harm, data loss, or business losses arising from use of the platform. Our total liability to you shall not exceed the amount you paid in the 3 months preceding any claim (which is nil while PhysioMind is free).</p>

      <h2 style={h2}>11. Termination</h2>
      <ul style={ul}>
        <li style={li}>You may delete your account at any time from the app</li>
        <li style={li}>We may suspend or close accounts that violate these terms</li>
        <li style={li}>Where we close an account for a reason other than a serious violation, we will give you the chance to export your data first</li>
      </ul>

      <h2 style={h2}>12. Changes to these terms</h2>
      <p>We will tell you by email at least 14 days before any material change to these terms. Continued use of the service after that notice means you accept the change.</p>

      <h2 style={h2}>13. Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>

      <h2 style={h2}>14. Contact</h2>
      <p>For terms-related queries: <a href="mailto:physiomind3@gmail.com" style={{color:A}}>physiomind3@gmail.com</a></p>
    </Modal>
  );
}
