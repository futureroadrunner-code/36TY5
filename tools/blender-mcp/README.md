# Blender MCP (ahujasid/blender-mcp)

## Cursor MCP server
Configured in `.cursor/mcp.json` as `blender` via `uvx blender-mcp`.

Requires:
- `uv` / `uvx` on PATH (installed to `~/.local/bin`)
- Blender 3.0+ running with the addon enabled and connected

## Install the Blender addon
1. Open Blender → Edit → Preferences → Add-ons → Install…
2. Select `tools/blender-mcp/addon.py` (this file)
3. Enable **Interface: Blender MCP**
4. In the 3D Viewport press **N** → **BlenderMCP** tab → **Connect to Claude** (works for Cursor too)

## Restart Cursor
Fully quit and relaunch Cursor after MCP config changes.
