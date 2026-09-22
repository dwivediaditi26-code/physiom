import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Every PhysioFeed screen shares the one outer scroll container (<body> --
// see AppFull.jsx's navTo(), which resets scroll the same way when
// switching INTO the PhysioFeed tab from Home/Clinical/Learn/Profile).
// That reset only covers entering the tab -- navigating *within* it
// (Feed -> Explore -> a person's profile, etc. via the section nav or a
// card/button) left the new screen scrolled to wherever the previous one
// had been (2026-09-22, Aditi: "when I click on any button it takes me to
// the midsection... I want it to take me to the top"). Mirrors navTo()'s
// exact reset for consistency rather than inventing a second approach.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      window.scrollTo(0, 0);
    } catch {}
  }, [pathname]);
  return null;
}
