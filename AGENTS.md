# 36TY — Cloud Agent brief

Producer landing page for **36TY**. Cinematic life journey: **Jamaica → Toronto**.

## Stack
- **CMS:** `cms/content.json`
- **3D:** one React Three Fiber canvas (`js/r3f-journey.js`). Vanilla Three.js `js/experience.js` is fallback only. No Spline. No second WebGL context.
- **Motion:** GSAP ScrollTrigger, Lenis
- **Audio:** Web Audio tape sketches (`js/audio.js`) — PLAY begins the journey

## Design direction
- Landscape is the interface. Camera is the protagonist. Scroll is travel.
- Jamaica: lived-in origin (zinc, hills, heat, sound-system climate) — not tourism.
- Toronto: brick, grid, night bus, winter air — not a skyline screensaver.
- Booking is HTML (`#connect`) and must work if WebGL dies.

## Dev
```bash
npm start          # http://127.0.0.1:4173
```

Do not revive Pocket Signal / waveform / write-head.

## Open work
- Firebase Hosting deploy (`firebase.json` ready)
- Lighthouse evidence (prior CLI hangs — diagnose, do not treat UNVERIFIED as pass)
