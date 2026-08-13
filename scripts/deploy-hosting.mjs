#!/usr/bin/env node
/**
 * Deploy static site to Firebase Hosting.
 * Requires FIREBASE_TOKEN + FIREBASE_PROJECT_ID in the environment.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.FIREBASE_TOKEN;
const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

if (!token) {
  console.error("Missing FIREBASE_TOKEN. Create one with: npx firebase-tools login:ci");
  process.exit(1);
}
if (!project) {
  console.error("Missing FIREBASE_PROJECT_ID (Firebase project id).");
  process.exit(1);
}

const rcPath = path.join(root, ".firebaserc");
fs.writeFileSync(rcPath, JSON.stringify({ projects: { default: project } }, null, 2) + "\n");
console.log("Using Firebase project:", project);

const args = ["-y", "firebase-tools@latest", "deploy", "--only", "hosting", "--project", project, "--non-interactive", "--force"];
const result = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, FIREBASE_TOKEN: token },
});
process.exit(result.status ?? 1);
