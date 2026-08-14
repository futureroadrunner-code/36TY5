const MAGNET = 8;
const FOCUSABLES = ".btn, .channel, .work, .credit, .rate, [data-skip-cinematic]";

function isFinePointer() {
  return window.matchMedia("(pointer: fine)").matches;
}

function prefersReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(n, max) {
  return Math.max(-max, Math.min(max, n));
}

function setMagnet(el, x, y) {
  el.style.setProperty("--btn-mx", x.toFixed(2) + "px");
  el.style.setProperty("--btn-my", y.toFixed(2) + "px");
}

function clearMagnet(el) {
  el.style.setProperty("--btn-mx", "0px");
  el.style.setProperty("--btn-my", "0px");
}

function bindMagnet(btn) {
  if (btn.dataset.magnetBound) return;
  btn.dataset.magnetBound = "1";

  const onMove = (e) => {
    if (!isFinePointer() || prefersReduced()) return;
    const r = btn.getBoundingClientRect();
    const dx = ((e.clientX - (r.left + r.width / 2)) / Math.max(r.width / 2, 1)) * MAGNET;
    const dy = ((e.clientY - (r.top + r.height / 2)) / Math.max(r.height / 2, 1)) * MAGNET;
    setMagnet(btn, clamp(dx, MAGNET), clamp(dy, MAGNET));
  };

  btn.addEventListener("pointermove", onMove);
  btn.addEventListener("pointerleave", () => clearMagnet(btn));
  btn.addEventListener("blur", () => clearMagnet(btn));
}

function initKeyboardFocus() {
  const onKey = (e) => {
    if (e.key === "Tab" || e.key === "Enter" || e.key.startsWith("Arrow")) {
      document.body.classList.add("is-key-nav");
    }
  };
  const onPointer = () => {
    document.body.classList.remove("is-key-nav");
  };

  window.addEventListener("keydown", onKey);
  window.addEventListener("pointerdown", onPointer);

  document.addEventListener("focusin", (e) => {
    const el = e.target.closest(FOCUSABLES);
    if (!el) return;
    if (el.matches(":focus-visible") || document.body.classList.contains("is-key-nav")) {
      el.classList.add("is-key-focus");
    }
  });

  document.addEventListener("focusout", (e) => {
    const el = e.target.closest(FOCUSABLES);
    if (el) el.classList.remove("is-key-focus");
  });
}

export function initInteraction() {
  initKeyboardFocus();
  document.querySelectorAll(".btn").forEach(bindMagnet);
  bindCardTilt();
  bindGlassHover();
}

function bindGlassHover() {
  if (!isFinePointer() || prefersReduced()) return;
  document.querySelectorAll(".glass--strip, .glass--form, .btn.glass, .glass--bus").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", (((e.clientX - r.left) / Math.max(r.width, 1)) * 100).toFixed(1) + "%");
      el.style.setProperty("--gy", (((e.clientY - r.top) / Math.max(r.height, 1)) * 100).toFixed(1) + "%");
    });
  });
}

function bindCardTilt() {
  if (!isFinePointer() || prefersReduced()) return;
  document.querySelectorAll(".channel, .work").forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = "1";
    const art = card.querySelector(".channel__art img, .work__art img");
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / Math.max(r.width, 1) - 0.5;
      const py = (e.clientY - r.top) / Math.max(r.height, 1) - 0.5;
      card.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
      if (art) art.style.transform = "translate3d(" + (px * -10).toFixed(1) + "px," + (py * -6).toFixed(1) + "px,0)";
    };
    const reset = () => {
      if (art) art.style.transform = "";
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", reset);
    card.addEventListener("blur", reset);
  });
}
