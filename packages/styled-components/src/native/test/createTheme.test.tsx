import React from 'react';
import TestRenderer from 'react-test-renderer';
import { View } from 'react-native';

import createTheme from '../../constructors/createTheme';
import ThemeProvider from '../../models/ThemeProvider';
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
});
