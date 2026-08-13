/**
 * Spline runtime bridge — pattern from spline-mcp-server RuntimeManager
 * (getRuntimeSetup / generateRuntimeCode). Prefer a published .splinecode
 * scene when cms.spline.sceneUrl is set; otherwise callers fall back to Three.js.
 *
 * Low-power path (prefers-reduced-motion, save-data, ≤4 cores, mobile):
 * skips pointer parallax and keeps the published scene static/slow.
 */
import { Application } from "@splinetool/runtime";
import { isLowPower } from "./hero-power.js";

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ sceneUrl: string, objectName?: string, lowPower?: boolean }} opts
 */
export async function mountSplineScene(canvas, opts) {
  const sceneUrl = (opts.sceneUrl || "").trim();
  if (!sceneUrl) {
    throw new Error("Missing Spline sceneUrl (.splinecode)");
  }

  const lowPower = opts.lowPower ?? isLowPower();

  const spline = new Application(canvas);
  await spline.load(sceneUrl);

  const focusName = opts.objectName || "Bloom";
  let focus = null;
  if (!lowPower) {
    try {
      focus = spline.findObjectByName(focusName) || spline.findObjectByName("bloom");
    } catch (_) {
      focus = null;
    }
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    if (lowPower) return;
    const r = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    pointer.ty = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  let scroll = 0;
  const onScroll = () => {
    if (lowPower) return;
    scroll = window.scrollY / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (lowPower || !focus) return;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    try {
      focus.rotation.y = pointer.x * 0.45 + scroll * 0.35;
      focus.rotation.x = pointer.y * 0.16;
    } catch (_) {
      /* object may be immutable in some exports */
    }
  };
  tick();

  window.__spline = spline;

  return {
    spline,
    lowPower,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      try {
        spline.dispose?.();
      } catch (_) {}
    },
  };
}

export function isSplineSceneUrl(url) {
  return typeof url === "string" && /\.splinecode(\?|$)/i.test(url.trim());
}
