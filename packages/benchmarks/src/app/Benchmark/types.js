/**
 * @flow
 */
export type BenchResultsType = {
  startTime: number,
  endTime: number,
  runTime: number,
  sampleCount: number,
  samples: Array<FullSampleTimingType>,
  max: number,
  min: number,
  median: number,
  mean: number,
  stdDev: number
};

export type SampleTimingType = {
  scriptingStart: number,
  scriptingEnd?: number,
  layoutStart?: number,
  layoutEnd?: number
};

export type FullSampleTimingType = {
  start: number,
  end: number,
  scriptingStart: number,
  scriptingEnd: number,
  layoutStart?: number,
  layoutEnd?: number
};
