export const GRADIENTS = {
  amber: "from-amber-400 via-orange-400 to-rose-400",
  violet: "from-violet-500 via-purple-500 to-indigo-500",
  slate: "from-slate-600 via-slate-700 to-slate-900",
  teal: "from-teal-400 via-cyan-500 to-blue-500",
  rose: "from-rose-400 via-pink-500 to-fuchsia-500",
  blue: "from-blue-500 via-indigo-500 to-violet-600",
};

// Profile header accent, one row per GRADIENTS key above (2026-09-22,
// Aditi: "when we choose this it changes according to this colour" --
// picking an avatar color in EditProfileModal.jsx used to only recolor the
// avatar circle itself; every other accent on the header -- the hero
// background, role text, the handwritten quote, skill/Open-to chips, stat
// icons, and the gradient buttons -- was hardcoded violet regardless of
// which swatch was picked). Written as complete literal class strings, not
// built with template interpolation, because Tailwind's scanner needs the
// full class name present as text somewhere in source to generate it --
// `text-${color}-600` at render time would never get styled.
export const PROFILE_ACCENTS = {
  amber: {
    hero: "from-amber-50 via-[#FFF8F0] to-white",
    text: "text-amber-600",
    chipBg: "bg-amber-50 border-amber-100 hover:bg-amber-100",
    icon: "text-amber-500",
    underline: "bg-amber-300",
    button: "from-amber-600 to-orange-600",
    outline: "border-amber-200 bg-white text-amber-600 hover:bg-amber-50",
    filled: "border-amber-200 bg-amber-50 text-amber-600",
  },
  violet: {
    hero: "from-violet-50 via-[#F8F6FF] to-white",
    text: "text-violet-600",
    chipBg: "bg-violet-50 border-violet-100 hover:bg-violet-100",
    icon: "text-violet-500",
    underline: "bg-violet-300",
    button: "from-violet-600 to-indigo-600",
    outline: "border-violet-200 bg-white text-violet-600 hover:bg-violet-50",
    filled: "border-violet-200 bg-violet-50 text-violet-600",
  },
  slate: {
    hero: "from-slate-100 via-[#F5F6F8] to-white",
    text: "text-slate-700",
    chipBg: "bg-slate-100 border-slate-200 hover:bg-slate-200",
    icon: "text-slate-500",
    underline: "bg-slate-300",
    button: "from-slate-700 to-slate-900",
    outline: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    filled: "border-slate-300 bg-slate-100 text-slate-700",
  },
  teal: {
    hero: "from-teal-50 via-[#F0FBFA] to-white",
    text: "text-teal-600",
    chipBg: "bg-teal-50 border-teal-100 hover:bg-teal-100",
    icon: "text-teal-500",
    underline: "bg-teal-300",
    button: "from-teal-500 to-cyan-600",
    outline: "border-teal-200 bg-white text-teal-600 hover:bg-teal-50",
    filled: "border-teal-200 bg-teal-50 text-teal-600",
  },
  rose: {
    hero: "from-rose-50 via-[#FFF3F6] to-white",
    text: "text-rose-600",
    chipBg: "bg-rose-50 border-rose-100 hover:bg-rose-100",
    icon: "text-rose-500",
    underline: "bg-rose-300",
    button: "from-rose-500 to-pink-600",
    outline: "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
    filled: "border-rose-200 bg-rose-50 text-rose-600",
  },
  blue: {
    hero: "from-blue-50 via-[#F0F5FF] to-white",
    text: "text-blue-600",
    chipBg: "bg-blue-50 border-blue-100 hover:bg-blue-100",
    icon: "text-blue-500",
    underline: "bg-blue-300",
    button: "from-blue-600 to-indigo-600",
    outline: "border-blue-200 bg-white text-blue-600 hover:bg-blue-50",
    filled: "border-blue-200 bg-blue-50 text-blue-600",
  },
};

export const CLINICAL_NAV = [
  { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { path: "/patients", label: "Patients", icon: "Users" },
  { path: "/assessments", label: "Assessments", icon: "ClipboardList" },
  { path: "/ai", label: "AI-Assisted Assessment", icon: "Sparkles", badge: "New" },
  { path: "/soap", label: "SOAP Notes", icon: "FileText" },
  { path: "/exercises", label: "Exercises", icon: "Dumbbell" },
  { path: "/programs", label: "Programs", icon: "ListChecks" },
  { path: "/analytics", label: "Analytics", icon: "BarChart3" },
];

export const PRO_NAV = [
  { path: "/feed", label: "Physio Feed", icon: "Rss" },
  { path: "/evidence", label: "Evidence", icon: "BookOpen", badge: "New" },
  { path: "/explore", label: "Explore", icon: "Compass" },
  { path: "/communities", label: "Communities", icon: "UsersRound" },
  { path: "/people", label: "People", icon: "User" },
  { path: "/messages", label: "Messages", icon: "MessageSquare" },
  { path: "/saved", label: "Saved", icon: "Bookmark" },
];

export const OPPORTUNITY_TYPES = [
  "Jobs", "Internships", "Collaborations", "Research", "Workshops", "Mentorship",
];

// Education & Certifications date fields (2026-09-22, Aditi: "year month
// in education an[d] certification"). A plain select, not a date picker --
// a degree or cert only ever needs "when", not a specific day.
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function initialsOf(name) {
  return name.split(" ").map((w) => w[0]).join("").replace(/[.,]/g, "").slice(0, 2).toUpperCase();
}

// Shared by ProfileHeader.jsx for followers/following/posts counts. Was
// previously hardcoded as `(n / 1000).toFixed(1)}K` in ProfileHeader.jsx
// -- fine for the old fake demo counts (1200 followers), but showed
// "0.0K" for every real clinician's genuine, correct 0 followers, which
// reads as broken/fake rather than honest. Below 1000 shows the exact
// count; 1000+ rounds to one decimal with a K suffix.
export function formatCount(n) {
  const num = Number(n) || 0;
  if (num < 1000) return String(num);
  return `${(num / 1000).toFixed(1)}K`;
}
