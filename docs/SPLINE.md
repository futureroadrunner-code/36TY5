# Spline 3D — 36TY hero integration

## MCP status

Spline MCP is configured in:

- Global: `~/.cursor/mcp.json`
- Project: `.cursor/mcp.json`

Server path (local Windows only): `C:\Users\Service 1\.cursor\mcp-servers\spline-mcp-server\index.js`

| Tool | Use |
|------|-----|
| `getRuntimeSetup` | Install + bootstrap `@splinetool/runtime` |
| `generateObjectCode` | Pointer/scroll rotation snippets for named objects |
| `generateEmbedCode` | iframe embed fallback |
| `generateSceneInteractionCode` | Event wiring for exported scenes |

### Cloud agent limitation

**Spline MCP is not available in the Linux cloud agent.** The MCP server is wired to Windows paths and cannot run server-side in Cursor Cloud. The community Spline MCP also **cannot create scenes** (no public Spline REST API).

**Workflow:** Build the Mercury Bloom scene in [Spline](https://spline.design) on a local machine with MCP, export **Code → Vanilla JS**, publish, then paste the published `.splinecode` URL into CMS (see below). Do not fabricate a `sceneUrl` — an empty URL keeps the Three.js Mercury Bloom fallback.

## CMS config (`cms/content.json`)

```json
"spline": {
  "enabled": false,
  "sceneUrl": "",
  "objectName": "Bloom",
  "budgets": {
    "maxSceneMB": 8,
    "maxFallbackMB": 2,
    "targetLCP_s": 2.5
  }
}
```

| Field | Purpose |
|-------|---------|
| `enabled` | Gate — must be `true` **and** `sceneUrl` set to load Spline |
| `sceneUrl` | Published URL ending in `scene.splinecode` |
| `objectName` | Root object for cursor parallax (default `Bloom`) |
| `budgets.maxSceneMB` | Spline `.splinecode` download cap |
| `budgets.maxFallbackMB` | Three.js glTF + textures cap (`models/helmet.gltf` ≈ 0.15 MB) |
| `budgets.targetLCP_s` | Hero LCP budget with 3D active |

## Enable Spline hero

1. Model the chrome/gold **Mercury Bloom** in Spline. Name the root object **`Bloom`**.
2. Export → **Code export** → copy the published URL ending in `scene.splinecode`.
3. Edit `cms/content.json`:

```json
"spline": {
  "enabled": true,
  "sceneUrl": "https://prod.spline.design/YOUR_ID/scene.splinecode",
  "objectName": "Bloom"
}
```

4. Reload the site. `js/spline-scene.js` loads via `@splinetool/runtime` and applies cursor parallax to `Bloom`.

## Fallback chain

```
cms.spline.enabled + valid sceneUrl?
  ├─ yes → Spline runtime (js/spline-scene.js)
  │         └─ load fail → Three.js Mercury Bloom (js/experience.js)
  └─ no  → Three.js Mercury Bloom
              └─ WebGL fail → CSS static plate (data-hero-fallback)
```

`js/experience.js` renders the raymarched liquid-mercury metaball when Spline is off or fails. Rebuild legacy glTF: `npm run helmet`.

## Low-power path

Shared detector: `js/hero-power.js` → `isLowPower()`.

Triggers when **any** of:

- `prefers-reduced-motion: reduce`
- `prefers-reduced-data: reduce` (save-data)
- `navigator.hardwareConcurrency ≤ 4`
- viewport `max-width: 899px` (mobile)

Effects (Three.js and Spline):

| Signal | Three.js | Spline |
|--------|----------|--------|
| Particles | 48 vs 200 | n/a |
| Caustic floor / FG rings / glass beads | skipped | n/a |
| Liquid metaball motion | static (`uReduced`) | static (no parallax) |
| Parallax / breathe | off | off |

**Desktop full-power** keeps the full liquid bloom (200 particles, caustics, glass beads, raymarched motion).

## Import map

`@splinetool/runtime` is mapped in `index.html` for dynamic `import("./spline-scene.js")` when Spline is enabled.
