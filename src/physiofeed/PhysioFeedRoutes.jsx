import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import EvidencePage from "./pages/EvidencePage.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";
import CommunitiesPage from "./pages/CommunitiesPage.jsx";
import PeoplePage from "./pages/PeoplePage.jsx";
import SavedPage from "./pages/SavedPage.jsx";
import AdminReportsPage from "./pages/AdminReportsPage.jsx";

// The original version of this file also had stub routes (/dashboard,
// /patients, /assessments, /ai, /soap, /exercises, /programs, /analytics)
// pointing at a generic ComingSoonPage -- those existed for a version of
// this app that was its own top-level shell. Inside physiom, all of those
// screens already exist for real (Home/Clinical tabs), and nothing links to
// these stub paths anymore, so they were dropped rather than left as dead
// routes to nowhere.
export default function PhysioFeedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </AppShell>
  );
}
