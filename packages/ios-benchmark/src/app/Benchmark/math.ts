export const getStdDev = (values: number[]): number => {
  const avg = getMean(values);
  const squareDiffs = values.map((value) => {
    const diff = value - avg;
    return diff * diff;
  });
  return Math.sqrt(getMean(squareDiffs));
};

export const getMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};

export const getMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const numbers = [...values].sort((a, b) => a - b);
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
};

// Trimmed mean — drop `trim` proportion from each tail (e.g. 0.05 = 5% from
// each side). Robust to GC-pause spikes and other tail outliers without
// throwing away the central tendency information that median collapses.
export const getTrimmedMean = (sortedAsc: number[], trim = 0.05): number => {
  if (sortedAsc.length === 0) return 0;
  const drop = Math.floor(sortedAsc.length * trim);
  const trimmed = sortedAsc.slice(drop, sortedAsc.length - drop);
  return getMean(trimmed);
};

// Inter-quartile range (Q3 - Q1). A robust spread metric.
export const getIQR = (sortedAsc: number[]): number => {
  const n = sortedAsc.length;
  if (n < 4) return 0;
  const q1 = sortedAsc[Math.floor(n * 0.25)];
  const q3 = sortedAsc[Math.floor(n * 0.75)];
  return q3 - q1;
};
