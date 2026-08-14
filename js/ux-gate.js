function scrollToConnect() {
  const el = document.getElementById("connect");
  if (!el) return;

  const lenis = window.__lenis;
  if (lenis) {
    if (typeof lenis.stop === "function") lenis.stop();
    if (typeof lenis.scrollTo === "function") {
      lenis.scrollTo(el, { immediate: true, force: true, duration: 0 });
    } else {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
    if (typeof lenis.start === "function") {
      requestAnimationFrame(() => lenis.start());
    }
  } else {
    el.scrollIntoView({ behavior: "auto", block: "start" });
  }

  if (history.replaceState) history.replaceState(null, "", "#connect");
  const name = document.getElementById("bk-name");
  const focusEl = name || el;
  if (!focusEl.hasAttribute("tabindex") && focusEl !== name) {
    focusEl.setAttribute("tabindex", "-1");
  }
  try {
    focusEl.focus({ preventScroll: true });
  } catch (_) {
    focusEl.focus();
  }
}

function unlockBooking() {
  const skip = document.querySelector("[data-skip-cinematic]");
  if (skip) {
    skip.classList.add("is-visible");
    skip.removeAttribute("hidden");
    skip.setAttribute("aria-hidden", "false");
  }
  const form = document.querySelector("[data-booking]");
  if (form) {
    form.removeAttribute("inert");
    form.removeAttribute("aria-hidden");
    form.querySelectorAll("input, textarea, button").forEach((field) => {
      field.disabled = false;
    });
  }
}

function onWebglFail() {
  if (!document.body.classList.contains("is-no-webgl")) return;
  unlockBooking();
}

export function initUxGate() {
  const skip = document.querySelector("[data-skip-cinematic]");
  if (skip) {
    skip.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        scrollToConnect();
      },
      true
    );
  }

  onWebglFail();
  new MutationObserver(onWebglFail).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
