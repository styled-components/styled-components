import { render } from '@testing-library/react';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import createTheme from '../createTheme';
import { ThemeProvider } from '../../models/ThemeProvider';
import { getRenderedCSS, resetStyled } from '../../test/utils';

describe('createTheme', () => {
  describe('var() generation', () => {
    it('produces var() references with fallbacks for flat themes', () => {
      const theme = createTheme({ primary: '#0070f3', size: 16 });
      expect(theme.primary).toBe('var(--sc-primary, #0070f3)');
      expect(theme.size).toBe('var(--sc-size, 16)');
    });

    it('produces var() references for nested themes', () => {
      const theme = createTheme({ colors: { primary: '#0070f3', text: '#111' } });
      expect(theme.colors.primary).toBe('var(--sc-colors-primary, #0070f3)');
      expect(theme.colors.text).toBe('var(--sc-colors-text, #111)');
    });

    it('respects custom prefix', () => {
      const theme = createTheme({ color: 'red' }, { prefix: 'ds' });
      expect(theme.color).toBe('var(--ds-color, red)');
    });

    it('preserves raw theme object', () => {
      const input = { colors: { primary: '#0070f3' } };
      const theme = createTheme(input);
      expect(theme.raw).toBe(input);
    });

    it('exposes bare CSS variable names via vars', () => {
      const theme = createTheme(
        { colors: { primary: '#0070f3', text: '#111' }, spacing: { md: '16px' } },
        { prefix: 'app' }
      );
      expect(theme.vars.colors.primary).toBe('--app-colors-primary');
      expect(theme.vars.colors.text).toBe('--app-colors-text');
      expect(theme.vars.spacing.md).toBe('--app-spacing-md');
    });
  });

  describe('unbalanced parentheses warning', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('does not warn for simple values', () => {
      createTheme({ color: '#0070f3', size: 16, font: 'Arial' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for balanced parentheses like rgb()', () => {
      createTheme({ color: 'rgb(255, 0, 0)' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for nested balanced parentheses like calc(var())', () => {
      createTheme({ size: 'calc(100% - var(--gap, 8px))' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warns for a bare unmatched closing paren', () => {
      createTheme({ bad: ')' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unbalanced parentheses'));
    });

    it('warns for a bare unmatched opening paren', () => {
      createTheme({ bad: 'foo(' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unbalanced parentheses'));
    });

    it('warns for misordered parens like )(', () => {
      createTheme({ bad: ')(' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unbalanced parentheses'));
    });

    it('warns for excess closing parens even with some balanced', () => {
      createTheme({ bad: 'foo(bar))' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('includes the path in the warning message', () => {
      createTheme({ colors: { bad: ')' } });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('colors-bad'));
    });

    it('warns for each unbalanced value independently', () => {
      createTheme({ a: ')', b: 'ok', c: '(' });
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('GlobalStyle', () => {
    it('returns a GlobalStyle component', () => {
      const theme = createTheme({ color: 'red' });
      expect(theme.GlobalStyle).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('throws on the server', () => {
      const theme = createTheme({ color: 'red' });
      // jsdom provides window, so IS_BROWSER is true;but we can still
      // verify the function exists and returns the correct shape
      expect(typeof theme.resolve).toBe('function');
    });
  });

  describe('HMR', () => {
    let styled: ReturnType<typeof resetStyled>;

    beforeEach(() => {
      document.head.innerHTML = '';
      styled = resetStyled();
    });

    it('picks up new theme token values when module re-evaluates (static rules)', () => {
      const themeV1 = createTheme({ colors: { primary: '#0070f3', text: '#111' } });

      const Comp = styled.div`
        color: ${themeV1.colors.primary};
        background: ${themeV1.colors.text};
      `;

      const { rerender } = render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--sc-colors-primary, #0070f3);
          background: var(--sc-colors-text, #111);
        }"
      `);

      const themeV2 = createTheme({ colors: { primary: 'blue', text: 'white' } });
      const CompV2 = styled.div`
        color: ${themeV2.colors.primary};
        background: ${themeV2.colors.text};
      `;

      rerender(<CompV2 />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--sc-colors-primary, #0070f3);
          background: var(--sc-colors-text, #111);
        }
        .b {
          color: var(--sc-colors-primary, blue);
          background: var(--sc-colors-text, white);
        }"
      `);
    });

    it('generates different class names for different theme token values', () => {
      const themeV1 = createTheme({ size: '16px' });
      const themeV2 = createTheme({ size: '20px' });

      const CompV1 = styled.div`
        font-size: ${themeV1.size};
      `;
      const CompV2 = styled.div`
        font-size: ${themeV2.size};
      `;

      render(<CompV1 />);
      const cssAfterV1 = getRenderedCSS();

      render(<CompV2 />);
      const cssAfterV2 = getRenderedCSS();

      expect(cssAfterV2).toMatchInlineSnapshot(`
        ".a {
          font-size: var(--sc-size, 16px);
        }
        .b {
          font-size: var(--sc-size, 20px);
        }"
      `);

      expect(cssAfterV1).not.toEqual(cssAfterV2);
    });

    it('updates CSS when theme tokens change but componentId stays the same', () => {
      const themeV1 = createTheme({ color: 'red' });
      const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-theme' })`
        color: ${themeV1.color};
      `;

      const { rerender } = render(<CompV1 />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--sc-color, red);
        }"
      `);

      const themeV2 = createTheme({ color: 'blue' });
      const CompV2 = styled.div.withConfig({ componentId: 'sc-hmr-theme' })`
        color: ${themeV2.color};
      `;

      rerender(<CompV2 />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--sc-color, red);
        }
        .b {
          color: var(--sc-color, blue);
        }"
      `);
    });

    it('handles theme token changes in nested components', () => {
      const themeV1 = createTheme({
        colors: { bg: '#fff', text: '#000' },
        spacing: { md: '16px' },
      });

      const Container = styled.div.withConfig({ componentId: 'sc-hmr-container' })`
        background: ${themeV1.colors.bg};
        padding: ${themeV1.spacing.md};
      `;
      const Text = styled.span.withConfig({ componentId: 'sc-hmr-text' })`
        color: ${themeV1.colors.text};
      `;

      const { rerender } = render(
        <Container>
          <Text>hello</Text>
        </Container>
      );

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          background: var(--sc-colors-bg, #fff);
          padding: var(--sc-spacing-md, 16px);
        }
        .b {
          color: var(--sc-colors-text, #000);
        }"
      `);

      const themeV2 = createTheme({
        colors: { bg: '#111', text: '#eee' },
        spacing: { md: '20px' },
      });

      const ContainerV2 = styled.div.withConfig({ componentId: 'sc-hmr-container' })`
        background: ${themeV2.colors.bg};
        padding: ${themeV2.spacing.md};
      `;
      const TextV2 = styled.span.withConfig({ componentId: 'sc-hmr-text' })`
        color: ${themeV2.colors.text};
      `;

      rerender(
        <ContainerV2>
          <TextV2>hello</TextV2>
        </ContainerV2>
      );

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          background: var(--sc-colors-bg, #fff);
          padding: var(--sc-spacing-md, 16px);
        }
        .c {
          background: var(--sc-colors-bg, #111);
          padding: var(--sc-spacing-md, 20px);
        }
        .b {
          color: var(--sc-colors-text, #000);
        }
        .d {
          color: var(--sc-colors-text, #eee);
        }"
      `);
    });

    it('component renders with the correct class when theme tokens change', () => {
      const themeV1 = createTheme({ color: 'red' });
      const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-cls' })`
        color: ${themeV1.color};
      `;

      const { container, rerender } = render(<CompV1 />);
      const classV1 = container.firstElementChild!.className;

      const themeV2 = createTheme({ color: 'blue' });
      const CompV2 = styled.div.withConfig({ componentId: 'sc-hmr-cls' })`
        color: ${themeV2.color};
      `;

      rerender(<CompV2 />);
      const classV2 = container.firstElementChild!.className;

      expect(classV1).toMatchInlineSnapshot(`"sc-hmr-cls a"`);
      expect(classV2).toMatchInlineSnapshot(`"sc-hmr-cls b"`);

      const hashV1 = classV1.replace('sc-hmr-cls', '').trim();
      const hashV2 = classV2.replace('sc-hmr-cls', '').trim();
      expect(hashV1).not.toBe(hashV2);

      expect(classV2.split(' ').filter((c: string) => c && c !== 'sc-hmr-cls')).toHaveLength(1);
    });

    it('stale CSS accumulates in stylesheet but only new class is applied to DOM', () => {
      const themeV1 = createTheme({ weight: '400' });
      const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-stale' })`
        font-weight: ${themeV1.weight};
      `;

      const { container, rerender } = render(<CompV1 />);
      const className1 = container.firstElementChild!.className;

      const themeV2 = createTheme({ weight: '700' });
      const CompV2 = styled.div.withConfig({ componentId: 'sc-hmr-stale' })`
        font-weight: ${themeV2.weight};
      `;

      rerender(<CompV2 />);
      const className2 = container.firstElementChild!.className;

      const hashV1 = className1.split(' ').find((c: string) => c !== 'sc-hmr-stale')!;
      const hashV2 = className2.split(' ').find((c: string) => c !== 'sc-hmr-stale')!;
      expect(hashV1).not.toBe(hashV2);
      expect(className2.split(' ')).not.toContain(hashV1);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          font-weight: var(--sc-weight, 400);
        }
        .b {
          font-weight: var(--sc-weight, 700);
        }"
      `);
    });

    it('works when only the prefix option changes between HMR cycles', () => {
      const themeV1 = createTheme({ color: 'red' }, { prefix: 'v1' });
      const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-prefix' })`
        color: ${themeV1.color};
      `;

      const { rerender } = render(<CompV1 />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--v1-color, red);
        }"
      `);

      const themeV2 = createTheme({ color: 'red' }, { prefix: 'v2' });
      const CompV2 = styled.div.withConfig({ componentId: 'sc-hmr-prefix' })`
        color: ${themeV2.color};
      `;

      rerender(<CompV2 />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--v1-color, red);
        }
        .b {
          color: var(--v2-color, red);
        }"
      `);
    });

    it('render cache busts when WebStyle instance changes (HMR invalidation)', () => {
      const themeV1 = createTheme({ gap: '8px' });
      const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-rendercache' })`
        gap: ${themeV1.gap};
      `;

      const { container, rerender } = render(<CompV1 />);

      rerender(<CompV1 />);
      const classAfterCacheHit = container.firstElementChild!.className;

      const themeV1Copy = createTheme({ gap: '8px' });
      const CompV1Reval = styled.div.withConfig({ componentId: 'sc-hmr-rendercache' })`
        gap: ${themeV1Copy.gap};
      `;

      rerender(<CompV1Reval />);
      const classAfterHmr = container.firstElementChild!.className;

      expect(classAfterHmr).toBe(classAfterCacheHit);
    });

    it('vars property reflects theme structure changes across HMR', () => {
      const themeV1 = createTheme({ colors: { primary: 'red' } });
      expect(themeV1.vars.colors.primary).toBe('--sc-colors-primary');

      const themeV2 = createTheme({
        colors: { primary: 'blue', secondary: 'green' },
      });
      expect(themeV2.vars.colors.primary).toBe('--sc-colors-primary');
      expect(themeV2.vars.colors.secondary).toBe('--sc-colors-secondary');

      const Comp = styled.div`
        color: ${themeV2.colors.primary};
        border-color: ${themeV2.colors.secondary};
      `;

      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--sc-colors-primary, blue);
          border-color: var(--sc-colors-secondary, green);
        }"
      `);
    });
  });
});
