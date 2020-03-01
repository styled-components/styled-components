// @flow
/* eslint-disable */

export const SEED = 5381;

// When we have separate strings it's useful to run a progressive
// version of djb2 where we pretend that we're still looping over
// the same string
export const phash = (h: number, x: string): number => {
  let i = x.length;

  while (i) {
    h = (h * 33) ^ x.charCodeAt(--i);
  }

  return h;
};

// This is a djb2 hashing function
export const hash = (x: string): number => {
  return phash(SEED, x);
};
