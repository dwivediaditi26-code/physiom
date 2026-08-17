// Same visual role as the colored info cards in the real clinical entry
// screens (PhysioNeuro.jsx / SubjectiveObjective.jsx) -- icon + uppercase
// label + real field content -- just restyled with study mode's own
// Tailwind palette instead of copying pixel-for-pixel inline styles.
const TINTS = {
  violet: "bg-violet-50 border-violet-100",
  green: "bg-emerald-50 border-emerald-100",
  amber: "bg-amber-50 border-amber-100",
  blue: "bg-blue-50 border-blue-100",
  red: "bg-rose-50 border-rose-100",
  gray: "bg-slate-50 border-slate-100",
};
const LABEL_TINTS = {
  violet: "text-violet-600",
  green: "text-emerald-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  red: "text-rose-600",
  gray: "text-slate-400",
};

export default function InfoBox({ icon, label, tint = "gray", children }) {
  return (
    <div className={`rounded-xl border p-3 ${TINTS[tint] || TINTS.gray}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide mb-1 flex items-center gap-1 ${LABEL_TINTS[tint] || LABEL_TINTS.gray}`}>
        {icon && <span aria-hidden="true">{icon}</span>}{label}
      </div>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}
