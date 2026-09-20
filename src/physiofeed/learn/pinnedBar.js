// A bar fixed to the bottom of the screen, sitting flush on top of the app's own
// bottom tabs -- the same rule the Ortho / Neuro / Cardio assessment wizards use
// for their Back / Next bar (.bottombar): --pm-bnav-h is the tab bar's real
// measured height (0 on a laptop, where there are no bottom tabs) and
// --pm-side-w shifts it right of the laptop sidebar so it stays under the
// content column. max-width matches Learn's own column (max-w-2xl, lg:max-w-4xl).
// Used by the case player and the multi-question quiz for their pinned actions.
export const PINNED_BAR_CSS =
  ".pin-bar{position:fixed;left:calc(50% + var(--pm-side-w,0px)/2);transform:translateX(-50%);bottom:var(--pm-bnav-h,calc(60px + env(safe-area-inset-bottom)));width:100%;max-width:672px;z-index:25;background:#fff;border-top:1px solid #e2e8f0;padding:8px 16px;display:flex;gap:10px}" +
  "@media (min-width:1024px){.pin-bar{max-width:896px}}";
