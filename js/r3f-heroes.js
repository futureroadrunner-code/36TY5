/**
 * 36TY authored hero environments.
 * 20% specific assets carry perceived quality. Instanced cubes stay background-only.
 * No childhood home. No address. Cinematic Kingston / GTA / studio language only.
 */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

const HERO_MAPS = {
  kingston: "assets/heroes/hero-kingston-facade.webp",
  kingstonZinc: "assets/heroes/hero-kingston-zinc.webp",
  mississauga: "assets/heroes/hero-mississauga-facade.webp",
  missDrive: "assets/heroes/hero-mississauga-drive.webp",
  brampton: "assets/heroes/hero-brampton-plaza.webp",
  bramptonStore: "assets/heroes/hero-brampton-storefront.webp",
  etobicoke: "assets/heroes/hero-etobicoke-gable.webp",
  etobStreet: "assets/heroes/hero-etobicoke-street.webp",
  studio: "assets/heroes/hero-studio-room.webp",
  studioDesk: "assets/heroes/hero-studio-desk.webp",
};

export const HERO_KEEPOUTS = [
  { x: -2.15, z: 7.2, r: 3.6, xr: 2.8 },
  { x: 2.35, z: 3.8, r: 3.4, xr: 2.6 },
  { x: -3.2, z: 12.6, r: 3.0, xr: 2.4 },
  { x: -1.6, z: 11.6, r: 2.4, xr: 2.0 },
  { x: -3.4, z: 9.4, r: 2.2, xr: 1.8 },
  { x: 4.8, z: -14.5, r: 4.4, xr: 3.6 },
  { x: -5.4, z: -20.2, r: 4.0, xr: 3.4 },
  { x: 3.15, z: -11.8, r: 2.2, xr: 1.8 },
  { x: 4.2, z: -38.5, r: 4.8, xr: 3.8 },
  { x: -5.1, z: -42.8, r: 4.2, xr: 3.4 },
  { x: -3.8, z: -46, r: 3.6, xr: 3.0 },
  { x: 2.4, z: -36.2, r: 2.4, xr: 1.6 },
  { x: -3.1, z: -72.5, r: 4.4, xr: 3.4 },
  { x: 3.4, z: -80, r: 3.8, xr: 3.0 },
  { x: -1.2, z: -74.8, r: 2.4, xr: 2.0 },
  { x: -2.2, z: -98, r: 6.2, xr: 4.8 },
];

export function filterKeepout(list) {
  return list.filter((it) => {
    return !HERO_KEEPOUTS.some((k) => Math.abs(it.z - k.z) < k.r && Math.abs((it.x || 0) - k.x) < k.xr);
  });
}

function loadTex(THREE, url) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

let GEOS = null;

function lambert(THREE, opts) {
  return new THREE.MeshLambertMaterial(opts);
}

function texMat(THREE, map, color) {
  return lambert(THREE, map ? { map, color: 0xffffff } : { color: color || 0xc8b8a0 });
}

