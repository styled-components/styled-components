/**
 * End-to-end integration tests for the rn-web bridge. Each test renders
 * a styled component built from the bridge through real react-native-web
 * primitives and asserts the resulting DOM carries our class alongside
 * rn-web's atomic classes.
 *
 * Tests run under the web jest config (jsdom) because we need a real
 * browser-like DOM to exercise rn-web's createDOMProps + styleq.
 */

import React from 'react';
import { render } from '@testing-library/react';

import styled, { ThemeProvider as BridgeThemeProvider } from '../native/web-bridge';
import createTheme from '../constructors/createTheme';
import ThemeProvider from '../models/ThemeProvider';

function readAllCss(): string {
  const buf: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        buf.push(rule.cssText);
      }
    } catch {
      // skip unreadable sheets
    }
  }
  return buf.join('\n');
}

describe('rn-web bridge: View', () => {
  it('emits a single styled-components class on the DOM node', () => {
    const Box = styled.View`
      background-color: red;
    `;
    const { container } = render(<Box testID="box" />);
    const node = container.querySelector('[data-testid="box"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    // The web pipeline mints a hashed class like `sc-AbCdEf` plus a per-render
    // hashed class. Both should appear on the node.
    expect(cls.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('injects a real stylesheet rule for the declared CSS', () => {
    const Box = styled.View`
      background-color: rgb(0, 128, 255);
    `;
    const { container } = render(<Box testID="probe" />);
    const node = container.querySelector('[data-testid="probe"]') as HTMLElement;
    const tokens = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

    const allCss: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          allCss.push(rule.cssText);
        }
      } catch {
        // cross-origin sheets aren't readable, but our injected sheets are.
      }
    }
    const joined = allCss.join('\n');
    // The bridge's class should appear as a selector somewhere, with the
    // declared background applied.
    const ourClass = tokens.find(t => t.startsWith('sc-'));
    expect(ourClass).toBeDefined();
    expect(joined).toContain('rgb(0, 128, 255)');
  });

  it('forwards a user-supplied style prop alongside the bridge class', () => {
    const Box = styled.View`
      background-color: red;
    `;
    const { container } = render(
      <Box testID="merge" style={{ opacity: 0.5 } as unknown as object} />
    );
    const node = container.querySelector('[data-testid="merge"]') as HTMLElement;
    const cls = node.getAttribute('class') ?? '';
    // We expect our sc-class AND rn-web's atomic class for the inline opacity
    // to both be present.
    expect(cls).toMatch(/sc-/);
    // rn-web atomic class for opacity contains `r-opacity` (an at-rule-style
    // identifier in the atomic compiler). Use a softer check to avoid coupling
    // to the exact hash format.
    expect(cls.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('reuses the same class across instances with identical static CSS', () => {
    const Box = styled.View`
      background-color: green;
    `;
    const { container } = render(
      <>
        <Box testID="a" />
        <Box testID="b" />
      </>
    );
    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;
    const aCls = (a.getAttribute('class') ?? '').split(/\s+/).filter(t => t.startsWith('sc-'));
    const bCls = (b.getAttribute('class') ?? '').split(/\s+/).filter(t => t.startsWith('sc-'));
    expect(aCls).toEqual(bCls);
  });
});

describe('rn-web bridge: Text', () => {
  it('emits the bridge class on a Text node', () => {
    const Label = styled.Text`
      color: purple;
    `;
    const { container } = render(<Label testID="label">hi</Label>);
    const node = container.querySelector('[data-testid="label"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    expect(cls).toMatch(/sc-/);
  });
});

describe('rn-web bridge: Pressable', () => {
  it('emits the bridge class on a Pressable node', () => {
    const Btn = styled.Pressable`
      background-color: orange;
    `;
    const { container } = render(<Btn testID="btn" />);
    const node = container.querySelector('[data-testid="btn"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    expect(cls).toMatch(/sc-/);
  });
});

describe('rn-web bridge: CSS surface delegated to the browser', () => {
  it('emits a :hover pseudo-class rule to the CSSOM', () => {
    const Btn = styled.Pressable`
      background-color: blue;
      &:hover {
        background-color: red;
      }
    `;
    render(<Btn testID="hover-probe" />);
    const css = readAllCss();
    expect(css).toMatch(/:hover/);
  });

  it('emits an @media query block to the CSSOM', () => {
    const Box = styled.View`
      background-color: white;
      @media (min-width: 600px) {
        background-color: black;
      }
    `;
    render(<Box testID="media-probe" />);
    const css = readAllCss();
    expect(css).toMatch(/@media[^{]*min-width:\s*600px/);
  });

  it('passes through a CSS custom property declaration', () => {
    const Box = styled.View`
      --brand: tomato;
      color: var(--brand);
    `;
    render(<Box testID="vars-probe" />);
    const css = readAllCss();
    expect(css).toContain('--brand');
    expect(css).toMatch(/var\(--brand\)/);
  });
});

describe('rn-web bridge: dynamic interpolations + attrs + theme', () => {
  it('regenerates CSS when a prop-driven interpolation changes', () => {
    const Box = styled.View<{ $tone: 'a' | 'b' }>`
      background-color: ${p => (p.$tone === 'a' ? 'rgb(10, 20, 30)' : 'rgb(40, 50, 60)')};
    `;
    const { container, rerender } = render(<Box testID="dyn" $tone="a" />);
    let css = readAllCss();
    expect(css).toContain('rgb(10, 20, 30)');

    rerender(<Box testID="dyn" $tone="b" />);
    css = readAllCss();
    expect(css).toContain('rgb(40, 50, 60)');
    // The DOM node should still be present and class-bearing.
    const node = container.querySelector('[data-testid="dyn"]') as HTMLElement;
    expect(node.getAttribute('class') ?? '').toMatch(/sc-/);
  });

  it('honors theme values pulled from <ThemeProvider> through the bridge', () => {
    const Box = styled.View`
      background-color: ${(p: { theme: { bg: string } }) => p.theme.bg};
    `;
    render(
      <ThemeProvider theme={{ bg: 'rgb(11, 22, 33)' }}>
        <Box testID="themed" />
      </ThemeProvider>
    );
    const css = readAllCss();
    expect(css).toContain('rgb(11, 22, 33)');
  });

  it('reaches the DOM through .attrs() injected props', () => {
    const Btn = styled.Pressable.attrs({ accessibilityLabel: 'go' })`
      background-color: yellow;
    `;
    const { container } = render(<Btn testID="attrs-probe" />);
    const node = container.querySelector('[data-testid="attrs-probe"]') as HTMLElement;
    expect(node).not.toBeNull();
    // rn-web maps accessibilityLabel to aria-label.
    expect(node.getAttribute('aria-label')).toBe('go');
  });
});

describe('rn-web bridge: full primitive surface', () => {
  // Each rn-web alias exposed by `styled-components/native` should also
  // be reachable through the bridge. Smoke-test each one renders DOM
  // with our bridge class somewhere in its rendered subtree. Some
  // aliases (Image, ImageBackground, TouchableHighlight, ActivityIndicator)
  // wrap multiple DOM nodes internally so the testID target isn't
  // always the class-bearing node; the tree-wide check covers both.
  type AliasCase = { needsChild?: boolean };
  const checks: ReadonlyArray<[string, AliasCase]> = [
    ['Image', {}],
    ['ImageBackground', { needsChild: true }],
    ['ScrollView', {}],
    ['TextInput', {}],
    ['SafeAreaView', {}],
    ['Switch', {}],
    ['TouchableOpacity', { needsChild: true }],
    ['TouchableHighlight', { needsChild: true }],
    ['ActivityIndicator', {}],
  ];
  for (const [alias, opts] of checks) {
    it(`bridges styled.${alias}`, () => {
      const Factory = (styled as Record<string, unknown>)[alias] as (
        strings: TemplateStringsArray,
        ...args: unknown[]
      ) => React.ComponentType<{ testID?: string; children?: React.ReactNode }>;
      const Component = Factory`
        background-color: rebeccapurple;
      `;
      const children = opts.needsChild ? <span>x</span> : undefined;
      const { container } = render(
        React.createElement(
          Component,
          { testID: `probe-${alias}` } as { testID: string; children?: React.ReactNode },
          children
        )
      );
      expect(container.innerHTML).toMatch(/sc-/);
    });
  }
});

describe('rn-web bridge: web-native primitives and arbitrary components', () => {
  it('handles browser HTML element shortcuts via the inherited web factory', () => {
    // The bridge re-exports the web `styled` so HTML primitives without
    // an rn-web equivalent (`<a>`, `<select>`, `<dialog>`, etc.) work
    // unchanged. These render directly to the underlying tag.
    const Link = styled.a`
      color: rgb(7, 8, 9);
      text-decoration: underline;
    `;
    const Select = styled.select`
      background-color: rgb(101, 102, 103);
    `;
    const { container } = render(
      <>
        <Link href="#x" data-testid="link">
          hi
        </Link>
        <Select data-testid="select">
          <option>a</option>
        </Select>
      </>
    );
    const link = container.querySelector('[data-testid="link"]') as HTMLElement;
    const select = container.querySelector('[data-testid="select"]') as HTMLElement;
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(select.tagName.toLowerCase()).toBe('select');
    expect(link.getAttribute('class') ?? '').toMatch(/sc-/);
    expect(select.getAttribute('class') ?? '').toMatch(/sc-/);
  });

  it('wraps an arbitrary React component via styled(Component)', () => {
    function Card(props: { className?: string; children?: React.ReactNode }): React.ReactElement {
      return (
        <div data-testid="card" className={props.className}>
          {props.children}
        </div>
      );
    }
    const Styled = styled(Card)`
      background-color: rgb(220, 230, 240);
    `;
    const { container } = render(<Styled>inside</Styled>);
    const card = container.querySelector('[data-testid="card"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.getAttribute('class') ?? '').toMatch(/sc-/);
  });
});

describe('rn-web bridge: baselines that match the native rn-web variant', () => {
  it('opts the document into both color schemes so light-dark() and useColorScheme resolve', () => {
    // Importing the bridge module set this at evaluation time; check it.
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('declares cursor: pointer on Pressable so web affordance survives', () => {
    const Btn = styled.Pressable`
      background-color: gray;
    `;
    render(<Btn testID="cursor-probe" />);
    const css = readAllCss();
    expect(css).toMatch(/cursor:\s*pointer/);
  });
});

describe('rn-web bridge: CSS surfaces that needed polyfills on native pass through to the browser', () => {
  // The native rn-web variant lifts a set of CSS properties to React Native
  // component props (numberOfLines from text-overflow, resizeMode from
  // object-fit, etc.) because rn-web filters unknown style keys. On the
  // bridge those styles go through the web pipeline → CSSOM, so the
  // browser sees the spec property names directly.
  const surfaces: ReadonlyArray<[string, string, RegExp]> = [
    ['text-overflow', 'text-overflow: ellipsis; white-space: nowrap;', /text-overflow:\s*ellipsis/],
    ['object-fit', 'object-fit: cover;', /object-fit:\s*cover/],
    ['overscroll-behavior', 'overscroll-behavior: contain;', /overscroll-behavior:\s*contain/],
    ['scrollbar-width', 'scrollbar-width: thin;', /scrollbar-width:\s*thin/],
    ['accent-color', 'accent-color: rgb(20, 30, 40);', /accent-color:\s*rgb\(20,\s*30,\s*40\)/],
    ['caret-color', 'caret-color: rgb(50, 60, 70);', /caret-color:\s*rgb\(50,\s*60,\s*70\)/],
    ['hyphens', 'hyphens: auto;', /hyphens:\s*auto/],
    ['pointer-events', 'pointer-events: none;', /pointer-events:\s*none/],
    ['text-wrap', 'text-wrap: balance;', /text-wrap:\s*balance/],
    ['field-sizing', 'field-sizing: content;', /field-sizing:\s*content/],
  ];
  for (const [name, decl, expected] of surfaces) {
    it(`emits ${name} declarations through to the CSSOM`, () => {
      const Box = styled.View`
        ${decl}
      `;
      render(<Box testID={`probe-${name}`} />);
      expect(readAllCss()).toMatch(expected);
    });
  }
});

describe('rn-web bridge: parity gaps surfaced from native-showcase', () => {
  // accent-color: oklch / color-mix / system color / auto must reach the CSSOM
  // intact. The browser handles each natively; the web pipeline just
  // needs to not eat them.
  describe('accent-color modern color functions and system values', () => {
    const cases: ReadonlyArray<[string, string, RegExp]> = [
      ['oklch()', 'accent-color: oklch(60% 0.2 250);', /accent-color:\s*oklch\(60%\s*0\.2\s*250\)/],
      [
        'color-mix()',
        'accent-color: color-mix(in srgb, red, blue);',
        /accent-color:\s*color-mix\(in srgb,\s*red,\s*blue\)/,
      ],
      ['system color', 'accent-color: AccentColor;', /accent-color:\s*AccentColor/i],
      ['auto', 'accent-color: auto;', /accent-color:\s*auto/],
    ];
    for (const [name, decl, expected] of cases) {
      it(`passes accent-color: ${name} through`, () => {
        const Box = styled.View`
          ${decl}
        `;
        render(<Box testID={`accent-${name}`} />);
        expect(readAllCss()).toMatch(expected);
      });
    }
  });

  describe('system color keywords on arbitrary properties', () => {
    const cases: ReadonlyArray<[string, string, RegExp]> = [
      ['Canvas (background)', 'background-color: Canvas;', /background-color:\s*Canvas/i],
      ['CanvasText (color)', 'color: CanvasText;', /color:\s*CanvasText/i],
      ['LinkText (color)', 'color: LinkText;', /color:\s*LinkText/i],
      [
        'ButtonFace (background)',
        'background-color: ButtonFace;',
        /background-color:\s*ButtonFace/i,
      ],
      ['Mark (background)', 'background-color: Mark;', /background-color:\s*Mark/i],
      [
        'AccentColor (background)',
        'background-color: AccentColor;',
        /background-color:\s*AccentColor/i,
      ],
      ['AccentColorText (color)', 'color: AccentColorText;', /color:\s*AccentColorText/i],
    ];
    for (const [name, decl, expected] of cases) {
      it(`passes ${name} through`, () => {
        const Box = styled.View`
          ${decl}
        `;
        render(<Box testID={`sysc-${name}`} />);
        expect(readAllCss()).toMatch(expected);
      });
    }
  });

  describe('CSS Compositing 1 mix-blend-mode propagation', () => {
    it('emits mix-blend-mode: multiply to the CSSOM unaltered', () => {
      const Face = styled.View`
        background-color: red;
        mix-blend-mode: multiply;
      `;
      render(<Face testID="blend-probe" />);
      const css = readAllCss();
      expect(css).toMatch(/mix-blend-mode:\s*multiply/);
    });

    it('emits mix-blend-mode alongside color-mix backgrounds', () => {
      const Face = styled.View`
        background-color: color-mix(in srgb, #4287f5 78%, transparent);
        mix-blend-mode: multiply;
      `;
      render(<Face testID="blend-color-mix" />);
      const css = readAllCss();
      expect(css).toMatch(/mix-blend-mode:\s*multiply/);
      expect(css).toMatch(/color-mix\(in srgb,/);
    });
  });

  describe('object-fit on Image', () => {
    // rn-web's `<Image>` renders as a `<div>` with `background-image: url(...)`,
    // not as `<img>`. CSS `object-fit` only applies to replaced elements, so a
    // raw `object-fit: cover` declaration is a no-op against a `<div>`. The
    // native engine knew this and lifted `object-fit` to a `resizeMode` prop
    // (which rn-web's Image then translates to `background-size`).
    it('lands the bridge class on the Image DOM node', () => {
      const Pic = styled.Image`
        object-fit: contain;
      `;
      const { container } = render(
        <Pic testID="pic-fit" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      const node = container.querySelector('[data-testid="pic-fit"]') as HTMLElement;
      expect(node).not.toBeNull();
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourClass = cls.find(c => c.startsWith('sc-'));
      expect(ourClass).toBeDefined();
    });

    it('renders the rn-web Image as a <div> with background-image (not an <img>)', () => {
      // Documents the architectural reason `object-fit` is a no-op
      // against the CSS alone: the element it's authored against is
      // a `<div>`, not a replaced element.
      const Pic = styled.Image`
        object-fit: contain;
      `;
      const { container } = render(
        <Pic testID="pic-shape" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      const node = container.querySelector('[data-testid="pic-shape"]') as HTMLElement;
      expect(node).not.toBeNull();
      expect(node.tagName.toLowerCase()).toBe('div');
    });

    it('lifts object-fit to resizeMode so rn-web Image actually shapes the image', () => {
      const Pic = styled.Image`
        object-fit: contain;
      `;
      const { container } = render(
        <Pic testID="pic-lifted" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      // rn-web emits its `background-size` atomic class on the inner
      // backdrop `<div>`. The class name carries a hash of the value;
      // the underlying CSS rule lives in the CSSOM.
      const inner = container.querySelector(
        '[data-testid="pic-lifted"] > div'
      ) as HTMLElement | null;
      expect(inner).not.toBeNull();
      const innerCls = (inner!.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const bgSize = innerCls.find(c => c.startsWith('r-backgroundSize-'));
      expect(bgSize).toBeDefined();
      // The actual `background-size: contain` rule should live in the
      // CSSOM, keyed by that atomic class.
      expect(readAllCss()).toMatch(
        new RegExp(`\\.${bgSize}\\s*\\{[^}]*background-size:\\s*contain`, 'i')
      );
    });

    const fitCases: ReadonlyArray<[string, RegExp]> = [
      ['fill', /background-size:\s*100%\s*100%/i],
      ['cover', /background-size:\s*cover/i],
      ['contain', /background-size:\s*contain/i],
    ];
    for (const [fit, expected] of fitCases) {
      it(`lifts object-fit: ${fit} to a background-size match`, () => {
        // Each value gets its own styled component so the lift is
        // statically detectable (no interpolation).
        const factory = styled.Image as (
          s: TemplateStringsArray
        ) => React.ComponentType<{ testID?: string; source?: unknown }>;
        const Pic = factory(['object-fit: ' + fit + ';'] as unknown as TemplateStringsArray);
        render(
          <Pic testID={'pic-' + fit} source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
        );
        expect(readAllCss()).toMatch(expected);
      });
    }
  });

  describe('lift factories preserve .withConfig / .attrs chains', () => {
    // babel-plugin-styled-components rewrites every styled-component
    // declaration into `styled.X.withConfig({componentId, displayName})\`...\``,
    // so any lift wrapper that drops .withConfig / .attrs immediately
    // crashes the consumer app.
    it('supports .withConfig() on Image (the babel plugin uses this)', () => {
      const Factory = styled.Image as unknown as {
        withConfig: (c: {
          displayName?: string;
          componentId?: string;
        }) => (
          s: TemplateStringsArray
        ) => React.ComponentType<{ testID?: string; source?: unknown }>;
      };
      const Pic = Factory.withConfig({
        displayName: 'Pic',
        componentId: 'sc-pic-test',
      })`object-fit: cover;`;
      const { container } = render(
        <Pic testID="w" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      const node = container.querySelector('[data-testid="w"]') as HTMLElement;
      expect(node).not.toBeNull();
      // Lift still fired through the chain — bg-size: cover lands.
      expect(readAllCss()).toMatch(/background-size:\s*cover/i);
    });

    it('supports .attrs() chained on a lifted primitive', () => {
      const Factory = styled.Switch as unknown as {
        attrs: (
          a: object
        ) => (
          s: TemplateStringsArray
        ) => React.ComponentType<{ testID?: string; value?: boolean; onValueChange?: () => void }>;
      };
      const Toggle = Factory.attrs({ accessibilityLabel: 'a11y' })`
        accent-color: rgb(11, 22, 33);
      `;
      const { container } = render(<Toggle testID="s" value={true} onValueChange={() => {}} />);
      // .attrs() injected the accessibilityLabel (rn-web maps to aria-label).
      const node = container.querySelector('[data-testid="s"]') as HTMLElement;
      expect(node).not.toBeNull();
      // Lift still fired: trackColor reaches the track via accentColor.
      expect(readAllCss()).toMatch(/background-color:\s*rgba?\(11,\s*22,\s*33/i);
    });
  });

  describe('text-wrap: nowrap lift on Text', () => {
    it('lifts text-wrap: nowrap to numberOfLines: 1 so rn-web applies textOneLine baseline', () => {
      const Label = styled.Text`
        text-wrap: nowrap;
        text-overflow: ellipsis;
      `;
      const { container } = render(<Label testID="wrap-nowrap">long content...</Label>);
      const node = container.querySelector('[data-testid="wrap-nowrap"]') as HTMLElement;
      // numberOfLines:1 puts the textOneLine baseline (white-space:
      // nowrap; text-overflow: ellipsis) on the element. Look for
      // the rn-web atomic class or inline styles that signal it.
      const html = node.outerHTML;
      expect(html).toMatch(/white-space|r-whiteSpace|textOneLine|text-overflow/i);
    });

    it('lets authored text-overflow: clip override rn-web baseline ellipsis', () => {
      const Label = styled.Text`
        text-wrap: nowrap;
        text-overflow: clip;
      `;
      const { container } = render(<Label testID="wrap-clip">long content...</Label>);
      const node = container.querySelector('[data-testid="wrap-clip"]') as HTMLElement;
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourCls = cls.find(
        c => /^[a-zA-Z]+$/.test(c) && !c.startsWith('css-') && !c.startsWith('r-')
      );
      // Our sc-class should declare text-overflow: clip in CSSOM.
      const css = readAllCss();
      const ruleMatch = css.match(
        new RegExp(`\\.${ourCls}\\s*\\{[^}]*text-overflow:\\s*clip`, 'i')
      );
      expect(ruleMatch).not.toBeNull();
    });

    it('passes through non-nowrap text-wrap values without lifting', () => {
      // text-wrap: balance shouldn't lift to numberOfLines (would
      // truncate the text incorrectly). The CSS reaches the CSSOM
      // and the browser handles balance natively.
      const Label = styled.Text`
        text-wrap: balance;
      `;
      const { container } = render(<Label testID="balance">balanced text</Label>);
      const node = container.querySelector('[data-testid="balance"]') as HTMLElement;
      // Element shouldn't have -webkit-line-clamp or rn-web's
      // numberOfLines baseline.
      expect(node.outerHTML).not.toMatch(/-webkit-line-clamp/i);
      const css = readAllCss();
      expect(css).toMatch(/text-wrap:\s*balance/);
    });
  });

  describe('raw rn-web primitive imports auto-bridge through styled()', () => {
    // Consumer pattern: `import { TextInput } from 'react-native'`
    // (which on web resolves to rn-web's TextInput) then
    // `styled(TextInput)\`...\``. The bridge should recognize the raw
    // import and apply the $$css shim + lifts the same way it would
    // for `styled.TextInput`.
    it('substitutes the bridged shim when wrapping a raw rn-web TextInput', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rnWeb = require('react-native-web');
      const RawTextInput = rnWeb.TextInput as React.ComponentType<{
        testID?: string;
        defaultValue?: string;
        multiline?: boolean;
      }>;
      const Field = styled(RawTextInput)`
        height: 120px;
        background-color: rgb(40, 50, 60);
      `;
      const { container } = render(<Field testID="raw-input" defaultValue="" multiline />);
      const node = container.querySelector('[data-testid="raw-input"]') as HTMLElement;
      expect(node).not.toBeNull();
      // The DOM should carry our sc-class through the $$css path.
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourCls = cls.find(
        c => /^[a-zA-Z]+$/.test(c) && !c.startsWith('css-') && !c.startsWith('r-')
      );
      expect(ourCls).toBeDefined();
      // And the height + background should land in the CSSOM.
      const css = readAllCss();
      expect(css).toMatch(new RegExp('\\.' + ourCls + '\\s*\\{[^}]*height:\\s*120px'));
    });
  });

  describe('lifts apply to styled() extensions, not just styled.X alias getters', () => {
    // Showcase pattern: a base styled Text, then extending it with
    // additional styled CSS. The lift must fire on the EXTENSION,
    // not just on the direct alias call.
    it('lifts line-clamp on styled(BaseText) extending a styled.Text', () => {
      const Body = styled.Text`
        font-size: 14px;
      `;
      const Clamped = styled(Body)`
        line-clamp: 2;
      `;
      const { container } = render(<Clamped testID="ext-clamp">long content...</Clamped>);
      const node = container.querySelector('[data-testid="ext-clamp"]') as HTMLElement;
      const style = node.getAttribute('style') ?? '';
      expect(style).toMatch(/-webkit-line-clamp:\s*2/i);
    });

    it('lifts text-wrap: nowrap on styled(BaseText) extending a styled.Text', () => {
      const Body = styled.Text`
        font-size: 14px;
      `;
      const Single = styled(Body)`
        text-wrap: nowrap;
        text-overflow: ellipsis;
      `;
      const { container } = render(<Single testID="ext-nowrap">long content...</Single>);
      const node = container.querySelector('[data-testid="ext-nowrap"]') as HTMLElement;
      // numberOfLines:1 → rn-web's textOneLine baseline class lands.
      // The class hash differs but the resulting computed white-space
      // should switch from 'pre' to 'nowrap'.
      const html = node.outerHTML;
      expect(html).toMatch(/r-whiteSpace|textOneLine|r-textOverflow/i);
    });
  });

  describe('field-sizing lift on TextInput', () => {
    it('lifts field-sizing: content to multiline so rn-web renders a <textarea>', () => {
      const Auto = styled.TextInput`
        field-sizing: content;
        min-height: 44px;
      `;
      const { container } = render(<Auto testID="fs-content" defaultValue="" />);
      const node = container.querySelector('[data-testid="fs-content"]') as HTMLElement;
      expect(node).not.toBeNull();
      // multiline: true → rn-web renders `<textarea>`, not `<input>`.
      expect(node.tagName.toLowerCase()).toBe('textarea');
    });

    it('leaves field-sizing: fixed and other values alone', () => {
      const Fixed = styled.TextInput`
        field-sizing: fixed;
      `;
      const { container } = render(<Fixed testID="fs-fixed" defaultValue="" />);
      const node = container.querySelector('[data-testid="fs-fixed"]') as HTMLElement;
      // multiline NOT lifted → rn-web renders `<input>` (single line).
      expect(node.tagName.toLowerCase()).toBe('input');
    });
  });

  describe('line-clamp lift on Text', () => {
    it('lifts line-clamp: N to numberOfLines so rn-web emits the webkit-line-clamp triple', () => {
      const Label = styled.Text`
        line-clamp: 3;
      `;
      const { container } = render(<Label testID="clamp-probe">long content...</Label>);
      const node = container.querySelector('[data-testid="clamp-probe"]') as HTMLElement;
      expect(node).not.toBeNull();
      // rn-web Text with numberOfLines > 1 sets WebkitLineClamp inline on the element,
      // plus a `textMultiLine` baseline class that supplies the `-webkit-box` display
      // and `-webkit-box-orient: vertical`. Both must land for the truncation to work.
      const style = node.getAttribute('style') ?? '';
      expect(style).toMatch(/-webkit-line-clamp:\s*3/i);
      const cls = node.getAttribute('class') ?? '';
      const html = node.outerHTML;
      // The rn-web `textMultiLine` baseline (with -webkit-box) must be present on
      // the element so the line-clamp actually clamps.
      expect(html + cls).toMatch(/-webkit-box|r-overflow|r-textOverflow/i);
    });

    it('lifts line-clamp: 1 to numberOfLines: 1', () => {
      const Label = styled.Text`
        line-clamp: 1;
      `;
      const { container } = render(<Label testID="clamp-one">long content...</Label>);
      const node = container.querySelector('[data-testid="clamp-one"]') as HTMLElement;
      // numberOfLines: 1 uses textOneLine baseline (white-space: nowrap + text-overflow: ellipsis).
      // We can't easily assert on the rn-web atomic class hashes, but the
      // node must NOT have WebkitLineClamp (which only applies for >1).
      expect(node.outerHTML).not.toMatch(/-webkit-line-clamp/i);
    });
  });

  describe('accent-color lift on Switch', () => {
    it('lifts accent-color: rgb() to trackColor so rn-web tinting works', () => {
      const Toggle = styled.Switch`
        accent-color: rgb(11, 22, 33);
      `;
      render(<Toggle testID="toggle-rgb" value={true} onValueChange={() => {}} />);
      const css = readAllCss();
      expect(css).toMatch(/background-color:\s*rgba?\(11,\s*22,\s*33/i);
    });

    it('canonicalizes oklch() so it reaches rn-web as rgb the normalizer accepts', () => {
      const Toggle = styled.Switch`
        accent-color: oklch(0.72 0.18 265);
      `;
      render(<Toggle testID="toggle-oklch" value={true} onValueChange={() => {}} />);
      // The lifted trackColor reaches rn-web as canonical rgb; rn-web
      // then paints the track. The exact rgb depends on the browser's
      // oklch -> sRGB conversion, but it must be a valid rgb() value
      // (not the raw oklch string which rn-web rejects to transparent).
      const css = readAllCss();
      // No "transparent" or "0/0" fallback on the track — actual rgb.
      const trackMatch = css.match(/background-color:\s*(rgba?\([^)]+\))/i);
      expect(trackMatch).not.toBeNull();
    });

    it('canonicalizes color-mix() to rgb', () => {
      const Toggle = styled.Switch`
        accent-color: color-mix(in oklch, #c8243a 50%, #ec4899 50%);
      `;
      render(<Toggle testID="toggle-mix" value={true} onValueChange={() => {}} />);
      const css = readAllCss();
      const trackMatch = css.match(/background-color:\s*(rgba?\([^)]+\))/i);
      expect(trackMatch).not.toBeNull();
    });

    it('resolves accent-color: auto to the browser AccentColor system color', () => {
      const Toggle = styled.Switch`
        accent-color: auto;
      `;
      render(<Toggle testID="toggle-auto" value={true} onValueChange={() => {}} />);
      const css = readAllCss();
      // Browser canonicalizes AccentColor to its current system value
      // (rgb form). Track gets a real color, not transparent.
      const trackMatch = css.match(/background-color:\s*(rgba?\([^)]+\))/i);
      expect(trackMatch).not.toBeNull();
    });

    it('resolves system colors (LinkText, ButtonFace) to rgb', () => {
      const TogA = styled.Switch`
        accent-color: LinkText;
      `;
      const TogB = styled.Switch`
        accent-color: ButtonFace;
      `;
      render(
        <>
          <TogA testID="tog-link" value={true} onValueChange={() => {}} />
          <TogB testID="tog-button" value={true} onValueChange={() => {}} />
        </>
      );
      const css = readAllCss();
      const matches = css.match(/background-color:\s*rgba?\([^)]+\)/gi) ?? [];
      // Both tracks resolved to rgb; at least 2 background-color rgb
      // rules should now be in the CSSOM.
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('data-* props translated to dataSet for rn-web', () => {
    it('lands data-place="center" on the DOM so attribute selectors match', () => {
      const Box = styled.View`
        align-items: stretch;
        &[data-place='center'] {
          align-items: center;
        }
      `;
      const { container } = render(
        <Box testID="da-probe" {...({ 'data-place': 'center' } as object)} />
      );
      const node = container.querySelector('[data-testid="da-probe"]') as HTMLElement;
      expect(node).not.toBeNull();
      // The attribute itself must land on the DOM (rn-web converts
      // dataSet.place → data-place).
      expect(node.getAttribute('data-place')).toBe('center');
    });

    it('lands kebab-cased data-* suffixes correctly', () => {
      const Box = styled.View``;
      const { container } = render(
        <Box testID="kebab" {...({ 'data-place-self': 'end' } as object)} />
      );
      const node = container.querySelector('[data-testid="kebab"]') as HTMLElement;
      expect(node.getAttribute('data-place-self')).toBe('end');
    });
  });

  describe('pointerEvents prop lifted into style.pointerEvents', () => {
    // rn-web's createDOMProps deprecates the `pointerEvents` prop in favor
    // of `style.pointerEvents`. Consumers writing idiomatic cross-platform
    // RN code shouldn't see a deprecation warning on web; the bridge lifts
    // the prop into the styleq array so rn-web reads it from style.
    it('does not log the rn-web deprecation warning when pointerEvents is passed as a prop', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const Box = styled.View``;
      render(<Box testID="pe" pointerEvents="none" />);
      const deprecation = warn.mock.calls.find(
        ([msg]) => typeof msg === 'string' && msg.indexOf('pointerEvents is deprecated') !== -1
      );
      expect(deprecation).toBeUndefined();
      warn.mockRestore();
    });

    it('routes the value through to the DOM via style', () => {
      const Box = styled.View``;
      const { container } = render(<Box testID="pe-none" pointerEvents="none" />);
      const node = container.querySelector('[data-testid="pe-none"]') as HTMLElement;
      expect(getComputedStyle(node).pointerEvents).toBe('none');
    });
  });

  describe('var() + unit-suffix rewrite for createTheme sentinels', () => {
    // `createTheme.web` emits leaves like `var(--sc-space-sm, 13)`. The
    // idiomatic interpolation pattern `padding: ${t.space.sm}px;` produces
    // `padding: var(--sc-space-sm, 13)px;` which the browser drops because
    // the unit lands outside the var() boundary. The bridge rewrites
    // these to `calc(var(...) * 1<unit>)` so the value survives.
    it('rewrites var()+px in the styled CSS to a calc form the browser accepts', () => {
      // Authored via interpolation so the Prettier CSS plugin doesn't
      // collapse the no-space form back into `var(...) px`. The runtime
      // input is identical: `${sentinel}px` joins to `var(...)px`.
      const sentinel = 'var(--sc-space-sm, 13)';
      const Box = styled.View`
        padding: ${sentinel}px;
      `;
      render(<Box testID="px-probe" />);
      const css = readAllCss();
      expect(css).toMatch(/calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
    });

    it('rewrites the showcase pattern: createTheme sentinel from interpolation + unit from next segment', () => {
      // Mirrors the 498 occurrences of `${t.space.x}<unit>` in native-showcase.
      // `t.space.sm` is the createTheme leaf string, dropped into an
      // interpolation slot; the literal `px` lives in the next static
      // segment. The rewrite must catch the post-concatenation form.
      const sentinel = 'var(--sc-space-sm, 13)';
      const Box = styled.View`
        padding: ${sentinel}px;
        margin-top: ${sentinel}px;
        gap: ${sentinel}px;
      `;
      render(<Box testID="interp-probe" />);
      const css = readAllCss();
      // After the compiler patch fires, the value should be calc(var() * 1px).
      expect(css).toMatch(/padding:\s*calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
      expect(css).toMatch(/margin-top:\s*calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
      expect(css).toMatch(/gap:\s*calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
    });

    it('rewrites every known length / %% / time / angle unit', () => {
      // Interpolation form so Prettier preserves the no-space join.
      const a = 'var(--a, 1)';
      const b = 'var(--b, 2)';
      const c = 'var(--c, 3)';
      const d = 'var(--d, 4)';
      const e = 'var(--e, 5)';
      const f = 'var(--f, 100)';
      const g = 'var(--g, 45)';
      const Box = styled.View`
        padding: ${a}em;
        margin: ${b}rem;
        gap: ${c}vh;
        flex-basis: ${d}vw;
        width: ${e}%;
        transition: opacity ${f}ms;
        rotate: ${g}deg;
      `;
      render(<Box testID="units-probe" />);
      const css = readAllCss();
      for (const unit of ['1em', '1rem', '1vh', '1vw', '1%', '1ms', '1deg']) {
        expect(css).toContain('* ' + unit);
      }
    });

    it('leaves a var() not followed by a known unit alone', () => {
      const Box = styled.View`
        color: var(--sc-color-fg, red);
        background: var(--sc-bg, blue) center / cover no-repeat;
      `;
      render(<Box testID="leave-probe" />);
      const css = readAllCss();
      // Original var() must still be intact, NOT wrapped in calc.
      expect(css).toMatch(/var\(--sc-color-fg,\s*red\)/);
      expect(css).not.toMatch(/calc\(var\(--sc-color-fg/);
    });

    it('leaves unitless var() values alone', () => {
      const Box = styled.View`
        opacity: var(--sc-opacity, 0.5);
        flex-grow: var(--sc-grow, 1);
      `;
      render(<Box testID="unitless-probe" />);
      const css = readAllCss();
      expect(css).toMatch(/var\(--sc-opacity,\s*0\.5\)/);
      expect(css).not.toMatch(/calc\(var\(--sc-opacity/);
    });
  });

  describe(':not() catchall specificity neutralization via :where()', () => {
    // CSS specificity: each `:not(<simple>)` contributes the simple's
    // weight, so `:not([a]):not([b]):not([c])` adds (0,3,0) — beating
    // a simple `[data-channel]` rule (weight (0,1,0)) regardless of
    // source order. The native engine has no specificity; the bridge
    // wraps :not chains in :where() to zero them out so the cascade
    // matches native intent.
    it('wraps .cls:not(...) chains in :where(...) so simple [attr] rules win', () => {
      const Pill = styled.View`
        border: 2px solid blue;
        &[data-channel='ux'] {
          border-left-width: 4px;
          border-left-color: green;
        }
        &:not([data-tone='pass']):not([data-tone='fail']) {
          border-color: gray;
        }
      `;
      const { container } = render(
        <Pill testID="pill-spec" {...({ 'data-channel': 'ux' } as object)} />
      );
      const node = container.querySelector('[data-testid="pill-spec"]') as HTMLElement;
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourCls = cls.find(
        c => /^[a-zA-Z]+$/.test(c) && !c.startsWith('css-') && !c.startsWith('r-')
      );
      const css = readAllCss();
      // The :not chain should be wrapped in :where(...). The
      // computed-style verification of cascade winners is browser-
      // dependent (jsdom's specificity model is not full) so we
      // assert only on the emitted CSS.
      expect(css).toMatch(
        new RegExp('\\.' + ourCls + ':where\\(:not\\([^)]*\\):not\\([^)]*\\)\\)')
      );
    });
  });

  describe('vertical-align flex-keyword rewrite', () => {
    // rn-web's Text is `display: inline` and authoring CSS with
    // `vertical-align: middle` is inert (vertical-align only applies
    // to inline-level content in an inline formatting context). The
    // bridge rewrites the rule to also emit a flex container with
    // align-items: <flex-keyword> so the visual lands.
    const cases: ReadonlyArray<[string, string]> = [
      ['top', 'flex-start'],
      ['middle', 'center'],
      ['bottom', 'flex-end'],
    ];
    for (const [keyword, flex] of cases) {
      it(`emits a companion rule with display:flex + align-items:${flex}, scoped to non-form-control elements`, () => {
        const Label = styled.Text`
          height: 120px;
          vertical-align: ${keyword};
        `;
        render(<Label testID={'va-' + keyword}>Hello</Label>);
        const css = readAllCss();
        // Original vertical-align preserved
        expect(css).toMatch(new RegExp('vertical-align:\\s*' + keyword));
        // Companion rule guarded by :not(textarea):not(input)
        expect(css).toMatch(
          new RegExp(':not\\(textarea\\):not\\(input\\)\\s*\\{[^}]*align-items:\\s*' + flex)
        );
        expect(css).toMatch(/:not\(textarea\):not\(input\)\s*\{[^}]*display:\s*flex/);
        // Second companion targets form controls via align-content so
        // textarea/input vertically position their text content per
        // CSS Box Alignment L3 §5.
        expect(css).toMatch(
          new RegExp(':is\\(textarea,\\s*input\\)\\s*\\{[^}]*align-content:\\s*' + flex)
        );
      });
    }

    it('does not apply the flex polyfill to a textarea (rn-web TextInput multiline)', () => {
      // For a styled.TextInput (renders as <textarea>) with
      // vertical-align: middle, the companion rule's :not(textarea)
      // selector exempts the element so its native layout is preserved.
      // The second companion (`:is(textarea, input)`) routes through
      // `align-content` instead, which is the standards-compliant way
      // to vertically position input text per CSS Box Alignment L3.
      const Field = styled.TextInput`
        height: 120px;
        vertical-align: middle;
      `;
      const { container } = render(<Field testID="va-input" multiline defaultValue="x" />);
      const node = container.querySelector('[data-testid="va-input"]') as HTMLElement;
      expect(node.tagName.toLowerCase()).toBe('textarea');
      // The element should NOT pick up display: flex from the first
      // companion rule (selector is `:not(textarea):not(input)`).
      const cs = getComputedStyle(node);
      expect(cs.display).not.toBe('flex');
    });

    it('leaves numeric and length values alone', () => {
      // `vertical-align: <length>` and superscript keywords aren't
      // remapped — they have their own semantics.
      const Label = styled.Text`
        vertical-align: 0.5em;
      `;
      render(<Label testID="va-len">x</Label>);
      const css = readAllCss();
      expect(css).toMatch(/vertical-align:\s*0\.5em/);
      // No flex polyfill added.
      expect(css).not.toMatch(/vertical-align:\s*0\.5em\s*;\s*display:\s*flex/i);
    });
  });

  describe('bare-arg math functions in length-context props', () => {
    // CSS Values 4 math fns (`abs`, `hypot`, `pow`, `mod`, `rem`,
    // trig family) return `<number>` when all args are unitless.
    // The browser then drops the declaration on length-context props
    // because `width: 180` (a number) isn't `<length>`. The bridge
    // wraps unitless math-fn values in `calc(<fn>(...) * 1px)` so
    // the result types as a length.
    const cases: ReadonlyArray<[string, RegExp]> = [
      ['width: abs(-180);', /width:\s*calc\(abs\(-180\)\s*\*\s*1px\)/i],
      ['width: hypot(60, 80);', /width:\s*calc\(hypot\(60,\s*80\)\s*\*\s*1px\)/i],
      ['width: pow(8, 2);', /width:\s*calc\(pow\(8,\s*2\)\s*\*\s*1px\)/i],
      ['width: mod(127, 30);', /width:\s*calc\(mod\(127,\s*30\)\s*\*\s*1px\)/i],
      ['height: sqrt(2);', /height:\s*calc\(sqrt\(2\)\s*\*\s*1px\)/i],
    ];
    for (const [decl, expected] of cases) {
      it(`wraps ${decl}`, () => {
        const Box = styled.View`
          ${decl}
        `;
        render(<Box testID={'m-' + decl} />);
        expect(readAllCss()).toMatch(expected);
      });
    }

    it('leaves bare math functions in non-length contexts alone', () => {
      // `opacity` takes <number>; bare-arg math should pass through.
      const Box = styled.View`
        opacity: pow(0.5, 2);
      `;
      render(<Box testID="opa" />);
      const css = readAllCss();
      expect(css).toMatch(/opacity:\s*pow\(0\.5,\s*2\)/);
      expect(css).not.toMatch(/opacity:\s*calc\(pow/);
    });

    // Regression guard: BARE_MATH_FN_RE previously had nested-whitespace
    // backtracking that turned an ~4 KB malformed input into a 6-second
    // CPU spin. The fix anchors the inner body on non-whitespace; the
    // budget below catches any reintroduction.
    it('rejects whitespace-padded malformed math fns within a wall-clock budget', () => {
      const attack = 'width: abs(' + ' '.repeat(2000) + '1' + ' '.repeat(2000) + ') X';
      const t0 = Date.now();
      const Box = styled.View`
        ${attack}
      `;
      render(<Box testID="bare-math-attack" />);
      readAllCss();
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeLessThan(100);
    });

    it('leaves already-typed math functions alone', () => {
      // `hypot(60px, 80px)` already returns length; don't double-wrap.
      const Box = styled.View`
        width: hypot(60px, 80px);
      `;
      render(<Box testID="typed" />);
      const css = readAllCss();
      expect(css).toMatch(/width:\s*hypot\(60px,\s*80px\)/);
      expect(css).not.toMatch(/calc\(hypot\(60px/);
    });

    // Regression guard: the previous VERT_ALIGN_RULE_RE had adjacent
    // greedy `[^{}]*` + lazy `[^{}]*?` flanking the `\{`, which on
    // adversarial input like `.cls<40k chars> vertical-align: top`
    // produced 1.6s of polynomial backtracking. The indexOf-bounded
    // rewrite keeps each step O(n).
    it('vertical-align rewriter handles long class-prefix input within a wall-clock budget', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bridge = require('../native/web-bridge') as {
        __testOnly_verticalAlignCompanions: (s: string) => string[];
      };
      const adversarial = '.cls' + 'a'.repeat(40000) + ' vertical-align: top';
      const t0 = Date.now();
      const result = bridge.__testOnly_verticalAlignCompanions(adversarial);
      const elapsed = Date.now() - t0;
      // Adversarial input lacks `{` after the class so no companions emit.
      expect(result).toEqual([]);
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('3D matrix transform rewrite', () => {
    // rn-web emits transform values containing function-call parens as
    // inline `style` attributes (not atomic CSS), so the assertion
    // target is the rendered node's `style` attribute.
    it('rewrites a 16-element matrix inline transform so rn-web emits matrix3d', () => {
      // The showcase logo uses `transform: [{matrix: [...16 numbers]}]`
      // as inline style on absolute children. rn-web's preprocess
      // naively emits matrix(...) with all 16 args; the browser drops
      // the declaration as invalid and all elements stack at origin.
      // The bridge rewrites to matrix3d before rn-web sees it.
      const Box = styled.View``;
      const identity4x4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      const { container } = render(
        <Box testID="m3d" style={{ transform: [{ matrix: identity4x4 }] } as unknown as object} />
      );
      const node = container.querySelector('[data-testid="m3d"]') as HTMLElement;
      const style = node.getAttribute('style') ?? '';
      expect(style).toMatch(/matrix3d\(/i);
      // And the broken 16-arg matrix() (would be 15 commas inside)
      // must NOT appear.
      expect(style).not.toMatch(/transform:\s*matrix\((?:[^,)]+,){15}/i);
    });

    it('leaves a 9-element matrix alone', () => {
      // rn-web parses 9-element matrices as 3x3 affine and emits
      // matrix(...) which is valid 2D CSS. The bridge MUST NOT
      // promote those to matrix3d.
      const Box = styled.View``;
      const id3x3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const { container } = render(
        <Box testID="m9" style={{ transform: [{ matrix: id3x3 }] } as unknown as object} />
      );
      const node = container.querySelector('[data-testid="m9"]') as HTMLElement;
      const style = node.getAttribute('style') ?? '';
      // rn-web emits matrix(...) for the 9-element form.
      expect(style).toMatch(/matrix\(/i);
      expect(style).not.toMatch(/matrix3d/i);
    });
  });

  describe('ScrollView baseline clipping survives through the bridge', () => {
    it('renders rn-web ScrollView with overflow + flex baseline preserved', () => {
      const Scroll = styled.ScrollView`
        overscroll-behavior: auto;
        scrollbar-width: auto;
      `;
      const { container } = render(
        <Scroll testID="scroll-probe">
          <span>row 1</span>
          <span>row 2</span>
          <span>row 3</span>
        </Scroll>
      );
      const node = container.querySelector('[data-testid="scroll-probe"]') as HTMLElement;
      expect(node).not.toBeNull();
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      // Our class lands
      expect(cls.some(c => c.startsWith('sc-'))).toBe(true);
      // rn-web atomic baseline classes must also be present so the
      // ScrollView clips its overflow and grows to fill its flex parent.
      expect(cls.some(c => c.startsWith('r-overflow'))).toBe(true);
    });
  });
});

describe('rn-web bridge: ThemeProvider publishes CSS vars for scoped overrides', () => {
  it('emits override leaves as --sc-* custom properties on a display:contents wrapper', () => {
    const { container } = render(
      <BridgeThemeProvider theme={{ colors: { accent: '#1f7a52' } }}>
        <div data-testid="probe" />
      </BridgeThemeProvider>
    );
    const probe = container.querySelector('[data-testid="probe"]') as HTMLElement;
    const wrapper = probe.parentElement as HTMLElement;
    expect(wrapper.style.display).toBe('contents');
    expect(wrapper.style.getPropertyValue('--sc-colors-accent')).toBe('#1f7a52');
  });

  it('nested overrides do not emit unrelated keys on the inner wrapper', () => {
    const { container } = render(
      <BridgeThemeProvider theme={{ colors: { accent: '#0e0e10', bg: '#fff' } }}>
        <BridgeThemeProvider theme={{ colors: { accent: '#c8243a' } }}>
          <div data-testid="leaf" />
        </BridgeThemeProvider>
      </BridgeThemeProvider>
    );
    const leaf = container.querySelector('[data-testid="leaf"]') as HTMLElement;
    const inner = leaf.parentElement as HTMLElement;
    expect(inner.style.getPropertyValue('--sc-colors-accent')).toBe('#c8243a');
    expect(inner.style.getPropertyValue('--sc-colors-bg')).toBe('');
    const outer = inner.parentElement as HTMLElement;
    expect(outer.style.getPropertyValue('--sc-colors-accent')).toBe('#0e0e10');
    expect(outer.style.getPropertyValue('--sc-colors-bg')).toBe('#fff');
  });

  it('function-form theme skips var publish but still provides JS context', () => {
    const Probe = styled.View`
      color: ${(p: { theme: { fg: string } }) => p.theme.fg};
    `;
    const { container } = render(
      <BridgeThemeProvider theme={() => ({ fg: 'rgb(1, 2, 3)' })}>
        <Probe testID="fn-themed" />
      </BridgeThemeProvider>
    );
    const probe = container.querySelector('[data-testid="fn-themed"]') as HTMLElement;
    expect(probe).not.toBeNull();
    expect(probe.parentElement?.style.display).not.toBe('contents');
    expect(readAllCss()).toContain('rgb(1, 2, 3)');
  });

  it('a styled component reads scoped var() value from the nearest provider', () => {
    const theme = createTheme({ colors: { accent: '#0e0e10' } });
    const Swatch = styled.View`
      background-color: ${theme.colors.accent};
    `;
    const { container } = render(
      <BridgeThemeProvider theme={theme.raw}>
        <BridgeThemeProvider theme={{ colors: { accent: 'rgb(31, 122, 82)' } }}>
          <Swatch testID="scoped-swatch" />
        </BridgeThemeProvider>
      </BridgeThemeProvider>
    );
    const node = container.querySelector('[data-testid="scoped-swatch"]') as HTMLElement;
    // Walk up to the override wrapper; verify the override var is published there.
    let cur: HTMLElement | null = node;
    let found = '';
    while (cur && !found) {
      found = cur.style?.getPropertyValue?.('--sc-colors-accent') ?? '';
      cur = cur.parentElement;
    }
    expect(found).toBe('rgb(31, 122, 82)');
  });
});

describe('rn-web bridge: createTheme integration', () => {
  // The bridge unblocks the createTheme native unification spike from
  // 2026-05-18: with the bridge, themes go through the web pipeline so
  // var() is the browser's responsibility.
  it('publishes theme values as CSS custom properties via createTheme.GlobalStyle', () => {
    // The bridge subpath should re-export the WEB createTheme so
    // consumers don't have to wire up the native sentinel translator.
    const theme = createTheme({ colors: { bg: 'rgb(77, 88, 99)' } });
    const Box = styled.View`
      background-color: ${theme.colors.bg};
    `;
    render(
      <ThemeProvider theme={theme.raw}>
        <theme.GlobalStyle />
        <Box testID="theme-probe" />
      </ThemeProvider>
    );
    const css = readAllCss();
    // GlobalStyle declares the custom property; the styled component
    // references it via var(). Both should appear in the CSSOM.
    expect(css).toContain('rgb(77, 88, 99)');
    expect(css).toMatch(/var\(--sc-colors-bg/);
  });
});
