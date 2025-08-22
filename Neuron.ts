import { Connection } from './Connection';

export class Neuron {
  x: number;
  y: number;
  z: number;
  connections: Connection[];
  value: any;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.connections = [];
  }

  connectTo(target: Neuron, distance: number) {
    const connection = new Connection(this, target, distance);
    this.connections.push(connection);
  }
}
