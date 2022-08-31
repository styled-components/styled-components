import typescript from '@rollup/plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

/**
 * NODE_ENV explicit replacement is only needed for standalone packages, as webpack
 * automatically will replace it otherwise in the downstream build.
 */

const cjs = {
  exports: 'named',
  format: 'cjs',
  sourcemap: true,
};

const esm = {
  format: 'esm',
  sourcemap: true,
};

const getCJS = override => ({ ...cjs, ...override });
const getESM = override => ({ ...esm, ...override });

const commonPlugins = [
  typescript({
    outputToFilesystem: true,
    tsconfig: './tsconfig.json',
  }),
  sourceMaps(),
  json(),
  nodeResolve({
    extensions: ['.mjs', '.js', '.jsx', '.json', '.node'],
    mainFields: ['module', 'jsnext', 'main'],
  }),
  commonjs({
    esmExternals: false,
    ignoreGlobal: true,
    include: /\/node_modules\//,
    requireReturnsDefault: 'namespace',
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
  ecma: 5,
  format: {
    wrap_func_args: false,
    comments: /^\s*([@#]__[A-Z]+__\s*$|@cc_on)/,
    preserve_annotations: true,
  },
});

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
  },
  external: Object.keys(globals),
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
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
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    minifierPlugin
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
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    minifierPlugin
  ),
};

const serverConfig = {
  ...configBase,
  output: [
    getESM({ file: 'dist/styled-components.esm.js' }),
    getCJS({ file: 'dist/styled-components.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      window: undefined,
      __SERVER__: JSON.stringify(true),
    }),
    minifierPlugin
  ),
};

const browserConfig = {
  ...configBase,
  output: [
    getESM({ file: 'dist/styled-components.browser.esm.js' }),
    getCJS({ file: 'dist/styled-components.browser.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
    }),
    minifierPlugin
  ),
};

const nativeConfig = {
  ...configBase,
  input: './src/native/index.ts',
  output: [
    getCJS({
      file: 'native/dist/styled-components.native.cjs.js',
    }),
    getESM({
      file: 'native/dist/styled-components.native.esm.js',
    }),
  ],
};

const macroConfig = Object.assign({}, configBase, {
  input: './src/macro/index.ts',
  output: [
    getESM({ file: 'dist/styled-components-macro.esm.js' }),
    getCJS({ file: 'dist/styled-components-macro.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
    }),
    minifierPlugin
  ),
});

export default [
  standaloneConfig,
  standaloneProdConfig,
  serverConfig,
  browserConfig,
  nativeConfig,
  macroConfig,
];
