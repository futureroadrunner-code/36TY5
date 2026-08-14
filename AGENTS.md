# 36TY — THE GATEFOLD

Producer site for **36TY / Mario-Von Beckford**. Hip-hop / R&B.

## Concept
The album cover is a door. Until PLAY it is a closed object. PLAY opens the gatefold. Scroll walks the inner sleeves. Booking is the back cover (`#connect`) and stays HTML if WebGL dies.

Retired: geographic biography, waveform/write-head, mastering-console hardware as the idea.

## Stack
- CMS: `cms/content.json`
- 3D: one R3F canvas (`js/r3f-mix.js`) — cover halves + interior rooms
- Motion: GSAP ScrollTrigger, Lenis
- Audio: `js/audio.js`

## Dev
```bash
npm start # http://127.0.0.1:4173
```
