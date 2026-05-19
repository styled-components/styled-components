global.__SERVER__ = typeof document === 'undefined';
// `__NATIVE__` defaults to `false` for web tests; the native jest setup
// (`native-setup.ts`) flips it to `true` before any test file runs.
global.__NATIVE__ = false;
// `__NATIVE_WEB__` defaults to `false`; specific tests flip it via
// `(globalThis as { __NATIVE_WEB__?: boolean }).__NATIVE_WEB__ = true`
// to exercise the rn-web bridge branch (see `describeOnRnWeb`).
global.__NATIVE_WEB__ = false;
global.__DEV__ = true;
global.__VERSION__ = 'JEST_MOCK_VERSION';
