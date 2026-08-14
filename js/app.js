import { loadCMS, bindTapes, bindCredits, bindList } from "./cms.js";
import { initMotion } from "./motion.js";
import { initInteraction } from "./interaction.js";
import { initTransitions } from "./transitions.js";
import { initUxGate } from "./ux-gate.js";
import { shouldLoad3D, gateCanvas, initA11y, isAuditMode, sleepMotionForAudit } from "./perf.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const tram = window.tram;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function readyFonts() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return document.fonts.ready.catch(() => {});
}

function preloadImages() {
  const imgs = Array.from(document.querySelectorAll("img[data-preload]")).filter((img) => img.src);
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return img.decode().catch(() => {});
    })
  );
}

function runLoader(ready) {
  if (isAuditMode()) {
    const loader = document.querySelector(".loader");
    if (loader) loader.setAttribute("hidden", "");
    document.body.classList.add("is-ready");
    return Promise.resolve();
  }
  const loader = document.querySelector(".loader");
  const num = document.querySelector("[data-loader-count]");
  if (!loader) return Promise.resolve();
  let n = 0;
  let assets = false;
  const hardCap = setTimeout(() => {
    assets = true;
  }, 5000);
  ready
    .then(() => {
      assets = true;
    })
    .catch(() => {
      assets = true;
    });
  return new Promise((resolve) => {
    const tick = () => {
      const cap = assets ? 100 : 86;
      n = Math.min(cap, n + (reduced ? 50 : 1.8 + Math.random() * 2.4));
      if (num) num.textContent = String(Math.floor(n)).padStart(3, "0");
      if (n < 100) requestAnimationFrame(tick);
      else {
        clearTimeout(hardCap);
        tram(loader).add("opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)").start({ opacity: 0 });
        setTimeout(() => {
          loader.setAttribute("hidden", "");
          document.body.classList.add("is-ready");
          resolve();
        }, reduced ? 0 : 700);
      }
    };
    tick();
  });
}

function initLenis() {
  if (isAuditMode()) return null;
  const LenisCtor = window.Lenis || window.lenis;
  if (!LenisCtor || reduced) return null;
  const lenis = new LenisCtor({ lerp: 0.09, smoothWheel: true, syncTouch: false });
  window.__lenis = lenis;
  lenis.on("scroll", (e) => {
    window.__scrollVel = e.velocity || 0;
    const v = Math.min(1, Math.abs(e.velocity || 0) / 42);
    document.documentElement.style.setProperty("--scroll-v", v.toFixed(3));
    const rail = document.querySelector("[data-scroll-rail]");
    if (rail && typeof e.progress === "number") {
      rail.style.transform = "scaleY(" + e.progress.toFixed(4) + ")";
    }
    if (gsap && ScrollTrigger) ScrollTrigger.update();
  });
  if (gsap && ScrollTrigger) {
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const loop = (t) => {
      lenis.raf(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  return lenis;
}

function initCursor() {
  const cursor = document.querySelector(".cursor");
  if (isAuditMode() || !cursor || !window.matchMedia("(pointer: fine)").matches) {
    if (cursor) cursor.remove();
    return;
  }
  document.body.classList.add("has-cursor");
  const label = cursor.querySelector(".cursor__label");
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;

  document.addEventListener(
    "mousemove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true }
  );

  const loop = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    tram(cursor).set({ transform: "translate3d(" + x + "px," + y + "px,0)" });
    requestAnimationFrame(loop);
  };
  loop();

  document.addEventListener("mouseover", (e) => {
    const hit = e.target.closest("a, button, .work, .credit");
    if (!hit) return;
    cursor.classList.add("is-hot");
    if (label) label.textContent = hit.getAttribute("data-cursor") || "LOOK";
  });
  document.addEventListener("mouseout", (e) => {
    const hit = e.target.closest("a, button, .work, .credit");
    if (!hit) return;
    cursor.classList.remove("is-hot");
    if (label) label.textContent = "LOOK";
  });
}

function initSeam() {
  const row = document.querySelector(".seam__track");
  if (!row || row.dataset.cloned) return;
  row.innerHTML = row.innerHTML + row.innerHTML;
  row.dataset.cloned = "1";
}

function initHeroDepth() {
  const hero = document.querySelector("[data-hero]");
  if (!hero || reduced || isAuditMode()) return;
  const layers = Array.from(hero.querySelectorAll("[data-depth]"));
  if (!layers.length) return;
  const state = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    "pointermove",
    (e) => {
      state.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      state.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true }
  );
  const tick = () => {
    state.x += (state.tx - state.x) * 0.08;
    state.y += (state.ty - state.y) * 0.08;
    layers.forEach((el) => {
      const d = parseFloat(el.getAttribute("data-depth")) || 0.2;
      el.style.setProperty("--dx", (state.x * d * -28).toFixed(2) + "px");
      el.style.setProperty("--dy", (state.y * d * -18).toFixed(2) + "px");
    });
    requestAnimationFrame(tick);
  };
  tick();
}

function initScroll() {
  if (isAuditMode()) {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, window.scrollY / max));
      window.__mercuryScroll = p;
      window.__journeyScroll = p;
      if (window.__experience) window.__experience.setScroll(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return;
  }
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: reduced ? 0 : 40,
      opacity: 0,
      duration: reduced ? 0.01 : 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });

  initMotion({ gsap, ScrollTrigger, reduced });

  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    endTrigger: "#connect",
    end: "top 20%",
    scrub: true,
    onUpdate: (self) => {
      window.__mercuryScroll = self.progress;
      window.__journeyScroll = self.progress;
      if (self.progress > 0.02) window.__journeyOn = true;
      if (window.__experience) window.__experience.setScroll(self.progress);
    },
  });
}

