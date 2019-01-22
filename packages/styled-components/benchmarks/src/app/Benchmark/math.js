// @flow
type ValuesType = Array<number>;

export const getStdDev = (values: ValuesType): number => {
  const avg = getMean(values);

  const squareDiffs = values.map((value: number) => {
    const diff = value - avg;
    return diff * diff;
  });

  return Math.sqrt(getMean(squareDiffs));
};

export const getMean = (values: ValuesType): number => {
  const sum = values.reduce((sum: number, value: number) => sum + value, 0);
  return sum / values.length;
};

export const getMedian = (values: ValuesType): number => {
  if (values.length === 1) {
    return values[0];
  }

  const numbers = values.sort((a: number, b: number) => a - b);
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
};
