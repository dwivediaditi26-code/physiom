export const GRADIENTS = {
  amber: "from-amber-400 via-orange-400 to-rose-400",
  violet: "from-violet-500 via-purple-500 to-indigo-500",
  slate: "from-slate-600 via-slate-700 to-slate-900",
  teal: "from-teal-400 via-cyan-500 to-blue-500",
  rose: "from-rose-400 via-pink-500 to-fuchsia-500",
  blue: "from-blue-500 via-indigo-500 to-violet-600",
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
  { path: "/saved", label: "Saved", icon: "Bookmark" },
];

export function initialsOf(name) {
  return name.split(" ").map((w) => w[0]).join("").replace(/[.,]/g, "").slice(0, 2).toUpperCase();
}
