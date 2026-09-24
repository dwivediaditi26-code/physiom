import { useState } from "react";
import { Send, Trash2, CornerDownRight, Sparkles, Lock, Unlock } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

function Entry({ entry, isReply, isOwner, onReplyClick, onDelete }) {
  return (
    <div className={`flex items-start gap-2 group ${isReply ? "mt-2" : ""}`}>
      <Avatar size={isReply ? 26 : 32} grad={entry.authorGradient} initials={initialsOf(entry.author)} photoUrl={entry.authorAvatarUrl} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">{entry.author}</span>
          {/* Who asked the original question (2026-09-23) -- once several
              people are answering, it's easy to lose track of which
              participant is the discussion's own author. Skipped on a
              Case/Final Update tag since that already implies ownership --
              showing both would be redundant clutter on the same line. */}
          {isOwner && !entry.isCaseUpdate && !entry.isFinalUpdate && (
            <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-1.5 py-0.5">
              Asked this
            </span>
          )}
          {(entry.isCaseUpdate || entry.isFinalUpdate) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
              <Sparkles size={9} /> {entry.isFinalUpdate ? "Final Update" : "Case Update"}
            </span>
          )}
          <span className="text-xs text-slate-400">{entry.time}</span>
        </div>
        <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line mt-1">{entry.text}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {!isReply && (
            <button onClick={onReplyClick} className="text-xs font-medium text-slate-400 hover:text-violet-600">Reply</button>
          )}
          {entry.isSelf && (
            <button onClick={onDelete} aria-label="Delete" className="text-xs font-medium text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 focus:opacity-100">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Replaces FeedPostCard.jsx's flat comment-list-plus-composer block, only
// for postType === "discussion" (2026-09-23, Aditi's brief). Answers and
// case/final updates are the SAME flat `comments` rows (parentId === null)
// rendered inline in one chronological timeline -- a "Case Update" is
// visually tagged, not a separate stage/page, matching "the therapist
// reveals information naturally as the conversation develops" rather than
// a multi-step wizard. Replies are one level deep (enforced by the
// comments_insert_own RLS policy in add_clinical_discussions.sql, not just
// this UI).
export default function DiscussionThread({ post }) {
  const { commentOnPost, deleteComment, closeDiscussion, profile } = useAppData();
  const [answerText, setAnswerText] = useState("");
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [markFinal, setMarkFinal] = useState(false);

  const closed = !!post.discussion?.closed;
  const topLevel = post.commentList.filter((c) => !c.parentId);
  const repliesOf = (id) => post.commentList.filter((c) => c.parentId === id);

  const submitAnswer = () => {
    if (!answerText.trim()) return;
    commentOnPost(post.id, answerText.trim());
    setAnswerText("");
  };

  const submitReply = (parentId) => {
    if (!replyText.trim()) return;
    commentOnPost(post.id, replyText.trim(), { parentCommentId: parentId });
    setReplyText("");
    setReplyOpenId(null);
  };

  const submitUpdate = () => {
    if (!updateText.trim()) return;
    commentOnPost(post.id, updateText.trim(), { isCaseUpdate: !markFinal, isFinalUpdate: markFinal });
    setUpdateText("");
    setMarkFinal(false);
    setAddUpdateOpen(false);
  };

  return (
    <div>
      {topLevel.length > 0 && (
        <div className="mt-3 space-y-3">
          {topLevel.map((entry) => (
            <div key={entry.id}>
              <Entry entry={entry} isOwner={entry.authorId === post.authorId} onReplyClick={() => setReplyOpenId(replyOpenId === entry.id ? null : entry.id)} onDelete={() => deleteComment(post.id, entry.id)} />
              {repliesOf(entry.id).map((r) => (
                <div key={r.id} className="ml-8 flex items-start gap-1">
                  <CornerDownRight size={12} className="text-slate-300 mt-2 shrink-0" />
                  <Entry entry={r} isReply isOwner={r.authorId === post.authorId} onDelete={() => deleteComment(post.id, r.id)} />
                </div>
              ))}
              {replyOpenId === entry.id && (
                <div className="ml-8 flex items-center gap-2 mt-1.5">
                  <input
                    value={replyText} onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitReply(entry.id)}
                    placeholder={`Reply to ${entry.author}…`} autoFocus
                    className="flex-1 text-xs outline-none placeholder:text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5"
                  />
                  <button onClick={() => submitReply(entry.id)} disabled={!replyText.trim()} className="text-violet-600 disabled:text-slate-300"><Send size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {post.isSelf && !closed && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {addUpdateOpen ? (
            <div>
              <textarea
                value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={2} autoFocus
                placeholder="Share what's changed -- new findings, reassessment, anything worth adding…"
                className="w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 resize-none"
              />
              <div className="flex items-center justify-between mt-1.5">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
                  <input type="checkbox" checked={markFinal} onChange={(e) => setMarkFinal(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600" />
                  Mark as final update
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAddUpdateOpen(false); setUpdateText(""); setMarkFinal(false); }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  <button onClick={submitUpdate} disabled={!updateText.trim()} className="text-xs font-semibold text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40">Post update</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddUpdateOpen(true)} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">+ Add Update</button>
          )}
        </div>
      )}

      {post.isSelf && (
        <button
          onClick={() => closeDiscussion(post.id, !closed)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 mt-2.5"
        >
          {closed ? <><Unlock size={11} /> Reopen discussion</> : <><Lock size={11} /> Close discussion</>}
        </button>
      )}

      {closed ? (
        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">This discussion is closed.</p>
      ) : (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <Avatar size={26} grad={profile?.gradient} initials={profile?.initials} photoUrl={profile?.avatarUrl} />
          <input
            value={answerText} onChange={(e) => setAnswerText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            placeholder="Write an answer…" className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
          />
          <button onClick={submitAnswer} disabled={!answerText.trim()} className="text-[#DB2777] disabled:text-slate-300"><Send size={16} /></button>
        </div>
      )}
    </div>
  );
}
