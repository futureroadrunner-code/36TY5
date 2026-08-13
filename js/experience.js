/**

 * Three.js / WebGL Experience — singleton.

 * Helmet .gltf with custom metalness/roughness/visor glass,

 * cursor tracking, scroll-linked camera, fluid-like iridescent plane.

 */

import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";



const MATERIALS = {

  HelmetDome: {

    color: 0xd0d4da,

    metalness: 1,

    roughness: 0.08,

    envMapIntensity: 2.8,

    clearcoat: 0.85,

    clearcoatRoughness: 0.08,

    physical: true,

  },

  HelmetVisor: {

    color: 0x04050a,

    metalness: 0.85,

    roughness: 0.04,

    envMapIntensity: 3.2,

    clearcoat: 1,

    clearcoatRoughness: 0.06,

    physical: true,

  },

  HelmetTrim: { color: 0xd4af37, metalness: 1, roughness: 0.14, envMapIntensity: 2.4 },

  HelmetBrow: { color: 0xe2c56e, metalness: 1, roughness: 0.1, envMapIntensity: 2.5 },

  HelmetEarL: { color: 0xd4af37, metalness: 1, roughness: 0.16, envMapIntensity: 2.2 },

  HelmetEarR: { color: 0xd4af37, metalness: 1, roughness: 0.16, envMapIntensity: 2.2 },

  HelmetChin: { color: 0xb8bcc4, metalness: 1, roughness: 0.12, envMapIntensity: 2.2 },

  HelmetCrest: { color: 0xd4af37, metalness: 1, roughness: 0.14, envMapIntensity: 2.1 },

  HelmetAntenna: { color: 0xe8ecf2, metalness: 1, roughness: 0.05, envMapIntensity: 2.5 },

  HelmetBadge: { color: 0xd4af37, metalness: 1, roughness: 0.14, envMapIntensity: 2.2 },

  HelmetGrill: { color: 0x1a1c20, metalness: 1, roughness: 0.28, envMapIntensity: 1.7 },

};



const fluidVert = `

varying vec2 vUv;

void main() {

  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}

`;



const fluidFrag = `

uniform float uTime;

uniform vec2 uMouse;

varying vec2 vUv;

void main() {

  vec2 p = vUv - 0.5;

  float d = length(p);

  vec2 m = uMouse - 0.5;

  float rip = sin(10.0 * d - uTime * 1.4) * 0.5 + 0.5;

  float blob = 0.014 / (0.09 + length(p - m * 0.5));

  vec3 gold = vec3(0.83, 0.69, 0.22);

  vec3 velvet = vec3(0.42, 0.08, 0.18);

  vec3 cyan = vec3(0.2, 0.7, 0.78);

  vec3 col = mix(gold, velvet, smoothstep(0.1, 0.75, d + blob * 0.18));

  col = mix(col, cyan, rip * 0.12);

  float alpha = 0.07 * (1.0 - smoothstep(0.45, 0.88, d));

  gl_FragColor = vec4(col, alpha);

}

`;



export default class Experience {

  constructor(canvas) {

    if (Experience.instance) return Experience.instance;

    Experience.instance = this;

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

    this._build();

    this._loadHelmet();

    this._bind();

    this._loop();

  }



