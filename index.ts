import { Brain } from './Brain';
import { Connection } from './Connection';
import { Neuron } from './Neuron';
import { Training } from './Training';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { randomRange } from './Random';

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
function makeDigitMatrix(d: number): number[][] {
  const m = Array.from({ length: 10 }, () => Array(10).fill(0));
  // Draw a centered 7-segment-like digit inside a 6x6 box
  const w = 6, h = 6;
  const startX = Math.floor((10 - w) / 2);
  const startY = Math.floor((10 - h) / 2);

  const x0 = startX;
  const x1 = startX + w - 1;
  const y0 = startY;
  const y1 = startY + h - 1;
  const ym = startY + Math.floor(h / 2);

  const hline = (y: number, xa: number, xb: number) => {
    for (let x = xa; x <= xb; x++) m[y][x] = 1;
  };
  const vline = (x: number, ya: number, yb: number) => {
    for (let y = ya; y <= yb; y++) m[y][x] = 1;
  };

  const segs = {
    a: () => hline(y1, x0, x1),     // top
    b: () => vline(x1, ym, y1),     // upper-right
    c: () => vline(x1, y0, ym),     // lower-right
    d: () => hline(y0, x0, x1),     // bottom
    e: () => vline(x0, y0, ym),     // lower-left
    f: () => vline(x0, ym, y1),     // upper-left
    g: () => hline(ym, x0, x1),     // middle
  } as const;

  const DIGITS: Record<number, (keyof typeof segs)[]> = {
    0: ['a','b','c','d','e','f'],
    1: ['b','c'],
    2: ['a','b','g','e','d'],
    3: ['a','b','g','c','d'],
    4: ['f','g','b','c'],
    5: ['a','f','g','c','d'],
    6: ['a','f','g','c','d','e'],
    7: ['a','b','c'],
    8: ['a','b','c','d','e','f','g'],
    9: ['a','b','c','d','f','g'],
  };

  for (const s of DIGITS[(d % 10 + 10) % 10] ?? []) segs[s]();

  return m;
}

function applyInputMatrix(mat: number[][], z = 0) {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const n = brain.neurons?.[x]?.[y]?.[z];
      if (n) n.value = !!(mat[y]?.[Math.max(0, (mat[y]?.length ?? 10) - 1 - x)]);
    }
  }
}

// Apply initial digit to input layer z=0
const CURRENT_DIGIT = 6;
applyInputMatrix(makeDigitMatrix(CURRENT_DIGIT), 0);

// brain.connectLocalNeighbors(); // Optional: local neighborhood
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    for (let z = 0; z < 10; z++) {
      if (brain.neurons[x][y][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x][y][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x - 1] && brain.neurons[x - 1][y] && brain.neurons[x - 1][y][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x + 1] && brain.neurons[x + 1][y] && brain.neurons[x + 1][y][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x][y + 1] && brain.neurons[x][y + 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x][y + 1][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x - 1] && brain.neurons[x - 1][y + 1] && brain.neurons[x - 1][y + 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y + 1][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x + 1] && brain.neurons[x + 1][y + 1] && brain.neurons[x + 1][y + 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y + 1][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x][y - 1] && brain.neurons[x][y - 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x][y - 1][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x - 1] && brain.neurons[x - 1][y - 1] && brain.neurons[x - 1][y - 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y - 1][z + 1], randomRange(5, 15)); // connect to next layer neuron
      }

      if (brain.neurons[x + 1] && brain.neurons[x + 1][y - 1] && brain.neurons[x + 1][y - 1][z + 1]) {
        brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y - 1][z + 1], randomRange(5, 15)); // connect to next layer neuron
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

// Layout settings
const SHOW_LAYER_PLANES = false;
const LAYOUT_MODE: 'grid' | 'connection' = 'grid';

// Prepare index map for neurons
const NODE_INDEX = new Map<Neuron, number>();
for (let i = 0; i < brain.allNeurons.length; i++) {
  NODE_INDEX.set(brain.allNeurons[i], i);
}

