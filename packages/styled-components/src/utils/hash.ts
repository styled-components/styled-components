export const SEED = 5381;

// When we have separate strings it's useful to run a progressive
// version of djb2 where we pretend that we're still looping over
// the same string
export const phash = (h: number, x: string) => {
  let i = x.length;

  while (i) {
    h = (h * 33) ^ x.charCodeAt(--i);
  }

  return h;
};

// Hash a non-negative integer, avoiding String() allocation for single digits.
// Equivalent to phash(h, String(n)) for n >= 0.
export const phashN = (h: number, n: number) => {
  if (n >= 0 && n < 10) return (h * 33) ^ (n + 48);
  return phash(h, '' + n);
};

// This is a djb2 hashing function
export const hash = (x: string) => {
  return phash(SEED, x);
};
