/**
 * 36TY cinematic scroll — GSAP ScrollTrigger + Lenis (ticker proxy lives in app.js).
 *
 * initMotion({ gsap, ScrollTrigger, reduced })
 *   → sets up parallax, pinned story beats, chapter veils
 *   → returns cleanup() that kills every ScrollTrigger / tween created here
 *
 * Beat map (4 beats, scrubbed, ease none):
 *   0 SIGNAL   t 0.00–1.00  --beat 0→1  --story-p 0.00–0.33
 *   1 PRESSURE t 1.00–2.00  --beat 1→2  --story-p 0.33–0.66
 *   2 BLOOM    t 2.00–3.00  --beat 2→3  --story-p 0.66–1.00
 *   3 SEND     holds after last crossfade (copy stays; progress completes)
 *
 * prefers-reduced-motion: no pins, no parallax, opacity 1 (instant).
 */

export const PARALLAX_RATES = {
  bg: { yPercent: 28 },
  mid: { yPercent: 12 },
  fg: { yPercent: -18 },
};

/** @type {{ id: number, name: string, at: number, copy: string }[]} */
export const BEAT_MAP = [
  { id: 0, name: "SIGNAL", at: 0, copy: "Frequency / origin — the room comes into focus." },
  { id: 1, name: "PRESSURE", at: 1, copy: "The pocket — drums that sit like weather." },
  { id: 2, name: "BLOOM", at: 2, copy: "Silk in the mids — melody that fogs the glass." },
  { id: 3, name: "SEND", at: 3, copy: "The handoff — send the feeling, start a session." },
];

const FADE = 0.42;