// Precompute positions using connection-aware spring layout
const LAYOUT_POS = LAYOUT_MODE === 'connection'
  ? computeConnectionLayoutPositions(brain, NODE_INDEX)
  : null;

// Utility to fetch current node position (in world coordinates)
function getNodePosition(n: Neuron): THREE.Vector3 {
  if (LAYOUT_MODE === 'connection' && LAYOUT_POS) {
    const i = NODE_INDEX.get(n)!;
    return new THREE.Vector3(
      LAYOUT_POS[i * 3 + 0],
      LAYOUT_POS[i * 3 + 1],
      LAYOUT_POS[i * 3 + 2]
    );
  }
  return toWorld(n.x, n.y, n.z);
}

// Spring layout solver based on connection distances
function computeConnectionLayoutPositions(brain: Brain, nodeIndex: Map<Neuron, number>): Float32Array {
  const N = brain.allNeurons.length;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const force = new Float32Array(N * 3);

  // Initialize positions from grid with slight jitter
  for (let i = 0; i < N; i++) {
    const n = brain.allNeurons[i];
    pos[i * 3 + 0] = (n.x - cx) * GRID_SPACING + randomRange(-GRID_SPACING * 0.1, GRID_SPACING * 0.1);
    pos[i * 3 + 1] = (n.y - cy) * GRID_SPACING + randomRange(-GRID_SPACING * 0.1, GRID_SPACING * 0.1);
    pos[i * 3 + 2] = (n.z - cz) * GRID_SPACING + randomRange(-GRID_SPACING * 0.1, GRID_SPACING * 0.1);
  }

  // Build undirected edge list with rest lengths from connection distances
  const edges: number[] = []; // flat array [i, j, L, i, j, L, ...]
  const seen = new Set<string>();
  for (const a of brain.allNeurons) {
    for (const c of a.connections) {
      const i = nodeIndex.get(c.source);
      const j = nodeIndex.get(c.target);
      if (i == null || j == null) continue;
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const L = Math.max(1e-3, c.distance * GRID_SPACING);
      edges.push(i, j, L);
    }
  }

  const ITER = 260;
  const dt = 0.02;
  const k = 0.02;
  const damping = 0.98;

  for (let it = 0; it < ITER; it++) {
    force.fill(0);

    for (let e = 0; e < edges.length; e += 3) {
      const i = edges[e] | 0;
      const j = edges[e + 1] | 0;
      const L = edges[e + 2];

      const ix = i * 3;
      const jx = j * 3;

      let dx = pos[jx + 0] - pos[ix + 0];
      let dy = pos[jx + 1] - pos[ix + 1];
      let dz = pos[jx + 2] - pos[ix + 2];

      let r = Math.hypot(dx, dy, dz);
      if (r < 1e-6) {
        dx = 1e-6; dy = 0; dz = 0;
        r = 1e-6;
      }
      const invr = 1 / r;
      dx *= invr; dy *= invr; dz *= invr;

      const stretch = r - L;
      const fmag = k * stretch;

      const fx = fmag * dx;
      const fy = fmag * dy;
      const fz = fmag * dz;

      force[ix + 0] += fx; force[ix + 1] += fy; force[ix + 2] += fz;
      force[jx + 0] -= fx; force[jx + 1] -= fy; force[jx + 2] -= fz;
    }

    // Integrate
    for (let i = 0; i < N; i++) {
      const p = i * 3;
      vel[p + 0] = (vel[p + 0] + force[p + 0] * dt) * damping;
      vel[p + 1] = (vel[p + 1] + force[p + 1] * dt) * damping;
      vel[p + 2] = (vel[p + 2] + force[p + 2] * dt) * damping;

      pos[p + 0] += vel[p + 0] * dt;
      pos[p + 1] += vel[p + 1] * dt;
      pos[p + 2] += vel[p + 2] * dt;
    }
  }

  // Recentre to origin
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < N; i++) {
    sx += pos[i * 3 + 0];
    sy += pos[i * 3 + 1];
    sz += pos[i * 3 + 2];
  }
  sx /= N; sy /= N; sz /= N;
  for (let i = 0; i < N; i++) {
    pos[i * 3 + 0] -= sx;
    pos[i * 3 + 1] -= sy;
    pos[i * 3 + 2] -= sz;
  }

  return pos;
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

