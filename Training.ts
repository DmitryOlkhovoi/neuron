import { Brain } from './Brain';
import { Connection } from './Connection';
import { Neuron } from './Neuron';

export interface WeightData {
  sourceX: number;
  sourceY: number;
  sourceZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  weight: number;
}

export interface TrainingData {
  weights: WeightData[];
  metadata: {
    version: string;
    createdAt: string;
    totalTrainingSteps: number;
    learningRate: number;
  };
}

export class Training {
  private brain: Brain;
  private learningRate: number;
  private totalTrainingSteps: number;
  private weightsFile: string;

  constructor(brain: Brain, learningRate = 0.1, weightsFile = 'weights.json') {
    this.brain = brain;
    this.learningRate = learningRate;
    this.totalTrainingSteps = 0;
    this.weightsFile = weightsFile;
  }

  /**
   * Обучение на одном примере
   * @param inputDigit - цифра для входного слоя (0-9)
   * @param expectedOutput - ожидаемый выход (0-9)
   */
  trainOnExample(inputDigit: number, expectedOutput: number): boolean {
    // Найти нейрон с ожидаемым выходом
    const targetNeuron = this.findOutputNeuronByValue(expectedOutput);
    if (!targetNeuron) {
      console.warn(`Target neuron with value ${expectedOutput} not found`);
      return false;
    }

    // Найти все активные входные нейроны
    const activeInputNeurons = this.getActiveInputNeurons();
    if (activeInputNeurons.length === 0) {
      console.warn('No active input neurons found');
      return false;
    }

    // Найти пути от всех активных входов к целевому выходу
    const pathConnections = new Set<Connection>();
    let totalPathDistance = 0;

    for (const inputNeuron of activeInputNeurons) {
      const path = this.brain.findShortestPath(inputNeuron, targetNeuron);
      for (const connection of path) {
        pathConnections.add(connection);
        totalPathDistance += connection.distance;
      }
    }

    if (pathConnections.size === 0) {
      console.warn('No path found from active inputs to target output');
      return false;
    }

    // Уменьшить веса соединений в найденных путях
    const reductionFactor = 1 - this.learningRate;
    for (const connection of pathConnections) {
      connection.distance *= reductionFactor;
      // Минимальный вес для предотвращения нулевых весов
      connection.distance = Math.max(connection.distance, 0.01);
    }

    this.totalTrainingSteps++;

    console.log(`Training step ${this.totalTrainingSteps}: Reduced weights for ${pathConnections.size} connections. Total path distance before: ${totalPathDistance.toFixed(2)}`);

    return true;
  }

  /**
   * Пакетное обучение на нескольких примерах
   * @param examples - массив примеров [inputDigit, expectedOutput]
   * @param epochs - количество эпох обучения
   */
  trainBatch(examples: [number, number][], epochs = 1): void {
    console.log(`Starting batch training: ${examples.length} examples, ${epochs} epochs`);
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      console.log(`Epoch ${epoch + 1}/${epochs}`);
      
      // Перемешать примеры для каждой эпохи
      const shuffledExamples = [...examples].sort(() => Math.random() - 0.5);
      
      for (const [inputDigit, expectedOutput] of shuffledExamples) {
        // Применить входную матрицу
        this.applyInputDigit(inputDigit);
        
        // Обучить на этом примере
        this.trainOnExample(inputDigit, expectedOutput);
      }
    }
    
