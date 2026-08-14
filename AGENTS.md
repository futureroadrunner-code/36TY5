# 36TY — Cloud Agent brief

Producer landing page for **36TY** / **Mario-Von Beckford**. Hip-hop / R&B.

## Concept (locked)
**THE 2-BUS.** The website is the master bus. Until PLAY, channels exist as unsummed stems. PLAY sums the mix. Hover/solo isolates a channel. Scroll is the arrangement (playhead), not geography.

Retired: Kingston/Jamaica/GTA biography, waveform, write-head, signal spine, procedural landscape, cube villages.

## Stack
- **CMS:** `cms/content.json`
- **3D:** one React Three Fiber canvas (`js/r3f-mix.js`). Vanilla Three.js `js/experience.js` is fallback only. No Spline. No second WebGL context.
- **Motion:** GSAP ScrollTrigger, Lenis
- **Audio:** Web Audio sketches (`js/audio.js`) — PLAY is the 2-bus

## Design
- Mix position is the body. The 2-bus is the idea.
- Projects are channel strips, not a card grid.
- Booking `#connect` must work if WebGL dies.

## Dev
```bash
npm start # http://127.0.0.1:4173
```
