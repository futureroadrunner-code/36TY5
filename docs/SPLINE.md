# Spline 3D — 36TY hero integration

## MCP status

Spline MCP is configured in:

- Global: `~/.cursor/mcp.json`
- Project: `.cursor/mcp.json`

Server path: `C:\Users\Service 1\.cursor\mcp-servers\spline-mcp-server\index.js`

Useful MCP tools for this project:

| Tool | Use |
|------|-----|
| `getRuntimeSetup` | Install + bootstrap `@splinetool/runtime` |
| `generateObjectCode` | Pointer/scroll rotation snippets for named objects |
| `generateEmbedCode` | iframe embed fallback |
| `generateSceneInteractionCode` | Event wiring for exported scenes |

> Note: The community Spline MCP cannot create scenes server-side (no public Spline REST API). Build the helmet in [Spline](https://spline.design), export **Code → Vanilla JS**, publish, then paste the `.splinecode` URL into CMS.

## Enable Spline hero (recommended)

1. Model the chrome/gold **36TY helmet** in Spline. Name the root object `Helmet`.
2. Export → **Code export** → copy the published URL ending in `scene.splinecode`.
3. Edit `cms/content.json`:

```json
"spline": {
  "enabled": true,
  "sceneUrl": "https://prod.spline.design/YOUR_ID/scene.splinecode",
  "objectName": "Helmet"
}
```

4. Reload the site. `js/spline-scene.js` loads the scene via `@splinetool/runtime` and applies cursor parallax to `Helmet`.

## Fallback

If `sceneUrl` is empty or load fails, `js/experience.js` renders `models/helmet.gltf` with Three.js (metalness/roughness, cursor + scroll tracking, fluid shader).

Rebuild glTF: `npm run helmet`
