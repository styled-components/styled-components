import { themeValue, type ThemeLeafPath, type ThemePath, type ThemeValue } from '../themePath';

describe('themePath', () => {
  describe('themeValue (runtime)', () => {
    const theme = {
      color: {
        red: { 500: '#ef4444', 600: '#dc2626' },
        blue: { 500: '#3b82f6' },
        'kebab-key': 'kebab-value',
      },
      space: [0, 4, 8, 16, 32],
      flat: 'top-level',
    } as const;

    it('walks a simple dot path to a primitive', () => {
      expect(themeValue(theme, 'color.red.500')).toBe('#ef4444');
      expect(themeValue(theme, 'color.blue.500')).toBe('#3b82f6');
    });

    it('returns intermediate object values for non-leaf paths', () => {
      expect(themeValue(theme, 'color.red')).toEqual({ 500: '#ef4444', 600: '#dc2626' });
    });

    it('walks numeric array indices', () => {
      expect(themeValue(theme, 'space.0')).toBe(0);
      expect(themeValue(theme, 'space.3')).toBe(16);
    });

    it('returns top-level values', () => {
      expect(themeValue(theme, 'flat')).toBe('top-level');
    });

    it('supports keys with hyphens', () => {
      expect(themeValue(theme, 'color.kebab-key')).toBe('kebab-value');
    });

    it('returns undefined when any segment is missing', () => {
      expect(themeValue(theme, 'color.green')).toBeUndefined();
      expect(themeValue(theme, 'color.red.700')).toBeUndefined();
      expect(themeValue(theme, 'nope')).toBeUndefined();
    });

    it('returns undefined for null/undefined theme', () => {
      expect(themeValue(null, 'anything')).toBeUndefined();
      expect(themeValue(undefined, 'anything')).toBeUndefined();
    });
  });

  describe('type tests (compile-time, runtime no-ops)', () => {
    interface SampleTheme {
      color: {
        red: { 500: string; 600: string };
        blue: { 500: string };
      };
      space: readonly [0, 4, 8, 16];
      flat: number;
    }

    it('ThemeLeafPath produces only leaf paths', () => {
      // Compile-time assertion: each variant is assignable to ThemeLeafPath.
      const paths: ThemeLeafPath<SampleTheme>[] = [
        'color.red.500',
        'color.red.600',
        'color.blue.500',
        'space.0',
        'space.1',
        'space.2',
        'space.3',
        'flat',
      ];
      expect(paths.length).toBe(8);
    });

    it('ThemePath includes intermediate paths', () => {
      const paths: ThemePath<SampleTheme>[] = [
        'color',
        'color.red',
        'color.red.500',
        'space',
        'flat',
      ];
      expect(paths.length).toBe(5);
    });

    it('ThemeValue infers the value type at a path', () => {
      // Compile-time assertion via assignment: leaf path infers leaf type.
      const _color: ThemeValue<SampleTheme, 'color.red.500'> = '#ef4444';
      const _space: ThemeValue<SampleTheme, 'space.0'> = 0;
      const _flat: ThemeValue<SampleTheme, 'flat'> = 42;
      expect([_color, _space, _flat]).toEqual(['#ef4444', 0, 42]);
    });

    it('ThemeValue at intermediate path infers the sub-object type', () => {
      const _red: ThemeValue<SampleTheme, 'color.red'> = { 500: 'a', 600: 'b' };
      expect(_red[500]).toBe('a');
    });
  });
});
