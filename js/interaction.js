const MAGNET = 8;
const FOCUSABLES = ".btn, .work, .credit, .rate, [data-skip-cinematic]";

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
  bindTypeSafety();
  bindGlassHover();
}

function bindTypeSafety() {
  const nodes = Array.from(document.querySelectorAll("[data-safe-type]"));
  if (!nodes.length) return;
  const plates = () => Array.from(document.querySelectorAll(".plate"));
  const bump = () => {
    nodes.forEach((el) => {
      const er = el.getBoundingClientRect();
      let shift = 0;
      plates().forEach((p) => {
        const pr = p.getBoundingClientRect();
        const overlapX = Math.min(er.right, pr.right) - Math.max(er.left, pr.left);
        const overlapY = Math.min(er.bottom, pr.bottom) - Math.max(er.top, pr.top);
        if (overlapX > 24 && overlapY > 16) {
          shift = Math.max(shift, Math.min(120, overlapX * 0.55));
        }
      });
      el.style.setProperty("--type-safe-x", (-shift).toFixed(1) + "px");
      el.style.transform = shift ? "translate3d(var(--type-safe-x),0,0)" : "";
    });
  };
  window.addEventListener("scroll", bump, { passive: true });
  window.addEventListener("resize", bump, { passive: true });
  bump();
}

function bindGlassHover() {
  if (!isFinePointer() || prefersReduced()) return;
  document.querySelectorAll(".glass--work, .glass--form, .btn.glass").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / Math.max(r.width, 1)) * 100;
      const y = ((e.clientY - r.top) / Math.max(r.height, 1)) * 100;
      el.style.setProperty("--gx", x.toFixed(1) + "%");
      el.style.setProperty("--gy", y.toFixed(1) + "%");
    });
  });
}

function bindCardTilt() {
  if (!isFinePointer() || prefersReduced()) return;
  document.querySelectorAll(".work").forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = "1";
    const art = card.querySelector(".work__art img") || card;
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / Math.max(r.width, 1) - 0.5;
      const py = (e.clientY - r.top) / Math.max(r.height, 1) - 0.5;
      card.style.transform = "translateX(4px) rotateY(" + (px * 8).toFixed(2) + "deg) rotateX(" + (-py * 6).toFixed(2) + "deg)";
      if (art && art !== card) art.style.transform = "scale(1.06) translate(" + (px * -8).toFixed(1) + "px," + (py * -6).toFixed(1) + "px)";
    };
    const reset = () => {
      card.style.transform = "";
      if (art && art !== card) art.style.transform = "";
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", reset);
    card.addEventListener("blur", reset);
  });
}
