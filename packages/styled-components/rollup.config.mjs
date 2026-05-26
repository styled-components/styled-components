import typescript from '@rollup/plugin-typescript';
import { createRequire } from 'node:module';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps';
import terser from '@rollup/plugin-terser';
const req = createRequire(import.meta.url);

const pkg = req('./package.json');

/**
 * NODE_ENV explicit replacement is only needed for standalone packages, as webpack
 * automatically will replace it otherwise in the downstream build.
 */

const cjs = {
  exports: 'named',
  interop: 'auto',
  format: 'cjs',
  sourcemap: true,
};

// Node maps native ESM default imports from CJS to module.exports.
const styledCJSInteropFooter = `
Object.assign(styled, exports);
Object.defineProperty(styled, '__esModule', { value: true });
module.exports = styled;
`;

const esm = {
  format: 'esm',
  interop: 'auto',
  sourcemap: true,
};

const getCJS = override => ({ ...cjs, ...override });
const getESM = override => ({ ...esm, ...override });

const defaultTypescriptPlugin = typescript({
  // The build breaks if the tests are included by the typescript plugin.
  // Since un-excluding them in tsconfig.json, we must explicitly exclude them
  // here.
  exclude: ['**/*.test.ts', '**/*.test.tsx', 'dist', 'src/test/types.tsx'],
  outputToFilesystem: true,
  tsconfig: './tsconfig.json',
  compilerOptions: {
    noEmit: false,
    declaration: true,
    declarationMap: false,
  },
});

const nativeTypescriptPlugin = typescript({
  // The build breaks if the tests are included by the typescript plugin.
  // Since un-excluding them in tsconfig.json, we must explicitly exclude them
  // here.
  exclude: ['**/*.test.ts', '**/*.test.tsx', 'dist', 'src/test/types.tsx'],
  outputToFilesystem: true,
  tsconfig: './tsconfig.json',
  compilerOptions: {
    outDir: 'native/dist',
    noEmit: false,
    declaration: true,
    declarationMap: false,
  },
});

const basePlugins = [
  sourceMaps(),
  json(),
  nodeResolve(),
  commonjs({
    esmExternals: false,
    ignoreGlobal: true,
  }),
  replace({
    __VERSION__: JSON.stringify(pkg.version),
  }),
  /** @type {import('rollup').Plugin} */
  ({
    name: 'postprocessing',
    // Rollup 2 injects globalThis, which is nice, but doesn't really make sense for Microbundle.
    // Only ESM environments necessitate globalThis, and UMD bundles can't be properly loaded as ESM.
    // So we remove the globalThis check, replacing it with `this||self` to match Rollup 1's output:
    renderChunk(code, chunk, opts) {
      if (opts.format === 'umd') {
        // minified:
        code = code.replace(
          /([a-zA-Z$_]+)="undefined"!=typeof globalThis\?globalThis:(\1\|\|self)/,
          '$2'
        );
        // unminified:
        code = code.replace(
          /(global *= *)typeof +globalThis *!== *['"]undefined['"] *\? *globalThis *: *(global *\|\| *self)/,
          '$1$2'
        );
        return { code, map: null };
      }
    },
  }),
];

// this should always be last
const minifierPlugin = terser({
  compress: {
    passes: 10,
    keep_infinity: true,
    pure_getters: true,
  },
  ecma: 2015,
  format: {
    wrap_func_args: false,
    comments: /^\s*([@#]__[A-Z]+__\s*$|@cc_on)/,
    preserve_annotations: true,
  },
});

const commonPlugins = [defaultTypescriptPlugin, basePlugins];

const configBase = {
  input: './src/index.ts',

  // \0 is rollup convention for generated in memory modules
  external: id => !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/'),
  plugins: commonPlugins,
};

const globals = { react: 'React', 'react-dom': 'ReactDOM' };

const standaloneBaseConfig = {
  ...configBase,
  input: './src/index-standalone.ts',
  output: {
    file: 'dist/styled-components.js',
    format: 'umd',
    globals,
    name: 'styled',
    sourcemap: true,
    exports: 'named',
  },
  external: Object.keys(globals),
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
      __NATIVE__: JSON.stringify(false),
      __NATIVE_WEB__: JSON.stringify(false),
    }),
    replace({
      delimiters: ['', ''],
      "typeof React.createContext === 'undefined'": JSON.stringify(false),
    })
  ),
  treeshake: {
    propertyReadSideEffects: false,
  },
};

const standaloneConfig = {
  ...standaloneBaseConfig,
  plugins: standaloneBaseConfig.plugins.concat(
    replace({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development'),
    })
  ),
};

const standaloneProdConfig = {
  ...standaloneBaseConfig,
  output: {
    ...standaloneBaseConfig.output,
    file: 'dist/styled-components.min.js',
  },
  plugins: standaloneBaseConfig.plugins.concat(
    replace({
      __DEV__: JSON.stringify(false),
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    minifierPlugin
  ),
};

const serverConfig = {
  ...configBase,
  output: [
    getESM({ file: 'dist/styled-components.esm.js' }),
    getCJS({ file: 'dist/styled-components.cjs.js', footer: styledCJSInteropFooter }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
      __NATIVE__: JSON.stringify(false),
      __NATIVE_WEB__: JSON.stringify(false),
      __DEV__: "process.env.NODE_ENV !== 'production'",
    }),
    minifierPlugin
  ),
};

const browserConfig = {
  ...configBase,
  output: [
    getESM({ file: 'dist/styled-components.browser.esm.js' }),
    getCJS({ file: 'dist/styled-components.browser.cjs.js', footer: styledCJSInteropFooter }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
      __NATIVE__: JSON.stringify(false),
      __NATIVE_WEB__: JSON.stringify(false),
      __DEV__: "process.env.NODE_ENV !== 'production'",
    }),
    replace({
      delimiters: ['', ''],
      "typeof React.createContext === 'undefined'": JSON.stringify(false),
    }),
    minifierPlugin
  ),
};

