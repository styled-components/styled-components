/**
 * Tree-shaking and dead-code elimination tests.
 *
 * These verify that the built output correctly eliminates code based on
 * build-time constants and that the ESM/browser/native builds don't
 * include code intended for other targets.
 */
import fs from 'fs';
import path from 'path';

const distDir = path.resolve(__dirname, '../../dist');
const nativeDistDir = path.resolve(__dirname, '../../native/dist');

const read = (file: string) => fs.readFileSync(path.join(distDir, file), 'utf8');
const readNative = (file: string) => fs.readFileSync(path.join(nativeDistDir, file), 'utf8');

describe('dead-code elimination: browser build', () => {
  let browserESM: string;
  let browserCJS: string;

  beforeAll(() => {
    browserESM = read('styled-components.browser.esm.js');
    browserCJS = read('styled-components.browser.cjs.js');
  });

  it('eliminates __SERVER__ identifier', () => {
    expect(browserESM).not.toContain('__SERVER__');
    expect(browserCJS).not.toContain('__SERVER__');
  });

  it('eliminates IS_RSC createContext check', () => {
    expect(browserESM).not.toContain('typeof React.createContext');
    expect(browserCJS).not.toContain('typeof React.createContext');
  });

  it('exports createTheme', () => {
    expect(browserESM).toContain('createTheme');
  });

  it('eliminates ServerStyleSheet streaming internals', () => {
    expect(browserESM).not.toContain('CLOSING_TAG');
    expect(browserESM).not.toContain('appendStyleChunks');
    expect(browserESM).not.toContain('Transform');
  });
});

describe('dead-code elimination: server build', () => {
  let serverESM: string;
  let serverCJS: string;

  beforeAll(() => {
    serverESM = read('styled-components.esm.js');
    serverCJS = read('styled-components.cjs.js');
  });

  it('eliminates __SERVER__ identifier', () => {
    expect(serverESM).not.toContain('__SERVER__');
    expect(serverCJS).not.toContain('__SERVER__');
  });

  it('exports createTheme', () => {
    expect(serverESM).toContain('createTheme');
  });
});

describe('dead-code elimination: standalone production build', () => {
  let minified: string;

  beforeAll(() => {
    minified = read('styled-components.min.js');
  });

  it('eliminates __SERVER__ identifier', () => {
    expect(minified).not.toContain('__SERVER__');
  });

  it('eliminates IS_RSC createContext check', () => {
    expect(minified).not.toContain('typeof React.createContext');
  });

  it('eliminates development-only code', () => {
    expect(minified).not.toContain('process.env.NODE_ENV');
    expect(minified).not.toContain('warnTooManyClasses');
    expect(minified).not.toContain('checkDynamicCreation');
  });
});

describe('native build isolation', () => {
  let nativeCJS: string;
  let nativeESM: string;

  beforeAll(() => {
    nativeCJS = readNative('styled-components.native.cjs.js');
    nativeESM = readNative('styled-components.native.esm.js');
  });

  it('does not contain unguarded document or window references', () => {
    // RN/Hermes fails at module evaluation time on bare `document.` or
    // `window.` access. `typeof window` guards are fine.
    expect(nativeCJS.match(/\bdocument\./g) || []).toHaveLength(0);
    expect(nativeESM.match(/\bdocument\./g) || []).toHaveLength(0);
    expect(nativeCJS.match(/\bwindow\./g) || []).toHaveLength(0);
    expect(nativeESM.match(/\bwindow\./g) || []).toHaveLength(0);
  });

  it('does not contain createTheme (requires DOM)', () => {
    expect(nativeCJS).not.toContain('createTheme');
    expect(nativeESM).not.toContain('createTheme');
  });

  it('eliminates IS_RSC createContext check', () => {
    expect(nativeCJS).not.toContain('typeof React.createContext');
    expect(nativeESM).not.toContain('typeof React.createContext');
  });

  it('does not contain StyleSheetManager (web-only)', () => {
    // StyleSheetManager manages DOM <style> tags — should not
    // be bundled into native. Check for the export, not error strings.
    expect(nativeCJS).not.toMatch(/exports\.StyleSheetManager/);
  });
});

