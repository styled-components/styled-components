import { resetWarningsForTest } from '../dev';
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
      // `isolation: isolate` lifts an Android layer prop alongside the
      // style key; its single-key form is the initial value.
      ['isolation', 'auto', 'isolation'],
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
    // RN 0.85-0.86 register only the `experimental_*` names; later
    // versions add the standard names. Emitting both covers the peer range
    // (docs/react-native.md "Standard background names").
    const value = 'linear-gradient(135deg, #ff8a00, #6b1bb1)';

    it('background-image emits experimental_ first then standard CSS name', () => {
      const out = transformDecl('background-image', value);
      expect(out).toEqual({
        experimental_backgroundImage: value,
        backgroundImage: value,
      });
      // Key order is experimental_ first, standard name last.
      expect(Object.keys(out)).toEqual(['experimental_backgroundImage', 'backgroundImage']);
    });

    it('background-size dual-emits with native keyword substitution', () => {
      // `cover` and `contain` are bare-string forms RN 0.85's native
      // parser drops; substitute to `auto` on the native key (the
      // spec-correct fold for gradients with no intrinsic dimensions,
      // per CSS Backgrounds 3 §3.10); the standard key keeps the keyword.
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

    it.each([['0 0'], ['50% 50%'], ['top left'], ['left 10px top 20px']])(
      'background-position dual-emits the multi-token value %s',
      val => {
        // RN 0.88+ reads the standard key; 0.85-0.87 read only the experimental_ key.
        expect(transformDecl('background-position', val)).toEqual({
          experimental_backgroundPosition: val,
          backgroundPosition: val,
        });
      }
    );

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

    it('reads theme placeholders in a gradient as their default text and keeps dual-emit', () => {
      const placeholders = 'linear-gradient(90deg, \0sc:colors.fail:#c8243a, \0sc:colors.ink:#000)';
      const literal = 'linear-gradient(90deg, #c8243a, #000)';

      expect(transformDecl('background-image', placeholders)).toEqual({
        backgroundImage: literal,
        experimental_backgroundImage: literal,
      });
    });

    // RN's background-position / -size / -repeat processors split a
    // comma-separated layer list themselves, so the authored value
    // reaches both keys unchanged.
    describe('layered comma values', () => {
      it('keeps identical backgroundPosition layers on both keys', () => {
        expect(transformDecl('background-position', '0% 0%,0% 0%')).toEqual({
          experimental_backgroundPosition: '0% 0%,0% 0%',
          backgroundPosition: '0% 0%,0% 0%',
        });
      });

      it('keeps identical backgroundSize layers on both keys', () => {
        expect(transformDecl('background-size', 'cover, cover')).toEqual({
          experimental_backgroundSize: 'auto, auto',
          backgroundSize: 'cover, cover',
        });
      });

      it('keeps identical backgroundRepeat layers on both keys', () => {
        expect(transformDecl('background-repeat', 'no-repeat,no-repeat,no-repeat')).toEqual({
          experimental_backgroundRepeat: 'no-repeat,no-repeat,no-repeat',
          backgroundRepeat: 'no-repeat,no-repeat,no-repeat',
        });
      });

      it('keeps differing backgroundPosition layers on both keys', () => {
        expect(transformDecl('background-position', '0% 0%, 50% 50%')).toEqual({
          experimental_backgroundPosition: '0% 0%, 50% 50%',
          backgroundPosition: '0% 0%, 50% 50%',
        });
      });

      it('does not collapse non-layered passthroughs', () => {
        expect(transformDecl('box-shadow', '0 0 1px #000, 0 0 1px #000')).toEqual({
          boxShadow: '0 0 1px #000, 0 0 1px #000',
        });
      });
    });

    describe('isolation: isolate Android layer lift (CSS Compositing 1 §3)', () => {
      // "isolation: isolate ... the element must act as a group", i.e.
      // descendants' mix-blend-mode composites against the group's own
      // backdrop, not the page. Android has no isolation style key; the
      // platform primitive that forces an isolated compositing surface is
      // the hardware-texture layer, so the polyfill lifts that prop
      // alongside the style key (iOS drops the Android-suffixed prop via
      // RN's own view-prop filter; its compositor consumes the style key).
      // Device-verified: without the lift, blended children composite
      // against the page background on Android and wash out.
      it('isolate lifts the Android hardware-texture layer', () => {
        expect(transformDecl('isolation', 'isolate')).toEqual({
          isolation: 'isolate',
          renderToHardwareTextureAndroid: true,
        });
      });

      it('auto stays a plain passthrough', () => {
        expect(transformDecl('isolation', 'auto')).toEqual({ isolation: 'auto' });
      });
    });

    describe('filter iOS release-level gate characterization', () => {
      // Device-verified on the iOS simulator (RN 0.85, default release
      // level): only brightness() and opacity() render; the other filter
      // functions are silently inert AND, while a gated function is
      // mounted, descendants' mix-blend-mode stops compositing against
      // the backdrop. The declaration still passes through (it renders
      // fully when the app opts into the experimental release level);
      // the warning is the value.
      let warnSpy: jest.SpyInstance;
      beforeEach(() => {
        resetWarningsForTest();
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      });
      afterEach(() => {
        warnSpy.mockRestore();
      });

      it('warns once for gated filter functions on iOS and still passes through', () => {
        expect(transformDecl('filter', 'saturate(1.4)')).toEqual({ filter: 'saturate(1.4)' });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toMatch(/saturate\(1\.4\)/);
        expect(warnSpy.mock.calls[0][0]).toMatch(/mix-blend-mode/);
      });

      it('warns when a gated function is mixed with renderable ones', () => {
        expect(transformDecl('filter', 'brightness(1.2) saturate(2)')).toEqual({
          filter: 'brightness(1.2) saturate(2)',
        });
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });

      it('stays silent for brightness() / opacity(), which render by default', () => {
        expect(transformDecl('filter', 'brightness(1.2) opacity(0.9)')).toEqual({
          filter: 'brightness(1.2) opacity(0.9)',
        });
        expect(warnSpy).not.toHaveBeenCalled();
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
          backgroundPosition: 'right 3em bottom 10px',
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

    it('reads a theme placeholder as its default text', () => {
      expect(transformDecl('box-shadow', '1px 2px \0sc:colors.shadow:#000')).toEqual(
        transformDecl('box-shadow', '1px 2px #000')
      );
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

    it('reads a theme placeholder as its default text', () => {
      expect(transformDecl('filter', 'drop-shadow(1px 2px \0sc:colors.shadow:#000)')).toEqual(
        transformDecl('filter', 'drop-shadow(1px 2px #000)')
      );
    });
  });

  // See `index.ts` passthrough block + `substituteBackgroundSizeKeywordsForNative`.
  describe('dual-emit background longhands', () => {
    it('background-size cover keeps keyword on standard key and folds native key', () => {
      expect(transformDecl('background-size', 'cover')).toEqual({
        experimental_backgroundSize: 'auto',
        backgroundSize: 'cover',
      });
    });
  });

  describe('vertical-align passthrough', () => {
    it.each([
      ['top'],
      ['middle'],
      ['bottom'],
      ['baseline'],
      ['sub'],
      ['super'],
      ['text-top'],
      ['text-bottom'],
      ['auto'],
    ])('vertical-align: %s passes through unchanged', value => {
      expect(transformDecl('vertical-align', value)).toEqual({ verticalAlign: value });
    });
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
