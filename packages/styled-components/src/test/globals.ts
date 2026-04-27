declare var __SERVER__: boolean;
declare var __NATIVE__: boolean;
declare var __VERSION__: string;

global.__SERVER__ = typeof document === 'undefined';
// `__NATIVE__` defaults to `false` for web tests; the native jest setup
// (`native-setup.ts`) flips it to `true` before any test file runs.
global.__NATIVE__ = false;
global.__VERSION__ = 'JEST_MOCK_VERSION';
