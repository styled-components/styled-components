/**
 * The MIT License (MIT)
 * Copyright (c) 2017 Paul Armstrong
 * https://github.com/paularmstrong/react-component-benchmark
 */

/* global $Values */
/**
 * @flow
 */
import React from 'react';
import { getMean, getMedian, getStdDev } from './math';
import * as Timing from './timing';

export const BenchmarkType = {
  MOUNT: 'mount',
  UPDATE: 'update',
  UNMOUNT: 'unmount',
};

const shouldRender = (cycle, type) => {
  switch (type) {
    // Render every odd iteration (first, third, etc)
    // Mounts and unmounts the component
    case BenchmarkType.MOUNT:
    case BenchmarkType.UNMOUNT:
      return !((cycle + 1) % 2);
    // Render every iteration (updates previously rendered module)
    case BenchmarkType.UPDATE:
      return true;
    default:
      return false;
  }
};

const shouldRecord = (cycle, type) => {
  switch (type) {
    // Record every odd iteration (when mounted: first, third, etc)
    case BenchmarkType.MOUNT:
      return !((cycle + 1) % 2);
    // Record every iteration
    case BenchmarkType.UPDATE:
      return true;
    // Record every even iteration (when unmounted)
    case BenchmarkType.UNMOUNT:
      return !(cycle % 2);
    default:
      return false;
  }
};

const isDone = (cycle, sampleCount, type) => {
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

const sortNumbers = (a, b) => a - b;

/**
 * Benchmark
 * TODO: documentation
 */
export default class Benchmark extends React.Component {
  static displayName = 'Benchmark';

  static defaultProps = {
    sampleCount: 50,
    timeout: 10000, // 10 seconds
    type: BenchmarkType.MOUNT,
  };

  static Type = BenchmarkType;

  constructor(props, context) {
    super(props, context);

    const cycle = 0;
    const componentProps = props.getComponentProps({ cycle });
    this.state = {
      componentProps,
      cycle,
      running: false,
      _lastGetComponentProps: props.getComponentProps,
    };
    this._startTime = 0;
    this._samples = [];
    /** After a self-timed run finishes, keep rendering so the case can show
     *  its own report until App replaces this Benchmark instance. */
    this._selfTimedDone = false;
  }

  // Replaces the deprecated `componentWillReceiveProps` lifecycle. Recomputes
  // componentProps when the parent passes a new `getComponentProps`.
  static getDerivedStateFromProps(nextProps, prevState) {
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

  componentDidUpdate(_prevProps, prevState) {
    if (this.state.running && !prevState.running) {
      this._startTime = Timing.now();
    }

    // Self-timed components own their run loop and signal completion through
    // onBenchmarkComplete; the cycle machinery cannot see their work.
    if (this.props.selfTimed) return;

    const { forceLayout, sampleCount, timeout, type } = this.props;
    const { cycle, running } = this.state;

    if (running && shouldRecord(cycle, type)) {
      this._samples[cycle].scriptingEnd = Timing.now();

      // force style recalc that would otherwise happen before the next frame
      if (forceLayout) {
        this._samples[cycle].layoutStart = Timing.now();
        if (document.body) {
          document.body.offsetWidth;
        }
        this._samples[cycle].layoutEnd = Timing.now();
      }
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
    if (this._raf) {
      window.cancelAnimationFrame(this._raf);
    }
  }

  /** Cancel a running benchmark. Emits no `onComplete` - the caller is
   *  responsible for restoring app state (status, autoQueue, etc). */
  stop() {
    if (this._raf) {
      window.cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._samples = [];
    this.setState(() => ({ running: false, cycle: 0 }));
  }

  render() {
    const { component: Component, selfTimed, type } = this.props;
    const { componentProps, cycle, running } = this.state;
    if (running && shouldRecord(cycle, type)) {
      this._samples[cycle] = { scriptingStart: Timing.now() };
    }
    if (selfTimed) {
      if (!running && !this._selfTimedDone) return null;
      return (
        <Component
          {...componentProps}
          benchmarkRunning={running}
          onBenchmarkComplete={this._handleSelfComplete}
        />
      );
    }
    if (!(running && shouldRender(cycle, type))) return null;
    return <Component {...componentProps} />;
  }

  start() {
    this._samples = [];
    this._selfTimedDone = false;
    this.setState(() => ({ running: true, cycle: 0 }));
  }

  _handleCycleComplete() {
    const { getComponentProps, type } = this.props;
    const { cycle } = this.state;

    let componentProps;
    if (getComponentProps) {
      // Calculate the component props outside of the time recording (render)
      // so that it doesn't skew results
      componentProps = getComponentProps({ cycle });
      // make sure props always change for update tests
      if (type === BenchmarkType.UPDATE) {
        componentProps['data-test'] = cycle;
      }
    }

    this._raf = window.requestAnimationFrame(() => {
      this.setState(state => ({
        cycle: state.cycle + 1,
        componentProps,
      }));
    });
  }

  getSamples() {
    return this._samples.reduce(
      (memo, { scriptingStart, scriptingEnd, layoutStart, layoutEnd }) => {
        memo.push({
          start: scriptingStart,
          end: layoutEnd || scriptingEnd || 0,
          scriptingStart,
          scriptingEnd: scriptingEnd || 0,
          layoutStart,
          layoutEnd,
        });
        return memo;
      },
      []
    );
  }

  _handleSelfComplete = payload => {
    this._selfTimedDone = true;
    this._handleComplete(Timing.now(), payload);
  };

  _handleComplete(endTime, payload) {
    const { onComplete } = this.props;
    const samples = this.getSamples();

    this.setState(() => ({ running: false, cycle: 0 }));

    const runTime = endTime - this._startTime;

    if (payload) {
      // Self-timed: the component measured its own workload; surface its
      // duration and sample count rather than per-cycle statistics.
      onComplete({
        startTime: this._startTime,
        endTime,
        runTime,
        sampleCount: payload.inputCount,
        samples: [],
        max: runTime,
        min: runTime,
        median: runTime,
        mean: runTime,
        stdDev: 0,
        meanLayout: 0,
        meanScripting: payload.durationMs,
      });
      return;
    }

    const sortedElapsedTimes = samples.map(({ start, end }) => end - start).sort(sortNumbers);
    const sortedScriptingElapsedTimes = samples
      .map(({ scriptingStart, scriptingEnd }) => scriptingEnd - scriptingStart)
      .sort(sortNumbers);
    const sortedLayoutElapsedTimes = samples
      .map(({ layoutStart, layoutEnd }) => (layoutEnd || 0) - (layoutStart || 0))
      .sort(sortNumbers);

    onComplete({
      startTime: this._startTime,
      endTime,
      runTime,
      sampleCount: samples.length,
      samples: samples,
      max: sortedElapsedTimes[sortedElapsedTimes.length - 1],
      min: sortedElapsedTimes[0],
      median: getMedian(sortedElapsedTimes),
      mean: getMean(sortedElapsedTimes),
      stdDev: getStdDev(sortedElapsedTimes),
      meanLayout: getMean(sortedLayoutElapsedTimes),
      meanScripting: getMean(sortedScriptingElapsedTimes),
    });
  }
}
