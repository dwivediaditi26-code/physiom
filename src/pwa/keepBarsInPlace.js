// Keeps the bottom bar (and the Back/Next bar above it) pinned to the bottom
// of the screen on iPhone.
//
// What goes wrong: after the on-screen keyboard closes, Safari can leave the
// visible window shifted inside the page. Everything pinned to the screen
// (bottom bar, Back/Next bar, sticky headers) then sits too high or too low
// and moves with the page when you scroll, instead of staying put. Scrolling
// the page by a pixel makes Safari put the window back where it belongs.
//
// This only acts when it can see that the window really is out of place: no
// field is being typed in, the page is not pinch-zoomed, and the visible
// window is offset from, or shorter than, the page frame.

const SETTLE_MS = [150, 450, 900]; // the keyboard takes ~300ms to slide away
const MAX_TRIES = 3;
const MAX_NUDGES_PER_LOAD = 12; // if a nudge can't fix it, stop rather than fight the browser
const QUIET_MS = 250; // never nudge while a finger is still scrolling the page

function isTyping(doc) {
  const el = doc.activeElement;
  if (!el) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable === true;
}

// How far the visible window is out of place, or null if it is where it belongs.
export function viewportDrift(win = window) {
  const vv = win.visualViewport;
  if (!vv || isTyping(win.document)) return null;
  if (vv.scale > 1.01) return null; // pinch-zoomed on purpose
  const offsetTop = Math.round(vv.offsetTop || 0);
  const shortBy = Math.round(win.innerHeight - vv.height);
  if (Math.abs(offsetTop) <= 1 && shortBy <= 1) return null;
  return { offsetTop, shortBy };
}

// `report` is called at most once per page load with what was seen, so we can
// tell from real phones how often this happens.
export function installKeepBarsInPlace({ win = window, report } = {}) {
  if (!win.visualViewport) return () => {};
  const vv = win.visualViewport;
  let timers = [];
  let reported = false;
  let nudges = 0;
  let lastScrollAt = 0;

  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  const nudge = () => {
    nudges += 1;
    const y = win.scrollY;
    win.scrollTo(0, y > 0 ? y - 1 : 1);
    win.requestAnimationFrame(() => win.scrollTo(0, y));
  };

  const check = (tries) => {
    const drift = viewportDrift(win);
    if (!drift) return;
    if (!reported && report) {
      reported = true;
      try { report(drift); } catch { /* reporting must never break the page */ }
    }
    if (tries >= MAX_TRIES || nudges >= MAX_NUDGES_PER_LOAD) return;
    if (Date.now() - lastScrollAt < QUIET_MS) {
      timers.push(setTimeout(() => check(tries), QUIET_MS));
      return;
    }
    nudge();
    timers.push(setTimeout(() => check(tries + 1), 400));
  };

  const schedule = () => {
    clear();
    SETTLE_MS.forEach((ms) => timers.push(setTimeout(() => check(0), ms)));
  };

  const onScroll = () => { lastScrollAt = Date.now(); };
  win.addEventListener("scroll", onScroll, { passive: true });
  win.document.addEventListener("focusout", schedule);
  vv.addEventListener("resize", schedule);
  vv.addEventListener("scroll", schedule);

  return () => {
    clear();
    win.removeEventListener("scroll", onScroll);
    win.document.removeEventListener("focusout", schedule);
    vv.removeEventListener("resize", schedule);
    vv.removeEventListener("scroll", schedule);
  };
}
