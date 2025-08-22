import { Brain } from './Brain';
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

// Debug shortest path (if needed)
console.log(brain.findShortestPath(brain.neurons[0][0][1], brain.neurons[5][5][9]));

// ======================
// Visualization (three.js)
// ======================

// Config
const GRID_SPACING = 15; // distance between neighboring nodes
const NODE_RADIUS = 1.6; // base radius for neurons
const LINE_ALPHA = 0.12; // line translucency
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
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.6;
  controls.minDistance = 60;
  controls.maxDistance = 800;
  controls.maxPolarAngle = Math.PI * 0.98;

  // Lighting (basic, since we use mostly unlit materials)
  // Add subtle ambient to help any lit materials
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  // Neurons as instanced spheres
  const neuronGeom = new THREE.SphereGeometry(NODE_RADIUS, 16, 12);
  const neuronMat = new THREE.MeshBasicMaterial({ vertexColors: true });
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

    if (n.z === Z_MIN) color.copy(cGreen);
    else if (n.z === Z_MAX) color.copy(cRed);
    else color.copy(cCyan);
    neuronMesh.setColorAt(i, color);
  }
  neuronMesh.instanceColor && (neuronMesh.instanceColor.needsUpdate = true);
  scene.add(neuronMesh);

  // Connections as line segments
  // Gather all directed connections
  const directedConnections = [] as { ax: number; ay: number; az: number; bx: number; by: number; bz: number; w: number }[];
  for (const a of brain.allNeurons) {
    for (const c of a.connections) {
      const A = toWorld(c.source.x, c.source.y, c.source.z);
      const B = toWorld(c.target.x, c.target.y, c.target.z);
      directedConnections.push({ ax: A.x, ay: A.y, az: A.z, bx: B.x, by: B.y, bz: B.z, w: c.distance });
    }
  }

  if (directedConnections.length > 0) {
    const positions = new Float32Array(directedConnections.length * 2 * 3);
    const colors = new Float32Array(directedConnections.length * 2 * 3);

    const colA = new THREE.Color(0x64c8ff); // base color for lines

    for (let i = 0; i < directedConnections.length; i++) {
      const { ax, ay, az, bx, by, bz, w } = directedConnections[i];
      const idx = i * 2 * 3;
      positions[idx + 0] = ax;
      positions[idx + 1] = ay;
      positions[idx + 2] = az;
      positions[idx + 3] = bx;
      positions[idx + 4] = by;
      positions[idx + 5] = bz;

      // Vary brightness by normalized weight (optional)
      const wf = (w - WEIGHT_MIN) / Math.max(1e-6, WEIGHT_MAX - WEIGHT_MIN);
      const lineCol = colA.clone().lerp(new THREE.Color(0xffffff), 0.35 * wf);

      colors[idx + 0] = lineCol.r; colors[idx + 1] = lineCol.g; colors[idx + 2] = lineCol.b;
      colors[idx + 3] = lineCol.r; colors[idx + 4] = lineCol.g; colors[idx + 5] = lineCol.b;
    }

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: LINE_ALPHA,
      depthWrite: false,
      blending: USE_ADDITIVE_FOR_LINES ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const lines = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(lines);
  }

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

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    resizeRendererToDisplaySize();
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
});
