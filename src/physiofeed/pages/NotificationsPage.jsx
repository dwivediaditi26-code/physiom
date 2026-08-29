import { useNavigate } from "react-router-dom";
import { Icon } from "../components/shared/icons.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Own page instead of a header dropdown (2026-08-27, Aditi's request: "it
// should have its own page" -- the dropdown panel had a bug where it
// wouldn't close reliably, especially once it moved into the horizontally-
// scrolling mobile strip. A real /notifications route sidesteps that whole
// class of bug: there's no open/closed state or outside-click handling to
// get wrong, just normal navigation.
export default function NotificationsPage() {
  const { notifications, markNotificationRead } = useAppData();
  const navigate = useNavigate();

  const openNotification = (n) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Notifications</h1>
        <p className="text-sm text-slate-500">Likes, comments, and follows from the PhysioFeed community.</p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No notifications yet.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left focus:outline-none ${!n.read ? "bg-violet-50/60" : ""}`}
            >
              <Icon name={n.iconName} size={18} className={`mt-0.5 shrink-0 ${n.tone}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug ${n.read ? "text-slate-700" : "text-slate-900 font-medium"}`}>{n.text}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.time} ago</p>
              </div>
              {!n.read && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-violet-600" aria-label="Unread" />}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