// Build and show paths from all active input neurons (value === true) to a target in the output layer
function findOutputNeuronByValue(val: number) {
  for (const n of brain.allNeurons) {
    if (n.z === Z_MAX && n.value === val) return n;
  }
  return undefined;
}

function buildPathsFromActiveInputsToTarget(target: any) {
  const set = new Set<Connection>();
  const zInput = Z_MIN;
  for (let x = 0; x < brain.neurons.length; x++) {
    const col = brain.neurons[x];
    if (!col) continue;
    for (let y = 0; y < col.length; y++) {
      const row = col[y];
      if (!row) continue;
      const n = row[zInput];
      if (n && n.value === true) {
        const path = brain.findShortestPath(n, target);
        for (const c of path) set.add(c);
      }
    }
  }
  trace.replace(set);

  // count set distance
    let totalDistance = 0;
    for (const c of set) {
      totalDistance += c.distance;
    }
    console.log(set)
    console.log(`Total distance of active input paths to target ${target.value}: ${totalDistance.toFixed(2)}. Size: ${set.size}`);
}

function highlightActiveInputPathsToOutputValue(val: number) {
  const target = findOutputNeuronByValue(val);
  if (!target) {
    trace.clear();
    return;
  }
  buildPathsFromActiveInputsToTarget(target);
}

// ======================
// Training System
// ======================
const training = new Training(brain, 0.1, 'neural_weights.json');

