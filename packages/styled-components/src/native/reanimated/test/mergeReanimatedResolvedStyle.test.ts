import type { NativeStyles } from '../../../models/compileNative';
import type { ResolveEnv } from '../../transform/polyfills/resolvers';
import { mergeReanimatedResolvedStyle } from '../mergeReanimatedResolvedStyle';

const env: ResolveEnv = {
  media: {
    width: 400,
    height: 800,
    colorScheme: 'light',
    reduceMotion: false,
    fontScale: 1,
    pixelRatio: 1,
  },
  container: null,
  theme: {},
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  rootFontSize: 16,
  fontSize: 16,
  lineHeight: 24,
  direction: 'ltr',
};

describe('mergeReanimatedResolvedStyle', () => {
  it('merges starting-style snapshot onto flat resolved when requested', () => {
    const compiled = {
      base: {},
      conditional: [],
      nonPseudoEntries: [],
      pseudoEntries: [],
      hasPseudo: false,
      keyframes: [],
      startingStyle: { opacity: 0 },
    } as unknown as NativeStyles;

    const out = mergeReanimatedResolvedStyle({ opacity: 1, marginTop: 2 }, compiled, env, true);
    expect(out).toEqual({ opacity: 0, marginTop: 2 });
  });

  it('does not merge when mergeStarting is false', () => {
    const compiled = {
      startingStyle: { opacity: 0 },
    } as unknown as NativeStyles;

    const out = mergeReanimatedResolvedStyle({ opacity: 1 }, compiled, env, false);
    expect(out).toEqual({ opacity: 1 });
  });
});
