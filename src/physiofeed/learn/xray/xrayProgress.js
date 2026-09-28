// Same shape as LowBackPainJourney.jsx's PROGRESS_KEY convention: one
// localStorage blob, not user-scoped (this whole Learn area already works
// this way -- see LAST_KEY in LearnTabEntry.jsx too).
const PROGRESS_KEY = "physiom_learn_xray_progress";
const BOOKMARK_KEY = "physiom_learn_xray_bookmarks";

export function readCompleted(courseId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")[courseId] || []);
  } catch {
    return new Set();
  }
}

export function markLessonDone(courseId, lessonId) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    const cur = new Set(all[courseId] || []);
    cur.add(lessonId);
    all[courseId] = [...cur];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    /* storage blocked */
  }
}

export function readBookmarks() {
  try {
    return new Set(JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function toggleBookmark(lessonId) {
  try {
    const cur = readBookmarks();
    cur.has(lessonId) ? cur.delete(lessonId) : cur.add(lessonId);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...cur]));
    return cur;
  } catch {
    return readBookmarks();
  }
}
