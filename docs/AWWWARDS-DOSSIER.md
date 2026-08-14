# 36TY — Awwwards dossier

Human side-by-side vs [Igloo](https://www.igloo.inc/) and [Lando Norris](https://landonorris.com/). Written for the lead, not the jury PDF.

**Jury math we are losing on:** Awwwards scores Design, Usability, Creativity, and **Content**. Content is sitting at ~10%. SOTD bounces happen when the hero is empty — a 3D stage with no story after the spectacle, so the juror never gets a reason to keep scrolling.

Igloo and Lando do not win because they are “more 3D.” They win because **scroll tells a full story with real media.**

---

## Side by side

| | **Igloo** (SOTY 2024) | **Lando Norris** (2025) | **36TY now** | **36TY after this build** |
|---|---|---|---|---|
| Open | Ice as UI. You are already inside the material. | “Load Norris.” Character boots before the résumé. | Loader → monumental mark → “Start a session.” | Loader → mercury as brand object → **problem**, not a CTA. |
| Scroll spine | Three inhabited sections. Immersive **and** navigable. | Vertical drive. On track / off track / helmet hall. | Signal / Works / Space / Connect. Four labels, thin copy. | **Pressure → session → mix → trust.** Four beats, one arc. |
| Hero object | Procedural ice WebGL — the product *is* the interface. | Helmet hall with real one-offs (Discoball, Chrome, Silverstone). | Mercury bloom / helmet fallback. Often reads as empty stage. | Same mercury, now **named**: the mix as a body you can walk around. |
| Proof | Brand, set, photography, video — a produced world. | Real stats, real race stills (Qatar, Miami, Monaco, Britain). | Tape art + Web Audio sketches. Credits read like fiction. | Sketches stay honest. Captions treat tapes as works, not décor. **No Billboard #1 claims.** |
| Close | Still a site you can move through, not a dead canvas. | Store, partners, socials — fandom with exits. | HTML booking form (this is already a win we under-use). | Form stays HTML. Mailto still works if WebGL dies. |
| SOTD texture | **7.92 SOTD**, then SOTY 2024. Ice you can inhabit. | Load sequence + evidence. You believe the driver. | Content 10%. Bounce when hero is empty. | Story in the DOM. 3D as object, not as the whole site. |

---

## What Igloo actually does (and why jurors stay)

[igloo.inc](https://www.igloo.inc/) is almost no document. The live page is a WebGL body — procedural ice as UI, not a hero stuck on top of a marketing template. **SOTY 2024.** **7.92 SOTD.** Three-section scroll: you travel *through* material, then you can still navigate. Immersive **and** usable.

The lesson is not “go full canvas.” The lesson is **one material, one journey, no leftover chrome.** Ice is the brand. Three chapters is enough if each chapter is a place.

36TY’s equivalent material is mercury — fluid, chrome, condensation — already in the Mercury Bloom hero. It only scores if the scroll around it is a story, not four section titles.

## What Lando actually does (and why jurors believe)

[landonorris.com](https://landonorris.com/) opens as a **vertical drive**. “Please rotate your device — this is a vertical drive.” Then **Load Norris** — a character load, not a page load. Then evidence: on track (results, stats, trackside photos), off track (campaigns, shoots), **Helmets Hall of Fame** (blobs, one-offs, real objects). Qatar 2024. Miami GP. Monaco. Britain 2025. A line from Lando, then the hall.

The lesson is not “fake a championship museum.” The lesson is **load a person, then prove the life with media.** Helmets are not decoration; they are a collection. Photos are not texture; they are dates.

36TY cannot photocopy F1 stills. We *can* photocopy the spine: load the practice, then prove the day with session language, playable sketches, and a lock that is actually bookable.

## What 36TY does now (the Content 10% problem)

The site is **“Open a session” energy**.

- Hero: FREQUENCY MADE FLESH + Start a session / Hear works.
- Signal: two poetic paragraphs. No problem.
- Works: four tapes with blurbs. No captions. Sketches exist and are under-credited as media.
- Collabs: names that read as fictional. Fine as a room roll — fatal if they pretend to be a chart.
- Space: gear list. Atmosphere without a day.
- Connect: rates + form. The trust close arrives before trust has been earned.

There is no **problem → session → mix → trust** arc. A juror who survives an empty hero lands in labels. That is a Content bounce.

Honest capabilities (say only these): custom beats, live and remote sessions, leases and exclusives, sync cues, Web Audio sketches on the site. Do not invent chart positions, streams, or Billboard #1s.

---

## Craft wins we can claim *after* the new build

Three. Not five. These are true once the beats are in the page and the hero is treated as an object, not a screensaver.

### 1. Scroll narrative

Four beats in `cms/content.json` → `narrative.beats[]`:

1. **The template is the weather.** — pressure / problem  
2. **The day is the session.** — live or remote, drums first  
3. **The mix is a landscape.** — mercury as the mix, made visible  
4. **The lock is the relationship.** — leases, exclusives, sync, HTML booking  

This is Igloo’s three-section completeness and Lando’s on/off-track evidence, written for a producer. The juror can skip (`Skip story — hear works`) and still understand there was a story. That is Content *and* Usability.

### 2. Mercury 3D as brand object

Igloo: ice is the UI. Lando: helmets are a hall. 36TY: mercury bloom is the mix — a body of sound you walk around, not a void behind the wordmark.

Fallback is already real: Three.js `models/helmet.gltf` / Mercury Bloom when Spline is empty. The craft win is **naming the object in the story**, so an empty-looking canvas reads as the brand, not as a missing asset.

### 3. Booking still HTML-usable

Igloo’s document is ~3KB of HTML and a WebGL runtime. Beautiful. Fragile for a booking CTA.

36TY keeps the connect form in the DOM: name, email, brief, mailto `booking@36ty.world`. Rates stay CMS. If the canvas fails, if Spline never publishes, if a juror is on a phone with reduced motion — they can still send. That is the Usability insurance Igloo does not need (they are not selling sessions) and Lando solves with store/social exits.

---

## Honest gaps (two)

### 1. No real film / photography shoot

Lando has trackside and campaign stills with places and years. Igloo had set design, photography, and video in the brand launch. 36TY does not. Tape PNGs and a parametric / mercury hero are not a shoot. Do not caption them as if they were. Do not storyboard a “Bed-Stuy cinema” we have not lit.

Until there is a real still or a real room film, **the playable sketches are the media.** Captions should sound like liner notes, not like a lookbook.

### 2. No published Spline `.splinecode` yet

`cms.spline.sceneUrl` is an empty-string placeholder on purpose. `docs/SPLINE.md` is the wire. Until a published URL lands, the hero is Three.js — which is a working fallback, not a Spline case study. Do not tell the jury we shipped a Spline scene. Tell them the object is live in WebGL and Spline is the next publish.

---

## How Content climbs without lying

- Lead with the **problem**, not the CTA.  
- Let Works carry **captions** (liner notes) plus the existing Web Audio sketches.  
- Keep the collab roll as a **room list**, never as awards.  
- Close on **leases / exclusives / sync / session** — capabilities we actually sell.  
- Keep skip links and the booking form in HTML.

Igloo won by making ice a place. Lando won by making a driver a load, then proving it. 36TY wins Content when the scroll is a session: pressure, the day, the landscape, the lock.

---

## Lead review — 2026-08-13 (local `http://127.0.0.1:4174`)

Workspace is **36TY**, not DaVision. Field `/app` gates mapped to BOOK skip + HTML booking. Firebase MCP was in `error`; production `davision-f9a1e.web.app` was not this repo.

### Live UI/Transitions checklist (1–5)

| Item | Score | Note |
|---|---|---|
| First impression / art direction | 4.4 | Syne + Instrument Serif + mercury void. Mark dominates. 3D confirmed `engine=r3f`. |
| Typography & layout craft | 4.3 | No Inter. Caption serif. Hairline surfaces. |
| Scroll storytelling & parallax | 4.4 | 4 pinned beats, 17 ScrollTriggers, bg/mid/fg parallax. |
| Page / section transitions | 4.2 | Ice `#route-veil` on hash nav; reduced-motion instant. |
| Hover & micro-interactions | 4.2 | Shared wipe/press/magnet. Arcade click-stamps removed. |
| 3D / WebGL quality | 4.3 | Displaced icosahedron + transmission + ribbons. Spline `.splinecode` **not** published. |
| Navigation simplicity | 4.5 | STORY / WORKS / CONNECT + BOOK skip. |
| Performance feel | 4.0 | `shouldLoad3D` gate, idle pause, fallback Experience. Not Lighthouse-proven. |
| Content depth / narrative | 4.2 | Problem→session→mix→trust. Tape captions. Studio still. Collab names still read as a room list, not proof. |
| Mobile parity | 3.8 | Menu + BOOK. Horizontal works pin desktop-only. Not device-tested. |

**Average ~4.23 / 5** — below the 4.5 pass line until Spline publish, real photography, Lighthouse mobile, and a stable hosting URL.

### Three craft wins vs Igloo/Lando

1. Mercury is a named brand object (Igloo: ice is UI; Lando: helmets are a hall).
2. Scroll is a four-beat session story, not a CTA stack.
3. Booking remains HTML — WebGL can die and the form still sends.

### Two honest gaps

1. No published `.splinecode` (C6 FAIL). R3F mimics Spline-class materials.
2. No shoot: tape covers are generated stills; Lando/Igloo have produced photography.

### Gate honesty

SOTY-candidate is a jury outcome. This build makes nomination *plausibly discussable* for a producer site. It does **not** pass every process/live gate in the DaVision brief.
