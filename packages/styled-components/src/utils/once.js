// @flow
// Helper to call a given function, only once
export const once = (cb: Function): Function => {
  let called = false;

  return (...args) => {
    if (!called) {
      called = true;
      cb(...args);
    }
  };
};