  _build() {

    const rect = this.canvas.getBoundingClientRect();

    this.sizes.w = Math.max(1, rect.width);

    this.sizes.h = Math.max(1, rect.height);

    this.sizes.pr = Math.min(window.devicePixelRatio || 1, 2);



    this.renderer = new THREE.WebGLRenderer({

      canvas: this.canvas,

      antialias: true,

      alpha: true,

      powerPreference: "high-performance",

    });

    this.renderer.setPixelRatio(this.sizes.pr);

    this.renderer.setSize(this.sizes.w, this.sizes.h, false);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.renderer.toneMappingExposure = 1.28;

    this.renderer.setClearColor(0x000000, 0);



    this.scene = new THREE.Scene();

    // Wider FOV + farther camera so the full helmet silhouette reads clearly

    this.camera = new THREE.PerspectiveCamera(34, this.sizes.w / this.sizes.h, 0.1, 50);

    this.camera.position.set(0.08, 0.18, 5.1);



    const pmrem = new THREE.PMREMGenerator(this.renderer);

    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    pmrem.dispose();



    this.scene.add(new THREE.AmbientLight(0xffe6c8, 0.35));

    this.key = new THREE.DirectionalLight(0xfff1d0, 2.8);

    this.key.position.set(2.8, 3.8, 3.4);

    this.scene.add(this.key);

    this.rim = new THREE.PointLight(0xd4af37, 10, 18);

    this.rim.position.set(-2.6, 0.6, -1.6);

    this.scene.add(this.rim);

    this.fill = new THREE.PointLight(0xffd0e0, 4.5, 14);

    this.fill.position.set(-1.6, 1.8, 3.4);

    this.scene.add(this.fill);

    this.front = new THREE.DirectionalLight(0xffffff, 0.55);

    this.front.position.set(0.2, 0.4, 5);

    this.scene.add(this.front);



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

    const fluid = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), this.fluidMat);

    fluid.position.set(0.2, -0.15, -3.4);

    this.scene.add(fluid);



    this.group = new THREE.Group();

    this.scene.add(this.group);

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

      if (spec.physical) {

        obj.material = new THREE.MeshPhysicalMaterial({

          ...base,

          clearcoat: spec.clearcoat || 0.25,

          clearcoatRoughness: spec.clearcoatRoughness || 0.15,

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

        // Hide only boxy crest/antenna that break the iconic silhouette;

        // keep curved visor, chin, grill, badge for a readable helmet.

        model.traverse((obj) => {

          if (!obj.isMesh) return;

          if (obj.name === "HelmetCrest" || obj.name === "HelmetAntenna") {

            obj.visible = false;

          }

        });

        // Fit full helmet in frame — smaller scale, slight lift

        model.scale.setScalar(1.22);

        model.position.set(0, -0.08, 0);

        this.group.rotation.y = -0.32;

        this.group.rotation.x = 0.04;

        this.group.add(model);

        this.group.add(this._decal());

        if (this._markReady) this._markReady();

      },

      undefined,

      () => {

        this._fallbackHelmet();

        if (this._markReady) this._markReady();

      }

    );

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

    // Sit on the brow badge area without floating off the dome

    mesh.position.set(0, 0.34, 0.92);

    mesh.rotation.x = -0.12;

    return mesh;

  }



  _bind() {

    this.ro = new ResizeObserver(() => this.resize());

    this.ro.observe(this.canvas.parentElement || this.canvas);

    window.addEventListener("pointermove", (e) => {

      const r = this.canvas.getBoundingClientRect();

      this.pointer.tx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;

      this.pointer.ty = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);

    });

  }



  setScroll(p) {

    this.scroll = p;

  }



  resize() {

    const rect = this.canvas.getBoundingClientRect();

    this.sizes.w = Math.max(1, rect.width);

    this.sizes.h = Math.max(1, rect.height);

    this.sizes.pr = Math.min(window.devicePixelRatio || 1, 2);

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



    this.group.rotation.y = -0.42 + this.pointer.x * 0.45 + this.scroll * 0.35;

    this.group.rotation.x = 0.06 + this.pointer.y * 0.16 + Math.sin(t * 0.6) * 0.02;

    this.group.position.y = Math.sin(t * 0.75) * 0.035;

    this.key.position.x = 2.8 + this.pointer.x * 0.7;

    this.key.position.y = 3.8 + this.pointer.y * 0.4;



    this.fluidMat.uniforms.uTime.value = t;

    this.fluidMat.uniforms.uMouse.value.set(this.pointer.x * 0.5 + 0.5, this.pointer.y * 0.5 + 0.5);

    this.renderer.render(this.scene, this.camera);

  };

}


