/**
 * @jest-environment node
 */

// Mock React.cache (not available in React 18 test env, but needed for RSC dedup)
const mockCacheStore = new Map<Function, any>();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    cache: (fn: Function) => () => {
      if (!mockCacheStore.has(fn)) mockCacheStore.set(fn, fn());
      return mockCacheStore.get(fn);
    },
  };
});

// Mock IS_RSC before importing the module
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { mainSheet } from '../../models/StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';
import styled, { createGlobalStyle, createTheme } from '../../index';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import rscPlugin from '../../utils/rsc';

/** Extract all CSS rule text from <style> tags in rendered HTML */
const extractStyleContents = (html: string): string =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('');

describe('createTheme RSC integration', () => {
  beforeEach(() => {
    mockCacheStore.clear();
    resetGroupIds();
    mainSheet.names = new Map();
    mainSheet.clearTag();
  });

  describe('createTheme tokens in RSC render', () => {
    it('should emit CSS with var() references from createTheme tokens', () => {
      const theme = createTheme({
        colors: { primary: '#0070f3', text: '#111' },
        spacing: { md: '16px' },
      });

      const Card = styled.div`
        color: ${theme.colors.primary};
        padding: ${theme.spacing.md};
      `;

      const html = ReactDOMServer.renderToString(React.createElement(Card));
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatchInlineSnapshot(
        `".btdBsZ{color:var(--sc-colors-primary, #0070f3);padding:var(--sc-spacing-md, 16px);}"`
      );
    });

    it('should emit correct var() references with custom prefix', () => {
      const theme = createTheme({ bg: '#fff', fg: '#000' }, { prefix: 'app' });

      const Box = styled.div`
        background: ${theme.bg};
        color: ${theme.fg};
      `;

      const html = ReactDOMServer.renderToString(React.createElement(Box));
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatchInlineSnapshot(
        `".klvHP{background:var(--app-bg, #fff);color:var(--app-fg, #000);}"`
      );
    });

    it('should handle deeply nested theme tokens in RSC', () => {
      const theme = createTheme({
        colors: {
          brand: { primary: '#0070f3', secondary: '#ff6b6b' },
          neutral: { dark: '#111', light: '#f5f5f5' },
        },
      });

      const Badge = styled.span`
        background: ${theme.colors.brand.primary};
        color: ${theme.colors.neutral.light};
        border-color: ${theme.colors.brand.secondary};
      `;

      const html = ReactDOMServer.renderToString(React.createElement(Badge));
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatchInlineSnapshot(
        `".kQkvAb{background:var(--sc-colors-brand-primary, #0070f3);color:var(--sc-colors-neutral-light, #f5f5f5);border-color:var(--sc-colors-brand-secondary, #ff6b6b);}"`
      );
    });
  });

  describe('createTheme + inheritance chain in RSC', () => {
    it('should wrap base CSS in :where() when extended with theme tokens', () => {
      const theme = createTheme({
        colors: { primary: '#0070f3', text: '#111' },
        radii: { md: '8px' },
      });

      const BaseCard = styled.div`
        border-radius: ${theme.radii.md};
        color: ${theme.colors.text};
      `;

      const PrimaryCard = styled(BaseCard)`
        background: ${theme.colors.primary};
        padding: 16px;
      `;

      const html = ReactDOMServer.renderToString(React.createElement(PrimaryCard));
      const allCSS = extractStyleContents(html);

      // Base CSS wrapped in :where() for zero specificity
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*border-radius:var\(--sc-radii-md, 8px\)/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:var\(--sc-colors-text, #111\)/);

      // Extension CSS uses normal selector (no :where)
      expect(allCSS).toMatch(/\.\w+\{[^}]*background:var\(--sc-colors-primary, #0070f3\)/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*background:var\(--sc-colors-primary/);
    });

    it('should propagate var() tokens through three-level inheritance', () => {
      const theme = createTheme({
        font: { family: 'system-ui', size: { sm: '14px', lg: '24px' } },
        colors: { heading: '#1a1a2e' },
      });

      const BaseText = styled.span`
        font-family: ${theme.font.family};
      `;
      const Heading = styled(BaseText)`
        font-size: ${theme.font.size.lg};
        font-weight: 700;
      `;
      const PageTitle = styled(Heading)`
        color: ${theme.colors.heading};
        margin-bottom: 16px;
      `;

      const html = ReactDOMServer.renderToString(React.createElement(PageTitle, null, 'Hello'));
      const allCSS = extractStyleContents(html);

      // All three levels' var() tokens must be present
      expect(allCSS).toContain('var(--sc-font-family, system-ui)');
      expect(allCSS).toContain('var(--sc-font-size-lg, 24px)');
      expect(allCSS).toContain('var(--sc-colors-heading, #1a1a2e)');
    });

    it('should emit var() tokens for sibling extensions sharing a base', () => {
      const theme = createTheme({
        colors: { success: '#28a745', error: '#dc3545', bg: '#fff' },
      });

      const BaseAlert = styled.div`
        background: ${theme.colors.bg};
        padding: 12px;
      `;
      const SuccessAlert = styled(BaseAlert)`
        border-left: 4px solid ${theme.colors.success};
      `;
      const ErrorAlert = styled(BaseAlert)`
        border-left: 4px solid ${theme.colors.error};
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(SuccessAlert),
          React.createElement(ErrorAlert)
        )
      );
      const allCSS = extractStyleContents(html);

      // Both extensions and shared base var() tokens present
      expect(allCSS).toContain('var(--sc-colors-bg, #fff)');
      expect(allCSS).toContain('var(--sc-colors-success, #28a745)');
      expect(allCSS).toContain('var(--sc-colors-error, #dc3545)');
    });
  });

  describe('createTheme + rscPlugin', () => {
    it('should rewrite :first-child while preserving var() theme references', () => {
      const theme = createTheme({
        colors: { highlight: 'coral', normal: '#333' },
      });

      const Item = styled.li`
        color: ${theme.colors.normal};
        &:first-child {
          color: ${theme.colors.highlight};
        }
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement(
          StyleSheetManager,
          { plugins: [rscPlugin] },
          React.createElement(
            'ul',
            null,
            React.createElement(Item, null, 'First'),
            React.createElement(Item, null, 'Second')
          )
        )
      );
      const allCSS = extractStyleContents(html);

      // Plugin rewrites :first-child -> :nth-child(1 of :not(style[data-styled]))
      expect(allCSS).toContain(':nth-child(1 of :not(style[data-styled]))');
      expect(allCSS).not.toContain(':first-child');

      // Theme var() references preserved
      expect(allCSS).toContain('var(--sc-colors-normal, #333)');
      expect(allCSS).toContain('var(--sc-colors-highlight, coral)');
    });
  });

  describe('createTheme.vars in createGlobalStyle (RSC)', () => {
    it('should emit dark mode overrides using vars property', () => {
      const theme = createTheme({
        colors: { bg: '#ffffff', text: '#000000', accent: '#0070f3' },
      });

      const DarkMode = createGlobalStyle`
        .dark {
          ${theme.vars.colors.bg}: #111111;
          ${theme.vars.colors.text}: #eeeeee;
          ${theme.vars.colors.accent}: #3291ff;
        }
      `;

      const html = ReactDOMServer.renderToString(React.createElement(DarkMode));
      const allCSS = extractStyleContents(html);

      // Bare CSS variable names used as property names in the rule
      expect(allCSS).toContain('--sc-colors-bg:#111111');
      expect(allCSS).toContain('--sc-colors-text:#eeeeee');
      expect(allCSS).toContain('--sc-colors-accent:#3291ff');
      // Wrapped in .dark selector
      expect(allCSS).toContain('.dark');
    });

    it('should emit media query dark mode overrides using vars', () => {
      const theme = createTheme({ colors: { bg: '#fff', fg: '#000' } }, { prefix: 'ds' });

      const AutoDark = createGlobalStyle`
        @media (prefers-color-scheme: dark) {
          :root {
            ${theme.vars.colors.bg}: #1a1a1a;
            ${theme.vars.colors.fg}: #e0e0e0;
          }
        }
      `;

      const html = ReactDOMServer.renderToString(React.createElement(AutoDark));
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('--ds-colors-bg:#1a1a1a');
      expect(allCSS).toContain('--ds-colors-fg:#e0e0e0');
      expect(allCSS).toContain('prefers-color-scheme: dark');
    });

    it('should combine vars overrides with theme token usage in same render', () => {
      const theme = createTheme({
        colors: { primary: '#0070f3', bg: '#fff' },
      });

      const DarkOverrides = createGlobalStyle`
        .dark {
          ${theme.vars.colors.primary}: #3291ff;
          ${theme.vars.colors.bg}: #111;
        }
      `;

      const Card = styled.div`
        color: ${theme.colors.primary};
        background: ${theme.colors.bg};
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(DarkOverrides),
          React.createElement(Card)
        )
      );
      const allCSS = extractStyleContents(html);

      // Global dark overrides present
      expect(allCSS).toContain('--sc-colors-primary:#3291ff');
      expect(allCSS).toContain('--sc-colors-bg:#111');

      // Component uses var() references
      expect(allCSS).toContain('var(--sc-colors-primary, #0070f3)');
      expect(allCSS).toContain('var(--sc-colors-bg, #fff)');
    });
  });
});
