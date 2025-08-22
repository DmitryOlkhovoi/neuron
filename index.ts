import { Brain } from './Brain';
import { Connection } from './Connection';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ======================
// Build brain (data model)
// ======================
const brain = new Brain();
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    for (let z = 0; z < 10; z++) {
      brain.addNeuron(x, y, z);
    }
  }
}

// Target values
for (let x = 0; x < 10; x++) {
    const n = brain.addNeuron(4, x, 10)
    n.value = x;
}

// Input matrix
const INPUT7: number[][] = (() => {
  const m = Array.from({ length: 10 }, () => Array(10).fill(0));
  // smaller, centered, mirrored "7"
  const w = 6, h = 6; // size of the digit box
  const startX = Math.floor((10 - w) / 2);
  const startY = Math.floor((10 - h) / 2);
  const yTop = startY + h - 1;

  // top horizontal bar
  for (let dx = 0; dx < w; dx++) m[yTop][startX + dx] = 1;

  // diagonal in the other direction: top-left to bottom-right
  for (let i = 0; i < h; i++) {
    const x = startX + i;
    const y = yTop - i;
    m[y][x] = 1;
  }

  return m;
})();

function applyInputMatrix(mat: number[][], z = 0) {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const n = brain.neurons?.[x]?.[y]?.[z];
      if (n) n.value = !!(mat[y]?.[x]);
    }
  }
}

// Apply digit 7 to input layer z=0
applyInputMatrix(INPUT7, 0);



// brain.connectLocalNeighbors(); // Optional: local neighborhood
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    for (let z = 0; z < 10; z++) {
      if (brain.neurons[x][y][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x][y][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x - 1] && brain.neurons[x - 1][y] && brain.neurons[x - 1][y][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x + 1] && brain.neurons[x + 1][y] && brain.neurons[x + 1][y][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x][y + 1] && brain.neurons[x][y + 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x][y + 1][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x - 1] && brain.neurons[x - 1][y + 1] && brain.neurons[x - 1][y + 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y + 1][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x + 1] && brain.neurons[x + 1][y + 1] && brain.neurons[x + 1][y + 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y + 1][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x][y - 1] && brain.neurons[x][y - 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x][y - 1][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x - 1] && brain.neurons[x - 1][y - 1] && brain.neurons[x - 1][y - 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y - 1][z + 1], 10); // connect to next layer neuron
      }

      if (brain.neurons[x + 1] && brain.neurons[x + 1][y - 1] && brain.neurons[x + 1][y - 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y - 1][z + 1], 10); // connect to next layer neuron
      }
    }
  }
}

