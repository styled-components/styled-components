import { render } from '@testing-library/react';
import React from 'react';
import createTheme from '../constructors/createTheme';
import { getRenderedCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('HMR + createTheme interaction', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    styled = resetStyled();
  });

  it('picks up new theme token values when module re-evaluates (static rules)', () => {
    // Simulate initial module evaluation: createTheme with original values
    const themeV1 = createTheme({ colors: { primary: '#0070f3', text: '#111' } });

    // Component created with V1 tokens — these are static strings baked into rules
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

    // Simulate HMR: module re-evaluates, createTheme called with new defaults.
    // The SWC plugin keeps componentId stable, but styled() creates a NEW
    // WebStyle instance with different rules (new token strings).
    const themeV2 = createTheme({ colors: { primary: 'blue', text: 'white' } });
    const CompV2 = styled.div`
      color: ${themeV2.colors.primary};
      background: ${themeV2.colors.text};
    `;

    // Re-render with the new component (simulates Fast Refresh swapping the export).
    // The old `.a` class CSS stays in the sheet, but the component now renders
    // with a new class name derived from the new CSS.
    rerender(<CompV2 />);
    const css = getRenderedCSS();

    // New CSS is present
    expect(css).toContain('color: var(--sc-colors-primary, blue)');
    expect(css).toContain('background: var(--sc-colors-text, white)');
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

    // Both class names exist in the sheet (old is not cleaned up, new is added)
    expect(cssAfterV2).toContain('var(--sc-size, 16px)');
    expect(cssAfterV2).toContain('var(--sc-size, 20px)');

    // The two components got different class names
    expect(cssAfterV1).not.toEqual(cssAfterV2);
  });

  it('updates CSS when theme tokens change but componentId stays the same', () => {
    // This is the key HMR scenario: SWC plugin assigns stable componentIds,
    // so the SAME componentId is used for both versions.
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

    // HMR: same componentId, different theme tokens
    const themeV2 = createTheme({ color: 'blue' });
    const CompV2 = styled.div.withConfig({ componentId: 'sc-hmr-theme' })`
      color: ${themeV2.color};
    `;

    rerender(<CompV2 />);
    const css = getRenderedCSS();

    // New CSS injected under the same componentId group
    expect(css).toContain('color: var(--sc-color, blue)');
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

    // HMR: theme changes (dark mode defaults)
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

    const css = getRenderedCSS();
    expect(css).toContain('background: var(--sc-colors-bg, #111)');
    expect(css).toContain('padding: var(--sc-spacing-md, 20px)');
    expect(css).toContain('color: var(--sc-colors-text, #eee)');
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

    // The static componentId portion stays the same
    expect(classV1).toContain('sc-hmr-cls');
    expect(classV2).toContain('sc-hmr-cls');

    // But the generated hash class changed because CSS changed
    const hashV1 = classV1.replace('sc-hmr-cls', '').trim();
    const hashV2 = classV2.replace('sc-hmr-cls', '').trim();
    expect(hashV1).not.toBe(hashV2);

    // The element only has one generated class (not both old and new)
    expect(classV2.split(' ').filter((c: string) => c && c !== 'sc-hmr-cls')).toHaveLength(1);
  });

  it('stale CSS accumulates in stylesheet but only new class is applied to DOM', () => {
    // This tests the known behavior: old CSS is NOT cleaned up from the
    // stylesheet on HMR, but the element only references the new class.
    // The old CSS is harmless dead weight until a full page reload.
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

    // Element references only V2's hash class, not V1's
    const hashV1 = className1.split(' ').find((c: string) => c !== 'sc-hmr-stale')!;
    const hashV2 = className2.split(' ').find((c: string) => c !== 'sc-hmr-stale')!;
    expect(hashV1).not.toBe(hashV2);
    expect(className2.split(' ')).not.toContain(hashV1);

    // But the stylesheet has both
    const css = getRenderedCSS();
    expect(css).toContain('font-weight: var(--sc-weight, 400)');
    expect(css).toContain('font-weight: var(--sc-weight, 700)');
  });

  it('works when only the prefix option changes between HMR cycles', () => {
    const themeV1 = createTheme({ color: 'red' }, { prefix: 'v1' });
    const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-prefix' })`
      color: ${themeV1.color};
    `;

    const { rerender } = render(<CompV1 />);
    expect(getRenderedCSS()).toContain('var(--v1-color, red)');

    const themeV2 = createTheme({ color: 'red' }, { prefix: 'v2' });
    const CompV2 = styled.div.withConfig({ componentId: 'sc-hmr-prefix' })`
      color: ${themeV2.color};
    `;

    rerender(<CompV2 />);
    const css = getRenderedCSS();
    expect(css).toContain('var(--v2-color, red)');
  });

  it('render cache busts when WebStyle instance changes (HMR invalidation)', () => {
    // The render cache tuple stores webStyle at index [7].
    // On HMR, styled() creates a new WebStyle, so prev[7] !== webStyle.
    // This forces re-computation even if props/theme are identical.
    const themeV1 = createTheme({ gap: '8px' });
    const CompV1 = styled.div.withConfig({ componentId: 'sc-hmr-rendercache' })`
      gap: ${themeV1.gap};
    `;

    const { container, rerender } = render(<CompV1 />);

    // Re-render with SAME props — should be a cache hit
    rerender(<CompV1 />);
    const classAfterCacheHit = container.firstElementChild!.className;

    // Now simulate HMR: new WebStyle instance, same CSS
    const themeV1Copy = createTheme({ gap: '8px' });
    const CompV1Reval = styled.div.withConfig({ componentId: 'sc-hmr-rendercache' })`
      gap: ${themeV1Copy.gap};
    `;

    rerender(<CompV1Reval />);
    const classAfterHmr = container.firstElementChild!.className;

    // Same CSS -> same generated class name, even though cache was busted
    expect(classAfterHmr).toBe(classAfterCacheHit);
  });

  it('vars property reflects theme structure changes across HMR', () => {
    // When theme shape changes during HMR (e.g., adding a new token),
    // the vars property on the new theme should reflect the updated shape.
    const themeV1 = createTheme({ colors: { primary: 'red' } });
    expect(themeV1.vars.colors.primary).toBe('--sc-colors-primary');

    const themeV2 = createTheme({
      colors: { primary: 'blue', secondary: 'green' },
    });
    expect(themeV2.vars.colors.primary).toBe('--sc-colors-primary');
    expect(themeV2.vars.colors.secondary).toBe('--sc-colors-secondary');

    // Using both in components — new token works correctly
    const Comp = styled.div`
      color: ${themeV2.colors.primary};
      border-color: ${themeV2.colors.secondary};
    `;

    render(<Comp />);
    const css = getRenderedCSS();
    expect(css).toContain('var(--sc-colors-primary, blue)');
    expect(css).toContain('var(--sc-colors-secondary, green)');
  });
});
