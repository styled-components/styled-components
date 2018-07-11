// @flow

const NS_PER_MS = 1e6;
const MS_PER_S = 1e3;

// Returns a high resolution time (if possible) in milliseconds
export function now(): number {
  if (window && window.performance) {
    return window.performance.now();
  } else if (process && process.hrtime) {
    const [seconds, nanoseconds] = process.hrtime();
    const secInMS = seconds * MS_PER_S;
    const nSecInMS = nanoseconds / NS_PER_MS;
    return secInMS + nSecInMS;
  } else {
    return Date.now();
  }
}
