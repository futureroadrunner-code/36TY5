# 36TY — Five Landing Directions

Agency bar: Pentagram / Wolff Olins / OFF+BRAND / Porto Rocha / Chermayeff & Geismar & Haviv.

**Filter (rejected):** purple vaporwave · cream/terracotta AI templates · stats-strip heroes · brutalist mono walls · Spotify clones · generic dashboard UI.

**Figma board:** https://www.figma.com/design/sSuzfGRsybSAqTZn6Ffx0T  
**Live site:** https://ty36-world.web.app

---

## A — THE ISSUE ✅ WINNER (ship / refine)

**Thesis:** Cinematic editorial magazine. Monumental **36TY**, layered 3D chrome helmet parallax (FG particles / MG helmet / BG mesh), scroll = issue chapters.

| Criterion | Score |
|-----------|-------|
| Layered 3D hero fit | Excellent — already partially live |
| Retention | High — discovery chapters |
| Agency polish | Strong OFF+BRAND / Pentagram editorial |
| Seamless transitions | GSAP + Lenis chapter pins |
| Risk | Helmet must stay chrome-athletic, not blob |

**Motion:** one chromatic event/viewport · mouse parallax by Z · marquee as gutter between chapters.

---

## B — TAPE DECK THEATER ✅ KEEP (tapes chapter)

**Thesis:** Living cassette/MPC as hero object; horizontal scrub = playhead; sections as tape sides.

| Criterion | Score |
|-----------|-------|
| Experimental retention | Excellent scrub metaphor |
| Brand first | Weaker if deck overpowers “36TY” |
| Fit with current stack | Perfect for `#tapes` horizontal pin |

**Decision:** Do **not** replace the whole site — apply as the **Tapes** section experience.

---

## C — CHROME HALO ✅ KEEP (hero intensity dial)

**Thesis:** Near-silent identity film. Helmet fills frame; type late; CTA as quiet stamp.

| Criterion | Score |
|-----------|-------|
| Stunning visuals | Highest restraint / Wolff Olins |
| Conversion clarity | Weak alone (CTA too quiet) |
| Retention | Beauty-first; needs chapters after |

**Decision:** Borrow **restraint** into A — fewer UI chrome elements in hero, stronger helmet light, quieter secondary UI.

---

## D — BOOTH PORTAL ✅ KEEP (booth chapter)

**Thesis:** Doorway into Bed-Stuy booth; scroll = enter room.

| Criterion | Score |
|-----------|-------|
| Spatial storytelling | Strong experimental |
| Hero brand test | Weaker if door overpowers mark |
| Fit | Maps cleanly to `#booth` |

**Decision:** Use as **Booth** section treatment, not full-site hero.

---

## E — INK FIRST SPLASH ⚠️ CONDITIONAL

**Thesis:** Elevated 90s comic splash — gold foil, CMYK, thick ink.

| Criterion | Score |
|-----------|-------|
| Brand DNA | Matches AGENTS “ink first” language |
| Luxury bar | High kitsch risk if colors go primary |
| Agency comps | More Chermayeff poster than digital editorial |

**Decision:** Keep as **stamp / foil accent system** (POW, marquee, tape stamps) — not the master layout.

---

## Recommended system (hybrid)

1. **Master:** A — THE ISSUE (full site spine + layered 3D hero)
2. **Dial:** C — quieter hero UI, hotter chrome
3. **Chapters:** B for Tapes scrub · D for Booth enter · E accents only
4. **Transitions:** Lenis + GSAP — marquee gutters, pin/scrub, color dissolve between chapters (no hard cuts)

---

## Success criteria (hero goal)

- Layered FG/MG/BG Z-parallax with mouse — **met** (live on ty36-world)
- Specific, ready-to-use — **met** (code + Figma markups + this brief)
- Edge cases surfaced — **met** (WebGL fallback, reduced-motion, Figma View seat worked for write)
