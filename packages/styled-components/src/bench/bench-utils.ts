import { performance } from 'perf_hooks';

const gc = typeof globalThis.gc === 'function' ? globalThis.gc : null;

export interface BenchOptions {
  runs?: number;
  nameWidth?: number;
  precision?: number;
  warmupMax?: number;
  beforeIteration?: () => void;
}

export function bench(
  name: string,
  iterations: number,
  fn: (i: number) => void,
  options: BenchOptions = {}
): number {
  const { runs = 5, nameWidth = 55, precision = 1, warmupMax = 1000, beforeIteration } = options;

  if (gc) gc();

  const warmup = Math.min(Math.max(iterations / 10, 10), warmupMax);
  for (let i = 0; i < warmup; i++) {
    if (beforeIteration) beforeIteration();
    fn(i);
  }

  const samples: number[] = [];
  for (let run = 0; run < runs; run++) {
    if (gc) gc();
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      if (beforeIteration) beforeIteration();
      fn(i);
    }
    samples.push(performance.now() - t0);
  }

  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(runs / 2)];
  const ops = (iterations / median) * 1000;
  const opsStr =
    ops >= 1e6
      ? (ops / 1e6).toFixed(1) + 'M/s'
      : ops >= 1e3
        ? (ops / 1e3).toFixed(1) + 'K/s'
        : ops.toFixed(0) + '/s';
  const spread = (((samples[runs - 1] - samples[0]) / median) * 100).toFixed(0);
  console.log(
    `  ${name.padEnd(nameWidth)} ${median.toFixed(precision).padStart(6 + precision)}ms  ${opsStr.padStart(10)}  ±${spread}%`
  );
  return median;
}

export const COLORS = [
  '#e63946',
  '#f1faee',
  '#a8dadc',
  '#457b9d',
  '#1d3557',
  '#264653',
  '#2a9d8f',
  '#e9c46a',
  '#f4a261',
  '#e76f51',
  '#606c38',
  '#283618',
  '#fefae0',
  '#dda15e',
  '#bc6c25',
  '#cdb4db',
  '#ffc8dd',
  '#ffafcc',
  '#bde0fe',
  '#a2d2ff',
  '#d8e2dc',
  '#ffe5d9',
  '#ffcad4',
  '#f4acb7',
  '#9d8189',
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
];
