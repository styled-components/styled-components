import React from 'react';
import TestRenderer from 'react-test-renderer';
import { View } from 'react-native';

import createTheme from '../../constructors/createTheme';
import ThemeProvider, { ThemeContext } from '../../models/ThemeProvider';
import styled from '..';

describe('createTheme — native parity', () => {
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

  it('supports dynamic theme swaps — same component re-resolves across updates', () => {
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

  it('preserves colon-bearing leaf values (URLs, time strings) through the sentinel round-trip', () => {
    const theme = createTheme({
      images: { hero: 'url(http://example.com/x.png)' },
      times: { open: '12:00' },
    });
    const Box = styled(View)`
      background-color: ${theme.images.hero};
      border-color: ${theme.times.open};
    `;
    // No ThemeProvider override — fallback path must round-trip the literal value
    // even though it contains additional `:` characters after the path/fallback boundary.
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'url(http://example.com/x.png)',
        borderColor: '12:00',
      })
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

  it('preserves slash-bearing fallback (composite border-radius style)', () => {
    const theme = createTheme({
      radius: { composite: '8px / 16px' },
    });
    const Box = styled(View)`
      border-radius: ${theme.radius.composite};
    `;
    const tree = TestRenderer.create(<Box />);
    expect(tree.root.findByType(View).props.style).toEqual(
      expect.objectContaining({ borderRadius: '8px / 16px' })
    );
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
