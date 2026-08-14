# 36TY — Cloud Agent brief

Producer landing page for **36TY** / **Mario-Von Beckford**. Interactive visual biography: **Kingston → Mississauga → Brampton → Etobicoke → Music → Future**.

## Concept (locked)
**World A + C**, with **E as DNA** and **D as PLAY climate**.
Continuous cinematic landscape. Time of day travels with the life. Kingston thins — it does not unload. PLAY changes weather weight, not a visualizer.
See `docs/FOUR-WORLDS.html`.

## Stack
- **CMS:** `cms/content.json`
- **3D:** one React Three Fiber canvas (`js/r3f-journey.js`). Vanilla Three.js `js/experience.js` is fallback only. No Spline. No second WebGL context.
- **Motion:** GSAP ScrollTrigger, Lenis
- **Audio:** Web Audio tape sketches (`js/audio.js`) — PLAY begins the journey

## Design direction
- Landscape is the interface. Camera is the protagonist. Scroll is travel. Music is the constant.
- Kingston: lived-in origin (zinc, hills, heat) — not tourism.
- Mississauga / Brampton: distinct Ontario chapters — arrival then development.
- Etobicoke: present-tense Toronto — brick, night light — not a skyline screensaver.
- Booking is HTML (`#connect`) and must work if WebGL dies.
- Do not invent biographical facts beyond verified place → producer → hip-hop/R&B versatility.

## Dev
```bash
npm start          # http://127.0.0.1:4173
```

Do not revive Pocket Signal / waveform / write-head.

## Open work
- Firebase Hosting deploy (`firebase.json` ready)
- Lighthouse evidence (prior CLI hangs — diagnose, do not treat UNVERIFIED as pass)
