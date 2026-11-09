/**
 * Behavior of the BUILT output in dist/ and native/dist/: the browser, plugins,
 * and server bundles (CommonJS and ES module), the rn-web bridge bundles, the
 * published type declarations, and the reanimated source map.
 *
 * The rest of the suite runs against src/. The dist bundles are minified with
 * property mangling on, so a bug can exist only there (a renamed property read
 * by string, a public name caught by the mangle list). Each bundle test loads a
 * fresh copy of the library so one test's styles never reach another's.
 *
 * Runs in `pnpm test:build` after a build; `jest.config.main.js` skips it
 * because dist/ may not exist.
 *
 * @jest-environment jsdom
 */
const path = require('path');

const distDir = path.resolve(__dirname, '../../dist');
const bridgeDir = path.resolve(__dirname, '../../native/dist');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Every name the minifier renames: the list `rollup.config.mjs` builds its mangle regex from. */
const {
  INTERNAL_PROPERTY_NAMES: mangledNames,
} = require('../../scripts/internalPropertyNames.cjs');

const CJS_BUNDLES = {
  browser: 'styled-components.browser.cjs.js',
  plugins: 'plugins.cjs.js',
  server: 'styled-components.cjs.js',
};

/**
 * What bundlers load through the `module` field. Jest's babel transform turns
 * these files into CommonJS on require, which is the least invasive way to run
 * them here without a jest config change or the experimental VM modules flag.
 */
const ESM_BUNDLES = {
  browser: 'styled-components.browser.esm.js',
  plugins: 'plugins.esm.js',
  server: 'styled-components.esm.js',
};

/**
 * Loads React and the built bundles together, fresh per call, so they share
 * one React. `files` names the bundle files in `dist/` (CommonJS by default).
 */
const load = (files = CJS_BUNDLES) => {
  let loaded;

  jest.isolateModules(() => {
    const React = require('react');
    const { createRoot } = require('react-dom/client');
    const { renderToString } = require('react-dom/server');

    loaded = {
      React,
      browser: require(path.join(distDir, files.browser)),
      createRoot,
      plugins: require(path.join(distDir, files.plugins)),
      renderToString,
      server: require(path.join(distDir, files.server)),
    };
  });

  return loaded;
};

const mount = ({ React, createRoot }, element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => createRoot(container).render(element));

  return container;
};

/**
 * One rule per entry, whitespace collapsed. Generated class names, component
 * ids and keyframe names are replaced by `c1`, `c2`, ... in order of first use,
 * except names passed in `known` (placeholder to real name), which keep their
 * placeholder so a test can assert which component a selector points at.
 */
const rulesOf = (css, known = {}) => {
  const placeholders = new Map(
    Object.entries(known).map(([placeholder, name]) => [name, placeholder])
  );
  const placeholderFor = name => {
    if (!placeholders.has(name))
      placeholders.set(name, `c${placeholders.size - Object.keys(known).length + 1}`);

    return placeholders.get(name);
  };

  return (
    css
      .split('/*!sc*/')
      .map(rule => rule.replace(/\s+/g, ' ').trim())
      // Drop the `data-styled` bookkeeping rules, whose content is a volatile hash
      .filter(rule => rule && !rule.startsWith('data-styled'))
      .map(rule =>
        rule
          .replace(
            /(@keyframes |animation: |container-name: )([A-Za-z][\w-]*)/g,
            (_, lead, name) => lead + placeholderFor(name)
          )
          .replace(/\.([A-Za-z_][\w-]*)/g, (_, name) => `.${placeholderFor(name)}`)
      )
  );
};

