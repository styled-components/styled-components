/**
 * Tree-shaking and dead-code elimination tests.
 *
 * These verify that the built output correctly eliminates code based on
 * build-time constants and that the ESM/browser/native builds don't
 * include code intended for other targets.
 */
import { builtinModules } from 'module';
import fs from 'fs';
import path from 'path';
import errorMap from '../utils/errors';

const { buildConsumerBundle } = require('../../scripts/consumerBundle');
const { version } = require('../../package.json');

const distDir = path.resolve(__dirname, '../../dist');
const nativeDistDir = path.resolve(__dirname, '../../native/dist');

const read = (file: string) => fs.readFileSync(path.join(distDir, file), 'utf8');
const readNative = (file: string) => fs.readFileSync(path.join(nativeDistDir, file), 'utf8');
const jsFiles = (dir: string) =>
  fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .sort();

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

/**
 * Next.js applies the `browser` file map to edge bundles, so a server render
 * on the edge runtime loads the browser build. A React Server Components copy
 * of React has no `createContext`, which the browser build would otherwise hit
 * as an anonymous TypeError at module load.
 */
describe('browser build on an edge-runtime server', () => {
  const browserBundle = path.join(distDir, 'styled-components.browser.cjs.js');
  /** The edge-runtime error is thrown as `throw <minified styledError>(19)`. */
  const edgeGuard = /throw \w+\(19\)/;

  afterEach(() => {
    jest.dontMock('react');
    jest.resetModules();
  });

  it('reports the edge-runtime fix when React has no createContext', () => {
    jest.doMock('react', () => {
      const { createContext: _createContext, ...serverComponentReact } =
        jest.requireActual('react');
      return serverComponentReact;
    });

    expect(() => require(browserBundle)).toThrow(new Error(errorMap[19].trim()));
  });

  it('loads when React has createContext', () => {
    expect(() => require(browserBundle)).not.toThrow();
  });

  it('carries the guard only in the bundles that can reach an edge runtime', () => {
    expect(read('styled-components.browser.cjs.js')).toMatch(edgeGuard);
    expect(read('styled-components.browser.esm.js')).toMatch(edgeGuard);
    expect(read('styled-components.cjs.js')).not.toMatch(edgeGuard);
    expect(read('styled-components.esm.js')).not.toMatch(edgeGuard);
    expect(readNative('styled-components.native.js')).not.toMatch(edgeGuard);
    expect(readNative('styled-components.native.esm.js')).not.toMatch(edgeGuard);
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

/**
 * `__DEV__` is substituted textually, so the replacement has to be
 * parenthesized. A bare `process.env.NODE_ENV !== 'production'` rebinds under
 * any tighter operator: `!__DEV__` becomes `(!process.env.NODE_ENV) !==
 * 'production'`, which is always true, so every `if (!__DEV__) return;` guard
 * in the library inverts. That silences every warning and serves production
 * error text in development, and neither the build nor the source-level tests
 * can see it, because Jest defines `__DEV__` as a real boolean.
 */
describe('__DEV__ substitution in built output', () => {
  it.each(jsFiles(distDir))('leaves no rebound negation in %s', file => {
    expect(read(file)).not.toContain('!process.env.NODE_ENV');
  });

  it.each(jsFiles(nativeDistDir))('leaves no rebound negation in native/%s', file => {
    expect(readNative(file)).not.toContain('!process.env.NODE_ENV');
  });

  /**
   * A bundler that replaces only `process.env.NODE_ENV` textually (Vite) leaves any other
   * `process` reference in place, and a browser has no `process` global. A dead property read
   * terser reduces to a bare `process;` statement throws a ReferenceError at module load.
   * Flagged: `process` as a whole operand, a statement or a comma-sequence member (`}process;`,
   * `a(),process,b()`, `(0,process)`). Allowed forms, none of which match:
   * - `typeof process`: the guard that makes the member reads safe.
   * - `process.env` and `process?.env` member reads: only emitted behind that guard.
   * - the word in prose (error text, comments), which a space precedes.
   * A plain identifier match is not practical: the standalone UMD file keeps prose comments.
   */
  const deadProcessRead = /(?<=^|[;{}(,])process(?=[;,)])/g;
  const unguardedProcessReads = (source: string) =>
    source
      .replaceAll('process.env.NODE_ENV', '"production"')
      .split('\n')
      .flatMap((line, index) =>
        [...line.matchAll(deadProcessRead)].map(
          match =>
            `${index + 1}:${match.index}: ${line.slice(Math.max(0, match.index - 30), match.index + 30)}`
        )
      );

  it.each(jsFiles(distDir))(
    'never reads the process global once NODE_ENV is replaced in %s',
    file => {
      expect(unguardedProcessReads(read(file))).toEqual([]);
    }
  );

  it.each(jsFiles(nativeDistDir))(
    'never reads the process global once NODE_ENV is replaced in native/%s',
    file => {
      expect(unguardedProcessReads(readNative(file))).toEqual([]);
    }
  );

  it('throws readable errors outside production', () => {
    const { ServerStyleSheet } = require(path.join(distDir, 'styled-components.cjs.js'));
    const sheet = new ServerStyleSheet();
    sheet.seal();

    // The catalog text, not the terse production form that only links to it.
    expect(() => sheet.getStyleTags()).toThrow(/one off instance for each server-side render/);
    expect(() => sheet.getStyleTags()).not.toThrow(/An error occurred\. See https/);
  });

  it('emits warnings outside production', () => {
    const { createTheme } = require(path.join(distDir, 'styled-components.cjs.js'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      createTheme({ shadow: 'drop-shadow(0 0 2px' });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('unbalanced parentheses');
    } finally {
      warn.mockRestore();
    }
  });
});

describe('native build isolation', () => {
  let nativeCJS: string;
  let nativeESM: string;

  beforeAll(() => {
    nativeCJS = readNative('styled-components.native.js');
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
    // The matrix3d rewrite lives only in the rn-web bridge, and the
    // literal `matrix3d` appears nowhere else in shipped code, so its
    // absence proves the bridge stays out of the Hermes bundle.
    expect(nativeCJS).not.toContain('matrix3d');
    expect(nativeESM).not.toContain('matrix3d');
  });
});

describe('rn-web bridge build', () => {
  let bridgeCJS: string;
  let bridgeESM: string;

  beforeAll(() => {
    bridgeCJS = readNative('styled-components.web.js');
    bridgeESM = readNative('styled-components.web.esm.js');
  });

  it('exists and is meaningfully smaller than the Hermes native bundle', () => {
    const hermesCJS = readNative('styled-components.native.js');
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

  it.each(['styled-components.web.js', 'styled-components.web.esm.js'])(
    '%s bundles no module of the native declaration transform or animation engine',
    file => {
      const { sources }: { sources: string[] } = JSON.parse(readNative(file + '.map'));
      const engineSources = sources.filter(source =>
        /\/src\/native\/(transform|animation)\//.test(source)
      );

      expect(sources.length).toBeGreaterThan(0);
      expect(engineSources).toEqual([]);
    }
  );

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

/**
 * The rn-web bridge rewrites run inside the compiler behind `__NATIVE_WEB__`, which only the
 * bridge bundle sets. Each sentinel is one literal of the rewrites: the var()-with-unit repair and
 * the `align-content` the emitter writes for `vertical-align` (each once in the bridge), the
 * `:disabled` token rewrite (twice: its two spellings), and `read-write`, a key of the pseudo-class
 * map the `:not` wrap reads, which the web bundles must not pull in.
 */
describe('rn-web bridge rewrites', () => {
  const onceInBridge = ['calc(var(', 'align-content'];
  const inBridge = ['aria-disabled=true', 'read-write'];

  it.each([
    'styled-components.cjs.js',
    'styled-components.esm.js',
    'styled-components.browser.cjs.js',
    'styled-components.browser.esm.js',
    'styled-components.js',
    'styled-components.min.js',
  ])('%s carries no sentinel', file => {
    const bundle = read(file);

    for (const sentinel of [...onceInBridge, ...inBridge]) {
      expect(bundle).not.toContain(sentinel);
    }
  });

  it.each(['styled-components.web.js', 'styled-components.web.esm.js'])(
    '%s carries each sentinel',
    file => {
      const bundle = readNative(file);

      for (const sentinel of onceInBridge) {
        expect(bundle.split(sentinel)).toHaveLength(2);
      }
      for (const sentinel of inBridge) {
        expect(bundle).toContain(sentinel);
      }
    }
  );
});

describe('Hermes native build keeps the Animated-bridge adapter', () => {
  let nativeCJS: string;
  let nativeESM: string;

  beforeAll(() => {
    nativeCJS = readNative('styled-components.native.js');
    nativeESM = readNative('styled-components.native.esm.js');
  });

  it('contains createAnimatedComponent', () => {
    expect(nativeCJS).toContain('createAnimatedComponent');
    expect(nativeESM).toContain('createAnimatedComponent');
  });
});

describe('native subpath platform-extension entries', () => {
  // Metro applies a package.json `browser` object-map on every platform, so the
  // old map silently routed the rn-web bridge onto iOS/Android. The fix ships
  // the engines as platform-extension files (`.native.js` Hermes, `.web.js` +
  // `.js` fallback bridge) with an extensionless `main` and no `browser` map, so
  // Metro resolves the engine per platform at the file layer. These lock that
  // file layout and the package.json shape that drives it.
  const nativePkg = JSON.parse(
    fs.readFileSync(path.resolve(nativeDistDir, '../package.json'), 'utf8')
  );

  it('main is extensionless so Metro applies platform extensions', () => {
    // `.native.js` / `.web.js` / `.js` only resolve per-platform when the field
    // value carries no extension of its own.
    expect(nativePkg.main).toBe('./dist/styled-components');
  });

  it('ships no browser object-map (the bug source)', () => {
    expect(nativePkg.browser).toBeUndefined();
  });

  it('module points at the rn-web bridge ESM for tree-shaking web bundlers', () => {
    expect(nativePkg.module).toBe('./dist/styled-components.web.esm.js');
  });

  it('the .native.js entry is the Hermes engine, not the bridge', () => {
    const nativeJS = readNative('styled-components.native.js');
    expect(nativeJS).toContain('createAnimatedComponent');
    expect(nativeJS).not.toContain('$$css');
  });

  it('the .web.js and .js entries are the rn-web bridge', () => {
    // A web-side fallback must never land on the Hermes engine; both carry the
    // styleq `$$css` escape hatch and drop the native Animated bridge.
    const webJS = readNative('styled-components.web.js');
    const fallbackJS = readNative('styled-components.js');
    expect(webJS).toContain('$$css');
    expect(fallbackJS).toContain('$$css');
    expect(webJS).not.toContain('createAnimatedComponent');
    expect(fallbackJS).not.toContain('createAnimatedComponent');
    // `.js` is the extensionless-main fallback: the same bridge bundle, differing
    // only in its trailing sourceMappingURL comment.
    const stripSourceMap = (s: string) => s.replace(/\/\/# sourceMappingURL=\S+/g, '');
    expect(stripSourceMap(fallbackJS)).toBe(stripSourceMap(webJS));
  });

  it('every native subpath package.json resolves main/module/types to real files', () => {
    // A subpath redirector pointing at a renamed dist file silently breaks the
    // import. Renaming the bridge outputs without updating this is exactly how
    // `styled-components/native/web-bridge` broke. Lock the native engine, the
    // rn-web bridge, and reanimated subpaths together.
    const nativeRoot = path.resolve(nativeDistDir, '..');
    // The native subpath `main` is the extensionless platform-extension base, so
    // accept `<base>.js` for a target with no extension of its own.
    const resolvesToFile = (p: string) =>
      fs.existsSync(p) || (path.extname(p) === '' && fs.existsSync(`${p}.js`));
    for (const rel of ['package.json', 'web-bridge/package.json', 'reanimated/package.json']) {
      const pkgPath = path.join(nativeRoot, rel);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const pkgDir = path.dirname(pkgPath);
      for (const field of ['main', 'module', 'types'] as const) {
        if (!pkg[field]) continue;
        const target = path.resolve(pkgDir, pkg[field]);
        expect(`${rel} ${field}=${pkg[field]} resolves=${resolvesToFile(target)}`).toBe(
          `${rel} ${field}=${pkg[field]} resolves=true`
        );
      }
    }
  });
});

/**
 * `styled-components/server-styles` is a client-component module: a server component host
 * imports it by name, so the server build keeps it external, and no other build ever
 * reaches it.
 */
describe('server component shim', () => {
  const shimFiles = ['server-styles.cjs.js', 'server-styles.esm.js'];
  const shimName = 'styled-components/server-styles';
  const shimPackageDir = path.resolve(distDir, '../server-styles');

  it.each(shimFiles)('%s starts with the client directive', file => {
    expect(read(file).split('\n')[0]).toBe("'use client';");
  });

  it('is imported by name from the server build only', () => {
    expect(read('styled-components.cjs.js')).toContain(shimName);
    expect(read('styled-components.esm.js')).toContain(shimName);
  });

  it.each([
    'styled-components.browser.cjs.js',
    'styled-components.browser.esm.js',
    'styled-components.js',
    'styled-components.min.js',
    'plugins.cjs.js',
    'plugins.esm.js',
  ])('%s never reaches the shim', file => {
    expect(read(file)).not.toContain(shimName);
  });

  it.each(jsFiles(nativeDistDir))('native/%s never reaches the shim', file => {
    expect(readNative(file)).not.toContain(shimName);
  });

  it.each(['styled-components.js', 'styled-components.min.js'])(
    '%s carries neither server component element',
    file => {
      const standalone = read(file);

      expect(standalone).not.toContain('ScStyle');
      expect(standalone).not.toContain('ScGlobalStyle');
    }
  );

  it('declares no internal element in the shim declaration', () => {
    const declaration = read('server-styles.d.ts');

    expect(declaration).not.toContain('ScStyle');
    expect(declaration).not.toContain('ScGlobalStyle');
  });

  it('subpath package.json resolves main/module/types to real files', () => {
    const shimPackage = JSON.parse(
      fs.readFileSync(path.join(shimPackageDir, 'package.json'), 'utf8')
    );

    for (const field of ['main', 'module', 'types'] as const) {
      const target = path.resolve(shimPackageDir, shimPackage[field]);

      expect(`${field}=${shimPackage[field]} resolves=${fs.existsSync(target)}`).toBe(
        `${field}=${shimPackage[field]} resolves=true`
      );
    }
  });
});

describe('plugins tree-shaking', () => {
  it('is available in the plugins subpath bundles for downstream tree-shaking', () => {
    // First-party plugins live in the dedicated `styled-components/plugins`
    // subpath, so they should be present in those bundles and only those.
    const pluginsESM = read('plugins.esm.js');
    const pluginsCJS = read('plugins.cjs.js');
    expect(pluginsESM).toContain('prefixPlugin');
    expect(pluginsCJS).toContain('prefixPlugin');
    expect(pluginsESM).toContain('rtlPlugin');
    expect(pluginsCJS).toContain('rtlPlugin');
  });

  it('is eliminated by webpack when unused', async () => {
    const { bundle } = await buildConsumerBundle({
      distDir,
      entrySource: `import styled from '${distDir}/styled-components.browser.esm.js';\nconsole.log(styled.div);\n`,
    });

    expect(bundle).not.toContain('prefixPlugin');
    expect(bundle).not.toContain('::-webkit-input-placeholder');
    expect(bundle).not.toContain('backdrop-filter');

    // Sanity: core styled-components code IS present
    expect(bundle.length).toBeGreaterThan(1000);
  }, 30000);
});

describe('per-plugin DCE from plugins subpath', () => {
  // Unique needles that survive minification. Exercise the hooks so terser
  // cannot constant-fold `.name` and drop the plugin body.
  const PREFIX_NEEDLE = '::-webkit-input-placeholder';
  const PREFIX_NEEDLE_B = 'backdrop-filter';
  const RTL_NEEDLE = 'border-top-left-radius';

  async function webpackBundle(entrySource: string): Promise<string> {
    const { bundle } = await buildConsumerBundle({ distDir, entrySource });

    return bundle;
  }

  it('keeps rtlPlugin and drops prefix when only rtl is imported', async () => {
    const bundle = await webpackBundle(
      [
        `import { rtlPlugin } from '${distDir}/plugins.esm.js';`,
        `console.log(rtlPlugin.name, rtlPlugin.decl && rtlPlugin.decl('padding-left','1px'));`,
      ].join('\n')
    );
    expect(bundle).toContain(RTL_NEEDLE);
    expect(bundle).not.toContain(PREFIX_NEEDLE);
    expect(bundle).not.toContain(PREFIX_NEEDLE_B);
  }, 30000);

  it('keeps prefixPlugin and drops rtl when only prefix is imported', async () => {
    const bundle = await webpackBundle(
      [
        `import { prefixPlugin } from '${distDir}/plugins.esm.js';`,
        `console.log(prefixPlugin.name, prefixPlugin.decl && prefixPlugin.decl('backdrop-filter','blur(1px)'), prefixPlugin.rw && prefixPlugin.rw('a::placeholder'));`,
      ].join('\n')
    );
    expect(bundle).toContain(PREFIX_NEEDLE);
    expect(bundle).toContain(PREFIX_NEEDLE_B);
    expect(bundle).not.toContain(RTL_NEEDLE);
  }, 30000);
});

/**
 * A package the consumer never lists resolves only when the install hoists it;
 * strict layouts (pnpm without hoisting, Yarn PnP) throw at runtime. Every
 * built JavaScript file may therefore reach only Node built-ins and packages
 * the library declares as dependencies or peers.
 */
describe('built bundles reach only declared packages', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
  ) as { dependencies?: object; peerDependencies?: object };
  const allowed = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...builtinModules,
  ]);
  /** The package's own name, which only the server build and the server component shim reach (the shim's `export ... from 'styled-components'`, the server build's import of `styled-components/server-styles`). */
  const ownName = 'styled-components';
  const mayReachOwnName = new Set([
    'server-styles.cjs.js',
    'server-styles.esm.js',
    'styled-components.cjs.js',
    'styled-components.esm.js',
  ]);
  const bareSpecifier =
    /\brequire\(["']([^"'./][^"']*)["']\)|(?:^|;)(?:import|export)\b[^;]*?\bfrom\s*["']([^"'./][^"']*)["']|(?:^|;)import\s*["']([^"'./][^"']*)["']/gm;
  const packageName = (id: string) =>
    id
      .replace(/^node:/, '')
      .split('/', id.startsWith('@') ? 2 : 1)
      .join('/');
  const reached = (source: string) =>
    new Set([...source.matchAll(bareSpecifier)].map(m => packageName(m[1] ?? m[2] ?? m[3])));

  /** Packages each entry must reach, proving the scan sees the bundle's imports. */
  const mustReach: Record<string, string[]> = {
    'plugins.cjs.js': [],
    'plugins.esm.js': [],
    'server-styles.cjs.js': [ownName],
    'server-styles.esm.js': [ownName],
    'styled-components.cjs.js': ['react', ownName],
    'styled-components.esm.js': ['react', ownName],
    'native/styled-components.js': ['react', 'react-native', 'react-native-web'],
    'native/styled-components.native.esm.js': ['react', 'react-native'],
    'native/styled-components.native.js': ['react', 'react-native'],
    'native/styled-components.native.reanimated.cjs.js': ['react', 'react-native-reanimated'],
    'native/styled-components.native.reanimated.esm.js': ['react', 'react-native-reanimated'],
    'native/styled-components.web.esm.js': ['react', 'react-native', 'react-native-web'],
    'native/styled-components.web.js': ['react', 'react-native', 'react-native-web'],
  };
  const bundles = [
    ...jsFiles(distDir).map(file => ({ file, source: () => read(file) })),
    ...jsFiles(nativeDistDir).map(file => ({
      file: `native/${file}`,
      source: () => readNative(file),
    })),
  ];

  it.each(bundles)('$file', ({ file, source }) => {
    const used = reached(source());
    const undeclared = [...used].filter(
      name => !allowed.has(name) && !(name === ownName && mayReachOwnName.has(file))
    );

    expect(undeclared).toEqual([]);
    expect([...used]).toEqual(expect.arrayContaining(mustReach[file] ?? ['react']));
  });
});

describe('bundle size', () => {
  // Ceilings sit just above the current figures so any regression trips here.
  // `pnpm --filter styled-components test:build` prints each live number.
  // v7 release targets to ratchet toward: standalone 12.0kB, webpack 10.5kB.
  // A prerelease stamps a much longer version than a PR build, so each ceiling measures
  // with a fixed-length version: a PR that passes here also passes when it publishes.
  it('standalone minified bundle stays under its gzip ceiling', () => {
    const zlib = require('zlib');
    const minified = read('styled-components.min.js');
    const gzipped = zlib.gzipSync(minified.replaceAll(version, '0.0.0'));
    const sizeKB = gzipped.length / 1024;

    console.log(`  styled-components.min.js: ${sizeKB.toFixed(2)}kB gzip`);

    expect(minified).toContain(version);

    // Carries every export, so this is the widest surface: the in-house parser,
    // arity-2 attrs tracing with its runtime fallback, and the server entry
    // points a consumer bundle would shake away. Holds the security fix that keeps
    // malformed CSS inside its statement, `createGlobalStyle` interpolations in render,
    // at-rules whose bodies are declaration blocks (`@view-transition`, `@page` margin boxes),
    // the automatic `view-transition-class` and chain-wide `container-name`, a namespace
    // joined onto root-anchored selectors, `keyframes` reading fragments and style objects the
    // way a styled template does, and the sheet's cascade order (wrappers after what they wrap,
    // tiers, contested pairs).
    expect(sizeKB).toBeLessThan(19.4);
  });
  it('production bundle size with real bundler tree-shaking', async () => {
    const zlib = require('zlib');

    const { bundle } = await buildConsumerBundle({ distDir });
    const gzipped = zlib.gzipSync(bundle.replaceAll(version, '0.0.0'));
    const sizeKB = gzipped.length / 1024;

    console.log(`  production bundle (webpack): ${sizeKB.toFixed(2)}kB gzip`);

    expect(bundle).toContain(version);

    // Verify unused exports are tree-shaken
    expect(bundle).not.toContain('WithTheme');
    expect(bundle).not.toContain('ServerStyleSheet');
    // The server component elements exist only for the server component graph.
    expect(bundle).not.toContain('ScStyle');
    expect(bundle).not.toContain('ScGlobalStyle');
    expect(bundle).not.toContain('isStyledComponent');
    // Plugins live on the `styled-components/plugins` subpath;no plugin
    // module code should leak into a main-entry import.
    expect(bundle).not.toContain('border-top-left-radius');
    expect(bundle).not.toContain('styled-components/plugins/rtl');

    // `styled.div` is synthesized on first access, so the element table does
    // not ship. A few camelCase SVG names remain in the shorthand shape
    // test; assert names that exist only in the dropped table.
    expect(bundle).not.toContain('blockquote');
    expect(bundle).not.toContain('feConvolveMatrix');
    expect(bundle).not.toContain('optgroup');
    // Control for the tag-name checks above: a string that IS present, proving
    // the probe reads a bundle it can actually match against.
    expect(bundle).toContain('sc-');

    // The in-house parser (Source, AST-direct emit, fragment splicing,
    // interpolation-sentinel gating) is reachable from any styled call, so it
    // dominates what survives here and cannot shake away. The ceiling includes
    // the global-style instance registry shared across colliding ids.
    // v6.4.1 for this same entry is 11.44kB gzip. Holds the security fix that keeps
    // malformed CSS inside its statement, `createGlobalStyle` interpolations in render,
    // at-rules whose bodies are declaration blocks (`@view-transition`, `@page` margin boxes),
    // the automatic `view-transition-class` and chain-wide `container-name`, a namespace
    // joined onto root-anchored selectors, `keyframes` reading fragments and style objects the
    // way a styled template does, and the sheet's cascade order, which every client sheet runs.
    expect(sizeKB).toBeLessThan(18.15);
  }, 30000);
});

/**
 * SES lockdown freezes every intrinsic, so `Object.prototype.toString` is
 * non-writable and a strict-mode `fn.toString = ...` throws. The check runs in
 * a child process because freezing the prototypes inside the Jest worker would
 * break the worker. The freeze runs before the bundles load, as lockdown does,
 * so module evaluation (the browser bundle's default sheet) runs frozen too.
 */
describe('built bundles under frozen intrinsics', () => {
  it('define keyframes, ServerStyleSheet, and styled components without assigning toString', () => {
    const { spawnSync } = require('child_process');
    const browserBundle = path.join(distDir, 'styled-components.browser.cjs.js');
    const serverBundle = path.join(distDir, 'styled-components.cjs.js');
    const script = `
      Object.freeze(Object.prototype);
      Object.freeze(Function.prototype);

      const browser = require(${JSON.stringify(browserBundle)});
      const server = require(${JSON.stringify(serverBundle)});

      const attempt = fn => {
        try {
          return { ok: fn() };
        } catch (error) {
          return { error: String(error && error.message) };
        }
      };
      const outcome = {};

      for (const [name, bundle] of [['browser', browser], ['server', server]]) {
        const fade = attempt(() => bundle.keyframes\`from{opacity:1}to{opacity:0}\`);

        outcome[name + ' keyframes'] = fade.error ? fade : { ok: typeof fade.ok.name === 'string' };
        // A keyframes object refuses string interpolation; the refusal proves the guard was installed.
        const refusal = fade.error ? fade : attempt(() => String(fade.ok));

        outcome[name + ' keyframes toString guard'] = refusal.error
          ? { error: refusal.error.split(String(fade.ok && fade.ok.name)).join('NAME') }
          : refusal;
        outcome[name + ' styled.div'] = attempt(
          () => typeof bundle.default.div\`color:red;\` === 'object'
        );
      }

      // An empty sheet emits no tags only when the sheet's toString runs;
      // Object's would yield "[object Object]".
      outcome['server ServerStyleSheet'] = attempt(
        () => new server.ServerStyleSheet().getStyleTags() === ''
      );

      console.log(JSON.stringify(outcome));
    `;

    // A development NODE_ENV makes the CJS bundles throw error 12's full text.
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'development' },
    });

    // Error 12 is the keyframes toString guard.
    const keyframesGuard = { error: errorMap[12].trim().replace('%s', 'NAME') };

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toEqual({
      status: 0,
      stderr: '',
      stdout:
        JSON.stringify({
          'browser keyframes': { ok: true },
          'browser keyframes toString guard': keyframesGuard,
          'browser styled.div': { ok: true },
          'server keyframes': { ok: true },
          'server keyframes toString guard': keyframesGuard,
          'server styled.div': { ok: true },
          'server ServerStyleSheet': { ok: true },
        }) + '\n',
    });
  });
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

  it('supports a default import from native Node ESM', () => {
    const os = require('os');
    const { spawnSync } = require('child_process');
    const pkgDir = path.resolve(__dirname, '../..');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-node-esm-'));

    try {
      fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });
      fs.symlinkSync(pkgDir, path.join(tmpDir, 'node_modules', 'styled-components'), 'dir');

      const script = [
        "import styled, { css } from 'styled-components';",
        "if (typeof styled !== 'function') throw new Error(`default export was ${typeof styled}`);",
        "if (typeof styled.h1 !== 'function') throw new Error('styled.h1 is unavailable');",
        "if (styled.default !== styled) throw new Error('styled.default does not point at styled');",
        "if (typeof css !== 'function') throw new Error('named css export is unavailable');",
        "console.log('ok');",
      ].join('\n');

      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: tmpDir,
        encoding: 'utf8',
      });

      expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toEqual({
        status: 0,
        stdout: 'ok\n',
        stderr: '',
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

/**
 * `files` includes `native`, and the workspace install puts the native
 * package's dependencies in `native/node_modules`, which would otherwise ship
 * to every consumer. The listing is a dry run, so nothing is written.
 */
describe('published package contents', () => {
  const { execFileSync } = require('child_process');
  const packageDir = path.resolve(__dirname, '../..');
  let packed: string[];

  beforeAll(() => {
    const listing: { files: { path: string }[] }[] = JSON.parse(
      execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        cwd: packageDir,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      })
    );
    packed = listing[0].files.map(file => file.path);
  });

  it('packs no node_modules path', () => {
    expect(packed.filter(file => file.includes('node_modules/'))).toEqual([]);
  });

  it('packs no repo-only test helpers', () => {
    expect(packed.filter(file => file.startsWith('test-utils/'))).toEqual([]);
  });

  it('packs the server component shim and its subpath redirector', () => {
    expect(packed).toEqual(
      expect.arrayContaining([
        'dist/server-styles.cjs.js',
        'dist/server-styles.d.ts',
        'dist/server-styles.esm.js',
        'server-styles/package.json',
      ])
    );
  });

  it('packs no shim declaration in the native package', () => {
    expect(
      packed.filter(file => file.startsWith('native/') && file.includes('server-styles'))
    ).toEqual([]);
  });

  it('still packs the native entry points', () => {
    expect(packed).toEqual(
      expect.arrayContaining([
        'native/package.json',
        'native/dist/styled-components.native.js',
        'native/reanimated/package.json',
        'native/web-bridge/package.json',
      ])
    );
  });
});
