global.__SERVER__ = typeof document === 'undefined';
// `__NATIVE__` defaults to `false` for web tests; the native jest setup
// (`native-setup.ts`) flips it to `true` before any test file runs.
global.__NATIVE__ = false;
global.__NATIVE_WEB__ = false;
global.__DEV__ = true;
global.__VERSION__ = 'JEST_MOCK_VERSION';
