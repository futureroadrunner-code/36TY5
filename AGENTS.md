# 36TY — Cloud Agent brief

Producer landing page for **36TY** (Brooklyn hip-hop / R&B).

## Stack
- **CMS:** `cms/content.json` (Webflow-style field binding)
- **3D hero:** Spline runtime when `cms.spline.sceneUrl` is set; else Three.js `models/helmet.gltf`
- **Motion:** GSAP ScrollTrigger, Lenis, Tram.js, jQuery custom cursor
- **Audio:** Web Audio tape sketches (`js/audio.js`)

## Design direction
- **Not brutalist** — cinematic editorial luxury (velvet void, gold/chrome, soft halftone)
- 90s hip-hop + R&B + 90s comics, still modern
- OFF+BRAND-adjacent: discovery UX, monumental type, one chromatic event per viewport

## Dev
```bash
npm start          # http://127.0.0.1:4173
npm run helmet     # rebuild parametric glTF
```

## Spline
See `docs/SPLINE.md`. Paste published `.splinecode` URL into `cms/content.json` → `spline.sceneUrl`.

## Open work
- Publish Spline helmet scene and wire `sceneUrl`
- Firebase Hosting deploy (`firebase.json` ready)
- Mobile tape scroll polish
