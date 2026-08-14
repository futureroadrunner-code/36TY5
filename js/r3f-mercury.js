/**
 * 36TY — The Pocket Signal.
 * One R3F world: a living waveform (not a sphere). Camera rides it.
 * PLAY knocks the signal off the pocket (baseline). Silk threads the wordmark.
 */
const IMPORT_KEYS = ["react", "react-dom/client", "@react-three/fiber", "three"];

const meshVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const meshFrag = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}

void main(){
  vec2 p = vUv - 0.5;
  vec2 m = uMouse - 0.5;
  float t = uTime * 0.07;
  float n1 = noise(p * 2.8 + t + m * 0.12);
  float n2 = noise(p * 5.2 - t * 0.6);
  float flow = smoothstep(0.35, 0.65, n1) * 0.45 + n2 * 0.2;
  vec2 g = abs(fract(p * 18.0 + vec2(t * 0.4, 0.0)) - 0.5);
  float scan = smoothstep(0.04, 0.0, g.y) * 0.16;

  vec3 deep = vec3(0.02, 0.04, 0.055);
  vec3 teal = vec3(0.05, 0.22, 0.28);
  vec3 ice = vec3(0.45, 0.85, 0.9);
  float r = abs(p.x) * 0.55 + abs(p.y) * 0.35;
  vec3 col = mix(deep, teal, smoothstep(0.9, 0.1, r));
  col = mix(col, ice * 0.35, flow * (1.0 - r));
  col += ice * scan;
  col += ice * 0.03 / (0.28 + length(p - m * 0.35));
  float alpha = 0.62 * smoothstep(1.15, 0.25, r);
  gl_FragColor = vec4(col, alpha);
}
`;

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

function isMobile() {
  return window.matchMedia("(max-width: 899px)").matches;
}

const BANDS = [
  { id: "bass", harm: 3.2, speed: 0.55, amp: 0.48, kick: 1.35, x: -0.22, thread: 0.08, width: 0.2, color: 0x3eb8b0 },
  { id: "silk", harm: 6.4, speed: 0.92, amp: 0.32, kick: 0.55, x: 0.0, thread: 0.82, width: 0.09, color: 0xc8e8e6 },
  { id: "air", harm: 11.5, speed: 1.45, amp: 0.18, kick: 0.2, x: 0.28, thread: 0.12, width: 0.045, color: 0x7fe8e0 },
];

function signalSegs({ cheap, reduced, mobile }) {
  if (reduced) return 40;
  if (cheap) return 48;
  if (mobile) return 64;
  return 96;
}

function allocRibbon(THREE, segs) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(segs * 2 * 3);
  const nrm = new Float32Array(segs * 2 * 3);
  const uv = new Float32Array(segs * 2 * 2);
  const idx = new Uint16Array((segs - 1) * 6);
  for (let i = 0; i < segs; i++) {
    uv[i * 4] = i / (segs - 1);
    uv[i * 4 + 1] = 0;
    uv[i * 4 + 2] = i / (segs - 1);
    uv[i * 4 + 3] = 1;
  }
  for (let i = 0; i < segs - 1; i++) {
    const a = i * 2;
    const o = i * 6;
    idx[o] = a;
    idx[o + 1] = a + 1;
    idx[o + 2] = a + 2;
    idx[o + 3] = a + 1;
    idx[o + 4] = a + 3;
    idx[o + 5] = a + 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 48);
  return geo;
}

function stampRibbon(geo, segs, width, getPoint, scratch) {
  const pos = geo.attributes.position.array;
  const nrm = geo.attributes.normal.array;
  const p = scratch.p;
  const p2 = scratch.p2;
  const tan = scratch.tan;
  const side = scratch.side;
  const nor = scratch.nor;
  const view = scratch.view;
  view.set(0, 0, 1);
  for (let i = 0; i < segs; i++) {
    getPoint(i / (segs - 1), p);
    getPoint(Math.min(1, (i + 1) / (segs - 1)), p2);
    tan.subVectors(p2, p);
    if (tan.lengthSq() < 1e-10) tan.set(0, 1, 0);
    tan.normalize();
    side.crossVectors(tan, view);
    if (side.lengthSq() < 1e-10) {
      view.set(0, 1, 0);
      side.crossVectors(tan, view);
      view.set(0, 0, 1);
    }
    side.normalize();
    nor.crossVectors(side, tan).normalize();
    const hx = side.x * width * 0.5;
    const hy = side.y * width * 0.5;
    const hz = side.z * width * 0.5;
    const i6 = i * 6;
    pos[i6] = p.x - hx;
    pos[i6 + 1] = p.y - hy;
    pos[i6 + 2] = p.z - hz;
    pos[i6 + 3] = p.x + hx;
    pos[i6 + 4] = p.y + hy;
    pos[i6 + 5] = p.z + hz;
    nrm[i6] = nor.x;
    nrm[i6 + 1] = nor.y;
    nrm[i6 + 2] = nor.z;
    nrm[i6 + 3] = nor.x;
    nrm[i6 + 4] = nor.y;
    nrm[i6 + 5] = nor.z;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
}

function stationBump(u, ctx) {
  const n = Math.max(1, ctx.workCount || 4);
  const lock = ctx.workLock;
  const aim = ctx.workAim;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const su = (i + 0.5) / n;
    const d = (u - su) * 12;
    const focus = lock === i ? 1.65 : aim === i ? 1.08 : 0.46;
    b += Math.exp(-d * d) * focus;
  }
  return b;
}

function chapterWeights(scroll) {
  const hero = 1 - smoothstep(0.05, 0.14, scroll);
  const story = smoothstep(0.12, 0.24, scroll) * (1 - smoothstep(0.42, 0.54, scroll));
  const works = smoothstep(0.48, 0.6, scroll) * (1 - smoothstep(0.76, 0.86, scroll));
  const send = smoothstep(0.8, 0.92, scroll);
  let intro = 1 - hero - story - works - send;
  if (intro < 0) intro = 0;
  const sum = hero + intro + story + works + send || 1;
  return {
    hero: hero / sum,
    intro: intro / sum,
    story: story / sum,
    works: works / sum,
    send: send / sum,
  };
}

function chapterName(w) {
  let key = "hero";
  let max = w.hero;
  const map = [
    ["intro", w.intro],
    ["story", w.story],
    ["works", w.works],
    ["connect", w.send],
  ];
  for (let i = 0; i < map.length; i++) {
    if (map[i][1] > max) {
      max = map[i][1];
      key = map[i][0];
    }
  }
  return key;
}

function signalPoint(u, band, ctx, out) {
  const wts = ctx.weights || chapterWeights(ctx.scroll);
  const mobile = !!ctx.mobile;
  const near = Math.exp(-((u - ctx.writeU) * 12) * ((u - ctx.writeU) * 12));
  const harm = band.harm * (1 + ctx.mix * 0.9);
  const fold = ctx.mix * Math.sin(u * Math.PI * 4.4 + ctx.t * 1.85) * 0.34;
  const typeE = ctx.typeEnergy || 0;
  const xmit = ctx.transmit || 0;
  const amp =
    (0.1 +
      ctx.mix * 0.38 +
      ctx.kick * band.kick * 0.5 +
      near * (0.22 + ctx.pulse * 2.2 + xmit * 1.4) +
      typeE * 0.42 * (wts.send + 0.2)) *
    (1 + ctx.vel * 0.08);
  const osc =
    Math.sin(u * Math.PI * harm + ctx.t * band.speed) * band.amp +
    Math.sin(u * Math.PI * harm * 2.18 + ctx.t * band.speed * 1.32) * band.amp * 0.28 +
    fold;
  const w = osc * amp + ctx.py * 0.06 * Math.sin(u * Math.PI);
  const bump = stationBump(u, ctx);
  const dest = Math.exp(-((u - 1) * 9) * ((u - 1) * 9));

  const hx = lerp(mobile ? -1.35 : -2.15, mobile ? 1.05 : 0.12, u) + band.x * 0.08 + ctx.px * 0.06;
  const hy = (mobile ? -1.02 : -0.88) + w * 0.12 + band.x * 0.04;
  const hz = w * 0.42 + near * ctx.pulse * 0.22;

  const ix = lerp(hx, band.x * 0.35 + ctx.px * 0.08, 0.55);
  const iy = lerp(hy, (u - 0.5) * (mobile ? 1.6 : 2.2), 0.6);
  const iz = lerp(hz, (0.5 - u) * (mobile ? 4.5 : 6.5), 0.75);

  const turns = 1.55 + ctx.mix * 0.55;
  const ang = u * Math.PI * 2 * turns + band.x * 2.15 + ctx.t * 0.07;
  const rad = (mobile ? 0.52 : 0.82) + w * 0.26 + Math.abs(band.x) * 0.1;
  const sx = Math.cos(ang) * rad;
  const sy = Math.sin(ang) * rad * 0.76;
  const sz = (0.5 - u) * (mobile ? 14 : 22);

  const wx = mobile
    ? bump * 0.38 + band.x * 0.06 + w * 0.08
    : lerp(-2.55, 2.55, u) + band.x * 0.04 + w * 0.06;
  const wy = mobile
    ? lerp(1.05, -1.25, u) + bump * 0.08 + w * 0.1
    : 0.08 + bump * 0.58 + w * 0.1;
  const wz = w * 0.14 + bump * 0.24 + near * 0.12;

  const cx = lerp(mobile ? -0.55 : -1.15, mobile ? 0.95 : 1.85, u);
  const cy = lerp(0.28, -0.55, u) + w * 0.06 + typeE * 0.12 * Math.sin(u * Math.PI * 3);
  const cz = w * 0.05 + dest * (0.18 + xmit * 0.4) + near * xmit * 0.2;

  out.set(
    hx * wts.hero + ix * wts.intro + sx * wts.story + wx * wts.works + cx * wts.send,
    hy * wts.hero + iy * wts.intro + sy * wts.story + wy * wts.works + cy * wts.send,
    hz * wts.hero + iz * wts.intro + sz * wts.story + wz * wts.works + cz * wts.send
  );
  return out;
}

function createSignalMaterial(THREE, color) {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    metalness: 0.9,
    roughness: 0.16,
    envMapIntensity: 2.35,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    emissive: color,
    emissiveIntensity: 0.14,
    side: THREE.DoubleSide,
  });
}

function softParticleTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

async function loadLibs() {
  let React;
  let ReactDOM;
  let R3F;
  let THREE;
  try {
    [React, ReactDOM, R3F, THREE] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("@react-three/fiber"),
      import("three"),
    ]);
  } catch (err) {
    throw new Error("R3F mercury: ESM import failed — " + (err && err.message ? err.message : err));
  }
  if (!React || !React.createElement || !ReactDOM || !ReactDOM.createRoot || !R3F || !R3F.Canvas || !THREE || !THREE.WebGLRenderer) {
    throw new Error("R3F mercury: incomplete ESM graph");
  }
  let RoomEnvironment;
  try {
    ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
  } catch (err) {
    throw new Error("R3F mercury: RoomEnvironment failed — " + (err && err.message ? err.message : err));
  }
  if (!RoomEnvironment) throw new Error("R3F mercury: RoomEnvironment missing");
  return { React, ReactDOM, R3F, THREE, RoomEnvironment };
}

function bindRuntime(libs) {
  const { React, R3F, THREE, RoomEnvironment } = libs;
  const h = React.createElement;
  const { useRef, useMemo, useEffect, useState } = React;
  const { Canvas, useFrame, useThree } = R3F;

  function EnvironmentPMREM() {
    const { gl, scene } = useThree();
    useEffect(() => {
      const pmrem = new THREE.PMREMGenerator(gl);
      const room = new RoomEnvironment();
      const rt = pmrem.fromScene(room, 0.04);
      scene.environment = rt.texture;
      scene.background = null;
      room.dispose();
      pmrem.dispose();
      return () => {
        if (scene.environment === rt.texture) scene.environment = null;
        rt.dispose();
      };
    }, [gl, scene]);
    return null;
  }

  function Background({ reduced }) {
    const mat = useMemo(
      () =>
        new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          },
          vertexShader: meshVert,
          fragmentShader: meshFrag,
          transparent: true,
          depthWrite: false,
        }),
      []
    );
    const geo = useMemo(() => new THREE.PlaneGeometry(18, 12), []);

    useEffect(
      () => () => {
        mat.dispose();
        geo.dispose();
      },
      [mat, geo]
    );

    useFrame((state) => {
      if (document.hidden || reduced) return;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      const p = state.pointer;
      mat.uniforms.uMouse.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    });

    return h("mesh", {
      geometry: geo,
      material: mat,
      position: [0, 0, -4.5],
      frustumCulled: false,
      raycast: () => {},
    });
  }

  function SignalField({ cheap, reduced, mobile, getScroll, pointer, mixRef }) {
    const segs = signalSegs({ cheap, reduced, mobile });
    const bands = useMemo(() => (mobile || cheap ? BANDS.slice(0, 2) : BANDS), [mobile, cheap]);
    const geos = useMemo(() => bands.map(() => allocRibbon(THREE, segs)), [bands, segs]);
    const pocketGeo = useMemo(() => allocRibbon(THREE, segs), [segs]);
    const mats = useMemo(() => bands.map((b) => createSignalMaterial(THREE, b.color)), [bands]);
    const pocketMat = useMemo(
      () =>
        new THREE.MeshBasicMaterial({
          color: 0x7fe8e0,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      []
    );
    const scratch = useMemo(
      () => ({
        p: new THREE.Vector3(),
        p2: new THREE.Vector3(),
        tan: new THREE.Vector3(),
        side: new THREE.Vector3(),
        nor: new THREE.Vector3(),
        view: new THREE.Vector3(0, 0, 1),
      }),
      []
    );
    const head = useRef(null);
    const headGeo = useMemo(() => new THREE.BoxGeometry(0.07, 0.07, 0.16), []);
    const headMat = useMemo(
      () =>
        new THREE.MeshBasicMaterial({
          color: 0xe8f6fa,
          transparent: true,
          opacity: 0.95,
        }),
      []
    );
    const ctx = useRef({
      t: 0,
      scroll: 0,
      mix: 0,
      kick: 0,
      pulse: 0,
      writeU: 0.42,
      vel: 0,
      px: 0,
      py: 0,
      mobile: false,
      cheap: false,
      weights: chapterWeights(0),
      workCount: 4,
      workLock: -1,
      workAim: -1,
      typeEnergy: 0,
      transmit: 0,
    });
    const lastCss = useRef({ a: "", x: "", w: "", p: "", ch: "", lk: "" });
    const wasMix = useRef(false);

    useEffect(
      () => () => {
        geos.forEach((g) => g.dispose());
        pocketGeo.dispose();
        mats.forEach((m) => m.dispose());
        pocketMat.dispose();
        headGeo.dispose();
        headMat.dispose();
      },
      [geos, pocketGeo, mats, pocketMat, headGeo, headMat]
    );

    useFrame((state) => {
      if (document.hidden) return;
      const c = ctx.current;
      c.t = reduced ? 0 : state.clock.elapsedTime;
      c.scroll = typeof getScroll === "function" ? getScroll() || 0 : 0;
      c.weights = chapterWeights(c.scroll);
      c.workCount = window.__workCount || 4;
      c.workLock = typeof window.__workLock === "number" ? window.__workLock : -1;
      c.workAim = typeof window.__workAim === "number" ? window.__workAim : -1;
      window.__typeEnergy = Math.max(0, (window.__typeEnergy || 0) * 0.965);
      c.typeEnergy = window.__typeEnergy;
      const mixOn = !!window.__mixOn;
      c.mix += ((mixOn ? 1 : 0) - c.mix) * 0.1;
      if (mixRef) mixRef.current = c.mix;
      const bpm = window.__mixBpm || 90;
      const beat = c.t * (bpm / 60) * Math.PI * 2;
      c.kick = mixOn && !reduced ? Math.pow(Math.max(0, Math.cos(beat)), 14) : 0;
      if (mixOn && !wasMix.current && !window.__mixPulseAt) window.__mixPulseAt = performance.now();
      wasMix.current = mixOn;
      const pulseAt = window.__mixPulseAt || 0;
      const pulseAge = pulseAt ? (performance.now() - pulseAt) / 1000 : 9;
      const transmitAt = window.__transmitAt || 0;
      const transmitAge = transmitAt ? (performance.now() - transmitAt) / 1000 : 9;
      c.pulse = pulseAge < 0.88 ? 1 - pulseAge / 0.88 : 0;
      c.transmit = transmitAge < 0.95 ? 1 - transmitAge / 0.95 : 0;
      if (c.transmit > c.pulse) c.pulse = c.transmit;
      const ch = chapterName(c.weights);
      const workN = c.workCount;
      const stationOf = (i) => (i + 0.5) / workN;
      if (reduced) c.writeU = 0.5;
      else if (c.transmit > 0) c.writeU = clamp01(transmitAge / 0.78);
      else if (c.pulse > 0 && ch !== "works" && ch !== "connect") c.writeU = clamp01(pulseAge / 0.72);
      else if (ch === "works") {
        const vis = typeof window.__workVisible === "number" ? window.__workVisible : -1;
        const target =
          c.workLock >= 0
            ? stationOf(c.workLock)
            : c.workAim >= 0
              ? stationOf(c.workAim)
              : vis >= 0
                ? stationOf(vis)
                : 0.12 + (window.__worksProgress || 0) * 0.76;
        c.writeU += (target - c.writeU) * 0.14;
      } else if (ch === "connect") {
        const fieldU = typeof window.__fieldU === "number" ? window.__fieldU : -1;
        const target = window.__transmitted ? 1 : fieldU >= 0 ? fieldU : 0.28 + Math.sin(c.t * 0.28) * 0.1;
        c.writeU += (target - c.writeU) * 0.12;
      } else if (mixOn) c.writeU = (c.t * (bpm / 60)) % 1;
      else c.writeU = 0.34 + Math.sin(c.t * 0.28) * 0.12;
      window.__writeU = c.writeU;
      c.vel = Math.min(1.5, Math.abs(window.__scrollVel || 0) / 28);
      c.px = pointer.current.x;
      c.py = pointer.current.y;
      c.mobile = mobile;
      c.cheap = cheap;

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

      const slim = 0.4 + c.weights.story * 0.55 + c.weights.works * 0.3 + c.mix * 0.28 + c.pulse * 0.35;
      const silk = bands.find((b) => b.id === "silk") || bands[0];
      bands.forEach((band, bi) => {
        const nearBoost = band.id === silk.id ? 1 + c.pulse * 0.9 : 1;
        stampRibbon(
          geos[bi],
          segs,
          band.width * slim * (1 + c.kick * 0.28) * nearBoost,
          (u, out) => signalPoint(u, band, c, out),
          scratch
        );
        if (mats[bi]) {
          const press = c.kick + c.pulse * 0.7 + c.typeEnergy * 0.45 + (c.workLock >= 0 && c.weights.works > 0.4 ? 0.25 : 0);
          mats[bi].emissiveIntensity = 0.1 + c.mix * 0.3 + c.kick * 0.7 + c.pulse * 0.9 + c.transmit * 0.8;
          mats[bi].roughness = 0.12 + press * 0.32;
          mats[bi].metalness = 0.92 - press * 0.28;
        }
      });

      const pocketBand = { harm: 1, speed: 0, amp: 0, kick: 0, x: 0, thread: 0.82 };
      stampRibbon(
        pocketGeo,
        segs,
        0.028,
        (u, out) => {
          const holdMix = c.mix;
          const holdKick = c.kick;
          const holdPulse = c.pulse;
          const holdXmit = c.transmit;
          const holdType = c.typeEnergy;
          c.mix = 0;
          c.kick = 0;
          c.pulse = 0;
          c.transmit = 0;
          c.typeEnergy = 0;
          signalPoint(u, pocketBand, c, out);
          c.mix = holdMix;
          c.kick = holdKick;
          c.pulse = holdPulse;
          c.transmit = holdXmit;
          c.typeEnergy = holdType;
        },
        scratch
      );

      if (head.current) {
        signalPoint(c.writeU, silk, c, scratch.p);
        signalPoint(Math.min(1, c.writeU + 0.04), silk, c, scratch.p2);
        head.current.position.copy(scratch.p);
        head.current.lookAt(scratch.p2);
        const s = (mobile ? 0.9 : 1.15) * (1 + c.pulse * 1.8 + c.kick * 0.55);
        head.current.scale.setScalar(s);
        headMat.opacity = 0.5 + c.pulse * 0.5;
      }

      const writing = c.pulse > 0.06 || c.transmit > 0.06;
      document.body.classList.toggle("is-writing", writing);
      document.body.classList.toggle("is-transmitting", c.transmit > 0.08);
      if (lastCss.current.ch !== ch) {
        lastCss.current.ch = ch;
        document.body.setAttribute("data-signal", ch);
      }
      const lockStr = String(c.workLock);
      if (lastCss.current.lk !== lockStr) {
        lastCss.current.lk = lockStr;
        document.documentElement.style.setProperty("--work-lock", lockStr);
      }

      const ampStr = (c.mix * 0.45 + c.kick + c.pulse * 0.8).toFixed(3);
      const xStr = c.px.toFixed(3);
      const wStr = c.writeU.toFixed(3);
      const pStr = c.pulse.toFixed(3);
      if (lastCss.current.a !== ampStr) {
        lastCss.current.a = ampStr;
        document.documentElement.style.setProperty("--signal-amp", ampStr);
      }
      if (lastCss.current.x !== xStr) {
        lastCss.current.x = xStr;
        document.documentElement.style.setProperty("--signal-x", xStr);
      }
      if (lastCss.current.w !== wStr) {
        lastCss.current.w = wStr;
        document.documentElement.style.setProperty("--write-u", wStr);
      }
      if (lastCss.current.p !== pStr) {
        lastCss.current.p = pStr;
        document.documentElement.style.setProperty("--pulse", pStr);
      }
    });

    return h(
      React.Fragment,
      null,
      h("mesh", { geometry: pocketGeo, material: pocketMat, frustumCulled: false, raycast: () => {} }),
      ...bands.map((band, i) =>
        h("mesh", {
          key: band.id,
          geometry: geos[i],
          material: mats[i],
          frustumCulled: false,
          raycast: () => {},
        })
      ),
      h("mesh", { ref: head, geometry: headGeo, material: headMat, frustumCulled: false, raycast: () => {} })
    );
  }

  function Hiss({ cheap, reduced }) {
    const count = reduced ? 28 : cheap ? 40 : 90;
    const tex = useMemo(() => softParticleTexture(THREE), []);
    const geo = useMemo(() => {
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const ice = new THREE.Color(0x7fe8e0);
      const pearl = new THREE.Color(0xe8f2f4);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 7;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
        const c = Math.random() > 0.5 ? ice : pearl;
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 20);
      return g;
    }, [count]);
    const pmat = useMemo(
      () =>
        new THREE.PointsMaterial({
          size: cheap ? 0.04 : 0.05,
          map: tex,
          vertexColors: true,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
        }),
      [tex, cheap]
    );
    const points = useRef(null);
    useEffect(
      () => () => {
        geo.dispose();
        pmat.dispose();
        tex.dispose();
      },
      [geo, pmat, tex]
    );
    useFrame((state) => {
      if (document.hidden || reduced || !points.current) return;
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
      pmat.opacity = 0.28 + (window.__mixOn ? 0.25 : 0);
    });
    return h("points", { ref: points, geometry: geo, material: pmat, raycast: () => {} });
  }

  function Director({ reduced, getScroll, cheap, mobile, visibleRef }) {
    const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
    const mixRef = useRef(0);
    const { camera } = useThree();
    const look = useMemo(() => new THREE.Vector3(), []);
    const ahead = useMemo(() => new THREE.Vector3(), []);
    const ride = useMemo(() => new THREE.Vector3(), []);
    const silk = BANDS[1];

    useEffect(() => {
      const onMove = (e) => {
        pointer.current.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        pointer.current.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    }, []);

    useFrame((state) => {
      if (document.hidden) return;
      if (visibleRef && visibleRef.current === false) return;
      if (reduced) return;

      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.08;
      p.y += (p.ty - p.y) * 0.08;
      const scroll = typeof getScroll === "function" ? getScroll() || 0 : 0;
      const wts = chapterWeights(scroll);
      const mix = mixRef.current;
      const bpm = window.__mixBpm || 90;
      const pulseAt = window.__mixPulseAt || 0;
      const pulseAge = pulseAt ? (performance.now() - pulseAt) / 1000 : 9;
      const pulse = pulseAge < 0.88 ? 1 - pulseAge / 0.88 : 0;
      const kick = window.__mixOn ? Math.pow(Math.max(0, Math.cos(state.clock.elapsedTime * (bpm / 60) * Math.PI * 2)), 14) : 0;
      const writeU = typeof window.__writeU === "number" ? window.__writeU : 0.45;
      const transmitAt = window.__transmitAt || 0;
      const transmitAge = transmitAt ? (performance.now() - transmitAt) / 1000 : 9;
      const transmit = transmitAge < 0.95 ? 1 - transmitAge / 0.95 : 0;
      const workLock = typeof window.__workLock === "number" ? window.__workLock : -1;
      const ctx = {
        t: state.clock.elapsedTime,
        scroll,
        mix,
        kick,
        pulse: Math.max(pulse, transmit),
        writeU,
        vel: Math.min(1.5, Math.abs(window.__scrollVel || 0) / 28),
        px: p.x,
        py: p.y,
        mobile,
        cheap,
        weights: wts,
        workCount: window.__workCount || 4,
        workLock,
        workAim: typeof window.__workAim === "number" ? window.__workAim : -1,
        typeEnergy: window.__typeEnergy || 0,
        transmit,
      };
      const lookU = wts.hero > 0.55 ? lerp(0.42, writeU, pulse * 0.45) : writeU;
      signalPoint(lookU, silk, ctx, look);
      signalPoint(Math.min(1, lookU + 0.05), silk, ctx, ahead);
      ahead.sub(look);
      if (ahead.lengthSq() < 1e-8) ahead.set(0, 0, -1);
      ahead.normalize();

      const sz = (0.5 - writeU) * (mobile ? 14 : 22);
      const heroX = (mobile ? 0 : -0.05) + p.x * 0.1;
      const heroY = (mobile ? -0.22 : -0.18) + p.y * 0.08;
      const heroZ = mobile ? 5.05 : 5.45;
      const introX = lerp(heroX, 0, 0.4);
      const introY = lerp(heroY, 0.06, 0.4);
      const introZ = lerp(heroZ, sz + (mobile ? 3.2 : 4.2), 0.55);
      const storyX = 0;
      const storyY = 0.02;
      const storyZ = sz + (mobile ? 1.55 : 2.35);
      const lockPull = workLock >= 0 ? 0.5 : 0;
      const worksX = look.x * 0.22 + p.x * 0.05;
      const worksY = look.y + (mobile ? 0.48 : 0.72);
      const worksZ = (mobile ? 4.85 : 5.2) - lockPull;
      const sendX = look.x * 0.18 + (mobile ? 0 : -0.45);
      const sendY = look.y + 0.32;
      const sendZ = mobile ? 5.05 : 5.35;

      camera.position.x = heroX * wts.hero + introX * wts.intro + storyX * wts.story + worksX * wts.works + sendX * wts.send;
      camera.position.y = heroY * wts.hero + introY * wts.intro + storyY * wts.story + worksY * wts.works + sendY * wts.send;
      camera.position.z = heroZ * wts.hero + introZ * wts.intro + storyZ * wts.story + worksZ * wts.works + sendZ * wts.send;
      camera.position.x += ahead.x * -pulse * 0.42;
      camera.position.y += ahead.y * -pulse * 0.18;
      camera.position.z += ahead.z * -pulse * 0.55;

      const lookHeroX = look.x;
      const lookHeroY = look.y;
      const lookHeroZ = look.z;
      const lookStoryX = 0;
      const lookStoryY = 0;
      const lookStoryZ = sz - (mobile ? 6.5 : 9.5);
      const lookWorksX = look.x;
      const lookWorksY = look.y;
      const lookWorksZ = look.z;
      const lookSendX = look.x;
      const lookSendY = look.y;
      const lookSendZ = look.z;
      ride.set(
        lookHeroX * wts.hero + lerp(lookHeroX, lookStoryX, 0.5) * wts.intro + lookStoryX * wts.story + lookWorksX * wts.works + lookSendX * wts.send,
        lookHeroY * wts.hero + lerp(lookHeroY, lookStoryY, 0.5) * wts.intro + lookStoryY * wts.story + lookWorksY * wts.works + lookSendY * wts.send,
        lookHeroZ * wts.hero + lerp(lookHeroZ, lookStoryZ, 0.5) * wts.intro + lookStoryZ * wts.story + lookWorksZ * wts.works + lookSendZ * wts.send
      );
      ride.x += p.x * 0.04 * wts.hero;
      ride.y += p.y * 0.03 * wts.hero;
      camera.fov = lerp(mobile ? 36 : 34, mobile ? 50 : 56, wts.story) + pulse * 4 + wts.works * 5 + transmit * 3;
      camera.updateProjectionMatrix();
      camera.lookAt(ride);
    });

    return h(
      React.Fragment,
      null,
      h(SignalField, { cheap, reduced, mobile, getScroll, pointer, mixRef }),
      h(Hiss, { cheap, reduced })
    );
  }

  function Lights({ cheap, getScroll, reduced }) {
    const dir = useRef(null);
    const teal = useRef(null);
    const cool = useRef(null);
    const amb = useRef(null);
    const dirI = cheap ? 2.2 : 2.8;
    const tealI = cheap ? 10 : 16;
    const coolI = cheap ? 4 : 6;

    useFrame((state) => {
      if (reduced || document.hidden) return;
      const scroll = typeof getScroll === "function" ? getScroll() || 0 : 0;
      const wts = chapterWeights(scroll);
      const vel = Math.min(1.5, Math.abs(window.__scrollVel || 0) / 28);
      const t = state.clock.elapsedTime;
      const pulseAt = window.__mixPulseAt || 0;
      const pulseAge = pulseAt ? (performance.now() - pulseAt) / 1000 : 9;
      const pulse = pulseAge < 0.88 ? 1 - pulseAge / 0.88 : 0;
      const mix = window.__mixOn ? 1 : 0;
      const xmit = window.__transmitAt ? Math.max(0, 1 - (performance.now() - window.__transmitAt) / 950) : 0;
      if (amb.current) amb.current.intensity = 0.22 + wts.story * 0.12 + wts.works * 0.2;
      if (dir.current) {
        dir.current.intensity = dirI * (0.85 + wts.hero * 0.2 + wts.works * 0.35 + pulse * 0.4);
        dir.current.position.set(3 + wts.works * 1.2, 4 - wts.story * 1.4, 4 + Math.sin(t * 0.2) * 0.12);
      }
      if (teal.current) {
        teal.current.intensity = tealI * (0.7 + wts.story * 0.9 + mix * 0.55 + pulse * 1.1 + vel * 0.2 + xmit * 1.2 + wts.send * 0.4);
        teal.current.position.set(-2.2 + wts.send * 2.4 + wts.works * 1.4, 1.1 + wts.story * 0.2, -1 + wts.story * 4);
      }
      if (cool.current) {
        cool.current.intensity = coolI * (1.05 - wts.story * 0.55 + wts.hero * 0.1);
      }
    });

    return h(
      React.Fragment,
      null,
      h("ambientLight", { ref: amb, intensity: 0.35, color: 0xb8d4dc }),
      h("directionalLight", { ref: dir, intensity: dirI, color: 0xe8f6fa, position: [3, 4, 4] }),
      h("pointLight", { ref: teal, intensity: tealI, color: 0x5ee0d0, distance: 22, position: [-2.5, 1.2, -1] }),
      h("pointLight", { ref: cool, intensity: coolI, color: 0x9ab8c8, distance: 16, position: [-1.5, -1, 3] })
    );
  }

  function Stage({ reduced, getScroll, cheap, mobile, frameloop, onReady, visibleRef }) {
    const camZ = cheap ? 4.2 : mobile ? 5.35 : 5.7;
    const camX = cheap ? 0 : mobile ? 0 : -0.32;

    return h(
      Canvas,
      {
        dpr: [1, cheap ? 1.35 : 1.75],
        gl: {
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        },
        frameloop,
        linear: false,
        flat: false,
        camera: {
          fov: cheap ? 38 : 34,
          near: 0.1,
          far: 80,
          position: [camX, mobile ? -0.18 : -0.12, camZ],
        },
        resize: { scroll: false, debounce: { scroll: 50, resize: 0 } },
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
          background: "transparent",
        },
        onCreated: (state) => {
          state.gl.setClearColor(0x000000, 0);
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = mobile ? 1.82 : 1.55;
          state.gl.outputColorSpace = THREE.SRGBColorSpace;
          window.__gl = state.gl;
          if (reduced) state.invalidate();
          if (typeof onReady === "function") onReady(state);
        },
      },
      h(EnvironmentPMREM, null),
      cheap ? null : h(Background, { cheap: false, reduced }),
      h(Lights, { cheap, getScroll, reduced }),
      h(Director, { reduced, getScroll, cheap, mobile, visibleRef })
    );
  }

  function App(props) {
    const reduced = props.reduced;
    const cheap = props.cheap;
    const [loop, setLoop] = useState(reduced ? "demand" : "always");
    const visibleRef = useRef(true);

    useEffect(() => {
      const syncIdle = () => {
        const idle = document.body.classList.contains("is-3d-idle");
        if (document.hidden) setLoop("never");
        else if (reduced) setLoop("demand");
        else setLoop(idle ? "demand" : "always");
      };
      const obs = new MutationObserver(syncIdle);
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      document.addEventListener("visibilitychange", syncIdle);
      syncIdle();
      return () => {
        obs.disconnect();
        document.removeEventListener("visibilitychange", syncIdle);
      };
    }, [reduced]);

    useEffect(() => {
      if (!cheap || !props.mountEl) return undefined;
      const io = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = !!entry && entry.isIntersecting;
          if (reduced) return;
          if (document.hidden) return;
          setLoop(entry && entry.isIntersecting ? "always" : "demand");
        },
        { threshold: 0.08 }
      );
      io.observe(props.mountEl);
      return () => io.disconnect();
    }, [cheap, props.mountEl, reduced]);

    return h(Stage, {
      reduced,
      getScroll: props.getScroll,
      cheap,
      mobile: props.mobile,
      frameloop: loop,
      onReady: props.onReady,
      visibleRef,
    });
  }

  return { App, h };
}

function ensureDiv(el) {
  if (!el) throw new Error("R3F mercury: missing mount element");
  if (el.tagName === "CANVAS") {
    const wrap = document.createElement("div");
    wrap.className = el.className || "mercury-root";
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
  let raf = 0;
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
      mountEl,
      onReady: (state) => {
        created = true;
        gl = state.gl;
        readyResolve();
      },
    })
  );

  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("R3F mercury: canvas init timeout")), 12000);
  });
  try {
    await Promise.race([ready, timeout]);
    clearTimeout(timer);
  } catch (err) {
    clearTimeout(timer);
    try {
      root.unmount();
    } catch (_) {}
    throw err;
  }
  if (!created || !gl) {
    try {
      root.unmount();
    } catch (_) {}
    throw new Error("R3F mercury: WebGL context missing");
  }

  return {
    ready: Promise.resolve(),
    setScroll(p) {
      scrollHold.value = p;
    },
    destroy() {
      cancelAnimationFrame(raf);
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

export async function mountMercury(el, opts = {}) {
  return mountScene(el, opts, { cheap: false });
}
