/**
 * 36TY — THE 2-BUS
 * One R3F context. Mix position is the body. PLAY sums the stems.
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

const CAM = [
  [0.0, 0.12, 1.28, 2.85, 0.0, 1.05, -0.4],
  [0.18, 0.06, 1.24, 2.55, 0.0, 1.1, -0.9],
  [0.36, 0.0, 1.3, 2.45, 0.0, 1.14, -1.15],
  [0.52, 0.0, 1.28, 2.5, 0.0, 1.12, -1.2],
  [0.68, 0.0, 1.26, 2.55, 0.0, 1.1, -1.0],
  [0.84, 0.0, 1.32, 2.9, 0.0, 1.08, -0.5],
  [1.0, 0.0, 1.48, 3.35, 0.0, 1.12, -0.15],
];

function sampleCam(p, mobile, out) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const t = smoothstep(a[0], b[0], p);
  const ym = mobile ? 0.94 : 1;
  out.px = lerp(a[1], b[1], t) * (mobile ? 0.9 : 1);
  out.py = lerp(a[2], b[2], t) * ym;
  out.pz = lerp(a[3], b[3], t);
  out.lx = lerp(a[4], b[4], t);
  out.ly = lerp(a[5], b[5], t);
  out.lz = lerp(a[6], b[6], t);
  return out;
}

const ARTS = [
  "assets/tape-silk-808.webp",
  "assets/tape-booth-vol3.webp",
  "assets/tape-after-hours.webp",
  "assets/tape-crate-dig.webp",
];
const PANS = [-1.65, -0.55, 0.55, 1.65];

async function loadLibs() {
  const [React, ReactDOM, R3F, THREE] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@react-three/fiber"),
    import("three"),
  ]);
  if (!React?.createElement || !ReactDOM?.createRoot || !R3F?.Canvas || !THREE?.WebGLRenderer) {
    throw new Error("R3F mix: incomplete ESM graph");
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
    const pose = useRef({ px: 0.12, py: 1.28, pz: 2.85, lx: 0, ly: 1.05, lz: -0.4 });
    const look = useMemo(() => new THREE.Vector3(), []);
    const damp = useRef({ p: 0, v: 0, sum: 0 });
    const awake = useRef(0);
    const lamp = useRef(null);
    const fader = useRef(null);
    const lastLeg = useRef("");
    const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
    const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
    const cyl = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 10), []);

    const mats = useMemo(
      () => ({
        desk: new THREE.MeshLambertMaterial({ color: 0x2a221c }),
        dark: new THREE.MeshLambertMaterial({ color: 0x141210 }),
        cone: new THREE.MeshLambertMaterial({ color: 0xe8e0d4 }),
        wood: new THREE.MeshLambertMaterial({ color: 0x3a322c }),
        meter: new THREE.MeshBasicMaterial({ color: 0xd4483a }),
        lamp: new THREE.MeshBasicMaterial({ color: 0xffe0a8 }),
        mute: new THREE.MeshBasicMaterial({ color: 0x6a645c, transparent: true, opacity: 0.35 }),
      }),
      []
    );

    const [screens, setScreens] = useState([]);
    useEffect(() => {
      const loader = new THREE.TextureLoader();
      let live = true;
      Promise.all(
        ARTS.map(
          (src) =>
            new Promise((resolve) => {
              loader.load(
                src,
                (tex) => {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  resolve(tex);
                },
                undefined,
                () => resolve(null)
              );
            })
        )
      ).then((texs) => {
        if (!live) return;
        setScreens(
          texs.map((tex, i) => {
            const mat = new THREE.MeshBasicMaterial({
              map: tex || undefined,
              color: tex ? 0xffffff : 0x887060,
              transparent: true,
              opacity: 0.28,
            });
            mat.onBeforeCompile = (shader) => {
              shader.uniforms.uSum = { value: 0 };
              shader.fragmentShader = shader.fragmentShader
                .replace("#include <common>", "#include <common>\nuniform float uSum;")
                .replace(
                  "#include <map_fragment>",
                  `#include <map_fragment>
                   float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
                   diffuseColor.rgb = mix(vec3(luma * 0.62), diffuseColor.rgb, clamp(uSum, 0.0, 1.0));`
                );
              mat.userData.uSum = shader.uniforms.uSum;
            };
            const mesh = new THREE.Mesh(plane, mat);
            mesh.scale.set(0.78, 0.78, 1);
            mesh.position.set(PANS[i] * 1.85, 1.28, -2.35);
            mesh.userData.i = i;
            return mesh;
          })
        );
      });
      return () => {
        live = false;
      };
    }, [plane]);

    const motes = useMemo(() => {
      const n = mobile || cheap ? 40 : 90;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 4.5;
        pos[i * 3 + 1] = 0.4 + Math.random() * 1.8;
        pos[i * 3 + 2] = -2.6 + Math.random() * 4.2;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffe6c4,
        size: 0.018,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      return pts;
    }, [mobile, cheap]);

    useEffect(() => {
      scene.background = new THREE.Color(0x0a0908);
      scene.fog = new THREE.Fog(0x0a0908, 2.2, 9);
      return () => {
        box.dispose();
        plane.dispose();
        cyl.dispose();
        Object.values(mats).forEach((m) => m.dispose());
        motes.geometry.dispose();
        motes.material.dispose();
        screens.forEach((s) => {
          s.material.dispose();
          if (s.material.map) s.material.map.dispose();
        });
      };
    }, [scene, box, plane, cyl, mats, motes, screens]);

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
        perf.geoms = gl.info.memory.geometries;
      }

      const scroll = clamp01(
        (typeof getScroll === "function" ? getScroll() : 0) || window.__mercuryScroll || 0
      );
      const mixOn = !!window.__mixOn;
      const want = window.__journeyOn || mixOn || scroll > 0.02;
      awake.current += ((want ? 1 : 0) - awake.current) * 0.1;
      const raw = reduced ? Math.min(0.02, scroll) : clamp01(scroll * lerp(0.7, 1, awake.current));
      const prev = damp.current.p;
      const dtC = Math.min(0.05, Math.max(0.008, dt));
      damp.current.p += (raw - damp.current.p) * (1 - Math.exp(-8 * dtC));
      damp.current.v = damp.current.p - prev;
      const p = damp.current.p;
      const wantSum = mixOn ? 1 : 0.06;
      damp.current.sum += (wantSum - damp.current.sum) * 0.14;
      const sum = damp.current.sum;
      const bands = (window.Audio36 && window.Audio36.bands && window.Audio36.bands()) || { low: 0, mid: 0, high: 0 };
      const live = mixOn ? 0.35 + bands.low * 0.4 + bands.mid * 0.2 : 0.06;
      const spd = Math.min(1, Math.abs(window.__scrollVel || damp.current.v * 80) / 40);

      sampleCam(p, mobile, pose.current);
      const ptrX = (window.__ptrX || 0) * 0.18;
      const ptrY = (window.__ptrY || 0) * 0.08;
      let px = pose.current.px + ptrX;
      let py = pose.current.py + ptrY + bands.low * 0.04 * sum;
      let pz = pose.current.pz;
      look.set(pose.current.lx + ptrX * 0.4, pose.current.ly, pose.current.lz);

      const lock = window.__workLock;
      const aim = window.__workAim;
      const focus = lock >= 0 ? lock : aim;
      if (focus >= 0 && PANS[focus] != null && p > 0.28 && p < 0.78) {
        look.x += (PANS[focus] * 0.22 - look.x) * 0.05;
      }

      camera.position.set(px, py, pz);
      camera.lookAt(look);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z || 0, ptrX * 0.04, 0.1);
      camera.fov = (mobile ? 48 : 42) + spd * 2.4 + live * 1.2;
      camera.updateProjectionMatrix();

      scene.fog.near = lerp(3.2, 1.6, sum);
      scene.fog.far = lerp(10, 6.5, sum);
      if (lamp.current) lamp.current.intensity = 0.15 + sum * (1.8 + bands.low * 1.4);
      if (fader.current) fader.current.scale.y = 0.12 + sum * (0.55 + live * 0.2);

      screens.forEach((mesh, i) => {
        const solo = focus === i;
        const other = focus >= 0 && focus !== i;
        const spread = lerp(0.28, 2.05, 1 - sum);
        const unsumX = PANS[i] * spread;
        const unsumY = 1.22 + (1 - sum) * (i % 2 ? 0.26 : -0.16);
        const unsumZ = lerp(-1.05, -2.42, 1 - sum);
        mesh.position.x = lerp(mesh.position.x, solo && sum > 0.4 ? PANS[i] * 0.18 : unsumX, 0.12);
        mesh.position.y = lerp(mesh.position.y, unsumY, 0.12);
        mesh.position.z = lerp(mesh.position.z, unsumZ, 0.12);
        mesh.rotation.y = lerp(mesh.rotation.y, (1 - sum) * PANS[i] * 0.1, 0.1);
        mesh.rotation.z = lerp(mesh.rotation.z, (1 - sum) * (i % 2 ? 0.06 : -0.05), 0.1);
        mesh.material.opacity = other ? 0.1 : lerp(0.18, 0.96, sum) + (solo ? 0.04 : 0);
        mesh.scale.setScalar(solo ? 1.02 : lerp(0.7, 0.86, sum));
        if (mesh.material.userData.uSum) mesh.material.userData.uSum.value = other ? 0.08 : sum;
      });

      if (motes.material) {
        motes.material.opacity = 0.08 + sum * 0.28 + bands.high * 0.15;
        const arr = motes.geometry.attributes.position.array;
        const t = state.clock.elapsedTime;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += 0.0008 + sum * 0.0015;
          arr[i] += Math.sin(t * 0.3 + i) * 0.0004 * (0.3 + bands.mid);
          if (arr[i + 1] > 2.3) arr[i + 1] = 0.35;
        }
        motes.geometry.attributes.position.needsUpdate = true;
      }

      const leg = p < 0.22 ? "mix" : p < 0.4 ? "arrangement" : p < 0.72 ? "channels" : p < 0.88 ? "process" : "connect";
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

    const ns10 = (x) => [
      h("mesh", { geometry: box, material: mats.dark, position: [x, 1.18, -0.15], scale: [0.3, 0.48, 0.28] }),
      h("mesh", { geometry: cyl, material: mats.cone, position: [x, 1.1, 0.01], rotation: [Math.PI / 2, 0, 0], scale: [0.1, 0.045, 0.1] }),
      h("mesh", { geometry: cyl, material: mats.mute, position: [x, 1.34, 0.01], rotation: [Math.PI / 2, 0, 0], scale: [0.035, 0.03, 0.035] }),
    ];

    return h(
      React.Fragment,
      null,
      h("ambientLight", { intensity: 0.12, color: 0xffe8cc }),
      h("hemisphereLight", { args: [0x2a221c, 0x080706, 0.4] }),
      h("pointLight", { ref: lamp, intensity: 0.2, color: 0xffc07a, distance: 6, position: [0.85, 1.7, 0.2] }),
      h("mesh", { geometry: box, material: mats.desk, position: [0, 0.72, 0.15], scale: [3.4, 0.08, 1.35] }),
      h("mesh", { geometry: box, material: mats.wood, position: [0, 0.88, 0.35], scale: [1.6, 0.06, 0.7] }),
      h("mesh", { ref: fader, geometry: box, material: mats.meter, position: [0, 0.95, 0.42], scale: [0.04, 0.12, 0.05] }),
      h("mesh", { geometry: box, material: mats.lamp, position: [0.85, 1.62, 0.15], scale: [0.18, 0.1, 0.18] }),
      ...ns10(-1.15),
      ...ns10(1.15),
      h("mesh", { geometry: box, material: mats.dark, position: [0, 1.35, -2.45], scale: [4.4, 1.6, 0.08] }),
      h("primitive", { object: motes }),
      ...screens.map((m, i) => h("primitive", { key: "sc" + i, object: m }))
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
        camera: { fov: 42, near: 0.08, far: 24, position: [0.12, 1.28, 2.85] },
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
  if (!el) throw new Error("R3F mix: missing mount element");
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
      new Promise((_, reject) => setTimeout(() => reject(new Error("R3F mix: canvas init timeout")), 12000)),
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
    throw new Error("R3F mix: WebGL context missing");
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
