// @flow
// Helper to call a given function, only once
export default (cb: () => void): (() => void) => {
  let called = false

  return () => {
    if (!called) {
      called = true
      cb()
    }
  }
}
