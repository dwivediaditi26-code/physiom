import { useState } from "react";
import { Bone, Clock, Layers } from "lucide-react";
import { PageHeader, Card, ProgressBar, ComingSoonPill, XRAY } from "./xrayTheme.jsx";
import { XRAY_REGIONS, KNEE_CHAPTERS } from "./xrayContent.js";
import { readCompleted } from "./xrayProgress.js";
import KneeXrayCourse from "./KneeXrayCourse.jsx";

export default function XrayHome({ onBack }) {
  const [view, setView] = useState("home");

  if (view === "knee") {
    return <KneeXrayCourse onBack={() => setView("home")} />;
  }

  const availableChapters = KNEE_CHAPTERS.filter((c) => c.available);
  const completed = readCompleted("knee");
  const doneCount = availableChapters.filter((c) => completed.has(c.id)).length;
  const pct = availableChapters.length ? (doneCount / availableChapters.length) * 100 : 0;
  const started = doneCount > 0;
  const otherRegions = XRAY_REGIONS.filter((r) => r.id !== "knee");

  return (
    <div>
      <PageHeader title="X-ray Educational Material" subtitle="Learn to recognize normal anatomy and understand common radiographic findings." onBack={onBack} />

      {started && (
        <Card onClick={() => setView("knee")} style={{ marginBottom: 16, background: XRAY.greenSoft, border: `1px solid ${XRAY.greenBorder}` }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: XRAY.green, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Continue learning</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: XRAY.greenDark }}>Knee X-ray Learning — {doneCount} of {availableChapters.length} chapters done</div>
        </Card>
      )}

      <Card onClick={() => setView("knee")} style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg, ${XRAY.greenDark}, ${XRAY.green})`, padding: "22px 18px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bone size={18} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, background: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "3px 10px" }}>New</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Knee X-ray</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 2 }}>Normal anatomy, common abnormalities and practice cases.</div>
        </div>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: XRAY.gray, marginBottom: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Layers size={13} /> {availableChapters.length} of {KNEE_CHAPTERS.length} chapters ready</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} /> ~{availableChapters.reduce((s, c) => s + c.minutes, 0)} min</span>
          </div>
          <ProgressBar pct={pct} />
          <div style={{ marginTop: 12, width: "100%", borderRadius: 12, border: "none", padding: "12px 0", fontSize: 13.5, fontWeight: 800, color: "#fff", background: XRAY.green, textAlign: "center" }}>
            {started ? "Continue learning" : "Start learning"}
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 13, fontWeight: 800, color: XRAY.ink, marginBottom: 10 }}>Coming soon</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {otherRegions.map((r) => (
          <Card key={r.id} style={{ opacity: 0.65, textAlign: "center", padding: "16px 10px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: XRAY.ink, marginBottom: 6 }}>{r.label}</div>
            <ComingSoonPill />
          </Card>
        ))}
      </div>
    </div>
  );
}
