import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, MapPin, IndianRupee, BadgeCheck, FileText } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

// Instant Apply (2026-09-21, Aditi's brief: "Edit Clinical Profile & CV --
// one form, two outputs"). The opening message and the attached-profile
// bubble below used to be generic (opp.tags[0], name + badge only) --
// they now pull from the real Clinical profile & CV fields
// (ClinicalCard.jsx / EditClinicalProfileModal.jsx) when a clinician has
// filled them in, same "real data if it exists, sensible generic
// fallback if it doesn't" shape as everywhere else in this app. No new
// state or persistence here -- profile.skills/clinicalTitle/resumeUrl are
// already loaded by AppDataContext; this only changes how they're read.
function openingMessage(opp, profile) {
  const mentorFirst = opp.mentor.name.split(",")[0];
  const background = (profile?.skills || []).slice(0, 2).join(" and ") || opp.tags?.[0] || "this area";
  const titlePart = profile?.clinicalTitle ? `${profile.clinicalTitle}, ` : "";
  const resumePart = profile?.resumeUrl ? " (résumé attached)" : "";
  return `Hi ${mentorFirst}, I'm ${titlePart}very interested in this ${opp.title}! I've attached my verified profile below${resumePart}. My background is strong in ${background}.`;
}

// A demo-only thread scoped to one opportunity, pinned to the listing it's
// "regarding" -- separate from the real /messages feature (MessagesPage.jsx,
// backed by db.js/Supabase). There's no opportunities table yet, so this
// stays local component state, same as the rest of this board.
export default function OpportunityChat({ opp, onBack }) {
  const { profile } = useAppData();
  const [thread, setThread] = useState(() => [
    { id: "m1", isSelf: true, text: openingMessage(opp, profile) },
    { id: "m2", isSelf: false, attachProfile: true },
    {
      id: "m3",
      isSelf: false,
      text: "Hello! Thank you for reaching out. I've reviewed your verified profile, and it looks very impressive. We'd love to schedule a quick call to discuss further. Let me know when you're available!",
    },
  ]);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread]);

  const send = () => {
    if (!text.trim()) return;
    setThread((prev) => [...prev, { id: `m${prev.length + 1}`, isSelf: true, text: text.trim() }]);
    setText("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: "min(70dvh, 640px)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 shrink-0">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>
        <Avatar size={32} grad={opp.mentor.gradient} initials={opp.mentor.initials} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{opp.mentor.name}</p>
          <p className="text-[11px] text-emerald-600 font-medium">Online</p>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {thread.map((m) => (
          <div key={m.id} className={`flex ${m.isSelf ? "justify-end" : "justify-start"}`}>
            {m.attachProfile ? (
              <div className="max-w-[80%] bg-slate-100 rounded-2xl px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar size={30} grad={profile?.gradient} initials={profile?.initials} photoUrl={profile?.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1">{profile?.name || "Your profile"} <BadgeCheck size={12} className="text-violet-500" /></p>
                    <p className="text-[10.5px] text-slate-500 truncate">{profile?.clinicalTitle || "Verified PhysioFeed profile"}</p>
                  </div>
                </div>
                {/* Quick skills + résumé link (2026-09-21) -- the actual
                    "Instant Apply" payoff: whatever's on the Clinical
                    profile & CV card shows up here automatically, no
                    per-application form. Omitted entirely (not a "no
                    skills yet" placeholder) when the clinician hasn't
                    filled that card in -- same as ClinicalCard.jsx itself. */}
                {profile?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.skills.slice(0, 4).map((s) => (
                      <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white text-violet-700 border border-violet-100">{s}</span>
                    ))}
                  </div>
                )}
                {profile?.resumeUrl && (
                  <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-violet-600 hover:text-violet-700">
                    <FileText size={12} /> {profile.resumeName || "Résumé.pdf"}
                  </a>
                )}
              </div>
            ) : (
              <span className={`max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap break-words leading-relaxed ${m.isSelf ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                {m.text}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent px-2"
        />
        <button type="button" onClick={send} disabled={!text.trim()} aria-label="Send message" className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-40">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
