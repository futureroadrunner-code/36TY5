import { loadCMS, bindTapes, bindCredits, bindList, bindStats } from "./cms.js";
import Experience from "./experience.js";
import { mountSplineScene, isSplineSceneUrl } from "./spline-scene.js";

const $ = window.jQuery;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const Lenis = window.Lenis;
const tram = window.tram;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stamps = ["KNOCK", "SILK", "POW", "CRATE", "BOOM", "VELVET"];

function readyFonts() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return document.fonts.ready.catch(() => {});
}

function preloadImages() {
  const imgs = Array.from(document.images).filter((img) => img.src);
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return img.decode().catch(() => {});
    })
  );
}

function runLoader(ready) {
  const loader = document.querySelector(".loader");
  const num = document.querySelector("[data-loader-count]");
  if (!loader) return Promise.resolve();
  let n = 0;
  let assets = false;
  ready.then(() => {
    assets = true;
  });
  return new Promise((resolve) => {
    const tick = () => {
      const cap = assets ? 100 : 86;
      n = Math.min(cap, n + (reduced ? 50 : 1.6 + Math.random() * 2.2));
      if (num) num.textContent = String(Math.floor(n)).padStart(3, "0");
      loader.style.setProperty("--p", n / 100);
      if (n < 100) requestAnimationFrame(tick);
      else {
        tram(loader).add("opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)").start({ opacity: 0 });
        setTimeout(() => {
          loader.setAttribute("hidden", "");
          document.body.classList.add("is-ready");
          resolve();
        }, reduced ? 0 : 720);
      }
    };
    tick();
  });
}

function initLenis() {
  const LenisCtor = window.Lenis || window.lenis;
  if (!LenisCtor || reduced) return null;
  const lenis = new LenisCtor({ lerp: 0.09, smoothWheel: true, syncTouch: false });
  window.__lenis = lenis;
  if (gsap && ScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
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
  if (!cursor || !window.matchMedia("(pointer: fine)").matches) {
    if (cursor) cursor.remove();
    return;
  }
  document.body.classList.add("has-cursor");
  const ring = cursor.querySelector(".cursor__ring");
  const label = cursor.querySelector(".cursor__label");
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;

  $(document).on("mousemove.36ty", (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });

  const loop = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    tram(cursor).set({ transform: "translate3d(" + x + "px," + y + "px,0)" });
    requestAnimationFrame(loop);
  };
  loop();

  $(document).on("mouseenter.36ty", "a, button, .tape, .credit", function () {
    cursor.classList.add("is-hot");
    if (label) label.textContent = $(this).data("cursor") || "ENTER";
  });
  $(document).on("mouseleave.36ty", "a, button, .tape, .credit", () => {
    cursor.classList.remove("is-hot");
    if (label) label.textContent = "KNOCK";
  });

  $(document).on("click.36ty", (e) => {
    const word = stamps[Math.floor(Math.random() * stamps.length)];
    const burst = $('<span class="burst" aria-hidden="true"></span>').text(word);
    burst.css({ left: e.clientX + "px", top: e.clientY + "px" });
    $("body").append(burst);
    tram(burst[0])
      .add("transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)")
      .set({ opacity: 1, transform: "translate(-50%,-50%) scale(0.4) rotate(-8deg)" });
    requestAnimationFrame(() => {
      tram(burst[0]).start({ opacity: 0, transform: "translate(-50%,-120%) scale(1.15) rotate(8deg)" });
    });
    setTimeout(() => burst.remove(), 700);
    if (ring) {
      ring.classList.add("is-punch");
      setTimeout(() => ring.classList.remove("is-punch"), 280);
    }
  });
}

function initMarquee() {
  const row = document.querySelector(".marquee__track");
  if (!row || row.dataset.cloned) return;
  row.innerHTML = row.innerHTML + row.innerHTML;
  row.dataset.cloned = "1";
}

