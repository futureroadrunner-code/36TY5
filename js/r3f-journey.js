/**
 * 36TY — Mario-Von Beckford geographic biography.
 * Authored continuous landscape + time + memory DNA + music as climate.
 * Hero assets carry the image. Instanced geometry is background only.
 */
import { buildHeroes, updateHeroes, disposeHeroes, filterKeepout, HERO_KEEPOUTS } from "./r3f-heroes.js";

const IMPORT_KEYS = ["react", "react-dom/client", "@react-three/fiber", "three"];

function readImportMap() {
  const el = document.querySelector('script[type="importmap"]');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent || "{}").imports || {};
  } catch {
    return null;
  }
}

export function isR3FAvailable() {
  const imports = readImportMap();
  if (!imports) return false;
  return IMPORT_KEYS.every((key) => typeof imports[key] === "string" && imports[key].length > 0);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function isMobile() {
  return window.matchMedia("(max-width: 899px)").matches;
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / Math.max(1e-6, e1 - e0));
  return t * t * (3 - 2 * t);
}
function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Chapter legs for data-leg + CSS tinting (p 0→1). */
function legName(p) {
  if (p < 0.16) return "kingston";
  if (p < 0.34) return "mississauga";
  if (p < 0.5) return "brampton";
  if (p < 0.68) return "etobicoke";
  if (p < 0.86) return "music";
  return "future";
}

function chapterTint(p) {
  const noon = [232, 180, 120];
  const after = [210, 186, 150];
  const gold = [214, 168, 110];
  const blue = [148, 158, 178];
  const night = [255, 196, 128];
  const dawn = [210, 218, 228];
  if (p < 0.16) return noon;
  if (p < 0.34) return mixTint(noon, after, smoothstep(0.16, 0.34, p));
  if (p < 0.5) return mixTint(after, gold, smoothstep(0.34, 0.5, p));
  if (p < 0.68) return mixTint(gold, blue, smoothstep(0.5, 0.68, p));
  if (p < 0.86) return mixTint(blue, night, smoothstep(0.68, 0.86, p));
  return mixTint(night, dawn, smoothstep(0.86, 1, p));
}

function mixTint(a, b, t) {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}

/** Time of day travels with the life. No chapter reload — the sun moves. */
function eraAt(p) {
  const el =
    p < 0.16
      ? lerp(0.74, 0.56, p / 0.16)
      : p < 0.34
        ? lerp(0.56, 0.4, (p - 0.16) / 0.18)
        : p < 0.5
          ? lerp(0.4, 0.22, (p - 0.34) / 0.16)
          : p < 0.68
            ? lerp(0.22, 0.05, (p - 0.5) / 0.18)
            : p < 0.86
              ? lerp(0.05, -0.14, (p - 0.68) / 0.18)
              : lerp(-0.14, 0.1, (p - 0.86) / 0.14);
  return {
    el,
    az: lerp(0.55, 3.7, p),
    gold: smoothstep(0.3, 0.46, p) * (1 - smoothstep(0.52, 0.64, p)),
    night: clamp01(-el * 3.6),
  };
}

/**
 * Keyframed camera — ridge descent, suburban drift, commercial sweep,
 * night rise over brick, studio drop, open horizon settle.
 * p, px, py, pz, lx, ly, lz
 */
const CAM = [
  [0.0, 0.55, 1.62, 13.8, -0.85, 1.18, 7.15],
  [0.06, 0.22, 1.48, 9.4, -1.35, 1.12, 3.2],
  [0.12, -0.22, 1.44, 4.55, 0.18, 1.12, -2.35],
  [0.18, 0.55, 1.68, 0.35, 0.12, 1.22, -8.2],
  [0.24, 2.05, 2.72, -8.6, 0.9, 1.52, -16.2],
  [0.3, -0.92, 1.78, -16.6, -0.32, 1.3, -24.2],
  [0.36, 0.28, 1.7, -24.9, 0.18, 1.26, -32.2],
  [0.42, -1.72, 2.22, -36.1, -0.95, 1.38, -42.1],
  [0.48, 0.92, 1.85, -45.4, 0.42, 1.3, -52.2],
  [0.54, -0.28, 1.68, -54.9, -0.12, 1.24, -62.1],
  [0.6, 1.05, 1.92, -64.3, 0.48, 1.32, -72.2],
  [0.66, -0.58, 1.48, -72.9, -1.95, 1.16, -80.2],
  [0.72, 0.12, 1.46, -82.6, -2.25, 1.18, -90.2],
  [0.78, -1.12, 1.44, -92.5, -2.35, 1.14, -98.1],
  [0.84, -1.62, 1.38, -96.7, -2.05, 1.1, -100.2],
  [0.9, -0.28, 1.92, -108.2, 0.04, 1.48, -114.2],
  [0.96, 0.06, 2.72, -120.2, 0.0, 1.78, -126.2],
  [1.0, 0.0, 3.55, -128.4, 0.0, 2.05, -132.4],
];

function sampleCam(p, mobile, out) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const t = smoothstep(a[0], b[0], p);
  const ym = mobile ? 0.92 : 1;
  out.px = lerp(a[1], b[1], t) * (mobile ? 0.88 : 1);
  out.py = lerp(a[2], b[2], t) * ym;
  out.pz = lerp(a[3], b[3], t);
  out.lx = lerp(a[4], b[4], t);
  out.ly = lerp(a[5], b[5], t);
  out.lz = lerp(a[6], b[6], t);
  return out;
}

function makeCanvasTex(THREE, size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 2;
  t.needsUpdate = true;
  return t;
}

function buildTextures(THREE) {
  const laterite = makeCanvasTex(THREE, 256, (g, s) => {
    g.fillStyle = "#6a3a22";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = i % 3 ? "rgba(138,78,40,0.45)" : "rgba(48,22,12,0.35)";
      g.beginPath();
      g.arc(hash(i) * s, hash(i + 9) * s, 4 + hash(i + 3) * 14, 0, 6.28);
      g.fill();
    }
  });
  laterite.repeat.set(8, 28);

  const zinc = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#b8b4ac";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 5) {
      g.fillStyle = y % 10 === 0 ? "#d0ccc4" : "#9a968e";
      g.fillRect(0, y, s, 2);
    }
    g.fillStyle = "rgba(120,50,28,0.22)";
    for (let i = 0; i < 18; i++) g.fillRect(hash(i) * s, 0, 3, s);
  });
  zinc.repeat.set(2, 2);

  const breeze = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#cbb089";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#8a7358";
    const cell = 16;
    for (let y = 4; y < s; y += cell) {
      for (let x = 4; x < s; x += cell) {
        g.fillRect(x, y, 7, 7);
      }
    }
  });
  breeze.repeat.set(3, 2);

  const vinyl = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#d8dce0";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 6) {
      g.fillStyle = y % 12 === 0 ? "#c4c8cc" : "#e8eaec";
      g.fillRect(0, y, s, 3);
    }
    g.fillStyle = "rgba(120,128,140,0.18)";
    for (let i = 0; i < 24; i++) g.fillRect(hash(i) * s, hash(i + 5) * s, 2, 8);
  });
  vinyl.repeat.set(2, 2);

  const brick = makeCanvasTex(THREE, 256, (g, s) => {
    g.fillStyle = "#3a1c18";
    g.fillRect(0, 0, s, s);
    const bh = 14;
    const bw = 32;
    for (let y = 0, row = 0; y < s; y += bh, row++) {
      const ox = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < s; x += bw) {
        const n = hash(x * 0.1 + y);
        g.fillStyle = n > 0.55 ? "#7a3a32" : n > 0.3 ? "#5c2c28" : "#8a4a3c";
        g.fillRect(x + ox + 1, y + 1, bw - 2, bh - 2);
      }
    }
  });
  brick.repeat.set(2, 3);

  const plaza = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#8a9098";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(40,44,52,0.35)";
    const cell = 32;
    for (let y = 0; y < s; y += cell) {
      for (let x = 0; x < s; x += cell) {
        g.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 40; i++) g.fillRect(hash(i) * s, hash(i + 3) * s, 4, 4);
  });
  plaza.repeat.set(3, 3);

  const asphalt = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#2a2c30";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = "rgba(255,255,255,0.04)";
      g.fillRect(hash(i) * s, hash(i + 4) * s, 2, 2);
    }
    g.fillStyle = "rgba(180,200,220,0.08)";
    for (let i = 0; i < 60; i++) g.fillRect(hash(i + 20) * s, hash(i + 24) * s, 3, 1);
  });
  asphalt.repeat.set(2, 40);

  const dirtRoad = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#5a3a24";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = "rgba(30,16,8,0.25)";
      g.fillRect(hash(i + 2) * s, hash(i + 6) * s, 6, 3);
    }
  });
  dirtRoad.repeat.set(1, 36);

  const shingle = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#3a4046";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#2a3036";
    for (let y = 0; y < s; y += 8) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
    }
  });
  shingle.repeat.set(2, 2);

  const canopy = makeCanvasTex(THREE, 64, (g, s) => {
    g.fillStyle = "#143820";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#1f5a32";
    g.fillRect(10, 8, 30, 28);
    g.fillStyle = "#0c2818";
    g.fillRect(28, 20, 24, 24);
  });

  const maple = makeCanvasTex(THREE, 64, (g, s) => {
    g.fillStyle = "#2a4a28";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#3a6a38";
    g.beginPath();
    g.arc(32, 28, 22, 0, 6.28);
    g.fill();
    g.fillStyle = "#4a7a42";
    g.beginPath();
    g.arc(22, 22, 14, 0, 6.28);
    g.fill();
  });

  return { laterite, zinc, breeze, vinyl, brick, plaza, asphalt, dirtRoad, shingle, canopy, maple };
}

