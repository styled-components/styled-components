/**
 * Adapted from packages/benchmarks/src/app/Benchmark for React Native.
 * Original (web): The MIT License — Copyright (c) 2017 Paul Armstrong
 * https://github.com/paularmstrong/react-component-benchmark
 *
 * Differences from the web version:
 * - No `forceLayout` (no synchronous DOM read on native).
 * - Uses RN-global performance.now()/requestAnimationFrame (no `window`).
 * - TypeScript instead of Flow.
 */
import React from 'react';
import { NativeModules } from 'react-native';
import { getIQR, getMean, getMedian, getStdDev, getTrimmedMean } from './math';
import * as Timing from './timing';

// HermesInternal.gc() forces a major GC. Calling it before every recorded
// sample is too aggressive (it costs ms each), but calling it once before
// the run starts (after warmup) and once between case changes pushes
// stop-the-world pauses out of the measurement window.
declare const HermesInternal: { gc?: () => void } | undefined;

interface SCProfilerNative {
  enable(): boolean;
  disable(): boolean;
  dumpToFile(fileName: string): string;
}
const SCProfiler: SCProfilerNative | undefined = NativeModules.SCProfiler;

export const forceGc = (): boolean => {
  try {
    if (typeof HermesInternal !== 'undefined' && typeof HermesInternal?.gc === 'function') {
      HermesInternal.gc();
      return true;
    }
  } catch {}
  return false;
};

// Toggles the Hermes sampling profiler via the SCProfiler native module
// (defined in ios/iosbench/SCProfiler.{h,mm}). Hermes's profiler API is
// pure-virtual on HermesRuntime, not exposed via HermesInternal in modern
// builds, so we route through the bridge.
export const startProfile = (): boolean => {
  try {
    return SCProfiler?.enable() === true;
  } catch {
    return false;
  }
};

// Stops the profiler and writes the trace to `fileName`, resolved against
// the app's Documents directory. Returns the absolute file path on the
// simulator filesystem, which the host driver pulls out via
// `xcrun simctl get_app_container booted <bundle> data`.
export const stopProfile = (fileName: string): { path?: string; ok: boolean } => {
  try {
    if (!SCProfiler) return { ok: false };
    const path = SCProfiler.dumpToFile(fileName);
    SCProfiler.disable();
    return { ok: typeof path === 'string' && path.length > 0, path: path || undefined };
  } catch {
    return { ok: false };
  }
};

export const BenchmarkType = {
  MOUNT: 'mount',
  UPDATE: 'update',
  UNMOUNT: 'unmount',
} as const;

export type BenchmarkTypeValue = (typeof BenchmarkType)[keyof typeof BenchmarkType];

interface Sample {
  scriptingStart: number;
  scriptingEnd?: number;
}

export interface BenchmarkResult {
  startTime: number;
  endTime: number;
  runTime: number;
  sampleCount: number;
  warmupCount: number;
  samples: Array<{ start: number; end: number; scriptingStart: number; scriptingEnd: number }>;
  max: number;
  min: number;
  median: number;
  mean: number;
  trimmedMean: number; // 5% trimmed each side, robust to GC spikes
  iqr: number;
  stdDev: number;
  meanScripting: number;
}

export interface BenchmarkProps {
  component: React.ComponentType<any>;
  getComponentProps: (info: { cycle: number }) => Record<string, any>;
  onComplete: (result: BenchmarkResult) => void;
  sampleCount?: number;
  /** Override warmup count. Default mirrors `bench-utils.ts`:
   * `min(max(sampleCount / 10, 10), 1000)`. */
  warmupSamples?: number;
  timeout?: number;
  type?: BenchmarkTypeValue;
}

const computeWarmup = (sampleCount: number): number =>
  Math.min(Math.max(Math.floor(sampleCount / 10), 10), 1000);

interface State {
  componentProps: Record<string, any>;
  cycle: number;
  running: boolean;
  _lastGetComponentProps: BenchmarkProps['getComponentProps'];
}

const shouldRender = (cycle: number, type: BenchmarkTypeValue) => {
  switch (type) {
    case BenchmarkType.MOUNT:
    case BenchmarkType.UNMOUNT:
      return !((cycle + 1) % 2);
    case BenchmarkType.UPDATE:
      return true;
    default:
      return false;
  }
};

const shouldRecord = (cycle: number, type: BenchmarkTypeValue) => {
  switch (type) {
    case BenchmarkType.MOUNT:
      return !((cycle + 1) % 2);
    case BenchmarkType.UPDATE:
      return true;
    case BenchmarkType.UNMOUNT:
      return !(cycle % 2);
    default:
      return false;
  }
};

const isDone = (cycle: number, sampleCount: number, type: BenchmarkTypeValue) => {
  switch (type) {
    case BenchmarkType.MOUNT:
      return cycle >= sampleCount * 2 - 1;
    case BenchmarkType.UPDATE:
      return cycle >= sampleCount - 1;
    case BenchmarkType.UNMOUNT:
      return cycle >= sampleCount * 2;
    default:
      return true;
  }
};

