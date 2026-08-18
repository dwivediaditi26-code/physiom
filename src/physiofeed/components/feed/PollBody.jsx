import { BarChart3, Check } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";

// Renders a post created via PollComposer.jsx. Before voting: clickable
// option buttons. After voting (post.poll.myVote is not null, set by
// db.js's getPosts()/votePoll()): result bars, own choice highlighted.
// Votes are final in V1 (see supabase/add_content_types.sql) -- there's no
// "change your vote" affordance here on purpose.
export default function PollBody({ post }) {
  const { votePoll } = useAppData();
  const poll = post.poll;
  if (!poll) return null;
  const voted = poll.myVote !== null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <BarChart3 size={13} className="text-violet-600" />
        <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Poll</span>
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-3">{post.heading}</h3>

      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const count = poll.counts[i] || 0;
          const pct = poll.total > 0 ? Math.round((count / poll.total) * 100) : 0;
          const mine = poll.myVote === i;
          if (!voted) {
            return (
              <button
                key={i}
                onClick={() => votePoll(post.id, i)}
                className="w-full text-left text-sm font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-2 hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
              >
                {opt}
              </button>
            );
          }
          return (
            <div key={i} className="relative rounded-lg border border-slate-200 overflow-hidden">
              <div className={`absolute inset-y-0 left-0 ${mine ? "bg-violet-100" : "bg-slate-50"}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={`text-sm font-medium flex items-center gap-1.5 ${mine ? "text-violet-700" : "text-slate-600"}`}>
                  {mine && <Check size={13} />} {opt}
                </span>
                <span className="text-xs font-semibold text-slate-500">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">{poll.total} vote{poll.total === 1 ? "" : "s"}</p>
    </div>
  );
}
