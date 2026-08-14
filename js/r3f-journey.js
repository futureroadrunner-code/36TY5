/**
 * 36TY — Jamaica → Toronto journey.
 * One R3F canvas. Landscape is the interface. Camera is the protagonist.
 * Pocket Signal / waveform language is gone.
 */
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

function legName(p) {
  if (p < 0.16) return "origin";
  if (p < 0.3) return "influence";
  if (p < 0.48) return "movement";
  if (p < 0.64) return "toronto";
  if (p < 0.82) return "creation";
  if (p < 0.92) return "identity";
  return "future";
}

/**
 * Keyframed camera: ridge → Jamaica lane → crossing → gable street →
 * rise over grid → drop into night block → settle.
 * p, px, py, pz, lx, ly, lz
 */
const CAM = [
  [0.0, 3.6, 4.1, 14, 0.2, 0.85, 2.5],
  [0.08, 1.6, 2.6, 10, 0.12, 1.05, -2],
  [0.16, 0.38, 1.72, 4, 0.08, 1.22, -10],
  [0.26, 0.28, 1.62, -6, 0.12, 1.22, -20],
  [0.36, 1.35, 3.6, -22, 0.2, 1.7, -36],
  [0.46, 2.1, 7.4, -36, -1.4, 2.4, -50],
  [0.55, 0.38, 1.82, -50, -0.15, 1.45, -62],
  [0.64, 4.6, 14.2, -58, -7.2, 7.5, -74],
  [0.74, 0.22, 1.52, -74, -2.6, 1.35, -84],
  [0.86, 0.18, 1.66, -90, 0.05, 1.42, -102],
  [1.0, 0.1, 1.82, -108, 0.0, 1.58, -122],
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

  const asphalt = makeCanvasTex(THREE, 128, (g, s) => {
    g.fillStyle = "#2a2c30";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = "rgba(255,255,255,0.04)";
      g.fillRect(hash(i) * s, hash(i + 4) * s, 2, 2);
    }
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

  return { laterite, zinc, breeze, brick, asphalt, dirtRoad, shingle, canopy };
}

function makeTerrain(THREE, mobile) {
  const segsX = mobile ? 40 : 64;
  const segsZ = mobile ? 56 : 88;
  const geo = new THREE.PlaneGeometry(42, 170, segsX, segsZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const worldZ = z - 50;
    const jam = clamp01((worldZ + 52) / 72);
    const hill =
      Math.sin(x * 0.14 + 0.5) * 2.1 +
      Math.sin(z * 0.07 + x * 0.05) * 3.4 +
      Math.sin(z * 0.22) * 0.55;
    const edge = 1 - Math.min(1, Math.abs(x) / 18);
    pos.setY(i, Math.max(0, hill * jam * edge));
    const r = lerp(0.42, 0.72, jam);
    const g = lerp(0.44, 0.48, jam);
    const b = lerp(0.46, 0.28, jam);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 110);
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

function placeJamHouses(mobile) {
  const n = mobile ? 12 : 22;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    list.push({
      x: side * (3.15 + hash(i + 4) * 1.6),
      z: 8 - i * 1.55 - hash(i + 2) * 0.55,
      w: 1.35 + hash(i + 7) * 1.05,
      h: 1.15 + hash(i + 9) * 1.2,
      d: 1.45 + hash(i + 3) * 0.85,
      hue: hash(i + 11),
    });
  }
  return list;
}

function placeToHouses(mobile) {
  const n = mobile ? 16 : 28;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -46 - i * 1.85 - hash(i + 40) * 0.4;
    list.push({
      x: side * (3.2 + hash(i + 41) * 1.1 + (i % 6 === 0 ? 1.8 : 0)),
      z,
      w: 1.5 + hash(i + 42) * 0.9,
      h: 2.4 + hash(i + 43) * 1.8,
      d: 1.7 + hash(i + 44) * 0.8,
      gable: 0.7 + hash(i + 45) * 0.5,
    });
  }
  return list;
}

