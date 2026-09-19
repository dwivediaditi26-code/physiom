import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Video as VideoIcon } from "lucide-react";

// Shared colour + type kit for every Learn screen: a rounded display font for
// headings, a palette of themes (literal class names so Tailwind keeps them),
// and the header / tab bar / video placeholder / next button the four-tab
// detail screens share.

export const THEMES = {
  violet: { grad: "from-violet-600 via-violet-500 to-fuchsia-500", soft: "bg-violet-50", softer: "bg-violet-100", text: "text-violet-700", solid: "bg-violet-600", border: "border-violet-200", ring: "ring-violet-200", dot: "bg-violet-500", badge: "from-violet-500 to-fuchsia-500" },
  sky:    { grad: "from-sky-600 via-sky-500 to-indigo-500",       soft: "bg-sky-50",    softer: "bg-sky-100",    text: "text-sky-700",    solid: "bg-sky-600",    border: "border-sky-200",    ring: "ring-sky-200",    dot: "bg-sky-500",    badge: "from-sky-500 to-indigo-500" },
  orange: { grad: "from-orange-500 via-orange-400 to-amber-400",  soft: "bg-orange-50", softer: "bg-orange-100", text: "text-orange-700", solid: "bg-orange-500", border: "border-orange-200", ring: "ring-orange-200", dot: "bg-orange-500", badge: "from-orange-500 to-amber-400" },
  rose:   { grad: "from-rose-600 via-rose-500 to-pink-500",       soft: "bg-rose-50",   softer: "bg-rose-100",   text: "text-rose-700",   solid: "bg-rose-600",   border: "border-rose-200",   ring: "ring-rose-200",   dot: "bg-rose-500",   badge: "from-rose-500 to-pink-500" },
  cyan:   { grad: "from-cyan-600 via-sky-500 to-blue-500",        soft: "bg-cyan-50",   softer: "bg-cyan-100",   text: "text-cyan-700",   solid: "bg-cyan-600",   border: "border-cyan-200",   ring: "ring-cyan-200",   dot: "bg-cyan-500",   badge: "from-cyan-500 to-blue-500" },
  pink:   { grad: "from-pink-500 via-fuchsia-500 to-purple-500",  soft: "bg-pink-50",   softer: "bg-pink-100",   text: "text-pink-700",   solid: "bg-pink-500",   border: "border-pink-200",   ring: "ring-pink-200",   dot: "bg-pink-500",   badge: "from-pink-500 to-purple-500" },
  amber:  { grad: "from-amber-500 via-amber-400 to-yellow-400",   soft: "bg-amber-50",  softer: "bg-amber-100",  text: "text-amber-700",  solid: "bg-amber-500",  border: "border-amber-200",  ring: "ring-amber-200",  dot: "bg-amber-500",  badge: "from-amber-500 to-yellow-400" },
  indigo: { grad: "from-indigo-600 via-violet-500 to-fuchsia-500",soft: "bg-indigo-50", softer: "bg-indigo-100", text: "text-indigo-700", solid: "bg-indigo-600", border: "border-indigo-200", ring: "ring-indigo-200", dot: "bg-indigo-500", badge: "from-indigo-500 to-violet-500" },
};
export const THEME_ORDER = ["violet", "sky", "orange", "rose", "cyan", "pink", "amber", "indigo"];

// Rounded display face for headings; body text stays on the app's Inter.
export const DISPLAY_CSS = ".cl-display{font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif;letter-spacing:-0.01em}";
export function useDisplayFont() {
  useEffect(() => {
    if (document.getElementById("cl-display-font")) return;
    const l = document.createElement("link");
    l.id = "cl-display-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap";
    document.head.appendChild(l);
  }, []);
}
export function DisplayFont() {
  useDisplayFont();
  return <style>{DISPLAY_CSS}</style>;
}

export function DetailHeader({ onBack, badge, title, subtitle, theme = "violet" }) {
  const t = THEMES[theme] || THEMES.violet;
  return (
    <div>
      <DisplayFont/>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className={`rounded-3xl bg-gradient-to-br ${t.grad} text-white p-4 shadow-md`}>
        {badge && <span className="inline-block text-[11px] font-bold bg-white/25 rounded-full px-2.5 py-1 mb-2">{badge}</span>}
        <h2 className="cl-display text-2xl font-extrabold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-white/90 mt-1 leading-snug">{subtitle}</p>}
      </div>
    </div>
  );
}

const TAB_STYLE = {
  Learn:     { on: "bg-violet-600 text-white shadow-sm",  off: "bg-violet-50 text-violet-700" },
  Technique: { on: "bg-orange-500 text-white shadow-sm",  off: "bg-orange-50 text-orange-700" },
  Video:     { on: "bg-sky-500 text-white shadow-sm",     off: "bg-sky-50 text-sky-700" },
  Quiz:      { on: "bg-fuchsia-500 text-white shadow-sm", off: "bg-fuchsia-50 text-fuchsia-700" },
};
export function DetailTabs({ tab, setTab }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 mt-4">
      {["Learn", "Technique", "Video", "Quiz"].map((t) => (
        <button key={t} type="button" onClick={() => setTab(t)} className={`flex items-center justify-center text-center rounded-xl py-2.5 text-[13px] font-bold transition-colors ${tab === t ? TAB_STYLE[t].on : TAB_STYLE[t].off}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function VideoTab({ name }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 py-10 px-4 text-center">
      <span className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm"><VideoIcon size={26}/></span>
      <div className="cl-display text-sm font-extrabold text-sky-800">Video coming soon</div>
      <div className="text-xs text-sky-600 mt-1">A demonstration of {name} will appear here.</div>
    </div>
  );
}

export function NextButton({ label, onClick, theme = "violet" }) {
  const t = THEMES[theme] || THEMES.violet;
  return (
    <button type="button" onClick={onClick} className={`mt-5 w-full flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r ${t.grad} text-white py-3.5 text-sm font-bold shadow-md active:scale-[0.99] transition`}>
      {label} <ChevronRight size={17}/>
    </button>
  );
}

export function MediaFrame({ children }) {
  return <div className="mt-3 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex items-center justify-center">{children}</div>;
}
