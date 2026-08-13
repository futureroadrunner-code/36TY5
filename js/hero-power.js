/**
 * Hero 3D power budget — shared by Three.js Experience and Spline bridge.
 * Low-power when any signal fires: reduced motion, save-data, ≤4 cores, or mobile.
 */

export function isLowPower() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(prefers-reduced-data: reduce)").matches ||
    (navigator.hardwareConcurrency || 8) <= 4 ||
    window.matchMedia("(max-width: 899px)").matches
  );
}

export function isReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 899px)").matches;
}

/** Proactive WebGL probe — avoids throwing inside Three.js bootstrap. */
export function canUseWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function showHeroFallback(canvas) {
  if (!canvas) return;
  canvas.hidden = true;
  canvas.dataset.engine = "fallback";
  const fb = canvas.parentElement?.querySelector("[data-hero-fallback]");
  if (fb) fb.hidden = false;
}
