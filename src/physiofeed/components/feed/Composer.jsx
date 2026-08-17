import { useState } from "react";
import { X, Image as ImageIcon, Video, FlaskConical } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

const CATEGORIES = ["Techniques", "Case Studies", "Research", "Education"];

export default function Composer() {
  const { composerOpen, setComposerOpen, publishPost, profile } = useAppData();
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  if (!profile) return null;

  if (!composerOpen) {
    return (
      <button
        onClick={() => setComposerOpen(true)}
        className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 text-left hover:border-violet-200 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <Avatar size={36} grad={profile.gradient} initials={profile.initials} />
        <span className="text-sm text-slate-400">Share a clinical tip, case, or research with the community…</span>
      </button>
    );
  }

  const submit = () => {
    if (!text.trim()) return;
    publishPost({ text: text.trim(), category });
    setText("");
    setComposerOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar size={36} grad={profile.gradient} initials={profile.initials} />
        <span className="text-sm font-semibold text-slate-900">{profile.name}</span>
        <button onClick={() => setComposerOpen(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X size={18} /></button>
      </div>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder="What are you seeing in clinic this week?" rows={3}
        className="w-full resize-none text-sm text-slate-700 placeholder:text-slate-400 outline-none"
      />
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"><ImageIcon size={18} /></button>
          <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"><Video size={18} /></button>
          <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"><FlaskConical size={18} /></button>
        </div>
        <button onClick={submit} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">Post</button>
      </div>
    </div>
  );
}
