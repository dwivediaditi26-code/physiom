import { ClipboardList } from "lucide-react";

export default function ComingSoonPage({ title, note }) {
  return (
    <main className="flex-1 min-w-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
          <ClipboardList size={22} className="text-violet-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">{note}</p>
      </div>
    </main>
  );
}
