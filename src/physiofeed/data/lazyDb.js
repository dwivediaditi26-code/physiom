// The first screen only needs three small reads from PhysioFeed's data file (the
// header's unread dots and the news strip on Home). The file itself is large (it
// carries the demo content too), so it is fetched right after the first screen is
// drawn instead of being part of it. See also vite.config.js (first-load budget).
let loading = null;
export const pfData = () => (loading ||= import("./db.js"));
