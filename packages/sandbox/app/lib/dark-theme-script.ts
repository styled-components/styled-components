import { themes } from './test-themes';

function buildVarOverrides(preset: 'light' | 'dark') {
  const t = themes[preset];
  const declarations: string[] = [];

  function walk(obj: Record<string, any>, prefix: string) {
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'object' && val !== null) {
        walk(val, prefix + '-' + key);
      } else {
        declarations.push(`--sc${prefix}-${key}: ${val};`);
      }
    }
  }

  walk(t as any, '');
  return declarations.join('\n    ');
}

export const lightThemeVarOverrides = buildVarOverrides('light');
export const darkThemeVarOverrides = buildVarOverrides('dark');
