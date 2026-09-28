import RadiographViewer from "./RadiographViewer.jsx";
import { XRAY, SectionHeading } from "./xrayTheme.jsx";

// Normal-vs-abnormal layout for Compare mode: side by side on desktop,
// stacked on mobile (plain CSS grid with a breakpoint via minmax, no JS
// media-query state needed). Each viewer zooms/pans independently -- syncing
// them is out of scope for this pass (noted in the plan).
export default function ComparePanel({ compare }) {
  if (!compare) return null;
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: XRAY.green, marginBottom: 6, textAlign: "center" }}>NORMAL</div>
          <RadiographViewer image={compare.normalImage} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: XRAY.amber, marginBottom: 6, textAlign: "center" }}>OSTEOARTHRITIS</div>
          <RadiographViewer image={compare.abnormalImage} />
        </div>
      </div>
      {compare.explanation && (
        <div style={{ marginTop: 16 }}>
          <SectionHeading>What's different</SectionHeading>
          <p style={{ fontSize: 13.5, color: XRAY.ink, lineHeight: 1.6, margin: 0 }}>{compare.explanation}</p>
          <p style={{ fontSize: 11.5, color: XRAY.gray, lineHeight: 1.5, marginTop: 8 }}>
            These two images may differ in projection, loading or positioning — treat this as a teaching comparison, not a pixel-for-pixel match.
          </p>
        </div>
      )}
    </div>
  );
}