function initNavSpy() {
  const links = Array.from(document.querySelectorAll(".nav-links a[href^='#'], .nav-panel a[href^='#']"));
  if (!links.length) return;
  const map = new Map();
  links.forEach((a) => {
    const id = (a.getAttribute("href") || "").slice(1);
    const el = document.getElementById(id);
    if (el) map.set(el, a);
  });
  if (!map.size || !window.IntersectionObserver) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const a = map.get(entry.target);
        if (!a) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
          links.forEach((l) => l.classList.remove("is-here"));
          document.querySelectorAll('.nav-links a[href="' + a.getAttribute("href") + '"]').forEach((l) => {
            l.classList.add("is-here");
          });
        }
      });
    },
    { threshold: [0.35, 0.6], rootMargin: "-18% 0px -40% 0px" }
  );
  map.forEach((_, el) => io.observe(el));
}

function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    if ("inert" in panel) panel.inert = !open;
    tram(panel)
      .add("transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)")
      .start({ transform: open ? "translateY(0%)" : "translateY(-110%)" });
  };

  panel.setAttribute("aria-hidden", "true");
  if ("inert" in panel) panel.inert = true;

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("nav-open"));
  });
  panel.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      setOpen(false);
    })
  );
}

function initForm() {
  const form = document.querySelector("[data-booking]");
  if (!form) return;
  const fieldU = { name: 0.22, email: 0.5, intent: 0.78 };
  form.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("focus", () => {
      window.__fieldU = fieldU[el.name] != null ? fieldU[el.name] : 0.5;
    });
    el.addEventListener("blur", () => {
      if (window.__fieldU === fieldU[el.name]) window.__fieldU = -1;
    });
    el.addEventListener("input", () => {
      window.__typeEnergy = Math.min(1, (window.__typeEnergy || 0) + 0.12);
    });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (document.getElementById("bk-name") || {}).value || "";
    const email = (document.getElementById("bk-email") || {}).value || "";
    const intent = (document.getElementById("bk-intent") || {}).value || "";
    const err = document.querySelector("[data-form-error]");
    const ok = document.querySelector("[data-form-ok]");
    if (err) err.hidden = true;
    const n = name.trim();
    const em = email.trim();
    const inn = intent.trim();
    if (!n || !em || !inn || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      if (err) {
        err.hidden = false;
        err.textContent = "Name, a real email, and the feeling.";
      }
      return;
    }
    const to = form.getAttribute("data-mailto") || "booking@36ty.world";
    const body = encodeURIComponent("Name: " + n + "\nEmail: " + em + "\n\n" + inn);
    const href = "mailto:" + to + "?subject=" + encodeURIComponent("36TY — " + n) + "&body=" + body;
    window.__transmitAt = performance.now();
    window.__transmitted = true;
    window.__fieldU = 1;
    document.body.classList.add("is-transmitting");
    if (ok) ok.hidden = false;
    window.setTimeout(() => {
      window.location.href = href;
      form.reset();
    }, 720);
  });
}

