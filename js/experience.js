/**
 * Mercury Bloom — layered cinematic Three.js hero
 * BG: teal fluid atmosphere | MG: raymarched liquid-mercury metaball | FG: glass droplets + caustics
 * Transparent clear. DPR capped. Reduced-motion safe.
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
  float grid = smoothstep(0.018, 0.0, min(g.x, g.y)) * 0.08;

  vec3 deep = vec3(0.015, 0.03, 0.045);
  vec3 teal = vec3(0.04, 0.18, 0.24);
  vec3 ice = vec3(0.45, 0.85, 0.9);
  vec3 pearl = vec3(0.86, 0.9, 0.92);
  float r = length(p + m * 0.1);
  vec3 col = mix(deep, teal, smoothstep(0.95, 0.12, r));
  col = mix(col, ice * 0.32, flow * (1.0 - r));
  col += pearl * grid * 0.3;
  col += ice * 0.035 / (0.28 + length(p - m * 0.35));
  float alpha = 0.82 * smoothstep(1.15, 0.22, r);
  gl_FragColor = vec4(col, alpha);
}
`;

const liquidVert = /* glsl */ `
uniform mat4 uInverseModel;
varying vec3 vLocalPos;
varying vec3 vEyeLocal;
void main() {
  vLocalPos = position;
  vEyeLocal = (uInverseModel * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Raymarched soft-min metaballs — fused mercury organism (object space)
const liquidFrag = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uReduced;
varying vec3 vLocalPos;
varying vec3 vEyeLocal;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float mapBloom(vec3 p) {
  float t = uTime * (uReduced > 0.5 ? 0.0 : 0.5);
  vec2 m = (uMouse - 0.5) * 0.35;
  p.xy -= m;

  vec3 c0 = vec3(0.0, 0.02, 0.0);
  vec3 c1 = vec3(0.48 + sin(t*0.65)*0.04, 0.34 + cos(t*0.45)*0.03, 0.12);
  vec3 c2 = vec3(-0.44, 0.28 + sin(t*0.55)*0.035, -0.1);
  vec3 c3 = vec3(0.16, -0.44 + cos(t*0.5)*0.03, 0.2);
  vec3 c4 = vec3(-0.32, -0.22, 0.34 + sin(t*0.35)*0.03);
  vec3 c5 = vec3(0.52, -0.1, -0.22);
  vec3 c6 = vec3(-0.55, -0.02, 0.08);
  vec3 c7 = vec3(0.1, 0.5, -0.08);
  vec3 c8 = vec3(0.28, 0.12, 0.4);

  float d = sdSphere(p - c0, 0.42);
  d = smin(d, sdSphere(p - c1, 0.4), 0.3);
  d = smin(d, sdSphere(p - c2, 0.36), 0.28);
  d = smin(d, sdSphere(p - c3, 0.38), 0.28);
  d = smin(d, sdSphere(p - c4, 0.3), 0.26);
  d = smin(d, sdSphere(p - c5, 0.26), 0.24);
  d = smin(d, sdSphere(p - c6, 0.28), 0.24);
  d = smin(d, sdSphere(p - c7, 0.24), 0.22);
  d = smin(d, sdSphere(p - c8, 0.2), 0.22);

  // squash for less perfect-sphere silhouette
  float squash = length(vec3(p.x * 1.08, p.y * 0.92, p.z * 1.05)) - length(p);
  float ripple = sin(p.x * 6.0 + t * 1.6) * sin(p.y * 5.5 - t) * 0.01;
  return d + squash * 0.15 + ripple;
}

vec3 calcNormal(vec3 p) {
  const float e = 0.0012;
  return normalize(vec3(
    mapBloom(p + vec3(e,0,0)) - mapBloom(p - vec3(e,0,0)),
    mapBloom(p + vec3(0,e,0)) - mapBloom(p - vec3(0,e,0)),
    mapBloom(p + vec3(0,0,e)) - mapBloom(p - vec3(0,0,e))
  ));
}

vec3 envColor(vec3 rd) {
  float h = rd.y * 0.5 + 0.5;
  vec3 deep = vec3(0.02, 0.04, 0.06);
  vec3 mid = vec3(0.1, 0.32, 0.36);
  vec3 hi = vec3(0.78, 0.92, 0.94);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.55, h));
  col = mix(col, hi, smoothstep(0.55, 1.0, h));
  float key = pow(max(0.0, dot(rd, normalize(vec3(0.45, 0.75, 0.4)))), 28.0);
  col += vec3(0.9, 0.96, 1.0) * key * 1.0;
  float rimL = pow(max(0.0, dot(rd, normalize(vec3(-0.65, 0.15, -0.25)))), 12.0);
  col += vec3(0.25, 0.85, 0.8) * rimL * 0.4;
  return col;
}

void main() {
  vec3 ro = vEyeLocal;
  vec3 rd = normalize(vLocalPos - vEyeLocal);

  float t = 0.0;
  float hit = -1.0;
  for (int i = 0; i < 72; i++) {
    vec3 p = ro + rd * t;
    float d = mapBloom(p);
    if (d < 0.0012) { hit = t; break; }
    t += clamp(d, 0.008, 0.2);
    if (t > 6.0) break;
  }

  if (hit < 0.0) discard;

  vec3 p = ro + rd * hit;
  vec3 n = calcNormal(p);
  vec3 v = normalize(ro - p);
  float fres = pow(1.0 - max(0.0, dot(n, v)), 2.6);

  vec3 refl = reflect(-v, n);
  vec3 refr = refract(-v, n, 0.9);
  vec3 metal = envColor(refl);
  vec3 glass = envColor(refr == vec3(0.0) ? refl : refr);

  // Dark mercury body + bright glass rim
  vec3 body = vec3(0.06, 0.08, 0.1);
  vec3 col = mix(body + metal * 0.42, glass * 0.55 + metal * 0.5, fres * 0.8);
  col = mix(col, metal, fres * 0.92);

  vec3 l = normalize(vec3(0.55, 0.9, 0.35));
  float spec = pow(max(0.0, dot(reflect(-l, n), v)), 80.0);
  col += vec3(0.95, 0.98, 1.0) * spec * 1.35;

  float ss = pow(max(0.0, dot(-v, n)), 1.4);
  col += vec3(0.08, 0.35, 0.38) * ss * 0.16;

  float alpha = mix(0.96, 0.62, fres);
  gl_FragColor = vec4(col, alpha);
}
`;

