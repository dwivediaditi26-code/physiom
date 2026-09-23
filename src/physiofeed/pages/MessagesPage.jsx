import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, ChevronLeft, MessageSquare, Lock, Search, PenSquare, X } from "lucide-react";
import Avatar from "../components/shared/Avatar.jsx";
import { initialsOf } from "../components/shared/constants.js";
import * as db from "../data/db.js";
import { useDemoConversations } from "../context/DemoConversationsContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Non-connection message cap (2026-09-22, Aditi: "when connected only
// then... 3 messages you can do if not connected") -- lets a clinician
// send a few messages to break the ice before connecting, same shape as
// LinkedIn's own free-InMail-style limit, but stops short of unlimited
// messaging to someone who hasn't accepted a connection. Counts only the
// open thread's OWN messages you sent (not theirs), so their replies never
// count against your cap and don't need their own gating.
const MESSAGE_LIMIT_IF_NOT_CONNECTED = 3;

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
// Inbox timestamps read the way a messaging app's do: clock time today,
// weekday within the last week, date beyond that (2026-09-23).
function inboxTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.round((now - d) / 86400000);
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function messageTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Separator label above the first message of each day.
function dayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const withId = searchParams.get("with");
  const demo = useDemoConversations();
  const { connectionStates, connectWith, refreshUnreadMessages, people } = useAppData();

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  // Inbox search + "new message" picker (2026-09-23, Aditi's messaging
  // spec). Both are inbox-only state; which conversation is OPEN stays in
  // the URL, as before.
  const [listQuery, setListQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
  const scrollRef = useRef(null);
  const cardRef = useRef(null);

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
    // Demo threads (2026-09-22, from ApplicantChatModal's "Chat / Invite")
    // live in DemoConversationsContext, not Supabase -- skip the real
    // fetch entirely so a fake applicant id never hits db.getMessages
    // (which throws for guests and wouldn't find a real row anyway).
    if (demo.hasThread(withId)) {
      setThread(demo.getMessages(withId));
      setLoadingThread(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    setError(null);
    (async () => {
      try {
        const msgs = await db.getMessages(withId);
        if (cancelled) return;
        setThread(msgs);
        await db.markConversationRead(withId);
        // clears this conversation's unread badge in the list, and the
        // header's envelope dot if that was the last unread thread (P3)
        if (!cancelled) { loadConversations(); refreshUnreadMessages(); }
      } catch (e) {
        if (!cancelled) setError(e.message || "Couldn't load this conversation.");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => { cancelled = true; };
  }, [withId, loadConversations, demo, refreshUnreadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread]);

  // Realtime (2026-08-19): a message arriving from the other person used
  // to sit invisible in the database until you left this page and came
  // back -- no live update at all. Subscribes ONCE for the page's
  // lifetime (not once per conversation) via a ref holding the currently
  // open thread's id, so switching conversations doesn't tear down and
  // recreate the socket subscription on every click -- it just changes
  // which incoming rows the same subscription appends to.
  const withIdRef = useRef(withId);
  useEffect(() => { withIdRef.current = withId; }, [withId]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    (async () => {
      unsubscribe = await db.subscribeToMessages((row) => {
        if (cancelled) return;
        // Any message involving you should bump the conversation list
        // (new last-message preview / unread dot), whether or not its
        // thread happens to be the one currently open.
        loadConversations();
        const openWith = withIdRef.current;
        if (!openWith || (row.sender_id !== openWith && row.recipient_id !== openWith)) return;
        // Within the open thread: recipient_id === me means I sent it
        // (already appended optimistically by submit()'s own setThread
        // call) -- guard on id to avoid appending our own message twice.
        setThread((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { id: row.id, text: row.text, isSelf: row.recipient_id === openWith, createdAt: row.created_at }]));
        if (row.sender_id === openWith) db.markConversationRead(openWith).then(() => { loadConversations(); refreshUnreadMessages(); });
      });
      if (cancelled) unsubscribe();
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, [loadConversations, refreshUnreadMessages]);

  // Merges the real (Supabase) list with DemoConversationsContext's list
  // so a "Chat / Invite" thread keeps showing up here, not just inside
  // ApplicantChatModal's one-off popup (2026-09-22, Aditi: "the message
  // conversation chat should always show here").
  const allConversations = useMemo(
    () => [...demo.list, ...conversations].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)),
    [demo.list, conversations]
  );
  const active = allConversations.find((c) => c.userId === withId);

  // Search the inbox by person (2026-09-23, spec item 7). Name and
  // designation both, since "the sports physio in Bhopal" is as likely a
  // way to look someone up as their name.
  const visibleConversations = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return allConversations;
    return allConversations.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.role || "").toLowerCase().includes(q)
    );
  }, [allConversations, listQuery]);

  // "New message": anyone real you aren't already talking to. Demo
  // recruiter threads are excluded -- they aren't people you can start a
  // conversation with.
  const composeCandidates = useMemo(() => {
    const already = new Set(conversations.map((c) => String(c.userId)));
    const q = composeQuery.trim().toLowerCase();
    return (people || [])
      .filter((p) => !already.has(String(p.id)))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q));
  }, [people, conversations, composeQuery]);

  // Demo threads (recruiter/applicant chat) are exempt -- "connected" is a
  // People/Profile concept that doesn't apply to those. Reads the real
  // connections table via context (P2); this used to check the `follows`
  // row, back when Connect was just a relabelled Follow.
  const isConnected = active?.isDemo || connectionStates[withId] === "connected";
  const sentCount = thread.filter((m) => m.isSelf && !m.system).length;
  const limitReached = !isConnected && sentCount >= MESSAGE_LIMIT_IF_NOT_CONNECTED;

  const submit = async () => {
    if (!text.trim() || sending || !withId || limitReached) return;
    if (active?.isDemo) {
      demo.sendMessage({ id: withId, name: active.name, initials: active.initials, gradient: active.gradient, headline: active.role, regarding: active.regarding }, text.trim());
      setText("");
      return;
    }
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

  // 2026-09-23 (Aditi: "the page is scrolling of message, it should scroll
  // the chat, make chat static page" -- then "same for message list").
  // Applies to the inbox and the open thread alike: the card was a 70dvh box
  // inside a page that was itself taller than the viewport, so a swipe
  // scrolled the PAGE -- dragging the whole chat, header and composer
  // included -- instead of the messages. With a thread open the card is
  // now sized to whatever room is actually left below it, so the page has
  // nothing to scroll and the only scrollable thing is the message list.
  //
  // Measured rather than computed from a dvh formula because what sits
  // above it varies: the guest banner, the action-error strip and the
  // section nav all come and go.
  //
  // The page itself is locked while this screen is mounted. physiom keeps
  // every tab mounted at once, so the document is taller than the viewport
  // on every PhysioFeed page regardless of what's on it -- which is why a
  // swipe here dragged the whole chat instead of the messages, and why
  // subtracting "document overflow" to size the card was measuring other
  // tabs and shrinking it to nothing. Everything clipped by the lock is
  // the shell's own trailing padding; the bottom nav is position:fixed and
  // unaffected.
  useEffect(() => {
    // Both <html> and <body> get locked -- which one actually scrolls
    // varies by browser/layout, and physiom's own shell CSS has <html> as
    // the real scrolling element here (verified: body.overflow=hidden
    // alone still let window.scrollTo move the page). Locking both is
    // belt-and-braces and correct either way.
    const htmlPrev = document.documentElement.style.overflow;
    const bodyPrev = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlPrev;
      document.body.style.overflow = bodyPrev;
    };
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const fit = () => {
      const node = cardRef.current;
      if (!node) return;
      node.style.height = "";
      const top = node.getBoundingClientRect().top;
      const bnav = document.querySelector(".pm-bnav");
      const bottom = bnav ? bnav.getBoundingClientRect().height : 0;
      node.style.height = `${Math.max(280, window.innerHeight - top - bottom - 10)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    const id = setTimeout(fit, 250); // banners settling in above it
    return () => {
      window.removeEventListener("resize", fit);
      clearTimeout(id);
      if (el) el.style.height = "";
    };
  }, [withId, error, loadingThread, loadingList, listQuery]);

  const openConversation = (userId) => setSearchParams({ with: userId });
  const backToList = () => setSearchParams({});

  return (
    <main className="flex-1 min-w-0">
      {/* Hidden on mobile once a thread is open -- reclaims the vertical
          space this heading takes so the composer at the bottom of the
          chat card doesn't get pushed below the fold on short viewports
          (see the `dvh`, not `vh`, comment below for the other half of
          this fix). */}
      <div className={`${withId ? "hidden sm:block" : ""} mb-4`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Messages</h1>
            <p className="text-sm text-slate-500">Direct conversations with other physios.</p>
          </div>
          {/* New message (2026-09-23, spec item 8). Until now a conversation
              could only be started from somebody's profile -- there was no
              way in from the inbox itself. */}
          <button
            type="button"
            onClick={() => { setComposeOpen(true); setComposeQuery(""); }}
            aria-label="New message"
            className="shrink-0 p-2 rounded-lg border border-slate-200 text-[#3E7BFA] hover:bg-slate-50"
          >
            <PenSquare size={17} />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search conversations…"
            className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
          />
          {listQuery && (
            <button type="button" onClick={() => setListQuery("")} aria-label="Clear search" className="shrink-0 text-slate-400 hover:text-slate-600"><X size={14} /></button>
          )}
        </div>
      </div>

      {/* `dvh` (dynamic viewport height), not `vh` -- on mobile browsers
          `vh` is measured against the viewport WITH the address bar
          collapsed, so a `vh`-based height plus this page's header/banner
          chrome above it routinely pushed the message input below the
          visible fold with no visual hint there was more content to
          scroll to. `dvh` tracks the actually-visible viewport instead. */}
      <div
        ref={cardRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex"
      >
        {/* Conversation list -- hidden on mobile once a thread is open */}
        <div className={`${withId ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 shrink-0 border-r border-slate-100 overflow-y-auto`}>
          {loadingList ? (
            <p className="text-sm text-slate-400 p-4">Loading…</p>
          ) : allConversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={26} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Start a professional conversation</p>
              <p className="text-xs text-slate-400 mt-1">Message a physio from their profile, or use the new-message button above.</p>
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-400">No conversations match &ldquo;{listQuery.trim()}&rdquo;.</p>
            </div>
          ) : (
            visibleConversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c.userId)}
                className={`flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none ${withId === c.userId ? "bg-[#F5F9FF]" : ""}`}
              >
                <Avatar size={40} grad={c.gradient} initials={c.initials} photoUrl={c.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className={`text-sm truncate flex items-center gap-1.5 flex-1 ${c.unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                      {c.name}
                      {c.isDemo && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5">Demo</span>}
                    </p>
                    {/* Time and designation (2026-09-23): getConversations()
                        has returned `role` and `lastAt` all along, the row
                        just never showed either. */}
                    <span className="shrink-0 text-[10.5px] text-slate-400">{inboxTime(c.lastAt)}</span>
                  </div>
                  {c.role && <p className="text-[11px] text-slate-400 truncate">{c.role}</p>}
                  <p className={`text-xs truncate ${c.unread ? "text-slate-700 font-medium" : "text-slate-400"}`}>{c.lastText}</p>
                </div>
                {c.unread > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EAF1FF] text-[#2B5FD9] text-[10px] font-bold flex items-center justify-center" aria-label={`${c.unread} unread`}>
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    {active?.name || "Conversation"}
                    {active?.isDemo && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5">Demo</span>}
                  </p>
                  {/* Designation under the name (2026-09-23), falling back
                      to the "Re: <opportunity>" line the recruiter threads
                      use -- both are context about who you're talking to. */}
                  {active?.regarding
                    ? <p className="text-[11px] text-slate-400 truncate">Re: {active.regarding}</p>
                    : active?.role ? <p className="text-[11px] text-slate-400 truncate">{active.role}</p> : null}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loadingThread ? (
                  <p className="text-sm text-slate-400">Loading…</p>
                ) : thread.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center mt-6">Say hello to start the conversation.</p>
                ) : (
                  thread.map((m, i) => {
                    // Day separator above the first message of each day
                    // (2026-09-23). Demo/system rows carry no createdAt, so
                    // they never trigger one.
                    const prev = thread[i - 1];
                    const showDay = !!m.createdAt && (!prev?.createdAt || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString());
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{dayLabel(m.createdAt)}</span>
                          </div>
                        )}
                        {m.system ? (
                          <div className="flex justify-center">
                            <span className="text-[11px] font-semibold text-[#2B5FD9] bg-[#EAF1FF] px-3 py-1.5 rounded-full">{m.text}</span>
                          </div>
                        ) : (
                          <div className={`flex flex-col ${m.isSelf ? "items-end" : "items-start"}`}>
                            <span className={`max-w-[75%] text-sm px-3 py-2 rounded-2xl whitespace-pre-wrap break-words ${m.isSelf ? "bg-[#EAF1FF] text-slate-900" : "bg-slate-100 text-slate-700"}`}>{m.text}</span>
                            {m.createdAt && <span className="text-[10px] text-slate-400 mt-0.5 px-1">{messageTime(m.createdAt)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {error && <p className="px-4 text-xs text-rose-600 pb-1">{error}</p>}
              {limitReached ? (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 flex-1">
                    You've sent {MESSAGE_LIMIT_IF_NOT_CONNECTED} messages to {active?.name || "this person"} without connecting.
                  </p>
                  <button
                    onClick={() => connectWith(withId).catch(() => {})}
                    disabled={connectionStates[withId] === "pending_sent"}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {connectionStates[withId] === "pending_sent" ? "Pending" : "Connect"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="Type a message…"
                    className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent px-2"
                  />
                  <button onClick={submit} disabled={!text.trim() || sending} aria-label="Send message" className="text-[#3E7BFA] disabled:text-slate-300 p-1.5">
                    <Send size={17} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New-message picker (2026-09-23, spec item 8). Deliberately a plain
          people list, not a second search surface: picking someone just
          opens their thread via the same ?with= the rest of this page uses,
          so nothing is written until an actual message is sent. */}
      {composeOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4" onClick={() => setComposeOpen(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[70dvh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-bold text-slate-900">New message</h2>
              <button type="button" onClick={() => setComposeOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
            </div>
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={composeQuery}
                  onChange={(e) => setComposeQuery(e.target.value)}
                  placeholder="Search physios…"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="overflow-y-auto px-2 pb-5">
              {composeCandidates.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 px-5">
                  {composeQuery.trim() ? `Nobody matches "${composeQuery.trim()}".` : "You already have a conversation with everyone here."}
                </p>
              ) : composeCandidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setComposeOpen(false); openConversation(String(p.id)); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left"
                >
                  <Avatar size={38} grad={p.grad} initials={initialsOf(p.name)} photoUrl={p.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    {(p.role || p.location) && <p className="text-xs text-slate-400 truncate">{[p.role, p.location].filter(Boolean).join(" · ")}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