function box(THREE, w, h, d, material, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(GEOS.box, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
  m.userData.sharedGeo = true;
  return m;
}

function plane(THREE, w, h, material, x, y, z, rx, ry) {
  const m = new THREE.Mesh(GEOS.plane, material);
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  m.rotation.set(rx || 0, ry || 0, 0);
  m.userData.sharedGeo = true;
  return m;
}

function cyl(THREE, rTop, rBot, h, material, x, y, z) {
  const m = new THREE.Mesh(GEOS.cyl, material);
  m.scale.set(rTop, h, rBot);
  m.position.set(x, y, z);
  m.userData.sharedGeo = true;
  return m;
}

function pitchedZinc(THREE, mats, w, d, y) {
  const g = new THREE.Group();
  g.add(box(THREE, w * 1.18, 0.16, d * 1.22, mats.zinc, 0, y, -0.06, -0.4, 0, 0));
  g.add(box(THREE, w * 1.18, 0.05, 0.1, mats.zincHi, 0, y - 0.18, d * 0.52));
  g.add(box(THREE, 0.08, 0.22, d * 1.05, mats.zincHi, 0, y + 0.02, -0.04, -0.4, 0, 0));
  return g;
}

function jalousie(THREE, mats, x, y, z, s) {
  const g = new THREE.Group();
  g.add(box(THREE, 0.62, 0.78, 0.05, mats.dark, x, y, z));
  g.add(box(THREE, 0.56, 0.08, 0.04, mats.zincHi, x, y - 0.12, z + s * 0.04, 0.16, 0, 0));
  g.add(box(THREE, 0.56, 0.08, 0.04, mats.zincHi, x, y + 0.08, z + s * 0.04, 0.16, 0, 0));
  g.add(box(THREE, 0.56, 0.08, 0.04, mats.zincHi, x, y + 0.28, z + s * 0.04, 0.16, 0, 0));
  return g;
}

/** Kingston zinc house — pitched roof, stoop, photo facade. Not a cube. */
function kingstonHouse(THREE, maps, mats, x, z, flip) {
  const g = new THREE.Group();
  const s = flip ? -1 : 1;
  g.add(box(THREE, 2.45, 2.12, 1.62, mats.breeze, 0, 1.08, -0.12));
  g.add(plane(THREE, 2.42, 2.08, texMat(THREE, maps.kingston, 0xe8d2a8), s * 0.02, 1.1, 0.7));
  g.add(pitchedZinc(THREE, mats, 2.7, 1.95, 2.32));
  g.add(box(THREE, 0.92, 0.1, 0.72, mats.stoop, s * 0.18, 0.06, 0.92));
  g.add(box(THREE, 0.88, 0.08, 0.58, mats.stoop, s * 0.18, 0.14, 0.82));
  const dishArm = box(THREE, 0.04, 0.42, 0.04, mats.pole, s * 0.85, 2.42, -0.15);
  g.add(dishArm);
  const dish = new THREE.Mesh(GEOS.plane, mats.zinc);
  dish.scale.set(0.44, 0.44, 1);
  dish.position.set(s * 0.85, 2.62, -0.05);
  dish.rotation.x = -0.55;
  dish.userData.sharedGeo = true;
  g.add(dish);
  if (!flip) {
    g.add(cyl(THREE, 0.22, 0.22, 0.42, mats.zinc, -0.55, 2.55, -0.35));
  }
  g.position.set(x, 0, z);
  g.userData.kind = "kingston-house";
  return g;
}

function kingstonWall(THREE, maps, mats, x, z) {
  const g = new THREE.Group();
  g.add(box(THREE, 3.55, 1.62, 0.24, mats.breeze, 0, 0.82, 0));
  g.add(plane(THREE, 3.5, 1.56, texMat(THREE, maps.kingstonZinc, 0xe8d2a8), 0, 0.82, 0.14));
  g.add(box(THREE, 0.09, 2.55, 0.09, mats.pole, -1.62, 1.28, 0.04));
  g.add(box(THREE, 1.05, 0.06, 0.07, mats.pole, -1.2, 2.42, 0.04));
  g.position.set(x, 0, z);
  g.userData.kind = "kingston-wall";
  return g;
}

function kingstonFence(THREE, mats, x, z) {
  const g = new THREE.Group();
  const n = 11;
  const mesh = new THREE.InstancedMesh(GEOS.box, mats.zinc, n);
  mesh.userData.sharedGeo = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    dummy.position.set(-1.5 + i * 0.3, 0.46, 0);
    dummy.scale.set(0.045, 0.92, 0.02);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  g.add(mesh);
  g.add(box(THREE, 3.35, 0.04, 0.03, mats.zincHi, 0, 0.88, 0));
  g.add(box(THREE, 3.35, 0.04, 0.03, mats.zincHi, 0, 0.42, 0));
  g.position.set(x, 0, z);
  g.userData.kind = "fence";
  return g;
}

function mangoTree(THREE, mats, x, z, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  g.add(cyl(THREE, 0.08 * s, 0.12 * s, 1.75 * s, mats.trunk, 0, 0.88 * s, 0));
  const canopy = new THREE.Mesh(GEOS.sphere, mats.canopy);
  canopy.userData.sharedGeo = true;
  canopy.position.set(0.12, 1.92 * s, 0);
  canopy.scale.set(0.88 * s * 1.28, 0.88 * s * 0.82, 0.88 * s * 1.18);
  g.add(canopy);
  const canopy2 = new THREE.Mesh(GEOS.sphere, mats.canopy);
  canopy2.userData.sharedGeo = true;
  canopy2.scale.set(0.58 * s, 0.58 * s, 0.58 * s);
  canopy2.position.set(-0.48 * s, 1.62 * s, 0.22);
  g.add(canopy2);
  g.position.set(x, 0, z);
  g.userData.kind = "mango";
  g.userData.canopy = canopy;
  return g;
}

function utilityPole(THREE, mats, x, z) {
  const g = new THREE.Group();
  g.add(cyl(THREE, 0.055, 0.07, 3.45, mats.pole, 0, 1.72, 0));
  g.add(box(THREE, 1.22, 0.055, 0.07, mats.pole, 0.18, 3.22, 0));
  g.add(box(THREE, 0.2, 0.26, 0.14, mats.dark, 0.48, 3.1, 0));
  g.position.set(x, 0, z);
  g.userData.kind = "pole";
  return g;
}

function mississaugaHouse(THREE, maps, mats, x, z, flip) {
  const g = new THREE.Group();
  const s = flip ? -1 : 1;
  g.add(box(THREE, 2.95, 2.42, 2.25, mats.vinyl, 0, 1.22, 0));
  g.add(plane(THREE, 2.9, 2.38, texMat(THREE, maps.mississauga, 0xd8d4c8), s * 0.02, 1.22, 1.14));
  g.add(box(THREE, 3.25, 0.12, 2.55, mats.shingle, 0, 2.5, 0, -0.12, 0, 0));
  g.add(box(THREE, 1.42, 1.12, 1.45, mats.vinyl, s * 1.12, 0.58, 0.55));
  g.add(plane(THREE, 1.38, 1.08, texMat(THREE, maps.missDrive, 0xc8c4bc), s * 1.12, 0.58, 1.28));
  for (let i = 0; i < 4; i++) {
    g.add(box(THREE, 1.32, 0.025, 0.03, mats.ash, s * 1.12, 0.28 + i * 0.22, 1.3));
  }
  g.add(box(THREE, 1.55, 0.045, 2.55, mats.ash, s * 1.18, 0.025, 1.65));
  g.add(box(THREE, 4.4, 0.05, 0.92, mats.sidewalk, 0.1, 0.02, 2.15));
  g.add(box(THREE, 0.72, 0.08, 0.58, mats.stoop, s * -0.42, 0.06, 1.22));
  g.add(box(THREE, 0.07, 0.72, 0.07, mats.pole, s * 1.85, 0.36, 2.35));
  g.add(box(THREE, 0.22, 0.14, 0.12, mats.dark, s * 1.85, 0.74, 2.35));
  g.position.set(x, 0, z);
  g.userData.kind = "miss-house";
  return g;
}

function hydroBox(THREE, mats, x, z) {
  const g = new THREE.Group();
  g.add(box(THREE, 0.55, 0.72, 0.42, mats.ash, 0, 0.36, 0));
  g.add(box(THREE, 0.48, 0.08, 0.08, mats.dark, 0, 0.58, 0.22));
  g.position.set(x, 0, z);
  g.userData.kind = "hydro";
  return g;
}

function mapleTree(THREE, mats, x, z, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  g.add(cyl(THREE, 0.07 * s, 0.1 * s, 2.25 * s, mats.trunk, 0, 1.12 * s, 0));
  const c = new THREE.Mesh(GEOS.sphere, mats.maple);
  c.userData.sharedGeo = true;
  c.position.set(0, 2.42 * s, 0);
  c.scale.set(0.98 * s * 1.18, 0.98 * s * 0.88, 0.98 * s * 1.18);
  g.add(c);
  g.position.set(x, 0, z);
  g.userData.kind = "maple";
  g.userData.canopy = c;
  return g;
}

function bramptonPlaza(THREE, maps, mats, x, z, flip) {
  const g = new THREE.Group();
  const s = flip ? -1 : 1;
  const map = flip ? maps.bramptonStore : maps.brampton;
  for (let i = 0; i < 3; i++) {
    g.add(box(THREE, 1.38, 1.28, 1.95, mats.plaza, -1.42 + i * 1.42, 0.64, 0));
    g.add(plane(THREE, 1.34, 1.22, texMat(THREE, map, 0xb8c0c8), -1.42 + i * 1.42, 0.64, s * 0.98));
    g.add(box(THREE, 0.85, 0.72, 0.04, mats.dark, -1.42 + i * 1.42, 0.42, s * 0.99));
  }
  g.add(box(THREE, 4.85, 0.08, 1.25, mats.dark, 0, 1.38, s * 0.82));
  g.add(box(THREE, 0.08, 1.22, 0.08, mats.pole, -2.2, 0.72, s * 0.88));
  g.add(box(THREE, 0.08, 1.22, 0.08, mats.pole, 2.2, 0.72, s * 0.88));
  g.add(box(THREE, 5.4, 0.03, 3.1, mats.ash, 0, 0.02, s * 1.7));
  for (let i = 0; i < 4; i++) {
    g.add(box(THREE, 0.035, 0.02, 1.55, mats.ivory, -1.9 + i * 1.25, 0.04, s * 2.15));
  }
  g.position.set(x, 0, z);
  g.userData.kind = "plaza";
  return g;
}

function bramptonDuplex(THREE, mats, x, z) {
  const g = new THREE.Group();
  g.add(box(THREE, 2.25, 1.92, 1.75, mats.brick, -0.72, 0.96, 0));
  g.add(box(THREE, 2.1, 1.75, 1.58, mats.vinyl, 0.88, 0.88, -0.04));
  g.add(box(THREE, 2.5, 0.1, 1.95, mats.shingle, -0.72, 1.98, 0, -0.1, 0, 0));
  g.add(box(THREE, 2.3, 0.1, 1.78, mats.shingle, 0.88, 1.82, 0, -0.1, 0, 0));
  g.add(box(THREE, 0.7, 0.08, 0.55, mats.stoop, -0.55, 0.05, 0.95));
  g.add(box(THREE, 0.7, 0.08, 0.55, mats.stoop, 0.7, 0.05, 0.88));
  g.position.set(x, 0, z);
  g.userData.kind = "duplex";
  return g;
}

function plazaPylon(THREE, mats, x, z) {
  const g = new THREE.Group();
  g.add(cyl(THREE, 0.07, 0.09, 2.85, mats.pole, 0, 1.42, 0));
  g.add(box(THREE, 0.85, 1.15, 0.12, mats.plaza, 0, 2.35, 0));
  g.add(box(THREE, 0.72, 0.22, 0.04, mats.dark, 0, 2.55, 0.07));
  g.position.set(x, 0, z);
  g.userData.kind = "pylon";
  return g;
}

function etobicokeGable(THREE, maps, mats, x, z, flip) {
  const g = new THREE.Group();
  const s = flip ? -1 : 1;
  g.add(box(THREE, 2.22, 2.95, 1.92, mats.brick, 0, 1.48, 0));
  g.add(plane(THREE, 2.18, 2.9, texMat(THREE, maps.etobicoke, 0x8a4a3c), s * 0.02, 1.48, 0.97));
  const gable = new THREE.Mesh(GEOS.cone4, mats.shingle);
  gable.scale.set(1.42, 1.22, 1.42);
  gable.rotation.y = Math.PI / 4;
  gable.position.set(0, 3.28, 0);
  g.add(gable);
  g.add(box(THREE, 1.05, 1.65, 0.62, mats.brick, s * 0.58, 1.12, 1.02));
  g.add(plane(THREE, 1.0, 1.58, texMat(THREE, maps.etobStreet, 0x7a3a32), s * 0.58, 1.12, 1.34));
  g.add(box(THREE, 0.12, 0.12, 0.08, mats.windowLive, s * 0.58, 1.42, 1.36));
  g.add(box(THREE, 0.9, 0.12, 0.72, mats.stoop, s * -0.18, 0.08, 1.12));
  g.add(cyl(THREE, 0.04, 0.04, 1.15, mats.pole, s * -0.55, 0.7, 1.18));
  g.add(cyl(THREE, 0.04, 0.04, 1.15, mats.pole, s * 0.22, 0.7, 1.18));
  g.position.set(x, 0, z);
  g.userData.kind = "gable";
  return g;
}

function ironFence(THREE, mats, x, z) {
  const g = new THREE.Group();
  const n = 9;
  const mesh = new THREE.InstancedMesh(GEOS.box, mats.dark, n);
  mesh.userData.sharedGeo = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    dummy.position.set(-1.2 + i * 0.3, 0.4, 0);
    dummy.scale.set(0.03, 0.78, 0.03);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  g.add(mesh);
  g.add(box(THREE, 2.55, 0.03, 0.03, mats.dark, 0, 0.72, 0));
  g.position.set(x, 0, z);
  g.userData.kind = "iron";
  return g;
}

function streetLamp(THREE, mats, x, z) {
  const g = new THREE.Group();
  g.add(cyl(THREE, 0.04, 0.05, 3.15, mats.pole, 0, 1.58, 0));
  g.add(box(THREE, 0.58, 0.05, 0.07, mats.pole, 0.24, 3.1, 0));
  const bulb = box(THREE, 0.16, 0.1, 0.16, mats.windowLive, 0.46, 3.0, 0);
  g.add(bulb);
  g.position.set(x, 0, z);
  g.userData.kind = "lamp";
  g.userData.bulb = bulb;
  return g;
}

function studioRoom(THREE, maps, mats, mobile) {
  const g = new THREE.Group();
  g.add(box(THREE, 7.2, 0.08, 6.4, mats.desk, 0, 0.04, 0));
  g.add(box(THREE, 7.2, 3.15, 0.14, mats.panel, 0, 1.62, -3.05));
  g.add(plane(THREE, 4.6, 2.4, texMat(THREE, maps.studio, 0x2a2420), 0.2, 1.55, -2.96));
  g.add(box(THREE, 0.14, 3.15, 6.4, mats.panel, -3.55, 1.62, 0));
  g.add(box(THREE, 0.14, 3.15, 4.2, mats.panel, 3.45, 1.62, -0.9));
  g.add(box(THREE, 7.2, 0.1, 6.4, mats.dark, 0, 3.18, 0));
  g.add(box(THREE, 1.45, 1.85, 0.08, mats.panel, -3.42, 1.55, -1.4));
  g.add(box(THREE, 1.45, 1.85, 0.08, mats.panel, -3.42, 1.55, 0.6));

  g.add(box(THREE, 2.65, 0.08, 1.12, mats.desk, -0.15, 0.78, 0.85));
  g.add(box(THREE, 0.08, 0.74, 0.95, mats.dark, -1.4, 0.4, 0.85));
  g.add(box(THREE, 0.08, 0.74, 0.95, mats.dark, 1.1, 0.4, 0.85));
  g.add(plane(THREE, 2.5, 0.85, texMat(THREE, maps.studioDesk, 0x3a322c), -0.15, 1.05, 1.38));

  const screenL = plane(THREE, 0.72, 0.48, mats.screen.clone(), -0.85, 1.42, 0.55);
  const screenR = plane(THREE, 0.72, 0.48, mats.screen.clone(), 0.35, 1.42, 0.55);
  screenL.userData.kind = "screen";
  screenR.userData.kind = "screen";
  g.add(screenL, screenR);

  function ns10(lx, lz) {
    const n = new THREE.Group();
    n.add(box(THREE, 0.32, 0.48, 0.28, mats.dark, 0, 1.22, 0));
    n.add(box(THREE, 0.22, 0.22, 0.04, mats.cone, 0, 1.26, 0.15));
    n.add(box(THREE, 0.1, 0.1, 0.04, mats.cone, 0, 1.06, 0.15));
    n.position.set(lx, 0, lz);
    n.userData.kind = "ns10";
    return n;
  }
  g.add(ns10(-1.15, 1.15));
  g.add(ns10(0.85, 1.15));

  if (!mobile) {
    const mpc = new THREE.Group();
    mpc.add(box(THREE, 0.55, 0.06, 0.38, mats.dark, 0, 0.86, 0));
    for (let i = 0; i < 8; i++) {
      mpc.add(box(THREE, 0.08, 0.02, 0.08, mats.window, -0.16 + (i % 4) * 0.11, 0.9, -0.08 + Math.floor(i / 4) * 0.12));
    }
    mpc.position.set(-0.85, 0, 1.05);
    mpc.userData.kind = "mpc";
    g.add(mpc);

    const rh = new THREE.Group();
    rh.add(box(THREE, 1.18, 0.08, 0.34, mats.dark, 0, 0.82, 0));
    rh.add(box(THREE, 1.08, 0.03, 0.18, mats.ivory, 0, 0.88, 0.05));
    rh.position.set(-1.55, 0, 0.55);
    rh.userData.kind = "rhodes";
    g.add(rh);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, 0.82, 1.0),
      new THREE.Vector3(-0.2, 0.48, 0.55),
      new THREE.Vector3(0.45, 0.18, 0.85),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.016, 4, false), mats.cable);
    cable.userData.kind = "cable";
    g.add(cable);
  }

  const lamp = new THREE.Group();
  lamp.add(box(THREE, 0.05, 0.45, 0.05, mats.pole, 0, 1.38, 0));
  const shade = box(THREE, 0.22, 0.12, 0.22, mats.windowLive, 0.12, 1.58, 0);
  lamp.add(shade);
  lamp.position.set(0.95, 0, 0.55);
  lamp.userData.kind = "studio-lamp";
  lamp.userData.bulb = shade;
  g.add(lamp);

  g.position.set(-2.05, 0, -98.35);
  g.userData.kind = "studio-room";
  g.userData.screens = [screenL, screenR];
  return g;
}

