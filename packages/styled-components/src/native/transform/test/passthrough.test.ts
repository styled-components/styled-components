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
      ['direction', 'ltr', 'direction'],
      ['direction', 'rtl', 'direction'],
    ])('%s emits a single %s key', (cssProp, value, expectedKey) => {
      const out = transformDecl(cssProp, value);
      expect(out).toEqual({ [expectedKey]: value });
    });
  });

  // CSS Writing Modes 4 §2.1
  // https://drafts.csswg.org/css-writing-modes-4/#direction
  describe('CSS Writing Modes 4 §2.1 (direction)', () => {
    // "Name: direction; Value: ltr | rtl; Initial: ltr; Applies to: all
    // elements; Inherited: yes; Animation type: not animatable."
    it('accepts `ltr` (initial value)', () => {
      expect(transformDecl('direction', 'ltr')).toEqual({ direction: 'ltr' });
    });

    // "ltr: This value sets inline base direction (bidi directionality) to
    // line-left-to-line-right."
    it('accepts `rtl`', () => {
      expect(transformDecl('direction', 'rtl')).toEqual({ direction: 'rtl' });
    });

    // Identity passthrough; value reaches Yoga (RN native) or the browser
    // (rn-web) unchanged. Yoga uses `direction` to drive logical
    // `*-inline-*` mapping under horizontal-tb.
    it('passes the value through to the runtime key without translation', () => {
      expect(transformDecl('direction', 'rtl')).toEqual({ direction: 'rtl' });
    });
  });

  // CSS Display 4 §2.5 (display: contents)
  // https://drafts.csswg.org/css-display-4/#valdef-display-contents
  // characterization lock: not a passthrough today; reaches RN via
  // coerceRawValue identity. RN/Yoga honors `display: 'contents'` on
  // newer versions, and rn-web passes it to the browser. Behavior change
  // (e.g. promoting to passthrough) should update this test.
  describe('CSS Display 4 §2.5 (display: contents) characterization lock', () => {
    it('emits `display: contents` unchanged', () => {
      expect(transformDecl('display', 'contents')).toEqual({ display: 'contents' });
    });
  });

  // CSS Position 3 §2 (position: static)
  // https://drafts.csswg.org/css-position-3/#position-property
  // "The box is not a positioned box, and is laid out according to the
  // rules of its parent formatting context. The inset properties do not
  // apply." Initial value: static. Characterization lock: identity flow.
  describe('CSS Position 3 §2 (position: static) characterization lock', () => {
    it('emits `position: static` unchanged', () => {
      expect(transformDecl('position', 'static')).toEqual({ position: 'static' });
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

    it('background-size dual-emits with native keyword substitution', () => {
      // `cover` and `contain` are bare-string forms RN 0.85's native
      // parser drops; substitute to `auto` on the native key (the
      // spec-correct fold for gradients with no intrinsic dimensions,
      // per CSS Backgrounds 3 §3.10), keeping the keyword for rn-web
      // where the browser resolves cover / contain against the image
      // type natively.
      expect(transformDecl('background-size', 'cover')).toEqual({
        experimental_backgroundSize: 'auto',
        backgroundSize: 'cover',
      });
      expect(transformDecl('background-size', 'contain')).toEqual({
        experimental_backgroundSize: 'auto',
        backgroundSize: 'contain',
      });
      // Mixed layers: keyword entries fold to auto, length entries
      // pass through.
      expect(transformDecl('background-size', 'cover, 50% 50%')).toEqual({
        experimental_backgroundSize: 'auto, 50% 50%',
        backgroundSize: 'cover, 50% 50%',
      });
      // Length forms pass through unchanged on both keys.
      expect(transformDecl('background-size', '50% 50%')).toEqual({
        experimental_backgroundSize: '50% 50%',
        backgroundSize: '50% 50%',
      });
    });

    it.each([
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

    it('background-position skips rn-web key for multi-token forms', () => {
      // rn-web's validator rejects multi-value backgroundPosition; emit
      // only the experimental_ key on native so rn-web doesn't see the
      // offending string. The native side accepts the two-axis form
      // and resolves it; rn-web silently uses its CSS default (the
      // same paint it would have produced after dropping the invalid
      // value).
      expect(transformDecl('background-position', '0 0')).toEqual({
        experimental_backgroundPosition: '0 0',
      });
      expect(transformDecl('background-position', '50% 50%')).toEqual({
        experimental_backgroundPosition: '50% 50%',
      });
      expect(transformDecl('background-position', 'top left')).toEqual({
        experimental_backgroundPosition: 'top left',
      });
      // Single-token forms still dual-emit (rn-web accepts them).
      expect(transformDecl('background-position', 'center')).toEqual({
        experimental_backgroundPosition: 'center',
        backgroundPosition: 'center',
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
      it('collapses identical multi-value backgroundPosition (native key only)', () => {
        // Collapsed to `'0% 0%'` (still multi-token); rn-web key drops.
        expect(transformDecl('background-position', '0% 0%,0% 0%')).toEqual({
          experimental_backgroundPosition: '0% 0%',
        });
      });

      it('collapses identical multi-value backgroundSize', () => {
        // `experimental_backgroundSize` folds `cover` to `auto`
        // (RN 0.85 native parser bug workaround); the standard
        // `backgroundSize` key keeps the keyword so rn-web hands it
        // to the browser as-is.
        expect(transformDecl('background-size', 'cover, cover')).toEqual({
          experimental_backgroundSize: 'auto',
          backgroundSize: 'cover',
        });
      });

      it('collapses identical multi-value backgroundRepeat', () => {
        expect(transformDecl('background-repeat', 'no-repeat,no-repeat,no-repeat')).toEqual({
          experimental_backgroundRepeat: 'no-repeat',
          backgroundRepeat: 'no-repeat',
        });
      });

      it('keeps comma form on native key when layers differ; drops rn-web key', () => {
        // Multi-token form on rn-web key would trigger the validator
        // warning; the native key still carries the two-layer value.
        expect(transformDecl('background-position', '0% 0%, 50% 50%')).toEqual({
          experimental_backgroundPosition: '0% 0%, 50% 50%',
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
      ['top', 'flex-start'],
      ['middle', 'center'],
      ['bottom', 'flex-end'],
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
