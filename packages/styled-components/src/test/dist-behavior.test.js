/**
 * Behavior of the BUILT output in dist/ and native/dist/: the browser, plugins,
 * and server CJS bundles, the published type declarations, and the reanimated
 * source map.
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

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Loads React and the built bundles together, fresh per call, so they share one React. */
const load = () => {
  let loaded;

  jest.isolateModules(() => {
    const React = require('react');
    const { createRoot } = require('react-dom/client');
    const { renderToString } = require('react-dom/server');

    loaded = {
      React,
      browser: require(path.join(distDir, 'styled-components.browser.cjs.js')),
      createRoot,
      plugins: require(path.join(distDir, 'plugins.cjs.js')),
      renderToString,
      server: require(path.join(distDir, 'styled-components.cjs.js')),
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

describe('browser build (minified)', () => {
  it('injects CSS for styled.div and renders styled.output as an <output>', () => {
    const lib = load();
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
    const lib = load();
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
    const lib = load();
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
    const lib = load();
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

  it('resolves component selectors, self-reference and the container name', () => {
    const lib = load();
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
    const lib = load();
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

  /** Every name the minifier renames: the list `rollup.config.mjs` builds its mangle regex from. */
  const {
    INTERNAL_PROPERTY_NAMES: mangledNames,
  } = require('../../scripts/internalPropertyNames.cjs');

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