export async function buildHeroes(THREE, { mobile }) {
  GEOS = {
    box: new THREE.BoxGeometry(1, 1, 1),
    plane: new THREE.PlaneGeometry(1, 1),
    cone4: new THREE.ConeGeometry(1, 1, 4),
    sphere: new THREE.SphereGeometry(1, 8, 6),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  };
  const maps = {};
  const entries = Object.entries(HERO_MAPS);
  const loaded = await Promise.all(entries.map(([, url]) => loadTex(THREE, url)));
  entries.forEach(([k], i) => {
    maps[k] = loaded[i];
  });

  const mats = {
    breeze: lambert(THREE, { color: 0xd4c09a }),
    zinc: lambert(THREE, { color: 0x9a968c }),
    zincHi: lambert(THREE, { color: 0xb8b4aa }),
    stoop: lambert(THREE, { color: 0x8a7358 }),
    dark: lambert(THREE, { color: 0x2a2622 }),
    pole: lambert(THREE, { color: 0x3a3830 }),
    trunk: lambert(THREE, { color: 0x5a3a28 }),
    canopy: lambert(THREE, { color: 0x1f6a38 }),
    vinyl: lambert(THREE, { color: 0xc8c2b4 }),
    shingle: lambert(THREE, { color: 0x5a6268 }),
    ash: lambert(THREE, { color: 0x4a5056 }),
    sidewalk: lambert(THREE, { color: 0xb8b4ac }),
    maple: lambert(THREE, { color: 0x3a6a38 }),
    plaza: lambert(THREE, { color: 0xb8c0c8 }),
    brick: lambert(THREE, { color: 0x8a4a3c }),
    window: new THREE.MeshBasicMaterial({ color: 0xffc07a }),
    windowLive: new THREE.MeshBasicMaterial({ color: 0xffe4b0 }),
    desk: lambert(THREE, { color: 0x3a322c }),
    cone: lambert(THREE, { color: 0xe8e0d4 }),
    ivory: lambert(THREE, { color: 0xe8e4dc }),
    panel: lambert(THREE, { color: 0x2a2420 }),
    cable: lambert(THREE, { color: 0x1a1816 }),
    screen: new THREE.MeshBasicMaterial({ color: 0x8ec8ff, transparent: true, opacity: 0.35 }),
  };

  const group = new THREE.Group();
  group.name = "heroes";
  const items = [];
  const add = (obj) => {
    group.add(obj);
    items.push(obj);
  };

  add(kingstonHouse(THREE, maps, mats, -2.15, 7.2, false));
  add(kingstonHouse(THREE, maps, mats, 2.35, 3.8, true));
  add(kingstonWall(THREE, maps, mats, -3.2, 12.6));
  add(kingstonFence(THREE, mats, -1.6, 11.6));
  add(mangoTree(THREE, mats, -3.4, 9.4, mobile ? 1.05 : 1.38));
  add(utilityPole(THREE, mats, 1.85, 8.6));

  add(mississaugaHouse(THREE, maps, mats, 4.85, -14.5, true));
  add(mississaugaHouse(THREE, maps, mats, -5.35, -20.2, false));
  add(mapleTree(THREE, mats, 6.4, -12.2, mobile ? 1.1 : 1.42));
  add(mapleTree(THREE, mats, -6.8, -18.5, 1.22));
  add(hydroBox(THREE, mats, 3.15, -11.8));

  add(bramptonPlaza(THREE, maps, mats, 4.2, -38.5, true));
  add(bramptonPlaza(THREE, maps, mats, -5.1, -42.8, false));
  add(bramptonDuplex(THREE, mats, -3.85, -46));
  add(plazaPylon(THREE, mats, 2.4, -36.2));

  add(etobicokeGable(THREE, maps, mats, -3.1, -72.5, false));
  add(etobicokeGable(THREE, maps, mats, 3.35, -80, true));
  add(streetLamp(THREE, mats, 2.05, -70.2));
  add(streetLamp(THREE, mats, -2.1, -77.4));
  add(ironFence(THREE, mats, -1.2, -74.8));

  const room = studioRoom(THREE, maps, mats, mobile);
  add(room);
  room.children.forEach((ch) => {
    if (ch.userData && ch.userData.kind) items.push(ch);
  });

  return { group, items, maps, mats };
}

