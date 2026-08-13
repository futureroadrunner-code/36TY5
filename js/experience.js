/**
 * Layered cinematic Three.js hero — background / midground / foreground
 * separated on Z, with global pointer parallax at different depths.
 * Transparent clear. DPR capped. Reduced-motion safe.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MATERIALS = {
  HelmetDome: {
    color: 0xe6eaef,
    metalness: 1,
    roughness: 0.05,
    envMapIntensity: 3.6,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    physical: true,
  },
  HelmetVisor: {
    color: 0x0a0c12,
    metalness: 0.98,
    roughness: 0.025,
    envMapIntensity: 4.0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    physical: true,
  },
  HelmetTrim: { color: 0xd4af37, metalness: 1, roughness: 0.12, envMapIntensity: 2.8 },
  HelmetBrow: { color: 0xe8c96a, metalness: 1, roughness: 0.08, envMapIntensity: 2.9 },
  HelmetEarL: { color: 0xd4af37, metalness: 1, roughness: 0.14, envMapIntensity: 2.5 },
  HelmetEarR: { color: 0xd4af37, metalness: 1, roughness: 0.14, envMapIntensity: 2.5 },
  HelmetChin: { color: 0xc0c4cc, metalness: 1, roughness: 0.1, envMapIntensity: 2.5 },
  HelmetCrest: { color: 0xd4af37, metalness: 1, roughness: 0.12, envMapIntensity: 2.4 },
  HelmetAntenna: { color: 0xeef0f4, metalness: 1, roughness: 0.04, envMapIntensity: 2.8 },
  HelmetBadge: { color: 0xd4af37, metalness: 1, roughness: 0.12, envMapIntensity: 2.5 },
  HelmetGrill: { color: 0x121418, metalness: 1, roughness: 0.24, envMapIntensity: 1.9 },
};

/* —— Background: velvet void gradient mesh —— */
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

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 p = vUv - 0.5;
  vec2 m = uMouse - 0.5;
  float t = uTime * 0.08;

  // Slow drifting gradient mesh
  float n1 = noise(p * 2.4 + t + m * 0.15);
  float n2 = noise(p * 4.1 - t * 0.7 - m * 0.1);
  float mesh = smoothstep(0.42, 0.58, n1) * 0.35 + smoothstep(0.35, 0.65, n2) * 0.2;

  // Soft geometric lattice (dark booth geometry)
  vec2 g = abs(fract(p * 6.5 + vec2(t * 0.2, -t * 0.15)) - 0.5);
  float grid = smoothstep(0.02, 0.0, min(g.x, g.y)) * 0.12;

  vec3 voidC = vec3(0.031, 0.024, 0.039);
  vec3 velvet = vec3(0.086, 0.039, 0.063);
  vec3 gold = vec3(0.83, 0.69, 0.22);
  vec3 silk = vec3(0.77, 0.35, 0.48);
  vec3 cyan = vec3(0.12, 0.55, 0.72);

  float radial = length(p + m * 0.12);
  vec3 col = mix(velvet, voidC, smoothstep(0.15, 0.85, radial));
  col = mix(col, gold * 0.55, mesh * (1.0 - radial * 0.7));
  col = mix(col, silk * 0.45, n2 * 0.25 * (0.6 + m.x * 0.2));
  col += cyan * grid * (0.4 + 0.3 * sin(t * 2.0));
  col += gold * 0.04 / (0.35 + length(p - m * 0.4));

  float alpha = 0.72 + mesh * 0.22;
  alpha *= smoothstep(1.2, 0.28, radial);
  gl_FragColor = vec4(col, alpha * 0.92);
}
`;

/* —— Soft iridescent mid-plane behind helmet —— */
const fluidVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fluidFrag = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float d = length(p);
  vec2 m = uMouse - 0.5;
  float rip = sin(9.0 * d - uTime * 1.2) * 0.5 + 0.5;
  float blob = 0.016 / (0.08 + length(p - m * 0.55));
  vec3 gold = vec3(0.83, 0.69, 0.22);
  vec3 velvet = vec3(0.42, 0.08, 0.18);
  vec3 cyan = vec3(0.2, 0.7, 0.78);
  vec3 col = mix(gold, velvet, smoothstep(0.08, 0.72, d + blob * 0.2));
  col = mix(col, cyan, rip * 0.14);
  float alpha = 0.11 * (1.0 - smoothstep(0.4, 0.9, d));
  gl_FragColor = vec4(col, alpha);
}
`;