describe('stylisPluginRSC tree-shaking', () => {
  it('is excluded from the standalone UMD bundle', () => {
    const minified = read('styled-components.min.js');
    expect(minified).not.toContain('stylisPluginRSC');
    expect(minified).not.toContain('rewriteSelector');
    expect(minified).not.toContain(':not(style[data-styled])');
  });

  it('is available in ESM builds for downstream tree-shaking', () => {
    const browserESM = read('styled-components.browser.esm.js');
    const serverESM = read('styled-components.esm.js');
    expect(browserESM).toContain('stylisPluginRSC');
    expect(serverESM).toContain('stylisPluginRSC');
  });

  it('is eliminated by webpack when unused', async () => {
    const webpack = require('webpack');
    const os = require('os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-treeshake-'));
    const entryFile = path.join(tmpDir, 'entry.js');
    const outputFile = path.join(tmpDir, 'bundle.js');

    try {
      fs.writeFileSync(
        entryFile,
        `import styled from '${distDir}/styled-components.browser.esm.js';\nconsole.log(styled.div);\n`
      );

      const stats: any = await new Promise((resolve, reject) => {
        webpack(
          {
            mode: 'production',
            entry: entryFile,
            output: { path: tmpDir, filename: 'bundle.js' },
            externals: { react: 'React', 'react-dom': 'ReactDOM' },
          },
          (err: any, stats: any) => (err ? reject(err) : resolve(stats))
        );
      });

      if (stats.hasErrors()) {
        throw new Error(stats.compilation.errors.map((e: any) => e.message).join('\n'));
      }

      const bundle = fs.readFileSync(outputFile, 'utf8');
      expect(bundle).not.toContain('rewriteSelector');
      expect(bundle).not.toContain('stylisPluginRSC');
      expect(bundle).not.toContain(':not(style[data-styled])');

      // Sanity: core styled-components code IS present
      expect(bundle.length).toBeGreaterThan(1000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('bundle size', () => {
  it('standalone minified bundle is under 13kB gzip', () => {
    const zlib = require('zlib');
    const minified = fs.readFileSync(path.join(distDir, 'styled-components.min.js'));
    const gzipped = zlib.gzipSync(minified);
    const sizeKB = gzipped.length / 1024;

    console.log(`  styled-components.min.js: ${sizeKB.toFixed(2)}kB gzip`);

    expect(sizeKB).toBeLessThan(13);
  });

  it('production bundle size with real bundler tree-shaking', async () => {
    const webpack = require('webpack');
    const zlib = require('zlib');
    const os = require('os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-size-'));
    const entryFile = path.join(tmpDir, 'entry.js');

    try {
      fs.writeFileSync(
        entryFile,
        [
          `import styled, { css, keyframes, createGlobalStyle, ThemeProvider } from '${distDir}/styled-components.browser.esm.js';`,
          'const fade = keyframes`from{opacity:1}to{opacity:0}`;',
          'const mixin = css`color: red;`;',
          'const GlobalStyle = createGlobalStyle`body{margin:0}`;',
          'const Box = styled.div`${mixin}animation:${fade} 1s;`;',
          'const Link = styled(Box)`text-decoration:none;`;',
          'export { Box, Link, GlobalStyle, ThemeProvider };',
        ].join('\n')
      );

      const stats: any = await new Promise((resolve, reject) => {
        webpack(
          {
            mode: 'production',
            entry: entryFile,
            output: { path: tmpDir, filename: 'bundle.js', library: { type: 'module' } },
            experiments: { outputModule: true },
            externals: {
              react: 'react',
              'react-dom': 'react-dom',
              '@emotion/is-prop-valid': '@emotion/is-prop-valid',
              stylis: 'stylis',
            },
          },
          (err: any, stats: any) => (err ? reject(err) : resolve(stats))
        );
      });

      if (stats.hasErrors()) {
        throw new Error(stats.compilation.errors.map((e: any) => e.message).join('\n'));
      }

      const bundle = fs.readFileSync(path.join(tmpDir, 'bundle.js'), 'utf8');
      const gzipped = zlib.gzipSync(bundle);
      const sizeKB = gzipped.length / 1024;

      console.log(`  production bundle (webpack): ${sizeKB.toFixed(2)}kB gzip`);

      // Verify unused exports are tree-shaken
      expect(bundle).not.toContain('WithTheme');
      expect(bundle).not.toContain('stylisPluginRSC');
      expect(bundle).not.toContain('rewriteSelector');
      expect(bundle).not.toContain(':not(style[data-styled])');
      expect(bundle).not.toContain('ServerStyleSheet');
      expect(bundle).not.toContain('isStyledComponent');

      expect(sizeKB).toBeLessThan(9);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('ESM tree-shakeability', () => {
  it('browser ESM uses named exports', () => {
    const browserESM = read('styled-components.browser.esm.js');
    expect(browserESM).toMatch(/export\s*\{/);
  });

  it('server ESM uses named exports', () => {
    const serverESM = read('styled-components.esm.js');
    expect(serverESM).toMatch(/export\s*\{/);
  });

  it('package.json declares sideEffects: false', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    expect(pkg.sideEffects).toBe(false);
  });

  it('package.json has browser field for build-specific resolution', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    expect(pkg.browser).toBeDefined();
    expect(pkg.browser['./dist/styled-components.cjs.js']).toBe(
      './dist/styled-components.browser.cjs.js'
    );
    expect(pkg.browser['./dist/styled-components.esm.js']).toBe(
      './dist/styled-components.browser.esm.js'
    );
  });
});
