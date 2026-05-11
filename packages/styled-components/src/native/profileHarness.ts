/**
 * Shared microbench harness for the native profile entry points
 * (`profile-pipeline.ts`, `profile-animation.ts`, `profile-color-polyfill.ts`).
 *
 * MAD/median × 1.4826 is robust dispersion (≈σ for normal samples) so a
 * single GC stall doesn't blow up the spread reading the way peak-to-peak
 * does. Mirrors the bench-utils.ts statistic.
 */

interface BenchOptions {
  /** Column for median latency. `ms` matches the pipeline harness; `ns` matches
   *  the per-op harnesses where iteration counts are large. */
  format?: 'ms' | 'ns';
  /** Width for the name column. */
  pad?: number;
}

export function bench(
  name: string,
  iters: number,
  fn: (i?: number) => void,
  opts: BenchOptions = {}
): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  if (typeof g.gc === 'function') g.gc();
  // Warmup mirrors measurement shape so V8 tiers up before sampling.
  const warm = Math.min(Math.max(Math.floor(iters / 10), 100), 5000);
  for (let i = 0; i < warm; i++) fn();
  const samples: number[] = [];
  const RUNS = 7;
  for (let r = 0; r < RUNS; r++) {
    if (typeof g.gc === 'function') g.gc();
    const t0 = performance.now();
    for (let i = 0; i < iters; i++) fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(RUNS / 2)];
  const ops = (iters / median) * 1000;
  const fmt =
    ops >= 1e6
      ? (ops / 1e6).toFixed(2) + 'M/s'
      : ops >= 1e3
        ? (ops / 1e3).toFixed(1) + 'K/s'
        : ops.toFixed(0) + '/s';
  const deviations = samples.map(s => Math.abs(s - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(RUNS / 2)];
  const spread = ((mad * 1.4826 * 100) / median).toFixed(0);
  const pad = opts.pad ?? 54;
  const col =
    opts.format === 'ns'
      ? `${((median * 1_000_000) / iters).toFixed(0).padStart(7)}ns`
      : `${median.toFixed(2).padStart(8)}ms`;
  console.log(`  ${name.padEnd(pad)} ${col}  ${fmt.padStart(10)}  ±${spread}%`);
  return median;
}
