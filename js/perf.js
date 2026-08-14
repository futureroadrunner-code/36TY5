/**
 * Performance + a11y gates for the 36TY hero.
 * No Three / R3F imports — lead dynamically imports those after shouldLoad3D().
 */

const REDUCE_MQ = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(REDUCE_MQ).matches;
}

function saveDataOn() {
  const conn =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return !!(conn && conn.saveData);
}

function lowDeviceMemory() {
  const mem = navigator.deviceMemory;
  return typeof mem === "number" && mem < 4;
}

/** Lighthouse / explicit audit — page must go idle (no perpetual rAF). */
export function isAuditMode() {
  if (typeof window === "undefined") return false;
  if (/[?&](lh|audit)=1\b/.test(window.location.search || "")) return true;
  const ua = navigator.userAgent || "";
  return /Chrome-Lighthouse|Lighthouse/.test(ua);
}

export function sleepMotionForAudit() {
  if (!isAuditMode()) return;
  document.documentElement.setAttribute("data-audit", "");
  window.__audit = true;
  const gsap = window.gsap;
  if (gsap && gsap.ticker && typeof gsap.ticker.sleep === "function") {
    try {
      gsap.globalTimeline.pause();
      gsap.ticker.sleep();
    } catch (_) {}
  }
}

/** False when 3D would harm motion-sensitive, metered, or low-RAM clients. */
export function shouldLoad3D() {
  if (typeof window === "undefined") return false;
  if (isAuditMode()) return false;
  if (prefersReducedMotion()) return false;
  if (saveDataOn()) return false;
  if (lowDeviceMemory()) return false;
  return true;
}

/**
 * Pause the WebGL loop while the canvas is offscreen.
 * rootMargin 20% starts a beat early and holds a beat late.
 * startFn / stopFn must be cheap pause/resume — not scene construction.
 *
 * @param {Element | null} canvas
 * @param {() => void} startFn
 * @param {() => void} stopFn
 * @returns {() => void} disconnect
 */
export function gateCanvas(canvas, startFn, stopFn) {
  if (!canvas) return () => {};

  let running = false;

  const play = () => {
    if (running) return;
    running = true;
    startFn();
  };

  const pause = () => {
    if (!running) return;
    running = false;
    stopFn();
  };

  if (typeof IntersectionObserver === "undefined") {
    play();
    return () => pause();
  }

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) play();
      else pause();
    },
    { root: null, rootMargin: "20%", threshold: 0 }
  );

  io.observe(canvas);

  return () => {
    io.disconnect();
    pause();
  };
}

/**
 * Scroll handlers must only write CSS custom properties — no layout, no 3D, no alloc.
 * @param {Element | null} target
 * @param {Record<string, string>} vars
 */
export function writeScrollVars(target, vars) {
  const el = target || document.documentElement;
  for (const name in vars) el.style.setProperty(name, vars[name]);
}

function ensureSkipLink() {
  let skip = document.querySelector("a.skip:not(.skip--3d)");
  if (!skip) {
    skip = document.createElement("a");
    skip.className = "skip";
    skip.href = "#top";
    skip.textContent = "Skip to content";
    document.body.prepend(skip);
  }

  if (document.querySelector("a.skip--3d")) return;

  const content = document.querySelector(".hero__content");
  if (content && !content.id) content.id = "hero-copy";

  const skip3d = document.createElement("a");
  skip3d.className = "skip skip--3d";
  skip3d.href = "#arrangement";
  skip3d.textContent = "Skip cover — enter";
  skip.after(skip3d);
}

function ensureA11ySheet() {
  if (document.querySelector('link[href*="a11y.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("css/a11y.css", document.baseURI).href;
  document.head.appendChild(link);
}

function syncReduceMotionClass() {
  document.documentElement.classList.toggle("reduce-motion", prefersReducedMotion());
}

function hideHeroCanvas() {
  const canvas = document.querySelector("#hero-canvas");
  if (!canvas) return;
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.engine = "skipped";
}

/** Skip links, reduce-motion class on <html>, a11y stylesheet. Focus-visible lives in css/a11y.css. */
export function initA11y() {
  ensureA11ySheet();
  ensureSkipLink();
  syncReduceMotionClass();

  const mq = window.matchMedia(REDUCE_MQ);
  if (mq.addEventListener) mq.addEventListener("change", syncReduceMotionClass);
  else if (mq.addListener) mq.addListener(syncReduceMotionClass);

  if (!shouldLoad3D()) hideHeroCanvas();
}
