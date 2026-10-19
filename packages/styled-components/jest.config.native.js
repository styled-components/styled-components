const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  preset: 'react-native',
  setupFiles: ['<rootDir>/src/test/globals.ts'],
  testEnvironment: 'node',
  testRegex: 'src/native/test/.*.tsx?$',
  /**
   * The preset's pattern, judged only at the last `node_modules/` segment (the
   * package that owns the file). pnpm's global store can sit under another
   * `node_modules/`, as it does on CI, where the preset's pattern would match
   * that outer segment and skip transforming react-native's Flow source.
   */
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)(?!.*node_modules/)',
  ],
});
