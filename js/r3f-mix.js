/**
 * 36TY — THE GATEFOLD
 * One R3F context. The album cover is a door. PLAY opens it.
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

const WORLDS = [
  "assets/world-silk.webp",
  "assets/world-booth.webp",
  "assets/world-hours.webp",
  "assets/world-crate.webp",
];
const COVER = "assets/cover-front.webp";

async function loadLibs() {
  const [React, ReactDOM, R3F, THREE] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@react-three/fiber"),
    import("three"),
  ]);
  if (!React?.createElement || !ReactDOM?.createRoot || !R3F?.Canvas || !THREE?.WebGLRenderer) {
    throw new Error("R3F gatefold: incomplete ESM graph");
  }
  return { React, ReactDOM, R3F, THREE };
}

function bindRuntime(libs) {
  const { React, R3F, THREE } = libs;
  const h = React.createElement;
  const { useRef, useMemo, useEffect, useState } = React;
  const { Canvas, useFrame, useThree } = R3F;

  function loadTex(THREE, src) {
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(
        src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  function World({ reduced, mobile, cheap, getScroll }) {
    const { scene, camera, gl } = useThree();
    const damp = useRef({ p: 0, v: 0, sum: 0 });
    const awake = useRef(0);
    const lamp = useRef(null);
    const lastLeg = useRef("");
    const leftDoor = useRef(null);
    const rightDoor = useRef(null);
    const interiors = useRef([]);
    const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

    const mats = useMemo(
      () => ({
        paper: new THREE.MeshLambertMaterial({ color: 0x1a1612 }),
        edge: new THREE.MeshBasicMaterial({ color: 0x2a241e }),
        mute: new THREE.MeshBasicMaterial({ color: 0x0a0908 }),
      }),
      []
    );

    const [ready, setReady] = useState(false);
    useEffect(() => {
      let live = true;
      Promise.all([loadTex(THREE, COVER), ...WORLDS.map((src) => loadTex(THREE, src))]).then((texs) => {
        if (!live) return;
        const cover = texs[0];
        const leftMap = cover ? cover.clone() : null;
        const rightMap = cover ? cover.clone() : null;
        if (leftMap) {
          leftMap.colorSpace = THREE.SRGBColorSpace;
          leftMap.repeat.set(0.5, 1);
          leftMap.offset.set(0, 0);
          leftMap.needsUpdate = true;
        }
        if (rightMap) {
          rightMap.colorSpace = THREE.SRGBColorSpace;
          rightMap.repeat.set(0.5, 1);
          rightMap.offset.set(0.5, 0);
          rightMap.needsUpdate = true;
        }
        const mkCover = (map, x) => {
          const mat = new THREE.MeshBasicMaterial({
            map: map || undefined,
            color: map ? 0xffffff : 0x4a3028,
            transparent: true,
            opacity: 0.92,
          });
          const mesh = new THREE.Mesh(plane, mat);
            mesh.scale.set(0.7, 1.4, 1);
          mesh.position.set(x, 1.12, 0);
          return mesh;
        };
        leftDoor.current = mkCover(leftMap, -0.35);
        rightDoor.current = mkCover(rightMap, 0.35);
        interiors.current = texs.slice(1).map((tex, i) => {
          const mat = new THREE.MeshBasicMaterial({
            map: tex || undefined,
            color: tex ? 0xffffff : 0x332820,
            transparent: true,
            opacity: 0.12,
          });
          const mesh = new THREE.Mesh(plane, mat);
          mesh.scale.set(mobile ? 2.6 : 3.4, mobile ? 1.46 : 1.9, 1);
          mesh.position.set((i % 2 ? 0.18 : -0.18), 1.15, -2.8 - i * 3.4);
          return mesh;
        });
        setReady(true);
      });
      return () => {
        live = false;
      };
    }, [plane, mobile]);

    const motes = useMemo(() => {
      const n = mobile || cheap ? 28 : 70;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 5;
        pos[i * 3 + 1] = 0.3 + Math.random() * 1.8;
        pos[i * 3 + 2] = -14 + Math.random() * 16;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffe6c4,
        size: 0.016,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      return pts;
    }, [mobile, cheap]);

    useEffect(() => {
      scene.background = new THREE.Color(0x0a0908);
      scene.fog = new THREE.Fog(0x0a0908, 2.4, 11);
      return () => {
        box.dispose();
        plane.dispose();
        Object.values(mats).forEach((m) => m.dispose());
        motes.geometry.dispose();
        motes.material.dispose();
      };
    }, [scene, box, plane, mats, motes]);

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
      const want = window.__journeyOn || mixOn || scroll > 0.02;
      awake.current += ((want ? 1 : 0) - awake.current) * 0.1;
      const raw = reduced ? Math.min(0.02, scroll) : clamp01(scroll);
      const prev = damp.current.p;
      const dtC = Math.min(0.05, Math.max(0.008, dt));
      damp.current.p += (raw - damp.current.p) * (1 - Math.exp(-7 * dtC));
      damp.current.v = damp.current.p - prev;
      const p = damp.current.p;
      const wantSum = mixOn ? 1 : 0.04;
      damp.current.sum += (wantSum - damp.current.sum) * 0.12;
      const sum = damp.current.sum;
      const bands = (window.Audio36 && window.Audio36.bands && window.Audio36.bands()) || { low: 0, mid: 0, high: 0 };
      const live = mixOn ? 0.32 + bands.low * 0.45 + bands.mid * 0.18 : 0.05;
      const spd = Math.min(1, Math.abs(window.__scrollVel || damp.current.v * 80) / 40);

      const ptrX = (window.__ptrX || 0) * 0.16;
      const ptrY = (window.__ptrY || 0) * 0.07;
      const openZ = lerp(2.62, 1.35, sum);
      const travel = p * (mobile ? 11.5 : 13.6);
      let pz = openZ - travel * sum;
      let py = 1.14 + ptrY + bands.low * 0.03 * sum;
      let px = ptrX * (0.22 + sum * 0.28);
      const lookZ = lerp(0.05, -1.4, sum) - travel * sum;
      let lookX = ptrX * 0.35;
      let lookY = 1.1;

      const lock = window.__workLock;
      const aim = window.__workAim;
      const focus = lock >= 0 ? lock : aim;
      if (focus >= 0 && p > 0.22 && p < 0.82) {
        const destZ = -2.8 - focus * 3.4;
        lookZ;
        lookX += ((focus % 2 ? 0.2 : -0.2) - lookX) * 0.04;
        pz += ((destZ + 2.1) - pz) * 0.03;
      }

      camera.position.set(px, py, pz);
      camera.lookAt(lookX, lookY, lookZ);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z || 0, ptrX * 0.03, 0.08);
      camera.fov = (mobile ? 46 : 40) + spd * 2.2 + (1 - sum) * 2;
      camera.updateProjectionMatrix();

      scene.fog.near = lerp(3.4, 1.8, sum);
      scene.fog.far = lerp(9, 16, sum);
      if (lamp.current) lamp.current.intensity = 0.2 + sum * (1.35 + bands.low * 1.1);

      const hinge = sum * 1.28;
      if (leftDoor.current) {
        leftDoor.current.rotation.y = -hinge;
        leftDoor.current.position.x = lerp(-0.35, -0.82, sum);
        leftDoor.current.material.opacity = lerp(0.95, 0.22, sum);
      }
      if (rightDoor.current) {
        rightDoor.current.rotation.y = hinge;
        rightDoor.current.position.x = lerp(0.35, 0.82, sum);
        rightDoor.current.material.opacity = lerp(0.95, 0.22, sum);
      }

      interiors.current.forEach((mesh, i) => {
        const solo = focus === i;
        const other = focus >= 0 && focus !== i;
        mesh.material.opacity = other ? 0.12 : lerp(0.06, 0.92, sum) + (solo ? 0.06 : 0);
        const breathe = Math.sin(state.clock.elapsedTime * 0.35 + i) * 0.02 * sum;
        mesh.position.y = 1.15 + breathe + (solo ? 0.04 : 0);
      });

      if (motes.material) {
        motes.material.opacity = 0.04 + sum * 0.18 + bands.high * 0.12;
      }

      const leg = p < 0.18 ? "cover" : p < 0.38 ? "enter" : p < 0.72 ? "sleeves" : p < 0.88 ? "liner" : "mail";
      if (lastLeg.current !== leg) {
        lastLeg.current = leg;
        document.body.setAttribute("data-leg", leg);
      }
      document.documentElement.style.setProperty("--sum", sum.toFixed(3));
      document.documentElement.style.setProperty("--live", live.toFixed(3));
      document.documentElement.style.setProperty("--journey", p.toFixed(3));
      document.documentElement.style.setProperty("--awake", awake.current.toFixed(3));
      window.__journeyP = p;
    });

    return h(
      React.Fragment,
      null,
      h("ambientLight", { intensity: 0.16, color: 0xffe8cc }),
      h("hemisphereLight", { args: [0x2a221c, 0x080706, 0.38] }),
      h("pointLight", { ref: lamp, intensity: 0.22, color: 0xffc07a, distance: 8, position: [0.4, 1.7, 0.8] }),
      h("mesh", { geometry: box, material: mats.paper, position: [0, 0.28, -6], scale: [8, 0.04, 18] }),
      h("mesh", { geometry: box, material: mats.edge, position: [0, 1.12, 0.012], scale: [1.62, 1.62, 0.03] }),
      ready && leftDoor.current ? h("primitive", { object: leftDoor.current }) : null,
      ready && rightDoor.current ? h("primitive", { object: rightDoor.current }) : null,
      ...interiors.current.map((m, i) => h("primitive", { key: "w" + i, object: m })),
      h("primitive", { object: motes })
    );
  }

  function Stage({ reduced, getScroll, cheap, mobile, frameloop, onReady }) {
    return h(
      Canvas,
      {
        alpha: false,
        dpr: [1, cheap ? 1.1 : mobile ? 1.3 : 1.5],
        gl: { alpha: false, antialias: !mobile, powerPreference: "high-performance", stencil: false, depth: true },
        frameloop,
        camera: { fov: 40, near: 0.08, far: 28, position: [0, 1.14, 2.62] },
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

function ensureDiv(el) {
  if (!el) throw new Error("R3F gatefold: missing mount element");
  return el;
}

export async function mountMix(el, opts = {}) {
  const mountEl = ensureDiv(el);
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
      new Promise((_, reject) => setTimeout(() => reject(new Error("R3F gatefold: canvas init timeout")), 12000)),
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
    throw new Error("R3F gatefold: WebGL context missing");
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
  return mountMix(el, opts);
}
