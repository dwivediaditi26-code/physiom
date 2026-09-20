// Scrolling helpers for Learn screens.
//
// Which element scrolls the page depends on the layout (the viewport, <body> or
// .pm-main -- see AppFull.navTo) and window.scrollTo is a no-op against some of
// them, so scroll whichever ancestor actually moves.

// Bottom edge of the app's own sticky top bar (phones / tablets); 0 on a laptop,
// where that bar scrolls away.
export function appBarBottom() {
  const el = document.querySelector(".pm-mobile-hdr");
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  return r.height ? r.bottom : 0;
}

// Scrolls whichever ancestor of `el` actually moves by `delta` px.
function scrollAncestors(el, delta) {
  for (let p = el; p; p = p.parentElement) {
    const before = p.scrollTop;
    p.scrollTop = before + delta;
    if (p.scrollTop !== before) return;
  }
  window.scrollBy(0, delta);
}

// Puts the top of `root` `gap` px below `pinAt` (default: the app's top bar),
// scrolling up or down. Does nothing when it is already within a few px.
export function alignTo(root, pinAt = appBarBottom(), gap = 8) {
  if (!root) return;
  try {
    const delta = root.getBoundingClientRect().top - (pinAt + gap);
    if (Math.abs(delta) >= 4) scrollAncestors(root, delta);
  } catch { /* scrolling is a nicety, never break a screen over it */ }
}

// Brings `root` back into view when it has scrolled up past `pinAt`. Only ever
// scrolls up, and only when it has to -- if `root` is already in view the page
// is left alone.
export function keepInView(root, pinAt = appBarBottom(), gap = 8) {
  if (!root) return;
  try {
    const delta = root.getBoundingClientRect().top - (pinAt + gap);
    if (delta < 0) scrollAncestors(root, delta);
  } catch { /* scrolling is a nicety, never break a screen over it */ }
}