function makeTerrain(THREE, mobile) {
  const segsX = mobile ? 40 : 64;
  const segsZ = mobile ? 56 : 88;
  const geo = new THREE.PlaneGeometry(48, 180, segsX, segsZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const worldZ = z - 58;
    const kingHills = clamp01((worldZ - 2) / 16);
    const hill =
      Math.sin(x * 0.14 + 0.5) * 2.1 * kingHills +
      Math.sin(z * 0.07 + x * 0.05) * 3.4 * kingHills +
      Math.sin(z * 0.22) * 0.55 * kingHills;
    const edge = 1 - Math.min(1, Math.abs(x) / 20);
    pos.setY(i, Math.max(0, hill * edge));
    const laterite = kingHills;
    const paved = 1 - kingHills;
    const r = lerp(0.42, 0.68, paved);
    const g = lerp(0.44, 0.5, paved);
    const b = lerp(0.3, 0.46, paved);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 120);
  return geo;
}

function makeRidge(THREE, seed, w, d, h) {
  const geo = new THREE.PlaneGeometry(w, d, 18, 12);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 0.12 + seed) * h * 0.45 +
      Math.sin(z * 0.18 + seed * 2) * h * 0.35 +
      (1 - Math.min(1, Math.abs(x) / (w * 0.5))) * h;
    pos.setY(i, Math.max(0.2, n));
  }
  geo.computeVertexNormals();
  return geo;
}

function makeGable(THREE) {
  const geo = new THREE.ConeGeometry(0.78, 0.92, 4);
  geo.rotateY(Math.PI / 4);
  return geo;
}

/**
 * Kingston fabric that THINS into Mississauga instead of unloading.
 * Setbacks widen as z decreases — the world changes while travelling.
 */
function placeKingston(mobile) {
  const n = mobile ? 6 : 9;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const t = i / Math.max(1, n - 1);
    const z = 13 - i * 1.85 - hash(i + 2) * 0.4;
    const setback = lerp(4.6, 6.4, t);
    list.push({
      x: side * (setback + hash(i + 4) * 1.1),
      z,
      w: 1.15 + hash(i + 7) * 0.9,
      h: 1.0 + hash(i + 9) * 1.0,
      d: 1.2 + hash(i + 3) * 0.65,
      hue: hash(i + 11),
      roof: "zinc",
    });
  }
  return list;
}

/** Mississauga: open lots, with Kingston zinc DNA still in the mix. */
function placeMississauga(mobile) {
  const n = mobile ? 6 : 8;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const t = i / Math.max(1, n - 1);
    const setback = lerp(6.4, 8.6, 1 - Math.abs(t - 0.35) * 0.5) + hash(i + 20) * 1.4;
    list.push({
      x: side * setback,
      z: 2 - i * 2.05 - hash(i + 21) * 0.55,
      w: 1.75 + hash(i + 22) * 1.05,
      h: 1.55 + hash(i + 23) * 0.85,
      d: 1.95 + hash(i + 24) * 0.85,
      vinyl: hash(i + 25) > 0.38,
      hue: hash(i + 26),
    });
  }
  return list;
}

/** Brampton: density rises; Mississauga lots don't vanish on a cut. */
function placeBrampton(mobile) {
  const n = mobile ? 7 : 10;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const cluster = Math.floor(i / 4);
    const commercial = i % 5 === 0 || i % 7 === 2;
    const wideCommercial = i % 9 === 4;
    const w = wideCommercial
      ? 2.8 + hash(i + 42) * 1.6
      : commercial
        ? 2.0 + hash(i + 42) * 1.0
        : 1.35 + hash(i + 42) * 0.75;
    const h = wideCommercial
      ? 0.85 + hash(i + 43) * 0.4
      : commercial
        ? 1.05 + hash(i + 43) * 0.5
        : 1.25 + hash(i + 43) * 0.65;
    list.push({
      x: side * (5.1 + hash(i + 40) * 1.6 + (cluster % 2) * 0.7),
      z: -22 - i * 1.48 - hash(i + 41) * 0.32,
      w,
      h,
      d: commercial ? 1.65 + hash(i + 44) * 0.75 : 1.5 + hash(i + 44) * 0.6,
      commercial,
    });
  }
  return list;
}

/** Etobicoke: present tense — brick gables, still carrying earlier DNA nearby. */
function placeEtobicoke(mobile) {
  const n = mobile ? 7 : 10;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -48 - i * 1.62 - hash(i + 60) * 0.32;
    list.push({
      x: side * (4.55 + hash(i + 61) * 0.95 + (i % 7 === 0 ? 1.25 : 0)),
      z,
      w: 1.45 + hash(i + 62) * 0.75,
      h: 2.45 + hash(i + 63) * 1.55,
      d: 1.55 + hash(i + 64) * 0.65,
      gable: 0.75 + hash(i + 65) * 0.45,
      bay: i % 3 === 0,
    });
  }
  return list;
}

/** Influence traces — Kingston does not unload. A few zinc bodies persist down the road. */
function placeKingstonDna(mobile) {
  const n = mobile ? 3 : 5;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    list.push({
      x: side * (5.8 + hash(i + 90) * 2.2),
      z: -10 - i * 8.5 - hash(i + 91) * 1.2,
      w: 1.05 + hash(i + 92) * 0.55,
      h: 0.95 + hash(i + 93) * 0.7,
      d: 1.1 + hash(i + 94) * 0.45,
      hue: 0.2 + hash(i + 95) * 0.3,
      roof: "zinc",
    });
  }
  return list;
}

function placeKingstonTrees(mobile) {
  const n = mobile ? 10 : 16;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = hash(i + 80) > 0.5 ? -1 : 1;
    const z = 14 - i * 0.85 - hash(i + 81) * 0.9;
    if (z < -48) continue;
    const fade = clamp01((z + 48) / 40);
    list.push({
      x: side * (5.6 + hash(i + 82) * 5.8 + (1 - fade) * 1.4),
      z,
      s: (0.95 + hash(i + 83) * 1.4) * lerp(0.45, 1, fade),
      h: (2.4 + hash(i + 84) * 2.6) * lerp(0.55, 1, fade),
      kind: "mango",
    });
  }
  return list;
}

function placeOntarioTrees(mobile, zStart, zEnd) {
  const n = mobile ? 10 : 16;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = hash(i + 100) > 0.5 ? -1 : 1;
    const z = zStart - i * ((zStart - zEnd) / n) - hash(i + 101) * 0.8;
    list.push({
      x: side * (7.2 + hash(i + 102) * 7.4),
      z,
      s: 0.5 + hash(i + 103) * 0.55,
      h: 2.8 + hash(i + 104) * 2.2,
      kind: "maple",
    });
  }
  return list;
}

function placePoles(mobile) {
  const n = mobile ? 6 : 10;
  const list = [];
  for (let i = 0; i < n; i++) {
    const z = 12 - i * 5.8;
    if (z < -8) continue;
    list.push({ x: -2.05, z });
    list.push({ x: 2.05, z: z - 2.4 });
  }
  return list;
}

