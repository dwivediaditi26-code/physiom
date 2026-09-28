import { Lock, Check, ChevronLeft } from "lucide-react";

// Own small palette for X-ray Educational Material -- deliberately separate
// from the purple clinical BRAND (orthoFieldKit.jsx) and from Learn's own
// violet/fuchsia theme (learnTheme.jsx), so this section can read as a
// bright, calm, green textbook without touching either.
export const XRAY = {
  green: "#16A34A",
  greenDark: "#14532D",
  greenSoft: "#F0FDF4",
  greenBorder: "#BBF7D0",
  border: "#E7E5E4",
  ink: "#1C1917",
  gray: "#78716C",
  grayLight: "#A8A29E",
  bg: "#FFFFFF",
  bgWarm: "#FAFAF9",
  amber: "#B45309",
  amberBg: "#FFFBEB",
  red: "#DC2626",
};

export function PageHeader({ title, subtitle, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18 }}>
      {onBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          style={{ border: "none", background: "none", padding: "4px 2px 0 0", cursor: "pointer", color: XRAY.gray, flexShrink: 0 }}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: XRAY.greenDark, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13.5, color: XRAY.gray, lineHeight: 1.4 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, style, onClick, as }) {
  const Tag = as || (onClick ? "button" : "div");
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: XRAY.bg,
        border: `1px solid ${XRAY.border}`,
        borderRadius: 16,
        boxShadow: "0 1px 2px rgba(28,25,23,0.04), 0 4px 12px rgba(28,25,23,0.05)",
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export function ProgressBar({ pct, height = 8 }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ background: "#EEEDEB", borderRadius: height, height, overflow: "hidden" }}>
      <div style={{ width: `${clamped}%`, height: "100%", background: XRAY.green, borderRadius: height, transition: "width 0.3s" }} />
    </div>
  );
}

export function Pill({ children, tone = "green" }) {
  const tones = {
    green: { bg: XRAY.greenSoft, fg: XRAY.greenDark },
    gray: { bg: "#F5F5F4", fg: XRAY.gray },
    amber: { bg: XRAY.amberBg, fg: XRAY.amber },
  };
  const t = tones[tone] || tones.green;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: t.fg, background: t.bg, borderRadius: 999, padding: "3px 10px" }}>
      {children}
    </span>
  );
}

export function ComingSoonPill() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: XRAY.grayLight, background: "#F5F5F4", borderRadius: 999, padding: "3px 9px" }}>
      <Lock size={11} /> Coming soon
    </span>
  );
}

export function CompleteBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: XRAY.green, color: "#fff", flexShrink: 0 }}>
      <Check size={13} strokeWidth={3} />
    </span>
  );
}

export function SectionHeading({ children, style }) {
  return <h2 style={{ fontSize: 17, fontWeight: 800, color: XRAY.greenDark, margin: "0 0 8px", ...style }}>{children}</h2>;
}
