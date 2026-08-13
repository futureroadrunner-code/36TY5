/**
 * QA screenshot after loader — headless Chrome via CDP-less chrome flags + wait.
 * Uses puppeteer-core if present; otherwise falls back to timed chrome screenshot.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets", "qa-hero.png");
const outTapes = path.join(root, "assets", "qa-tapes.png");
const url = "http://127.0.0.1:4173/?v=luxqa";

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function waitForReady(ms = 12000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          res.resume();
          res.statusCode === 200 ? resolve() : reject();
        }).on("error", reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

async function tryPuppeteer() {
  try {
    const puppeteer = await import("puppeteer-core");
    const chrome = findChrome();
    const browser = await puppeteer.default.launch({
      executablePath: chrome,
      headless: "new",
      args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
      defaultViewport: { width: 1440, height: 900 },
      userDataDir: path.join(root, ".qa-chrome-profile"),
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForFunction(() => document.body.classList.contains("is-ready"), { timeout: 45000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    // Force-hide loader if still stuck so we can QA the hero composition
    await page.evaluate(() => {
      const loader = document.querySelector(".loader");
      if (loader && !loader.hasAttribute("hidden")) {
        loader.setAttribute("hidden", "");
        document.body.classList.add("is-ready");
      }
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: out, fullPage: false });
    await page.evaluate(() => {
      const el = document.querySelector("#tapes");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: outTapes, fullPage: false });
    const helmetOk = await page.evaluate(() => {
      const c = document.querySelector("#helmet-canvas");
      return !!(c && c.width > 100 && window.__experience);
    });
    await browser.close();
    return { ok: true, helmetOk };
  } catch (e) {
    return { ok: false, err: String(e) };
  }
}

async function fallbackChrome() {
  const chrome = findChrome();
  if (!chrome) throw new Error("Chrome not found");
  await waitForReady();
  // virtual-time-budget gives JS time to run
  await new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1440,900",
      "--virtual-time-budget=16000",
      `--screenshot=${out}`,
      url.replace("luxqa", "luxqa2"),
    ];
    const child = spawn(chrome, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("chrome exit " + code))));
  });
  return { ok: true, helmetOk: null, mode: "fallback" };
}

const result = await tryPuppeteer();
if (!result.ok) {
  console.warn("puppeteer failed", result.err);
  console.log(JSON.stringify(await fallbackChrome()));
} else {
  console.log(JSON.stringify(result));
}
console.log("wrote", out, fs.existsSync(out) ? fs.statSync(out).size : 0);