function placeStripPlazas(mobile) {
  const n = mobile ? 3 : 5;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    list.push({
      x: side * (8.2 + hash(i + 70) * 3.2),
      z: -38 - i * 4.2,
      w: 4.8 + hash(i + 71) * 3.6,
      h: 2.1 + hash(i + 72) * 0.75,
      d: 11 + hash(i + 73) * 7,
    });
  }
  return list;
}

/** 1–2 lit window quads per house, street-facing facade toward road center. */
function placeHouseWindows(houses, seed) {
  const list = [];
  houses.forEach((it, i) => {
    const face = -Math.sign(it.x || 1);
    const count = hash(i + seed) > 0.38 ? 2 : 1;
    for (let w = 0; w < count; w++) {
      const along = count === 1 ? 0 : w === 0 ? -0.24 : 0.26;
      const lift = count === 1 ? 0.44 : w === 0 ? 0.36 : 0.58;
      list.push({
        x: it.x + face * (it.d / 2 + 0.03),
        y: it.h * lift,
        z: it.z + along * it.w,
        sx: 0.14 + hash(i + w + seed) * 0.07,
        sy: 0.18 + hash(i + w + seed + 11) * 0.08,
      });
    }
  });
  return list;
}

/** Thin porch / stoop slabs in front of detached and row houses. */
function placeStoops(houses) {
  return houses.map((it) => {
    const face = -Math.sign(it.x || 1);
    return {
      x: it.x + face * (it.d / 2 + 0.2),
      z: it.z + face * 0.08,
      w: it.w * 0.5,
      d: it.d * 0.34,
    };
  });
}

function followRate(p) {
  if (p < 0.16) return 0.038;
  if (p < 0.34) return 0.11;
  if (p < 0.5) return 0.085;
  if (p < 0.68) return 0.072;
  if (p < 0.86) return 0.095;
  return 0.032;
}

function paintLabel(g, w, h, title, dark, kind) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = dark ? "rgba(236,242,246,0.94)" : "rgba(32,16,8,0.92)";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font =
    kind === "place"
      ? "700 210px Newsreader, Georgia, serif"
      : "800 108px Outfit, system-ui, sans-serif";
  g.fillText(title, w / 2, h / 2);
}