export default class Experience {
  constructor(canvas) {
    if (Experience.instance) return Experience.instance;

    this.canvas = canvas;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.scroll = 0;
    this.clock = new THREE.Clock();
    this.sizes = { w: 1, h: 1, pr: 1 };
    this.ready = Promise.race([
      new Promise((resolve) => {
        this._markReady = resolve;
      }),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);

    try {
      this._build();
      this._buildBackground();
      this._buildMidground();
      this._buildForeground();
      this._loadHelmet();
      this._bind();
      this._loop();
      Experience.instance = this;
    } catch (err) {
      Experience.instance = null;
      this.destroy?.();
      throw err;
    }
  }

  _build() {
    const rect = this.canvas.getBoundingClientRect();
    this.sizes.w = Math.max(1, rect.width);
    this.sizes.h = Math.max(1, rect.height);
    this.sizes.pr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.isMobile = window.matchMedia("(max-width: 899px)").matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.sizes.pr < 1.5,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(this.sizes.pr);
    this.renderer.setSize(this.sizes.w, this.sizes.h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, this.sizes.w / this.sizes.h, 0.1, 60);
    // More headroom — helmet fully in frame
    this.camera.position.set(this.isMobile ? 0 : -0.65, this.isMobile ? 0.15 : 0.15, this.isMobile ? 6.6 : 6.2);
    this.cameraBase = this.camera.position.clone();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(this._studioEnv(), 0.04).texture;
    pmrem.dispose();

    this.bg = new THREE.Group();
    this.bg.position.z = -4.2;
    this.mg = new THREE.Group();
    this.mg.position.z = 0;
    this.fg = new THREE.Group();
    this.fg.position.z = 1.85;
    this.scene.add(this.bg, this.mg, this.fg);

    this.group = new THREE.Group();
    this.mg.add(this.group);

    this.scene.add(new THREE.AmbientLight(0xffe6c8, 0.28));
    this.key = new THREE.DirectionalLight(0xfff6e0, 3.2);
    this.key.position.set(3.2, 4.2, 3.8);
    this.scene.add(this.key);
    this.rim = new THREE.PointLight(0xd4af37, 14, 22);
    this.rim.position.set(-2.8, 0.8, -1.4);
    this.scene.add(this.rim);
    this.fill = new THREE.PointLight(0xffb8d0, 5.5, 16);
    this.fill.position.set(-1.8, 2.0, 3.6);
    this.scene.add(this.fill);
    this.front = new THREE.DirectionalLight(0xffffff, 0.7);
    this.front.position.set(0.4, 0.6, 5.5);
    this.scene.add(this.front);
    this.kick = new THREE.SpotLight(0xf0d78a, 18, 20, 0.45, 0.55, 1.2);
    this.kick.position.set(1.5, 3.5, 4);
    this.kick.target.position.set(0.6, 0, 0);
    this.scene.add(this.kick, this.kick.target);
  }

  /** Warm studio booth env — punchier chrome than default RoomEnvironment */
  _studioEnv() {
    const env = new THREE.Scene();
    env.add(new THREE.AmbientLight(0xffe8d0, 0.55));
    const a = new THREE.Mesh(
      new THREE.SphereGeometry(4, 24, 16),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x1a1014 })
    );
    env.add(a);
    const panels = [
      { c: 0xf5e6c8, p: [2.5, 2, 1], s: [1.2, 2.4, 0.1] },
      { c: 0xd4af37, p: [-2.2, 1.2, -1], s: [0.8, 1.6, 0.1] },
      { c: 0xffffff, p: [0, 3.2, 2], s: [3, 0.3, 0.1] },
      { c: 0xc45a7a, p: [1.5, -1.5, 2], s: [1.4, 0.5, 0.1] },
    ];
    panels.forEach((panel) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(...panel.s),
        new THREE.MeshBasicMaterial({ color: panel.c })
      );
      m.position.set(...panel.p);
      env.add(m);
    });
    return env;
  }

  _buildBackground() {
    this.bgMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: meshVert,
      fragmentShader: meshFrag,
      transparent: true,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), this.bgMat);
    plane.position.set(0, 0, 0);
    this.bg.add(plane);

    // Dark geometric rings — slow booth architecture
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xc45a7a,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.bgRings = [];
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.RingGeometry(1.05 + i * 0.5, 1.14 + i * 0.5, 72);
      const mesh = new THREE.Mesh(geo, i % 2 ? ringMat2 : ringMat);
      mesh.position.set((i - 2) * 0.28, (i % 2 ? 0.25 : -0.2), 0.35 + i * 0.12);
      mesh.rotation.x = Math.PI * 0.4 + i * 0.07;
      mesh.rotation.z = i * 0.35;
      this.bg.add(mesh);
      this.bgRings.push(mesh);
    }

    const wire = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.85, 0),
      new THREE.MeshBasicMaterial({
        color: 0xc9cdd4,
        wireframe: true,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
      })
    );
    wire.position.set(-2.6, -0.5, 0.7);
    this.bg.add(wire);
    this.bgWire = wire;

    const wire2 = wire.clone();
    wire2.scale.setScalar(0.7);
    wire2.position.set(3.0, 1.0, 0.4);
    this.bg.add(wire2);
    this.bgWire2 = wire2;
  }

  _buildMidground() {
    this.fluidMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: fluidVert,
      fragmentShader: fluidFrag,
      transparent: true,
      depthWrite: false,
    });
    const fluid = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8), this.fluidMat);
    fluid.position.set(0.35, -0.1, -1.6);
    this.mg.add(fluid);

    // Floating glass / metal orbs around helmet (no transmission — cheaper + clearer)
    this.glassOrbs = [];
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8dcc8,
      metalness: 0.15,
      roughness: 0.12,
      transparent: true,
      opacity: 0.42,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const goldShell = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 1,
      roughness: 0.16,
      transparent: true,
      opacity: 0.55,
      envMapIntensity: 2.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });

    const specs = [
      { r: 0.16, pos: [1.85, 0.95, 0.55], mat: glassMat },
      { r: 0.11, pos: [-1.55, -0.45, 0.7], mat: glassMat },
      { r: 0.08, pos: [1.35, -0.95, 0.85], mat: goldShell },
      { r: 0.13, pos: [-1.75, 0.85, 0.35], mat: goldShell },
    ];
    specs.forEach((s) => {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(s.r, 20, 16), s.mat);
      orb.position.set(...s.pos);
      this.mg.add(orb);
      this.glassOrbs.push({ mesh: orb, base: orb.position.clone(), phase: Math.random() * Math.PI * 2 });
    });
  }

  _buildForeground() {
    // Out-of-focus dust / gold flecks — strong depth response
    const count = this.reduced ? 80 : 220;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const gold = new THREE.Color(0xd4af37);
    const ink = new THREE.Color(0xf3e8d8);
    const silk = new THREE.Color(0xc45a7a);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      const c = Math.random() > 0.72 ? silk : Math.random() > 0.35 ? gold : ink;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const tex = this._particleTexture();
    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.07,
        map: tex,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    this.fg.add(this.particles);

    // Soft framing orbs — large bokeh near camera (strong depth response)
    this.fgFrames = [];
    const frameSpecs = [
      { r: 0.72, pos: [-2.9, 1.55, 0.85], color: 0xd4af37, op: 0.12 },
      { r: 0.55, pos: [3.1, -1.35, 1.05], color: 0xc45a7a, op: 0.11 },
      { r: 0.38, pos: [2.45, 1.75, 1.25], color: 0xf3e8d8, op: 0.09 },
      { r: 0.48, pos: [-2.35, -1.65, 0.95], color: 0xd4af37, op: 0.08 },
      { r: 0.22, pos: [1.6, 1.9, 1.4], color: 0xf0d78a, op: 0.14 },
    ];
    frameSpecs.forEach((f) => {
      const mat = new THREE.MeshBasicMaterial({
        color: f.color,
        transparent: true,
        opacity: f.op,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(f.r, 20, 16), mat);
      mesh.position.set(...f.pos);
      this.fg.add(mesh);
      this.fgFrames.push({ mesh, base: mesh.position.clone(), phase: Math.random() * 6 });
    });

    // Thin gold arc — comic-splash framing near camera
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.018, 8, 96, Math.PI * 1.2),
      new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    arc.rotation.set(0.85, 0.25, -0.35);
    arc.position.set(0.55, -0.15, 0.45);
    this.fg.add(arc);
    this.fgArc = arc;
  }

  _particleTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  _fallbackHelmet() {
    const chrome = new THREE.MeshPhysicalMaterial({
      color: 0xd0d4da,
      metalness: 1,
      roughness: 0.08,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2.6,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 1,
      roughness: 0.14,
      envMapIntensity: 2.3,
    });
    const visor = new THREE.MeshPhysicalMaterial({
      color: 0x04050a,
      metalness: 0.9,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 3,
      transmission: 0.15,
      thickness: 0.4,
      transparent: true,
      opacity: 0.92,
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 56, 40, 0, Math.PI * 2, 0, Math.PI * 0.62),
      chrome
    );
    dome.scale.set(1.05, 1.12, 1.08);
    dome.position.y = 0.08;
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.98, 40, 24, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.36, Math.PI * 0.22),
      visor
    );
    glass.scale.set(1.1, 0.95, 1.14);
    glass.position.set(0, 0.04, 0.22);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.048, 18, 72), gold);
    trim.rotation.x = 0.4;
    trim.position.set(0, -0.12, 0.08);
    trim.scale.set(1.05, 1, 1.02);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.036, 14, 48, Math.PI * 1.05), gold);
    brow.rotation.x = 0.9;
    brow.position.set(0, 0.28, 0.42);
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), gold);
    earL.scale.set(0.7, 1.05, 0.85);
    earL.position.set(-1.02, -0.02, 0.05);
    const earR = earL.clone();
    earR.position.x = 1.02;
    this.group.add(dome, glass, trim, brow, earL, earR, this._decal());
    this.group.rotation.y = -0.38;
  }

  _mapMaterials(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const spec = MATERIALS[obj.name] || MATERIALS.HelmetDome;
      const base = {
        color: spec.color,
        metalness: spec.metalness,
        roughness: spec.roughness,
        envMapIntensity: spec.envMapIntensity,
      };
      if (obj.name === "HelmetVisor" || spec.physical) {
        obj.material = new THREE.MeshPhysicalMaterial({
          ...base,
          clearcoat: spec.clearcoat || 0.25,
          clearcoatRoughness: spec.clearcoatRoughness || 0.15,
          ...(obj.name === "HelmetVisor"
            ? { transparent: true, opacity: 0.96 }
            : {}),
        });
      } else {
        obj.material = new THREE.MeshStandardMaterial(base);
      }
      if (obj.geometry && obj.geometry.computeVertexNormals) obj.geometry.computeVertexNormals();
      obj.castShadow = false;
      obj.receiveShadow = false;
    });
  }

  _loadHelmet() {
    const loader = new GLTFLoader();
    loader.load(
      "models/helmet.gltf",
      (gltf) => {
        const model = gltf.scene;
        this._mapMaterials(model);
        model.traverse((obj) => {
          if (!obj.isMesh) return;
          if (obj.name === "HelmetCrest" || obj.name === "HelmetAntenna") {
            obj.visible = false;
          }
        });
        model.scale.setScalar(this.isMobile ? 0.95 : 1.12);
        model.position.set(this.isMobile ? 0 : 0.9, this.isMobile ? 0.4 : 0.0, 0);
        this.group.rotation.y = -0.28;
        this.group.rotation.x = 0.06;
        this.group.add(model);
        this.group.add(this._decal());
        this.group.add(this._facemask());
        if (this._markReady) this._markReady();
      },
      undefined,
      () => {
        this._fallbackHelmet();
        this.group.add(this._facemask());
        if (this._markReady) this._markReady();
      }
    );
  }

  /** Gold cage bars — makes the producer helmet read as athletic gear, not a dome blob */
  _facemask() {
    const gold = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 1,
      roughness: 0.14,
      envMapIntensity: 2.6,
    });
    const steel = new THREE.MeshStandardMaterial({
      color: 0x2a2e36,
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 2.0,
    });
    const root = new THREE.Group();
    root.name = "Facemask";

    const bar = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, mat = gold) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      root.add(m);
      return m;
    };

    // Horizontal cage rails
    bar(0.95, 0.045, 0.045, 0, -0.18, 0.95, 0.15, 0, 0);
    bar(0.88, 0.04, 0.04, 0, -0.32, 0.92, 0.22, 0, 0);
    bar(0.78, 0.038, 0.038, 0, -0.46, 0.82, 0.32, 0, 0, steel);
    // Vertical posts
    bar(0.04, 0.42, 0.04, -0.32, -0.28, 0.9, 0.2, 0, 0.08);
    bar(0.04, 0.42, 0.04, 0.32, -0.28, 0.9, 0.2, 0, -0.08);
    bar(0.035, 0.36, 0.035, 0, -0.3, 0.98, 0.18, 0, 0, steel);
    // Side sweeps into ear cups
    bar(0.5, 0.035, 0.035, -0.55, -0.12, 0.55, 0.1, 0.55, 0.2);
    bar(0.5, 0.035, 0.035, 0.55, -0.12, 0.55, 0.1, -0.55, -0.2);

    return root;
  }

  _decal() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 256);
    ctx.font = "900 168px Arial Black, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#0a0806";
    ctx.strokeText("36", 256, 128);
    ctx.fillStyle = "#e2c56e";
    ctx.fillText("36", 256, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.25),
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        metalness: 0.55,
        roughness: 0.28,
        emissive: 0xd4af37,
        emissiveMap: tex,
        emissiveIntensity: 0.28,
      })
    );
    mesh.position.set(0, 0.34, 0.92);
    mesh.rotation.x = -0.12;
    return mesh;
  }

  _bind() {
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas.parentElement || this.canvas);

    // Global mouse tracking — parallax relative to viewport
    window.addEventListener(
      "pointermove",
      (e) => {
        this.pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        this.pointer.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
      },
      { passive: true }
    );
  }

  setScroll(p) {
    this.scroll = p;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.sizes.w = Math.max(1, rect.width);
    this.sizes.h = Math.max(1, rect.height);
    this.sizes.pr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.camera.aspect = this.sizes.w / this.sizes.h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.sizes.pr);
    this.renderer.setSize(this.sizes.w, this.sizes.h, false);
  }

  _loop = () => {
    this.raf = requestAnimationFrame(this._loop);
    const t = this.clock.getElapsedTime();
    const damp = this.reduced ? 1 : 0.065;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * damp;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * damp;

    const px = this.pointer.x;
    const py = this.pointer.y;

    // —— Layer parallax (FG reacts hardest, BG drifts) ——
    if (!this.reduced) {
      this.bg.position.x = px * 0.18;
      this.bg.position.y = py * 0.1;
      this.bg.rotation.z = px * 0.02;

      this.mg.position.x = px * 0.42;
      this.mg.position.y = py * 0.22;
      this.group.rotation.y = -0.42 + px * 0.48 + this.scroll * 0.35;
      this.group.rotation.x = 0.06 + py * 0.18 + Math.sin(t * 0.6) * 0.02;
      this.group.position.y = Math.sin(t * 0.75) * 0.035;

      this.fg.position.x = px * 1.15;
      this.fg.position.y = py * 0.88;
      this.fg.rotation.z = -px * 0.055;

      // Camera micro-parallax
      this.camera.position.x = this.cameraBase.x + px * 0.1;
      this.camera.position.y = this.cameraBase.y + py * 0.06;
      this.camera.lookAt(0.5 + px * 0.1, (this.isMobile ? 0.2 : 0.02) + py * 0.05, 0);

      // Slow BG motion
      if (this.bgWire) {
        this.bgWire.rotation.y = t * 0.05 + px * 0.1;
        this.bgWire.rotation.x = t * 0.03;
      }
      if (this.bgWire2) {
        this.bgWire2.rotation.y = -t * 0.07;
        this.bgWire2.rotation.z = t * 0.04;
      }
      this.bgRings.forEach((r, i) => {
        r.rotation.z = t * (0.04 + i * 0.01) * (i % 2 ? -1 : 1);
      });

      this.glassOrbs.forEach((o) => {
        o.mesh.position.y = o.base.y + Math.sin(t * 0.7 + o.phase) * 0.08;
        o.mesh.position.x = o.base.x + Math.cos(t * 0.45 + o.phase) * 0.04;
      });

      this.fgFrames.forEach((f) => {
        f.mesh.position.x = f.base.x + Math.sin(t * 0.5 + f.phase) * 0.12;
        f.mesh.position.y = f.base.y + Math.cos(t * 0.4 + f.phase) * 0.1;
      });

      if (this.particles) {
        this.particles.rotation.y = t * 0.03;
        this.particles.rotation.x = Math.sin(t * 0.2) * 0.04;
      }
      if (this.fgArc) {
        this.fgArc.rotation.z = -0.4 + px * 0.15;
      }
    }

    this.key.position.x = 2.8 + px * 0.7;
    this.key.position.y = 3.6 + py * 0.4;

    if (this.bgMat) {
      this.bgMat.uniforms.uTime.value = t;
      this.bgMat.uniforms.uMouse.value.set(px * 0.5 + 0.5, py * 0.5 + 0.5);
    }
    if (this.fluidMat) {
      this.fluidMat.uniforms.uTime.value = t;
      this.fluidMat.uniforms.uMouse.value.set(px * 0.5 + 0.5, py * 0.5 + 0.5);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
