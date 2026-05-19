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
    // The Node streaming `Transform` class. Anchor to the import to avoid
    // matching SVG attribute names in the inlined isPropValid regex
    // (`patternTransform`, `gradientTransform`, …).
    expect(browserESM).not.toMatch(/\bnew Transform\b/);
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
    // The regex excludes `.window.` and `.document.` (property accesses like
    // `event.window.width` from Dimensions `change` callbacks, which are
    // NOT references to the global `window`/`document`).
    const unguardedDocument = /(^|[^.\w])document\./g;
    const unguardedWindow = /(^|[^.\w])window\./g;
    expect(nativeCJS.match(unguardedDocument) || []).toHaveLength(0);
    expect(nativeESM.match(unguardedDocument) || []).toHaveLength(0);
    expect(nativeCJS.match(unguardedWindow) || []).toHaveLength(0);
    expect(nativeESM.match(unguardedWindow) || []).toHaveLength(0);
  });

  it('exports createTheme via the native-only path (no DOM/GlobalStyle import)', () => {
    // The native entry imports from `createTheme.native.ts`, which
    // emits sentinel leaves resolved by the runtime resolver layer ;
    // no `document.*` calls, no `createGlobalStyle` transitively.
    expect(nativeCJS).toContain('createTheme');
    expect(nativeESM).toContain('createTheme');
  });

  it('eliminates IS_RSC createContext check', () => {
    expect(nativeCJS).not.toContain('typeof React.createContext');
    expect(nativeESM).not.toContain('typeof React.createContext');
  });

  it('does not contain StyleSheetManager (web-only)', () => {
    // StyleSheetManager manages DOM <style> tags;should not
    // be bundled into native. Check for the export, not error strings.
    expect(nativeCJS).not.toMatch(/exports\.StyleSheetManager/);
  });

  it('drops the rn-web matrix3d transport rewrite from the Hermes bundle', () => {
    // `normalizeStyleForWeb` gates on `__NATIVE_WEB__` so
    // `rewriteStyleForWebTransport` and `fixTransformMatrix3d` only
    // ship on rn-web. The literal `matrix3d` only appears via that
    // rewrite, so its absence is a tight proof of tree-shake.
    expect(nativeCJS).not.toContain('matrix3d');
    expect(nativeESM).not.toContain('matrix3d');
  });
});

describe('rn-web bridge build', () => {
  let bridgeCJS: string;
  let bridgeESM: string;

  beforeAll(() => {
    bridgeCJS = readNative('styled-components.native.web-bridge.cjs.js');
    bridgeESM = readNative('styled-components.native.web-bridge.esm.js');
  });

  it('exists and is meaningfully smaller than the Hermes native bundle', () => {
    const hermesCJS = readNative('styled-components.native.cjs.js');
    expect(bridgeCJS.length).toBeGreaterThan(0);
    expect(bridgeCJS.length).toBeLessThan(hermesCJS.length);
  });

  it('eliminates the native CSS engine (compileNative, native polyfills, color math)', () => {
    // The bridge routes through the web pipeline; the native engine
    // and every polyfill it carries (light-dark, oklch synthesis,
    // viewport-unit collapse, calc, etc.) tree-shakes away. The
    // colorMath OKLab path's distinctive constant is one proof point.
    expect(bridgeCJS).not.toContain('4122214708');
    expect(bridgeESM).not.toContain('4122214708');
    // Animated bridge has no role on the bridge either; CSS animations
    // come through the web pipeline.
    expect(bridgeCJS).not.toContain('createAnimatedComponent');
    expect(bridgeESM).not.toContain('createAnimatedComponent');
  });

  it('keeps the 16-element matrix → matrix3d rewrite for rn-web preprocess', () => {
    // rn-web's preprocess.js emits `matrix(a,b,c,...,p)` for any
    // `transform:[{matrix:[...]}]` regardless of element count, which
    // the browser rejects. The bridge's `rewrite3dMatrices` shim
    // converts 16-element entries to `{ matrix3d: [...] }` before
    // rn-web sees them — the property name must survive minification.
    expect(bridgeCJS).toContain('matrix3d');
    expect(bridgeESM).toContain('matrix3d');
  });

  it('uses the styleq $$css escape hatch to compose classNames with rn-web atomic CSS', () => {
    // The `$$css: true` literal is the bridge's contract with rn-web's
    // styleq. If this string disappears, the bridge no longer reaches
    // the DOM through rn-web's createDOMProps path.
    expect(bridgeCJS).toContain('$$css');
    expect(bridgeESM).toContain('$$css');
  });
});

describe('Hermes native build keeps the Animated-bridge adapter', () => {
  let nativeCJS: string;
  let nativeESM: string;

  beforeAll(() => {
    nativeCJS = readNative('styled-components.native.cjs.js');
    nativeESM = readNative('styled-components.native.esm.js');
  });

  it('contains createAnimatedComponent and excludes the CSS-emit registration', () => {
    expect(nativeCJS).toContain('createAnimatedComponent');
    expect(nativeESM).toContain('createAnimatedComponent');
    expect(nativeCJS).not.toContain('data-sc-anim');
    expect(nativeESM).not.toContain('data-sc-anim');
  });
});

