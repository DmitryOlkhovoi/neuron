import { Brain } from './Brain';

// Build a 10 x 10 x 10 grid of neurons
const brain = new Brain();
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    for (let z = 0; z < 10; z++) {
      brain.addNeuron(x, y, z);
    }
  }
}


// Create local connections (26-neighborhood). Toggle drawing via DRAW_CONNECTIONS below.
// brain.connectLocalNeighbors();

for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    for (let z = 0; z < 10; z++) {
        if (brain.neurons[x][y][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x][y][z + 1], 10); // connect to next layer neuron
        }

        if (brain.neurons[x - 1] &&  brain.neurons[x - 1][y] && brain.neurons[x - 1][y][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y][z + 1], 10); // connect to next layer neuron
        }

        if (brain.neurons[x + 1] &&  brain.neurons[x + 1][y] && brain.neurons[x + 1][y][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y][z + 1], 10); // connect to next layer neuron
        }

        //

        if (brain.neurons[x][y + 1] && brain.neurons[x][y + 1][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x][y + 1][z + 1], 10); // connect to next layer neuron
        }

        if (brain.neurons[x - 1] &&  brain.neurons[x - 1][y + 1] && brain.neurons[x - 1][y + 1][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y + 1][z + 1], 10); // connect to next layer neuron
        }

        if (brain.neurons[x + 1] &&  brain.neurons[x + 1][y + 1] && brain.neurons[x + 1][y + 1][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y + 1][z + 1], 10); // connect to next layer neuron
        }

        //

        if (brain.neurons[x][y - 1] && brain.neurons[x][y - 1][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x][y - 1][z + 1], 10); // connect to next layer neuron
        }

        if (brain.neurons[x - 1] &&  brain.neurons[x - 1][y - 1] && brain.neurons[x - 1][y - 1][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x - 1][y - 1][z + 1], 10); // connect to next layer neuron
        }

        if (brain.neurons[x + 1] &&  brain.neurons[x + 1][y - 1] && brain.neurons[x + 1][y - 1][z + 1]) {
            brain.neurons[x][y][z].connectTo(brain.neurons[x + 1][y - 1][z + 1], 10); // connect to next layer neuron
        }
    }
  }
}

console.log(brain.findShortestPath(brain.neurons[0][0][1], brain.neurons[5][5][9]))


// Compute weight range from connections (distance acts as weight)
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

// Identify input/output layers and grid extents
const Z_MIN = Math.min(...brain.allNeurons.map(n => n.z));
const Z_MAX = Math.max(...brain.allNeurons.map(n => n.z));
const X_MIN = Math.min(...brain.allNeurons.map(n => n.x));
const X_MAX = Math.max(...brain.allNeurons.map(n => n.x));
const Y_MIN = Math.min(...brain.allNeurons.map(n => n.y));
const Y_MAX = Math.max(...brain.allNeurons.map(n => n.y));

// Rendering configuration
const DRAW_CONNECTIONS = true; // render connections based on neuron.connections
const NODE_BASE_RADIUS = 1.5;
const NODE_MAX_RADIUS = 3.5;
const LINE_ALPHA = 0.08; // translucency for edges
const GRID_SPACING = 15; // world-space distance between neighboring nodes (increase to spread out)
const LINE_WIDTH_MIN = 2; // min stroke width for weakest weight
const LINE_WIDTH_MAX = 10; // max stroke width for strongest weight

