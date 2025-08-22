import { Neuron } from './Neuron';
import { Connection } from './Connection';

export class Brain {
  // 3D grid structure for direct addressing
  neurons: Neuron[][][] = [];
  // Flat collections for fast iteration
  allNeurons: Neuron[] = [];
  allConnections: Connection[] = [];

  // Track bounds to compute center
  private minX = Number.POSITIVE_INFINITY;
  private minY = Number.POSITIVE_INFINITY;
  private minZ = Number.POSITIVE_INFINITY;
  private maxX = Number.NEGATIVE_INFINITY;
  private maxY = Number.NEGATIVE_INFINITY;
  private maxZ = Number.NEGATIVE_INFINITY;

  addNeuron(x: number, y: number, z: number): Neuron {
    if (!this.neurons[x]) this.neurons[x] = [] as any;
    if (!this.neurons[x][y]) this.neurons[x][y] = [] as any;

    const n = new Neuron(x, y, z);
    this.neurons[x][y][z] = n;
    this.allNeurons.push(n);

    // update bounds
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (z < this.minZ) this.minZ = z;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
    if (z > this.maxZ) this.maxZ = z;

    return n;
  }

  getCenter(): { cx: number; cy: number; cz: number } {
    const cx = (this.minX + this.maxX) / 2;
    const cy = (this.minY + this.maxY) / 2;
    const cz = (this.minZ + this.maxZ) / 2;
    return { cx, cy, cz };
  }

  // Connect each neuron to neighbors within a grid-radius using 26-neighborhood by default (radius ~ 1.75)
  connectLocalNeighbors(radius = Math.SQRT2 + 0.75) {
    const r2 = radius * radius;
    const directions: [number, number, number][] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 <= r2) directions.push([dx, dy, dz]);
        }
      }
    }

    const connections: Connection[] = [];

    for (const n of this.allNeurons) {
      for (const [dx, dy, dz] of directions) {
        const tx = n.x + dx;
        const ty = n.y + dy;
        const tz = n.z + dz;
        const t = this.neurons?.[tx]?.[ty]?.[tz];
        if (!t) continue;
        // create unique undirected edge only once using lexicographic order
        if (this._lessOrEqual(n, t)) {
          const dist = Math.hypot(dx, dy, dz);
          n.connectTo(t, dist);
          connections.push(new Connection(n, t, dist));
        }
      }
    }

    this.allConnections = connections;
  }

  // Find shortest path using Dijkstra's algorithm. Returns the sequence of connections forming the path.
  // If no path exists, returns an empty array.
  findShortestPath(start: Neuron, goal: Neuron): Connection[] {
    if (start === goal) return [];

    const dist = new Map<Neuron, number>();
    const visited = new Set<Neuron>();
    const prevConn = new Map<Neuron, Connection | null>();

    for (const n of this.allNeurons) {
      dist.set(n, Infinity);
      prevConn.set(n, null);
    }
    dist.set(start, 0);

    while (true) {
      // Select unvisited node with smallest distance
      let u: Neuron | null = null;
      let min = Infinity;
      for (const [n, d] of dist) {
        if (visited.has(n)) continue;
        if (d < min) { min = d; u = n; }
      }

      if (!u || min === Infinity) break; // remaining nodes are unreachable
      if (u === goal) break; // reached target with shortest distance

      visited.add(u);

      // Relax edges
      for (const c of u.connections) {
        const v = c.target;
        if (visited.has(v)) continue;
        const alt = min + c.distance;
        if (alt < (dist.get(v) ?? Infinity)) {
          dist.set(v, alt);
          prevConn.set(v, c);
        }
      }
    }

    // Reconstruct path from goal back to start
    const path: Connection[] = [];
    let cur: Neuron | null = goal;

    // If goal is unreachable, prevConn for goal will be null (unless start===goal handled above)
    if ((prevConn.get(cur) ?? null) === null) return [];

    while (cur && cur !== start) {
      const c = prevConn.get(cur) || null;
      if (!c) break;
      path.push(c);
      cur = c.source;
    }

    if (!cur || cur !== start) return [];

    path.reverse();
    return path;
  }

  private _lessOrEqual(a: Neuron, b: Neuron) {
    if (a.x !== b.x) return a.x < b.x;
    if (a.y !== b.y) return a.y < b.y;
    return a.z <= b.z;
  }
}