describe.each([
  ['CommonJS', CJS_BUNDLES],
  ['ES module', ESM_BUNDLES],
])('browser build (minified, %s)', (_, bundles) => {
  it('injects CSS for styled.div and renders styled.output as an <output>', () => {
    const lib = load(bundles);
    const { browser, React } = lib;
    const styled = browser.default;
    const Box = styled.div`color: red;`;
    const Out = styled.output`color: blue;`;

    const container = mount(
      lib,
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Box, { id: 'b' }),
        React.createElement(Out, { id: 'o' })
      )
    );

    expect(container.querySelector('#b').tagName).toBe('DIV');
    expect(container.querySelector('#o').tagName).toBe('OUTPUT');
    expect('output' in styled).toBe(true);
    expect(rulesOf(browser.extractCSS())).toEqual(['.c1 {color: red;}', '.c2 {color: blue;}']);
  });

  it('arity-2 attrs read the compiled declarations at render time', () => {
    const lib = load(bundles);
    const { browser, React } = lib;
    const Tint = browser.default.div.attrs((props, ast) => ({
      'data-tint': ast.pop('color', 'none'),
    }))`
      color: tomato;
      padding: 4px;
    `;

    const container = mount(lib, React.createElement(Tint, { id: 't' }));
    const el = container.querySelector('#t');

    expect(el.getAttribute('data-tint')).toBe('tomato');
    expect(el.style.color).toBe('unset');
  });

  it('emits keyframes, global style, css objects, theme values and nested wrappers', () => {
    const lib = load(bundles);
    const { browser, React } = lib;
    const styled = browser.default;
    const fade = browser.keyframes`from{opacity:1}to{opacity:0}`;
    const Global = browser.createGlobalStyle`body{margin:0}`;
    const mixin = browser.css({ paddingLeft: 3, '&:hover': { color: 'green' } });
    const Box = styled.div`
      ${mixin}
      ${() => ({ zIndex: 2, lineHeight: 1.5 })}
      animation: ${fade} 1s;
      background: ${props => props.theme.bg};
    `;
    const Link = styled(Box)`text-decoration: none;`;

    mount(
      lib,
      React.createElement(
        browser.ThemeProvider,
        { theme: { bg: 'pink' } },
        React.createElement(Global),
        React.createElement(Link, { id: 'l' })
      )
    );

    expect(rulesOf(browser.extractCSS())).toEqual([
      '@keyframes c1 { from {opacity: 1;} to {opacity: 0;} }',
      'body {margin: 0;}',
      '.c2 {padding-left: 3px; z-index: 2; line-height: 1.5; animation: c1 1s; background: pink;}',
      '.c2:hover {color: green;}',
      '.c3 {text-decoration: none;}',
    ]);
  });

  it('applies a plugin from the plugins bundle together with a namespace', () => {
    const lib = load(bundles);
    const { browser, plugins, React } = lib;
    const Box = browser.default.div`padding-left: 1px;`;

    mount(
      lib,
      React.createElement(
        browser.StyleSheetManager,
        { plugins: [plugins.rtlPlugin], namespace: '#app' },
        React.createElement(Box, { id: 'r' })
      )
    );

    expect(rulesOf(browser.extractCSS())).toEqual(['#app .c1 {padding-right: 1px;}']);
  });

  it('composes declaration and selector rewrites from two plugins in the plugins bundle', () => {
    const lib = load(bundles);
    const { browser, plugins, React } = lib;
    const Box = browser.default.div`
      padding-left: 1px;
      user-select: none;
      &::placeholder { color: red; }
    `;

    mount(
      lib,
      React.createElement(
        browser.StyleSheetManager,
        { plugins: [plugins.prefixPlugin, plugins.rtlPlugin] },
        React.createElement(Box)
      )
    );

    expect(rulesOf(browser.extractCSS())).toEqual([
      '.c1 {padding-right: 1px; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;}',
      '.c1::-webkit-input-placeholder {color: red;}',
      '.c1::-moz-placeholder {color: red;}',
      '.c1:-ms-input-placeholder {color: red;}',
      '.c1::placeholder {color: red;}',
    ]);
  });

  it('resolves component selectors, self-reference and the container name', () => {
    const lib = load(bundles);
    const { browser, React } = lib;
    const styled = browser.default;
    const A = styled.div`color: red;`;
    const B = styled.div`
      container-type: inline-size;
      ${A} + & { margin: 1px; }
      & + & { margin: 2px; }
    `;

    mount(
      lib,
      React.createElement(
        React.Fragment,
        null,
        React.createElement(A),
        React.createElement(B),
        React.createElement(B)
      )
    );

    expect(
      rulesOf(browser.extractCSS(), { A: A.styledComponentId, B: B.styledComponentId })
    ).toEqual([
      '.c1 {color: red;}',
      '.c2 {container-type: inline-size; container-name: B;}',
      '.A+.c2 {margin: 1px;}',
      '.B+.B {margin: 2px;}',
    ]);
  });

  it('serializes the same rules from the sheet and from extractCSS', () => {
    const lib = load(bundles);
    const { browser, React } = lib;
    const Box = browser.default.div`color: red;`;

    mount(lib, React.createElement(Box));

    expect(rulesOf(String(browser.__PRIVATE__.mainSheet))).toEqual(['.c1 {color: red;}']);
    expect(rulesOf(browser.extractCSS())).toEqual(['.c1 {color: red;}']);
  });
});

