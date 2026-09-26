import { useEffect, useRef, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { useAppData } from "../context/AppDataContext.jsx";
import { supabase, authHeader } from "../../supabase.js";
import { apiUrl } from "../../apiUrl.js";

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7", label: "7d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
  { key: "this_month", label: "This month" },
  { key: "previous_month", label: "Previous month" },
  { key: "custom", label: "Custom" },
];

// Whole-app admin overview: real numbers now (users/patients/posts/
// opportunities/applications), plus DAU/WAU/MAU and a live feed once
// analytics_events has enough rows. Cross-user aggregates (patients,
// applications) go through api/admin/analyticsSummary.js -- RLS scopes
// those two tables to "your own rows" (correctly, for normal use), so a
// plain client query as the admin would silently undercount everyone
// else's data. Live updates via Supabase Realtime (the same pattern
// db.js already uses for notifications/messages) rather than polling --
// free on the plan this project is already on, and the admin dashboard is
// exactly the low-connection-count case it's meant for.
export default function AdminAnalyticsPage() {
  const { profile } = useAppData();
  const [range, setRange] = useState("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refetchTimer = useRef(null);

  const load = useCallback(async (r, from, to) => {
    setError(null);
    try {
      const headers = await authHeader();
      const params = new URLSearchParams({ range: r });
      if (r === "custom") { if (from) params.set("from", from); if (to) params.set("to", to); }
      const res = await fetch(apiUrl(`/api/admin/analyticsSummary?${params}`), { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Couldn't load analytics.");
      setSummary(body);
      setLiveEvents(body.recentEvents || []);
    } catch (e) {
      setError(e?.message || "Couldn't load analytics -- please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.isAdmin) return;
    if (range === "custom" && !(customFrom && customTo)) return; // wait for both dates before firing
    setLoading(true);
    load(range, customFrom, customTo);
  }, [profile?.isAdmin, range, customFrom, customTo, load]);

  // Real-time: any new event anywhere in the app nudges the dashboard --
  // prepend it to the live feed immediately, and debounce a full re-fetch
  // (a burst of events shouldn't mean a burst of summary re-fetches).
  useEffect(() => {
    if (!profile?.isAdmin) return;
    const channel = supabase
      .channel("analytics_events_admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, (payload) => {
        setLiveEvents((prev) => [payload.new, ...prev].slice(0, 200));
        clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => load(range, customFrom, customTo), 3000);
      })
      .subscribe();
    return () => {
      clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [profile?.isAdmin, range, customFrom, customTo, load]);

  if (!profile?.isAdmin) return <Navigate to="/feed" replace />;

  const exportCsv = () => {
    const rows = liveEvents;
    const header = "event_name,user_id,entity_type,entity_id,created_at,properties";
    const body = rows.map((r) =>
      [r.event_name, r.user_id, r.entity_type ?? "", r.entity_id ?? "", r.created_at, JSON.stringify(r.properties ?? {}).replace(/"/g, '""')]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physiomind-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const state = summary?.state;
  const trends = summary?.trends;
  const insights = summary?.insights || [];
  const enoughForTrends = (trends?.totalEventsInRange ?? 0) >= 20; // arbitrary but honest floor -- below this a DAU/MAU number is more noise than signal

  // Flat per-user-per-day rows from the API -> grouped by user for display,
  // most patients first.
  const userGroups = (() => {
    const map = new Map();
    for (const row of summary?.userActivity || []) {
      if (!map.has(row.userId)) {
        map.set(row.userId, { userId: row.userId, name: row.name, email: row.email, totalPatients: row.totalPatients, days: [] });
      }
      map.get(row.userId).days.push(row);
    }
    return Array.from(map.values()).sort((a, b) => b.totalPatients - a.totalPatients);
  })();

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-violet-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">Whole-app overview -- clinical + PhysioFeed.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                range === r.key ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button onClick={() => load(range, customFrom, customTo)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!liveEvents.length} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <label className="text-slate-500">From <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="ml-1 border border-slate-200 rounded px-1.5 py-1" /></label>
          <label className="text-slate-500">To <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="ml-1 border border-slate-200 rounded px-1.5 py-1" /></label>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What should I do next?</h2>
            {insights.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {insights.map((i) => (
                  <div key={i.label} className="px-4 py-2.5 text-sm text-slate-700">{i.text}</div>
                ))}
              </div>
            ) : (
              <EmptyNote text="Not enough data to identify a reliable trend yet." />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Right now</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="Registered users" value={state?.totalUsers} />
              <StatCard label="Patients (all clinicians)" value={state?.totalPatients} />
              <StatCard label="Posts" value={state?.totalPosts} />
              <StatCard label="Opportunities" value={state?.totalOpportunities} />
              <StatCard label="Applications" value={state?.totalApplications} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Are people coming back?</h2>
            {enoughForTrends ? (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Daily active users" value={trends?.dau} />
                <StatCard label="Weekly active users" value={trends?.wau} />
                <StatCard label="Monthly active users" value={trends?.mau} />
              </div>
            ) : (
              <EmptyNote text="Not enough data yet -- once real usage builds up, DAU/WAU/MAU fill in here. Retention cohorts need several weeks of history before they mean anything, so they're deliberately left out for now rather than shown as a guess." />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Most-used features</h2>
            {trends && Object.keys(trends.featureCounts || {}).length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {Object.entries(trends.featureCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-700">{name}</span>
                      <span className="text-sm font-semibold text-slate-900">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyNote text="Not enough data yet -- once users interact with the app, this fills in here." />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">People -- patients &amp; time in app</h2>
            <p className="text-xs text-slate-400 mb-2">
              "Time in app" is an estimate from the gaps between actions each day (each gap capped at 15 min), not exact wall-clock time -- there's no session tracking to measure that directly yet.
            </p>
            {userGroups.length > 0 ? (
              <div className="space-y-3">
                {userGroups.map((u) => (
                  <div key={u.userId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                        {u.email && <p className="text-xs text-slate-400">{u.email}</p>}
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{u.totalPatients} patient{u.totalPatients === 1 ? "" : "s"}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {u.days.map((d) => (
                        <div key={d.date} className="flex items-center justify-between px-4 py-2 text-xs gap-2">
                          <span className="text-slate-500 shrink-0">{d.date}</span>
                          <span className="text-slate-700 text-right">
                            {d.loginTimes.length > 0
                              ? d.loginTimes.map((t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })).join(", ")
                              : "no login recorded"}
                          </span>
                          <span className="text-slate-900 font-semibold shrink-0">~{d.activeMinutes} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote text="No per-day activity recorded yet for this range." />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Live activity</h2>
            {liveEvents.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {liveEvents.slice(0, 30).map((e, i) => (
                  <div key={`${e.created_at}-${i}`} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-slate-700 font-medium">{e.event_name}</span>
                    <span className="text-slate-400">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote text="Nothing logged yet in this range." />
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-2xl font-bold text-slate-900">{value ?? 0}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function EmptyNote({ text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