/** DOM depth parallax — CSS vars so scroll tweens can compose */
function initHeroDepth() {
  const hero = document.querySelector("[data-hero]");
  if (!hero || reduced) return;
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
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: reduced ? 0 : 48,
      opacity: 0,
      duration: reduced ? 0.01 : 1.05,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });

  gsap.utils.toArray("[data-parallax]").forEach((el) => {
    const depth = parseFloat(el.getAttribute("data-parallax")) || 0.2;
    gsap.to(el, {
      yPercent: reduced ? 0 : depth * 55,
      ease: "none",
      scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  const heroMark = document.querySelector(".hero__mark");
  if (heroMark && !reduced) {
    gsap.to(heroMark, {
      "--scroll-y": "-14vh",
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => {
      if (window.__experience) window.__experience.setScroll(self.progress);
    },
  });

  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
    const section = document.querySelector("#tapes");
    const track = document.querySelector(".tapes__track");
    if (!section || !track) return;
    const tween = gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth + 48),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => "+=" + Math.max(track.scrollWidth, window.innerWidth),
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    return () => tween.kill();
  });
}

function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  if (!toggle || !panel) return;
  toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
    tram(panel)
      .add("transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)")
      .start({ transform: open ? "translateY(0%)" : "translateY(-110%)" });
  });
  panel.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      tram(panel).add("transform 0.4s ease").start({ transform: "translateY(-110%)" });
    })
  );
}

function initForm() {
  const form = document.querySelector("[data-booking]");
  if (!form || !$) return;
  $(form).on("submit", function (e) {
    e.preventDefault();
    const name = $.trim($("#bk-name").val());
    const email = $.trim($("#bk-email").val());
    const intent = $.trim($("#bk-intent").val());
    const err = $("[data-form-error]");
    const ok = $("[data-form-ok]");
    err.attr("hidden", true);
    if (!name || !email || !intent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.removeAttr("hidden").text("Name, a real email, and the feeling. That's the bar.");
      return;
    }
    const to = form.getAttribute("data-mailto") || "booking@36ty.world";
    const body = encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n\n" + intent);
    window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("36TY booth — " + name) + "&body=" + body;
    ok.removeAttr("hidden");
    tram(ok[0]).add("opacity 0.4s ease").set({ opacity: 0 }).start({ opacity: 1 });
    this.reset();
  });
}

function initYear() {
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = String(new Date().getFullYear());
}

function initAudio() {
  if (!$ || !window.Audio36) return;
  const player = document.querySelector("[data-player]");
  $(document).on("click", "[data-play]", function () {
    const name = $(this).attr("data-play");
    const title = $(this).attr("data-title");
    const on = window.Audio36.play(name);
    $("[data-play]").removeClass("is-on").text("PLAY SKETCH");
    if (on) {
      $(this).addClass("is-on").text("STOP");
      if (player) {
        player.hidden = false;
        const t = player.querySelector("[data-player-title]");
        if (t) t.textContent = title;
      }
    } else if (player) player.hidden = true;
  });
}

async function boot() {
  initYear();
  initNav();
  initCursor();
  initMarquee();
  initForm();
  initAudio();

  let cms = null;
  try {
    cms = await loadCMS();
    bindTapes(cms.tapes);
    bindCredits(cms.credits);
    bindStats(cms.manifesto && cms.manifesto.stats);
    bindList("[data-cms-repeat='gear']", cms.studio.gear);
    bindList("[data-cms-repeat='rates']", cms.booking.rates);
  } catch (e) {
    console.warn("CMS fetch failed — using in-DOM copy.", e);
  }

  const canvas = document.querySelector("#helmet-canvas");
  const splineCfg = (cms && cms.spline) || {};
  const useSpline =
    splineCfg.enabled !== false && isSplineSceneUrl(splineCfg.sceneUrl || "");

  const helmetReady = canvas
    ? Promise.resolve().then(async () => {
        if (useSpline) {
          try {
            window.__splineMount = await mountSplineScene(canvas, {
              sceneUrl: splineCfg.sceneUrl,
              objectName: splineCfg.objectName || "Helmet",
              reduced,
            });
            canvas.dataset.engine = "spline";
            return;
          } catch (err) {
            console.warn("Spline scene failed — falling back to Three.js helmet.", err);
          }
        }
        window.__experience = new Experience(canvas);
        canvas.dataset.engine = "three";
        return window.__experience.ready;
      })
    : Promise.resolve();

  const assets = Promise.all([readyFonts(), preloadImages(), helmetReady]);
  initLenis();
  await runLoader(assets);
  initHeroDepth();
  initScroll();
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
}

boot();