describe('server build (minified)', () => {
  it('collects styles with ServerStyleSheet and keeps mainSheet.toString()', () => {
    const { React, renderToString, server } = load();
    const sheet = new server.ServerStyleSheet();
    const Box = server.default.div`color: red;`;

    const html = renderToString(sheet.collectStyles(React.createElement(Box, null, 'x')));

    expect(html.replace(/class="[^"]*"/, 'class="…"')).toBe('<div class="…">x</div>');
    // One <style> tag holding every rule.
    const [, styleBody] = sheet.getStyleTags().match(/^<style[^>]*>([^<]*)<\/style>$/) ?? [];
    expect(rulesOf(styleBody ?? '')).toEqual(['.c1{color:red;}']);
    expect(typeof server.__PRIVATE__.mainSheet.toString).toBe('function');
    expect(server.__PRIVATE__.mainSheet.toString()).not.toBe('[object Object]');
    expect(server.__PRIVATE__.mainSheet.names instanceof Map).toBe(true);
  });

  it('applies plugins from the plugins bundle to server-rendered rules', () => {
    const { plugins, React, renderToString, server } = load();
    const sheet = new server.ServerStyleSheet();
    const Box = server.default.div`
      padding-left: 1px;
      &::placeholder { color: red; }
    `;

    renderToString(
      sheet.collectStyles(
        React.createElement(
          server.StyleSheetManager,
          { plugins: [plugins.prefixPlugin, plugins.rtlPlugin] },
          React.createElement(Box)
        )
      )
    );

    const [, styleBody] = sheet.getStyleTags().match(/^<style[^>]*>([^<]*)<\/style>$/) ?? [];
    expect(rulesOf(styleBody ?? '')).toEqual([
      '.c1{padding-right:1px;}',
      '.c1::-webkit-input-placeholder{color:red;}',
      '.c1::-moz-placeholder{color:red;}',
      '.c1:-ms-input-placeholder{color:red;}',
      '.c1::placeholder{color:red;}',
    ]);
  });
});

/** Renders into the sheet the way the bundle's own environment does: a DOM mount in the browser build, a string render in the server build. */
const renderWith = (lib, key, element) =>
  key === 'server' ? lib.renderToString(element) : mount(lib, element);

describe.each([
  ['browser CommonJS', CJS_BUNDLES, 'browser', '.c1 {color: red;}'],
  ['browser ES module', ESM_BUNDLES, 'browser', '.c1 {color: red;}'],
  ['server CommonJS', CJS_BUNDLES, 'server', '.c1{color:red;}'],
  ['server ES module', ESM_BUNDLES, 'server', '.c1{color:red;}'],
])('ecosystem contract (minified, %s)', (_, bundles, key, registryRule) => {
  // jest-styled-components 7.4.0 (src/utils.js) resets and reads the sheet through these members.
  it('jest-styled-components reset sequence leaves only the next render in the sheet', () => {
    const lib = load(bundles);
    const { React } = lib;
    const { __PRIVATE__, default: styled } = lib[key];
    const { mainSheet, masterSheet } = __PRIVATE__;
    const sheet = mainSheet || masterSheet;
    const First = styled.div`color: red;`;
    const Second = styled.div`color: blue;`;

    renderWith(lib, key, React.createElement(First));

    expect(rulesOf(sheet.toString())).toEqual(['.c1 {color: red;}']);

    sheet.gs = {};
    sheet.names = new Map();
    sheet.clearTag();

    expect(rulesOf(sheet.toString())).toEqual([]);

    renderWith(lib, key, React.createElement(Second));

    expect(rulesOf(sheet.toString())).toEqual(['.c1 {color: blue;}']);
  });

  it('jest-styled-components reset makes a component rendered before it inject again', () => {
    const lib = load(bundles);
    const { React } = lib;
    const { __PRIVATE__, default: styled } = lib[key];
    const { mainSheet, masterSheet } = __PRIVATE__;
    const sheet = mainSheet || masterSheet;
    const Box = styled.div`color: red;`;

    renderWith(lib, key, React.createElement(Box));
    sheet.gs = {};
    sheet.names = new Map();
    sheet.clearTag();
    renderWith(lib, key, React.createElement(Box));

    expect(rulesOf(sheet.toString())).toEqual(['.c1 {color: red;}']);
  });

  // The documented Next.js App Router registry: collect, read the tags, then clear for the next request.
  it('Next.js registry pattern reads the rendered rules and clears the sheet', () => {
    const lib = load(bundles);
    const { React, renderToString } = lib;
    const { default: styled, ServerStyleSheet, StyleSheetManager } = lib[key];
    const Box = styled.div`color: red;`;
    const sheet = new ServerStyleSheet();

    renderToString(
      React.createElement(StyleSheetManager, { sheet: sheet.instance }, React.createElement(Box))
    );

    expect(
      sheet.getStyleElement().map(element => rulesOf(element.props.dangerouslySetInnerHTML.__html))
    ).toEqual([[registryRule]]);

    sheet.instance.clearTag();

    expect(sheet.getStyleElement()).toEqual([]);
  });
});

describe('styled() over foreign component shapes (minified)', () => {
  const shapes = {
    forwardRef: {
      $$typeof: Symbol.for('react.forward_ref'),
      render: () => null,
      foo: 1,
      compare: 1,
      contextType: 1,
    },
    lazy: {
      $$typeof: Symbol.for('react.lazy'),
      _payload: 1,
      foo: 1,
      contextType: 1,
      type: 1,
      defaultProps: 1,
      displayName: 'L',
    },
    memo: {
      $$typeof: Symbol.for('react.memo'),
      type: () => null,
      compare: null,
      foo: 1,
      contextType: 1,
      render: 1,
    },
    plain: Object.assign(() => null, {
      foo: 1,
      toString: () => 'x',
      defaultProps: {},
      contextType: {},
      render: 1,
      compare: 1,
      type: 1,
      getDerivedStateFromProps: 1,
    }),
  };

  // A static counts as hoisted when the wrapper has a key that a wrapper over an
  // empty component lacks. React's own statics for the target's shape stay
  // behind, and the wrapper's own keys (some mangled) cancel out of the diff.
  test.each([
    ['forwardRef', ['contextType', 'foo']],
    ['lazy', ['_payload', 'contextType', 'foo']],
    ['memo', ['contextType', 'foo', 'render']],
    ['plain', ['foo', 'render']],
  ])('%s target: hoists only the non-React statics', (shape, expected) => {
    const { default: styled } = load().browser;
    const ownKeys = Object.keys(styled(() => null)`color: red;`);

    const hoisted = Object.keys(styled(shapes[shape])`color: red;`).filter(
      key => !ownKeys.includes(key)
    );

    expect(hoisted.sort()).toEqual(expected);
  });
});

describe('published type declarations', () => {
  const fs = require('fs');
  const packageDir = path.resolve(__dirname, '../..');

  const ts = require('typescript');

  const DECLARED_MEMBER_KINDS = [
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.MethodSignature,
    ts.SyntaxKind.PropertyDeclaration,
    ts.SyntaxKind.PropertySignature,
    ts.SyntaxKind.SetAccessor,
  ];

  const USED_PROPERTY_KINDS = [
    ...DECLARED_MEMBER_KINDS,
    ts.SyntaxKind.BindingElement,
    ts.SyntaxKind.PropertyAccessExpression,
    ts.SyntaxKind.PropertyAssignment,
    ts.SyntaxKind.ShorthandPropertyAssignment,
  ];

  /** Names of every node of the given kinds in one file, found by parsing rather than by text matching. */
  const propertyNames = (file, kinds) => {
    const found = new Set();
    const visit = node => {
      if (kinds.includes(node.kind)) {
        const name = node.kind === ts.SyntaxKind.BindingElement ? node.propertyName : node.name;

        if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name))) found.add(name.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true));

    return found;
  };

  const declarationFiles = dir =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(dir, entry.name);

      if (entry.isDirectory()) return declarationFiles(file);

      return file.endsWith('.d.ts') ? [file] : [];
    });

  it('declare no mangled property name as a member or field', () => {
    const names = mangledNames;
    const files = [
      ...declarationFiles(distDir),
      ...declarationFiles(path.join(packageDir, 'native/dist')),
    ];
    const offenders = [];

    // A consumer would see the declared member, type-check, then read `undefined` from the minified bundle.
    expect(names.length).toBeGreaterThan(0);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      for (const name of propertyNames(file, DECLARED_MEMBER_KINDS)) {
        if (names.includes(name)) offenders.push(`${path.relative(packageDir, file)}: ${name}`);
      }
    }

    expect(offenders.sort()).toEqual([]);
  });

  // The reanimated bundle is minified apart from the native bundle that hands it keyframes and
  // easings, so each bundle would rename a shared field differently.
  it('reanimated bundle sources use no mangled property name', () => {
    const names = mangledNames;
    const map = JSON.parse(
      fs.readFileSync(
        path.join(packageDir, 'native/dist/styled-components.native.reanimated.cjs.js.map'),
        'utf8'
      )
    );
    const offenders = [];

    expect(map.sources.length).toBeGreaterThan(0);

    for (const source of map.sources) {
      const file = path.join(packageDir, source.slice(source.indexOf('src/')));

      for (const name of propertyNames(file, USED_PROPERTY_KINDS)) {
        if (names.includes(name)) offenders.push(`${path.relative(packageDir, file)}: ${name}`);
      }
    }

    expect(offenders.sort()).toEqual([]);
  });
});

