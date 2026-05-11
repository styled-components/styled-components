// Set NODE_ENV to production so benchmarks reflect real-world performance.
process.env.NODE_ENV = 'production';

// Optional: reduce work if the suite times out (see `SC_BENCH_*` in bench-utils.ts).
// Example: `SC_BENCH_ITER_SCALE=0.2 SC_BENCH_RUNS=3 pnpm --filter styled-components bench:web`
