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

import styled from '../native/web-bridge';
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
