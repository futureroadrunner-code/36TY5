/**
 * Offline bridge to local Spline MCP runtime tools (when Cursor MCP auth
 * is pending). Mirrors getRuntimeSetup / generateRuntimeCode / generateAnimationCode.
 *
 * Usage:
 *   node scripts/spline-mcp-codegen.mjs setup
 *   node scripts/spline-mcp-codegen.mjs vanilla <sceneIdOrUrl>
 *   node scripts/spline-mcp-codegen.mjs react <sceneIdOrUrl>
 */
import runtimeManager from "../../mcp-servers/spline-mcp-server/src/utils/runtime-manager.js";

const [cmd, raw] = process.argv.slice(2);
const arg = raw || "36TY-HELMET-SCENE";

function sceneId(input) {
  try {
    return runtimeManager.parseSceneUrl(input);
  } catch {
    return input.replace(/^https:\/\/prod\.spline\.design\//, "").replace(/\/scene\.splinecode.*$/, "");
  }
}

if (cmd === "setup") {
  console.log(runtimeManager.generateRuntimeSetup());
} else if (cmd === "vanilla" || cmd === "react" || cmd === "next") {
  const id = sceneId(arg);
  console.log(runtimeManager.generateRuntimeCode(id, cmd === "next" ? "next" : cmd));
} else if (cmd === "animation") {
  const id = sceneId(arg);
  console.log(
    runtimeManager.generateObjectInteractionCode(id, "Helmet", "animation", {
      animationType: "rotate",
      duration: 2400,
      easing: "easeInOut",
      loop: true,
    })
  );
} else {
  console.error("Usage: node scripts/spline-mcp-codegen.mjs <setup|vanilla|react|next|animation> [sceneId|url]");
  process.exit(1);
}
