import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const GOLD = new THREE.Color("#c9a227");
const MAGENTA = new THREE.Color("#e31c79");
const CYAN = new THREE.Color("#00a3e0");

function make36Map() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = "#d4a84a";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 18;
  ctx.strokeRect(12, 12, 488, 232);
  ctx.fillStyle = "#111111";
  ctx.font = '900 168px "Archivo Black", "Anton", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("36", 256, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function remapMaterials(root, renderer) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const badgeMap = make36Map();
  badgeMap.anisotropy = maxAniso;

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    const name = obj.name || "";
    const src = obj.material;
    const color = src && src.color ? src.color.clone() : new THREE.Color("#c8c8cc");

    if (name.includes("Visor")) {
      obj.material = new THREE.MeshPhysicalMaterial({
        color: 0x07080a,
        metalness: 0.95,
        roughness: 0.04,
        envMapIntensity: 2.4,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        reflectivity: 1,
      });
      return;
    }

    if (name.includes("Badge")) {
      obj.material = new THREE.MeshStandardMaterial({
        map: badgeMap,
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.7,
        color: 0xffffff,
      });
      return;
    }

    const isGold = /Trim|Brow|Ear|Crest|Antenna|Badge/.test(name);
    obj.material = new THREE.MeshStandardMaterial({
      color: isGold ? 0xd4af37 : color.getHex() || 0xc9ccd1,
      metalness: isGold ? 1 : 1,
      roughness: isGold ? 0.18 : 0.1,
      envMapIntensity: isGold ? 1.85 : 2.1,
    });
  });
}

export async function mountHelmet(canvas, opts = {}) {
  const fallback = opts.fallback || document.querySelector("[data-helmet-fallback]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.05, 4.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(GOLD, 2.2);
  key.position.set(2.4, 3.2, 4);
  const fill = new THREE.DirectionalLight(CYAN, 0.55);
  fill.position.set(-3, 1.2, 2);
  const rim = new THREE.DirectionalLight(MAGENTA, 0.45);
  rim.position.set(0, -1.5, -3);
  scene.add(key, fill, rim, new THREE.AmbientLight(0xfff2d8, 0.22));

  const group = new THREE.Group();
  scene.add(group);

  const loader = new GLTFLoader();
  let model;
  try {
    const gltf = await loader.loadAsync("models/helmet.gltf");
    model = gltf.scene;
    remapMaterials(model, renderer);
    model.rotation.y = -0.35;
    model.position.y = -0.12;
    group.add(model);
    if (fallback) fallback.hidden = true;
  } catch (err) {
    console.warn("Helmet glTF failed, using fallback plate.", err);
    if (fallback) fallback.hidden = false;
    canvas.hidden = true;
    return { destroy() {} };
  }

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const onMove = (e) => {
    const r = canvas.parentElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  window.addEventListener("resize", resize);

  let raf = 0;
  let scrollY = 0;
  const onScroll = () => {
    scrollY = window.scrollY || 0;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!reduced) {
      target.x += (pointer.x - target.x) * 0.06;
      target.y += (pointer.y - target.y) * 0.06;
      group.rotation.y = target.x * 0.55 + scrollY * 0.00045;
      group.rotation.x = -target.y * 0.28;
      group.position.x = target.x * 0.12;
      group.position.y = -target.y * 0.08;
    }
    renderer.render(scene, camera);
  };
  tick();

  return {
    resize,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      renderer.dispose();
    },
  };
}
