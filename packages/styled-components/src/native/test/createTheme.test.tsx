import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Animated, View } from 'react-native';

import createTheme from '../../constructors/createTheme';
import ThemeProvider, { ThemeContext } from '../../models/ThemeProvider';
import styled, { css, toStyleSheet } from '..';

describe('createTheme;native parity', () => {
  it('emits sentinel-string leaves for native resolution', () => {
    const theme = createTheme({
      colors: { bg: '#fff', text: '#111' },
      spacing: { sm: 4, md: 8 },
    });
    // Leaves are `\0sc:<dot.path>:<fallback>` sentinels
    expect(theme.colors.bg).toBe('\0sc:colors.bg:#fff');
    expect(theme.colors.text).toBe('\0sc:colors.text:#111');
    expect(theme.spacing.md).toBe('\0sc:spacing.md:8');
  });

  it('raw preserves the original defaults', () => {
    const theme = createTheme({ colors: { bg: '#fff' } });
    expect(theme.raw).toEqual({ colors: { bg: '#fff' } });
  });

  it('resolves leaves against the enclosing ThemeProvider on render', () => {
    const theme = createTheme({ colors: { bg: '#ffffff' } });
    const Box = styled(View)`
      background-color: ${theme.colors.bg};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={{ colors: { bg: '#abcdef' } }}>
        <Box />
      </ThemeProvider>
    );
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual(expect.objectContaining({ backgroundColor: '#abcdef' }));
  });

  it('passes a non-string provider value (a platform color object) through to the style', () => {
    const theme = createTheme({ colors: { bg: '#ffffff' } });
    const Box = styled(View)`
      background-color: ${theme.colors.bg};
    `;
    // The shape React Native's PlatformColor() returns on iOS.
    const platformColor = { semantic: ['systemBackground'] };
    const tree = TestRenderer.create(
      <ThemeProvider theme={{ colors: { bg: platformColor } }}>
        <Box />
      </ThemeProvider>
    );
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual(expect.objectContaining({ backgroundColor: platformColor }));
  });

  it('falls back to default when no ThemeProvider is supplied', () => {
    const theme = createTheme({ colors: { bg: '#ffffff' } });
    const Box = styled(View)`
      background-color: ${theme.colors.bg};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={{}}>
        <Box />
      </ThemeProvider>
    );
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual(expect.objectContaining({ backgroundColor: '#ffffff' }));
  });

  it('deep-merges nested ThemeProvider overrides on native', () => {
    const theme = createTheme({
      colors: { bg: '#ffffff', text: '#000000' },
    });
    const Box = styled(View)`
      background-color: ${theme.colors.bg};
      border-color: ${theme.colors.text};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={{ colors: { bg: '#111111', text: '#eeeeee' } }}>
        <ThemeProvider theme={{ colors: { text: '#ff0000' } }}>
          <Box />
        </ThemeProvider>
      </ThemeProvider>
    );
    const view = tree.root.findByType(View);
    // bg inherited from outer, text overridden by inner
    expect(view.props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#111111', borderColor: '#ff0000' })
    );
  });

  it('supports dynamic theme swaps;same component re-resolves across updates', () => {
    const theme = createTheme({ colors: { bg: '#ffffff' } });
    const Box = styled(View)`
      background-color: ${theme.colors.bg};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={{ colors: { bg: '#111111' } }}>
        <Box />
      </ThemeProvider>
    );
    TestRenderer.act(() => {
      tree.update(
        <ThemeProvider theme={{ colors: { bg: '#abcdef' } }}>
          <Box />
        </ThemeProvider>
      );
    });
    expect(tree.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#abcdef' })
    );
  });

  it('resolve() returns defaults on native (no live DOM var read)', () => {
    const theme = createTheme({ colors: { bg: '#ffffff' } });
    expect(theme.resolve()).toEqual({ colors: { bg: '#ffffff' } });
  });

  it('GlobalStyle is a no-op null component on native', () => {
    const theme = createTheme({ colors: { bg: '#fff' } });
    const tree = TestRenderer.create(<theme.GlobalStyle />);
    expect(tree.toJSON()).toBeNull();
  });

  it('deep-merge preserves class-instance leaves rather than copying their own enumerable keys onto a plain object', () => {
    class TokenBag {
      constructor(public id: string) {}
      label(): string {
        return `tag:${this.id}`;
      }
    }
    const outerBag = new TokenBag('outer');
    const innerBag = new TokenBag('inner');
    const Box = styled(View)<{ $bag?: TokenBag }>`
      color: ${p => (p.$bag instanceof TokenBag ? p.$bag.label() : 'plain')};
    `;
    let resolvedBag: unknown = null;
    const Probe: React.FC = () => {
      const t = React.useContext(ThemeContext) as { bag?: TokenBag } | undefined;
      resolvedBag = t?.bag;
      return null;
    };
    TestRenderer.create(
      <ThemeProvider theme={{ bag: outerBag }}>
        <ThemeProvider theme={{ bag: innerBag }}>
          <Probe />
          <Box />
        </ThemeProvider>
      </ThemeProvider>
    );
    expect(resolvedBag).toBeInstanceOf(TokenBag);
    expect((resolvedBag as TokenBag).label()).toBe('tag:inner');
  });

  it('falls through to fallback when a path segment hits a prototype-chain member (e.g. toString)', () => {
    // `theme[':toString']` reaches Object.prototype.toString without an `Object.hasOwn`
    // guard, returning a function value that crashes RN's renderer downstream.
    // We expect the resolver to treat it as missing and use the fallback instead.
    const theme = createTheme({ colors: { bg: '#fff' } });
    // Manually craft a sentinel pointing at `toString`. Mirrors the format
    // createTheme.native.ts emits for real theme leaves.
    const sentinel = '\0sc:toString:#abcdef';
    const Box = styled(View)`
      background-color: ${sentinel};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={theme.raw}>
        <Box />
      </ThemeProvider>
    );
    expect(tree.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#abcdef' })
    );
  });

  it('preserves colon-bearing leaf values (URLs, quoted text) through the sentinel round-trip', () => {
    const theme = createTheme({
      images: { hero: 'url(http://example.com/x.png)' },
      fonts: { code: '"Fira:Code"' },
    });
    const Box = styled(View)`
      background-color: ${theme.images.hero};
      font-family: ${theme.fonts.code};
    `;
    const Authored = styled(View)`
      background-color: url(http://example.com/x.png);
      font-family: "Fira:Code";
    `;
    // No ThemeProvider override;fallback path must round-trip the literal value
    // even though it contains additional `:` characters after the path/fallback boundary.
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual(
      TestRenderer.create(<Authored />).root.findByType(View).props.style
    );
    expect(view.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'url(http://example.com/x.png)' })
    );
  });

  it('preserves comma-bearing fallback (rgba color) when ThemeProvider is missing the path', () => {
    // The sentinel terminator is whitespace / comma / slash, so a literal
    // comma in the fallback used to truncate it. Escaping during createTheme
    // and unescaping in the resolver lets composite-string leaves survive.
    const theme = createTheme({
      colors: { shadow: 'rgba(0,0,0,0.4)' },
    });
    const Box = styled(View)`
      background-color: ${theme.colors.shadow};
    `;
    const tree = TestRenderer.create(<Box />);
    expect(tree.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(0,0,0,0.4)' })
    );
  });

  it('preserves whitespace-bearing fallback (linear-gradient)', () => {
    const theme = createTheme({
      gradients: { brand: 'linear-gradient(to right, red, blue)' },
    });
    const Box = styled(View)`
      background-image: ${theme.gradients.brand};
    `;
    const tree = TestRenderer.create(<Box />);
    expect(tree.root.findByType(View).props.style).toEqual(
      expect.objectContaining({
        experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
      })
    );
  });

  it('preserves slash-bearing fallback (aspect ratio)', () => {
    const theme = createTheme({
      shape: { wide: '16 / 9' },
    });
    const Box = styled(View)`
      aspect-ratio: ${theme.shape.wide};
    `;
    const tree = TestRenderer.create(<Box />);
    expect(tree.root.findByType(View).props.style).toEqual({ aspectRatio: 16 / 9 });
  });

  it('ThemeProvider override of a composite leaf still wins over the escaped fallback', () => {
    const theme = createTheme({
      colors: { shadow: 'rgba(0,0,0,0.4)' },
    });
    const Box = styled(View)`
      background-color: ${theme.colors.shadow};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={{ colors: { shadow: 'rgba(255,0,0,0.5)' } }}>
        <Box />
      </ThemeProvider>
    );
    expect(tree.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(255,0,0,0.5)' })
    );
  });
});

