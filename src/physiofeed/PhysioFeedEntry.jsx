import { MemoryRouter } from "react-router-dom";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import PhysioFeedRoutes from "./PhysioFeedRoutes.jsx";
import "./physiofeed.css";

// Entry point for the PhysioFeed tab. Uses MemoryRouter (an in-memory
// history stack), not BrowserRouter -- physiom already manages the real
// browser URL/back-button itself (see navTo() in AppFull.jsx, which calls
// window.history.pushState directly). A second router driving the real URL
// would fight with that; MemoryRouter keeps PhysioFeed's own Feed/Explore/
// People/Communities/Evidence/Saved/Profile navigation fully self-contained
// and invisible to the browser's address bar and back button.
export default function PhysioFeedEntry() {
  return (
    <MemoryRouter initialEntries={["/feed"]}>
      <AppDataProvider>
        <PhysioFeedRoutes/>
      </AppDataProvider>
    </MemoryRouter>
  );
}