// ======================
// Observable Set
// ======================
class ObservableSet<T> extends Set<T> {
  private listeners = new Set<() => void>();
  onChange(cb: () => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit() { for (const cb of this.listeners) cb(); }
  add(value: T): this { const had = this.has(value); super.add(value); if (!had) this.emit(); return this; }
  delete(value: T): boolean { const ok = super.delete(value); if (ok) this.emit(); return ok; }
  clear(): void { if (this.size) { super.clear(); this.emit(); } }
  replace(values: Iterable<T>) { super.clear(); for (const v of values) super.add(v); this.emit(); }
}

// ======================
// Visualization (three.js)
// ======================

// Config
const GRID_SPACING = 15; // distance between neighboring nodes
const NODE_RADIUS = 1.6; // base radius for neurons
const LINE_ALPHA = 0.12; // line translucency for background connections
const TRACE_ALPHA = 0.9;  // line translucency for trace/highlight
const USE_ADDITIVE_FOR_LINES = true; // enable additive blending for glow-like lines

// Compute weight range (from connections distances)
let WEIGHT_MIN = Infinity;
let WEIGHT_MAX = -Infinity;
for (const n of brain.allNeurons) {
  for (const c of n.connections) {
    if (c.distance < WEIGHT_MIN) WEIGHT_MIN = c.distance;
    if (c.distance > WEIGHT_MAX) WEIGHT_MAX = c.distance;
  }
}
if (!isFinite(WEIGHT_MIN) || !isFinite(WEIGHT_MAX)) {
  WEIGHT_MIN = 0;
  WEIGHT_MAX = 1;
}

// Bounds and center
const Z_MIN = Math.min(...brain.allNeurons.map(n => n.z));
const Z_MAX = Math.max(...brain.allNeurons.map(n => n.z));
const X_MIN = Math.min(...brain.allNeurons.map(n => n.x));
const X_MAX = Math.max(...brain.allNeurons.map(n => n.x));
const Y_MIN = Math.min(...brain.allNeurons.map(n => n.y));
const Y_MAX = Math.max(...brain.allNeurons.map(n => n.y));
const { cx, cy, cz } = brain.getCenter();

// Convert grid coords to world coords centered at origin
function toWorld(x: number, y: number, z: number) {
  return new THREE.Vector3(
    (x - cx) * GRID_SPACING,
    (y - cy) * GRID_SPACING,
    (z - cz) * GRID_SPACING
  );
}

// Label sprite factory
function makeLabelSprite(text: string, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = 'bold 120px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // stroke for contrast
  ctx.lineWidth = 16;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  const scale = 45; // tweak to taste
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
  return sprite;
}

// Global dynamic sets
const connections = new ObservableSet<Connection>();
for (const a of brain.allNeurons) {
  for (const c of a.connections) connections.add(c);
}
const trace = new ObservableSet<Connection>();

// Expose helpers for interactive updates in console
(Object.assign(window as any, {
  brain,
  connections,
  trace,
  n: (x: number, y: number, z: number) => brain.neurons?.[x]?.[y]?.[z],
  showPath: (fx: number, fy: number, fz: number, tx: number, ty: number, tz: number) => {
    const from = brain.neurons?.[fx]?.[fy]?.[fz];
    const to = brain.neurons?.[tx]?.[ty]?.[tz];
    if (from && to) trace.replace(brain.findShortestPath(from, to));
  },
  clearTrace: () => trace.clear(),
  INPUT7,
  applyInputMatrix,
}))

window.addEventListener('load', () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #canvas not found');
    return;
  }

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);

  // Scene and Camera
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / Math.max(1, canvas.clientHeight),
    0.1,
    5000
  );
  camera.position.set(180, 140, 220);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 1.0;
  controls.minDistance = 5;
  controls.maxDistance = 5000;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // Lighting (basic, since we use mostly unlit materials)
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  // Neurons as instanced spheres
  const neuronGeom = new THREE.SphereGeometry(NODE_RADIUS, 16, 12);
  const neuronMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const neuronMesh = new THREE.InstancedMesh(neuronGeom, neuronMat, brain.allNeurons.length);
  neuronMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const cGreen = new THREE.Color('hsl(140, 90%, 68%)');
  const cRed = new THREE.Color('hsl(0, 85%, 68%)');
  const cCyan = new THREE.Color('hsl(190, 90%, 70%)');

  const tmpObj = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < brain.allNeurons.length; i++) {
    const n = brain.allNeurons[i];
    const pos = toWorld(n.x, n.y, n.z);
    tmpObj.position.copy(pos);
    tmpObj.rotation.set(0, 0, 0);
    tmpObj.scale.set(1, 1, 1);
    tmpObj.updateMatrix();
    neuronMesh.setMatrixAt(i, tmpObj.matrix);

    // Keep this call harmless; material ignores instance colors now
    if (n?.value === true) {
        color.set('green')
    } else {
        color.set(0xffffff);
    }
    neuronMesh.setColorAt(i, color);
  }
  neuronMesh.instanceMatrix.needsUpdate = true;
  scene.add(neuronMesh);

  // Helpers to (re)build line segments from a Set<Connection>
  const colBase = new THREE.Color(0x64c8ff);
  const colTrace = new THREE.Color(0xffd166); // warm yellow for trace

  function fillGeomFromConnections(geom: THREE.BufferGeometry, arr: Connection[], colorize: (c: Connection) => THREE.Color) {
    const N = arr.length;
    const positions = new Float32Array(N * 2 * 3);
    const colors = new Float32Array(N * 2 * 3);

    for (let i = 0; i < N; i++) {
      const c = arr[i];
      const A = toWorld(c.source.x, c.source.y, c.source.z);
      const B = toWorld(c.target.x, c.target.y, c.target.z);

      const idx = i * 2 * 3;
      positions[idx + 0] = A.x; positions[idx + 1] = A.y; positions[idx + 2] = A.z;
      positions[idx + 3] = B.x; positions[idx + 4] = B.y; positions[idx + 5] = B.z;

      const col = colorize(c);
      colors[idx + 0] = col.r; colors[idx + 1] = col.g; colors[idx + 2] = col.b;
      colors[idx + 3] = col.r; colors[idx + 4] = col.g; colors[idx + 5] = col.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  function makeLineSegments(opacity: number) {
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: USE_ADDITIVE_FOR_LINES ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    return new THREE.LineSegments(geom, mat);
  }

  // Base connections layer
  const baseLines = makeLineSegments(LINE_ALPHA);
  scene.add(baseLines);

  const baseColorize = (c: Connection) => {
    const wf = (c.distance - WEIGHT_MIN) / Math.max(1e-6, WEIGHT_MAX - WEIGHT_MIN);
    return colBase.clone().lerp(new THREE.Color(0xffffff), 0.35 * wf);
  };

  function refreshBaseLines() {
    const arr = Array.from(connections);
    fillGeomFromConnections(baseLines.geometry as THREE.BufferGeometry, arr, baseColorize);
  }

  refreshBaseLines();
  connections.onChange(refreshBaseLines);

  // Trace layer
  const traceLines = makeLineSegments(TRACE_ALPHA);
  scene.add(traceLines);

  const traceColorize = (_c: Connection) => colTrace.clone();

  function refreshTraceLines() {
    const arr = Array.from(trace);
    fillGeomFromConnections(traceLines.geometry as THREE.BufferGeometry, arr, traceColorize);
  }

  refreshTraceLines();
  trace.onChange(refreshTraceLines);

  // Planes for input/output layers
  const spanX = (X_MAX - X_MIN) * GRID_SPACING;
  const spanY = (Y_MAX - Y_MIN) * GRID_SPACING;
  const planeW = spanX + GRID_SPACING;
  const planeH = spanY + GRID_SPACING;

  function addLayerPlane(zLayer: number, colorFill: number, colorEdge: number, label: string) {
    const z = (zLayer - cz) * GRID_SPACING;
    const pg = new THREE.PlaneGeometry(planeW, planeH);
    const pm = new THREE.MeshBasicMaterial({ color: colorFill, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(pg, pm);
    plane.position.set(0, 0, z);
    scene.add(plane);

    // Edges
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(pg),
      new THREE.LineBasicMaterial({ color: colorEdge, transparent: true, opacity: 0.45 })
    );
    edges.position.copy(plane.position);
    scene.add(edges);

    // Label
    const labelColor = new THREE.Color(colorEdge).getStyle();
    const sprite = makeLabelSprite(label, labelColor);
    sprite.position.set(0, planeH * 0.35, z + 0.1);
    scene.add(sprite);
  }

  addLayerPlane(Z_MIN, 0x00c878, 0x38a06a, 'ВХОД');
  addLayerPlane(Z_MAX, 0xf05050, 0xbe4949, 'ВЫХОД');

  // Resize handling
  function resizeRendererToDisplaySize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio());
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
  }

  // Optionally show an initial path as a demo
  // trace.replace(brain.findShortestPath(brain.neurons[0][0][1], brain.neurons[5][5][9]));

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    resizeRendererToDisplaySize();
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
});