const causticFrag = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float t = uTime * 0.4;
  vec2 m = (uMouse - 0.5) * 0.4;
  float n = sin((p.x + m.x) * 6.0 + t) * cos((p.y + m.y) * 5.0 - t * 0.8);
  n += sin(length(p + m) * 10.0 - t * 1.5) * 0.5;
  float ring = smoothstep(0.95, 0.2, r);
  float caust = pow(max(0.0, n * 0.5 + 0.5), 3.0) * ring;
  vec3 col = mix(vec3(0.05, 0.2, 0.24), vec3(0.55, 0.95, 0.95), caust);
  float alpha = caust * 0.35 * ring;
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
      new Promise((r) => {
        this._markReady = r;
      }),
      new Promise((r) => setTimeout(r, 1400)),
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
    this.sizes.pr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 1.75);

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
    this.camera = new THREE.PerspectiveCamera(36, this.sizes.w / this.sizes.h, 0.1, 60);
    this.camera.position.set(0, 0.08, this.isMobile ? 5.8 : 5.2);
    this.cameraBase = this.camera.position.clone();

    this.bg = new THREE.Group();
    this.bg.position.z = -4.5;
    this.mg = new THREE.Group();
    this.fg = new THREE.Group();
    this.fg.position.z = 1.85;
    this.scene.add(this.bg, this.mg, this.fg);

    this.scene.add(new THREE.AmbientLight(0xb8d4dc, 0.28));
    this.key = new THREE.DirectionalLight(0xe8f6fa, 2.2);
    this.key.position.set(3, 4, 4);
    this.scene.add(this.key);
    this.rim = new THREE.PointLight(0x5ee0d0, 14, 22);
    this.rim.position.set(-2.5, 1.2, -1);
    this.scene.add(this.rim);
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
  }

  _buildMidground() {
    this.liquidMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uReduced: { value: this.reduced ? 1 : 0 },
        uInverseModel: { value: new THREE.Matrix4() },
      },
      vertexShader: liquidVert,
      fragmentShader: liquidFrag,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    this._invModel = new THREE.Matrix4();

    // Proxy volume for raymarch — large enough to contain fused lobes
    this.bloom = new THREE.Mesh(new THREE.SphereGeometry(1.55, 48, 32), this.liquidMat);
    this.bloom.scale.setScalar(this.isMobile ? 1.15 : 1.45);
    this.mg.add(this.bloom);

    // Caustic pool under mass
    this.causticMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: meshVert,
      fragmentShader: causticFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.causticFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), this.causticMat);
    this.causticFloor.rotation.x = -Math.PI * 0.5;
    this.causticFloor.position.y = -1.35;
    this.mg.add(this.causticFloor);

    // One subtle glass ring only (supporting — not competing with bloom)
    this.ribbons = [];
    const glassRing = new THREE.MeshPhysicalMaterial({
      color: 0x7fe8e0,
      metalness: 0.2,
      roughness: 0.08,
      transparent: true,
      opacity: 0.16,
      transmission: 0.5,
      thickness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
    });
    const tor = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.016, 10, 96), glassRing);
    tor.rotation.set(0.85, 0.25, 0.4);
    this.mg.add(tor);
    this.ribbons.push(tor);

    // Fewer satellite droplets — bloom is the star
    this.lobes = [];
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xc8f4f0,
      metalness: 0.05,
      roughness: 0.04,
      transparent: true,
      opacity: 0.38,
      transmission: 0.7,
      thickness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    });
    [
      [1.55, 0.45, 0.3, 0.11],
      [-1.45, -0.3, 0.35, 0.09],
    ].forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), glass);
      m.position.set(x, y, z);
      this.mg.add(m);
      this.lobes.push({ mesh: m, base: m.position.clone(), phase: i * 1.7 });
    });
  }

  _buildForeground() {
    const count = this.reduced ? 50 : this.isMobile ? 120 : 200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ice = new THREE.Color(0x7fe8e0);
    const pearl = new THREE.Color(0xe8f2f4);
    const teal = new THREE.Color(0x2a8a88);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 7.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
      const c = Math.random() > 0.55 ? ice : Math.random() > 0.4 ? pearl : teal;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.055,
        map: this._softTex(),
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    this.fg.add(this.particles);

    this.caustics = [];
    [
      { r: 0.55, p: [-2.6, 1.3, 0.85], c: 0x7fe8e0, o: 0.09 },
      { r: 0.4, p: [2.7, -1.1, 1.0], c: 0xb8f0ec, o: 0.07 },
      { r: 0.28, p: [2.0, 1.55, 1.2], c: 0xe8f2f4, o: 0.06 },
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

  /** Used by hero enter choreography */
  setIntro(progress) {
    const p = Math.max(0, Math.min(1, progress));
    if (this.bloom) this.bloom.scale.setScalar((this.isMobile ? 1.05 : 1.2) * (0.82 + p * 0.18));
    if (this.liquidMat) this.liquidMat.opacity = p; // ignored by custom shader; scale is enough
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.sizes.w = Math.max(1, rect.width);
    this.sizes.h = Math.max(1, rect.height);
    this.sizes.pr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 1.75);
    this.camera.aspect = this.sizes.w / this.sizes.h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.sizes.pr);
    this.renderer.setSize(this.sizes.w, this.sizes.h, false);
  }

  _loop = () => {
    this.raf = requestAnimationFrame(this._loop);
    const t = this.clock.getElapsedTime();
    const damp = this.reduced ? 1 : 0.07;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * damp;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * damp;
    const px = this.pointer.x;
    const py = this.pointer.y;

    if (!this.reduced) {
      // Distinct Z-parallax amplitudes
      this.bg.position.x = px * 0.12;
      this.bg.position.y = py * 0.07;
      this.mg.position.x = px * 0.38;
      this.mg.position.y = py * 0.2;
      this.fg.position.x = px * 1.05;
      this.fg.position.y = py * 0.8;

      this.bloom.rotation.y = t * 0.08 + px * 0.28 + this.scroll * 0.2;
      this.bloom.rotation.x = Math.sin(t * 0.35) * 0.05 + py * 0.12;
      this.bloom.position.y = Math.sin(t * 0.55) * 0.04;

      this.ribbons.forEach((r, i) => {
        r.rotation.z = t * (0.08 + i * 0.03) * (i % 2 ? -1 : 1);
      });
      this.lobes.forEach((o) => {
        o.mesh.position.y = o.base.y + Math.sin(t * 0.7 + o.phase) * 0.07;
        o.mesh.position.x = o.base.x + Math.cos(t * 0.45 + o.phase) * 0.04;
      });
      this.caustics.forEach((c) => {
        c.mesh.position.x = c.base.x + Math.sin(t * 0.4 + c.phase) * 0.12;
        c.mesh.position.y = c.base.y + Math.cos(t * 0.32 + c.phase) * 0.08;
        c.mesh.rotation.z = t * 0.06;
      });
      if (this.particles) this.particles.rotation.y = t * 0.02;
      if (this.causticFloor) {
        this.causticFloor.position.x = px * 0.15;
        this.causticFloor.rotation.z = px * 0.05;
      }

      this.camera.position.x = this.cameraBase.x + px * 0.08;
      this.camera.position.y = this.cameraBase.y + py * 0.05;
      this.camera.lookAt(px * 0.06, py * 0.03, 0);
    }

    this.key.position.x = 3 + px * 0.5;
    const mx = px * 0.5 + 0.5;
    const my = py * 0.5 + 0.5;
    if (this.bgMat) {
      this.bgMat.uniforms.uTime.value = t;
      this.bgMat.uniforms.uMouse.value.set(mx, my);
    }
    if (this.liquidMat) {
      this.liquidMat.uniforms.uTime.value = t;
      this.liquidMat.uniforms.uMouse.value.set(mx, my);
      if (this.bloom) {
        this.bloom.updateMatrixWorld(true);
        this._invModel.copy(this.bloom.matrixWorld).invert();
        this.liquidMat.uniforms.uInverseModel.value.copy(this._invModel);
      }
    }
    if (this.causticMat) {
      this.causticMat.uniforms.uTime.value = t;
      this.causticMat.uniforms.uMouse.value.set(mx, my);
    }
    this.renderer.render(this.scene, this.camera);
  };
}
