import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Sparkles, Check } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useDemoConversations } from "../../context/DemoConversationsContext.jsx";

// The poster's "Chat / Invite" quick action from ApplicantPipeline.jsx /
// ApplicantProfileSheet.jsx (2026-09-22, Aditi's brief: "Message Ritu Nair"
// path, mirrored from the applicant's side -- the poster reaching out to a
// candidate). A real, stateful "Invite to Formally Apply" action, and
// messages are read/written through DemoConversationsContext (2026-09-22,
// Aditi's follow-up: "the message conversation chat should always show
// [in Messages]") so this popup and the real Messages tab share the exact
// same thread instead of two copies that could drift.
//
// The opener used to land in the thread pre-sent. Aditi's follow-up
// (2026-09-22): a poster should be able to draft it, edit it, and only
// have it go out on a deliberate tap -- so it now starts as editable text
// sitting in the composer, and the thread stays empty until Send is hit.
function draftOpener(a, opp) {
  return `Hi ${a.name.split(",")[0].replace("Dr. ", "")}, thanks for applying to ${opp.title}! Your profile looks like a strong fit — do you have time for a quick call this week?`;
}

export default function ApplicantChatModal({ applicant: a, opp, onClose, onInvite }) {
  const { getMessages, sendMessage, addSystemMessage } = useDemoConversations();
  const messages = getMessages(a.id);
  // Only pre-fill the opener draft the first time this thread is opened --
  // reopening one that's already been messaged (e.g. via the real Messages
  // tab) shouldn't dump the same opening line back into the composer.
  const [text, setText] = useState(() => (messages.length === 0 ? draftOpener(a, opp) : ""));
  const [invited, setInvited] = useState(a.status === "shortlisted");
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const contact = { id: a.id, name: a.name, initials: a.initials, gradient: a.gradient, headline: a.headline, regarding: `${opp.title} — ${opp.orgShort || opp.org}` };

  const send = () => {
    if (!text.trim()) return;
    sendMessage(contact, text.trim());
    setText("");
  };

  const invite = () => {
    setInvited(true);
    onInvite(a.id);
    addSystemMessage(contact, "You invited this candidate to formally apply.");
  };

  // Portaled to document.body (2026-09-22) so this always mounts as a
  // direct body child, same pattern as InfoCard.jsx's modal. z-[210]
  // (2026-09-22, Aditi's report on the sibling ApplicantProfileSheet: its
  // header painted underneath the app's own chrome) -- `.pm-mobile-hdr`
  // is z-101 and `.pm-bnav` is z-140, both above this modal's old z-60.
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col h-[70vh] sm:h-[640px]">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 shrink-0">
          <Avatar size={32} grad={a.gradient} initials={a.initials} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{a.headline}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Regarding</p>
          <p className="text-sm font-semibold text-slate-900 leading-snug">{opp.title} — {opp.orgShort || opp.org}</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {messages.length === 0 && (
            <p className="text-center text-xs text-slate-400 pt-6">Your message is drafted below — review it, then hit send.</p>
          )}
          {messages.map((m) => (
            m.system ? (
              <div key={m.id} className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full"><Check size={12} />{m.text}</span>
              </div>
            ) : (
              <div key={m.id} className={`flex ${m.isSelf ? "justify-end" : "justify-start"}`}>
                <span className={`max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap break-words leading-relaxed ${m.isSelf ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                  {m.text}
                </span>
              </div>
            )
          ))}
        </div>

        <div className="px-4 pt-3 pb-2 shrink-0">
          <button
            type="button"
            onClick={invite}
            disabled={invited}
            className={`w-full flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl py-2.5 transition ${invited ? "bg-emerald-50 text-emerald-700" : "text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm active:scale-[0.98]"}`}
          >
            {invited ? <><Check size={15} /> Invited to formally apply</> : <><Sparkles size={15} /> Invite Candidate to Formally Apply</>}
          </button>
        </div>

        <div className="flex items-end gap-2 px-3 py-2.5 border-t border-slate-100 shrink-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
            placeholder="Write a message…"
            rows={2}
            className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent px-2 py-1.5 resize-none"
          />
          <button type="button" onClick={send} disabled={!text.trim()} aria-label="Send message" className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
