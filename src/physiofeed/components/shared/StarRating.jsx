import { Star } from "lucide-react";

export default function StarRating({ value }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <div className="relative inline-flex">
      <div className="flex gap-0.5 text-slate-200">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} className="fill-current" />)}
      </div>
      <div className="absolute inset-0 flex gap-0.5 text-violet-500 overflow-hidden" style={{ width: `${pct}%` }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} className="fill-current shrink-0" />)}
      </div>
    </div>
  );
}
