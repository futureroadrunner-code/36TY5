# 36TY — THE MASTERING CONSOLE

Producer portfolio & sonic world for **36TY / Mario-Von Beckford**. Hip-hop / R&B.

## Concept
**THE MASTERING CONSOLE.** The website is the physical mastering & summing environment. Until PLAY, channels exist as unsummed stems. PLAY engages the master summing engine. Dual analog ballistic VU meters respond dynamically in 3D and UI. Hover/solo isolates a channel. Scroll is the arrangement timeline.

Retired: Kingston/Jamaica/GTA biography, waveform, write-head, signal spine, procedural landscape, cube villages.

## Stack
- **CMS:** `cms/content.json`
- **3D:** One React Three Fiber canvas (`js/r3f-mix.js`). Mastering console with dual ballistic VU meters, tactile channel strips, master fader. Single WebGL context.
- **Motion:** GSAP ScrollTrigger, Lenis
- **Audio:** Web Audio sketches (`js/audio.js`) — PLAY is the master summing engine

## Design
- Console position is the body. The master summing bus is the idea.
- Projects are channel strips, not a card grid.
- Booking `#connect` must work if WebGL dies.

## Dev
```bash
npm start # http://127.0.0.1:4173
```
