import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";

const CATEGORIES = [
  { key: "job_india", label: "Job — India" },
  { key: "job_international", label: "Job — International" },
  { key: "conference", label: "Conference / workshop" },
  { key: "regulation", label: "Regulation / council" },
  { key: "research", label: "Research / practice news" },
  { key: "alert", label: "Alert" },
];
const FIELD = "w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300 outline-none";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const EMPTY = { title: "", summary: "", category: "research", source_name: "", source_url: "", location: "", deadline: "", published: "" };

// Admin-only: paste news text and/or a link, let the AI draft the item,
// review/edit it, then publish into News (and optionally notify phones).
// Nothing is ever published without the Publish button. The draft step is
// optional -- the form can be filled in by hand with no AI cost.
export default function AdminAddNewsPage() {
  const { profile } = useAppData();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [drafted, setDrafted] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [note, setNote] = useState(null);
  const [notify, setNotify] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [published, setPublished] = useState(null);

  if (!profile?.isAdmin) return <Navigate to="/feed" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const runDraft = async () => {
    if (drafting || (!text.trim() && !link.trim())) return;
    setDrafting(true); setDraftError(null); setNote(null);
    try {
      const { draft, note: n } = await db.draftNewsItem(text.trim(), link.trim());
      setForm({ ...EMPTY, ...draft, source_url: draft.source_url || link.trim() });
      setDrafted(true); setNote(n || null);
    } catch (err) {
      setDraftError(err.message);
    } finally {
      setDrafting(false);
    }
  };

  const canPublish = form.title.trim() && form.source_name.trim() && form.source_url.trim();

  const publish = async () => {
    if (!canPublish || publishing) return;
    setPublishing(true); setPublishError(null);
    try {
      setPublished(await db.publishNewsItem({ ...form, notify }));
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => { setText(""); setLink(""); setForm(EMPTY); setDrafted(false); setNote(null); setPublished(null); setPublishError(null); setDraftError(null); };

  if (published) {
    return (
      <main className="flex-1 min-w-0 max-w-xl">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={36} />
          <h1 className="text-lg font-bold text-slate-900 mb-1">{published.updated ? "News item updated" : "Published to News"}</h1>
          <p className="text-sm text-slate-500 mb-4">
            {published.updated ? "That link was already in News, so its details were updated." : published.notified ? (published.total === 0 ? "Published. No phone has notifications turned on yet, so nobody was notified." : published.total != null ? `Notified ${published.sent} of ${published.total} phone${published.total === 1 ? "" : "s"} with notifications on.` : "Phones with notifications on were notified.") : notify ? "Published. The phone notification could not be sent." : "Published without a phone notification."}
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/news" className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold">See News</Link>
            <button onClick={reset} className="px-4 py-2 rounded-xl bg-violet-50 text-violet-700 text-sm font-bold">Add another</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 max-w-xl">
      <Link to="/news" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 mb-3"><ArrowLeft size={14} /> News</Link>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Add news</h1>
      <p className="text-sm text-slate-500 mb-4">Paste the news and/or its link. The AI drafts the item from that text only — you check it, then publish.</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <label className={LABEL}>News text (optional if you add a link)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste the notice, message or article text here…" className={FIELD + " mb-3"} />
        <label className={LABEL}>Link to the original</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" className={FIELD + " mb-3"} />
        <button onClick={runDraft} disabled={drafting || (!text.trim() && !link.trim())}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-40">
          <Sparkles size={15} /> {drafting ? "Drafting…" : drafted ? "Draft again with AI" : "Draft with AI"}
        </button>
        {draftError && <p className="text-sm text-rose-600 mt-2">{draftError}</p>}
        {note && <p className="text-xs text-amber-700 mt-2">{note}</p>}
        {!drafted && <p className="text-xs text-slate-400 mt-2">Or skip the AI and fill the form below by hand — that costs nothing.</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">{drafted ? "Check the draft" : "News item"}</h2>
        <label className={LABEL}>Title</label>
        <input value={form.title} onChange={set("title")} maxLength={300} className={FIELD + " mb-3"} />
        <label className={LABEL}>Summary</label>
        <textarea value={form.summary} onChange={set("summary")} rows={3} maxLength={500} className={FIELD + " mb-3"} />
        <label className={LABEL}>Category</label>
        <select value={form.category} onChange={set("category")} className={FIELD + " mb-3"}>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <label className={LABEL}>Source name</label>
        <input value={form.source_name} onChange={set("source_name")} placeholder="e.g. AIIMS New Delhi" className={FIELD + " mb-3"} />
        <label className={LABEL}>Source link (required — readers use it to verify)</label>
        <input value={form.source_url} onChange={set("source_url")} placeholder="https://…" inputMode="url" className={FIELD + " mb-3"} />
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div><label className={LABEL}>Location</label><input value={form.location} onChange={set("location")} className={FIELD} /></div>
          <div><label className={LABEL}>Last date</label><input type="date" value={form.deadline} onChange={set("deadline")} className={FIELD} /></div>
          <div><label className={LABEL}>Posted on</label><input type="date" value={form.published} onChange={set("published")} className={FIELD} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 mb-3">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Send a phone notification to everyone
        </label>
        {publishError && <p className="text-sm text-rose-600 mb-2">{publishError}</p>}
        <button onClick={publish} disabled={!canPublish || publishing}
          className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40">
          {publishing ? "Publishing…" : "Publish to News"}
        </button>
        <p className="text-[11px] text-slate-400 mt-2">AI drafts can be wrong. Check every field against the original before publishing.</p>
      </div>
    </main>
  );
}
