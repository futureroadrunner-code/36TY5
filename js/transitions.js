const DURATION = 0.28;

function targetFromHash(hash) {
  if (!hash || hash === "#" || hash === "#0") return null;
  const id = hash.slice(1);
  return document.getElementById(id) || document.querySelector(hash);
}

function scrollInstant(el) {
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(el, { immediate: true, force: true, duration: 0 });
  } else {
    el.scrollIntoView({ behavior: "auto", block: "start" });
  }
}

function commitHash(hash) {
  if (history.replaceState) history.replaceState(null, "", hash);
}

function focusSection(el) {
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  try {
    el.focus({ preventScroll: true });
  } catch (_) {
    el.focus();
  }
}

function jump(hash) {
  const el = targetFromHash(hash);
  if (!el) return;
  scrollInstant(el);
  commitHash(hash);
  focusSection(el);
}

export function initTransitions({ gsap, reduced } = {}) {
  const veil = document.getElementById("route-veil");
  let busy = false;

  const play = (hash) => {
    if (reduced || !gsap || !veil) {
      jump(hash);
      return;
    }
    if (busy) return;
    busy = true;
    veil.classList.add("is-busy");
    gsap.killTweensOf(veil);
    gsap.set(veil, { clipPath: "inset(0 100% 0 0)" });
    gsap
      .timeline({
        defaults: { ease: "power3.inOut", duration: DURATION },
        onComplete: () => {
          busy = false;
          veil.classList.remove("is-busy");
          gsap.set(veil, { clipPath: "inset(0 100% 0 0)" });
        },
      })
      .to(veil, { clipPath: "inset(0 0% 0 0)" })
      .add(() => jump(hash))
      .to(veil, { clipPath: "inset(0 0% 0 100%)" });
  };

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.target === "_blank") return;
    if (a.hasAttribute("data-skip-cinematic")) return;
    const href = a.getAttribute("href");
    if (!href || href === "#" || href === "#0") return;
    if (!targetFromHash(href)) return;
    e.preventDefault();
    play(href);
  });
}
