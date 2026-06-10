// LandingPage.jsx — shown before login/signup so visitors know what the app does

import React, { useState, useEffect } from "react";

const A = "#7c3aed", S2 = "#f5f0fb", TX = "#1a1025", MU = "#7e6a9a";

const FEATURES = [
  {
    icon: "🧍",
    title: "AI Posture Analysis",
    desc: "Upload a photo — AI detects 30+ postural defects, measures CVA, FHP, shoulder alignment, and generates a professional PDF report to hand to patients or referring doctors.",
    tag: "Most popular",
    tagColor: "#7c3aed",
  },
  {
    icon: "📋",
    title: "Smart SOAP Notes",
    desc: "Guided SOAP documentation with AI clinical impression. Body chart, palpation, ROM, MMT, special tests — all in one place. Each session builds the patient's history automatically.",
    tag: "Saves 15 min/patient",
    tagColor: "#059669",
  },
  {
    icon: "📊",
    title: "Outcome Measures",
    desc: "NDI, ODI, DASH, BBS, TUG, 10MWT, ASIA scale and more — guided question-by-question with Hindi support. Trend charts show patient progress automatically across sessions.",
    tag: "Therapist-guided",
    tagColor: "#0891b2",
  },
  {
    icon: "🦾",
    title: "ASIA Scale for SCI",
    desc: "Complete bilateral motor grid for spinal cord injury classification — AIS grading, NLI, UE/LE motor scores, sacral sparing. Built-in clinical guide for proper administration.",
    tag: "Neurological",
    tagColor: "#dc2626",
  },
  {
    icon: "📁",
    title: "Patient Records",
    desc: "Complete patient file — demographics, session timeline, MRI/X-ray uploads, posture photos, progress charts. One place for everything. No more scattered notes.",
    tag: "All in one",
    tagColor: "#d97706",
  },
  {
    icon: "🇮🇳",
    title: "Built for India",
    desc: "Hindi language support, Indian clinic workflows, DPDP Act 2023 compliant. Works on any tablet or phone. No expensive hardware needed.",
    tag: "Made in India",
    tagColor: "#dc2626",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    color: "#059669",
    features: [
      "Up to 15 patients",
      "Full SOAP notes",
      "NDI, ODI, VAS, PSFS",
      "Body chart & symptom map",
      "Basic posture observation",
      "Session log & history",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹599",
    period: "per month",
    color: A,
    features: [
      "Unlimited patients",
      "AI posture analysis + PDF report",
      "All outcome measures (ASIA, BBS, TUG…)",
      "PDF export of any report",
      "MRI / X-ray / document uploads",
      "Progress trend charts + MCID",
      "SOAP + AI clinical impression",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Clinic",
    price: "₹2,499",
    period: "per month",
    color: "#0891b2",
    features: [
      "Up to 5 therapists",
      "Everything in Pro",
      "Clinic branding on reports",
      "Admin dashboard",
      "Patient sharing between therapists",
      "Priority support",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Priya Sharma",
    role: "Physiotherapist, Mumbai",
    text: "The AI posture report is something my patients actually understand. I print it and explain it to them — they trust me more now.",
    avatar: "👩‍⚕️",
  },
  {
    name: "Dr. Arjun Mehta",
    role: "Sports Physio, Delhi",
    text: "SOAP notes used to take me 20 minutes. Now it's 7. The outcome measures with Hindi support is brilliant for my older patients.",
    avatar: "👨‍⚕️",
  },
  {
    name: "Dr. Sneha Rao",
    role: "Neuro Physio, Bangalore",
    text: "The ASIA scale bilateral grid is clinically correct and actually fast to fill. I've tried other apps — none of them got it right.",
    avatar: "👩‍⚕️",
  },
];

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3000);
    return () => clearInterval(timer);
  }, []);

  const btn = (label, onClick, primary = true) => (
    <button onClick={onClick} style={{
      padding: "13px 28px", borderRadius: 12, border: primary ? "none" : `2px solid ${A}`,
      background: primary ? `linear-gradient(135deg, ${A}, #9333ea)` : "transparent",
      color: primary ? "#fff" : A, fontSize: "0.9rem", fontWeight: 800,
      cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
      boxShadow: primary ? "0 4px 20px rgba(124,58,237,0.35)" : "none",
    }}>{label}</button>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: TX, background: "#fff", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${S2}` : "none",
        padding: "14px 20px", display: "flex", alignItems: "center",
        transition: "all 0.3s",
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${A}, #9333ea)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem" }}>🧠</div>
          <span style={{ fontWeight: 900, fontSize: "1.1rem", color: TX }}>PhysioMind</span>
          <span style={{ fontSize: "0.6rem", background: "#fef9c3", color: "#a16207",
            padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>BETA</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onSignIn} style={{
            padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${S2}`,
            background: "transparent", color: MU, fontSize: "0.8rem",
            fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign In</button>
          <button onClick={onGetStarted} style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: `linear-gradient(135deg, ${A}, #9333ea)`,
            color: "#fff", fontSize: "0.8rem", fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit" }}>Try Free</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "100px 20px 60px",
        background: "linear-gradient(180deg, #f5f0fb 0%, #fff 100%)",
      }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: A,
          background: "#ede9fe", padding: "6px 16px", borderRadius: 20,
          marginBottom: 20, display: "inline-block" }}>
          🇮🇳 Made for Indian Physiotherapists · Free to start
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 900,
          lineHeight: 1.15, marginBottom: 20, maxWidth: 700,
          background: `linear-gradient(135deg, ${TX}, ${A})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          The Smartest Physio Practice App in India
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", color: MU,
          maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
          AI posture analysis. Smart SOAP notes. Outcome measures with Hindi support.
          Everything a physiotherapist needs — in one app, on any device.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
          {btn("🚀 Start Free — No card needed", onGetStarted)}
          {btn("Sign In", onSignIn, false)}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { num: "30+", label: "Postural defects detected" },
            { num: "11", label: "Validated outcome scales" },
            { num: "15 min", label: "Saved per patient" },
            { num: "Free", label: "To get started" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: A }}>{s.num}</div>
              <div style={{ fontSize: "0.65rem", color: MU, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ padding: "60px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 900, marginBottom: 12 }}>
            Everything you need. Nothing you don't.
          </h2>
          <p style={{ color: MU, fontSize: "1rem", maxWidth: 500, margin: "0 auto" }}>
            Built by physiotherapists, for physiotherapists. Every feature solves a real clinical problem.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: "24px", borderRadius: 16, border: `1.5px solid ${i === activeFeature ? A : "#e5e7eb"}`,
              background: i === activeFeature ? S2 : "#fff",
              transition: "all 0.3s", cursor: "pointer",
              transform: i === activeFeature ? "translateY(-2px)" : "none",
              boxShadow: i === activeFeature ? `0 8px 30px rgba(124,58,237,0.12)` : "none",
            }} onClick={() => setActiveFeature(i)}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>{f.icon}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{f.title}</div>
                <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px",
                  borderRadius: 20, background: f.tagColor + "20", color: f.tagColor }}>{f.tag}</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: MU, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <div style={{ padding: "60px 20px", background: S2 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 900, marginBottom: 12 }}>
              Simple, honest pricing
            </h2>
            <p style={{ color: MU, fontSize: "1rem" }}>
              Start free. Upgrade when you're ready. No hidden fees.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {PLANS.map((plan, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: 16, padding: "28px 24px",
                border: `2px solid ${plan.highlight ? A : "#e5e7eb"}`,
                position: "relative",
                boxShadow: plan.highlight ? `0 8px 40px rgba(124,58,237,0.2)` : "none",
                transform: plan.highlight ? "translateY(-4px)" : "none",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: `linear-gradient(135deg, ${A}, #9333ea)`, color: "#fff",
                    fontSize: "0.65rem", fontWeight: 800, padding: "4px 16px", borderRadius: 20 }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontWeight: 900, fontSize: "1.1rem", marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, color: plan.color }}>{plan.price}</span>
                  <span style={{ fontSize: "0.7rem", color: MU }}>{plan.period}</span>
                </div>
                <div style={{ height: 1, background: "#e5e7eb", margin: "16px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.78rem" }}>
                      <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span style={{ color: TX }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onGetStarted} style={{
                  width: "100%", padding: "11px", borderRadius: 10, border: "none",
                  background: plan.highlight ? `linear-gradient(135deg, ${A}, #9333ea)` : S2,
                  color: plan.highlight ? "#fff" : TX,
                  fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.72rem", color: MU }}>
            All plans include a 14-day free trial of Pro features. No credit card required to start.
          </p>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div style={{ padding: "60px 20px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
          fontWeight: 900, marginBottom: 40 }}>Physiotherapists love it</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ padding: "24px", borderRadius: 16,
              border: "1.5px solid #e5e7eb", background: "#fff" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>{t.avatar}</div>
              <p style={{ fontSize: "0.82rem", color: TX, lineHeight: 1.7,
                marginBottom: 16, fontStyle: "italic" }}>"{t.text}"</p>
              <div style={{ fontWeight: 700, fontSize: "0.78rem" }}>{t.name}</div>
              <div style={{ fontSize: "0.65rem", color: MU }}>{t.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{
        padding: "80px 20px", textAlign: "center",
        background: `linear-gradient(135deg, ${TX} 0%, #1e1040 100%)`,
      }}>
        <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 900,
          color: "#fff", marginBottom: 16, maxWidth: 600, margin: "0 auto 16px" }}>
          Ready to transform your practice?
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "1rem", marginBottom: 32 }}>
          Free to start. No credit card. No commitment.
        </p>
        <button onClick={onGetStarted} style={{
          padding: "16px 40px", borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${A}, #9333ea)`,
          color: "#fff", fontSize: "1rem", fontWeight: 900,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 30px rgba(124,58,237,0.5)" }}>
          🚀 Start Free Today
        </button>
        <div style={{ marginTop: 20, fontSize: "0.68rem", color: "#6b7280" }}>
          Trusted by physiotherapists across India · DPDP Act 2023 compliant · Data never shared
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ padding: "24px 20px", background: TX, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6,
            background: `linear-gradient(135deg, ${A}, #9333ea)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem" }}>🧠</div>
          <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.9rem" }}>PhysioMind</span>
        </div>
        <p style={{ fontSize: "0.65rem", color: "#6b7280", margin: 0 }}>
          © 2025 PhysioMind · Built in India 🇮🇳 · Privacy Policy · Terms of Service
        </p>
      </div>

    </div>
  );
}
