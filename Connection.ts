import type { Neuron } from './Neuron';

export class Connection {
  source: Neuron;
  target: Neuron;
  distance: number;

  constructor(source: Neuron, target: Neuron, distance: number) {
    this.source = source;
    this.target = target;
    this.distance = distance;
  }
}
