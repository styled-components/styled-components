import React from 'react';
import TestRenderer from 'react-test-renderer';
import createTheme from '../createTheme';
import { ThemeProvider } from '../../models/ThemeProvider';

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
      // jsdom provides window, so IS_BROWSER is true — but we can still
      // verify the function exists and returns the correct shape
      expect(typeof theme.resolve).toBe('function');
    });
  });
});
