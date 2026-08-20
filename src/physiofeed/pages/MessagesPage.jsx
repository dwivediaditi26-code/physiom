import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, ChevronLeft, MessageSquare } from "lucide-react";
import Avatar from "../components/shared/Avatar.jsx";
import * as db from "../data/db.js";

// Direct messages between clinicians (Aditi's request: "chat area to
// message the physios"). See supabase/add_direct_messages.sql for the
// schema/RLS this needs -- run once, required for this feature to work.
// Loads its own data directly from db.js rather than through
// AppDataContext, same reasoning as AdminReportsPage.jsx: conversations
// are only relevant on this one page, no reason to carry that state
// globally for every PhysioFeed screen.
//
// Which conversation is open lives in the URL (?with=<userId>), same
// pattern as /people?q=... -- PersonCard's "Message" button and the
// header search dropdown both link straight into a specific thread this
// way, and back/forward navigation works for free.
export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const withId = searchParams.get("with");

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await db.getConversations());
    } catch (e) {
      setError(e.message || "Couldn't load your messages.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!withId) { setThread([]); return; }
    let cancelled = false;
    setLoadingThread(true);
    setError(null);
    (async () => {
      try {
        const msgs = await db.getMessages(withId);
        if (cancelled) return;
        setThread(msgs);
        await db.markConversationRead(withId);
        if (!cancelled) loadConversations(); // clears this conversation's unread badge in the list
      } catch (e) {
        if (!cancelled) setError(e.message || "Couldn't load this conversation.");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => { cancelled = true; };
  }, [withId, loadConversations]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread]);

  const active = conversations.find((c) => c.userId === withId);

  const submit = async () => {
    if (!text.trim() || sending || !withId) return;
    setSending(true);
    setError(null);
    try {
      setThread(await db.sendMessage(withId, text.trim()));
      setText("");
      loadConversations();
    } catch (e) {
      setError(e.message || "Couldn't send that message -- please try again.");
    } finally {
      setSending(false);
    }
  };

  const openConversation = (userId) => setSearchParams({ with: userId });
  const backToList = () => setSearchParams({});

  return (
    <main className="flex-1 min-w-0">
      {/* Hidden on mobile once a thread is open -- reclaims the vertical
          space this heading takes so the composer at the bottom of the
          chat card doesn't get pushed below the fold on short viewports
          (see the `dvh`, not `vh`, comment below for the other half of
          this fix). */}
      <div className={`${withId ? "hidden sm:block" : ""} mb-5`}>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Messages</h1>
        <p className="text-sm text-slate-500">Direct conversations with other physios.</p>
      </div>

      {/* `dvh` (dynamic viewport height), not `vh` -- on mobile browsers
          `vh` is measured against the viewport WITH the address bar
          collapsed, so a `vh`-based height plus this page's header/banner
          chrome above it routinely pushed the message input below the
          visible fold with no visual hint there was more content to
          scroll to. `dvh` tracks the actually-visible viewport instead. */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex" style={{ height: "min(70dvh, 640px)" }}>
        {/* Conversation list -- hidden on mobile once a thread is open */}
        <div className={`${withId ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 shrink-0 border-r border-slate-100 overflow-y-auto`}>
          {loadingList ? (
            <p className="text-sm text-slate-400 p-4">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={26} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No conversations yet.</p>
              <p className="text-xs text-slate-400 mt-1">Message a physio from the People page to start one.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c.userId)}
                className={`flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none ${withId === c.userId ? "bg-violet-50" : ""}`}
              >
                <Avatar size={38} grad={c.gradient} initials={c.initials} photoUrl={c.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${c.unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{c.name}</p>
                  <p className={`text-xs truncate ${c.unread ? "text-slate-700 font-medium" : "text-slate-400"}`}>{c.lastText}</p>
                </div>
                {c.unread > 0 && <span className="shrink-0 w-2 h-2 rounded-full bg-violet-600" aria-label={`${c.unread} unread`} />}
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className={`${withId ? "flex" : "hidden sm:flex"} flex-col flex-1 min-w-0`}>
          {!withId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
                <button onClick={backToList} aria-label="Back to conversations" className="sm:hidden text-slate-400 hover:text-slate-600"><ChevronLeft size={18} /></button>
                {active && <Avatar size={30} grad={active.gradient} initials={active.initials} photoUrl={active.avatarUrl} />}
                <p className="text-sm font-semibold text-slate-900 truncate">{active?.name || "Conversation"}</p>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loadingThread ? (
                  <p className="text-sm text-slate-400">Loading…</p>
                ) : thread.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center mt-6">Say hello to start the conversation.</p>
                ) : (
                  thread.map((m) => (
                    <div key={m.id} className={`flex ${m.isSelf ? "justify-end" : "justify-start"}`}>
                      <span className={`max-w-[75%] text-sm px-3 py-2 rounded-2xl whitespace-pre-wrap break-words ${m.isSelf ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>{m.text}</span>
                    </div>
                  ))
                )}
              </div>
              {error && <p className="px-4 text-xs text-rose-600 pb-1">{error}</p>}
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Type a message…"
                  className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent px-2"
                />
                <button onClick={submit} disabled={!text.trim() || sending} aria-label="Send message" className="text-violet-600 disabled:text-slate-300 p-1.5">
                  <Send size={17} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