// The plugins bundle and each main bundle are minified apart, so a field one renames
// and the other reads by its source spelling breaks every plugin silently.
describe('plugin API boundary (minified)', () => {
  const fs = require('fs');
  const ts = require('typescript');

  const PLUGIN_TYPES = ['DeclResult', 'DeclTransform', 'SCPlugin', 'SelectorTransform'];

  /** Property names declared anywhere inside the named types of a declaration file. */
  const fieldsOf = (file, typeNames) => {
    const found = new Set();
    const visit = (node, inside) => {
      const entered =
        inside ||
        ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
          typeNames.includes(node.name.text));

      if (entered && ts.isPropertySignature(node) && ts.isIdentifier(node.name))
        found.add(node.name.text);

      ts.forEachChild(node, child => visit(child, entered));
    };

    visit(ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true));

    return [...found].sort();
  };

  it('the plugins entry exports exactly the types this check derives fields from', () => {
    const entry = ts.createSourceFile(
      'index.d.ts',
      fs.readFileSync(path.join(distDir, 'plugins/index.d.ts'), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const exported = entry.statements
      .filter(statement => ts.isExportDeclaration(statement) && statement.isTypeOnly)
      .flatMap(statement => statement.exportClause.elements.map(element => element.name.text));

    expect(exported.sort()).toEqual(PLUGIN_TYPES);
  });

  it('no field of an object crossing the plugin API is a mangled property name', () => {
    const fields = fieldsOf(path.join(distDir, 'utils/compiler.d.ts'), PLUGIN_TYPES);

    expect(fields).toEqual(['decl', 'name', 'prop', 'rw', 'value']);
    expect(fields.filter(field => mangledNames.includes(field))).toEqual([]);
  });

  it('plugins from the plugins bundle expose and return only the declared fields', () => {
    const { plugins } = load();

    expect(Object.keys(plugins.prefixPlugin).sort()).toEqual(['decl', 'name', 'rw']);
    expect(Object.keys(plugins.rtlPlugin).sort()).toEqual(['decl', 'name']);
    expect(plugins.prefixPlugin.decl('user-select', 'none')).toEqual([
      { prop: '-webkit-user-select', value: 'none' },
      { prop: '-moz-user-select', value: 'none' },
      { prop: '-ms-user-select', value: 'none' },
      { prop: 'user-select', value: 'none' },
    ]);
    expect(plugins.rtlPlugin.decl('padding-left', '1px')).toEqual({
      prop: 'padding-right',
      value: '1px',
    });
  });
});

