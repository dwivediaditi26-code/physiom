import { useState } from "react";
import { Search } from "lucide-react";
import PersonCard from "../components/people/PersonCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

export default function PeoplePage() {
  const { people } = useAppData();
  const [query, setQuery] = useState("");
  const filtered = people.filter((p) => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()) || p.role.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">People</h1>
        <p className="text-sm text-slate-500">Physiotherapists across the PhysioFeed network.</p>
      </div>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-5">
        <Search size={16} className="text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{filtered.map((p) => <PersonCard key={p.id} person={p} />)}</div>
    </main>
  );
}
