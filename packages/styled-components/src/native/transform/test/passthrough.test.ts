import { transformDecl } from '../index';
import { getPassthroughKeys, getPrimaryPassthroughKey } from '../passthrough';

describe('passthrough mapping', () => {
  describe('single-key passthroughs', () => {
    it.each([
      ['transform', 'rotate(45deg) scale(2)', 'transform'],
      ['transform-origin', '50% 100%', 'transformOrigin'],
      ['box-shadow', '0 1px 2px rgba(0,0,0,0.5)', 'boxShadow'],
      ['filter', 'blur(4px) saturate(1.2)', 'filter'],
      ['mix-blend-mode', 'multiply', 'mixBlendMode'],
      ['background-blend-mode', 'multiply', 'backgroundBlendMode'],
      ['isolation', 'isolate', 'isolation'],
      ['cursor', 'pointer', 'cursor'],
      ['pointer-events', 'none', 'pointerEvents'],
      ['user-select', 'none', 'userSelect'],
      ['box-sizing', 'border-box', 'boxSizing'],
      ['box-sizing', 'content-box', 'boxSizing'],
      ['object-fit', 'cover', 'objectFit'],
      ['object-fit', 'contain', 'objectFit'],
      ['object-fit', 'fill', 'objectFit'],
      ['object-fit', 'scale-down', 'objectFit'],
      ['object-fit', 'none', 'objectFit'],
      ['vertical-align', 'top', 'verticalAlign'],
      ['vertical-align', 'middle', 'verticalAlign'],
      ['vertical-align', 'bottom', 'verticalAlign'],
      ['vertical-align', 'auto', 'verticalAlign'],
      ['backface-visibility', 'hidden', 'backfaceVisibility'],
      ['backface-visibility', 'visible', 'backfaceVisibility'],
      ['outline-offset', '4px', 'outlineOffset'],
      ['outline-offset', '0', 'outlineOffset'],
    ])('%s emits a single %s key', (cssProp, value, expectedKey) => {
      const out = transformDecl(cssProp, value);
      expect(out).toEqual({ [expectedKey]: value });
    });
  });

  describe('dual-emit background props', () => {
    // Native RN 0.85 only registers `experimental_*` (silently drops
    // `backgroundImage`); rn-web only knows `backgroundImage` (silently
    // drops the `experimental_*`). Emitting both lets each platform pick
    // the one it understands.
    const value = 'linear-gradient(135deg, #ff8a00, #6b1bb1)';

    it('background-image emits experimental_ first then standard CSS name', () => {
      const out = transformDecl('background-image', value);
      expect(out).toEqual({
        experimental_backgroundImage: value,
        backgroundImage: value,
      });
      // Insertion order matters on rn-web (later key wins via
      // preprocess overwrite). Verify experimental_ comes first.
      expect(Object.keys(out)).toEqual(['experimental_backgroundImage', 'backgroundImage']);
    });

    it.each([
      ['background-size', 'cover'],
      ['background-position', 'center'],
      ['background-repeat', 'no-repeat'],
    ])('%s dual-emits both keys', (cssProp, val) => {
      const out = transformDecl(cssProp, val);
      const camel =
        'background' + cssProp.slice('background-'.length).replace(/^./, c => c.toUpperCase());
      expect(out).toEqual({
        [`experimental_${camel}`]: val,
        [camel]: val,
      });
    });

    it('preserves dual-emit through theme-token resolution path', () => {
      // A multi-token gradient with sentinels reaches transformDecl as a
      // raw string; resolvers run downstream. The passthrough boundary
      // still emits both keys so each platform can drive its renderer.
      const sentinelValue =
        'linear-gradient(90deg, \0sc:colors.fail:#c8243a, \0sc:colors.ink:#000)';
      const out = transformDecl('background-image', sentinelValue);
      expect(out.experimental_backgroundImage).toBe(sentinelValue);
      expect(out.backgroundImage).toBe(sentinelValue);
    });

    // react-native-web's StyleSheet validator rejects multi-value
    // `backgroundPosition` / `-size` / `-repeat`: `Invalid style
    // property of "backgroundPosition". Value is "0% 0%,0% 0%" but only
    // single values are supported.` Collapsing identical comma values
    // to a single value is semantically equivalent on both hosts (CSS
    // shorthand cycles a single value to all layers per Backgrounds 3).
    describe('redundant layered comma collapse (rn-web validator workaround)', () => {
      it('collapses identical multi-value backgroundPosition', () => {
        expect(transformDecl('background-position', '0% 0%,0% 0%')).toEqual({
          experimental_backgroundPosition: '0% 0%',
          backgroundPosition: '0% 0%',
        });
      });

      it('collapses identical multi-value backgroundSize', () => {
        expect(transformDecl('background-size', 'cover, cover')).toEqual({
          experimental_backgroundSize: 'cover',
          backgroundSize: 'cover',
        });
      });

      it('collapses identical multi-value backgroundRepeat', () => {
        expect(transformDecl('background-repeat', 'no-repeat,no-repeat,no-repeat')).toEqual({
          experimental_backgroundRepeat: 'no-repeat',
          backgroundRepeat: 'no-repeat',
        });
      });

      it('keeps comma form when at least one layer differs', () => {
        expect(transformDecl('background-position', '0% 0%, 50% 50%')).toEqual({
          experimental_backgroundPosition: '0% 0%, 50% 50%',
          backgroundPosition: '0% 0%, 50% 50%',
        });
      });

      it('does not collapse non-layered passthroughs (no regression)', () => {
        // `boxShadow` accepts comma-separated shadow layers; identical
        // shadows are NOT semantically reducible (the spec still paints
        // each layer). Only the layered background props cycle.
        expect(transformDecl('box-shadow', '0 0 1px #000, 0 0 1px #000')).toEqual({
          boxShadow: '0 0 1px #000, 0 0 1px #000',
        });
      });
    });
  });

  describe('vertical-align align-content polyfill on rn-web', () => {
    // CSS Box Alignment L3 §5.3.
    const g = global as { __NATIVE_WEB__?: boolean };
    const originalNativeWeb = g.__NATIVE_WEB__;
    beforeAll(() => {
      g.__NATIVE_WEB__ = true;
    });
    afterAll(() => {
      g.__NATIVE_WEB__ = originalNativeWeb;
    });

    it.each([
      ['top', 'start'],
      ['middle', 'center'],
      ['bottom', 'end'],
    ])('vertical-align: %s also emits align-content: %s', (value, alignContent) => {
      expect(transformDecl('vertical-align', value)).toEqual({
        verticalAlign: value,
        alignContent,
      });
    });

    it.each([['baseline'], ['sub'], ['super'], ['text-top'], ['text-bottom'], ['auto']])(
      'vertical-align: %s passes through unchanged',
      value => {
        expect(transformDecl('vertical-align', value)).toEqual({ verticalAlign: value });
      }
    );
  });

  describe('helpers', () => {
    it('getPassthroughKeys returns the array form', () => {
      expect(getPassthroughKeys('backgroundImage')).toEqual([
        'experimental_backgroundImage',
        'backgroundImage',
      ]);
      expect(getPassthroughKeys('transform')).toEqual(['transform']);
      expect(getPassthroughKeys('color')).toBeUndefined();
    });

    it('getPrimaryPassthroughKey returns the first (native) key', () => {
      expect(getPrimaryPassthroughKey('backgroundImage')).toBe('experimental_backgroundImage');
      expect(getPrimaryPassthroughKey('transform')).toBe('transform');
      expect(getPrimaryPassthroughKey('color')).toBeUndefined();
    });
  });
});