// The rn-web bridge is its own minified bundle built from the web pipeline; it shares
// the plugin API with the plugins bundle through its StyleSheetManager.
describe('web bridge build (minified)', () => {
  const bridgeFiles = [
    ['styled-components.web.js'],
    ['styled-components.js'],
    ['styled-components.web.esm.js'],
  ];

  test.each(bridgeFiles)('%s applies a plugin from the plugins bundle', file => {
    let loaded;

    // Sheets from earlier tests live in the shared document and would repeat their rules.
    document.head.replaceChildren();
    document.body.replaceChildren();

    jest.isolateModules(() => {
      loaded = {
        bridge: require(path.join(bridgeDir, file)),
        plugins: require(path.join(distDir, CJS_BUNDLES.plugins)),
        React: require('react'),
        createRoot: require('react-dom/client').createRoot,
      };
    });

    const { bridge, plugins, React } = loaded;
    const Box = bridge.default.View`padding-left: 1px;`;

    const container = mount(
      loaded,
      React.createElement(
        bridge.StyleSheetManager,
        { plugins: [plugins.rtlPlugin] },
        React.createElement(Box)
      )
    );

    // react-native-web adds its own base rules for the host View, so read only the physical-side padding rules.
    const classes = [...container.firstChild.classList];
    const ownRules = [...document.querySelectorAll('style')]
      .flatMap(style => [...(style.sheet?.cssRules ?? [])])
      .filter(rule => classes.some(name => rule.selectorText === `.${name}`))
      .map(rule => rule.cssText)
      .filter(cssText => /padding-(left|right)/.test(cssText));

    expect(rulesOf(ownRules.join('/*!sc*/'))).toEqual(['.c1 {padding-right: 1px;}']);
  });
});

