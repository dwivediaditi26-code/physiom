import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, ChevronLeft } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { Icon } from "../shared/icons.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function Header() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, profile } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto flex items-center gap-4 px-4 sm:px-6 h-16">
        {location.pathname !== "/feed" && (
          <button onClick={() => navigate(-1)} className="md:hidden p-1 -ml-1 text-slate-500">
            <ChevronLeft size={22} />
          </button>
        )}
        <Link to="/feed" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600" />
          <div className="hidden sm:block leading-tight">
            <p className="font-bold text-slate-900 text-sm">PhysioFeed</p>
            <p className="text-[10px] text-slate-400 -mt-0.5">Stronger Together</p>
          </div>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-9">
          <Search size={15} className="text-slate-400" />
          <input placeholder="Search posts, people, topics…" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-slate-50 focus:outline-none">
              <Bell size={19} className="text-slate-500" />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-30">
                <p className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notifications</p>
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-slate-50">
                    <Icon name={n.iconName} size={16} className={`mt-0.5 shrink-0 ${n.tone}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.time} ago</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="hidden sm:block p-2 rounded-lg hover:bg-slate-50"><MessageSquare size={19} className="text-slate-500" /></button>
          {profile && (
            <Link to="/profile" className="hidden sm:flex items-center gap-2 focus:outline-none">
              <Avatar size={32} grad={profile.gradient} initials={profile.initials} />
              <div className="leading-tight text-left">
                <p className="text-xs font-semibold text-slate-900">{profile.name.replace(", PT", "")}</p>
                <p className="text-[10px] text-slate-400">Physiotherapist</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