// Simple 3D -> 2D projection with rotation (camera orbit)
function project(
  x: number,
  y: number,
  z: number,
  pitch: number, // rotation around X
  yaw: number,   // rotation around Y
  scale: number,
  cameraDist: number,
  cx: number,
  cy: number,
  cz: number
) {
  // translate to center, then apply grid spacing
  let dx = (x - cx) * GRID_SPACING;
  let dy = (y - cy) * GRID_SPACING;
  let dz = (z - cz) * GRID_SPACING;

  // rotate around Y (yaw)
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  let xr = dx * cosY - dz * sinY;
  let zr = dx * sinY + dz * cosY;

  // rotate around X (pitch)
  const cosX = Math.cos(pitch);
  const sinX = Math.sin(pitch);
  let yr = dy * cosX - zr * sinX;
  let zr2 = dy * sinX + zr * cosX;

  // perspective projection
  const f = scale / (zr2 + cameraDist);
  const sx = xr * f;
  const sy = yr * f;
  return { sx, sy, depth: zr2 };
}

window.onload = () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get canvas context');
    return;
  }

  // Handle HiDPI and resize to fill viewport
  let cssW = 0;
  let cssH = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  let { cx, cy, cz } = brain.getCenter();

  // Camera state (orbit)
  let yaw = 0.6;     // around Y axis
  let pitch = 0.3;   // around X axis
  let cameraDist = 28; // distance from scene (zoom)

  // Input state
  let dragging = false;
  let dragMode: 'rotate' | 'pan' | null = null;
  let lastX = 0;
  let lastY = 0;
  const keys = new Set<string>();

  const ROTATE_SENS = 0.008; // radians per pixel
  const PITCH_MIN = -Math.PI / 2 + 0.02;
  const PITCH_MAX = Math.PI / 2 - 0.02;
  const DIST_MIN = 10;
  const DIST_MAX = 120;

  // Mouse controls (LMB = rotate, MMB = pan)
  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    dragMode = (e.button === 1) ? 'pan' : 'rotate';
    if (e.button === 1) e.preventDefault(); // prevent auto-scroll on middle mouse
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (dragMode === 'rotate') {
      yaw += dx * ROTATE_SENS;
      pitch -= dy * ROTATE_SENS; // invert so dragging up looks down
      if (pitch < PITCH_MIN) pitch = PITCH_MIN;
      if (pitch > PITCH_MAX) pitch = PITCH_MAX;
    } else if (dragMode === 'pan') {
      // Pan in camera plane using right/up vectors
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const rightX = cosY;
      const rightY = 0;
      const rightZ = -sinY;
      const fwdX = sinY * cosP;
      const fwdY = Math.sin(pitch);
      const fwdZ = cosY * cosP;
      // up = right x forward
      const upX = rightY * fwdZ - rightZ * fwdY;
      const upY = rightZ * fwdX - rightX * fwdZ;
      const upZ = rightX * fwdY - rightY * fwdX;

      const worldPerPixel = (cameraDist / scale) / GRID_SPACING;
      cx += (-dx) * rightX * worldPerPixel + (dy) * upX * worldPerPixel;
      cy += (-dx) * rightY * worldPerPixel + (dy) * upY * worldPerPixel;
      cz += (-dx) * rightZ * worldPerPixel + (dy) * upZ * worldPerPixel;
    }
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    dragMode = null;
  });
  canvas.addEventListener('mouseleave', () => {
    dragging = false;
    dragMode = null;
  });

  // Touch controls (single touch = rotate)
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - lastX;
    const dy = t.clientY - lastY;
    lastX = t.clientX;
    lastY = t.clientY;

    yaw += dx * ROTATE_SENS;
    pitch -= dy * ROTATE_SENS;
    if (pitch < PITCH_MIN) pitch = PITCH_MIN;
    if (pitch > PITCH_MAX) pitch = PITCH_MAX;
  }, { passive: true });
  window.addEventListener('touchend', () => {
    dragging = false;
  }, { passive: true });

  // Wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    // zoom exponentially for smooth feel; deltaY>0 => zoom out
    const factor = Math.exp(e.deltaY * 0.001);
    cameraDist *= factor;
    if (cameraDist < DIST_MIN) cameraDist = DIST_MIN;
    if (cameraDist > DIST_MAX) cameraDist = DIST_MAX;
  }, { passive: false });

  // Keyboard controls (WASD to move, Q/E down/up, Shift = faster)
  const MOVE_SPEED = 1.2; // grid units per second
  const FAST_MULT = 4;

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    // prevent scrolling with space/arrow keys while focused on canvas
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  const scale = 220; // base scaling for 10x10x10 grid

  function drawFrame(now: number) {
    // Time step
    const _last: number | undefined = (drawFrame as any)._last;
    const dt = Math.min(0.05, (_last ? (now - _last) : 0) / 1000);
    (drawFrame as any)._last = now;

    // Keyboard movement (free-fly)
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const fwdX = sinY * cosP;
    const fwdY = Math.sin(pitch);
    const fwdZ = cosY * cosP;
    const rightX = cosY;
    const rightY = 0;
    const rightZ = -sinY;
    // up = right x forward
    const upX = rightY * fwdZ - rightZ * fwdY;
    const upY = rightZ * fwdX - rightX * fwdZ;
    const upZ = rightX * fwdY - rightY * fwdX;

    let moveX = 0, moveY = 0, moveZ = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) { moveX += fwdX; moveY += fwdY; moveZ += fwdZ; }
    if (keys.has('KeyS') || keys.has('ArrowDown')) { moveX -= fwdX; moveY -= fwdY; moveZ -= fwdZ; }
    if (keys.has('KeyD') || keys.has('ArrowRight')) { moveX += rightX; moveY += rightY; moveZ += rightZ; }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) { moveX -= rightX; moveY -= rightY; moveZ -= rightZ; }
    if (keys.has('KeyE') || keys.has('Space')) { moveX += upX; moveY += upY; moveZ += upZ; }
    if (keys.has('KeyQ')) { moveX -= upX; moveY -= upY; moveZ -= upZ; }

    const len = Math.hypot(moveX, moveY, moveZ) || 1;
    const speed = MOVE_SPEED * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? FAST_MULT : 1);
    cx += (moveX / len) * speed * dt;
    cy += (moveY / len) * speed * dt;
    cz += (moveZ / len) * speed * dt;
    // Clear background
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cssW, cssH);

    const halfW = cssW / 2;
    const halfH = cssH / 2;

    // Project all neuron positions
    const projectedArr: Array<{ n: any; x: number; y: number; d: number }> = [];
    const projectedMap = new Map<any, { x: number; y: number; d: number }>();
    let minD = Infinity;
    let maxD = -Infinity;

    for (const n of brain.allNeurons) {
      const { sx, sy, depth: d } = project(
        n.x, n.y, n.z,
        pitch, yaw,
        scale,
        cameraDist,
        cx, cy, cz
      );
      const px = halfW + sx;
      const py = halfH + sy;
      projectedArr.push({ n, x: px, y: py, d });
      projectedMap.set(n, { x: px, y: py, d });
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }

    const depthRange = Math.max(1e-6, maxD - minD);

    // Highlight input/output layers with translucent planes and labels
    {
      // Input layer plane (z = Z_MIN)
      const cornersIn = [
        { x: X_MIN, y: Y_MIN, z: Z_MIN },
        { x: X_MAX, y: Y_MIN, z: Z_MIN },
        { x: X_MAX, y: Y_MAX, z: Z_MIN },
        { x: X_MIN, y: Y_MAX, z: Z_MIN },
      ];
      const projIn = cornersIn.map(p3 => {
        const { sx, sy } = project(p3.x, p3.y, p3.z, pitch, yaw, scale, cameraDist, cx, cy, cz);
        return { x: halfW + sx, y: halfH + sy };
      });
      ctx.beginPath();
      ctx.moveTo(projIn[0].x, projIn[0].y);
      for (let i = 1; i < projIn.length; i++) ctx.lineTo(projIn[i].x, projIn[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 200, 120, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 200, 120, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const centerIn = project((X_MIN + X_MAX) / 2, (Y_MIN + Y_MAX) / 2, Z_MIN, pitch, yaw, scale, cameraDist, cx, cy, cz);
      const labelInX = halfW + centerIn.sx;
      const labelInY = halfH + centerIn.sy;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeText('ВХОД', labelInX, labelInY - 18);
      ctx.fillStyle = 'rgba(0, 200, 120, 1)';
      ctx.fillText('ВХОД', labelInX, labelInY - 18);

      // Output layer plane (z = Z_MAX)
      const cornersOut = [
        { x: X_MIN, y: Y_MIN, z: Z_MAX },
        { x: X_MAX, y: Y_MIN, z: Z_MAX },
        { x: X_MAX, y: Y_MAX, z: Z_MAX },
        { x: X_MIN, y: Y_MAX, z: Z_MAX },
      ];
      const projOut = cornersOut.map(p3 => {
        const { sx, sy } = project(p3.x, p3.y, p3.z, pitch, yaw, scale, cameraDist, cx, cy, cz);
        return { x: halfW + sx, y: halfH + sy };
      });
      ctx.beginPath();
      ctx.moveTo(projOut[0].x, projOut[0].y);
      for (let i = 1; i < projOut.length; i++) ctx.lineTo(projOut[i].x, projOut[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(240, 80, 80, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(240, 80, 80, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const centerOut = project((X_MIN + X_MAX) / 2, (Y_MIN + Y_MAX) / 2, Z_MAX, pitch, yaw, scale, cameraDist, cx, cy, cz);
      const labelOutX = halfW + centerOut.sx;
      const labelOutY = halfH + centerOut.sy;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeText('ВЫХОД', labelOutX, labelOutY + 18);
      ctx.fillStyle = 'rgba(240, 80, 80, 1)';
      ctx.fillText('ВЫХОД', labelOutX, labelOutY + 18);
    }

    // Optionally draw connections first (behind nodes)
    if (DRAW_CONNECTIONS) {
      for (const n of brain.allNeurons) {
        for (const c of n.connections) {
          const a = projectedMap.get(c.source);
          const b = projectedMap.get(c.target);
          if (!a || !b) continue;
          // Depth-based alpha only; distance is treated as weight controlling line width
          const dn = (Math.min(a.d, b.d) - minD) / depthRange; // 0..1 back->front
          const wf = (c.distance - WEIGHT_MIN) / Math.max(1e-6, (WEIGHT_MAX - WEIGHT_MIN)); // 0..1 weight
          const lineW = LINE_WIDTH_MIN + wf * (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
          ctx.lineWidth = lineW;
          const alpha = LINE_ALPHA * (0.5 + 0.5 * (1 - dn));
          ctx.strokeStyle = `rgba(100, 200, 255, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw neurons sorted by depth (back to front)
    const nodes = projectedArr.sort((a, b) => a.d - b.d);
    for (const p of nodes) {
      const dn = (p.d - minD) / depthRange; // 0..1 back->front
      const r = NODE_BASE_RADIUS + (1 - dn) * (NODE_MAX_RADIUS - NODE_BASE_RADIUS);
      const brightness = 60 + Math.floor((1 - dn) * 35); // 60..95

      // Color by role: input (Z_MIN) = green, output (Z_MAX) = red, hidden = cyan-blue
      if (p.n.z === Z_MIN) {
        ctx.fillStyle = `hsl(140, 90%, ${brightness}%)`;
      } else if (p.n.z === Z_MAX) {
        ctx.fillStyle = `hsl(0, 85%, ${brightness}%)`;
      } else {
        ctx.fillStyle = `hsl(190, 90%, ${brightness}%)`;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Outline input/output nodes for extra emphasis
      if (p.n.z === Z_MIN || p.n.z === Z_MAX) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = p.n.z === Z_MIN ? 'hsl(140, 90%, 28%)' : 'hsl(0, 85%, 28%)';
        ctx.stroke();
      }
    }

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
};
