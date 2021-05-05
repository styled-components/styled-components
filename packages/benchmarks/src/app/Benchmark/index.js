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
    };
    this._startTime = 0;
    this._samples = [];
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps) {
      this.setState(state => ({ componentProps: nextProps.getComponentProps(state.cycle) }));
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextState.running && !this.state.running) {
      this._startTime = Timing.now();
    }
  }

  componentDidUpdate() {
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

  render() {
    const { component: Component, type } = this.props;
    const { componentProps, cycle, running } = this.state;
    if (running && shouldRecord(cycle, type)) {
      this._samples[cycle] = { scriptingStart: Timing.now() };
    }
    return running && shouldRender(cycle, type) ? <Component {...componentProps} /> : null;
  }

  start() {
    this._samples = [];
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

  _handleComplete(endTime) {
    const { onComplete } = this.props;
    const samples = this.getSamples();

    this.setState(() => ({ running: false, cycle: 0 }));

    const runTime = endTime - this._startTime;
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