function placeTrees(mobile, kind) {
  const n = mobile ? 22 : 48;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = hash(i + 80 + kind) > 0.5 ? -1 : 1;
    let z;
    if (kind === 0) {
      z = 16 - i * 0.85 - hash(i + 81) * 1.1;
      if (z < -26) continue;
    } else {
      z = -48 - i * 1.15;
      if (z < -100) continue;
    }
    list.push({
      x: side * (4.6 + hash(i + 82) * 6.2),
      z,
      s: kind === 0 ? 0.9 + hash(i + 83) * 1.5 : 0.45 + hash(i + 83) * 0.55,
      h: kind === 0 ? 2.2 + hash(i + 84) * 2.8 : 3.2 + hash(i + 84) * 2.4,
    });
  }
  return list;
}

function placePoles(mobile) {
  const n = mobile ? 10 : 18;
  const list = [];
  for (let i = 0; i < n; i++) {
    const z = 10 - i * 6.6;
    list.push({ x: -2.15, z });
    list.push({ x: 2.15, z: z - 2.8 });
  }
  return list;
}

function placeSlabs(mobile) {
  const n = mobile ? 5 : 9;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    list.push({
      x: side * (9.5 + hash(i + 60) * 4.2),
      z: -54 - i * 3.4,
      w: 2.4 + hash(i + 61) * 2.2,
      h: 10 + hash(i + 62) * 14,
      d: 2.2 + hash(i + 63) * 1.6,
    });
  }
  return list;
}

function followRate(p) {
  if (p < 0.16) return 0.042;
  if (p < 0.3) return 0.055;
  if (p < 0.5) return 0.13;
  if (p < 0.64) return 0.07;
  if (p < 0.82) return 0.09;
  return 0.038;
}

function makeLabel(THREE, title, z, y, dark) {
  const w = 1024;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.clearRect(0, 0, w, h);
  g.fillStyle = dark ? "rgba(236,242,246,0.94)" : "rgba(28,14,8,0.94)";
  g.font = "800 120px Syne, Arial Black, sans-serif";
  g.textAlign = "center";
  g.fillText(title, w / 2, 168);
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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.7), mat);
  mesh.position.set(0, y, z);
  mesh.renderOrder = 4;
  mesh.userData.tex = tex;
  mesh.userData.homeZ = z;
  mesh.userData.homeY = y;
  return mesh;
}

