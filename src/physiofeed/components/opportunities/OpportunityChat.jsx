import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Send, MapPin, IndianRupee } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import * as db from "../../data/db.js";

const QUICK_PROMPTS = ["Are clinical hours flexible?", "When is the start date?"];

// Instant Apply (2026-09-21, Aditi's brief: "Edit Clinical Profile & CV --
// one form, two outputs"). Pulls from the real Clinical profile & CV
// fields (ClinicalCard.jsx / EditClinicalProfileModal.jsx) when a
// clinician has filled them in, same "real data if it exists, sensible
// generic fallback if it doesn't" shape as everywhere else in this app.
function openingMessage(opp, profile) {
  const mentorFirst = opp.mentor.name.split(",")[0];
  const background = (profile?.skills || []).slice(0, 2).join(" and ") || opp.tags?.[0] || "this area";
  const titlePart = profile?.clinicalTitle ? `${profile.clinicalTitle}, ` : "";
  const resumePart = profile?.resumeUrl ? " (résumé attached)" : "";
  return `Hi ${mentorFirst}, I'm ${titlePart}very interested in this ${opp.title}! My background is strong in ${background}.${resumePart}`;
}

// First-contact composer for an opportunity's poster (2026-09-23, "it
// should [show] in here" -- the real Messages inbox). Used to be a fully
// local, scripted thread: a fake canned reply from the mentor, never
// written to direct_messages, so it never showed up in /messages and no
// real person ever saw it -- the honesty rule this app follows everywhere
// else (real data or an honest empty/blocked state, never a faked
// success) applies here too. Sending now writes a real row via
// db.sendMessage, keyed to the listing's actual creator_id (same recipient
// registerForWorkshop() already uses), then hands off to the real thread
// at /messages -- same UI everywone else's conversations render in,
// rather than a second bespoke chat view to keep in sync with it.
export default function OpportunityChat({ opp, onBack }) {
  const { profile } = useAppData();
  const navigate = useNavigate();
  const [text, setText] = useState(() => openingMessage(opp, profile));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);

  const canMessage = !!opp.creatorId && opp.creatorId !== profile?.id;

  // If you've already messaged this poster, jump straight to that real
  // thread instead of re-showing the "first contact" composer over it.
  useEffect(() => {
    let cancelled = false;
    if (!canMessage) { setChecking(false); return; }
    db.getMessages(opp.creatorId)
      .then((existing) => {
        if (cancelled) return;
        if (existing.length > 0) navigate(`/messages?with=${opp.creatorId}`);
        else setChecking(false);
      })
      .catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [opp.creatorId, canMessage, navigate]);

  // Same fix as MessagesPage.jsx (2026-09-23, Aditi: "only messages should
  // scroll"): physiom keeps every tab mounted at once, so <html>/<body> are
  // always taller than the viewport, and a swipe over this fixed-height
  // (70dvh) card scrolled the whole page instead of just the content
  // inside it. Locking both while this chat is mounted fixes that.
  useEffect(() => {
    const htmlPrev = document.documentElement.style.overflow;
    const bodyPrev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlPrev;
      document.body.style.overflow = bodyPrev;
    };
  }, []);

  const send = async (value) => {
    const body = (value ?? text).trim();
    if (!body || !canMessage || sending) return;
    setSending(true);
    setError(null);
    try {
      await db.sendMessage(opp.creatorId, body);
      navigate(`/messages?with=${opp.creatorId}`);
    } catch (e) {
      setError(e.message || "Couldn't send that message -- please try again.");
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: "min(70dvh, 640px)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 shrink-0">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>
        <Avatar size={32} grad={opp.mentor.gradient} initials={opp.mentor.initials} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{opp.mentor.name}</p>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Regarding</p>
        <p className="text-sm font-semibold text-slate-900 leading-snug">{opp.title} — {opp.org}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {opp.location && <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600"><MapPin size={10} />{opp.location}</span>}
          {(opp.stipend || opp.salary || opp.fee) && <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600"><IndianRupee size={10} />{opp.stipend || opp.salary || opp.fee}</span>}
        </div>
      </div>

      {checking ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : !canMessage ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 px-6 text-center">
          {opp.creatorId ? "You can't message yourself." : "Messaging isn't set up for this listing yet."}
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 px-4 py-2 border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => send(p)} disabled={sending} className="shrink-0 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1.5 hover:bg-violet-100 whitespace-nowrap disabled:opacity-40">
                {p}
              </button>
            ))}
          </div>

          {/* Live preview of the draft, styled like the real sent bubble
              it's about to become -- not a fake reply, just this message
              before it's sent. */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex justify-end">
              <span className="max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap break-words leading-relaxed bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                {text || "Write a message…"}
              </span>
            </div>
          </div>

          {error && <p className="px-4 text-xs text-rose-600 pb-1">{error}</p>}

          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 shrink-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Write a message…"
              disabled={sending}
              className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent px-2 disabled:opacity-60"
            />
            <button type="button" onClick={() => send()} disabled={!text.trim() || sending} aria-label="Send message" className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-40">
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
