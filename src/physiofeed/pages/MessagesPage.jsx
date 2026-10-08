import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, ChevronLeft, MessageSquare, Lock, Search, PenSquare, X, Check, ShieldOff, Flag } from "lucide-react";
import Avatar from "../components/shared/Avatar.jsx";
import { initialsOf } from "../components/shared/constants.js";
import ReportUserModal from "../components/shared/ReportUserModal.jsx";
import * as db from "../data/db.js";
import { useDemoConversations } from "../context/DemoConversationsContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Direct messages between clinicians (Aditi's request: "chat area to
// message the physios"). See supabase/add_direct_messages.sql for the
// original schema and supabase/add_conversations_and_blocks.sql for the
// request/accept/decline/block state machine -- both run once, required
// for this feature to work. The 3-message cap, blocking, and the decline
// cooldown are all enforced server-side now (see db.js's sendMessage());
// this page just renders whatever state the database hands back and
// calls the matching RPC for each action.
//
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

function cooldownLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d <= new Date()) return "";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const withId = searchParams.get("with");
  const demo = useDemoConversations();
  const { connectionStates, connectWith, refreshUnreadMessages, people } = useAppData();

  const [tab, setTab] = useState("primary"); // 'primary' | 'requests'
  const [primary, setPrimary] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  // The open thread's own conversation row -- separate from the inbox
  // lists because you can open a Message button on someone you've never
  // messaged (no conversation row exists yet, so it's in neither list).
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [requestActionError, setRequestActionError] = useState(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  // Inbox search + "new message" picker (2026-09-23, Aditi's messaging
  // spec). Both are inbox-only state; which conversation is OPEN stays in
  // the URL, as before.
  const [listQuery, setListQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
  const scrollRef = useRef(null);
  const cardRef = useRef(null);
  const composerRef = useRef(null);

  // Compose box grows with the message instead of scrolling sideways in a
  // single line (2026-09-23, Aditi: "we have the freedom to edit the
  // message" before sending -- Enter still sends, Shift+Enter for a new
  // line, same as every other chat app). Capped at ~5 lines via the
  // max-h-32/overflow-y-auto on the element itself; this just keeps the
  // scrollHeight measurement in sync as text changes.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const loadInbox = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([db.getInbox("primary"), db.getInbox("requests")]);
      setPrimary(p);
      setRequests(r);
    } catch (e) {
      setError(e.message || "Couldn't load your messages.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // Loads the open thread's own conversation-state row. Checked against
  // the already-loaded inbox lists first (no extra round trip for the
  // common case of opening something already in Primary/Requests); a
  // Message button on someone with no conversation yet falls through to
  // getConversationWith(), which returns a "none" shape safely.
  useEffect(() => {
    if (!withId) { setActiveConv(null); return; }
    const known = [...primary, ...requests].find((c) => String(c.userId) === String(withId));
    if (known) { setActiveConv(known); return; }
    if (demo.hasThread(withId)) { setActiveConv(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const cw = await db.getConversationWith(withId);
        // getConversationWith() only knows the pair's message-request
        // state, not the other person's name/photo -- that's a fresh
        // thread (opened via a profile's Message button before any
        // message exists, so it's in neither inbox list yet). `people`
        // already has everyone's profile summary loaded for the compose
        // picker; reuse it instead of a third fetch.
        const person = (people || []).find((p) => String(p.id) === String(withId));
        if (!cancelled) {
          setActiveConv({
            userId: withId, ...cw,
            name: person?.name, role: person?.role,
            gradient: person?.grad, avatarUrl: person?.avatarUrl,
            initials: person?.name ? initialsOf(person.name) : "?",
          });
        }
      } catch { /* leave null -- composer just won't show a limit/blocked notice */ }
    })();
    return () => { cancelled = true; };
  }, [withId, primary, requests, demo, people]);

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
        if (!cancelled) { loadInbox(); refreshUnreadMessages(); }
      } catch (e) {
        if (!cancelled) setError(e.message || "Couldn't load this conversation.");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => { cancelled = true; };
  }, [withId, loadInbox, demo, refreshUnreadMessages]);

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
        // (new last-message preview / unread dot / request card), whether
        // or not its thread happens to be the one currently open.
        loadInbox();
        const openWith = withIdRef.current;
        if (!openWith || (row.sender_id !== openWith && row.recipient_id !== openWith)) return;
        // Within the open thread: recipient_id === me means I sent it
        // (already appended optimistically by submit()'s own setThread
        // call) -- guard on id to avoid appending our own message twice.
        setThread((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { id: row.id, text: row.text, isSelf: row.recipient_id === openWith, createdAt: row.created_at }]));
        if (row.sender_id === openWith) db.markConversationRead(openWith).then(() => { loadInbox(); refreshUnreadMessages(); });
      });
      if (cancelled) unsubscribe();
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, [loadInbox, refreshUnreadMessages]);

  // Same shape as the messages subscription above, for the conversation
  // row itself -- a request getting accepted/declined, or a new round
  // starting after a cooldown, should update the open thread's banner and
  // move it between Primary/Requests without a manual refresh.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    (async () => {
      unsubscribe = await db.subscribeToConversations(() => { if (!cancelled) loadInbox(); });
      if (cancelled) unsubscribe();
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, [loadInbox]);

  // Merges the real (Supabase) Primary list with DemoConversationsContext's
  // list so a "Chat / Invite" thread keeps showing up here, not just
  // inside ApplicantChatModal's one-off popup (2026-09-22, Aditi: "the
  // message conversation chat should always show here").
  const allPrimary = useMemo(
    () => [...demo.list, ...primary].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)),
    [demo.list, primary]
  );
  const listForTab = tab === "primary" ? allPrimary : requests;
  const active =
    (withId && [...allPrimary, ...requests].find((c) => String(c.userId) === String(withId))) ||
    activeConv || null;

  // Search the inbox by person (2026-09-23, spec item 7). Name and
  // designation both, since "the sports physio in Bhopal" is as likely a
  // way to look someone up as their name.
  const visibleList = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return listForTab;
    return listForTab.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.role || "").toLowerCase().includes(q)
    );
  }, [listForTab, listQuery]);

  // "New message": anyone real you aren't already talking to. Demo
  // recruiter threads are excluded -- they aren't people you can start a
  // conversation with.
  const composeCandidates = useMemo(() => {
    const already = new Set([...allPrimary, ...requests].map((c) => String(c.userId)));
    const q = composeQuery.trim().toLowerCase();
    return (people || [])
      .filter((p) => !already.has(String(p.id)))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q));
  }, [people, allPrimary, requests, composeQuery]);

  // Blocked either direction: no composer at all, matches the profile
  // page's own "no message" rule for a blocked pair.
  const isBlocked = !active?.isDemo && (active?.blockedByMe || active?.blockedByThem);
  const status = active?.status || "none";
  // requestInitiatorId is always either me or the other party in a 1:1
  // conversation, so "not them" is enough to know it's me -- works whether
  // `active` came from getInbox() (which also has requestDirection) or the
  // getConversationWith() fallback for a thread with no inbox row yet
  // (which doesn't).
  const iAmInitiator = !!active?.requestInitiatorId && String(active.requestInitiatorId) !== String(withId);
  const sentThisRound = active?.messagesSentThisRound ?? 0;
  const isIncomingRequest = !active?.isDemo && status === "request_pending" && !iAmInitiator;
  const limitReached = !active?.isDemo && status === "request_pending" && iAmInitiator && sentThisRound >= 3;
  const isDeclinedClosed = !active?.isDemo && status === "declined";

  const submit = async () => {
    if (!text.trim() || sending || !withId || limitReached || isBlocked) return;
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
      loadInbox();
    } catch (e) {
      setError(e.message || "Couldn't send that message -- please try again.");
    } finally {
      setSending(false);
    }
  };

  const runRequestAction = async (fn) => {
    if (requestBusy) return;
    setRequestBusy(true);
    setRequestActionError(null);
    try {
      await fn();
      await loadInbox();
    } catch (e) {
      setRequestActionError(e.message || "Couldn't do that -- please try again.");
    } finally {
      setRequestBusy(false);
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
    // The on-screen keyboard (iPhone) shrinks the viewport while you type;
    // the card measured itself then and stayed small after the keyboard
    // closed, leaving a big empty gap under the chat (Aditi, 2026-10-04:
    // "its not scrolling after messaging"). Phones announce keyboard
    // open/close through visualViewport (and focusout), not always through
    // window "resize", so re-measure on all of them, and after a short wait
    // because the viewport keeps changing while the keyboard animates.
    const vv = window.visualViewport;
    const refitSoon = () => { fit(); setTimeout(fit, 120); setTimeout(fit, 400); };
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", refitSoon);
    document.addEventListener("focusout", refitSoon);
    vv?.addEventListener("resize", refitSoon);
    const id = setTimeout(fit, 250); // banners settling in above it
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", refitSoon);
      document.removeEventListener("focusout", refitSoon);
      vv?.removeEventListener("resize", refitSoon);
      clearTimeout(id);
      if (el) el.style.height = "";
    };
  }, [withId, error, loadingThread, loadingList, listQuery, tab, thread.length]);

  const openConversation = (userId) => setSearchParams({ with: userId });
  const backToList = () => setSearchParams({});

  const requestsCount = requests.filter((c) => c.requestDirection === "incoming").length;

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
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-3">
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
        {/* Primary / Requests -- Primary is "conversations allowed to
            continue" (connections AND accepted non-connections alike), not
            "connections only". Requests holds anything still pending
            either direction, plus a declined thread but only for whoever
            sent it. */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => { setTab("primary"); backToList(); }}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${tab === "primary" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Primary
          </button>
          <button
            onClick={() => { setTab("requests"); backToList(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition ${tab === "requests" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Requests
            {requestsCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{requestsCount}</span>
            )}
          </button>
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
          ) : listForTab.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={26} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{tab === "primary" ? "Start a professional conversation" : "No message requests"}</p>
              <p className="text-xs text-slate-400 mt-1">
                {tab === "primary" ? "Message a physio from their profile, or use the new-message button above." : "Requests from people you're not connected with will show up here."}
              </p>
            </div>
          ) : visibleList.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-400">No conversations match &ldquo;{listQuery.trim()}&rdquo;.</p>
            </div>
          ) : (
            visibleList.map((c) => (
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
                    <span className="shrink-0 text-[10.5px] text-slate-400">{inboxTime(c.lastAt)}</span>
                  </div>
                  {c.role && <p className="text-[11px] text-slate-400 truncate">{c.role}</p>}
                  {tab === "requests" ? (
                    <p className="text-xs truncate text-slate-500">
                      {c.status === "declined" ? "Closed" : c.requestDirection === "incoming" ? (c.lastText || "Sent you a message request") : `Waiting for reply · ${c.messagesSentThisRound ?? 0} of 3 sent`}
                    </p>
                  ) : (
                    <p className={`text-xs truncate ${c.unread ? "text-slate-700 font-medium" : "text-slate-400"}`}>{c.lastText}</p>
                  )}
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    {active?.name || "Conversation"}
                    {active?.isDemo && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5">Demo</span>}
                  </p>
                  {active?.regarding
                    ? <p className="text-[11px] text-slate-400 truncate">Re: {active.regarding}</p>
                    : active?.role ? <p className="text-[11px] text-slate-400 truncate">{active.role}</p> : null}
                </div>
                {!active?.isDemo && withId && (
                  <button
                    onClick={() => setReporting(true)}
                    aria-label={`Report ${active?.name || "this person"}`}
                    className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                  >
                    <Flag size={14} />
                  </button>
                )}
              </div>

              {/* Incoming request banner (spec: Accept/Decline/Block/Report
                  live here AND in the Requests list row -- replying also
                  accepts, per spec section 13, so the composer below stays
                  open the whole time rather than being replaced by this). */}
              {isIncomingRequest && (
                <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/60">
                  <p className="text-xs text-amber-800 mb-2">
                    <span className="font-semibold">{active?.name}</span> wants to message you. Accept to reply, or decline to close this request.
                  </p>
                  {requestActionError && <p className="text-xs text-rose-600 mb-2">{requestActionError}</p>}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => runRequestAction(() => db.acceptMessageRequest(active.conversationId))}
                      disabled={requestBusy}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      onClick={() => runRequestAction(() => db.declineMessageRequest(active.conversationId))}
                      disabled={requestBusy}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                    >
                      <X size={13} /> Decline
                    </button>
                    <button
                      onClick={() => runRequestAction(() => db.blockUser(withId))}
                      disabled={requestBusy}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-60 ml-auto"
                    >
                      <ShieldOff size={13} /> Block
                    </button>
                  </div>
                </div>
              )}

              {/* Outgoing pending, under the limit -- "N of 3" notice.
                  Composer stays open below this. */}
              {!active?.isDemo && status === "request_pending" && !isIncomingRequest && !limitReached && sentThisRound > 0 && (
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs text-slate-500">
                    {active.name} hasn't replied yet -- {sentThisRound} of 3 messages sent before they need to accept.
                  </p>
                </div>
              )}

              {/* Declined -- neutral "closed" notice, no detail about what
                  the other person did. Composer stays enabled: sending
                  again after the cooldown starts a fresh request round
                  server-side (MSG_COOLDOWN surfaces as a normal send error
                  if it's tried too early). */}
              {isDeclinedClosed && (
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs text-slate-500">
                    This conversation is closed.{cooldownLabel(active?.cooldownUntil) ? ` You can send a new request after ${cooldownLabel(active.cooldownUntil)}.` : ""}
                  </p>
                </div>
              )}

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
              {isBlocked ? (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <ShieldOff size={14} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 flex-1">
                    {active?.blockedByMe ? "You've blocked this person -- unblock them from their profile to message again." : "You can't message this person."}
                  </p>
                </div>
              ) : limitReached ? (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 flex-1">
                    You've sent 3 messages to {active?.name || "this person"} without a reply. Wait for them to accept, or connect instead.
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
                <div className="flex items-end gap-2 px-3 py-2.5 border-t border-slate-100">
                  <textarea
                    ref={composerRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Type a message… (Shift+Enter for a new line)"
                    rows={1}
                    className="flex-1 text-sm outline-none resize-none placeholder:text-slate-400 bg-transparent px-2 py-1.5 max-h-32 overflow-y-auto leading-normal"
                  />
                  <button onClick={submit} disabled={!text.trim() || sending} aria-label="Send message" className="text-[#3E7BFA] disabled:text-slate-300 p-1.5 shrink-0">
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
                  onClick={() => { setComposeOpen(false); setTab("primary"); openConversation(String(p.id)); }}
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

      {reporting && active && (
        <ReportUserModal
          name={active.name}
          onClose={() => setReporting(false)}
          onSubmit={(reason) => db.reportUser(withId, reason, { conversationId: active.conversationId })}
        />
      )}
    </main>
  );
}