// Shared between the Hermes-target native bundle and the rn-web variant.
const nativeBasePlugins = [
  nativeTypescriptPlugin,
  ...basePlugins,
  replace({
    delimiters: ['', ''],
    "typeof React.createContext === 'undefined'": JSON.stringify(false),
  }),
];

// The native subpath ships its engine builds as Metro platform-extension
// entries (`.native.js` for Hermes, `.web.js` + a plain `.js` fallback for the
// rn-web bridge) instead of a package.json `browser` object-map. Metro applies
// `browser` on every platform, not just web, so the old map silently routed the
// rn-web bridge onto iOS/Android. Platform extensions resolve at the file layer
// per platform, so Metro picks the Hermes engine natively and the bridge on web
// with no map. `native/package.json` `main` points at the extensionless base.
const nativeConfig = {
  ...configBase,
  input: './src/native/index.ts',
  output: [
    getCJS({
      file: 'native/dist/styled-components.native.js',
    }),
    getESM({
      file: 'native/dist/styled-components.native.esm.js',
    }),
  ],
  // The native build runs only `nativeTypescriptPlugin` so declarations land
  // in `native/dist/` once. Concatenating `commonPlugins` previously
  // included `defaultTypescriptPlugin` too, which wrote a parallel d.ts tree
  // into `native/dist/dist/` and `native/dist/native/` - those shadow trees
  // shipped to npm.
  plugins: [
    ...nativeBasePlugins,
    replace({
      __SERVER__: JSON.stringify(false),
      __NATIVE__: JSON.stringify(true),
      __NATIVE_WEB__: JSON.stringify(false),
      __DEV__: "process.env.NODE_ENV !== 'production'",
    }),
    minifierPlugin,
  ],
};

const pluginsConfig = {
  ...configBase,
  input: './src/plugins/index.ts',
  output: [getESM({ file: 'dist/plugins.esm.js' }), getCJS({ file: 'dist/plugins.cjs.js' })],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
      __NATIVE__: JSON.stringify(false),
      __NATIVE_WEB__: JSON.stringify(false),
      __DEV__: "process.env.NODE_ENV !== 'production'",
    }),
    replace({
      delimiters: ['', ''],
      "typeof React.createContext === 'undefined'": JSON.stringify(false),
    }),
    minifierPlugin
  ),
};

const reanimatedConfig = {
  ...configBase,
  input: './src/native/reanimated/index.ts',
  // configBase.external is a function that already treats bare module ids
  // (`react-native-reanimated`, `react-native`) as external; no addition needed.
  output: [
    getCJS({
      file: 'native/dist/styled-components.native.reanimated.cjs.js',
    }),
    getESM({
      file: 'native/dist/styled-components.native.reanimated.esm.js',
    }),
  ],
  plugins: [
    ...nativeBasePlugins,
    replace({
      __SERVER__: JSON.stringify(false),
      __NATIVE__: JSON.stringify(true),
      __NATIVE_WEB__: JSON.stringify(false),
      __DEV__: "process.env.NODE_ENV !== 'production'",
    }),
    minifierPlugin,
  ],
};

// Experimental rn-web bridge entry. Routes consumers through the web
// pipeline (CSSOM insertRule, hashed className) and lifts our class
// into rn-web's atomic-CSS layer via styleq's `$$css` escape hatch.
// Builds against the web pipeline (`__NATIVE__: false`) so the native
// engine code tree-shakes out of this bundle; the only native code
// pulled in is the bridge shim itself.
const webBridgeConfig = {
  ...configBase,
  input: './src/native/web-bridge/index.tsx',
  // `.web.js` is the explicit web platform entry; `styled-components.js` is the
  // extensionless-`main` fallback for resolvers that don't apply platform
  // extensions (and Metro web when it falls through `.web.js`). Both are the
  // bridge so a web-side fallback never lands on the Hermes engine. `.web.esm.js`
  // backs the `module` field for tree-shaking web bundlers.
  output: [
    getCJS({
      file: 'native/dist/styled-components.web.js',
    }),
    getCJS({
      file: 'native/dist/styled-components.js',
    }),
    getESM({
      file: 'native/dist/styled-components.web.esm.js',
    }),
  ],
  plugins: [
    ...nativeBasePlugins,
    replace({
      __SERVER__: JSON.stringify(false),
      __NATIVE__: JSON.stringify(false),
      __NATIVE_WEB__: JSON.stringify(true),
      __DEV__: "process.env.NODE_ENV !== 'production'",
    }),
    minifierPlugin,
  ],
};

export default [
  standaloneConfig,
  standaloneProdConfig,
  serverConfig,
  browserConfig,
  nativeConfig,
  pluginsConfig,
  reanimatedConfig,
  webBridgeConfig,
];
