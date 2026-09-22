import { useEffect, useRef } from "react";

// Read-only popover shown when viewing someone else's "Open to
// Opportunities" pill (2026-09-22 redesign). Own-profile taps open
// OpenToOpportunitiesModal.jsx instead, to edit rather than just view.
export default function OpenToOpportunitiesPopover({ types, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  if (!types?.length) return null;

  return (
    <div ref={ref} className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg p-3 z-30">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Open to</p>
      <div className="flex flex-wrap gap-1.5">
        {types.map((type) => (
          <span key={type} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{type}</span>
        ))}
      </div>
    </div>
  );
}
