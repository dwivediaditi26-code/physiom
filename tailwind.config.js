/** @type {import('tailwindcss').Config} */
export default {
  // Scoped to just the PhysioFeed section -- utility classes are only
  // generated for class names literally found in these files, so nothing
  // here can accidentally style the rest of the app.
  content: ["./src/physiofeed/**/*.{js,jsx}"],
  corePlugins: {
    // Preflight is Tailwind's global CSS reset (margins, headings, buttons,
    // etc.) -- it applies via plain element selectors (h1, button, ul...)
    // that are NOT scoped to src/physiofeed, so leaving it on would reset
    // styling across the entire rest of the app the moment this stylesheet
    // loads. Physiom already styles everything with inline styles, so it
    // doesn't need or want a global reset. Utility classes (bg-slate-50,
    // flex, rounded-xl, etc.) still work fine with preflight off.
    preflight: false,
  },
  theme: { extend: {} },
  plugins: [],
}