function initSignalWorks() {
  const cards = Array.from(document.querySelectorAll(".channel[data-work], .work[data-work], .channel, .work"));
  window.__workCount = cards.length || 4;
  window.__workAim = -1;
  window.__workLock = -1;
  window.__workVisible = -1;
  const lockWork = (el, idx) => {
    window.__workLock = idx;
    window.__workAim = idx;
    cards.forEach((w) => w.classList.toggle("is-locked", w === el));
  };
  cards.forEach((el, i) => {
    const idx = Number(el.getAttribute("data-work"));
    const n = Number.isFinite(idx) ? idx : i;
    el.addEventListener("pointerenter", () => {
      window.__workAim = n;
      document.body.setAttribute("data-work-aim", String(n));
    });
    el.addEventListener("pointerleave", () => {
      if (window.__workAim === n) window.__workAim = -1;
      if (document.body.getAttribute("data-work-aim") === String(n)) document.body.removeAttribute("data-work-aim");
    });
    el.addEventListener("click", () => {
      lockWork(el, n);
      window.__journeyOn = true;
    });
  });
  if (window.IntersectionObserver && cards.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.getAttribute("data-work"));
          if (Number.isFinite(idx)) window.__workVisible = idx;
        });
      },
      { threshold: 0.45 }
    );
    cards.forEach((el) => io.observe(el));
  }
}

function initYear() {
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = String(new Date().getFullYear());
}

function syncDeck(on, title) {
  const deck = document.querySelector("[data-deck]");
  const toggle = document.querySelector("[data-deck-toggle]");
  const titleEl = document.querySelector("[data-deck-title]");
  const subEl = document.querySelector("[data-deck-sub]");
  const player = document.querySelector("[data-player]");
  if (titleEl && title) titleEl.textContent = title;
  if (subEl) subEl.textContent = on ? "GATEFOLD · OPEN" : window.Audio36 && window.Audio36.current() ? "GATEFOLD · HELD" : "GATEFOLD · CLOSED";
  if (toggle) {
    toggle.textContent = on ? "PAUSE" : "PLAY";
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (deck) deck.removeAttribute("hidden");
  document.body.setAttribute("data-audio", on ? "playing" : window.Audio36 && window.Audio36.current() ? "paused" : "idle");
  document.documentElement.style.setProperty("--sum", on ? "1" : "0");
  if (player) {
    player.hidden = !on;
    const t = player.querySelector("[data-player-title]");
    if (t && title) t.textContent = title;
  }
}

function initAudio() {
  if (!window.Audio36) return;
  const player = document.querySelector("[data-player]");
  const vol = document.querySelector("[data-deck-vol]");
  if (vol && window.Audio36.setVolume) {
    vol.addEventListener("input", () => {
      window.Audio36.setVolume(Number(vol.value));
    });
  }
  const toggle = document.querySelector("[data-deck-toggle]");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const cur = window.Audio36.current();
      if (cur && document.body.getAttribute("data-audio") === "playing") {
        window.Audio36.pause();
        syncDeck(false, document.querySelector("[data-deck-title]") && document.querySelector("[data-deck-title]").textContent);
        return;
      }
      if (cur && document.body.getAttribute("data-audio") === "paused") {
        window.Audio36.resume();
        syncDeck(true);
        return;
      }
      const heroPlay = document.querySelector("[data-play]");
      const name = (heroPlay && heroPlay.getAttribute("data-play")) || "silk";
      const title = (heroPlay && heroPlay.getAttribute("data-title")) || "SILK ON THE 808";
      const on = window.Audio36.play(name);
      syncDeck(on, title);
    });
  }
  document.addEventListener("click", (e) => {
    const pulseEl = e.target.closest(".btn, .play, .brand");
    if (pulseEl && !pulseEl.hasAttribute("data-skip-cinematic") && !e.target.closest("[data-play]")) {
      window.__mixPulseAt = performance.now();
    }
    const btn = e.target.closest("[data-play]");
    if (!btn || btn.hasAttribute("data-deck-toggle")) return;
    const name = btn.getAttribute("data-play");
    const title = btn.getAttribute("data-title");
    const on = window.Audio36.play(name);
    document.querySelectorAll("[data-play]").forEach((el) => {
      el.classList.remove("is-on");
      if ((el.tagName === "BUTTON" || el.classList.contains("play")) && !el.hasAttribute("data-deck-toggle")) {
        el.textContent = el.closest(".channel") ? "ARM" : "PLAY";
      }
    });
    if (on) {
      btn.classList.add("is-on");
      if (!btn.hasAttribute("data-deck-toggle")) btn.textContent = "STOP";
      const card = btn.closest(".channel, .work");
      if (card) {
        const idx = Number(card.getAttribute("data-work"));
        window.__workLock = Number.isFinite(idx) ? idx : window.__workLock;
        document.querySelectorAll(".channel, .work").forEach((w) => w.classList.toggle("is-locked", w === card));
      }
    }
    syncDeck(on, title);
  });

  const bar = document.querySelector("[data-deck-bar]");
  if (bar && !isAuditMode()) {
    const spin = () => {
      const on = document.body.getAttribute("data-audio") === "playing";
      const bpm = window.__mixBpm || 86;
      const t = (performance.now() / 1000) * (bpm / 60);
      const u = on ? (t % 8) / 8 : 0;
      bar.style.transform = "scaleX(" + u.toFixed(4) + ")";
      requestAnimationFrame(spin);
    };
    requestAnimationFrame(spin);
  }

  const SKETCHES = [
    { id: "silk", title: "SILK ON THE 808" },
    { id: "booth", title: "PRESSURE SKETCH 3" },
    { id: "hours", title: "AFTERIMAGE CHORDS" },
    { id: "crate", title: "GRID DIG" },
  ];
  function cycle(dir) {
    const cur = window.Audio36.current() || "silk";
    const i = Math.max(0, SKETCHES.findIndex((s) => s.id === cur));
    const next = SKETCHES[(i + dir + SKETCHES.length) % SKETCHES.length];
    const on = window.Audio36.play(next.id);
    syncDeck(on, next.title);
  }
  const prev = document.querySelector("[data-bus-prev]");
  const next = document.querySelector("[data-bus-next]");
  if (prev) prev.addEventListener("click", () => cycle(-1));
  if (next) next.addEventListener("click", () => cycle(1));
}