const sortNumbers = (a: number, b: number) => a - b;

export default class Benchmark extends React.Component<BenchmarkProps, State> {
  static displayName = 'Benchmark';
  static defaultProps = {
    sampleCount: 500,
    timeout: 60000,
    type: BenchmarkType.MOUNT,
  };
  static Type = BenchmarkType;

  private _startTime = 0;
  private _samples: Sample[] = [];
  private _raf: number | null = null;

  constructor(props: BenchmarkProps) {
    super(props);
    const cycle = 0;
    this.state = {
      componentProps: props.getComponentProps({ cycle }),
      cycle,
      running: false,
      _lastGetComponentProps: props.getComponentProps,
    };
  }

  static getDerivedStateFromProps(nextProps: BenchmarkProps, prevState: State): Partial<State> | null {
    if (
      nextProps.getComponentProps &&
      nextProps.getComponentProps !== prevState._lastGetComponentProps
    ) {
      return {
        componentProps: nextProps.getComponentProps({ cycle: prevState.cycle }),
        _lastGetComponentProps: nextProps.getComponentProps,
      };
    }
    return null;
  }

  componentDidUpdate(_prevProps: BenchmarkProps, prevState: State) {
    if (this.state.running && !prevState.running) {
      this._startTime = Timing.now();
    }

    const { sampleCount = 50, timeout = 10000, type = BenchmarkType.MOUNT } = this.props;
    const { cycle, running } = this.state;

    if (running && shouldRecord(cycle, type)) {
      this._samples[cycle].scriptingEnd = Timing.now();
    }

    if (running) {
      const now = Timing.now();
      if (!isDone(cycle, sampleCount, type) && now - this._startTime < timeout) {
        this._handleCycleComplete();
      } else {
        this._handleComplete(now);
      }
    }
  }

  componentWillUnmount() {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
    }
  }

  stop() {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._samples = [];
    this.setState({ running: false, cycle: 0 });
  }

  start() {
    this._samples = [];
    this.setState({ running: true, cycle: 0 });
  }

  render() {
    const { component: Component, type = BenchmarkType.MOUNT } = this.props;
    const { componentProps, cycle, running } = this.state;
    if (running && shouldRecord(cycle, type)) {
      this._samples[cycle] = { scriptingStart: Timing.now() };
    }
    return running && shouldRender(cycle, type) ? <Component {...componentProps} /> : null;
  }

  private _handleCycleComplete() {
    const { getComponentProps, type = BenchmarkType.MOUNT } = this.props;
    const { cycle } = this.state;

    const componentProps = getComponentProps({ cycle });
    if (type === BenchmarkType.UPDATE) {
      componentProps['data-test'] = cycle;
    }

    this._raf = requestAnimationFrame(() => {
      this.setState((state) => ({
        cycle: state.cycle + 1,
        componentProps,
      }));
    });
  }

  private _handleComplete(endTime: number) {
    const { onComplete, sampleCount = 500, warmupSamples } = this.props;
    // _samples is sparse (MOUNT records only on odd cycles, UNMOUNT on even).
    // Densify before computing stats so getMean/getMedian/min/max are correct.
    const dense: Sample[] = [];
    for (let i = 0; i < this._samples.length; i++) {
      const s = this._samples[i];
      if (s !== undefined && s.scriptingEnd !== undefined) dense.push(s);
    }

    // Drop warmup samples — JIT/IC stabilization, dispatch table warmup,
    // first-mount allocation cost. Default mirrors `bench-utils.ts` web rule:
    // `min(max(sampleCount / 10, 10), 1000)`. For sampleCount=500 that's 50.
    const warmup = warmupSamples ?? computeWarmup(sampleCount);
    const usable = dense.slice(Math.min(warmup, Math.max(0, dense.length - 1)));

    const samples = usable.map(({ scriptingStart, scriptingEnd }) => ({
      start: scriptingStart,
      end: scriptingEnd ?? 0,
      scriptingStart,
      scriptingEnd: scriptingEnd ?? 0,
    }));

    this.setState({ running: false, cycle: 0 });

    const runTime = endTime - this._startTime;
    const sortedElapsed = samples.map(({ start, end }) => end - start).sort(sortNumbers);
    const sortedScripting = samples
      .map(({ scriptingStart, scriptingEnd }) => scriptingEnd - scriptingStart)
      .sort(sortNumbers);

    onComplete({
      startTime: this._startTime,
      endTime,
      runTime,
      sampleCount: samples.length,
      warmupCount: dense.length - samples.length,
      samples,
      max: sortedElapsed[sortedElapsed.length - 1] ?? 0,
      min: sortedElapsed[0] ?? 0,
      median: getMedian(sortedElapsed),
      mean: getMean(sortedElapsed),
      trimmedMean: getTrimmedMean(sortedElapsed, 0.05),
      iqr: getIQR(sortedElapsed),
      stdDev: getStdDev(sortedElapsed),
      meanScripting: getMean(sortedScripting),
    });
  }
}