    console.log(`Batch training completed. Total training steps: ${this.totalTrainingSteps}`);
  }

  /**
   * Сохранить веса в JSON файл
   */
  async saveWeights(): Promise<void> {
    const weights: WeightData[] = [];
    
    // Собрать все веса соединений
    for (const neuron of this.brain.allNeurons) {
      for (const connection of neuron.connections) {
        weights.push({
          sourceX: connection.source.x,
          sourceY: connection.source.y,
          sourceZ: connection.source.z,
          targetX: connection.target.x,
          targetY: connection.target.y,
          targetZ: connection.target.z,
          weight: connection.distance
        });
      }
    }

    const trainingData: TrainingData = {
      weights,
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        totalTrainingSteps: this.totalTrainingSteps,
        learningRate: this.learningRate
      }
    };

    // В браузере используем localStorage или предложим скачать файл
    if (typeof window !== 'undefined') {
      // Сохранить в localStorage
      localStorage.setItem(this.weightsFile, JSON.stringify(trainingData, null, 2));
      
      // Также предложить скачать файл
      const blob = new Blob([JSON.stringify(trainingData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.weightsFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`Weights saved to localStorage and downloaded as ${this.weightsFile}`);
    } else {
      // В Node.js окружении
      const fs = await import('fs');
      fs.writeFileSync(this.weightsFile, JSON.stringify(trainingData, null, 2));
      console.log(`Weights saved to ${this.weightsFile}`);
    }
  }

  /**
   * Загрузить веса из JSON файла
   */
  async loadWeights(): Promise<boolean> {
    try {
      let trainingData: TrainingData;

      if (typeof window !== 'undefined') {
        // В браузере загружаем из localStorage
        const stored = localStorage.getItem(this.weightsFile);
        if (!stored) {
          console.warn(`No weights found in localStorage for key: ${this.weightsFile}`);
          return false;
        }
        trainingData = JSON.parse(stored);
      } else {
        // В Node.js окружении
        const fs = await import('fs');
        if (!fs.existsSync(this.weightsFile)) {
          console.warn(`Weights file not found: ${this.weightsFile}`);
          return false;
        }
        const data = fs.readFileSync(this.weightsFile, 'utf8');
        trainingData = JSON.parse(data);
      }

      // Применить загруженные веса
      const weightMap = new Map<string, number>();
      for (const weightData of trainingData.weights) {
        const key = `${weightData.sourceX},${weightData.sourceY},${weightData.sourceZ}->${weightData.targetX},${weightData.targetY},${weightData.targetZ}`;
        weightMap.set(key, weightData.weight);
      }

      let appliedWeights = 0;
      for (const neuron of this.brain.allNeurons) {
        for (const connection of neuron.connections) {
          const key = `${connection.source.x},${connection.source.y},${connection.source.z}->${connection.target.x},${connection.target.y},${connection.target.z}`;
          const weight = weightMap.get(key);
          if (weight !== undefined) {
            connection.distance = weight;
            appliedWeights++;
          }
        }
      }

      this.totalTrainingSteps = trainingData.metadata.totalTrainingSteps || 0;
      this.learningRate = trainingData.metadata.learningRate || this.learningRate;

      console.log(`Weights loaded successfully. Applied ${appliedWeights} weights. Training steps: ${this.totalTrainingSteps}`);
      return true;
    } catch (error) {
      console.error('Error loading weights:', error);
      return false;
    }
  }

  /**
   * Тестирование точности на наборе примеров
   */
  testAccuracy(testExamples: [number, number][]): number {
    let correct = 0;
    
    for (const [inputDigit, expectedOutput] of testExamples) {
      this.applyInputDigit(inputDigit);
      const predictedOutput = this.predict();
      
      if (predictedOutput === expectedOutput) {
        correct++;
      }
      
      console.log(`Input: ${inputDigit}, Expected: ${expectedOutput}, Predicted: ${predictedOutput}, ${predictedOutput === expectedOutput ? '✓' : '✗'}`);
    }
    
    const accuracy = correct / testExamples.length;
    console.log(`Accuracy: ${correct}/${testExamples.length} = ${(accuracy * 100).toFixed(1)}%`);
    
    return accuracy;
  }

  /**
   * Предсказание для текущего входа
   */
  predict(): number {
    const activeInputNeurons = this.getActiveInputNeurons();
    if (activeInputNeurons.length === 0) {
      return -1;
    }

    // Найти выходной нейрон с минимальным суммарным расстоянием от всех активных входов
    const outputNeurons = this.getAllOutputNeurons();
    let bestOutput = -1;
    let minTotalDistance = Infinity;

    for (const outputNeuron of outputNeurons) {
      let totalDistance = 0;
      let pathsFound = 0;

      for (const inputNeuron of activeInputNeurons) {
        const path = this.brain.findShortestPath(inputNeuron, outputNeuron);
        if (path.length > 0) {
          for (const connection of path) {
            totalDistance += connection.distance;
          }
          pathsFound++;
        }
      }

      if (pathsFound > 0) {
        const avgDistance = totalDistance / pathsFound;
        if (avgDistance < minTotalDistance) {
          minTotalDistance = avgDistance;
          bestOutput = outputNeuron.value;
        }
      }
    }

    return bestOutput;
  }

  private findOutputNeuronByValue(value: number): Neuron | undefined {
    const maxZ = Math.max(...this.brain.allNeurons.map(n => n.z));
    return this.brain.allNeurons.find(n => n.z === maxZ && n.value === value);
  }

  private getActiveInputNeurons(): Neuron[] {
    const minZ = Math.min(...this.brain.allNeurons.map(n => n.z));
    return this.brain.allNeurons.filter(n => n.z === minZ && n.value === true);
  }

  private getAllOutputNeurons(): Neuron[] {
    const maxZ = Math.max(...this.brain.allNeurons.map(n => n.z));
    return this.brain.allNeurons.filter(n => n.z === maxZ && typeof n.value === 'number');
  }

  private applyInputDigit(digit: number): void {
    // Эта функция должна быть реализована аналогично makeDigitMatrix и applyInputMatrix из index.ts
    const matrix = this.makeDigitMatrix(digit);
    this.applyInputMatrix(matrix, 0);
  }

  private makeDigitMatrix(d: number): number[][] {
    const m = Array.from({ length: 10 }, () => Array(10).fill(0));
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
      a: () => hline(y1, x0, x1),
      b: () => vline(x1, ym, y1),
      c: () => vline(x1, y0, ym),
      d: () => hline(y0, x0, x1),
      e: () => vline(x0, y0, ym),
      f: () => vline(x0, ym, y1),
      g: () => hline(ym, x0, x1),
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

  private applyInputMatrix(mat: number[][], z = 0): void {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const n = this.brain.neurons?.[x]?.[y]?.[z];
        if (n) n.value = !!(mat[y]?.[Math.max(0, (mat[y]?.length ?? 10) - 1 - x)]);
      }
    }
  }

  // Геттеры для статистики
  get trainingSteps(): number {
    return this.totalTrainingSteps;
  }

  get currentLearningRate(): number {
    return this.learningRate;
  }

  setLearningRate(rate: number): void {
    this.learningRate = Math.max(0.001, Math.min(1.0, rate));
  }
}