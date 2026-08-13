/**
 * Parametric chrome/gold producer helmet → glTF 2.0
 * Named meshes so Three.js can remap metalness / roughness / visor glass.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sphere(latBands, lonBands, r, phiStart, phiEnd, thetaStart, thetaEnd) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const t = lat / latBands;
    const phi = phiStart + t * (phiEnd - phiStart);
    for (let lon = 0; lon <= lonBands; lon++) {
      const s = lon / lonBands;
      const theta = thetaStart + s * (thetaEnd - thetaStart);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      positions.push(x, y, z);
      const len = Math.hypot(x, y, z) || 1;
      normals.push(x / len, y / len, z / len);
      uvs.push(s, 1 - t);
    }
  }
  const cols = lonBands + 1;
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const a = lat * cols + lon;
      const b = a + cols;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return mesh(positions, normals, uvs, indices);
}

function box(w, h, d) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const faces = [
    { n: [0, 0, 1], v: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },
    { n: [0, 0, -1], v: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] },
    { n: [0, 1, 0], v: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },
    { n: [0, -1, 0], v: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] },
    { n: [1, 0, 0], v: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },
    { n: [-1, 0, 0], v: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]] },
  ];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let i = 0;
  for (const f of faces) {
    for (const p of f.v) {
      positions.push(...p);
      normals.push(...f.n);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    i += 4;
  }
  return mesh(positions, normals, uvs, indices);
}

function cylinder(rTop, rBot, h, segs, y0 = 0) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const hh = h / 2;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const a = u * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    positions.push(c * rTop, y0 + hh, s * rTop, c * rBot, y0 - hh, s * rBot);
    const nx = c;
    const nz = s;
    const ny = (rBot - rTop) / h;
    const len = Math.hypot(nx, ny, nz) || 1;
    normals.push(nx / len, ny / len, nz / len, nx / len, ny / len, nz / len);
    uvs.push(u, 1, u, 0);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const cap = (r, y, nY, reverse) => {
    const start = positions.length / 3;
    positions.push(0, y, 0);
    normals.push(0, nY, 0);
    uvs.push(0.5, 0.5);
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = u * Math.PI * 2;
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
      normals.push(0, nY, 0);
      uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
    }
    for (let i = 0; i < segs; i++) {
      if (reverse) indices.push(start, start + i + 2, start + i + 1);
      else indices.push(start, start + i + 1, start + i + 2);
    }
  };
  cap(rTop, y0 + hh, 1, false);
  cap(rBot, y0 - hh, -1, true);
  return mesh(positions, normals, uvs, indices);
}

function torus(R, r, radial, tubular, arc = Math.PI * 2) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= radial; i++) {
    const v = (i / radial) * arc;
    for (let j = 0; j <= tubular; j++) {
      const u = (j / tubular) * Math.PI * 2;
      const cx = Math.cos(v) * R;
      const cz = Math.sin(v) * R;
      const x = (R + r * Math.cos(u)) * Math.cos(v);
      const y = r * Math.sin(u);
      const z = (R + r * Math.cos(u)) * Math.sin(v);
      positions.push(x, y, z);
      const nx = x - cx;
      const ny = y;
      const nz = z - cz;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      uvs.push(j / tubular, i / radial);
    }
  }
  const cols = tubular + 1;
  for (let i = 0; i < radial; i++) {
    for (let j = 0; j < tubular; j++) {
      const a = i * cols + j;
      const b = a + cols;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return mesh(positions, normals, uvs, indices);
}

function mesh(positions, normals, uvs, indices) {
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint16Array.from(indices) };
}

function transform(m, tx, ty, tz, sx = 1, sy = 1, sz = 1, rotX = 0, rotY = 0, rotZ = 0) {
  const pos = m.positions;
  const nrm = m.normals;
  const cx = Math.cos(rotX);
  const sxr = Math.sin(rotX);
  const cy = Math.cos(rotY);
  const syr = Math.sin(rotY);
  const cz = Math.cos(rotZ);
  const szr = Math.sin(rotZ);
  for (let i = 0; i < pos.length; i += 3) {
    let x = pos[i] * sx;
    let y = pos[i + 1] * sy;
    let z = pos[i + 2] * sz;
    let y1 = y * cx - z * sxr;
    let z1 = y * sxr + z * cx;
    y = y1;
    z = z1;
    let x1 = x * cy + z * syr;
    z1 = -x * syr + z * cy;
    x = x1;
    z = z1;
    x1 = x * cz - y * szr;
    y1 = x * szr + y * cz;
    x = x1;
    y = y1;
    pos[i] = x + tx;
    pos[i + 1] = y + ty;
    pos[i + 2] = z + tz;
    let nx = nrm[i];
    let ny = nrm[i + 1];
    let nz = nrm[i + 2];
    y1 = ny * cx - nz * sxr;
    z1 = ny * sxr + nz * cx;
    ny = y1;
    nz = z1;
    x1 = nx * cy + nz * syr;
    z1 = -nx * syr + nz * cy;
    nx = x1;
    nz = z1;
    x1 = nx * cz - ny * szr;
    y1 = nx * szr + ny * cz;
    nx = x1;
    ny = y1;
    const len = Math.hypot(nx, ny, nz) || 1;
    nrm[i] = nx / len;
    nrm[i + 1] = ny / len;
    nrm[i + 2] = nz / len;
  }
  return m;
}

function minMax(arr, stride, offset) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = offset; i < arr.length; i += stride) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

const MAT = { chrome: 0, gold: 1, visor: 2, steel: 3 };

const parts = [
  { name: "HelmetDome", mat: MAT.chrome, mesh: transform(sphere(28, 40, 1.0, 0, Math.PI * 0.62, 0, Math.PI * 2), 0, 0.08, 0, 1.05, 1.12, 1.08) },
  { name: "HelmetVisor", mat: MAT.visor, mesh: transform(sphere(22, 32, 0.95, Math.PI * 0.36, Math.PI * 0.58, Math.PI * 0.18, Math.PI * 0.64), 0, 0.04, 0.22, 1.08, 0.95, 1.12) },
  { name: "HelmetTrim", mat: MAT.gold, mesh: transform(torus(0.92, 0.045, 48, 16, Math.PI * 2), 0, -0.12, 0.08, 1.05, 1, 1.02, 0.4, 0, 0) },
  { name: "HelmetBrow", mat: MAT.gold, mesh: transform(torus(0.78, 0.035, 32, 12, Math.PI * 1.05), 0, 0.28, 0.42, 1, 1, 1, 0.9, 0, 0) },
  { name: "HelmetBadge", mat: MAT.gold, mesh: transform(box(0.46, 0.24, 0.05), 0, 0.36, 0.74, 1, 1, 1, -0.12, 0, 0) },
  { name: "HelmetEarL", mat: MAT.gold, mesh: transform(sphere(16, 20, 0.28, 0, Math.PI, 0, Math.PI * 2), -1.02, -0.02, 0.05, 0.7, 1.05, 0.85) },
  { name: "HelmetEarR", mat: MAT.gold, mesh: transform(sphere(16, 20, 0.28, 0, Math.PI, 0, Math.PI * 2), 1.02, -0.02, 0.05, 0.7, 1.05, 0.85) },
  { name: "HelmetChin", mat: MAT.chrome, mesh: transform(box(0.95, 0.16, 0.55), 0, -0.42, 0.28, 1, 1, 1, 0.15, 0, 0) },
  { name: "HelmetGrill", mat: MAT.steel, mesh: transform(box(0.72, 0.08, 0.42), 0, -0.48, 0.34, 1, 1, 1, 0.12, 0, 0) },
  { name: "HelmetCrest", mat: MAT.gold, mesh: transform(box(0.08, 0.22, 1.35), 0, 0.95, -0.05) },
  { name: "HelmetAntenna", mat: MAT.gold, mesh: transform(cylinder(0.025, 0.018, 0.55, 10, 0), 0.72, 0.85, -0.15, 1, 1, 1, 0.25, 0, 0.4) },
];

const buffers = [];
const bufferViews = [];
const accessors = [];
const meshes = [];
const nodes = [];
let offset = 0;

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

for (const part of parts) {
  const { positions, normals, uvs, indices } = part.mesh;
  const chunks = [
    { data: new Uint8Array(positions.buffer), type: 34962, stride: 12 },
    { data: new Uint8Array(normals.buffer), type: 34962, stride: 12 },
    { data: new Uint8Array(uvs.buffer), type: 34962, stride: 8 },
    { data: new Uint8Array(indices.buffer), type: 34963, stride: 0 },
  ];
  const accStart = accessors.length;
  const attrs = ["POSITION", "NORMAL", "TEXCOORD_0"];
  chunks.forEach((chunk, idx) => {
    const padding = pad4(offset);
    offset += padding;
    if (padding) buffers.push(new Uint8Array(padding));
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: chunk.data.byteLength, target: chunk.type, ...(chunk.stride ? { byteStride: chunk.stride } : {}) });
    const accessor = {
      bufferView: bufferViews.length - 1,
      componentType: idx === 3 ? 5123 : 5126,
      count: idx === 3 ? indices.length : positions.length / 3,
      type: idx === 0 ? "VEC3" : idx === 1 ? "VEC3" : idx === 2 ? "VEC2" : "SCALAR",
    };
    if (idx === 0) {
      accessor.min = [minMax(positions, 3, 0)[0], minMax(positions, 3, 1)[0], minMax(positions, 3, 2)[0]];
      accessor.max = [minMax(positions, 3, 0)[1], minMax(positions, 3, 1)[1], minMax(positions, 3, 2)[1]];
      accessor.count = positions.length / 3;
    } else if (idx === 1) accessor.count = normals.length / 3;
    else if (idx === 2) accessor.count = uvs.length / 2;
    accessors.push(accessor);
    buffers.push(chunk.data);
    offset += chunk.data.byteLength;
  });
  meshes.push({
    name: part.name,
    primitives: [
      {
        attributes: { POSITION: accStart, NORMAL: accStart + 1, TEXCOORD_0: accStart + 2 },
        indices: accStart + 3,
        material: part.mat ?? 0,
      },
    ],
  });
  nodes.push({ name: part.name, mesh: meshes.length - 1 });
}

const bin = Buffer.concat(buffers.map((b) => Buffer.from(b)));
const gltf = {
  asset: { version: "2.0", generator: "36TY helmet builder" },
  scene: 0,
  scenes: [{ name: "Helmet", nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials: [
    {
      name: "ChromeSilver",
      pbrMetallicRoughness: { baseColorFactor: [0.82, 0.83, 0.86, 1], metallicFactor: 1, roughnessFactor: 0.11 },
    },
    {
      name: "GoldFoil",
      pbrMetallicRoughness: { baseColorFactor: [0.831, 0.686, 0.216, 1], metallicFactor: 1, roughnessFactor: 0.2 },
    },
    {
      name: "VisorGlass",
      pbrMetallicRoughness: { baseColorFactor: [0.03, 0.03, 0.035, 1], metallicFactor: 0.92, roughnessFactor: 0.045 },
    },
    {
      name: "Gunmetal",
      pbrMetallicRoughness: { baseColorFactor: [0.16, 0.16, 0.18, 1], metallicFactor: 1, roughnessFactor: 0.38 },
    },
  ],
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.byteLength, uri: "helmet.bin" }],
};

const outDir = path.join(__dirname, "..", "models");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "helmet.gltf"), JSON.stringify(gltf, null, 2));
fs.writeFileSync(path.join(outDir, "helmet.bin"), bin);
console.log("Wrote helmet.gltf + helmet.bin", bin.byteLength, "bytes");
