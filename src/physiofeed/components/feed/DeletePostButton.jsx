import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";

// Added 2026-08-18. Shown only on your OWN posts (post.isSelf) -- mirrors
// ReportButton's one-menu-click pattern, but deletes instead of reports.
// Deleting is permanent (posts_delete_own RLS has no undo), so it takes
// one extra tap past opening the menu ("Delete post" -> "Tap again to
// confirm") instead of firing on the very first click.
export default function DeletePostButton({ postId }) {
  const { deletePost } = useAppData();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const toggleOpen = () => {
    setOpen((o) => !o);
    setConfirming(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Post options"
        aria-expanded={open}
        className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20">
          <button
            onClick={async () => {
              if (!confirming) { setConfirming(true); return; }
              setOpen(false);
              setConfirming(false);
              await deletePost(postId);
            }}
            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={13} /> {confirming ? "Tap again to confirm" : "Delete post"}
          </button>
        </div>
      )}
    </div>
  );
}