function wrapExperience(handle, engine) {
  window.__experience = {
    setScroll(p) {
      window.__mercuryScroll = p;
      if (handle && typeof handle.setScroll === "function") handle.setScroll(p);
    },
    pause() {
      if (handle && typeof handle.pause === "function") handle.pause();
    },
    resume() {
      if (handle && typeof handle.resume === "function") handle.resume();
    },
    ready: handle && handle.ready ? handle.ready : Promise.resolve(),
    destroy: handle && handle.destroy ? handle.destroy : () => {},
    engine,
  };
  return window.__experience.ready;
}

async function mountHero(root, canvas) {
  const getScroll = () => window.__mercuryScroll || 0;

  if (!shouldLoad3D()) {
    document.body.classList.add("is-no-webgl");
    if (canvas) {
      canvas.hidden = true;
      canvas.dataset.engine = "skipped";
    }
    if (root) root.hidden = true;
    return Promise.resolve();
  }

  if (root) {
    try {
      const { mountMix, isR3FAvailable } = await import("./r3f-mix.js");
      if (!isR3FAvailable()) throw new Error("R3F import map missing");
      const handle = await mountMix(root, { reduced, getScroll });
      wrapExperience(handle, "r3f");
      if (canvas) {
        canvas.hidden = true;
        canvas.dataset.engine = "r3f";
      }
      root.dataset.engine = "r3f";
      return handle.ready;
    } catch (err) {
      console.warn("R3F mix failed, falling back to Experience.", err);
    }
  }

  if (canvas) {
    try {
      const { default: Experience } = await import("./experience.js");
      canvas.hidden = false;
      const exp = new Experience(canvas);
      canvas.dataset.engine = "three";
      window.__experience = exp;
      gateCanvas(
        canvas,
        () => exp.resume && exp.resume(),
        () => exp.pause && exp.pause()
      );
      return exp.ready;
    } catch (err) {
      console.warn("WebGL failed.", err);
      canvas.hidden = true;
      canvas.dataset.engine = "fallback";
      document.body.classList.add("is-no-webgl");
    }
  } else {
    document.body.classList.add("is-no-webgl");
  }
}

async function boot() {
  sleepMotionForAudit();
  document.body.setAttribute("data-audio", "idle");
  initA11y();
  initYear();
  initNav();
  initCursor();
  initSeam();
  initForm();
  initAudio();
  initUxGate();

  let cms = null;
  try {
    cms = await loadCMS();
    bindTapes(cms.tapes);
    bindCredits(cms.credits);
    bindList("[data-cms-repeat='gear']", cms.studio && cms.studio.gear);
    bindList("[data-cms-repeat='rates']", cms.booking && cms.booking.rates);
    initSignalWorks();
  } catch (e) {
    console.warn("CMS fetch failed.", e);
  }

  initInteraction();
  initNavSpy();

  const canvas = document.querySelector("#hero-canvas");
  const mercuryRoot = document.querySelector("#mercury-root");
  const heroReady = Promise.resolve()
    .then(() => mountHero(mercuryRoot, canvas))
    .catch(() => {});

  const assets = Promise.all([readyFonts(), preloadImages(), heroReady]);
  initLenis();
  initTransitions({ gsap, reduced });
  await runLoader(assets);
  initHeroDepth();
  initScroll();
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
}

boot();
