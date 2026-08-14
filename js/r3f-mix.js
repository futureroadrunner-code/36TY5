/**
 * 36TY — THE GATEFOLD WORLD
 * The album cover is a door. PLAY opens it. The camera enters the record.
 * One R3F canvas. Images become architecture, light, fabric, objects — not posters.
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

const ASSETS = {
  cover: "assets/cover-front.webp",
  silk: "assets/world-silk.webp",
  booth: "assets/world-booth.webp",
  hours: "assets/world-hours.webp",
  crate: "assets/world-crate.webp",
};
const SKETCH = ["silk", "booth", "hours", "crate"];
const LABELS = ["SILK ON THE 808", "PRESSURE SKETCH 3", "AFTERIMAGE CHORDS", "GRID DIG"];

/* progress, px, py, pz, lx, ly, lz, fov, bank
   PLAY drives the first 0.26 — through the fold — then scroll continues. */
const CAM = [
  [0.0, 0.0, 1.12, 2.78, 0.0, 1.12, 0.1, 31, 0],
  [0.1, 0.0, 1.13, 1.62, 0.0, 1.13, -0.35, 34, 0.008],
  [0.18, 0.0, 1.14, 0.72, 0.02, 1.14, -1.15, 38, 0.012],
  [0.26, 0.0, 1.16, 0.08, 0.04, 1.15, -2.35, 41, 0],
  [0.38, -0.22, 1.18, -1.55, -0.72, 1.28, -3.15, 39, -0.035],
  [0.5, 0.28, 1.14, -3.05, 0.92, 1.22, -4.35, 37, 0.04],
  [0.62, -0.06, 1.08, -4.85, 0.1, 1.12, -6.55, 43, -0.018],
  [0.74, 0.42, 0.96, -6.55, 0.78, 0.78, -8.05, 39, 0.028],
  [0.86, -0.08, 1.18, -8.35, -0.15, 1.22, -10.2, 36, -0.012],
  [1.0, 0.0, 1.34, -10.55, 0.0, 1.18, -12.8, 34, 0],
];

function sampleCam(p, mobile, out) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const t = smoothstep(a[0], b[0], p);
  const m = mobile ? 0.78 : 1;
  out.px = lerp(a[1], b[1], t) * m;
  out.py = lerp(a[2], b[2], t) + (mobile ? 0.04 : 0);
  out.pz = lerp(a[3], b[3], t);
  out.lx = lerp(a[4], b[4], t) * m;
  out.ly = lerp(a[5], b[5], t);
  out.lz = lerp(a[6], b[6], t);
  out.fov = lerp(a[7], b[7], t) + (mobile ? 5 : 0);
  out.bank = lerp(a[8], b[8], t);
  return out;
}

async function loadLibs() {
  const [React, ReactDOM, R3F, THREE] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@react-three/fiber"),
    import("three"),
  ]);
  if (!React?.createElement || !ReactDOM?.createRoot || !R3F?.Canvas || !THREE?.WebGLRenderer) {
    throw new Error("R3F world: incomplete ESM graph");
  }
  return { React, ReactDOM, R3F, THREE };
}