export function updateHeroes(heroes, { live, clock, p, mixOn }) {
  if (!heroes || !heroes.items) return;
  const t = clock;
  const swayAmt = 0.018 + live * 0.035;
  const studioLive = p > 0.66 ? live : live * 0.12;
  heroes.items.forEach((obj, i) => {
    const kind = obj.userData.kind;
    if (kind === "mango" || kind === "maple") {
      const c = obj.userData.canopy;
      if (c) c.rotation.z = Math.sin(t * (0.42 + live * 0.35) + i) * swayAmt;
    }
    if (kind === "lamp") {
      const b = obj.userData.bulb;
      if (b) b.material.color.setRGB(1, 0.86 + live * 0.08, 0.62 + live * 0.1);
    }
    if (kind === "studio-lamp") {
      const b = obj.userData.bulb;
      if (b) {
        const on = 0.55 + studioLive * 0.45;
        b.material.color.setRGB(1 * on, 0.88 * on, 0.62 * on);
      }
    }
    if (kind === "screen") {
      obj.material.opacity = 0.22 + studioLive * (0.28 + (mixOn ? 0.12 * Math.sin(t * 2.4 + i) : 0));
    }
  });
}

export function disposeHeroes(heroes, THREE) {
  if (!heroes) return;
  heroes.group.traverse((o) => {
    if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
  if (GEOS) {
    Object.values(GEOS).forEach((g) => g.dispose && g.dispose());
    GEOS = null;
  }
  if (heroes.maps) Object.values(heroes.maps).forEach((tex) => tex && tex.dispose && tex.dispose());
  void THREE;
}
