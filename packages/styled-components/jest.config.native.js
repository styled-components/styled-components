const baseConfig = require('./jest.config.base');

/**
 * Native jest config uses react-native's own jest preset so tests run against
 * the real RN runtime (no DOM). React 19's react-test-renderer requires `act`
 * wrapping around every create/update/unmount call — `native-setup.ts` installs
 * that wrap globally so existing `TestRenderer.create(...)` sites keep working.
 *
 * RN's source mixes Flow + TypeScript + JSX. The project-root `babel-preset.js`
 * has an `overrides` entry that routes react-native/* files to
 * `@react-native/babel-preset`, so babel-jest parses them correctly without
 * affecting the non-RN build.
 *
 * RN 0.85 moved the jest preset into `@react-native/jest-preset`. The bare
 * `preset: 'react-native'` alias still resolves (via a shim) when
 * `@react-native/jest-preset` is a direct dependency.
 */
module.exports = Object.assign({}, baseConfig, {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/src/test/globals.ts', '<rootDir>/src/test/native-setup.ts'],
  testEnvironment: 'node',
  testRegex: 'src/native/(test|.*/test)/.*.tsx?$',
});
