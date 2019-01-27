// @flow
// This creates a number array that grows at a fixed size
// It doesn't use .fill() for IE11 support

const GROWTH_RATE = 200;

export const makeBuffer = (): number[] => {
  const buffer = new Array(GROWTH_RATE);
  for (let i = 0; i < GROWTH_RATE; i++) {
    buffer[i] = 0;
  }
  return buffer;
};

export const resizeBuffer = (buffer: number[], index: number) => {
  const { length: oldLength } = buffer;
  if (index >= oldLength) {
    // Calculate the number of chunks needed to fit the given index (rounded)
    const growBy = (index - oldLength) / GROWTH_RATE | 0;
    // Determine new length by adding growth (minimum 1) to the length
    const newLength = oldLength + (growBy <= 0 ? GROWTH_RATE : GROWTH_RATE * growBy);

    buffer.length = newLength;
    for (let i = oldLength; i < newLength; i++) {
      buffer[i] = 0;
    }
  }
};
