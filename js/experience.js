/**
 * Mercury Bloom — layered cinematic Three.js hero
 * BG: teal-black fluid mesh | MG: liquid mercury sculpture | FG: caustic rings + particles
 * No helmet. Transparent clear. DPR capped. Reduced-motion safe.
 */
import * as THREE from "three";

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
  vec2 g = abs(fract(p * 7.0 + vec2(t * 0.15, -t * 0.1)) - 0.5);
  float grid = smoothstep(0.018, 0.0, min(g.x, g.y)) * 0.1;

  vec3 deep = vec3(0.02, 0.04, 0.055);
  vec3 teal = vec3(0.05, 0.22, 0.28);
  vec3 ice = vec3(0.45, 0.85, 0.9);
  vec3 pearl = vec3(0.86, 0.9, 0.92);
  float r = length(p + m * 0.1);
  vec3 col = mix(deep, teal, smoothstep(0.9, 0.1, r));
  col = mix(col, ice * 0.35, flow * (1.0 - r));
  col += pearl * grid * 0.35;
  col += ice * 0.03 / (0.28 + length(p - m * 0.35));
  float alpha = 0.78 * smoothstep(1.15, 0.25, r);
  gl_FragColor = vec4(col, alpha);
}
`;

export default class Experience {
  constructor(canvas) {
    if (Experience.instance) return Experience.instance;

    this.canvas = canvas;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = window.matchMedia("(max-width: 899px)").matches;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.scroll = 0;
    this.clock = new THREE.Clock();
    this.sizes = { w: 1, h: 1, pr: 1 };
    this.ready = Promise.race([
      new Promise((r) => { this._markReady = r; }),
      new Promise((r) => setTimeout(r, 1200)),
    ]);

    try {
      this._build();
      this._buildBackground();
      this._buildMidground();
      this._buildForeground();
      this._bind();
      this._loop();
      Experience.instance = this;
      if (this._markReady) this._markReady();
    } catch (err) {
      Experience.instance = null;
      throw err;
    }
  }

  _build() {
    const rect = this.canvas.getBoundingClientRect();
    this.sizes.w = Math.max(1, rect.width);
    this.sizes.h = Math.max(1, rect.height);
    this.sizes.pr = Math.min(window.devicePixelRatio || 1, 1.75);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.sizes.pr < 1.5,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.sizes.pr);
    this.renderer.setSize(this.sizes.w, this.sizes.h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, this.sizes.w / this.sizes.h, 0.1, 60);
    this.camera.position.set(this.isMobile ? 0 : -0.4, 0.1, this.isMobile ? 6.4 : 5.9);
    this.cameraBase = this.camera.position.clone();

    this.bg = new THREE.Group();
    this.bg.position.z = -4.5;
    this.mg = new THREE.Group();
    this.mg.position.set(this.isMobile ? 0 : 0.7, 0, 0);
    this.fg = new THREE.Group();
    this.fg.position.z = 1.9;
    this.scene.add(this.bg, this.mg, this.fg);

    this.scene.add(new THREE.AmbientLight(0xb8d4dc, 0.35));
    this.key = new THREE.DirectionalLight(0xe8f6fa, 2.8);
    this.key.position.set(3, 4, 4);
    this.scene.add(this.key);
    this.rim = new THREE.PointLight(0x5ee0d0, 16, 22);
    this.rim.position.set(-2.5, 1.2, -1);
    this.scene.add(this.rim);
    this.fill = new THREE.PointLight(0x9ab8c8, 6, 16);
    this.fill.position.set(-1.5, -1, 3);
    this.scene.add(this.fill);
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
    this.bg.add(new THREE.Mesh(new THREE.PlaneGeometry(18, 12), this.bgMat));

    const lattice = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.2, 1),
      new THREE.MeshBasicMaterial({
        color: 0x7fd4d0,
        wireframe: true,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      })
    );
    lattice.position.set(-2.2, -0.4, 0.6);
    this.bg.add(lattice);
    this.bgLattice = lattice;

    const lattice2 = lattice.clone();
    lattice2.scale.setScalar(0.55);
    lattice2.position.set(3.1, 0.9, 0.3);
    this.bg.add(lattice2);
    this.bgLattice2 = lattice2;
  }

  _buildMidground() {
    const mercury = new THREE.MeshPhysicalMaterial({
      color: 0xc8d4dc,
      metalness: 1,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2.4,
      reflectivity: 1,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xa8e8e4,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6,
    });
    const ribbon = new THREE.MeshPhysicalMaterial({
      color: 0x8ec8c4,
      metalness: 0.95,
      roughness: 0.18,
      transparent: true,
      opacity: 0.7,
      envMapIntensity: 2,
    });

    this.bloom = new THREE.Group();
    this.mg.add(this.bloom);

    // Core mercury mass — overlapping spheres (cheap metaball read)
    const cores = [
      [0, 0, 0, 0.72],
      [0.45, 0.35, 0.2, 0.42],
      [-0.4, 0.25, -0.15, 0.38],
      [0.15, -0.45, 0.25, 0.4],
      [-0.25, -0.2, 0.35, 0.32],
      [0.55, -0.15, -0.2, 0.28],
    ];
    cores.forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), i % 3 === 1 ? glass : mercury);
      m.position.set(x, y, z);
      this.bloom.add(m);
    });

    // Metal ribbons
    this.ribbons = [];
    for (let i = 0; i < 3; i++) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.95 + i * 0.18, 0.035, 12, 80), ribbon);
      tor.rotation.set(0.6 + i * 0.35, 0.4 * i, i * 0.5);
      this.bloom.add(tor);
      this.ribbons.push(tor);
    }

    // Soft glass lobes
    this.lobes = [];
    [
      [1.15, 0.55, 0.4, 0.22],
      [-1.05, -0.35, 0.5, 0.18],
      [0.7, -0.75, 0.55, 0.14],
    ].forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), glass);
      m.position.set(x, y, z);
      this.bloom.add(m);
      this.lobes.push({ mesh: m, base: m.position.clone(), phase: i * 1.7 });
    });

    this.bloom.scale.setScalar(this.isMobile ? 0.95 : 1.15);
    this.bloom.position.y = this.isMobile ? 0.35 : 0.05;
  }

  _buildForeground() {
    const count = this.reduced ? 60 : 180;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ice = new THREE.Color(0x7fe8e0);
    const pearl = new THREE.Color(0xe8f2f4);
    const teal = new THREE.Color(0x2a8a88);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      const c = Math.random() > 0.6 ? ice : Math.random() > 0.4 ? pearl : teal;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const tex = this._softTex();
    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.065,
        map: tex,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    this.fg.add(this.particles);

    // Caustic / bokeh rings
    this.caustics = [];
    [
      { r: 0.65, p: [-2.8, 1.4, 0.9], c: 0x7fe8e0, o: 0.1 },
      { r: 0.45, p: [2.9, -1.2, 1.1], c: 0xb8f0ec, o: 0.08 },
      { r: 0.3, p: [2.1, 1.7, 1.3], c: 0xe8f2f4, o: 0.07 },
      { r: 0.38, p: [-2.2, -1.5, 1.0], c: 0x4ec4bc, o: 0.09 },
    ].forEach((s) => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(s.r * 0.72, s.r, 48),
        new THREE.MeshBasicMaterial({
          color: s.c,
          transparent: true,
          opacity: s.o,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      m.position.set(...s.p);
      m.rotation.x = Math.PI * 0.35;
      this.fg.add(m);
      this.caustics.push({ mesh: m, base: m.position.clone(), phase: Math.random() * 6 });
    });
  }

  _softTex() {
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
    return new THREE.CanvasTexture(c);
  }

  _bind() {
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas.parentElement || this.canvas);
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

    if (!this.reduced) {
      this.bg.position.x = px * 0.16;
      this.bg.position.y = py * 0.09;
      this.mg.position.x = (this.isMobile ? 0 : 0.7) + px * 0.4;
      this.mg.position.y = py * 0.22;
      this.fg.position.x = px * 1.1;
      this.fg.position.y = py * 0.85;

      this.bloom.rotation.y = t * 0.12 + px * 0.35 + this.scroll * 0.25;
      this.bloom.rotation.x = Math.sin(t * 0.4) * 0.08 + py * 0.15;
      this.bloom.position.y = (this.isMobile ? 0.35 : 0.05) + Math.sin(t * 0.7) * 0.05;

      this.ribbons.forEach((r, i) => {
        r.rotation.z = t * (0.15 + i * 0.05) * (i % 2 ? -1 : 1);
      });
      this.lobes.forEach((o) => {
        o.mesh.position.y = o.base.y + Math.sin(t * 0.8 + o.phase) * 0.1;
        o.mesh.position.x = o.base.x + Math.cos(t * 0.5 + o.phase) * 0.05;
      });
      this.caustics.forEach((c) => {
        c.mesh.position.x = c.base.x + Math.sin(t * 0.45 + c.phase) * 0.14;
        c.mesh.position.y = c.base.y + Math.cos(t * 0.35 + c.phase) * 0.1;
        c.mesh.rotation.z = t * 0.08;
      });
      if (this.particles) this.particles.rotation.y = t * 0.025;
      if (this.bgLattice) {
        this.bgLattice.rotation.y = t * 0.04;
        this.bgLattice.rotation.x = t * 0.02;
      }
      if (this.bgLattice2) this.bgLattice2.rotation.y = -t * 0.06;

      this.camera.position.x = this.cameraBase.x + px * 0.1;
      this.camera.position.y = this.cameraBase.y + py * 0.06;
      this.camera.lookAt(0.4 + px * 0.1, py * 0.05, 0);
    }

    this.key.position.x = 3 + px * 0.6;
    if (this.bgMat) {
      this.bgMat.uniforms.uTime.value = t;
      this.bgMat.uniforms.uMouse.value.set(px * 0.5 + 0.5, py * 0.5 + 0.5);
    }
    this.renderer.render(this.scene, this.camera);
  };
}