function makeLabel(THREE, title, x, z, y, dark, kind, opts) {
  const place = kind === "place";
  const w = place ? 2048 : 1024;
  const h = place ? 512 : 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  paintLabel(g, w, h, title, dark, kind);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(place ? 11.2 : 5.4, place ? 2.7 : 1.32), mat);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 4;
  mesh.userData.tex = tex;
  mesh.userData.homeZ = z;
  mesh.userData.homeY = y;
  mesh.userData.homeX = x;
  mesh.userData.kind = kind;
  mesh.userData.title = title;
  mesh.userData.road = !!(opts && opts.road);
  mesh.userData.billboard = !(opts && opts.road);
  if (opts && opts.scaleX) mesh.scale.set(opts.scaleX, 1, 1);
  if (opts && opts.rx) mesh.rotation.x = opts.rx;
  const face = place ? "700 210px Newsreader" : "800 108px Outfit";
  if (document.fonts && document.fonts.load) {
    document.fonts
      .load(face)
      .then(() => {
        paintLabel(g, w, h, title, dark, kind);
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  return mesh;
}

function collectObstructions(kingston, mississauga, brampton, etobicoke, kTrees, oTrees1, oTrees2) {
  const obs = [];
  const push = (items, r, tree) => {
    items.forEach((it) => obs.push({ x: it.x, z: it.z, r, tree: !!tree }));
  };
  push(kingston, 2.4, false);
  push(mississauga, 2.8, false);
  push(brampton, 2.2, false);
  push(etobicoke, 2.6, false);
  push(kTrees, 2.1, true);
  push(oTrees1, 1.7, true);
  push(oTrees2, 1.7, true);
  HERO_KEEPOUTS.forEach((k) => obs.push({ x: k.x, z: k.z, r: Math.max(k.r, k.xr) * 0.72, tree: false }));
  return obs;
}

function avoidLabelCollision(label, obstructions, camera) {
  const place = label.userData.kind === "place";
  const minR = place ? 5.4 : 3.2;
  let bestX = label.userData.homeX;
  let bestY = label.userData.homeY;
  let safe = 0;
  const z = label.userData.homeZ;
  const homeX = label.userData.homeX;
  const offsets = place
    ? [homeX, homeX - 1.8, homeX + 1.8, homeX - 3.4, homeX + 3.4]
    : [homeX, homeX - 1.6, homeX + 1.6];
  const yOffsets = [0, 0.28, -0.22, 0.55];

  for (const ox of offsets) {
    for (const oy of yOffsets) {
      let localSafe = 1;
      for (const o of obstructions) {
        const dx = ox - o.x;
        const dz = z - o.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const need = o.r + minR;
        if (d < need) {
          const fall = Math.max(0.02, d / need);
          localSafe *= o.tree ? fall * fall : fall;
        }
      }
      const roadside = Math.abs(ox) * 0.018;
      const skyPenalty = oy > 0.4 ? -0.12 : 0;
      const score = localSafe + roadside + skyPenalty;
      if (score > safe) {
        safe = score;
        bestX = ox;
        bestY = label.userData.homeY + oy;
      }
    }
  }

  label.position.x = bestX;
  label.position.y = bestY;
  label.userData.safeY = bestY;
  label.userData.safeX = bestX;
  const dist = Math.abs(z - camera.position.z);
  const depthFade = smoothstep(5, 14, dist) * (1 - smoothstep(place ? 32 : 18, place ? 48 : 28, dist));
  const clarity = safe < 0.62 ? 0 : clamp01((safe - 0.62) / 0.38);
  return clarity * depthFade;
}

function makeMotes(THREE, n, color, mode) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const vel = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hash(i) - 0.5) * 18;
    pos[i * 3 + 1] = 0.35 + hash(i + 3) * 5.5;
    pos[i * 3 + 2] = 16 - hash(i + 9) * 140;
    seed[i] = hash(i + 21);
    vel[i] = hash(i + 33);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("vel", new THREE.BufferAttribute(vel, 1));
  const mat = new THREE.PointsMaterial({
    color: color,
    size: mode === "dust" ? 0.055 : 0.048,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.seed = seed;
  pts.userData.vel = vel;
  pts.userData.mode = mode;
  return pts;
}

function fillInstanced(THREE, mesh, items, fn) {
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  items.forEach((it, i) => {
    fn(dummy, it, i, col);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (mesh.instanceColor) mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
}

async function loadLibs() {
  const [React, ReactDOM, R3F, THREE] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@react-three/fiber"),
    import("three"),
  ]);
  if (!React?.createElement || !ReactDOM?.createRoot || !R3F?.Canvas || !THREE?.WebGLRenderer) {
    throw new Error("R3F journey: incomplete ESM graph");
  }
  return { React, ReactDOM, R3F, THREE };
}

function bindRuntime(libs) {
  const { React, R3F, THREE } = libs;
  const h = React.createElement;
  const { useRef, useMemo, useEffect, useState } = React;
  const { Canvas, useFrame, useThree } = R3F;

  function World({ reduced, mobile, cheap, getScroll }) {
    const { scene, camera, gl } = useThree();
    const pose = useRef({ px: 4.2, py: 5.8, pz: 15, lx: 0.4, ly: 1.1, lz: 4.5 });
    const look = useMemo(() => new THREE.Vector3(), []);
    const lastLeg = useRef("");
    const sun = useRef(null);
    const hemi = useRef(null);
    const street = useRef(null);
    const ttcGlow = useRef(null);
    const musicGlow = useRef(null);
    const awake = useRef(0);
    const dirtRef = useRef(null);
    const ashRef = useRef(null);
    const motesRef = useRef(null);
    const lampsRef = useRef(null);
    const wiresRef = useRef(null);
    const damp = useRef({ p: 0, v: 0 });
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const tex = useMemo(() => buildTextures(THREE), []);

    const mat = useMemo(() => {
      const mk = (opts) => new THREE.MeshLambertMaterial(opts);
      return {
        earth: mk({ vertexColors: true }),
        dirt: mk({ map: tex.dirtRoad, color: 0xb07a48, transparent: true, opacity: 1 }),
        ash: mk({ map: tex.asphalt, color: 0x4a5058, transparent: true, opacity: 0.08 }),
        zinc: mk({ map: tex.zinc, color: 0xc4c0b8 }),
        wall: mk({ map: tex.breeze, color: 0xffffff }),
        vinyl: mk({ map: tex.vinyl, color: 0xffffff }),
        brick: mk({ map: tex.brick, color: 0xffffff }),
        plaza: mk({ map: tex.plaza, color: 0xb8c4d0 }),
        stoop: mk({ color: 0x8a7a68 }),
        shingle: mk({ map: tex.shingle, color: 0x6a727c }),
        canopy: mk({ map: tex.canopy, color: 0x2a7a44 }),
        maple: mk({ map: tex.maple, color: 0x4a7a48 }),
        winter: mk({ color: 0x6a7064 }),
        trunk: mk({ color: 0x5a3a28 }),
        pole: mk({ color: 0x3a3830 }),
        slab: mk({ color: 0x8aa0b0, emissive: 0x152028, emissiveIntensity: 0.2 }),
        ridge: mk({ color: 0x3a6a48 }),
        ridgeFar: mk({ color: 0x4a7a58 }),
        speaker: mk({ color: 0x3a3228 }),
        window: new THREE.MeshBasicMaterial({ color: 0xffc07a }),
        windowDim: new THREE.MeshBasicMaterial({ color: 0x7a8fa0 }),
        windowLive: new THREE.MeshBasicMaterial({ color: 0xffe8b8 }),
      };
    }, [tex]);

    const terrainGeo = useMemo(() => makeTerrain(THREE, mobile || cheap), [mobile, cheap]);
    const ridgeA = useMemo(() => makeRidge(THREE, 1.2, 30, 20, 10), []);
    const ridgeB = useMemo(() => makeRidge(THREE, 2.7, 24, 16, 8), []);
    const gableGeo = useMemo(() => makeGable(THREE), []);

    const kingston = useMemo(
      () => filterKeepout(placeKingston(mobile || cheap).concat(placeKingstonDna(mobile || cheap))),
      [mobile, cheap]
    );
    const mississauga = useMemo(() => filterKeepout(placeMississauga(mobile || cheap)), [mobile, cheap]);
    const brampton = useMemo(() => filterKeepout(placeBrampton(mobile || cheap)), [mobile, cheap]);
    const etobicoke = useMemo(() => filterKeepout(placeEtobicoke(mobile || cheap)), [mobile, cheap]);
    const kTrees = useMemo(() => filterKeepout(placeKingstonTrees(mobile || cheap)), [mobile, cheap]);
    const oTrees1 = useMemo(() => filterKeepout(placeOntarioTrees(mobile || cheap, -6, -42)), [mobile, cheap]);
    const oTrees2 = useMemo(() => filterKeepout(placeOntarioTrees(mobile || cheap, -44, -88)), [mobile, cheap]);
    const poles = useMemo(() => placePoles(mobile || cheap), [mobile, cheap]);
    const plazas = useMemo(() => placeStripPlazas(mobile || cheap), [mobile, cheap]);
    const kWins = useMemo(() => placeHouseWindows(kingston, 200), [kingston]);
    const mWins = useMemo(() => placeHouseWindows(mississauga, 300), [mississauga]);
    const bWins = useMemo(() => placeHouseWindows(brampton, 400), [brampton]);
    const eWins = useMemo(() => placeHouseWindows(etobicoke, 500), [etobicoke]);
    const mStoops = useMemo(() => placeStoops(mississauga), [mississauga]);
    const eStoops = useMemo(() => placeStoops(etobicoke), [etobicoke]);
    const obstructions = useMemo(
      () => collectObstructions(kingston, mississauga, brampton, etobicoke, kTrees, oTrees1, oTrees2),
      [kingston, mississauga, brampton, etobicoke, kTrees, oTrees1, oTrees2]
    );

    const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const coneGeo = useMemo(() => new THREE.ConeGeometry(0.7, 1.8, 6), []);
    const mangoGeo = useMemo(() => new THREE.SphereGeometry(0.7, 6, 5), []);
    const mapleGeo = useMemo(() => new THREE.SphereGeometry(0.65, 6, 5), []);
    const cylGeo = useMemo(() => new THREE.CylinderGeometry(0.06, 0.08, 1, 5), []);
    const roofGeo = useMemo(() => new THREE.BoxGeometry(1, 0.08, 1), []);

    const packed = useMemo(() => {
      const kWall = new THREE.InstancedMesh(boxGeo, mat.wall, kingston.length);
      kWall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(kingston.length * 3), 3);
      fillInstanced(THREE, kWall, kingston, (d, it, i, col) => {
        d.position.set(it.x, it.h / 2, it.z);
        d.scale.set(it.w, it.h, it.d);
        if (it.hue > 0.72) col.set(0x2a6a7a);
        else if (it.hue > 0.48) col.set(0xc4a04a);
        else if (it.hue > 0.28) col.set(0xa43c28);
        else col.set(0xd8c4a0);
      });

      const kRoof = new THREE.InstancedMesh(roofGeo, mat.zinc, kingston.length);
      fillInstanced(THREE, kRoof, kingston, (d, it) => {
        d.position.set(it.x, it.h + 0.12, it.z - 0.05);
        d.rotation.set(-0.28, 0, 0);
        d.scale.set(it.w * 1.18, 1, it.d * 1.25);
      });

      const mWall = new THREE.InstancedMesh(boxGeo, mat.vinyl, mississauga.length);
      mWall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mississauga.length * 3), 3);
      fillInstanced(THREE, mWall, mississauga, (d, it, i, col) => {
        d.position.set(it.x, it.h / 2, it.z);
        d.scale.set(it.w, it.h, it.d);
        if (it.vinyl) col.set(0xd8dce0);
        else col.set(it.hue > 0.5 ? 0x9a6a58 : 0x7a5a48);
      });

      const mRoof = new THREE.InstancedMesh(roofGeo, mat.shingle, mississauga.length);
      fillInstanced(THREE, mRoof, mississauga, (d, it) => {
        d.position.set(it.x, it.h + 0.1, it.z);
        d.rotation.set(-0.18, 0, 0);
        d.scale.set(it.w * 1.12, 1, it.d * 1.15);
      });

      const bWall = new THREE.InstancedMesh(boxGeo, mat.wall, brampton.length);
      bWall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(brampton.length * 3), 3);
      fillInstanced(THREE, bWall, brampton, (d, it, i, col) => {
        d.position.set(it.x, it.h / 2, it.z);
        d.scale.set(it.w, it.h, it.d);
        col.set(it.commercial ? 0x8a9098 : i % 2 ? 0xb8a890 : 0xc8b8a0);
      });

      const bRoof = new THREE.InstancedMesh(roofGeo, mat.shingle, brampton.length);
      fillInstanced(THREE, bRoof, brampton, (d, it) => {
        d.position.set(it.x, it.h + 0.08, it.z);
        d.rotation.set(-0.12, 0, 0);
        d.scale.set(it.w * 1.08, 1, it.d * 1.1);
      });

      const eWall = new THREE.InstancedMesh(boxGeo, mat.brick, etobicoke.length);
      eWall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(etobicoke.length * 3), 3);
      fillInstanced(THREE, eWall, etobicoke, (d, it, i, col) => {
        d.position.set(it.x, it.h / 2, it.z);
        d.scale.set(it.w, it.h, it.d);
        col.set(i % 3 === 0 ? 0xb86a58 : 0x8a4a3c);
      });

      const eGable = new THREE.InstancedMesh(gableGeo, mat.shingle, etobicoke.length);
      fillInstanced(THREE, eGable, etobicoke, (d, it) => {
        d.position.set(it.x, it.h + 0.04, it.z);
        d.scale.set(it.w * 1.1, it.gable * 1.14, it.d * 1.06);
      });

      const kWinMesh = new THREE.InstancedMesh(boxGeo, mat.window, kWins.length);
      fillInstanced(THREE, kWinMesh, kWins, (d, w) => {
        d.position.set(w.x, w.y, w.z);
        d.scale.set(w.sx, w.sy, 0.025);
      });

      const mWinMesh = new THREE.InstancedMesh(boxGeo, mat.windowDim, mWins.length);
      fillInstanced(THREE, mWinMesh, mWins, (d, w) => {
        d.position.set(w.x, w.y, w.z);
        d.scale.set(w.sx, w.sy, 0.025);
      });

      const bWinMesh = new THREE.InstancedMesh(boxGeo, mat.windowDim, bWins.length);
      fillInstanced(THREE, bWinMesh, bWins, (d, w) => {
        d.position.set(w.x, w.y, w.z);
        d.scale.set(w.sx, w.sy, 0.025);
      });

      const eWinMesh = new THREE.InstancedMesh(boxGeo, mat.windowLive, eWins.length);
      fillInstanced(THREE, eWinMesh, eWins, (d, w) => {
        d.position.set(w.x, w.y, w.z);
        d.scale.set(w.sx * 1.05, w.sy * 1.08, 0.028);
      });

      const mStoopMesh = new THREE.InstancedMesh(boxGeo, mat.stoop, mStoops.length);
      fillInstanced(THREE, mStoopMesh, mStoops, (d, s) => {
        d.position.set(s.x, 0.05, s.z);
        d.scale.set(s.w, 0.08, s.d);
      });

      const eStoopMesh = new THREE.InstancedMesh(boxGeo, mat.stoop, eStoops.length);
      fillInstanced(THREE, eStoopMesh, eStoops, (d, s) => {
        d.position.set(s.x, 0.05, s.z);
        d.scale.set(s.w * 0.92, 0.09, s.d * 0.95);
      });

      const kCanopy = new THREE.InstancedMesh(mangoGeo, mat.canopy, kTrees.length);
      const kTrunk = new THREE.InstancedMesh(cylGeo, mat.trunk, kTrees.length);
      fillInstanced(THREE, kCanopy, kTrees, (d, t) => {
        d.position.set(t.x, t.h * 0.72, t.z);
        d.scale.set(t.s * 1.4, t.h * 0.42, t.s * 1.4);
      });
      fillInstanced(THREE, kTrunk, kTrees, (d, t) => {
        d.position.set(t.x, t.h * 0.22, t.z);
        d.scale.set(1.1, t.h * 0.5, 1.1);
      });

      const oCanopy1 = new THREE.InstancedMesh(mapleGeo, mat.maple, oTrees1.length);
      const oTrunk1 = new THREE.InstancedMesh(cylGeo, mat.trunk, oTrees1.length);
      fillInstanced(THREE, oCanopy1, oTrees1, (d, t) => {
        d.position.set(t.x, t.h * 0.62, t.z);
        d.scale.set(t.s * 1.1, t.h * 0.38, t.s * 1.1);
      });
      fillInstanced(THREE, oTrunk1, oTrees1, (d, t) => {
        d.position.set(t.x, t.h * 0.2, t.z);
        d.scale.set(0.75, t.h * 0.42, 0.75);
      });

      const oCanopy2 = new THREE.InstancedMesh(coneGeo, mat.winter, oTrees2.length);
      const oTrunk2 = new THREE.InstancedMesh(cylGeo, mat.trunk, oTrees2.length);
      fillInstanced(THREE, oCanopy2, oTrees2, (d, t) => {
        d.position.set(t.x, t.h * 0.55, t.z);
        d.scale.set(t.s * 0.55, t.h / 1.8, t.s * 0.55);
      });
      fillInstanced(THREE, oTrunk2, oTrees2, (d, t) => {
        d.position.set(t.x, t.h * 0.2, t.z);
        d.scale.set(0.7, t.h * 0.42, 0.7);
      });

      const poleMesh = new THREE.InstancedMesh(cylGeo, mat.pole, poles.length);
      fillInstanced(THREE, poleMesh, poles, (d, p) => {
        d.position.set(p.x, 1.25, p.z);
        d.scale.set(1.1, 2.5, 1.1);
      });

      const plazaMesh = new THREE.InstancedMesh(boxGeo, mat.plaza, plazas.length);
      plazaMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(plazas.length * 3), 3);
      fillInstanced(THREE, plazaMesh, plazas, (d, s, i, col) => {
        d.position.set(s.x, s.h / 2 + 0.04, s.z);
        d.scale.set(s.w, s.h, s.d);
        col.set(i % 2 ? 0xb8c8d8 : 0x9aa8b8);
      });

      return {
        kWall,
        kRoof,
        mWall,
        mRoof,
        bWall,
        bRoof,
        eWall,
        eGable,
        kWinMesh,
        mWinMesh,
        bWinMesh,
        eWinMesh,
        mStoopMesh,
        eStoopMesh,
        kCanopy,
        kTrunk,
        oCanopy1,
        oTrunk1,
        oCanopy2,
        oTrunk2,
        poleMesh,
        plazaMesh,
      };
    }, [
      kingston,
      mississauga,
      brampton,
      etobicoke,
      kTrees,
      oTrees1,
      oTrees2,
      poles,
      plazas,
      kWins,
      mWins,
      bWins,
      eWins,
      mStoops,
      eStoops,
      boxGeo,
      roofGeo,
      gableGeo,
      mangoGeo,
      mapleGeo,
      coneGeo,
      cylGeo,
      mat,
    ]);

    const wires = useMemo(() => {
      const group = new THREE.Group();
      const lineMat = new THREE.LineBasicMaterial({ color: 0x1a1814, transparent: true, opacity: 0.55 });
      for (let s = 0; s < 2; s++) {
        const side = poles.filter((p) => (s === 0 ? p.x < 0 : p.x > 0));
        for (let i = 0; i < side.length - 1; i++) {
          const a = side[i];
          const b = side[i + 1];
          const pts = [];
          for (let k = 0; k <= 8; k++) {
            const t = k / 8;
            pts.push(
              new THREE.Vector3(lerp(a.x, b.x, t), 2.35 - 0.55 * 4 * t * (1 - t), lerp(a.z, b.z, t))
            );
          }
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
        }
      }
      return group;
    }, [poles]);

    const labels = useMemo(
      () => [
        makeLabel(THREE, "KINGSTON", -4.35, 1.85, 1.55, false, "place"),
        makeLabel(THREE, "MISSISSAUGA", 6.35, -16.6, 1.88, false, "place"),
        makeLabel(THREE, "BRAMPTON", -0.15, -40.1, 1.28, false, "place", { road: true, scaleX: 1.45, rx: -0.2 }),
        makeLabel(THREE, "ETOBICOKE", -5.55, -73.4, 2.05, true, "place"),
        makeLabel(THREE, "MUSIC", -2.05, -96.35, 1.72, true, "chapter"),
        makeLabel(THREE, "36TY", 0, -118.4, 2.55, true, "chapter"),
      ],
      []
    );

    const motes = useMemo(() => makeMotes(THREE, mobile || cheap ? 80 : 240, 0xf2ddc0, "dust"), [mobile, cheap]);

    const lamps = useMemo(() => {
      const n = mobile || cheap ? 8 : 14;
      const mesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffc48a }), n);
      mesh.frustumCulled = false;
      const d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        d.position.set(i % 2 ? 2.15 : -2.15, 2.65, -58 - i * 4.8);
        d.scale.set(0.1, 0.1, 0.1);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    }, [boxGeo, mobile, cheap]);

    const [heroes, setHeroes] = useState(null);
    const [memoryPlates, setMemoryPlates] = useState([]);
    useEffect(() => {
      let live = true;
      buildHeroes(THREE, { mobile: mobile || cheap })
        .then((h) => {
          if (live) setHeroes(h);
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [mobile, cheap]);
    useEffect(() => {
      return () => {
        if (heroes) disposeHeroes(heroes, THREE);
      };
    }, [heroes]);
    useEffect(() => {
      const specs = [
        { src: "assets/still-kingston-lane.webp", x: 7.4, y: 2.2, z: 5.5, w: 4.5, h: 2.55 },
        { src: "assets/still-mississauga.webp", x: -7.8, y: 2.25, z: -15, w: 4.9, h: 2.75 },
        { src: "assets/still-brampton.webp", x: 7.6, y: 2.15, z: -40, w: 4.7, h: 2.65 },
        { src: "assets/still-etobicoke.webp", x: -7.3, y: 2.05, z: -71, w: 4.6, h: 2.6 },
        { src: "assets/still-studio-creation.webp", x: 6.2, y: 1.95, z: -99, w: 3.9, h: 2.2 },
      ];
      const loader = new THREE.TextureLoader();
      let live = true;
      Promise.all(
        specs.map(
          (s) =>
            new Promise((resolve) => {
              loader.load(
                s.src,
                (tex) => {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  resolve({ ...s, tex });
                },
                undefined,
                () => resolve(null)
              );
            })
        )
      ).then((rows) => {
        if (!live) return;
        setMemoryPlates(
          rows.filter(Boolean).map((row) => {
            const pm = new THREE.MeshBasicMaterial({
              map: row.tex,
              transparent: true,
              opacity: 0,
              fog: true,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(row.w, row.h), pm);
            mesh.position.set(row.x, row.y, row.z);
            mesh.userData.homeZ = row.z;
            mesh.userData.homeX = row.x;
            mesh.renderOrder = 3;
            return mesh;
          })
        );
      });
      return () => {
        live = false;
      };
    }, []);

    const workZ = [-95.2, -99.8, -104.4, -109.0];

    useEffect(() => {
      scene.fog = new THREE.Fog(0xc4a070, 18, 72);
      scene.background = new THREE.Color(0xc4a070);
      return () => {
        terrainGeo.dispose();
        ridgeA.dispose();
        ridgeB.dispose();
        gableGeo.dispose();
        boxGeo.dispose();
        coneGeo.dispose();
        mangoGeo.dispose();
        mapleGeo.dispose();
        cylGeo.dispose();
        roofGeo.dispose();
        Object.values(packed).forEach((m) => m.dispose());
        Object.values(tex).forEach((t) => t.dispose());
        motes.geometry.dispose();
        motes.material.dispose();
        lamps.dispose();
        labels.forEach((m) => {
          m.geometry.dispose();
          m.material.dispose();
          if (m.userData.tex) m.userData.tex.dispose();
        });
        wires.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      };
    }, [
      scene,
      terrainGeo,
      ridgeA,
      ridgeB,
      gableGeo,
      boxGeo,
      coneGeo,
      mangoGeo,
      mapleGeo,
      cylGeo,
      roofGeo,
      packed,
      tex,
      labels,
      wires,
      motes,
      lamps,
    ]);

    useFrame((state) => {
      if (document.hidden) return;

      if (!window.__perf) window.__perf = { frames: 0, t: performance.now(), fps: 0, maxDt: 0 };
      const perf = window.__perf;
      perf.frames++;
      const dt = state.clock.getDelta();
      if (dt > perf.maxDt) perf.maxDt = dt;
      if (performance.now() - perf.t >= 1000) {
        perf.fps = perf.frames;
        perf.frames = 0;
        perf.t = performance.now();
      }

      const scroll = clamp01(
        (typeof getScroll === "function" ? getScroll() : 0) || window.__mercuryScroll || 0
      );
      const wantAwake = window.__journeyOn || window.__mixOn || scroll > 0.02;
      awake.current += ((wantAwake ? 1 : 0) - awake.current) * 0.12;
      const startPush = awake.current * 0.03 * (1 - scroll);
      const raw = reduced ? Math.min(0.02, scroll) : clamp01(scroll * lerp(0.62, 1, awake.current) + startPush);
      const prev = damp.current.p;
      const rate = followRate(damp.current.p);
      const dtC = Math.min(0.05, Math.max(0.008, dt));
      const gap = raw - damp.current.p;
      const k = Math.abs(gap) > 0.12 ? 0.28 : Math.max(0.06, 1 - Math.exp(-rate * 60 * dtC));
      damp.current.p += gap * k;
      damp.current.v = damp.current.p - prev;
      const p = damp.current.p;
      window.__jraw = raw;
      const spd = Math.min(1, Math.abs(window.__scrollVel || damp.current.v * 140) / 48);

      const leg = legName(p);
      const king = 1 - smoothstep(0.12, 0.2, p);
      const miss = smoothstep(0.14, 0.22, p) * (1 - smoothstep(0.3, 0.38, p));
      const bram = smoothstep(0.32, 0.4, p) * (1 - smoothstep(0.46, 0.54, p));
      const etob = smoothstep(0.48, 0.56, p) * (1 - smoothstep(0.64, 0.72, p));
      const music = smoothstep(0.66, 0.74, p) * (1 - smoothstep(0.82, 0.9, p));
      const future = smoothstep(0.84, 0.92, p);
      const night = smoothstep(0.52, 0.7, p);
      const mixOn = !!window.__mixOn;
      const bpm = window.__mixBpm || 86;
      const beat = state.clock.elapsedTime * (bpm / 60);
      const phrase = 0.5 + 0.5 * Math.sin(beat * Math.PI * 0.25);
      const live = mixOn ? 0.35 + phrase * 0.65 : document.body.getAttribute("data-audio") === "paused" ? 0.22 : 0.08;

      const ahead = clamp01(p + damp.current.v * 9);
      sampleCam(p, mobile, pose.current);
      const lookAhead = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0 };
      sampleCam(ahead, mobile, lookAhead);

      const ptrAmt = 0.22 + (1 - p) * 0.18;
      const ptrX = (window.__ptrX || 0) * ptrAmt;
      const ptrY = (window.__ptrY || 0) * 0.1;
      const microReact = mixOn ? Math.sin(beat * Math.PI * 2) * 0.04 * live : 0;
      let px = pose.current.px + ptrX * 0.55 + (lookAhead.px - pose.current.px) * 0.22 + microReact * 0.3;
      let py = pose.current.py + ptrY + spd * 0.15 + microReact * 0.15;
      let pz = pose.current.pz;
      look.set(
        lerp(pose.current.lx, lookAhead.lx, 0.35) + ptrX * 0.2,
        lerp(pose.current.ly, lookAhead.ly, 0.28),
        lerp(pose.current.lz, lookAhead.lz, 0.4)
      );

      const lock = window.__workLock;
      const aim = window.__workAim;
      const focus = lock >= 0 ? lock : aim;
      if (focus >= 0 && workZ[focus] != null && p > 0.68) {
        look.x += (-3.15 - look.x) * 0.05;
        look.z += (workZ[focus] - look.z) * 0.05;
        pz += (workZ[focus] + 6.5 - pz) * 0.035;
      }

      camera.position.set(px, py, pz);
      camera.lookAt(look);
      const bankAmt = p < 0.16 ? 0.022 : p < 0.5 ? 0.048 : 0.03;
      const bank = (lookAhead.px - pose.current.px) * bankAmt + ptrX * 0.018;
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z || 0, bank, 0.14);
      const baseFov = lerp(mobile ? 46 : 42, mobile ? 50 : 46, smoothstep(0.5, 0.68, p));
      camera.fov = baseFov + spd * 3.2 + live * 0.9;
      camera.updateProjectionMatrix();

      if (heroes) updateHeroes(heroes, { live, clock: state.clock.elapsedTime, p, mixOn });

      const info = window.__perf;
      if (info && gl && gl.info) {
        info.calls = gl.info.render.calls;
        info.tris = gl.info.render.triangles;
        info.geoms = gl.info.memory.geometries;
      }

      const fogCol = scene.fog.color;
      const warmR = lerp(0.77, 0.45, 1 - king);
      const warmG = lerp(0.63, 0.5, 1 - king);
      const warmB = lerp(0.44, 0.56, 1 - king);
      const coolR = lerp(0.55, 0.08, night);
      const coolG = lerp(0.62, 0.1, night);
      const coolB = lerp(0.72, 0.14, night);
      const chapterMix = king * 0.55 + miss * 0.2 + bram * 0.1;
      fogCol.r = lerp(coolR, warmR, chapterMix) + music * 0.08;
      fogCol.g = lerp(coolG, warmG, chapterMix) + music * 0.04;
      fogCol.b = lerp(coolB, warmB, chapterMix) - future * 0.06;
      scene.background.copy(fogCol);
      scene.fog.near = lerp(22, 6, night) + king * 8 - future * 4;
      scene.fog.far = lerp(100, 42, night) + future * 28 - king * 8 + Math.sin(state.clock.elapsedTime * 0.32) * live * 5;

      if (hemi.current) {
        hemi.current.intensity = lerp(1.15, 0.32, night) + live * 0.14 + music * 0.08;
        hemi.current.color.setRGB(lerp(1, 0.55, 1 - king), lerp(0.9, 0.64, 1 - king), lerp(0.68, 0.78, 1 - king));
        hemi.current.groundColor.setRGB(lerp(0.55, 0.12, night), lerp(0.38, 0.12, night), lerp(0.2, 0.16, night));
      }
      if (sun.current) {
        const era = eraAt(p);
        const sunY = Math.max(0.6, era.el * 18 + 2);
        const sunX = Math.cos(era.az) * 14 + ptrX * 1.4;
        const sunZ = pz + Math.sin(era.az) * 10;
        sun.current.position.set(sunX, sunY, sunZ);
        const gold = era.gold;
        const nightAmt = era.night;
        sun.current.intensity = Math.max(0.08, (1.7 * Math.max(0.05, era.el + 0.18)) * (1 - nightAmt * 0.75) + live * 0.16);
        sun.current.color.setRGB(
          lerp(1, lerp(1, 0.72, nightAmt), 1 - gold * 0.4),
          lerp(0.84, lerp(0.78, 0.8, nightAmt), 1 - gold * 0.15),
          lerp(0.55, lerp(0.62, 0.9, nightAmt), gold * 0.35)
        );
      }
      if (street.current) {
        street.current.intensity = (night + etob * 0.58) * (5.4 + live * 2.5);
        street.current.position.set(0.35 + ptrX * 0.4, 2.4, pz - 5);
      }
      if (ttcGlow.current) {
        ttcGlow.current.intensity = etob * 0.42 + music * 0.18 + live * 0.14;
        ttcGlow.current.position.set(-5.5, 1.8, -72);
      }
      if (musicGlow.current) {
        const aimBoost = focus >= 0 && p > 0.68 ? 0.42 : 0;
        musicGlow.current.intensity = music * (1.6 + live * 0.9) + etob * 0.1 + aimBoost;
      }

      if (dirtRef.current) dirtRef.current.material.opacity = 0.15 + king * 0.85;
      if (ashRef.current) ashRef.current.material.opacity = 0.04 + (1 - king) * 0.92 + etob * 0.08;
      if (wires) {
        wires.visible = king > 0.08;
        wires.rotation.z = Math.sin(state.clock.elapsedTime * 0.38) * 0.01 * (0.35 + live) * king;
        wires.traverse((o) => {
          if (o.material && o.material.opacity != null) o.material.opacity = 0.35 + live * 0.22 * king;
        });
      }

      const clockT = state.clock.elapsedTime;
      if (packed.kCanopy && kTrees.length) {
        kTrees.forEach((tr, i) => {
          const sway = Math.sin(clockT * (0.55 + live * 0.3) + i * 0.7) * 0.045 * king;
          dummy.position.set(tr.x, tr.h * 0.72, tr.z);
          dummy.rotation.set(0, 0, sway);
          dummy.scale.set(tr.s * 1.4, tr.h * 0.42, tr.s * 1.4);
          dummy.updateMatrix();
          packed.kCanopy.setMatrixAt(i, dummy.matrix);
        });
        packed.kCanopy.instanceMatrix.needsUpdate = true;
      }

      if (motes.geometry) {
        const arr = motes.geometry.attributes.position.array;
        const seeds = motes.userData.seed;
        const vels = motes.userData.vel;
        const dustAmt = king;
        const windAmt = miss + bram * 0.5;
        const mistAmt = etob * 0.6 + future * 0.4;
        const energyAmt = music + live * 0.5;
        for (let i = 0; i < seeds.length; i++) {
          const i3 = i * 3;
          const s = seeds[i];
          arr[i3] +=
            Math.sin(clockT * 0.4 + s * 12) * 0.003 * dustAmt +
            Math.cos(clockT * 0.8 + s * 8) * 0.012 * windAmt;
          arr[i3 + 1] +=
            Math.sin(clockT * 0.7 + s * 6) * 0.002 * dustAmt +
            Math.sin(clockT * 0.35 + s * 4) * 0.004 * mistAmt +
            energyAmt * 0.006 * Math.sin(beat * Math.PI + s * 10);
          arr[i3 + 2] +=
            dustAmt * 0.015 -
            windAmt * 0.035 -
            mistAmt * 0.02 +
            energyAmt * 0.01 * Math.sin(clockT * 0.5 + s * 5);
          if (arr[i3 + 2] > pz + 18) arr[i3 + 2] -= 100;
          if (arr[i3 + 2] < pz - 75) arr[i3 + 2] += 100;
        }
        motes.geometry.attributes.position.needsUpdate = true;
        motes.material.opacity =
          0.12 + dustAmt * 0.22 + windAmt * 0.08 + mistAmt * 0.14 + energyAmt * 0.12;
        motes.material.color.setRGB(
          lerp(0.95, 0.72, 1 - king) + energyAmt * 0.08,
          lerp(0.87, 0.84, 1 - king),
          lerp(0.75, 0.92, 1 - king) + mistAmt * 0.06
        );
        motes.material.size = (mobile ? 0.045 : 0.058) + spd * 0.035 + energyAmt * 0.02;
      }

      if (lamps.visible !== undefined) {
        lamps.visible = night > 0.1;
        lamps.material.transparent = true;
        lamps.material.opacity = night * (0.85 + live * 0.25);
      }

      const labelWindows = [
        [0, 0.02, 0.18],
        [1, 0.14, 0.36],
        [2, 0.32, 0.52],
        [3, 0.48, 0.7],
        [4, 0.66, 0.88],
        [5, 0.84, 1.0],
      ];

      labels.forEach((m, idx) => {
        const kind = m.userData.kind;
        const place = kind === "place";
        const win = labelWindows[idx];
        const inWin = p >= win[1] && p <= win[2];
        const rate = p < 0.2 ? 0.28 : p < 0.5 ? 0.65 : p > 0.88 ? 0.16 : 0.42;
        const collisionFade = avoidLabelCollision(m, obstructions, camera);
        const baseY = m.userData.safeY != null ? m.userData.safeY : m.userData.homeY;
        m.position.y = baseY + Math.sin(clockT * rate) * (place ? 0.05 : 0.025);
        const dist = Math.abs(m.userData.homeZ - camera.position.z);
        const dz = m.userData.homeZ - camera.position.z;
        let op = 0;
        if (inWin && dz < -0.8) {
          op = place
            ? smoothstep(5, 12, dist) * (1 - smoothstep(26, 42, dist))
            : smoothstep(2.2, 6.5, dist) * (1 - smoothstep(12, 22, dist));
        }
        op *= collisionFade;
        if (place && collisionFade < 0.35) op *= 0.12;
        const approach = clamp01(1 - dist / 16);
        const recede = dz > 0 ? clamp01(1 - dz / 8) : 1;
        const track = place ? lerp(0.02, 0.07, spd) : lerp(0.012, 0.045, spd);
        const sx = (m.userData.road ? 1.45 : 1) * (1 + track + approach * 0.06);
        m.scale.set(sx, 1 + approach * 0.03, 1);
        m.material.opacity = op * recede;
        m.material.depthTest = true;
        m.visible = op * recede > 0.05;
        if (m.userData.road) {
          m.rotation.x = -0.2;
          m.rotation.y = 0;
          m.rotation.z = 0;
        } else if (place && p > 0.48) {
          m.rotation.set(0, 0, 0);
        } else {
          m.lookAt(camera.position.x, m.position.y, camera.position.z);
        }
      });

      memoryPlates.forEach((plate) => {
        const dist = Math.abs(plate.userData.homeZ - camera.position.z);
        const dz = plate.userData.homeZ - camera.position.z;
        let op = 0;
        if (dz < 1.2) {
          op = smoothstep(4, 14, dist) * (1 - smoothstep(22, 36, dist));
        }
        plate.material.opacity = op * 0.92;
        plate.visible = op > 0.05;
        plate.lookAt(camera.position.x * 0.15 + plate.position.x, plate.position.y, camera.position.z);
      });

      if (lastLeg.current !== leg) {
        lastLeg.current = leg;
        document.body.setAttribute("data-leg", leg);
      }
      const tint = chapterTint(p);
      document.documentElement.style.setProperty("--journey", p.toFixed(3));
      document.documentElement.style.setProperty("--awake", awake.current.toFixed(3));
      document.documentElement.style.setProperty("--scroll-v", spd.toFixed(3));
      document.documentElement.style.setProperty("--fog", "#" + fogCol.getHexString());
      document.documentElement.style.setProperty("--live", live.toFixed(3));
      document.documentElement.style.setProperty("--chapter-tint", tint.join(", "));
      window.__journeyP = p;

      let room = -1;
      if (p > 0.68 && p < 0.86) {
        const u = (p - 0.68) / 0.18;
        room = Math.min(3, Math.floor(u * 4));
      }
      if (lock >= 0 && p > 0.68) room = lock;
      const roomStr = room >= 0 ? String(room) : "";
      if (document.body.getAttribute("data-room") !== roomStr) document.body.setAttribute("data-room", roomStr);
    });

    const speakers = [0, 1, 2, 3, 4, 5].map((i) =>
      h("mesh", {
        key: "sp" + i,
        geometry: boxGeo,
        material: mat.speaker,
        position: [-4.8 + (i % 2) * 0.6, 0.35 + Math.floor(i / 2) * 0.55, -92.5],
        scale: [0.75, 0.52, 0.48],
      })
    );

    const workMeshes = workZ.map((z, i) =>
      h("mesh", {
        key: "w" + i,
        geometry: boxGeo,
        material: mat.window,
        position: [-3.2, 1.35 + (i % 2) * 0.4, z],
        scale: [0.1, 1.25, 1.55],
      })
    );

    const crosses = [-28, -48, -68, -88].map((z) =>
      h("mesh", {
        key: "x" + z,
        geometry: boxGeo,
        material: mat.ash,
        position: [0, 0.07, z],
        scale: [20, 0.04, 2.6],
      })
    );

    return h(
      React.Fragment,
      null,
      h("ambientLight", { intensity: 0.42, color: 0xffe8cc }),
      h("hemisphereLight", { ref: hemi, args: [0xffe8c4, 0x7a5040, 1.1] }),
      h("directionalLight", { ref: sun, intensity: 1.55, position: [12, 16, 10], color: 0xffe0b8 }),
      h("directionalLight", { intensity: 0.55, position: [-6, 7, 8], color: 0xffd4b0 }),
      h("pointLight", { ref: street, intensity: 0, color: 0xffb060, distance: 24, position: [0, 2.4, -70] }),
      h("pointLight", { ref: ttcGlow, intensity: 0, color: 0xff9040, distance: 38, position: [-5.5, 1.8, -72] }),
      h("pointLight", {
        ref: musicGlow,
        intensity: 0,
        color: 0xffb86a,
        distance: 52,
        decay: 2,
        position: [-6.5, 5.2, -102],
      }),
      h("mesh", { geometry: terrainGeo, material: mat.earth, position: [0, 0, -58], receiveShadow: true }),
      h("mesh", {
        ref: dirtRef,
        geometry: boxGeo,
        material: mat.dirt,
        position: [0, 0.05, -8],
        scale: [3.8, 0.05, 38],
      }),
      h("mesh", {
        ref: ashRef,
        geometry: boxGeo,
        material: mat.ash,
        position: [0, 0.06, -72],
        scale: [4.2, 0.05, 88],
      }),
      h("mesh", { geometry: ridgeA, material: mat.ridge, position: [17, 0, -2] }),
      h("mesh", { geometry: ridgeB, material: mat.ridgeFar, position: [-18, 0, -10] }),
      h("mesh", { geometry: ridgeB, material: mat.ridge, position: [19, 0, 8], scale: [0.55, 0.7, 0.55] }),
      h("primitive", { object: packed.kWall }),
      h("primitive", { object: packed.kRoof }),
      h("primitive", { object: packed.mWall }),
      h("primitive", { object: packed.mRoof }),
      h("primitive", { object: packed.bWall }),
      h("primitive", { object: packed.bRoof }),
      h("primitive", { object: packed.eWall }),
      h("primitive", { object: packed.eGable }),
      h("primitive", { object: packed.kWinMesh }),
      h("primitive", { object: packed.mWinMesh }),
      h("primitive", { object: packed.bWinMesh }),
      h("primitive", { object: packed.eWinMesh }),
      h("primitive", { object: packed.mStoopMesh }),
      h("primitive", { object: packed.eStoopMesh }),
      h("primitive", { object: packed.kCanopy }),
      h("primitive", { object: packed.kTrunk }),
      h("primitive", { object: packed.oCanopy1 }),
      h("primitive", { object: packed.oTrunk1 }),
      h("primitive", { object: packed.oCanopy2 }),
      h("primitive", { object: packed.oTrunk2 }),
      h("primitive", { object: packed.poleMesh }),
      h("primitive", { object: packed.plazaMesh }),
      heroes ? h("primitive", { object: heroes.group }) : null,
      h("primitive", { object: wires }),
      h("primitive", { object: motes }),
      h("primitive", { object: lamps }),
      ...speakers,
      ...workMeshes,
      ...crosses,
      ...labels.map((m, i) => h("primitive", { key: "lb" + i, object: m })),
      ...memoryPlates.map((m, i) => h("primitive", { key: "mem" + i, object: m }))
    );
  }

  function Stage({ reduced, getScroll, cheap, mobile, frameloop, onReady }) {
    return h(
      Canvas,
      {
        alpha: false,
        dpr: [1, cheap ? 1.15 : mobile ? 1.35 : 1.55],
        gl: {
          alpha: false,
          antialias: !mobile,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
        },
        frameloop,
        camera: { fov: 48, near: 0.12, far: 180, position: [4.2, 5.8, 15] },
        resize: { scroll: false, debounce: { scroll: 50, resize: 0 } },
        style: { width: "100%", height: "100%", display: "block", background: "transparent" },
        onCreated: (state) => {
          state.gl.setClearColor(0xc4a070, 1);
          state.gl.outputColorSpace = THREE.SRGBColorSpace;
          state.gl.toneMapping = THREE.NoToneMapping;
          state.gl.toneMappingExposure = 1;
          window.__gl = state.gl;
          state.invalidate();
          if (typeof onReady === "function") onReady(state);
        },
      },
      h(World, { reduced, mobile, cheap, getScroll })
    );
  }

  function App(props) {
    const reduced = props.reduced;
    const [loop, setLoop] = useState("demand");

    useEffect(() => {
      const onPtr = (e) => {
        window.__ptrX = (e.clientX / window.innerWidth) * 2 - 1;
        window.__ptrY = -(e.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener("pointermove", onPtr, { passive: true });
      const sync = () => {
        if (document.hidden) {
          setLoop("never");
          return;
        }
        if (reduced) {
          setLoop("demand");
          return;
        }
        const on = !!(window.__journeyOn || window.__mixOn || (window.__mercuryScroll || 0) > 0.012);
        setLoop(on ? "always" : "demand");
      };
      const id = setInterval(sync, 180);
      document.addEventListener("visibilitychange", sync);
      sync();
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", sync);
        window.removeEventListener("pointermove", onPtr);
      };
    }, [reduced]);

    return h(Stage, {
      reduced,
      getScroll: props.getScroll,
      cheap: props.cheap,
      mobile: props.mobile,
      frameloop: loop,
      onReady: props.onReady,
    });
  }

  return { App };
}

function ensureDiv(el) {
  if (!el) throw new Error("R3F journey: missing mount element");
  if (el.tagName === "CANVAS") {
    const wrap = document.createElement("div");
    wrap.className = el.className || "world-root";
    wrap.id = el.id || "";
    el.replaceWith(wrap);
    el.hidden = true;
    return wrap;
  }
  return el;
}

async function mountScene(el, opts, { cheap }) {
  const mountEl = ensureDiv(el);
  const libs = await loadLibs();
  const reduced = opts.reduced ?? prefersReducedMotion();
  const mobile = isMobile();
  const getScroll = typeof opts.getScroll === "function" ? opts.getScroll : null;
  const scrollHold = { value: 0 };
  const readScroll = () => {
    if (getScroll) {
      const next = getScroll();
      if (typeof next === "number") scrollHold.value = next;
    }
    return scrollHold.value;
  };
  const { App } = bindRuntime(libs);
  const root = libs.ReactDOM.createRoot(mountEl);
  let gl = null;
  let created = false;
  let readyResolve;
  const ready = new Promise((r) => {
    readyResolve = r;
  });
  root.render(
    libs.React.createElement(App, {
      reduced,
      cheap,
      mobile,
      getScroll: readScroll,
      onReady: (state) => {
        created = true;
        gl = state.gl;
        readyResolve();
      },
    })
  );
  try {
    await Promise.race([
      ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("R3F journey: canvas init timeout")), 12000)),
    ]);
  } catch (err) {
    try {
      root.unmount();
    } catch (_) {}
    throw err;
  }
  if (!created || !gl) {
    try {
      root.unmount();
    } catch (_) {}
    throw new Error("R3F journey: WebGL context missing");
  }
  return {
    ready: Promise.resolve(),
    setScroll(p) {
      scrollHold.value = p;
    },
    destroy() {
      try {
        root.unmount();
      } catch (_) {}
      try {
        if (gl) {
          gl.dispose();
          if (gl.forceContextLoss) gl.forceContextLoss();
        }
      } catch (_) {}
      try {
        mountEl.replaceChildren();
      } catch (_) {}
    },
  };
}

export async function mountJourney(el, opts = {}) {
  return mountScene(el, opts, { cheap: false });
}
export async function mountMercury(el, opts = {}) {
  return mountJourney(el, opts);
}