// Expose helpers for interactive updates in console
(Object.assign(window as any, {
  brain,
  training,
  connections,
  trace,
  n: (x: number, y: number, z: number) => brain.neurons?.[x]?.[y]?.[z],
  showPath: (fx: number, fy: number, fz: number, tx: number, ty: number, tz: number) => {
    const from = brain.neurons?.[fx]?.[fy]?.[fz];
    const to = brain.neurons?.[tx]?.[ty]?.[tz];
    if (from && to) trace.replace(brain.findShortestPath(from, to));
  },
  clearTrace: () => trace.clear(),
  makeDigitMatrix,
  applyInputMatrix,
  setDigit: (d: number) => { 
    applyInputMatrix(makeDigitMatrix(d), 0); 
    if ((window as any).updateNeuronVisualization) {
      (window as any).updateNeuronVisualization();
    }
    highlightActiveInputPathsToOutputValue(d); 
  },
  highlightActiveInputPathsToOutputValue,
  
  // Training functions
  trainDigit: (inputDigit: number, expectedOutput: number) => {
    applyInputMatrix(makeDigitMatrix(inputDigit), 0);
    const success = training.trainOnExample(inputDigit, expectedOutput);
    if (success) {
      highlightActiveInputPathsToOutputValue(expectedOutput);
      console.log(`Training completed for digit ${inputDigit} -> ${expectedOutput}`);
    }
    return success;
  },
  
  trainAll: (epochs = 5) => {
    const examples: [number, number][] = [];
    for (let i = 0; i <= 9; i++) {
      examples.push([i, i]); // каждая цифра должна распознаваться как сама себя
    }
    training.trainBatch(examples, epochs);
    console.log(`Training completed: ${epochs} epochs on all digits`);
  },
  
  testDigit: (digit: number) => {
    applyInputMatrix(makeDigitMatrix(digit), 0);
    // Update neuron visualization to show the new digit
    if ((window as any).updateNeuronVisualization) {
      (window as any).updateNeuronVisualization();
    }
    const prediction = training.predict();
    // Highlight path to the CORRECT output (digit), not the predicted one
    highlightActiveInputPathsToOutputValue(digit);
    console.log(`Input: ${digit}, Predicted: ${prediction}, ${prediction === digit ? '✓ Correct' : '✗ Wrong'}`);
    console.log(`Showing path to CORRECT output (${digit}), not predicted output (${prediction})`);
    return prediction;
  },

  // Show path to predicted output instead of correct output
  testDigitShowPredicted: (digit: number) => {
    applyInputMatrix(makeDigitMatrix(digit), 0);
    if ((window as any).updateNeuronVisualization) {
      (window as any).updateNeuronVisualization();
    }
    const prediction = training.predict();
    // Highlight path to the PREDICTED output
    highlightActiveInputPathsToOutputValue(prediction);
    console.log(`Input: ${digit}, Predicted: ${prediction}, ${prediction === digit ? '✓ Correct' : '✗ Wrong'}`);
    console.log(`Showing path to PREDICTED output (${prediction}), not correct output (${digit})`);
    return prediction;
  },
  
  testAll: () => {
    const examples: [number, number][] = [];
    for (let i = 0; i <= 9; i++) {
      examples.push([i, i]);
    }
    return training.testAccuracy(examples);
  },
  
  saveWeights: () => training.saveWeights(),
  loadWeights: () => training.loadWeights(),
  
  // Utility functions
  getTrainingStats: () => ({
    trainingSteps: training.trainingSteps,
    learningRate: training.currentLearningRate
  }),
  
  setLearningRate: (rate: number) => training.setLearningRate(rate),
  
  // Quick training demo
  quickDemo: async () => {
    console.log('🚀 Starting quick training demo...');
    
    // Test before training
    console.log('\n📊 Testing accuracy before training:');
    const accuracyBefore = (window as any).testAll();
    
    // Train for a few epochs
    console.log('\n🎯 Training on all digits (3 epochs)...');
    (window as any).trainAll(10);
    
    // Test after training
    console.log('\n📊 Testing accuracy after training:');
    const accuracyAfter = (window as any).testAll();
    
    console.log(`\n📈 Improvement: ${((accuracyAfter - accuracyBefore) * 100).toFixed(1)}% points`);
    
    // Save weights
    console.log('\n💾 Saving trained weights...');
    await (window as any).saveWeights();
    
    console.log('✅ Demo completed!');
    return { accuracyBefore, accuracyAfter };
  }
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
    const pos = getNodePosition(n);
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

  // Function to update neuron colors based on their values
  function updateNeuronColors() {
    for (let i = 0; i < brain.allNeurons.length; i++) {
      const n = brain.allNeurons[i];
      if (n?.value === true) {
        color.set('green');
      } else {
        color.set(0xffffff);
      }
      neuronMesh.setColorAt(i, color);
    }
    if (neuronMesh.instanceColor) {
      neuronMesh.instanceColor.needsUpdate = true;
    }
  }

  // Expose the update function globally
  (window as any).updateNeuronVisualization = updateNeuronColors;

  // Helpers to (re)build line segments from a Set<Connection>
  const colBase = new THREE.Color(0x64c8ff);
  const colTrace = new THREE.Color(0xffd166); // warm yellow for trace

  function fillGeomFromConnections(geom: THREE.BufferGeometry, arr: Connection[], colorize: (c: Connection) => THREE.Color) {
    const N = arr.length;
    const positions = new Float32Array(N * 2 * 3);
    const colors = new Float32Array(N * 2 * 3);

    for (let i = 0; i < N; i++) {
      const c = arr[i];
      const A = getNodePosition(c.source);
      const B = getNodePosition(c.target);

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
  // Compute and render paths from all active input neurons to the output neuron with value CURRENT_DIGIT
  highlightActiveInputPathsToOutputValue(CURRENT_DIGIT);

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

  if (SHOW_LAYER_PLANES) {
    addLayerPlane(Z_MIN, 0x00c878, 0x38a06a, 'ВХОД');
    addLayerPlane(Z_MAX, 0xf05050, 0xbe4949, 'ВЫХОД');
  }

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