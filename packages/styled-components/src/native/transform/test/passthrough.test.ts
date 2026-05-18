import { resetWarningsForTest } from '../dev';
import { transformDecl } from '../index';
import { getPassthroughKeys, getPrimaryPassthroughKey } from '../passthrough';
import { describeOnRnWeb } from '../describeOnRnWeb';

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

  // CSS Writing Modes 4 §2.1
  // https://drafts.csswg.org/css-writing-modes-4/#direction
  describe('CSS Writing Modes 4 §2.1 (direction)', () => {
    // "Name: direction; Value: ltr | rtl; Initial: ltr; Applies to: all
    // elements; Inherited: yes; Animation type: not animatable."
    //
    // The native build also emits `writingDirection` (a TextStyle key on
    // iOS / Android) so bidi text inside Text components matches the
    // cascaded Yoga direction without the user setting the prop twice.
    it('accepts `ltr` (initial value) and mirrors writingDirection on native', () => {
      expect(transformDecl('direction', 'ltr')).toEqual({
        direction: 'ltr',
        writingDirection: 'ltr',
      });
    });

    // "rtl: This value sets inline base direction (bidi directionality) to
    // line-right-to-line-left."
    it('accepts `rtl` and mirrors writingDirection on native', () => {
      expect(transformDecl('direction', 'rtl')).toEqual({
        direction: 'rtl',
        writingDirection: 'rtl',
      });
    });

    describeOnRnWeb(() => {
      // rn-web emits `writingDirection` (translates to CSS `direction`
      // so the browser flips bidi rendering) AND lifts a `dir` prop
      // through SPECIAL_CASE_PROPS - rn-web's LocaleContext / BiDi
      // compiler reads `props.dir`, not the CSS direction, so a
      // descendant `text-align: start | end` only flips when the prop
      // reaches the host element.
      it('emits writingDirection style + dir prop on rn-web', () => {
        expect(transformDecl('direction', 'rtl')).toEqual({
          writingDirection: 'rtl',
          dir: 'rtl',
        });
      });
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

    it('background-position collapses equivalent center keyword pairs before dual emit', () => {
      expect(transformDecl('background-position', 'center top')).toEqual({
        experimental_backgroundPosition: 'top',
        backgroundPosition: 'top',
      });
      expect(transformDecl('background-position', 'left center')).toEqual({
        experimental_backgroundPosition: 'left',
        backgroundPosition: 'left',
      });
      expect(transformDecl('background-position', 'center center')).toEqual({
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

    describe('CSS Backgrounds 3 longhand grammar validation', () => {
      let warnSpy: jest.SpyInstance;
      beforeEach(() => {
        resetWarningsForTest();
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      });
      afterEach(() => {
        warnSpy.mockRestore();
      });

      // "<bg-position> = [ [ left | center | right | top | bottom |
      // <length-percentage> ] | [ left | center | right |
      // <length-percentage> ] [ top | center | bottom |
      // <length-percentage> ] | [ center | [ left | right ]
      // <length-percentage>? ] && [ center | [ top | bottom ]
      // <length-percentage>? ] ]"
      it('background-position accepts edge-offset forms', () => {
        expect(transformDecl('background-position', 'right 3em bottom 10px')).toEqual({
          experimental_backgroundPosition: 'right 3em bottom 10px',
        });
        expect(warnSpy).not.toHaveBeenCalled();
      });

      // "A pair of keywords can be reordered, while a combination of
      // keyword and length or percentage cannot. So center left is valid
      // while 50% left is not."
      it('background-position rejects length/percentage before a horizontal keyword', () => {
        expect(transformDecl('background-position', '50% left')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toMatch(
          /could not be parsed for property "background-position"/
        );
      });

      // Unitless zero is allowed as a <length>; non-zero numbers are not
      // <length-percentage>.
      it('background-position rejects unitless non-zero numbers', () => {
        expect(transformDecl('background-position', '10 15')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });

      // "<bg-size> = [ <length-percentage [0,∞]> | auto ]{1,2} |
      // cover | contain"
      it('background-size rejects negative dimensions', () => {
        expect(transformDecl('background-size', '-1px')).toEqual({});
        expect(transformDecl('background-size', '50% -2px')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(2);
      });

      it('background-size rejects unitless non-zero dimensions', () => {
        expect(transformDecl('background-size', '10')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });

      // "`cover`" and "`contain`" are whole-value alternatives, not
      // members of the two-value length/auto form.
      it('background-size rejects cover/contain mixed with another size token', () => {
        expect(transformDecl('background-size', 'cover auto')).toEqual({});
        expect(transformDecl('background-size', '10px contain')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(2);
      });

      // "<repeat-style> = repeat-x | repeat-y | [repeat | space |
      // round | no-repeat]{1,2}"
      it('background-repeat rejects mixed single-form repeat keywords', () => {
        expect(transformDecl('background-repeat', 'repeat-x repeat-y')).toEqual({});
        expect(transformDecl('background-repeat', 'repeat-x space')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(2);
      });

      // "If a value has two keywords, the first one applies to the
      // horizontal axis, the second to the vertical one..."
      it('background-repeat accepts two-value repeat-style keywords', () => {
        expect(transformDecl('background-repeat', 'space round')).toEqual({
          experimental_backgroundRepeat: 'space round',
          backgroundRepeat: 'space round',
        });
        expect(warnSpy).not.toHaveBeenCalled();
      });
    });
  });

  // RN `processBoxShadow` only recognizes colors `processColor` accepts.
  // CSS system keywords fail that probe and break string parsing; fold to
  // object layers so `color` can be a PlatformColor object.
  describe('box-shadow: CSS Color 4 system keywords', () => {
    it('expands to RN boxShadow array when a system color keyword appears', () => {
      const out = transformDecl('box-shadow', '1px 2px Highlight');
      expect(Array.isArray(out.boxShadow)).toBe(true);
      expect(out.boxShadow).toHaveLength(1);
      expect(out.boxShadow![0]).toMatchObject({
        offsetX: '1px',
        offsetY: '2px',
        color: expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        }),
      });
    });

    it('accepts system color before offsets (RN string form does not)', () => {
      const out = transformDecl('box-shadow', 'Highlight 1px 2px');
      expect(Array.isArray(out.boxShadow)).toBe(true);
      expect(out.boxShadow![0]).toMatchObject({
        offsetX: '1px',
        offsetY: '2px',
        color: expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        }),
      });
    });

    it('leaves named colors as a CSS string', () => {
      expect(transformDecl('box-shadow', '1px 2px red')).toEqual({
        boxShadow: '1px 2px red',
      });
    });

    it('supports inset with a system color', () => {
      const out = transformDecl('box-shadow', 'inset 1px 2px Canvas');
      expect(Array.isArray(out.boxShadow)).toBe(true);
      expect(out.boxShadow![0]).toMatchObject({
        inset: true,
        offsetX: '1px',
        offsetY: '2px',
        color: expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        }),
      });
    });

    it('uses array form for every layer when any layer folds a system color', () => {
      const out = transformDecl('box-shadow', '1px 2px Highlight, 3px 4px rgba(0,0,0,0.5)');
      expect(Array.isArray(out.boxShadow)).toBe(true);
      expect(out.boxShadow).toHaveLength(2);
      expect(out.boxShadow![0].color).toEqual(
        expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        })
      );
      expect(out.boxShadow![1].color).toBe('rgba(0,0,0,0.5)');
    });

    it('does not rewrite values containing theme sentinels', () => {
      const v = '1px 2px \0sc:colors.shadow:#000';
      expect(transformDecl('box-shadow', v)).toEqual({ boxShadow: v });
    });

    it('normalizes newlines like RN before parsing', () => {
      const out = transformDecl('box-shadow', '1px\n2px\nHighlight');
      expect(Array.isArray(out.boxShadow)).toBe(true);
      expect(out.boxShadow![0]).toMatchObject({
        offsetX: '1px',
        offsetY: '2px',
      });
    });
  });

  // RN `processFilter` delegates `drop-shadow(...)` to `parseDropShadowString`,
  // which uses the same `processColor` probe as `box-shadow`.
  describe('filter: drop-shadow() + CSS Color 4 system keywords', () => {
    it('expands to RN filter array when drop-shadow uses a system color', () => {
      const out = transformDecl('filter', 'drop-shadow(1px 2px Highlight)');
      expect(Array.isArray(out.filter)).toBe(true);
      expect(out.filter).toHaveLength(1);
      expect(out.filter![0]).toEqual({
        dropShadow: expect.objectContaining({
          offsetX: '1px',
          offsetY: '2px',
          color: expect.objectContaining({
            semantic: expect.arrayContaining([
              'quaternarySystemFill',
              '?attr/colorControlHighlight',
            ]),
          }),
        }),
      });
    });

    it('accepts system color before offsets inside drop-shadow', () => {
      const out = transformDecl('filter', 'drop-shadow(Canvas 1px 2px)');
      expect(Array.isArray(out.filter)).toBe(true);
      expect(out.filter![0].dropShadow).toMatchObject({
        offsetX: '1px',
        offsetY: '2px',
        color: expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        }),
      });
    });

    it('leaves drop-shadow() with only named colors as a CSS string', () => {
      expect(transformDecl('filter', 'drop-shadow(1px 2px red)')).toEqual({
        filter: 'drop-shadow(1px 2px red)',
      });
    });

    it('rewrites the full filter list when a drop-shadow uses a system color', () => {
      const out = transformDecl('filter', 'brightness(50%) drop-shadow(1px 2px Highlight)');
      expect(Array.isArray(out.filter)).toBe(true);
      expect(out.filter).toHaveLength(2);
      expect(out.filter![0]).toEqual({ brightness: 0.5 });
      expect(out.filter![1].dropShadow.color).toEqual(
        expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        })
      );
    });

    it('does not rewrite filter values containing theme sentinels', () => {
      const v = 'drop-shadow(1px 2px \0sc:colors.shadow:#000)';
      expect(transformDecl('filter', v)).toEqual({ filter: v });
    });
  });

  describeOnRnWeb('box-shadow on rn-web', () => {
    it('passes system color keywords through as a CSS string', () => {
      expect(transformDecl('box-shadow', '1px 2px Highlight')).toEqual({
        boxShadow: '1px 2px Highlight',
      });
    });
  });

  describeOnRnWeb('filter on rn-web', () => {
    it('passes drop-shadow() with system colors through as a CSS string', () => {
      expect(transformDecl('filter', 'drop-shadow(1px 2px Highlight)')).toEqual({
        filter: 'drop-shadow(1px 2px Highlight)',
      });
    });
  });

  // Dual-emit background longhands do not branch on `__NATIVE_WEB__`; this
  // subtree locks parity so a future rn-web-only shortcut cannot diverge
  // from the Hermes path for structured stacks (see `index.ts` passthrough
  // block + `substituteBackgroundSizeKeywordsForNative`).
  describeOnRnWeb('dual-emit background longhands on rn-web', () => {
    it('background-size cover keeps keyword on standard key and folds native key', () => {
      expect(transformDecl('background-size', 'cover')).toEqual({
        experimental_backgroundSize: 'auto',
        backgroundSize: 'cover',
      });
    });

    it('background-position multi-token still skips the rn-web key', () => {
      expect(transformDecl('background-position', '0 0')).toEqual({
        experimental_backgroundPosition: '0 0',
      });
    });
  });

  describeOnRnWeb('vertical-align align-content polyfill on rn-web', () => {
    // CSS Box Alignment L3 §5.3.

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
