import { useCallback, useEffect, useRef, useState } from "react";

// Powers the profile pages' inline-scroll layout (2026-09-22, Aditi: "thiis
// showing page wise .. i want inline wise" -- ProfileTabs used to swap which
// section rendered at all; every section now renders together on one
// scrollable page, and the tab bar just jumps to / highlights whichever
// section is current, like an in-page anchor nav).
//
// "Current" is decided by comparing each section's live top position against
// a read line a fifth of the way down the visible viewport below the sticky
// .pf-profile-tabs bar -- not the bar's bottom edge itself. Sections sit
// flush against each other in the DOM (one's bottom is the next one's top),
// but each one's own trailing margin/padding still counts as "inside" it, so
// a line right at the bar's edge kept the previous tab highlighted through
// that trailing whitespace, past the point the next section was what filled
// the screen (2026-09-22, Aditi: scrolled well into About, pill still said
// Posts). Reading further down the viewport instead means a section only
// takes over once a meaningful amount of its own content is actually on
// screen.
//
// The bar's own bottom edge -- used both for that read line and for
// --pf-scroll-offset (.pf-profile-section's scroll-margin-top, so
// scrollIntoView() lands just below the sticky bars) -- is NOT read via
// getBoundingClientRect(). Before the page is scrolled past the dismissible
// guest-mode/demo banners above it, the sticky bar hasn't started sticking
// yet, so its live rect reflects wherever it sits in normal flow (e.g.
// ~600px down) rather than its stuck position (~125px) -- and scroll-margin
// is a static CSS value, so a click from the very top baked that much
// bigger, wrong number in and undershot every jump (confirmed: clicking a
// tab from page-top consistently landed short, matching the stale
// pre-scroll offset almost exactly). The stuck position is stable
// regardless of current scroll position -- it's just the bar's declared
// `top` (see physiofeed.css's .pf-profile-tabs, breakpoint- and
// entry-point-dependent, which is exactly why it's read from the DOM
// instead of re-deriving that math a second time here) plus its own
// rendered height, both unaffected by whether the bar has started sticking.
export default function useProfileSections(tabs) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const nodesRef = useRef({});
  // register(tab) is called inline in JSX on every render (`ref={register("X")}`),
  // so without caching one callback per tab, each render would hand React a
  // brand-new function identity for the same section -- and React treats a
  // changed ref prop as "detach the old one, attach a new one", nulling and
  // re-populating nodesRef on every re-render (which happens on every tab
  // change while scrolling, since recompute() below calls setActiveTab).
  const callbacksRef = useRef({});

  const register = useCallback((tab) => {
    if (!callbacksRef.current[tab]) {
      callbacksRef.current[tab] = (el) => {
        if (el) nodesRef.current[tab] = el;
        else delete nodesRef.current[tab];
      };
    }
    return callbacksRef.current[tab];
  }, []);

  useEffect(() => {
    const recompute = () => {
      const bar = document.querySelector(".pf-profile-tabs");
      const barBottom = bar ? parseFloat(getComputedStyle(bar).top) + bar.offsetHeight : 0;
      document.documentElement.style.setProperty("--pf-scroll-offset", `${Math.max(barBottom + 1, 0)}px`);
      const readLine = barBottom + (window.innerHeight - barBottom) * 0.2;

      let current = tabs[0];
      for (const tab of tabs) {
        const el = nodesRef.current[tab];
        if (el && el.getBoundingClientRect().top <= readLine) current = tab;
      }
      setActiveTab(current);
    };

    recompute();
    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [tabs]);

  const scrollTo = useCallback((tab) => {
    nodesRef.current[tab]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return { activeTab, register, scrollTo };
}