function bindRuntime(libs) {
  const { React, R3F, THREE } = libs;
  const h = React.createElement;
  const { useRef, useMemo, useEffect, useState } = React;
  const { Canvas, useFrame, useThree } = R3F;

  function loadTex(src) {
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(
        src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.needsUpdate = true;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  function splitCover(cover) {
    if (!cover) return { left: null, right: null };
    const left = cover.clone();
    const right = cover.clone();
    left.colorSpace = THREE.SRGBColorSpace;
    right.colorSpace = THREE.SRGBColorSpace;
    left.repeat.set(0.5, 1);
    left.offset.set(0, 0);
    right.repeat.set(0.5, 1);
    right.offset.set(0.5, 0);
    left.needsUpdate = true;
    right.needsUpdate = true;
    return { left, right };
  }

  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeType(str, opts = {}) {
    const w = opts.w || 1024;
    const h = opts.h || 256;
    return canvasTex(w, h, (ctx) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = opts.fill || "rgba(236,230,220,0.92)";
      ctx.font = opts.font || "italic 120px Georgia, serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = opts.align || "left";
      const x = opts.align === "center" ? w / 2 : 36;
      ctx.fillText(str, x, h * 0.55);
    });
  }

  function makeSheet(lines) {
    return canvasTex(512, 1024, (ctx, w, h) => {
      ctx.fillStyle = "#cfc6b8";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#2a241e";
      ctx.font = "italic 42px Georgia, serif";
      ctx.fillText("LINER NOTES", 36, 88);
      ctx.font = "22px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#4a4038";
      lines.forEach((ln, i) => ctx.fillText(ln, 36, 170 + i * 46));
    });
  }

  function makeWood() {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = "#1a1410";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        const y = (i / 8) * h;
        ctx.fillStyle = i % 2 ? "#221c16" : "#181410";
        ctx.fillRect(0, y, w, h / 8 - 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(0, y + h / 8 - 3, w, 3);
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = "rgba(255,220,180," + (0.015 + Math.random() * 0.03) + ")";
        ctx.fillRect(Math.random() * w, Math.random() * h, 80, 1);
      }
    });
  }

  function makePaper() {
    return canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = "#c8bdae";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = "rgba(80,60,40," + Math.random() * 0.07 + ")";
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
  }

  function World({ reduced, mobile, cheap, getScroll }) {
    const { scene, camera, gl } = useThree();
    const damp = useRef({ p: 0, v: 0, sum: 0 });
    const pose = useRef({ px: 0, py: 1.12, pz: 2.78, lx: 0, ly: 1.12, lz: 0.1, fov: 31, bank: 0 });
    const lastLeg = useRef("");
    const coverRoot = useRef(null);
    const leftDoor = useRef(null);
    const rightDoor = useRef(null);
    const curtain = useRef(null);
    const sleeve = useRef(null);
    const projMat = useRef(null);
    const windowLight = useRef(null);
    const roomLamp = useRef(null);
    const coverLamp = useRef(null);
    const slitLight = useRef(null);
    const shaft = useRef(null);
    const dests = useRef([]);
    const winRef = useRef(null);
    const muralRef = useRef(null);
    const projRef = useRef(null);
    const ray = useMemo(() => new THREE.Raycaster(), []);
    const ndc = useMemo(() => new THREE.Vector2(), []);
    const worldHit = useMemo(() => new THREE.Vector3(), []);

    const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
    const cyl = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 10), []);
    const curtainGeo = useMemo(() => {
      const segsX = mobile || cheap ? 6 : 10;
      const segsY = mobile || cheap ? 8 : 14;
      const g = new THREE.PlaneGeometry(1.18, 2.08, segsX, segsY);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, Math.sin(x * 6.4) * 0.05 + Math.sin(y * 4.6 + x * 2.1) * 0.09);
        pos.setX(i, x + Math.sin(y * 3.2) * 0.035);
      }
      g.computeVertexNormals();
      return g;
    }, [mobile, cheap]);

    const woodMap = useMemo(() => makeWood(), []);
    const paperMap = useMemo(() => makePaper(), []);
    woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
    woodMap.repeat.set(4, 10);

    const mats = useMemo(
      () => ({
        plaster: new THREE.MeshLambertMaterial({ color: 0x171410 }),
        plaster2: new THREE.MeshLambertMaterial({ color: 0x1d1914 }),
        plaster3: new THREE.MeshLambertMaterial({ color: 0x14110e }),
        wood: new THREE.MeshLambertMaterial({ color: 0xffffff, map: woodMap }),
        dark: new THREE.MeshLambertMaterial({ color: 0x0c0a09 }),
        board: new THREE.MeshLambertMaterial({ color: 0x2c241c }),
        spine: new THREE.MeshLambertMaterial({ color: 0x1a1510 }),
        paper: new THREE.MeshLambertMaterial({ color: 0xffffff, map: paperMap }),
        frame: new THREE.MeshLambertMaterial({ color: 0x1c1712 }),
        wainscot: new THREE.MeshLambertMaterial({ color: 0x241e18 }),
        lamp: new THREE.MeshBasicMaterial({ color: 0xffd4a0 }),
        lampOff: new THREE.MeshLambertMaterial({ color: 0x2a2218 }),
        ember: new THREE.MeshBasicMaterial({ color: 0xd4483a }),
        glass: new THREE.MeshLambertMaterial({ color: 0x2a2420, transparent: true, opacity: 0.22 }),
        shaft: new THREE.MeshBasicMaterial({
          color: 0xffc07a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      }),
      [woodMap, paperMap]
    );

    const type36 = useMemo(() => makeType("36", { w: 512, h: 512, font: "italic 280px Georgia, serif", align: "center" }), []);
    const typeTY = useMemo(() => makeType("TY", { w: 512, h: 512, font: "italic 280px Georgia, serif", align: "center" }), []);
    const typeSign = useMemo(() => makeType("36TY", { font: "italic 110px Georgia, serif" }), []);
    const typeLiner = useMemo(() => makeType("LINER NOTES", { font: "italic 96px Georgia, serif" }), []);
    const typeMail = useMemo(() => makeType("MAIL", { font: "italic 140px Georgia, serif", align: "center" }), []);
    const typeInnerL = useMemo(() => makeType("MARIO-VON", { font: "italic 88px Georgia, serif" }), []);
    const typeInnerR = useMemo(() => makeType("BECKFORD", { font: "italic 88px Georgia, serif" }), []);
    const sheet = useMemo(
      () =>
        makeSheet([
          "Nia Vale — Night Bus",
          "Courtland — Gold Tooth Gospel",
          "Imani Park — Slow Warrant",
          "The Lot Boys — Payphone Psalms",
          "KAYLA M. — Chrome Halo",
          "",
          "prod. 36TY",
          "hip-hop / R&B",
        ]),
      []
    );

    const typeMat = (tex, opacity) =>
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

    const typeMats = useMemo(
      () => ({
        t36: typeMat(type36, 0.82),
        tTY: typeMat(typeTY, 0.82),
        sign: typeMat(typeSign, 0.5),
        liner: typeMat(typeLiner, 0.42),
        mail: typeMat(typeMail, 0.35),
        innerL: typeMat(typeInnerL, 0.55),
        innerR: typeMat(typeInnerR, 0.55),
        sheet: new THREE.MeshLambertMaterial({ map: sheet }),
      }),
      [type36, typeTY, typeSign, typeLiner, typeMail, typeInnerL, typeInnerR, sheet]
    );

    const [maps, setMaps] = useState(null);
    useEffect(() => {
      let live = true;
      Promise.all([
        loadTex(ASSETS.cover),
        loadTex(ASSETS.silk),
        loadTex(ASSETS.booth),
        loadTex(ASSETS.hours),
        loadTex(ASSETS.crate),
      ]).then(([cover, silk, booth, hours, crate]) => {
        if (!live) return;
        const halves = splitCover(cover);
        const mk = (map, color, extra = {}) =>
          new THREE.MeshLambertMaterial({ map: map || undefined, color: map ? color : 0x443328, ...extra });
        const env = {
          coverL: mk(halves.left, 0xffffff),
          coverR: mk(halves.right, 0xffffff),
          silkWin: new THREE.MeshBasicMaterial({ map: silk || undefined, color: silk ? 0xffe2c4 : 0x664422 }),
          silkCloth: mk(silk, 0xb07060),
          boothWall: mk(booth, 0x8a7c6e),
          hoursProj: new THREE.MeshBasicMaterial({
            map: hours || undefined,
            color: hours ? 0xffe8d0 : 0x553322,
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
          }),
          cratePrint: mk(crate, 0xffffff),
        };
        projMat.current = env.hoursProj;
        setMaps(env);
      });
      return () => {
        live = false;
      };
    }, []);

    const motes = useMemo(() => {
      const n = mobile || cheap ? 18 : 48;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 2.8;
        pos[i * 3 + 1] = 0.35 + Math.random() * 1.55;
        pos[i * 3 + 2] = -11 + Math.random() * 11.5;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffe2c0,
        size: 0.012,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      return pts;
    }, [mobile, cheap]);

    useEffect(() => {
      scene.background = new THREE.Color(0x0a0908);
      scene.fog = new THREE.Fog(0x0a0908, 1.6, 4.2);
      const onClick = (e) => {
        if (e.target.closest("a, button, input, textarea, label, .channel, .form, .masthead, .bus, .nav-panel, .nav-toggle")) return;
        const i = window.__worldHit;
        if (typeof i !== "number" || i < 0) return;
        const btn = document.querySelector('.channel[data-work="' + i + '"] [data-play]');
        if (btn) btn.click();
        else if (window.Audio36) window.Audio36.play(SKETCH[i]);
        window.__workLock = i;
      };
      window.addEventListener("click", onClick);
      return () => {
        window.removeEventListener("click", onClick);
        box.dispose();
        plane.dispose();
        cyl.dispose();
        curtainGeo.dispose();
        woodMap.dispose();
        paperMap.dispose();
        Object.values(mats).forEach((m) => m.dispose());
        Object.values(typeMats).forEach((m) => m.dispose());
        [type36, typeTY, typeSign, typeLiner, typeMail, typeInnerL, typeInnerR, sheet].forEach((t) => t.dispose());
        motes.geometry.dispose();
        motes.material.dispose();
      };
    }, [scene, box, plane, cyl, curtainGeo, woodMap, paperMap, mats, typeMats, motes, type36, typeTY, typeSign, typeLiner, typeMail, typeInnerL, typeInnerR, sheet]);

    useEffect(() => {
      return () => {
        if (maps) Object.values(maps).forEach((m) => m.dispose());
      };
    }, [maps]);

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
      if (gl && gl.info) {
        perf.calls = gl.info.render.calls;
        perf.tris = gl.info.render.triangles;
      }

      const scroll = clamp01((typeof getScroll === "function" ? getScroll() : 0) || window.__mercuryScroll || 0);
      const mixOn = !!window.__mixOn;
      const raw = reduced ? Math.min(0.02, scroll) : clamp01(scroll);
      const prev = damp.current.p;
      const dtC = Math.min(0.05, Math.max(0.008, dt));
      damp.current.sum += ((mixOn ? 1 : 0.02) - damp.current.sum) * 0.048;
      const sum = damp.current.sum;
      const enter = sum * 0.26;
      const travel = enter + raw * (0.08 + 0.92 * sum) * 0.74;
      damp.current.p += (clamp01(travel) - damp.current.p) * (1 - Math.exp(-5.4 * dtC));
      damp.current.v = damp.current.p - prev;
      const p = damp.current.p;
      const bands = (window.Audio36 && window.Audio36.bands && window.Audio36.bands()) || { low: 0, mid: 0, high: 0 };
      const live = mixOn ? 0.28 + bands.low * 0.4 + bands.mid * 0.14 : 0.03;
      const spd = Math.min(1, Math.abs(window.__scrollVel || damp.current.v * 80) / 40);
      const t = state.clock.elapsedTime;

      sampleCam(p, mobile, pose.current);
      const ptrX = (window.__ptrX || 0) * (0.08 + sum * 0.1);
      const ptrY = (window.__ptrY || 0) * 0.045;
      let px = pose.current.px + ptrX + Math.sin(t * 0.62) * 0.007 * sum;
      let py = pose.current.py + ptrY + bands.low * 0.02 * sum + Math.cos(t * 0.48) * 0.005 * sum;
      let pz = pose.current.pz;
      let lx = pose.current.lx + ptrX * 0.4;
      let ly = pose.current.ly;
      let lz = pose.current.lz;

      dests.current = [winRef.current, muralRef.current, projRef.current, sleeve.current];
      dests.current.forEach((mesh, i) => {
        if (mesh) mesh.userData.i = i;
      });
      ndc.set(window.__ptrX || 0, window.__ptrY || 0);
      let hit = -1;
      if (sum > 0.35) {
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(dests.current.filter(Boolean), true);
        if (hits[0]) {
          let obj = hits[0].object;
          while (obj && typeof obj.userData.i !== "number") obj = obj.parent;
          if (obj && typeof obj.userData.i === "number") hit = obj.userData.i;
        }
      }
      window.__worldHit = hit;
      const lock = window.__workLock;
      const aim = lock >= 0 ? lock : hit >= 0 ? hit : window.__workAim;
      const focus = typeof aim === "number" ? aim : -1;
      if (focus >= 0 && dests.current[focus] && sum > 0.4 && p > 0.2) {
        dests.current[focus].getWorldPosition(worldHit);
        lx += (worldHit.x - lx) * 0.045;
        ly += (worldHit.y - ly) * 0.035;
        lz += (worldHit.z - lz) * 0.035;
        pz += (worldHit.z + 1.65 - pz) * 0.028;
      }

      camera.position.set(px, py, pz);
      camera.lookAt(lx, ly, lz);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z || 0, pose.current.bank + ptrX * 0.02, 0.08);
      camera.fov = pose.current.fov + spd * 1.4 + (1 - sum) * 1.2;
      camera.updateProjectionMatrix();

      scene.fog.near = lerp(1.55, 2.1, sum) + p * 0.35;
      scene.fog.far = lerp(4.15, 15.2, sum) + bands.mid * 0.8;

      if (coverLamp.current) coverLamp.current.intensity = 0.18 + sum * (0.55 + bands.low * 0.35);
      if (windowLight.current) windowLight.current.intensity = sum * (0.9 + bands.mid * 0.45 + (focus === 0 ? 0.55 : 0));
      if (roomLamp.current) roomLamp.current.intensity = sum * (0.7 + bands.low * 0.5 + live * 0.15 + (focus === 2 ? 0.35 : 0));
      if (slitLight.current) slitLight.current.intensity = sum * (0.35 + p * 0.5);
      if (mats.shaft) mats.shaft.opacity = sum * (0.04 + p * 0.08) * (0.7 + bands.high * 0.5);
      if (projMat.current) projMat.current.opacity = sum * (0.12 + bands.high * 0.1 + (focus === 2 ? 0.18 : 0) + p * 0.08);
      if (motes.material) motes.material.opacity = 0.02 + sum * 0.12 + bands.high * 0.08;

      const hinge = sum * 1.36;
      if (leftDoor.current) leftDoor.current.rotation.y = -hinge;
      if (rightDoor.current) rightDoor.current.rotation.y = hinge;
      if (coverRoot.current) {
        const closed = 1 - sum;
        coverRoot.current.rotation.y = ptrX * 0.14 * closed;
        coverRoot.current.rotation.x = ptrY * 0.05 * closed;
      }
      if (curtain.current) {
        curtain.current.rotation.y = Math.PI / 2 + 0.12 + Math.sin(t * 0.35) * 0.04 * sum;
        curtain.current.position.x = -1.38 + Math.sin(t * 0.22) * 0.015 * sum;
      }
      if (sleeve.current) {
        const hot = focus === 3 ? 1 : 0;
        sleeve.current.position.y = lerp(sleeve.current.position.y, 0.86 + hot * 0.05, 0.12);
        sleeve.current.rotation.z = lerp(sleeve.current.rotation.z, hot * 0.08, 0.12);
        sleeve.current.rotation.y = -0.42 + hot * 0.12;
      }

      dests.current.forEach((mesh, i) => {
        if (!mesh || !mesh.material || !mesh.material.color) return;
        const solo = focus === i;
        const other = focus >= 0 && focus !== i;
        const dim = other ? 0.45 : solo ? 1.08 : 1;
        if (mesh.material !== projMat.current) mesh.material.color.setRGB(dim, dim * 0.96, dim * 0.9);
      });

      const leg = p < 0.2 ? "cover" : p < 0.34 ? "enter" : p < 0.58 ? "sleeves" : p < 0.8 ? "liner" : "mail";
      if (lastLeg.current !== leg) {
        lastLeg.current = leg;
        document.body.setAttribute("data-leg", leg);
      }
      document.documentElement.style.setProperty("--sum", sum.toFixed(3));
      document.documentElement.style.setProperty("--live", live.toFixed(3));
      document.documentElement.style.setProperty("--journey", p.toFixed(3));
      window.__journeyP = p;
    });

    const wall = (pos, scl, mat) => h("mesh", { geometry: box, material: mat || mats.plaster, position: pos, scale: scl, castShadow: false, receiveShadow: false });

    return h(
      React.Fragment,
      null,
      h("ambientLight", { intensity: 0.07, color: 0xffe6cc }),
      h("hemisphereLight", { args: [0x2a221c, 0x070605, 0.22] }),
      h("pointLight", { ref: coverLamp, intensity: 0.2, color: 0xffc07a, distance: 5.5, position: [0.42, 1.85, 1.15] }),
      h("pointLight", { ref: windowLight, intensity: 0, color: 0xffb070, distance: 6.5, position: [-1.05, 1.42, -3.15] }),
      h("pointLight", { ref: roomLamp, intensity: 0, color: 0xffc090, distance: 8, position: [-0.55, 1.82, -6.2] }),
      h("pointLight", { ref: slitLight, intensity: 0, color: 0xffe0b0, distance: 7, position: [0, 1.7, -11.2] }),

      wall([0, 0.02, -5.4], [7.6, 0.08, 14.2], mats.wood),
      wall([0, 2.22, -5.4], [7.6, 0.1, 14.2], mats.dark),
      wall([-1.68, 1.12, -2.15], [0.14, 2.2, 4.4], mats.plaster),
      wall([1.68, 1.12, -2.35], [0.14, 2.2, 4.8], mats.plaster2),
      wall([-2.05, 1.12, -6.15], [0.14, 2.2, 4.6], mats.plaster2),
      wall([2.05, 1.12, -6.55], [0.14, 2.2, 5.4], mats.plaster),
      wall([-1.85, 1.0, -9.55], [0.14, 1.95, 3.6], mats.plaster3),
      wall([1.85, 1.0, -9.75], [0.14, 1.95, 4.0], mats.plaster2),
      wall([0, 1.12, -12.15], [5.4, 2.2, 0.16], mats.dark),

      wall([-1.02, 1.12, -0.08], [0.72, 2.22, 0.18], mats.plaster),
      wall([1.02, 1.12, -0.08], [0.72, 2.22, 0.18], mats.plaster),
      wall([0, 2.08, -0.08], [2.8, 0.38, 0.18], mats.plaster),
      wall([0, 0.18, -0.08], [2.8, 0.28, 0.18], mats.wainscot),

      wall([-1.68, 0.28, -3.4], [0.16, 0.52, 4.2], mats.wainscot),
      wall([1.68, 0.28, -3.6], [0.16, 0.52, 4.6], mats.wainscot),
      wall([0, 2.18, -2.8], [0.22, 0.12, 3.4], mats.dark),
      wall([0, 2.18, -5.6], [0.22, 0.12, 2.8], mats.dark),
      wall([0, 2.18, -8.4], [0.22, 0.12, 2.4], mats.dark),

      wall([-0.92, 0.46, -5.85], [1.15, 0.38, 0.42], mats.wainscot),
      wall([0.88, 0.4, -8.05], [0.82, 0.34, 0.62], mats.dark),
      wall([0.88, 0.62, -8.05], [0.7, 0.035, 0.5], mats.wood),
      wall([-0.95, 0.32, -9.15], [0.52, 0.4, 0.4], mats.wainscot),
      wall([-0.42, 0.26, -9.4], [0.46, 0.3, 0.36], mats.wainscot),
      wall([-0.82, 0.58, -9.2], [0.4, 0.2, 0.3], mats.board),
      wall([0.72, 0.3, -9.7], [0.5, 0.34, 0.38], mats.wainscot),

      h("mesh", { geometry: cyl, material: mats.dark, position: [-0.55, 1.48, -6.15], scale: [0.045, 0.55, 0.045] }),
      h("mesh", { geometry: cyl, material: mats.lamp, position: [-0.55, 1.82, -6.15], scale: [0.13, 0.07, 0.13] }),
      h("mesh", { geometry: cyl, material: mats.lampOff, position: [0.48, 1.72, 1.12], scale: [0.04, 0.18, 0.04] }),
      h("mesh", { geometry: cyl, material: mats.lamp, position: [0.48, 1.86, 1.12], scale: [0.09, 0.05, 0.09] }),
      h("mesh", { geometry: box, material: mats.ember, position: [0, 1.14, 0.16], scale: [0.028, 0.16, 0.028] }),

      h("mesh", { geometry: plane, material: typeMats.sign, position: [-1.6, 1.78, -1.85], rotation: [0, Math.PI / 2, 0], scale: [1.55, 0.32, 1] }),
      h("mesh", { geometry: plane, material: typeMats.liner, position: [1.96, 1.68, -7.35], rotation: [0, -Math.PI / 2, 0], scale: [1.45, 0.28, 1] }),
      h("mesh", { geometry: plane, material: typeMats.mail, position: [0, 1.55, -12.04], scale: [1.8, 0.42, 1] }),
      h("mesh", { geometry: box, material: typeMats.sheet, position: [1.72, 1.15, -8.55], rotation: [0, -0.08, 0], scale: [0.04, 1.15, 0.62] }),

      h("mesh", { ref: shaft, geometry: plane, material: mats.shaft, position: [0.05, 1.45, -10.4], rotation: [0.55, 0, 0.2], scale: [1.1, 2.4, 1] }),
      wall([0, 1.72, -12.02], [0.55, 0.38, 0.04], mats.lamp),

      h(
        "group",
        { ref: coverRoot, position: [0, 1.14, 0.12] },
        h("mesh", { geometry: box, material: mats.spine, position: [0, 0, 0], scale: [0.055, 1.5, 0.058] }),
        h(
          "group",
          { ref: leftDoor, position: [-0.028, 0, 0] },
          h("mesh", { geometry: box, material: mats.board, position: [-0.36, 0, 0], scale: [0.72, 1.48, 0.034] }),
          maps
            ? h("mesh", { geometry: plane, material: maps.coverL, position: [-0.36, 0, 0.019], scale: [0.68, 1.4, 1] })
            : null,
          h("mesh", { geometry: plane, material: mats.paper, position: [-0.36, 0, -0.019], rotation: [0, Math.PI, 0], scale: [0.68, 1.4, 1] }),
          h("mesh", { geometry: plane, material: typeMats.t36, position: [-0.36, 0.08, 0.022], scale: [0.42, 0.42, 1] }),
          h("mesh", { geometry: plane, material: typeMats.innerL, position: [-0.36, 0.22, -0.021], rotation: [0, Math.PI, 0], scale: [0.62, 0.16, 1] })
        ),
        h(
          "group",
          { ref: rightDoor, position: [0.028, 0, 0] },
          h("mesh", { geometry: box, material: mats.board, position: [0.36, 0, 0], scale: [0.72, 1.48, 0.034] }),
          maps
            ? h("mesh", { geometry: plane, material: maps.coverR, position: [0.36, 0, 0.019], scale: [0.68, 1.4, 1] })
            : null,
          h("mesh", { geometry: plane, material: mats.paper, position: [0.36, 0, -0.019], rotation: [0, Math.PI, 0], scale: [0.68, 1.4, 1] }),
          h("mesh", { geometry: plane, material: typeMats.tTY, position: [0.36, 0.08, 0.022], scale: [0.42, 0.42, 1] }),
          h("mesh", { geometry: plane, material: typeMats.innerR, position: [0.36, 0.22, -0.021], rotation: [0, Math.PI, 0], scale: [0.62, 0.16, 1] })
        )
      ),

      maps
        ? h("mesh", {
            ref: winRef,
            geometry: plane,
            material: maps.silkWin,
            position: [-1.58, 1.38, -3.15],
            rotation: [0, Math.PI / 2, 0],
            scale: [1.28, 0.92, 1],
          })
        : null,
      wall([-1.59, 1.38, -3.15], [0.05, 1.02, 1.38], mats.frame),
      wall([-1.55, 1.38, -3.15], [0.04, 1.02, 0.04], mats.frame),
      wall([-1.55, 1.38, -2.55], [0.04, 1.02, 0.04], mats.frame),
      wall([-1.55, 1.38, -3.75], [0.04, 1.02, 0.04], mats.frame),
      wall([-1.55, 1.86, -3.15], [0.04, 0.04, 1.38], mats.frame),
      wall([-1.55, 0.9, -3.15], [0.04, 0.04, 1.38], mats.frame),
      maps
        ? h("mesh", {
            ref: curtain,
            geometry: curtainGeo,
            material: maps.silkCloth,
            position: [-1.38, 1.12, -4.05],
            rotation: [0, Math.PI / 2, 0],
          })
        : null,

      maps
        ? h("mesh", {
            ref: muralRef,
            geometry: plane,
            material: maps.boothWall,
            position: [1.96, 1.32, -4.45],
            rotation: [0, -Math.PI / 2, 0],
            scale: [2.05, 1.35, 1],
          })
        : null,
      wall([1.97, 0.42, -4.45], [0.16, 0.72, 2.15], mats.wainscot),
      wall([1.97, 2.02, -4.45], [0.1, 0.08, 2.15], mats.frame),

      maps
        ? h("mesh", {
            ref: projRef,
            geometry: plane,
            material: maps.hoursProj,
            position: [-0.15, 1.38, -7.55],
            rotation: [0, 0.08, 0],
            scale: [2.35, 1.45, 1],
          })
        : null,

      h(
        "group",
        { ref: sleeve, position: [0.86, 0.86, -8.02], rotation: [-1.12, -0.42, 0.08] },
        h("mesh", { geometry: box, material: mats.board, scale: [0.5, 0.5, 0.028] }),
        maps
          ? h("mesh", {
              geometry: plane,
              material: maps.cratePrint,
              position: [0, 0, 0.016],
              scale: [0.46, 0.46, 1],
            })
          : null
      ),

      h("primitive", { object: motes })
    );
  }

  function Stage({ reduced, getScroll, cheap, mobile, frameloop, onReady }) {
    return h(
      Canvas,
      {
        alpha: false,
        dpr: [1, cheap ? 1.05 : mobile ? 1.2 : 1.4],
        gl: { alpha: false, antialias: !mobile, powerPreference: "high-performance", stencil: false, depth: true },
        frameloop,
        camera: { fov: 31, near: 0.08, far: 36, position: [0, 1.12, 2.78] },
        style: { width: "100%", height: "100%", display: "block", background: "#0a0908" },
        onCreated: (state) => {
          state.gl.setClearColor(0x0a0908, 1);
          state.gl.outputColorSpace = THREE.SRGBColorSpace;
          window.__gl = state.gl;
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
        if (document.hidden || reduced) {
          setLoop(reduced ? "demand" : "never");
          return;
        }
        const on = !!(window.__journeyOn || window.__mixOn || (window.__mercuryScroll || 0) > 0.01);
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

export async function mountMix(el, opts = {}) {
  const mountEl = el;
  if (!mountEl) throw new Error("R3F world: missing mount");
  const libs = await loadLibs();
  const reduced = opts.reduced ?? prefersReducedMotion();
  const mobile = isMobile();
  const cheap = !!opts.cheap;
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
      new Promise((_, reject) => setTimeout(() => reject(new Error("R3F world: canvas init timeout")), 12000)),
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
    throw new Error("R3F world: WebGL context missing");
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
          const ext = gl.getExtension("WEBGL_lose_context");
          if (ext) ext.loseContext();
        }
      } catch (_) {}
    },
  };
}

export async function mountJourney(el, opts = {}) {
  return mountMix(el, opts);
}
