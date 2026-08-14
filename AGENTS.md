# 36TY — THE GATEFOLD

Producer site for **36TY / Mario-Von Beckford**. Hip-hop / R&B.

## Concept
The album cover is a door. Until PLAY the record is closed. PLAY opens the gatefold and the camera enters. After PLAY the record is a continuous world — not four photo planes. Booking is the back cover (`#connect`) and stays HTML if WebGL dies.

Retired: geographic biography, waveform/write-head, mastering-console hardware, DAW/mixer/EQ, generic particle field.

## Stack
- CMS: `cms/content.json`
- 3D: one R3F canvas (`js/r3f-mix.js`) — physical gatefold + one authored interior
- Motion: GSAP ScrollTrigger, Lenis
- Audio: `js/audio.js` — PLAY begins the journey; music influences light and atmosphere, not a visualizer

## Dev
```bash
npm start # http://127.0.0.1:4173
```