function makeMotes(THREE, n, color) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hash(i) - 0.5) * 16;
    pos[i * 3 + 1] = 0.35 + hash(i + 3) * 5.5;
    pos[i * 3 + 2] = 18 - hash(i + 9) * 128;
    seed[i] = hash(i + 21);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.PointsMaterial({
    color: color,
    size: 0.065,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.seed = seed;
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
    const pose = useRef({ px: 3.6, py: 4.1, pz: 14, lx: 0.2, ly: 0.85, lz: 2.5 });
    const look = useMemo(() => new THREE.Vector3(), []);
    const lastLeg = useRef("");
    const sun = useRef(null);
    const hemi = useRef(null);
    const street = useRef(null);
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
        ash: mk({ map: tex.asphalt, color: 0x5a6068, transparent: true, opacity: 0.08 }),
        zinc: mk({ map: tex.zinc, color: 0xc4c0b8 }),
        wall: mk({ map: tex.breeze, color: 0xffffff }),
        brick: mk({ map: tex.brick, color: 0xffffff }),
        shingle: mk({ map: tex.shingle, color: 0x6a727c }),
        canopy: mk({ map: tex.canopy, color: 0x2a7a44 }),
        winter: mk({ color: 0x6a7064 }),
        trunk: mk({ color: 0x5a3a28 }),
        pole: mk({ color: 0x3a3830 }),
        slab: mk({ color: 0x8aa0b0, emissive: 0x152028, emissiveIntensity: 0.2 }),
        needle: mk({ color: 0xb0bcc8 }),
        ridge: mk({ color: 0x3a6a48 }),
        ridgeFar: mk({ color: 0x4a7a58 }),
        stoop: mk({ color: 0xb09a80 }),
        speaker: mk({ color: 0x3a3228 }),
        window: new THREE.MeshBasicMaterial({ color: 0xffc07a }),
        windowDim: new THREE.MeshBasicMaterial({ color: 0x7a8fa0 }),
      };
    }, [tex]);

    const terrainGeo = useMemo(() => makeTerrain(THREE, mobile || cheap), [mobile, cheap]);
    const ridgeA = useMemo(() => makeRidge(THREE, 1.2, 28, 18, 9), []);
    const ridgeB = useMemo(() => makeRidge(THREE, 2.7, 22, 14, 7), []);
    const gableGeo = useMemo(() => makeGable(THREE), []);
    const jamHouses = useMemo(() => placeJamHouses(mobile || cheap), [mobile, cheap]);
    const toHouses = useMemo(() => placeToHouses(mobile || cheap), [mobile, cheap]);
    const jamTrees = useMemo(() => placeTrees(mobile || cheap, 0), [mobile, cheap]);
    const toTrees = useMemo(() => placeTrees(mobile || cheap, 1), [mobile, cheap]);
    const poles = useMemo(() => placePoles(mobile || cheap), [mobile, cheap]);
    const slabs = useMemo(() => placeSlabs(mobile || cheap), [mobile, cheap]);

    const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const coneGeo = useMemo(() => new THREE.ConeGeometry(0.7, 1.8, 6), []);
    const mangoGeo = useMemo(() => new THREE.SphereGeometry(0.7, 6, 5), []);
    const cylGeo = useMemo(() => new THREE.CylinderGeometry(0.06, 0.08, 1, 5), []);
    const needleGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.4, 26, 6), []);
    const needleTip = useMemo(() => new THREE.ConeGeometry(0.2, 5, 6), []);
    const roofGeo = useMemo(() => new THREE.BoxGeometry(1, 0.08, 1), []);

    const packed = useMemo(() => {
      const jamWall = new THREE.InstancedMesh(boxGeo, mat.wall, jamHouses.length);
      jamWall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(jamHouses.length * 3), 3);
      fillInstanced(THREE, jamWall, jamHouses, (d, it, i, col) => {
        d.position.set(it.x, it.h / 2, it.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(it.w, it.h, it.d);
        if (it.hue > 0.72) col.set(0x2a6a7a);
        else if (it.hue > 0.48) col.set(0xc4a04a);
        else if (it.hue > 0.28) col.set(0xa43c28);
        else col.set(0xd8c4a0);
      });

      const jamRoof = new THREE.InstancedMesh(roofGeo, mat.zinc, jamHouses.length);
      fillInstanced(THREE, jamRoof, jamHouses, (d, it) => {
        d.position.set(it.x, it.h + 0.12, it.z - 0.05);
        d.rotation.set(-0.28, 0, 0);
        d.scale.set(it.w * 1.18, 1, it.d * 1.25);
      });

      const toWall = new THREE.InstancedMesh(boxGeo, mat.brick, toHouses.length);
      toWall.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(toHouses.length * 3), 3);
      fillInstanced(THREE, toWall, toHouses, (d, it, i, col) => {
        d.position.set(it.x, it.h / 2, it.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(it.w, it.h, it.d);
        col.set(i % 3 === 0 ? 0xb86a58 : 0x8a4a3c);
      });

      const toGable = new THREE.InstancedMesh(gableGeo, mat.shingle, toHouses.length);
      fillInstanced(THREE, toGable, toHouses, (d, it) => {
        d.position.set(it.x, it.h, it.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(it.w * 1.05, it.gable, it.d * 1.02);
      });

      const canopy = new THREE.InstancedMesh(mangoGeo, mat.canopy, jamTrees.length);
      const trunk = new THREE.InstancedMesh(cylGeo, mat.trunk, jamTrees.length);
      fillInstanced(THREE, canopy, jamTrees, (d, t) => {
        d.position.set(t.x, t.h * 0.72, t.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(t.s * 1.4, t.h * 0.42, t.s * 1.4);
      });
      fillInstanced(THREE, trunk, jamTrees, (d, t) => {
        d.position.set(t.x, t.h * 0.22, t.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(1.1, t.h * 0.5, 1.1);
      });

      const winter = new THREE.InstancedMesh(coneGeo, mat.winter, toTrees.length);
      const wtrunk = new THREE.InstancedMesh(cylGeo, mat.trunk, toTrees.length);
      fillInstanced(THREE, winter, toTrees, (d, t) => {
        d.position.set(t.x, t.h * 0.55, t.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(t.s * 0.55, t.h / 1.8, t.s * 0.55);
      });
      fillInstanced(THREE, wtrunk, toTrees, (d, t) => {
        d.position.set(t.x, t.h * 0.2, t.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(0.7, t.h * 0.42, 0.7);
      });

      const poleMesh = new THREE.InstancedMesh(cylGeo, mat.pole, poles.length);
      fillInstanced(THREE, poleMesh, poles, (d, p) => {
        d.position.set(p.x, 1.25, p.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(1.1, 2.5, 1.1);
      });

      const slabMesh = new THREE.InstancedMesh(boxGeo, mat.slab, slabs.length);
      fillInstanced(THREE, slabMesh, slabs, (d, s) => {
        d.position.set(s.x, s.h / 2, s.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(s.w, s.h, s.d);
      });

      return { jamWall, jamRoof, toWall, toGable, canopy, trunk, winter, wtrunk, poleMesh, slabMesh };
    }, [jamHouses, toHouses, jamTrees, toTrees, poles, slabs, boxGeo, roofGeo, gableGeo, mangoGeo, coneGeo, cylGeo, mat]);

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
        makeLabel(THREE, "ORIGIN", 8.5, 3.55, false),
        makeLabel(THREE, "THE LANE", -3.2, 3.15, false),
        makeLabel(THREE, "CROSSING", -31, 4.1, false),
        makeLabel(THREE, "TORONTO", -50, 3.35, true),
        makeLabel(THREE, "THE BLOCK", -76.5, 3.05, true),
        makeLabel(THREE, "STAY", -96, 3.1, true),
      ],
      []
    );

    const motes = useMemo(() => makeMotes(THREE, mobile || cheap ? 70 : 220, 0xf2ddc0), [mobile, cheap]);

    const lamps = useMemo(() => {
      const n = mobile || cheap ? 6 : 10;
      const mesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xffc48a }), n);
      mesh.frustumCulled = false;
      const d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        d.position.set(i % 2 ? 2.05 : -2.05, 2.55, -48 - i * 5.4);
        d.scale.set(0.08, 0.08, 0.08);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    }, [boxGeo, mobile, cheap]);

    const workZ = [-75.5, -79.4, -83.2, -87.1];

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
        cylGeo.dispose();
        needleGeo.dispose();
        needleTip.dispose();
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
    }, [scene, terrainGeo, ridgeA, ridgeB, gableGeo, boxGeo, coneGeo, mangoGeo, cylGeo, needleGeo, needleTip, roofGeo, packed, tex, labels, wires, motes, lamps]);

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

      const ahead = clamp01(p + damp.current.v * 9);
      sampleCam(p, mobile, pose.current);
      const lookAhead = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0 };
      sampleCam(ahead, mobile, lookAhead);

      const ptrAmt = 0.22 + (1 - p) * 0.18;
      const ptrX = (window.__ptrX || 0) * ptrAmt;
      const ptrY = (window.__ptrY || 0) * 0.1;
      let px = pose.current.px + ptrX * 0.55 + (lookAhead.px - pose.current.px) * 0.22;
      let py = pose.current.py + ptrY + spd * 0.15;
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
      const baseFov = lerp(mobile ? 48 : 44, mobile ? 52 : 47, smoothstep(0.5, 0.64, p));
      camera.fov = baseFov + spd * 4.5;
      camera.updateProjectionMatrix();

      const jam = 1 - smoothstep(0.26, 0.54, p);
      const veg = 1 - smoothstep(0.22, 0.42, p);
      const night = smoothstep(0.6, 0.78, p);
      const mixOn = !!window.__mixOn;
      const bpm = window.__mixBpm || 86;
      const beat = state.clock.elapsedTime * (bpm / 60);
      const phrase = 0.5 + 0.5 * Math.sin(beat * Math.PI * 0.25);
      const live = mixOn ? 0.35 + phrase * 0.65 : document.body.getAttribute("data-audio") === "paused" ? 0.22 : 0.08;
      const fogCol = scene.fog.color;
      fogCol.r = lerp(0.77, lerp(0.45, 0.06, night), 1 - jam);
      fogCol.g = lerp(0.63, lerp(0.5, 0.08, night), 1 - jam);
      fogCol.b = lerp(0.44, lerp(0.56, 0.11, night), 1 - jam);
      scene.background.copy(fogCol);
      scene.fog.near = lerp(22, 8, night) + jam * 6;
      scene.fog.far = lerp(95, 48, 1 - jam) - night * 6;

      if (hemi.current) {
        hemi.current.intensity = lerp(1.15, 0.35, night) + live * 0.12;
        hemi.current.color.setRGB(lerp(1, 0.55, 1 - jam), lerp(0.9, 0.64, 1 - jam), lerp(0.68, 0.74, 1 - jam));
        hemi.current.groundColor.setRGB(lerp(0.55, 0.14, night), lerp(0.38, 0.14, night), lerp(0.2, 0.16, night));
      }
      if (sun.current) {
        sun.current.intensity = lerp(1.65, 0.28, night) * lerp(1, 0.6, 1 - jam);
        sun.current.color.setRGB(lerp(1, 0.72, 1 - jam), lerp(0.84, 0.8, 1 - jam), lerp(0.62, 0.88, 1 - jam));
        sun.current.position.set(lerp(12, 4, 1 - jam) + ptrX * 1.4, lerp(16, 10, 1 - jam), lerp(10, -22, 1 - jam));
      }
      if (street.current) {
        street.current.intensity = night * (4.6 + live * 1.8);
        street.current.position.set(0.35 + ptrX * 0.4, 2.4, pz - 5);
      }

      if (dirtRef.current) dirtRef.current.material.opacity = 0.2 + jam * 0.8;
      if (ashRef.current) ashRef.current.material.opacity = 0.05 + (1 - jam) * 0.95;
      if (wires) wires.visible = veg > 0.08;

      const clockT = state.clock.elapsedTime;
      if (packed.canopy && jamTrees.length) {
        jamTrees.forEach((tr, i) => {
          const sway = Math.sin(clockT * (0.55 + live) + i * 0.7) * 0.045 * veg;
          dummy.position.set(tr.x, tr.h * 0.72, tr.z);
          dummy.rotation.set(0, 0, sway);
          dummy.scale.set(tr.s * 1.4, tr.h * 0.42, tr.s * 1.4);
          dummy.updateMatrix();
          packed.canopy.setMatrixAt(i, dummy.matrix);
        });
        packed.canopy.instanceMatrix.needsUpdate = true;
      }

      if (motes.geometry) {
        const arr = motes.geometry.attributes.position.array;
        const seeds = motes.userData.seed;
        const wind = lerp(0.35, 1.1, 1 - jam) + spd * 0.8;
        for (let i = 0; i < seeds.length; i++) {
          const i3 = i * 3;
          arr[i3] += Math.sin(clockT * 0.4 + seeds[i] * 12) * 0.004 * wind;
          arr[i3 + 1] += Math.sin(clockT * 0.7 + seeds[i] * 6) * 0.003;
          arr[i3 + 2] += (jam * 0.02 - (1 - jam) * 0.04) * wind;
          if (arr[i3 + 2] > pz + 18) arr[i3 + 2] -= 90;
          if (arr[i3 + 2] < pz - 70) arr[i3 + 2] += 90;
        }
        motes.geometry.attributes.position.needsUpdate = true;
        motes.material.opacity = 0.18 + jam * 0.22 + night * 0.12 + live * 0.1;
        motes.material.color.setRGB(lerp(0.95, 0.7, 1 - jam), lerp(0.87, 0.82, 1 - jam), lerp(0.75, 0.9, 1 - jam));
        motes.material.size = (mobile ? 0.05 : 0.065) + spd * 0.04;
      }

      if (lamps.visible !== undefined) {
        lamps.visible = night > 0.12;
        lamps.material.transparent = true;
        lamps.material.opacity = night;
      }

      labels.forEach((m) => {
        m.position.x = ptrX * 0.15;
        m.position.y = m.userData.homeY;
        m.lookAt(camera.position.x, m.position.y, camera.position.z);
        const dist = Math.abs(m.position.z - camera.position.z);
        const dz = m.position.z - camera.position.z;
        let op = 0;
        if (dz < -1.2 && dist < 28) op = smoothstep(2.2, 7, dist) * (1 - smoothstep(16, 26, dist));
        m.material.opacity = op;
        m.visible = op > 0.04;
      });

      const leg = legName(p);
      if (lastLeg.current !== leg) {
        lastLeg.current = leg;
        document.body.setAttribute("data-leg", leg);
      }
      document.documentElement.style.setProperty("--journey", p.toFixed(3));
      document.documentElement.style.setProperty("--awake", awake.current.toFixed(3));
      document.documentElement.style.setProperty("--scroll-v", spd.toFixed(3));
      document.documentElement.style.setProperty("--fog", "#" + fogCol.getHexString());
      window.__journeyP = p;

      let room = -1;
      if (p > 0.7 && p < 0.9) {
        const u = (p - 0.7) / 0.2;
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
        position: [-4.6 + (i % 2) * 0.55, 0.35 + Math.floor(i / 2) * 0.55, -7.2],
        scale: [0.7, 0.5, 0.45],
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

    const crosses = [-52, -62, -72, -82].map((z) =>
      h("mesh", {
        key: "x" + z,
        geometry: boxGeo,
        material: mat.ash,
        position: [0, 0.07, z],
        scale: [18, 0.04, 2.4],
      })
    );

    return h(
      React.Fragment,
      null,
      h("ambientLight", { intensity: 0.42, color: 0xffe8cc }),
      h("hemisphereLight", { ref: hemi, args: [0xffe8c4, 0x7a5040, 1.1] }),
      h("directionalLight", { ref: sun, intensity: 1.55, position: [12, 16, 10], color: 0xffe0b8 }),
      h("directionalLight", { intensity: 0.55, position: [-6, 7, 8], color: 0xffd4b0 }),
      h("pointLight", { ref: street, intensity: 0, color: 0xffb060, distance: 22, position: [0, 2.4, -80] }),
      h("mesh", { geometry: terrainGeo, material: mat.earth, position: [0, 0, -50], receiveShadow: true }),
      h("mesh", {
        ref: dirtRef,
        geometry: boxGeo,
        material: mat.dirt,
        position: [0, 0.05, -18],
        scale: [3.6, 0.05, 72],
      }),
      h("mesh", {
        ref: ashRef,
        geometry: boxGeo,
        material: mat.ash,
        position: [0, 0.06, -78],
        scale: [3.5, 0.05, 70],
      }),
      h("mesh", { geometry: ridgeA, material: mat.ridge, position: [16, 0, -6] }),
      h("mesh", { geometry: ridgeB, material: mat.ridgeFar, position: [-17, 0, -14] }),
      h("mesh", { geometry: ridgeB, material: mat.ridge, position: [18, 0, 6], scale: [0.55, 0.7, 0.55] }),
      h("primitive", { object: packed.jamWall }),
      h("primitive", { object: packed.jamRoof }),
      h("primitive", { object: packed.toWall }),
      h("primitive", { object: packed.toGable }),
      h("primitive", { object: packed.canopy }),
      h("primitive", { object: packed.trunk }),
      h("primitive", { object: packed.winter }),
      h("primitive", { object: packed.wtrunk }),
      h("primitive", { object: packed.poleMesh }),
      h("primitive", { object: packed.slabMesh }),
      h("primitive", { object: wires }),
      h("primitive", { object: motes }),
      h("primitive", { object: lamps }),
      ...speakers,
      ...workMeshes,
      ...crosses,
      h("mesh", { geometry: needleGeo, material: mat.needle, position: [-11.5, 13, -70] }),
      h("mesh", { geometry: needleTip, material: mat.needle, position: [-11.5, 28, -70] }),
      ...labels.map((m, i) => h("primitive", { key: "lb" + i, object: m }))
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
        camera: { fov: 48, near: 0.12, far: 180, position: [3.6, 4.1, 14] },
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
