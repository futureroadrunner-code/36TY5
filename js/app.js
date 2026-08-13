import { loadCMS, bindTapes, bindCredits, bindList } from "./cms.js";
import Experience from "./experience.js";

const $ = window.jQuery;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const tram = window.tram;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stamps = ["ENTER", "BLOOM", "SIGNAL", "PRESSURE", "SEND", "PLAY"];

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

  $(document).on("mouseenter.36ty", "a, button, .work, .credit", function () {
    cursor.classList.add("is-hot");
    if (label) label.textContent = $(this).data("cursor") || "ENTER";
  });
  $(document).on("mouseleave.36ty", "a, button, .work, .credit", () => {
    cursor.classList.remove("is-hot");
    if (label) label.textContent = "ENTER";
  });

  $(document).on("click.36ty", (e) => {
    const word = stamps[Math.floor(Math.random() * stamps.length)];
    const burst = $('<span class="burst" aria-hidden="true"></span>').text(word);
    burst.css({
      position: "fixed",
      left: e.clientX + "px",
      top: e.clientY + "px",
      zIndex: 95,
      fontFamily: "Syne, sans-serif",
      fontSize: "12px",
      letterSpacing: "0.2em",
      color: "#7fe8e0",
      pointerEvents: "none",
      transform: "translate(-50%,-50%)",
    });
    $("body").append(burst);
    tram(burst[0]).add("opacity 0.55s ease").set({ opacity: 1 }).start({ opacity: 0 });
    setTimeout(() => burst.remove(), 600);
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

function initSignalWave() {
  const canvas = document.querySelector("[data-signal-wave]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const reducedLocal = reduced;
  let w = 0;
  let h = 0;
  let raf = 0;
  let t = 0;
  let progress = 0;

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    const pr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = w * pr;
    canvas.height = h * pr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const draw = () => {
    raf = requestAnimationFrame(draw);
    if (!reducedLocal) t += 0.016;
    ctx.clearRect(0, 0, w, h);
    const mid = h * 0.52;
    const amp = h * (0.08 + progress * 0.1);
    const lines = [
      { color: "rgba(127,232,224,0.55)", thick: 1.6, speed: 1, phase: 0 },
      { color: "rgba(62,184,176,0.28)", thick: 1.1, speed: 0.7, phase: 1.2 },
      { color: "rgba(232,242,244,0.12)", thick: 0.8, speed: 1.3, phase: 2.1 },
    ];
    lines.forEach((line) => {
      ctx.beginPath();
      ctx.lineWidth = line.thick;
      ctx.strokeStyle = line.color;
      for (let x = 0; x <= w; x += 4) {
        const n =
          Math.sin(x * 0.008 + t * line.speed + line.phase) * amp +
          Math.sin(x * 0.021 - t * 0.6 + line.phase) * amp * 0.35 +
          Math.sin(x * 0.0035 + t * 0.25) * amp * 0.2;
        const y = mid + n;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (line === lines[0]) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, mid - amp, 0, h);
        g.addColorStop(0, "rgba(94,224,208,0.1)");
        g.addColorStop(0.45, "rgba(94,224,208,0.03)");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fill();
      }
    });
  };
  draw();

  window.__signalWave = {
    setProgress(p) {
      progress = Math.max(0, Math.min(1, p));
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    },
  };
}

function initScroll() {
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

  // Seam dissolve into Signal
  const seam = document.querySelector("[data-seam]");
  if (seam && !reduced) {
    gsap.to(seam, {
      opacity: 0.25,
      y: -20,
      ease: "none",
      scrollTrigger: {
        trigger: "#signal",
        start: "top 95%",
        end: "top 45%",
        scrub: true,
      },
    });
  }

  // Signal chapter enter — wave amp + mercury float + freq bars
  const signal = document.querySelector("#signal");
  if (signal) {
    ScrollTrigger.create({
      trigger: signal,
      start: "top 75%",
      end: "bottom 40%",
      scrub: true,
      onUpdate: (self) => {
        if (window.__signalWave) window.__signalWave.setProgress(self.progress);
      },
      onEnter: () => {
        signal.querySelectorAll(".freq").forEach((f, i) => {
          setTimeout(() => f.classList.add("is-on"), i * 90);
        });
      },
    });

    const mercury = signal.querySelector("[data-signal-mercury]");
    if (mercury && !reduced) {
      gsap.fromTo(
        mercury,
        { scale: 0.88, opacity: 0.25 },
        {
          scale: 1,
          opacity: 0.7,
          ease: "none",
          scrollTrigger: {
            trigger: signal,
            start: "top 80%",
            end: "center center",
            scrub: true,
          },
        }
      );

      const mState = { x: 0, y: 0, tx: 0, ty: 0 };
      window.addEventListener(
        "pointermove",
        (e) => {
          mState.tx = (e.clientX / window.innerWidth - 0.5) * 2;
          mState.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        },
        { passive: true }
      );
      const mTick = () => {
        mState.x += (mState.tx - mState.x) * 0.06;
        mState.y += (mState.ty - mState.y) * 0.06;
        mercury.style.setProperty("--mx", (mState.x * 18).toFixed(2) + "px");
        mercury.style.setProperty("--my", (mState.y * 12).toFixed(2) + "px");
        requestAnimationFrame(mTick);
      };
      mTick();
    }

    if (!reduced) {
      gsap.from("[data-signal-line]", {
        y: 48,
        opacity: 0,
        duration: 1.05,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: signal, start: "top 70%" },
      });
    }
  }

  gsap.utils.toArray("[data-chapter]").forEach((section, i) => {
    const tones = [
      "rgba(94,224,208,0.06)",
      "rgba(62,184,176,0.07)",
      "rgba(126,232,224,0.05)",
      "rgba(42,138,136,0.08)",
    ];
    gsap.to(document.body, {
      "--chapter-glow": tones[i % tones.length],
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        end: "bottom 40%",
        scrub: true,
      },
    });
  });

  const heroMark = document.querySelector(".hero__mark");
  if (heroMark && !reduced) {
    gsap.to(heroMark, {
      "--scroll-y": "-12vh",
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
    const section = document.querySelector("#works");
    const track = document.querySelector(".works__track");
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
      err.removeAttr("hidden").text("Name, a real email, and the feeling.");
      return;
    }
    const to = form.getAttribute("data-mailto") || "booking@36ty.world";
    const body = encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n\n" + intent);
    window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("36TY — " + name) + "&body=" + body;
    ok.removeAttr("hidden");
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
    $("[data-play]").removeClass("is-on").text("PLAY");
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
  initSeam();
  initForm();
  initAudio();

  let cms = null;
  try {
    cms = await loadCMS();
    bindTapes(cms.tapes);
    bindCredits(cms.credits);
    bindList("[data-cms-repeat='gear']", cms.studio && cms.studio.gear);
    bindList("[data-cms-repeat='rates']", cms.booking && cms.booking.rates);
  } catch (e) {
    console.warn("CMS fetch failed.", e);
  }

  const canvas = document.querySelector("#hero-canvas");
  const heroReady = canvas
    ? Promise.resolve()
        .then(() => {
          try {
            window.__experience = new Experience(canvas);
            canvas.dataset.engine = "three";
            return window.__experience.ready;
          } catch (err) {
            console.warn("WebGL failed.", err);
            canvas.hidden = true;
            canvas.dataset.engine = "fallback";
          }
        })
        .catch(() => {})
    : Promise.resolve();

  const assets = Promise.all([readyFonts(), preloadImages(), heroReady]);
  initLenis();
  await runLoader(assets);
  initHeroDepth();
  initSignalWave();
  initScroll();
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
}

boot();