function ensureMotionCss() {
  if (document.querySelector('link[href*="motion.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../css/motion.css", import.meta.url).href;
  document.head.appendChild(link);
}

export function initMotion({ gsap, ScrollTrigger, reduced } = {}) {
  const triggers = [];
  const tweens = [];

  ensureMotionCss();

  if (!gsap || !ScrollTrigger) {
    return () => {};
  }

  gsap.registerPlugin(ScrollTrigger);

  const track = (tween) => {
    if (!tween) return tween;
    tweens.push(tween);
    if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    return tween;
  };

  const trackST = (st) => {
    if (st) triggers.push(st);
    return st;
  };

  const ctx = gsap.context(() => {
    if (reduced) {
      gsap.set("[data-parallax], [data-beat], [data-chapter]", {
        opacity: 1,
        autoAlpha: 1,
        y: 0,
        yPercent: 0,
        scale: 1,
        filter: "none",
        clipPath: "inset(0% 0% 0% 0%)",
      });
      const story = document.querySelector("#story");
      if (story) {
        story.style.setProperty("--beat", "0");
        story.style.setProperty("--story-p", "1");
        story.setAttribute("data-active-beat", "0");
      }
      gsap.utils.toArray("[data-chapter]").forEach((section) => {
        section.style.setProperty("--veil", "0");
      });
      return;
    }

    bindParallax(gsap, track);
    bindStory(gsap, ScrollTrigger, track, trackST);
    bindChapterVeils(gsap, track);
    bindMercuryFade(gsap, track);
  });

  return () => {
    triggers.forEach((st) => {
      if (st && typeof st.kill === "function") st.kill();
    });
    tweens.forEach((tw) => {
      if (tw && typeof tw.kill === "function") tw.kill();
    });
    ctx.revert();
    triggers.length = 0;
    tweens.length = 0;
  };
}

function bindParallax(gsap, track) {
  const layers = gsap.utils.toArray("[data-parallax]");
  layers.forEach((el, i) => {
    const key = (el.getAttribute("data-parallax") || "mid").toLowerCase();
    const rate = PARALLAX_RATES[key] || PARALLAX_RATES.mid;
    track(
      gsap.fromTo(
        el,
        { yPercent: -rate.yPercent * 0.35 },
        {
          yPercent: rate.yPercent,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            refreshPriority: -40 + i,
          },
        }
      )
    );
  });
}

function bindStory(gsap, ScrollTrigger, track, trackST) {
  const story = document.querySelector("#story");
  if (!story) return;

  const beats = gsap.utils
    .toArray(story.querySelectorAll("[data-beat]"))
    .sort((a, b) => Number(a.getAttribute("data-beat")) - Number(b.getAttribute("data-beat")));

  gsap.set(story, { "--beat": 0, "--story-p": 0 });
  story.setAttribute("data-active-beat", "0");

  if (!beats.length) {
    trackST(
      ScrollTrigger.create({
        trigger: story,
        pin: true,
        start: "top top",
        end: "+=280vh",
        scrub: true,
        anticipatePin: 1,
        refreshPriority: -20,
        onUpdate: (self) => {
          story.style.setProperty("--story-p", self.progress.toFixed(4));
        },
      })
    );
    return;
  }

  const last = beats.length - 1;
  const proxy = { beat: 0, p: 0 };

  const cheapMotion = window.matchMedia("(max-width: 899px)").matches;
  const hidden = {
    autoAlpha: 0,
    yPercent: 10,
    scale: 0.985,
    clipPath: "inset(16% 0 20% 0)",
  };
  const shown = {
    autoAlpha: 1,
    yPercent: 0,
    scale: 1,
    clipPath: "inset(0% 0% 0% 0%)",
  };
  const exiting = {
    autoAlpha: 0,
    yPercent: -8,
    scale: 0.99,
    clipPath: "inset(0 0 22% 0)",
  };
  if (!cheapMotion) {
    hidden.filter = "blur(10px)";
    shown.filter = "blur(0px)";
    exiting.filter = "blur(8px)";
  }

  beats.forEach((el, i) => {
    gsap.set(el, i === 0 ? shown : hidden);
  });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: story,
      pin: true,
      pinSpacing: true,
      start: "top top",
      end: "+=280vh",
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: -20,
    },
  });

  track(tl);

  tl.to(
    proxy,
    {
      beat: last,
      p: 1,
      duration: Math.max(last, 1),
      ease: "none",
      onUpdate: () => {
        story.style.setProperty("--beat", proxy.beat.toFixed(4));
        story.style.setProperty("--story-p", proxy.p.toFixed(4));
        story.setAttribute("data-active-beat", String(Math.round(proxy.beat)));
      },
    },
    0
  );

  if (last < 1) return;

  beats.forEach((el, i) => {
    if (i === 0) {
      tl.to(el, { ...exiting, duration: FADE, force3D: true }, 1 - FADE);
      return;
    }
    const t = i;
    tl.fromTo(el, { ...hidden }, { ...shown, duration: FADE, force3D: true }, t - FADE);
    if (i < last) {
      tl.to(el, { ...exiting, duration: FADE, force3D: true }, t + 1 - FADE);
    }
  });
}

function bindChapterVeils(gsap, track) {
  const chapters = gsap.utils
    .toArray("[data-chapter]")
    .filter((section) => !section.matches("#connect, #works, .connect, .works"));
  chapters.forEach((section, i) => {
    gsap.set(section, { "--veil": 0 });
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top 88%",
        end: "bottom 18%",
        scrub: true,
        refreshPriority: -10 + i,
      },
    });
    tl.fromTo(section, { "--veil": 0.58 }, { "--veil": 0, duration: 0.22 })
      .to(section, { "--veil": 0, duration: 0.56 })
      .to(section, { "--veil": 0.42, duration: 0.22 });
    track(tl);
  });
}

function bindMercuryFade(gsap, track) {
  if (!document.querySelector("#mercury-root")) return;
  track(
    gsap.to(
      {},
      {
        ease: "none",
        scrollTrigger: {
          trigger: "#connect",
          start: "top 80%",
          end: "top 30%",
          scrub: true,
          refreshPriority: -5,
          onUpdate: (self) => {
            window.__worldRecede = self.progress;
          },
        },
      }
    )
  );
}
