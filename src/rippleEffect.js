// Global tap-ripple for every .primary-btn in the app (Ortho/Cardio/Neuro
// assessments and anywhere else using the shared .primary-btn class).
// .primary-btn is duplicated across several independently lazy-loaded
// modules' own <style> tags rather than one global stylesheet -- one
// delegated pointerdown listener plus one injected <style> here covers
// all of them at once instead of touching every call site.
//
// The :active depress (scale + flattened shadow) itself still lives in
// each module's own .primary-btn:active rule -- this file only adds the
// ripple that expands from the actual tap point on top of that.
export function installButtonRipple() {
  if (typeof document === "undefined" || document.getElementById("btn-ripple-style")) return;

  const style = document.createElement("style");
  style.id = "btn-ripple-style";
  style.textContent = `
    .btn-ripple-dot {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,.5);
      transform: scale(0);
      pointer-events: none;
      animation: btn-ripple-expand .55s ease-out forwards;
    }
    @keyframes btn-ripple-expand {
      to { transform: scale(1); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".primary-btn");
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const dot = document.createElement("span");
    dot.className = "btn-ripple-dot";
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - rect.left - size / 2}px`;
    dot.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  });
}