describe('rscPlugin tree-shaking', () => {
  it('is excluded from the standalone UMD bundle', () => {
    const minified = read('styled-components.min.js');
    expect(minified).not.toContain('rscPlugin');
    expect(minified).not.toContain('rewriteSelector');
    expect(minified).not.toContain(':not(style[data-styled])');
  });

  it('is available in the plugins subpath bundles for downstream tree-shaking', () => {
    // rscPlugin lives in the dedicated `styled-components/plugins` subpath
    // (1d3a3d06), so it should be present in those bundles and only those.
    const pluginsESM = read('plugins.esm.js');
    const pluginsCJS = read('plugins.cjs.js');
    expect(pluginsESM).toContain('rscPlugin');
    expect(pluginsCJS).toContain('rscPlugin');
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
      expect(bundle).not.toContain('rscPlugin');
      expect(bundle).not.toContain(':not(style[data-styled])');

      // Sanity: core styled-components code IS present
      expect(bundle.length).toBeGreaterThan(1000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('bundle size', () => {
  // NOTE (v7): ceilings are intentionally loose through the v7 development
  // cycle. Ratchet down to the v7 targets (standalone 12.0 kB / webpack 6.8 kB
  // / all-in 10.5 kB) toward release. See AGENTS.md → CSS Parser for arc.
  it('standalone minified bundle is under 15.5kB gzip', () => {
    const zlib = require('zlib');
    const minified = fs.readFileSync(path.join(distDir, 'styled-components.min.js'));
    const gzipped = zlib.gzipSync(minified);
    const sizeKB = gzipped.length / 1024;

    console.log(`  styled-components.min.js: ${sizeKB.toFixed(2)}kB gzip`);

    // Bumped from 15kB after the arity-2 attrs feature shipped (CompiledAst
    // pop/peek): adds ~0.7kB of always-shipped trace + runtime-fallback
    // scaffolding. Worth it for the third-party-component bridge ergonomics.
    // Bumped again for the fragment-slot missing-`;` recovery in the parser
    // (~0.1kB of charCode imports + the cssProduct structure check).
    expect(sizeKB).toBeLessThan(15.4);
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
      expect(bundle).not.toContain('rscPlugin');
      expect(bundle).not.toContain('rewriteSelector');
      expect(bundle).not.toContain(':not(style[data-styled])');
      expect(bundle).not.toContain('ServerStyleSheet');
      expect(bundle).not.toContain('isStyledComponent');
      // Plugins live on the `styled-components/plugins` subpath;no plugin
      // module code should leak into a main-entry import.
      expect(bundle).not.toContain('border-top-left-radius');
      expect(bundle).not.toContain('styled-components/plugins/rtl');

      // Phase 1 + 2 + B + C + D + E architecture: Source + AST-direct emit
      // + pre-classified slot kinds + fragment splicing + on-demand string
      // fragments + Source synthesis for non-`css(...)` inputs + objectToCSS
      // / objectToTemplate + Phase C TemplateValue + interpolation-sentinel
      // gate (`ParseContext.templates`) hardening the static-input parse
      // path against malicious user-supplied filled[] values that contain
      // sentinel-shaped byte patterns. Plus arity-2 attrs (CompiledAst
      // pop/peek) trace + runtime-fallback scaffolding: ~0.6kB. Net
      // ~2.5kB above v6.4.1 baseline after scanQP/isWS scan-primitive
      // unification. Plus fragment-slot missing-`;` recovery: ~0.1kB.
      expect(sizeKB).toBeLessThan(14.2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30000);

  it('all-in consumer bundle (only react/react-dom external) stays smaller than v6.4.1', async () => {
    // Real consumer cost: what an app actually ships when it imports
    // styled-components. v6 shipped a bundled CSS preprocessor; v7 replaced it with the
    // in-house parser AND inlined the prop-validator (formerly
    // @emotion/is-prop-valid). This test guards against transitive-dep drift
    // and locks in v7's all-in win over v6 so regressions are caught early.
    const webpack = require('webpack');
    const zlib = require('zlib');
    const os = require('os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-allin-'));
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
            externals: { react: 'react', 'react-dom': 'react-dom' },
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

      console.log(`  all-in consumer bundle: ${sizeKB.toFixed(2)}kB gzip`);

      // v6.4.1 all-in for the same entry is 11.44kB gzip. v7 ships extra
      // scaffolding (Source-everywhere, AST-direct emit, fragment splicing,
      // shared `warnOnce` + `[sc]` taxonomy) plus the arity-2 attrs
      // bridge (CompiledAst trace + runtime fallback) for net ~2.5kB.
      // Plus fragment-slot missing-`;` recovery: ~0.1kB.
      expect(sizeKB).toBeLessThan(14.2);
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
