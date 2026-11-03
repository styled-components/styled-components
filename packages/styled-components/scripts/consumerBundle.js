/**
 * The consumer bundle: what a real bundler (webpack, production mode) emits for
 * a typical import of the browser ESM build. `src/test/treeshake.test.ts` (the
 * tree-shaking assertions and size ceiling) and `scripts/size.mjs` (the size
 * report and attribution) both measure this one definition, so the two numbers
 * cannot drift apart.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/** Entry module source: the exports a typical app pulls in, nothing more. */
const consumerEntrySource = distDir =>
  [
    `import styled, { css, keyframes, createGlobalStyle, ThemeProvider } from '${distDir}/styled-components.browser.esm.js';`,
    'const fade = keyframes`from{opacity:1}to{opacity:0}`;',
    'const mixin = css`color: red;`;',
    'const GlobalStyle = createGlobalStyle`body{margin:0}`;',
    'const Box = styled.div`${mixin}animation:${fade} 1s;`;',
    'const Link = styled(Box)`text-decoration:none;`;',
    'export { Box, Link, GlobalStyle, ThemeProvider };',
  ].join('\n');

/** Webpack configuration for the consumer bundle. `devtool` is set only when a source map is wanted. */
const consumerWebpackConfig = ({ entryFile, outDir, sourceMap }) => ({
  mode: 'production',
  entry: entryFile,
  output: { path: outDir, filename: 'bundle.js', library: { type: 'module' } },
  experiments: { outputModule: true },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
  },
  ...(sourceMap ? { devtool: 'source-map' } : {}),
});

/**
 * Builds the consumer bundle from `distDir` and returns its text (and its
 * webpack source map text when `sourceMap` is set). `entrySource` replaces the
 * typical-app entry module with a custom one (tree-shaking probes). Scratch
 * files live in a temporary directory that is removed before returning.
 *
 * @param {{ distDir: string, entrySource?: string, sourceMap?: boolean }} options
 * @returns {Promise<{ bundle: string, map: string | undefined }>}
 */
const buildConsumerBundle = async ({ distDir, entrySource, sourceMap = false }) => {
  const webpack = require('webpack');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-size-'));
  const entryFile = path.join(tmpDir, 'entry.js');

  try {
    fs.writeFileSync(entryFile, entrySource ?? consumerEntrySource(distDir));

    const stats = await new Promise((resolve, reject) => {
      webpack(consumerWebpackConfig({ entryFile, outDir: tmpDir, sourceMap }), (err, result) =>
        err ? reject(err) : resolve(result)
      );
    });

    if (stats.hasErrors()) {
      throw new Error(stats.compilation.errors.map(e => e.message).join('\n'));
    }

    const text = fs.readFileSync(path.join(tmpDir, 'bundle.js'), 'utf8');

    return {
      // The map reference comment is not part of the bytes a consumer ships
      bundle: sourceMap ? text.replace(/\n\/\/# sourceMappingURL=[^\n]*$/, '') : text,
      map: sourceMap ? fs.readFileSync(path.join(tmpDir, 'bundle.js.map'), 'utf8') : undefined,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

module.exports = { buildConsumerBundle };