// The server build renders `ScStyle` and `ScGlobalStyle`, which a server component host only
// reaches through the `'use client'` shim. Each bundle is minified apart, so the shim, the
// server build and the browser build must agree on every name and wire prop by source spelling.
describe('server component shim (minified)', () => {
  /** Props of `ScStyle` and `ScGlobalStyle` as the server component payload carries them (docs/react.md). */
  const WIRE_PROPS = ['chain', 'id', 'keyframes', 'outers', 'rules', 'seq'];

  /** The server build serves the RSC graph, the browser build the browser graph. */
  const loadBuilt = graph =>
    require(path.join(distDir, graph === 'browser' ? CJS_BUNDLES.browser : CJS_BUNDLES.server));

  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  test.each([
    ['CommonJS', 'server-styles.cjs.js'],
    ['ES module', 'server-styles.esm.js'],
  ])('%s shim re-exports the package entry elements by identity', (_, file) => {
    let loaded;

    jest.isolateModules(() => {
      loaded = {
        main: require('styled-components'),
        shim: require(path.join(distDir, file)),
      };
    });

    expect(typeof loaded.main.ScStyle).toBe('function');
    expect(typeof loaded.main.ScGlobalStyle).toBe('function');
    expect(loaded.shim.ScStyle).toBe(loaded.main.ScStyle);
    expect(loaded.shim.ScGlobalStyle).toBe(loaded.main.ScGlobalStyle);
  });

  it('resolves the package name and the subpath to the built files', () => {
    expect(require.resolve('styled-components')).toBe(
      path.join(distDir, 'styled-components.cjs.js')
    );
    expect(require.resolve('styled-components/server-styles')).toBe(
      path.join(distDir, 'server-styles.cjs.js')
    );
  });

  it('keeps the elements and their wire props out of the mangle list', () => {
    const { browser, server } = load();

    expect(typeof server.ScStyle).toBe('function');
    expect(typeof browser.ScStyle).toBe('function');
    expect(WIRE_PROPS.filter(name => mangledNames.includes(name))).toEqual([]);
  });

  it('renders a server component page into the browser sheet in cascade order', async () => {
    const { renderInBrowser } = require('./rscStream');

    const { container, flight, graph } = await renderInBrowser({
      loadLibrary: loadBuilt,
      server: ({ library, react }) => {
        const Base = library.default.div`color: blue;`;
        const Extended = library.default(Base)`color: red;`;

        return react.createElement(Extended, { id: 'probe' });
      },
    });

    expect(flight.errors).toEqual([]);
    expect(container.querySelector('#probe')).not.toBeNull();
    expect(rulesOf(graph.library.extractCSS())).toEqual([
      '.c1 {color: blue;}',
      '.c2 {color: red;}',
    ]);
  });
});
