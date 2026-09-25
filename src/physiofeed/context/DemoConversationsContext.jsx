import { createContext, useCallback, useContext, useMemo, useState } from "react";

const DemoConversationsContext = createContext(null);

// A small, local-only conversation store for the Opportunities board's
// poster-side "Chat / Invite" (2026-09-22, Aditi's follow-up: "the message
// conversation chat should always show here" -- pointing at the real
// Messages tab). The real inbox (db.js's getConversations/sendMessage) is
// hard-wired to Supabase's `direct_messages` + `profiles` tables and
// throws if you're signed out or the recipient isn't a real account --
// applicants on the demo board have no account to message, so writing into
// that table isn't possible. This mirrors the
// same shape locally and MessagesPage.jsx merges it into the real list,
// clearly tagged as demo, so a conversation started from ApplicantChatModal
// keeps showing up there instead of only living inside the one-off popup.
export function DemoConversationsProvider({ children }) {
  // threadsById: { [contactId]: { contact: {id,name,initials,gradient,headline,regarding}, messages: [{id,isSelf,system,text,createdAt}] } }
  const [threadsById, setThreadsById] = useState({});

  const appendMessage = useCallback((contact, text, { system = false } = {}) => {
    setThreadsById((prev) => {
      const existing = prev[contact.id];
      const messages = existing?.messages || [];
      const msg = { id: `dm-${contact.id}-${messages.length + 1}`, isSelf: !system, system, text, createdAt: new Date().toISOString() };
      return { ...prev, [contact.id]: { contact: { ...existing?.contact, ...contact }, messages: [...messages, msg] } };
    });
  }, []);

  const sendMessage = useCallback((contact, text) => appendMessage(contact, text), [appendMessage]);
  const addSystemMessage = useCallback((contact, text) => appendMessage(contact, text, { system: true }), [appendMessage]);

  const list = useMemo(() => {
    return Object.values(threadsById)
      .map(({ contact, messages }) => {
        const lastReal = [...messages].reverse().find((m) => !m.system);
        return {
          userId: contact.id,
          name: contact.name,
          role: contact.headline || "",
          gradient: contact.gradient || "violet",
          initials: contact.initials || "?",
          avatarUrl: null,
          lastText: lastReal?.text || messages[messages.length - 1]?.text || "",
          lastAt: messages[messages.length - 1]?.createdAt || new Date(0).toISOString(),
          unread: 0,
          regarding: contact.regarding,
          isDemo: true,
        };
      })
      .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  }, [threadsById]);

  const getMessages = useCallback((contactId) => threadsById[contactId]?.messages || [], [threadsById]);
  const hasThread = useCallback((contactId) => !!threadsById[contactId], [threadsById]);

  const value = useMemo(() => ({ list, getMessages, hasThread, sendMessage, addSystemMessage }), [list, getMessages, hasThread, sendMessage, addSystemMessage]);

  return <DemoConversationsContext.Provider value={value}>{children}</DemoConversationsContext.Provider>;
}

export function useDemoConversations() {
  return useContext(DemoConversationsContext);
}
