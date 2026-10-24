# ios-benchmark

Bare React Native (Hermes V1, New Architecture) app for benchmarking styled-components v7 against v6 and a vanilla `StyleSheet.create` baseline on the iOS simulator. Mirrors the architecture of `packages/benchmarks` (web) so deltas are comparable.

## Setup

First run only:

```sh
pnpm --filter ios-benchmark pods   # CocoaPods install (~2-5 min)
```

## Run

Build the library, then build, install on the iPhone 17 simulator, and launch in Release:

```sh
pnpm --filter styled-components build
pnpm --filter ios-benchmark exec react-native run-ios --mode Release --simulator 'iPhone 17'
```

A Release build bakes the JavaScript bundle into the app as Hermes bytecode, so editing the benchmark source or rebuilding the library does not change what the installed app measures. Rerun both commands above after any JavaScript change before taking new numbers.

Once the app is on the sim, drive runs from inside the package directory:

```sh
# combined: vanilla + v7 + v6, all cases
node scripts/run-bench.mjs --tag combined

# v7 only (cross-poisoning check)
node scripts/run-bench.mjs --tag v7-only --libs styled-components-native

# v6 only
node scripts/run-bench.mjs --tag v6-only --libs styled-components-native-v6

# Profile a specific library on specific cases (Hermes sampling profiler)
BENCH_PROFILE=1 BENCH_PROFILE_CASES='Parent rerender (200 children),Parent rerender (1000 children)' \
  node scripts/run-bench.mjs --tag v7-profile --libs styled-components-native
```

The driver spins up an HTTP receiver on `127.0.0.1:9999`, terminates and relaunches the app, the app fetches `/run-config`, runs the queued jobs, and POSTs results back. Output lands in `.bench-results/` (gitignored). With `BENCH_PROFILE=1`, the receiver saves each `.cpuprofile` under `.bench-results/profiles/`.

## Inspect results

```sh
# pretty-print the latest results JSON
node scripts/format-report.mjs

# print the top self-time frames of a profile
node scripts/analyze-profile.mjs .bench-results/profiles/<name>.cpuprofile --top 12
```

## Layout

```
src/
├── app/
│   ├── App.tsx              runner UI: case + library picker, Run / Run-all, results
│   └── Benchmark/           class-based runner (warmup, gc, trimmed mean, IQR)
├── cases/                   Tree, ParentRerender - parameterized by Box/Wrapper
├── implementations/
│   ├── vanilla-stylesheet/  raw RN <View> + StyleSheet.create (baseline)
│   ├── styled-components-native/      workspace v7
│   └── styled-components-native-v6/   npm 6.4.1
├── impl.ts                  registry
└── tests.ts                 case configs
ios/                         RN-generated native project (build output gitignored)
scripts/
├── run-bench.mjs            driver - orchestrates one pass
├── bench-receiver.mjs       HTTP receiver, writes results-*.json
├── format-report.mjs        pretty-prints captured results
└── add-native-files.mjs     adds SCProfiler.{h,mm} to the Xcode project
ios/iosbench/
├── SCProfiler.h/.mm         native module bridging Hermes sampling profiler to JS
```

## Variance characterization

Numbers from this hardware are NOT representative of real device - Mac silicon executes the simulator JS faster than an iPhone CPU does. Only **relative** v7-vs-v6-vs-vanilla deltas are meaningful here.

After Release-mode tuning (warmup samples = 10% of sampleCount, `HermesInternal.gc()` between cases, `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD` profile toggle), Mount-case stddev is sub-millisecond on a 25-35 ms baseline, parent-rerender stddev sits in the 1-2 ms range.

## When to reach for this

Use the iOS bench when v7-vs-v6 deltas in the web bench are inconclusive (RN-web pays a different style→className tax than real RN), when investigating Hermes-specific perf characteristics, or when the question is "does the styled-components tax show up in actual RN render commits". The parser, responsive, and RSC microbenchmarks under `packages/styled-components/src/bench/` (`pnpm --filter styled-components bench`) give absolute timings for those layers without React's commit cycle.