describe('createTheme;native theme values read as authored CSS', () => {
  const defaults = { dim: 0.2, gap: 8, gapPx: '8px' };
  const t = createTheme(defaults);

  // Each row pairs a themed declaration with its literal-authored twin for
  // the default value and for a provider-supplied value.
  const rows = [
    {
      defaultLiteral: styled(View)`
        opacity: 0.2;
      `,
      defaultStyle: { opacity: 0.2 },
      name: 'opacity',
      providerLiteral: styled(View)`
        opacity: 0.4;
      `,
      providerStyle: { opacity: 0.4 },
      themed: styled(View)`
        opacity: ${t.dim};
      `,
    },
    {
      defaultLiteral: styled(View)`
        margin-top: 8;
      `,
      defaultStyle: { marginTop: 8 },
      name: 'a unitless length',
      providerLiteral: styled(View)`
        margin-top: 12;
      `,
      providerStyle: { marginTop: 12 },
      themed: styled(View)`
        margin-top: ${t.gap};
      `,
    },
    {
      defaultLiteral: styled(View)`
        margin-left: 8px;
      `,
      defaultStyle: { marginLeft: 8 },
      name: 'a px length string',
      providerLiteral: styled(View)`
        margin-left: 12px;
      `,
      providerStyle: { marginLeft: 12 },
      themed: styled(View)`
        margin-left: ${t.gapPx};
      `,
    },
    {
      defaultLiteral: styled(View)`
        padding-top: 8px;
      `,
      defaultStyle: { paddingTop: 8 },
      name: 'a value followed by px',
      providerLiteral: styled(View)`
        padding-top: 12px;
      `,
      providerStyle: { paddingTop: 12 },
      themed: styled(View)`
        padding-top: ${t.gap}px;
      `,
    },
  ];

  const styleOf = (Component: React.ComponentType, theme?: Record<string, unknown>) => {
    const tree = TestRenderer.create(
      theme === undefined ? (
        <Component />
      ) : (
        <ThemeProvider theme={theme}>
          <Component />
        </ThemeProvider>
      )
    );
    return tree.root.findByType(View).props.style;
  };

  test.each(rows)('$name from the createTheme default matches the literal', row => {
    expect(styleOf(row.defaultLiteral)).toEqual(row.defaultStyle);
    expect(styleOf(row.themed)).toEqual(styleOf(row.defaultLiteral));
  });

  test.each(rows)('$name from a ThemeProvider string matches the literal', row => {
    const theme = { dim: '0.4', gap: '12', gapPx: '12px' };

    expect(styleOf(row.providerLiteral)).toEqual(row.providerStyle);
    expect(styleOf(row.themed, theme)).toEqual(styleOf(row.providerLiteral));
  });

  test.each(rows)('$name from a ThemeProvider number matches the literal', row => {
    const theme = { dim: 0.4, gap: 12, gapPx: 12 };

    expect(styleOf(row.themed, theme)).toEqual(styleOf(row.providerLiteral));
  });

  it('re-reads the new value when the provider theme changes', () => {
    const Box = styled(View)`
      opacity: ${t.dim};
    `;
    const tree = TestRenderer.create(
      <ThemeProvider theme={{ dim: '0.4' }}>
        <Box />
      </ThemeProvider>
    );
    TestRenderer.act(() => {
      tree.update(
        <ThemeProvider theme={{ dim: '0.6' }}>
          <Box />
        </ThemeProvider>
      );
    });

    expect(tree.root.findByType(View).props.style).toEqual({ opacity: 0.6 });
  });

  it('keeps text-valued theme leaves as text', () => {
    const palette = createTheme({ ink: 'tomato' });
    const Tinted = styled(View)`
      background-color: ${palette.ink};
    `;

    expect(styleOf(Tinted)).toEqual({ backgroundColor: 'tomato' });
  });

  // A template with the declaration's property name filled in, so one table row builds both the themed and the literal component.
  const decl = (prop: string, ...values: Array<string | number>) => {
    const strings = [`${prop}: `, ...values.slice(1).map(() => ''), ';'];
    return styled(View)(Object.assign(strings, { raw: strings }), ...values);
  };
  const authored = (css: string) => styled(View)(Object.assign([css], { raw: [css] }));

  const probes = [
    {
      defaultStyle: { fontSize: 16 },
      defaultText: '1rem',
      prop: 'font-size',
      providerStyle: { fontSize: 32 },
      providerText: '2rem',
    },
    {
      defaultStyle: { fontSize: 18 },
      defaultText: 'larger',
      prop: 'font-size',
      providerStyle: { fontSize: 20 },
      providerText: '20px',
    },
    {
      defaultStyle: { lineHeight: 32 },
      defaultText: '2em',
      prop: 'line-height',
      providerStyle: { lineHeight: 1.5 },
      providerText: '1.5',
    },
    {
      defaultStyle: { marginTop: 16 },
      defaultText: '1rem',
      prop: 'margin-top',
      providerStyle: { marginTop: 32 },
      providerText: '2rem',
    },
    {
      defaultStyle: { width: 75 },
      defaultText: '10vw',
      prop: 'width',
      providerStyle: { width: 150 },
      providerText: '20vw',
    },
    {
      defaultStyle: { width: 12 },
      defaultText: 'calc(10px + 2px)',
      prop: 'width',
      providerStyle: { width: 15 },
      providerText: 'calc(10px + 5px)',
    },
    {
      defaultStyle: { color: 'red' },
      defaultText: 'light-dark(red, blue)',
      prop: 'color',
      providerStyle: { color: 'green' },
      providerText: 'light-dark(green, blue)',
    },
    {
      defaultStyle: { color: '#40b1b7' },
      defaultText: 'oklch(0.7 0.1 200)',
      prop: 'color',
      providerStyle: { color: 'red' },
      providerText: 'red',
    },
    {
      defaultStyle: {
        backgroundColor: { semantic: ['systemBackground', '?attr/colorBackground'] },
      },
      defaultText: 'Canvas',
      prop: 'background-color',
      providerStyle: { backgroundColor: 'red' },
      providerText: 'red',
    },
    {
      defaultStyle: { marginBottom: 4, marginLeft: 8, marginRight: 8, marginTop: 4 },
      defaultText: '4px 8px',
      prop: 'margin',
      providerStyle: { margin: 1 },
      providerText: '1px',
    },
    {
      defaultStyle: { borderColor: 'red', borderStyle: 'solid', borderWidth: 1 },
      defaultText: '1px solid red',
      prop: 'border',
      providerStyle: { borderColor: 'blue', borderStyle: 'dashed', borderWidth: 2 },
      providerText: '2px dashed blue',
    },
    {
      defaultStyle: { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
      defaultText: 1,
      prop: 'flex',
      providerStyle: { flexBasis: 0, flexGrow: 2, flexShrink: 1 },
      providerText: '2',
    },
    {
      defaultStyle: { paddingTop: 0 },
      defaultText: 'env(safe-area-inset-top, 10px)',
      prop: 'padding-top',
      providerStyle: { paddingTop: 5 },
      providerText: '5px',
    },
    {
      defaultStyle: {},
      defaultText: 'auto',
      prop: 'z-index',
      providerStyle: { zIndex: 3 },
      providerText: '3',
    },
    {
      defaultStyle: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
      defaultText: 'grid',
      prop: 'display',
      providerStyle: { display: 'none' },
      providerText: 'none',
    },
  ];

  test.each(probes)(
    '$prop: $defaultText from the createTheme default reads as authored',
    ({ defaultStyle, defaultText, prop }) => {
      // A bare `display: grid` has no track list; authored text warns the same.
      if (defaultText === 'grid') jest.spyOn(console, 'warn').mockImplementation(() => {});
      const v = createTheme({ v: defaultText }).v;

      expect(styleOf(authored(`${prop}: ${defaultText};`))).toEqual(defaultStyle);
      expect(styleOf(decl(prop, v))).toEqual(defaultStyle);
    }
  );

  test.each(probes)(
    '$prop: $providerText from a ThemeProvider string reads as authored',
    ({ defaultText, prop, providerStyle, providerText }) => {
      const v = createTheme({ v: defaultText }).v;

      expect(styleOf(authored(`${prop}: ${providerText};`))).toEqual(providerStyle);
      expect(styleOf(decl(prop, v), { v: providerText })).toEqual(providerStyle);
    }
  );

  describe('a themed value among other text', () => {
    const s = createTheme({ a: 4, b: '8px', c: 'red', gap: 8, space: 8, w: 1 });
    const margins = (top: number, side: number) => ({
      marginBottom: top,
      marginLeft: side,
      marginRight: side,
      marginTop: top,
    });

    it('joins two themed values in one shorthand', () => {
      const Box = styled(View)`
        margin: ${s.a} ${s.b};
      `;

      expect(styleOf(Box)).toEqual(margins(4, 8));
      expect(styleOf(Box, { a: 1, b: '2px' })).toEqual(margins(1, 2));
    });

    it('joins a themed length, its unit, and a themed color', () => {
      const Box = styled(View)`
        border: ${s.w}px solid ${s.c};
      `;

      expect(styleOf(Box)).toEqual({ borderColor: 'red', borderStyle: 'solid', borderWidth: 1 });
      expect(styleOf(Box, { c: 'blue', w: 3 })).toEqual({
        borderColor: 'blue',
        borderStyle: 'solid',
        borderWidth: 3,
      });
    });

    it('takes a provider number as the length before an authored unit', () => {
      const Box = styled(View)`
        padding-top: ${s.gap}px;
      `;

      expect(styleOf(Box)).toEqual({ paddingTop: 8 });
      expect(styleOf(Box, { gap: 12 })).toEqual({ paddingTop: 12 });
    });

    it('reads a provider string that repeats the authored unit as the same text authored would', () => {
      const Box = styled(View)`
        padding-top: ${s.gap}px;
      `;

      expect(styleOf(authored('padding-top: 12pxpx;'))).toEqual({ paddingTop: '12pxpx' });
      expect(styleOf(Box, { gap: '12px' })).toEqual({ paddingTop: '12pxpx' });
    });

    it('re-attaches the unit of a function interpolation that joined the text itself', () => {
      const Box = styled(View)`
        padding-top: ${() => `${s.space}px`};
        margin-left: ${() => `${s.space}px`};
      `;

      expect(styleOf(Box)).toEqual({ marginLeft: 8, paddingTop: 8 });
      expect(styleOf(Box, { space: 12 })).toEqual({ marginLeft: 12, paddingTop: 12 });
    });

    it('takes the fallback unit for a bare provider number only when a function returns the placeholder', () => {
      const leading = createTheme({ lead: '2em' });
      const Direct = styled(View)`
        line-height: ${leading.lead};
      `;
      const Returned = styled(View)`
        line-height: ${() => leading.lead};
      `;

      expect(styleOf(Direct, { lead: 3 })).toEqual({ lineHeight: 3 });
      expect(styleOf(Returned, { lead: 3 })).toEqual({ lineHeight: 48 });
    });

    it('reads a themed value inside a nested css fragment', () => {
      const inner = css`
        padding-top: ${s.space}px;
      `;
      const Box = styled(View)`
        ${inner}
        margin-left: ${s.space}px;
      `;

      expect(styleOf(Box)).toEqual({ marginLeft: 8, paddingTop: 8 });
      expect(styleOf(Box, { space: 12 })).toEqual({ marginLeft: 12, paddingTop: 12 });
    });

    it('re-attaches the unit of a fragment joined into a value', () => {
      const Box = styled(View)`
        padding-top: ${css`
          ${s.space}px
        `};
      `;

      expect(styleOf(Box)).toEqual({ paddingTop: 8 });
      expect(styleOf(Box, { space: 12 })).toEqual({ paddingTop: 12 });
    });
  });

  describe('a themed value in a conditional block', () => {
    it('reads inside a media query block', () => {
      const Box = styled(View)`
        opacity: 1;
        @media (min-width: 100px) {
          opacity: ${t.dim};
        }
      `;

      expect(styleOf(Box)).toEqual([{ opacity: 1 }, { opacity: 0.2 }]);
      expect(styleOf(Box, { dim: '0.4' })).toEqual([{ opacity: 1 }, { opacity: 0.4 }]);
    });

    it('reads with !important', () => {
      const Box = styled(View)`
        opacity: ${t.dim} !important;
      `;

      expect(styleOf(Box)).toEqual([{}, { opacity: 0.2 }]);
      expect(styleOf(Box, { dim: '0.4' })).toEqual([{}, { opacity: 0.4 }]);
    });

    it('reads inside @starting-style', () => {
      const Themed = styled(View)`
        opacity: 1;
        @starting-style {
          opacity: ${t.dim};
        }
      `;
      const Authored = styled(View)`
        opacity: 1;
        @starting-style {
          opacity: 0.4;
        }
      `;
      const withProvider = (Component: React.ComponentType) =>
        TestRenderer.create(
          <ThemeProvider theme={{ dim: '0.4' }}>
            <Component />
          </ThemeProvider>
        ).toJSON();

      expect(withProvider(Themed)).toEqual(withProvider(Authored));
    });

    it('follows the provider value in a media query prelude', () => {
      const queries = createTheme({ bp: 1000 });
      const Box = styled(View)`
        opacity: 1;
        @media (min-width: ${queries.bp}px) {
          opacity: 0.5;
        }
      `;

      expect(styleOf(Box)).toEqual({ opacity: 1 });
      expect(styleOf(Box, { bp: 100 })).toEqual([{ opacity: 1 }, { opacity: 0.5 }]);
    });
  });

  describe('a themed value an extractor reads', () => {
    // Handlers are fresh per instance; their presence is what matters.
    const rendered = (Component: React.ComponentType) => {
      const json = TestRenderer.create(<Component />).toJSON();
      const props: Record<string, unknown> = {};
      if (json !== null && !Array.isArray(json)) {
        for (const [key, value] of Object.entries(json.props)) {
          props[key] = typeof value === 'function' ? 'function' : value;
        }
      }
      return props;
    };

    it('reads a themed animation-name', () => {
      const names = createTheme({ name: 'fade' });
      const Themed = styled(View)`
        animation-duration: 50ms;
        animation-name: ${names.name};
        @keyframes fade {
          from {
            opacity: 1;
          }
          to {
            opacity: 0.5;
          }
        }
      `;
      const Authored = styled(View)`
        animation-duration: 50ms;
        animation-name: fade;
        @keyframes fade {
          from {
            opacity: 1;
          }
          to {
            opacity: 0.5;
          }
        }
      `;
      const Unnamed = styled(View)`
        animation-duration: 50ms;
        animation-name: none;
      `;

      expect(rendered(Themed)).toEqual(rendered(Authored));
      expect(rendered(Themed)).not.toEqual(rendered(Unnamed));
    });

    it('reads a themed position: sticky', () => {
      const positions = createTheme({ position: 'sticky' });
      const Themed = styled(View)`
        position: ${positions.position};
        top: 0;
      `;
      const Authored = styled(View)`
        position: sticky;
        top: 0;
      `;
      const Relative = styled(View)`
        position: relative;
        top: 0;
      `;

      expect(rendered(Themed)).toEqual(rendered(Authored));
      expect(rendered(Themed)).not.toEqual(rendered(Relative));
    });

    it('reads a themed display: grid', () => {
      const displays = createTheme({ display: 'grid' });
      const Themed = styled(View)`
        display: ${displays.display};
        grid-template-columns: repeat(2, 1fr);
      `;
      const Authored = styled(View)`
        display: grid;
        grid-template-columns: repeat(2, 1fr);
      `;
      const Flex = styled(View)`
        display: flex;
        grid-template-columns: repeat(2, 1fr);
      `;

      expect(rendered(Themed)).toEqual(rendered(Authored));
      expect(rendered(Themed)).not.toEqual(rendered(Flex));
    });
  });

  describe('a theme change', () => {
    it('re-expands a shorthand', () => {
      const s = createTheme({ space: '4px' });
      const Box = styled(View)`
        margin: ${s.space};
      `;
      const tree = TestRenderer.create(
        <ThemeProvider theme={{ space: '4px' }}>
          <Box />
        </ThemeProvider>
      );
      const first = tree.root.findByType(View).props.style;
      TestRenderer.act(() => {
        tree.update(
          <ThemeProvider theme={{ space: '8px 2px' }}>
            <Box />
          </ThemeProvider>
        );
      });

      expect(first).toEqual({ margin: 4 });
      expect(tree.root.findByType(View).props.style).toEqual({
        marginBottom: 8,
        marginLeft: 2,
        marginRight: 2,
        marginTop: 8,
      });
    });

    it('reads each of three theme objects correctly when they alternate', () => {
      const Box = styled(View)`
        opacity: ${t.dim};
      `;
      const themes = [{ dim: '0.1' }, { dim: '0.2' }, { dim: '0.3' }];
      const tree = TestRenderer.create(
        <ThemeProvider theme={themes[0]}>
          <Box />
        </ThemeProvider>
      );
      const seen = [0, 1, 0, 2, 1, 2, 0].map(index => {
        TestRenderer.act(() => {
          tree.update(
            <ThemeProvider theme={themes[index]}>
              <Box />
            </ThemeProvider>
          );
        });
        return tree.root.findByType(View).props.style.opacity;
      });

      expect(seen).toEqual([0.1, 0.2, 0.1, 0.3, 0.2, 0.3, 0.1]);
    });

    it('changes a running animation duration exactly as an authored duration change does', () => {
      jest.useFakeTimers();
      const timing = jest.spyOn(Animated, 'timing');
      const speeds = createTheme({ ms: 50 });
      const frames = `
        @keyframes fade {
          from {
            opacity: 1;
          }
          to {
            opacity: 0.5;
          }
        }
      `;
      const Themed = styled(View)`
        animation: fade ${speeds.ms}ms linear forwards;
        ${frames}
      `;
      const Authored = styled(View)<{ $ms: number }>`
        animation: fade ${p => p.$ms}ms linear forwards;
        ${frames}
      `;
      const lastDuration = () => timing.mock.calls[timing.mock.calls.length - 1][1].duration;
      const durations = (render: (ms: number) => React.ReactElement) => {
        const tree = TestRenderer.create(render(50));
        const first = lastDuration();
        TestRenderer.act(() => {
          tree.update(render(400));
        });
        const second = lastDuration();
        TestRenderer.act(() => {
          tree.unmount();
        });
        return { first, second };
      };
      try {
        const themed = durations(ms => (
          <ThemeProvider theme={{ ms }}>
            <Themed />
          </ThemeProvider>
        ));
        const authored = durations(ms => <Authored $ms={ms} />);

        expect(themed).toEqual(authored);
        expect(themed.first).toBe(50);
      } finally {
        jest.useRealTimers();
      }
    });

    it('reads a new theme object that holds the same values as the old one', () => {
      const Box = styled(View)`
        opacity: ${t.dim};
      `;
      const tree = TestRenderer.create(
        <ThemeProvider theme={{ dim: '0.4' }}>
          <Box />
        </ThemeProvider>
      );
      TestRenderer.act(() => {
        tree.update(
          <ThemeProvider theme={{ dim: '0.4' }}>
            <Box />
          </ThemeProvider>
        );
      });

      expect(tree.root.findByType(View).props.style).toEqual({ opacity: 0.4 });
    });

    it('reads the same theme object for every render of a component with only static values', () => {
      const Box = styled(View)`
        opacity: ${t.dim};
      `;
      const theme = { dim: '0.4' };
      const tree = TestRenderer.create(
        <ThemeProvider theme={theme}>
          <Box />
        </ThemeProvider>
      );
      const first = tree.root.findByType(View).props.style;
      TestRenderer.act(() => {
        tree.update(
          <ThemeProvider theme={theme}>
            <Box />
          </ThemeProvider>
        );
      });

      expect(tree.root.findByType(View).props.style).toBe(first);
    });
  });

  describe('a theme set by attrs', () => {
    const platformColor = { semantic: ['systemBackground'] };
    const palette = createTheme({ bg: '#ffffff', gap: '4px' });

    it('reads the attrs theme for text and object values', () => {
      const Box = styled(View).attrs(() => ({
        theme: { bg: platformColor, gap: '9px' },
      }))`
        background-color: ${palette.bg};
        margin-top: ${palette.gap};
      `;

      expect(styleOf(Box, { bg: 'red', gap: '1px' })).toEqual({
        backgroundColor: platformColor,
        marginTop: 9,
      });
    });

    it('reads the defaults when attrs remove the theme', () => {
      const Box = styled(View).attrs(() => ({ theme: undefined }))`
        background-color: ${palette.bg};
        margin-top: ${palette.gap};
      `;

      expect(styleOf(Box, { bg: 'red', gap: '1px' })).toEqual({
        backgroundColor: '#ffffff',
        marginTop: 4,
      });
    });
  });

  describe('a theme value that is not one CSS value', () => {
    it.each(['red; position: absolute', 'red} * { color: blue', '{'])(
      'falls back to the default for %j and warns',
      bad => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const ink = createTheme({ ink: 'tomato' });
        const Box = styled(View)`
          background-color: ${ink.ink};
        `;

        expect(styleOf(Box, { ink: bad })).toEqual({ backgroundColor: 'tomato' });
        expect(warn.mock.calls.map(call => call[0])).toEqual([expect.stringContaining('`ink`')]);
        warn.mockRestore();
      }
    );

    it('keeps a value with commas and parentheses', () => {
      const images = createTheme({ image: 'none' });
      const Box = styled(View)`
        background-image: ${images.image};
      `;

      expect(styleOf(Box, { image: 'linear-gradient(to right, red, blue)' })).toEqual({
        backgroundImage: 'linear-gradient(to right, red, blue)',
        experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
      });
    });

    it('keeps a semicolon inside a string', () => {
      const fonts = createTheme({ family: 'serif' });
      const Box = styled(View)`
        font-family: ${fonts.family};
      `;
      const provided = '"semi;colon"';

      expect(styleOf(Box, { family: provided })).toEqual(
        styleOf(authored(`font-family: ${provided};`))
      );
      expect(styleOf(Box, { family: provided })).not.toEqual(styleOf(Box));
    });
  });

  describe('a provider value of an unexpected shape', () => {
    const platformColor = { semantic: ['systemBackground'] };
    const ink = createTheme({ ink: 'tomato', pad: 4 });
    const Box = styled(View)`
      background-color: ${ink.ink};
      padding-top: ${ink.pad};
    `;

    it.each([
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['null', null],
    ])('reads the default for %s', (_name, bad) => {
      expect(styleOf(Box, { ink: bad, pad: bad })).toEqual({
        backgroundColor: 'tomato',
        paddingTop: 4,
      });
    });

    it('passes an object through to the style', () => {
      expect(styleOf(Box, { ink: platformColor })).toEqual({
        backgroundColor: platformColor,
        paddingTop: 4,
      });
    });

    it('passes a boolean through to the style', () => {
      expect(styleOf(Box, { pad: true })).toEqual({ backgroundColor: 'tomato', paddingTop: true });
    });

    it('passes an array through to the style', () => {
      expect(styleOf(Box, { ink: ['a', 'b'] })).toEqual({
        backgroundColor: ['a', 'b'],
        paddingTop: 4,
      });
    });

    it('reads the defaults when the provider holds the contract itself', () => {
      expect(styleOf(Box, ink)).toEqual({ backgroundColor: 'tomato', paddingTop: 4 });
    });
  });

  describe('outside a component', () => {
    it('toStyleSheet reads the default values', () => {
      const s = createTheme({ space: '4px 8px', ink: 'tomato' });

      expect(
        toStyleSheet(css`
          margin: ${s.space};
          color: ${s.ink};
        `)
      ).toEqual({ color: 'tomato', marginBottom: 4, marginLeft: 8, marginRight: 8, marginTop: 4 });
    });
  });
});
