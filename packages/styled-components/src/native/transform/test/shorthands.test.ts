import { resetWarningsForTest } from '../dev';
import { transformDecl } from '../index';
import { describeOnRnWeb } from '../describeOnRnWeb';

describe('transformDecl: pass-through + coercion', () => {
  it('passes through transform as a CSS string (RN parses natively)', () => {
    expect(transformDecl('transform', 'rotate(45deg) scale(1.2)')).toEqual({
      transform: 'rotate(45deg) scale(1.2)',
    });
  });

  it('passes through boxShadow', () => {
    expect(transformDecl('boxShadow', '0 2px 4px rgba(0,0,0,.2)')).toEqual({
      boxShadow: '0 2px 4px rgba(0,0,0,.2)',
    });
  });

  it('passes through filter chains', () => {
    expect(transformDecl('filter', 'blur(4px) saturate(1.5)')).toEqual({
      filter: 'blur(4px) saturate(1.5)',
    });
  });

  it('dual-emits backgroundImage gradients (RN experimental_ + standard CSS name for rn-web)', () => {
    expect(transformDecl('backgroundImage', 'linear-gradient(to right, red, blue)')).toEqual({
      experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
      backgroundImage: 'linear-gradient(to right, red, blue)',
    });
  });

  it('passes through modern colors via backgroundColor', () => {
    expect(transformDecl('backgroundColor', 'rgb(255 128 0 / 0.5)')).toEqual({
      backgroundColor: 'rgb(255 128 0 / 0.5)',
    });
    expect(transformDecl('backgroundColor', 'hwb(120 10% 20%)')).toEqual({
      backgroundColor: 'hwb(120 10% 20%)',
    });
  });

  it('coerces simple length values to dp numbers', () => {
    expect(transformDecl('width', '100px')).toEqual({ width: 100 });
    expect(transformDecl('width', '0')).toEqual({ width: 0 });
  });

  it('keeps percentage as string', () => {
    expect(transformDecl('width', '50%')).toEqual({ width: '50%' });
  });

  it('keeps auto as string', () => {
    expect(transformDecl('width', 'auto')).toEqual({ width: 'auto' });
  });

  it('coerces unitless numeric props to Number', () => {
    expect(transformDecl('opacity', '0.5')).toEqual({ opacity: 0.5 });
    expect(transformDecl('flexGrow', '1')).toEqual({ flexGrow: 1 });
    expect(transformDecl('zIndex', '10')).toEqual({ zIndex: 10 });
  });

  // CSS Color 4, "Opacity: <opacity-value>":
  //   <opacity-value> = <number> | <percentage>
  //   "It can also be written as a <percentage>, which computes to the equivalent <number>
  //   (0% to 0, 100% to 1)."
  // CSS Color 4, "Serializing <opacity-value>":
  //   "If the specified value for an opacity value matches a literal <percentage-token>
  //   (i.e. does not use calc()) it should be serialized as the equivalent <number> ...
  //   Opacity values outside the range [0,1] are preserved, without clamping, in the
  //   serialized specified value."
  // The clamp to [0, 1] happens at the computed value ("Opacity values outside the range
  // [0,1] are not invalid, and are preserved in specified values, but are clamped to the
  // range [0, 1] in computed values."); the decl transform emits the specified value and
  // the platform clamps, so out-of-range percentages convert without clamping, as numbers do.
  describe('opacity accepts <number> | <percentage>', () => {
    it.each([
      ['50%', 0.5],
      ['0%', 0],
      ['100%', 1],
      ['12.5%', 0.125],
      ['150%', 1.5],
      ['-20%', -0.2],
      ['0.5', 0.5],
      ['0', 0],
    ])('opacity: %s reaches React Native as the number %s', (value, expected) => {
      expect(transformDecl('opacity', value)).toEqual({ opacity: expected });
    });

    it.each([
      ['calc(50%)', 0.5],
      ['calc(20% + 30%)', 0.5],
      ['min(80%, 30%)', 0.3],
    ])('opacity: %s folds to the number %s', (value, expected) => {
      expect(transformDecl('opacity', value)).toEqual({ opacity: expected });
    });

    it('leaves a percent sign with no number as authored', () => {
      expect(transformDecl('opacity', '%')).toEqual({ opacity: '%' });
    });

    it('leaves the other number-only keys untouched', () => {
      expect(transformDecl('flexGrow', '50%')).toEqual({ flexGrow: '50%' });
    });

    describeOnRnWeb(() => {
      it.each([
        ['50%', '50%'],
        ['0.5', 0.5],
      ])('opacity: %s is left for the browser to resolve', (value, expected) => {
        expect(transformDecl('opacity', value)).toEqual({ opacity: expected });
      });

      it('leaves a percentage calc() for the browser', () => {
        expect(transformDecl('opacity', 'calc(20% + 30%)')).toEqual({
          opacity: 'calc(20% + 30%)',
        });
      });
    });
  });

  it('passes color names through', () => {
    expect(transformDecl('color', 'red')).toEqual({ color: 'red' });
    expect(transformDecl('color', '#fff')).toEqual({ color: '#fff' });
    expect(transformDecl('color', 'currentColor')).toEqual({ color: 'currentColor' });
  });

  // Identity-passthrough on RN 0.85 (no special shorthand needed). These
  // characterization tests pin the behavior so refactors of the decl
  // transform don't accidentally route the values through unit coercion
  // or the shorthand registry.
  it('passes display: contents through unchanged (Yoga 0.85 implements it)', () => {
    expect(transformDecl('display', 'contents')).toEqual({ display: 'contents' });
    expect(transformDecl('display', 'flex')).toEqual({ display: 'flex' });
    expect(transformDecl('display', 'none')).toEqual({ display: 'none' });
  });

  it('passes position: static through (CSS-spec default, RN 0.85 accepts)', () => {
    expect(transformDecl('position', 'static')).toEqual({ position: 'static' });
    expect(transformDecl('position', 'absolute')).toEqual({ position: 'absolute' });
    expect(transformDecl('position', 'relative')).toEqual({ position: 'relative' });
  });

  it('passes direction through and mirrors writingDirection on native', () => {
    expect(transformDecl('direction', 'ltr')).toEqual({
      direction: 'ltr',
      writingDirection: 'ltr',
    });
    expect(transformDecl('direction', 'rtl')).toEqual({
      direction: 'rtl',
      writingDirection: 'rtl',
    });
    expect(transformDecl('direction', 'inherit')).toEqual({
      direction: 'inherit',
      writingDirection: 'inherit',
    });
  });
});

describe('margin / padding / border-* directional shorthands', () => {
  it('margin: single value → bare scalar (RN accepts `margin: N`)', () => {
    expect(transformDecl('margin', '10px')).toEqual({ margin: 10 });
  });

  it('margin: 2 values → vertical / horizontal', () => {
    expect(transformDecl('margin', '10px 20px')).toMatchInlineSnapshot(`
      {
        "marginBottom": 10,
        "marginLeft": 20,
        "marginRight": 20,
        "marginTop": 10,
      }
    `);
  });

  it('margin: 3 values → top / h / bottom', () => {
    expect(transformDecl('margin', '10px 20px 30px')).toMatchInlineSnapshot(`
      {
        "marginBottom": 30,
        "marginLeft": 20,
        "marginRight": 20,
        "marginTop": 10,
      }
    `);
  });

  it('margin: 4 values → trbl', () => {
    expect(transformDecl('margin', '10px 20px 30px 40px')).toMatchInlineSnapshot(`
      {
        "marginBottom": 30,
        "marginLeft": 40,
        "marginRight": 20,
        "marginTop": 10,
      }
    `);
  });

  it('margin: auto and 0 mix', () => {
    expect(transformDecl('margin', '0 auto')).toMatchInlineSnapshot(`
      {
        "marginBottom": 0,
        "marginLeft": "auto",
        "marginRight": "auto",
        "marginTop": 0,
      }
    `);
  });

  it('padding: accepts percent', () => {
    expect(transformDecl('padding', '5% 10%')).toMatchInlineSnapshot(`
      {
        "paddingBottom": "5%",
        "paddingLeft": "10%",
        "paddingRight": "10%",
        "paddingTop": "5%",
      }
    `);
  });

  it('padding: 4 env() values pass through to the resolver', () => {
    expect(
      transformDecl(
        'padding',
        'env(safe-area-inset-top, 12px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 12px) env(safe-area-inset-left, 16px)'
      )
    ).toMatchInlineSnapshot(`
      {
        "paddingBottom": "env(safe-area-inset-bottom, 12px)",
        "paddingLeft": "env(safe-area-inset-left, 16px)",
        "paddingRight": "env(safe-area-inset-right, 16px)",
        "paddingTop": "env(safe-area-inset-top, 12px)",
      }
    `);
  });

  it('margin: a theme placeholder reads as its default text, with a warning', () => {
    resetWarningsForTest();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(transformDecl('margin', '\0sc:space.md:16px')).toEqual({ margin: 16 });
    expect(warn.mock.calls.map(call => String(call[0]).split('\n')[0])).toEqual([
      '[sc] The theme value at `space.md` is not text, so `margin` uses its default, "16px". A theme value that is not text (a platform color, for example) works only as a whole color value, such as `color` or `border-color`. Give `margin` a text value, or set the platform color on a color property of its own.',
    ]);
    warn.mockRestore();
  });

  it('padding: math-fn arms pass through to the resolver', () => {
    expect(transformDecl('padding', 'calc(16px + 5vw) min(20px, 5vw) 8px max(24px, 5vh)')).toEqual({
      paddingBottom: 8,
      paddingLeft: 'max(24px, 5vh)',
      paddingRight: 'min(20px, 5vw)',
      paddingTop: 'calc(16px + 5vw)',
    });
  });

  it('padding: theme placeholders in math-fn arms read as their default text', () => {
    resetWarningsForTest();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(
      transformDecl(
        'padding',
        'calc(\0sc:space.md:16px + 4px) min(20px, 5vw) 8px max(\0sc:space.lg:24px, 16px)'
      )
    ).toEqual(transformDecl('padding', 'calc(16px + 4px) min(20px, 5vw) 8px max(24px, 16px)'));
    warn.mockRestore();
  });

  it('margin: clamp() with a theme placeholder arm reads as its default text', () => {
    resetWarningsForTest();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(transformDecl('margin', 'clamp(8px, \0sc:space.md:16px, 32px)')).toEqual(
      transformDecl('margin', 'clamp(8px, 16px, 32px)')
    );
    warn.mockRestore();
  });

  it('borderWidth: 4 values → per-side', () => {
    expect(transformDecl('borderWidth', '1px 2px 3px 4px')).toMatchInlineSnapshot(`
      {
        "borderBottomWidth": 3,
        "borderLeftWidth": 4,
        "borderRightWidth": 2,
        "borderTopWidth": 1,
      }
    `);
  });

  it('borderRadius: 4 corners', () => {
    expect(transformDecl('borderRadius', '4px 8px 12px 16px')).toMatchInlineSnapshot(`
      {
        "borderBottomLeftRadius": 16,
        "borderBottomRightRadius": 12,
        "borderTopLeftRadius": 4,
        "borderTopRightRadius": 8,
      }
    `);
  });
});

// https://drafts.csswg.org/css-backgrounds-3/#border-color (editor's draft, fetched 2026-05-13)
describe('border-color shorthand spec compliance (CSS Backgrounds 3 §3.1)', () => {
  // "The border-color property is a shorthand property for setting
  // border-top-color, border-right-color, border-bottom-color, and border-left-color
  // in a single declaration."
  // "If there is only one component value, it applies to all sides."
  it('single <color> applies to all four sides (hex or named keyword)', () => {
    expect(transformDecl('borderColor', '#333')).toEqual({ borderColor: '#333' });
    expect(transformDecl('borderColor', 'teal')).toEqual({ borderColor: 'teal' });
  });

  // "If there are two values, the top and bottom are set to the first value
  // and the right and left are set to the second."
  it('two <color> values map to top/bottom and left/right', () => {
    expect(transformDecl('borderColor', 'red blue')).toEqual({
      borderTopColor: 'red',
      borderRightColor: 'blue',
      borderBottomColor: 'red',
      borderLeftColor: 'blue',
    });
  });

  // "If there are three values, the top is set to the first value, the left and right
  // are set to the second, and the bottom is set to the third."
  it('three <color> values map top, horizontal sides, then bottom', () => {
    expect(transformDecl('borderColor', 'red green blue')).toEqual({
      borderTopColor: 'red',
      borderRightColor: 'green',
      borderBottomColor: 'blue',
      borderLeftColor: 'green',
    });
  });

  // "If there are four values they apply to the top, right, bottom, and left, respectively."
  it('four <color> values map in TRBL order', () => {
    expect(transformDecl('borderColor', 'red green blue yellow')).toMatchInlineSnapshot(`
      {
        "borderBottomColor": "blue",
        "borderLeftColor": "yellow",
        "borderRightColor": "green",
        "borderTopColor": "red",
      }
    `);
  });

  describeOnRnWeb(() => {
    // border-color expansion does not fork on __NATIVE_WEB__; assert stable parity with the native bundle.
    it('four-value border-color shorthand matches native TRBL expansion', () => {
      expect(transformDecl('borderColor', 'red green blue yellow')).toEqual({
        borderTopColor: 'red',
        borderRightColor: 'green',
        borderBottomColor: 'blue',
        borderLeftColor: 'yellow',
      });
    });
  });
});

describe('border-radius spec compliance (CSS Backgrounds 3 §4.1)', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // "If values are given before and after the slash, then the values
  // before the slash set the horizontal radii and the values after the
  // slash set the vertical radii."
  it('collapses equal slash-separated radii to the native circular form', () => {
    expect(transformDecl('borderRadius', '10px / 10px')).toEqual({
      borderRadius: 10,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // "The four values for each radii are given in the order top-left,
  // top-right, bottom-right, bottom-left."
  it('collapses equal per-corner slash-separated radii to native corner radii', () => {
    expect(transformDecl('borderRadius', '10px 20px / 10px 20px')).toEqual({
      borderTopLeftRadius: 10,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 10,
      borderBottomLeftRadius: 20,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('drops slash-separated elliptical radii on native instead of mis-expanding corners', () => {
    expect(transformDecl('borderRadius', '10px / 20px')).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/border-radius: 10px \/ 20px/);
  });

  describeOnRnWeb(() => {
    it('preserves slash-separated elliptical radii for the browser', () => {
      expect(transformDecl('borderRadius', '10px / 20px')).toEqual({
        borderRadius: '10px / 20px',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// https://drafts.csswg.org/css-backgrounds-3/#border-shorthands (editor's draft, fetched 2026-05-13)
// rn-web: unsupported <line-style> on the `border` shorthand is covered in
// "border line styles spec compliance (CSS Backgrounds 3 §3.2, §3.4)" describeOnRnWeb.
describe('border shorthand spec compliance (CSS Backgrounds 3 §3.4)', () => {
  // Value: <line-width> || <line-style> || <color>
  it('accepts <line-width> || <line-style> || <color> in typical source order', () => {
    expect(transformDecl('border', '1px solid red')).toMatchInlineSnapshot(`
      {
        "borderColor": "red",
        "borderStyle": "solid",
        "borderWidth": 1,
      }
    `);
  });

  // "These shorthand properties set the border-width, border-color, and border-style
  // of the top, right, bottom, and left borders of a box. Omitted values are set to
  // their initial values."
  // Canonical order: per grammar (components are order-agnostic).
  it('accepts the same grammar with components in a different order', () => {
    expect(transformDecl('border', 'red solid 2px')).toMatchInlineSnapshot(`
      {
        "borderColor": "red",
        "borderStyle": "solid",
        "borderWidth": 2,
      }
    `);
  });

  // "The border property is a shorthand property for setting the same border-width,
  // border-color, and border-style for all four borders of a box."
  it('maps <line-width> with <color> when <line-style> is omitted (remaining longhands use defaults)', () => {
    expect(transformDecl('border', '2px red')).toEqual({
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'red',
    });
  });

  // <line-style> includes `none` (CSS Backgrounds 3 §3.2).
  it('treats border: none as a no-border line style', () => {
    expect(transformDecl('border', 'none')).toMatchInlineSnapshot(`
      {
        "borderColor": "transparent",
        "borderStyle": "none",
        "borderWidth": 0,
      }
    `);
  });

  // Deviation on native: with only <line-style> supplied, CSS would use initial
  // border-width (medium) and border-color (currentColor). The RN transform uses
  // hairpin defaults (1 and black) so dotted borders render without extra longhands.
  it('fills omitted width and color when only <line-style> is authored', () => {
    expect(transformDecl('border', 'dotted')).toMatchInlineSnapshot(`
      {
        "borderColor": "black",
        "borderStyle": "dotted",
        "borderWidth": 1,
      }
    `);
  });

  it('preserves theme sentinel <color> tokens for runtime resolution', () => {
    expect(transformDecl('border', '1px solid \0sc:colors.border:#e3e3e8')).toEqual({
      borderColor: '\0sc:colors.border:#e3e3e8',
      borderStyle: 'solid',
      borderWidth: 1,
    });
  });
});

describe('border line styles spec compliance (CSS Backgrounds 3 §3.2, §3.4)', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // "<line-style> = none | hidden | dotted | dashed | solid | double |
  // groove | ridge | inset | outset"
  it('border-style accepts hidden as the no-border line style on native', () => {
    expect(transformDecl('borderStyle', 'hidden')).toEqual({
      borderStyle: 'none',
      borderWidth: 0,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // "hidden Same as none, but has different behavior in the border
  // conflict resolution rules for border-collapsed tables."
  it('border shorthand maps hidden to a no-border style on native', () => {
    expect(transformDecl('border', '2px hidden red')).toEqual({
      borderWidth: 0,
      borderStyle: 'none',
      borderColor: 'red',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // "If there is only one component value, it applies to all sides. If
  // there are two values, the top and bottom are set to the first value
  // and the right and left are set to the second."
  it('border-style warns and uses the first value when native cannot express per-side styles', () => {
    expect(transformDecl('borderStyle', 'solid dotted')).toEqual({ borderStyle: 'solid' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/border-style: solid dotted/);
  });

  it('border-style collapses repeated per-side values without warning', () => {
    expect(transformDecl('borderStyle', 'solid solid solid solid')).toEqual({
      borderStyle: 'solid',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // "double", "groove", "ridge", "inset", and "outset" are valid CSS
  // line styles. RN cannot draw those predefined styles, so native drops
  // them with a targeted development warning.
  it.each(['double', 'groove', 'ridge', 'inset', 'outset'])(
    'border-style: %s warns and drops on native',
    style => {
      expect(transformDecl('borderStyle', style)).toEqual({});
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(new RegExp(`border-style: ${style}`));
    }
  );

  // "The border property is a shorthand property for setting the same
  // border-width, border-color, and border-style for all four borders."
  it('border shorthand rejects unsupported native line styles instead of rendering a different border', () => {
    expect(transformDecl('border', '2px double red')).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/border-style: double/);
  });

  describeOnRnWeb(() => {
    it('border-style preserves multi-value CSS for the browser', () => {
      expect(transformDecl('borderStyle', 'solid dotted')).toEqual({
        borderStyle: 'solid dotted',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('border shorthand preserves browser-rendered line styles', () => {
      expect(transformDecl('border', '2px double red')).toEqual({
        borderWidth: 2,
        borderStyle: 'double',
        borderColor: 'red',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// https://drafts.csswg.org/css-flexbox-1/#flex-property (editor's draft, fetched 2026-05-13)
describe('flex shorthand spec compliance (CSS Flexbox Level 1 §7.1)', () => {
  // Value: none | [ <'flex-grow'> <'flex-shrink'>? || <'flex-basis'> ]
  // "Equivalent to flex: 0 1 auto. (This is the initial value.)"
  // (CSS Flexbox Level 1 §7.1.1 informative summary list for flex: initial)
  it('flex: initial matches flex: 0 1 auto', () => {
    expect(transformDecl('flex', 'initial')).toEqual({
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: 'auto',
    });
  });

  // "The keyword none expands to 0 0 auto."
  it('flex: none expands to 0 0 auto', () => {
    expect(transformDecl('flex', 'none')).toMatchInlineSnapshot(`
      {
        "flexBasis": "auto",
        "flexGrow": 0,
        "flexShrink": 0,
      }
    `);
  });

  // "Equivalent to flex: 1 1 auto."
  it('flex: auto matches flex: 1 1 auto', () => {
    expect(transformDecl('flex', 'auto')).toMatchInlineSnapshot(`
      {
        "flexBasis": "auto",
        "flexGrow": 1,
        "flexShrink": 1,
      }
    `);
  });

  // "Equivalent to flex: <number [1,∞]> 1 0."
  it('flex: single positive number matches flex: N 1 0', () => {
    expect(transformDecl('flex', '1')).toMatchInlineSnapshot(`
      {
        "flexBasis": 0,
        "flexGrow": 1,
        "flexShrink": 1,
      }
    `);
  });

  it('flex: explicit grow shrink and basis', () => {
    expect(transformDecl('flex', '1 0 auto')).toMatchInlineSnapshot(`
      {
        "flexBasis": "auto",
        "flexGrow": 1,
        "flexShrink": 0,
      }
    `);
  });

  it('flex: explicit grow shrink and length basis', () => {
    expect(transformDecl('flex', '2 0 100px')).toMatchInlineSnapshot(`
      {
        "flexBasis": 100,
        "flexGrow": 2,
        "flexShrink": 0,
      }
    `);
  });

  // "A unitless zero that is not already preceded by two flex factors
  // must be interpreted as a flex factor."
  it('flex: unitless zero after two flex factors is flex-basis 0', () => {
    expect(transformDecl('flex', '1 1 0')).toEqual({
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    });
  });

  // "The flex-grow property sets the flex grow factor to the provided <number>.
  // Negative values are not allowed." (CSS Flexbox Level 1 §7.2.1)
  it('flex: rejects negative flex-grow', () => {
    expect(transformDecl('flex', '-1')).toEqual({});
  });

  // "The flex-shrink property sets the flex shrink factor to the provided <number>.
  // Negative values are not allowed." (CSS Flexbox Level 1 §7.2.2)
  it('flex: rejects negative flex-shrink', () => {
    expect(transformDecl('flex', '1 -1')).toEqual({});
  });

  // "<'flex-basis'> ... resolved the same way as for width and height"
  // (CSS Flexbox Level 1 §7.2.3); negative lengths are invalid there.
  it('flex: rejects negative flex-basis length', () => {
    expect(transformDecl('flex', '1 1 -1px')).toEqual({});
  });

  // https://drafts.csswg.org/css-flexbox-1/#propdef-flex-basis (editor's draft)
  // "Value: content | <'width'>"
  // <'width'> takes a math function. The basis keeps its authored text for the
  // render-time resolver, the way margin and padding do.
  it.each(['calc(50% - 10px)', 'min(200px, 40vw)', 'clamp(100px, 20vw, 300px)'])(
    'flex: a %s basis defers to the render-time resolver',
    basis => {
      expect(transformDecl('flex', `1 1 ${basis}`)).toEqual({
        flexBasis: basis,
        flexGrow: 1,
        flexShrink: 1,
      });
    }
  );

  describeOnRnWeb(() => {
    // flex shorthand does not fork on __NATIVE_WEB__; assert stable parity with the native bundle.
    it('flex: 1 matches native numeric expansion', () => {
      expect(transformDecl('flex', '1')).toEqual({
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
      });
    });
  });
});

// https://drafts.csswg.org/css-flexbox-1/#flex-flow-property (editor's draft, fetched 2026-05-13)
describe('flex-flow shorthand spec compliance (CSS Flexbox Level 1 §5.3)', () => {
  // Value: <'flex-direction'> || <'flex-wrap'>
  // "The flex-flow property is a shorthand for setting the flex-direction and flex-wrap properties,
  // which together define the flex container's main and cross axes."
  it('flex-flow: row then wrap', () => {
    expect(transformDecl('flexFlow', 'row wrap')).toMatchInlineSnapshot(`
      {
        "flexDirection": "row",
        "flexWrap": "wrap",
      }
    `);
  });

  // "Canonical order: per grammar" (flex-flow propdef table)
  it('flex-flow: accepts flex-direction and flex-wrap in either order', () => {
    expect(transformDecl('flexFlow', 'wrap column')).toMatchInlineSnapshot(`
      {
        "flexDirection": "column",
        "flexWrap": "wrap",
      }
    `);
  });

  describeOnRnWeb(() => {
    it('flex-flow: row wrap matches native expansion', () => {
      expect(transformDecl('flexFlow', 'row wrap')).toEqual({
        flexDirection: 'row',
        flexWrap: 'wrap',
      });
    });
  });
});

// https://drafts.csswg.org/css-align-3/#place-content (editor's draft, fetched 2026-05-13)
describe('place-content shorthand spec compliance (CSS Box Alignment Level 3 §5.2)', () => {
  // "This shorthand property sets both the align-content and justify-content properties in one declaration.
  // The first value is assigned to align-content.
  // The second value is assigned to justify-content;
  // if omitted, it is copied from the first value,
  // unless that value is a <baseline-position>
  // in which case it is defaulted to start."
  it('place-content: single value copies to justify-content', () => {
    expect(transformDecl('placeContent', 'center')).toMatchInlineSnapshot(`
      {
        "alignContent": "center",
        "justifyContent": "center",
      }
    `);
  });

  it('place-content: two values map to align-content then justify-content', () => {
    expect(transformDecl('placeContent', 'flex-start space-between')).toMatchInlineSnapshot(`
      {
        "alignContent": "flex-start",
        "justifyContent": "space-between",
      }
    `);
  });

  // Native Yoga accepts flex-prefixed content positions; normalize start/end.
  it('place-content: normalizes start and end to flex-start and flex-end', () => {
    expect(transformDecl('placeContent', 'start end')).toEqual({
      alignContent: 'flex-start',
      justifyContent: 'flex-end',
    });
  });

  it('place-content: space-evenly with a second justify keyword', () => {
    expect(transformDecl('placeContent', 'space-evenly center')).toEqual({
      alignContent: 'space-evenly',
      justifyContent: 'center',
    });
  });

  it('place-content: center then space-evenly maps align then justify', () => {
    expect(transformDecl('placeContent', 'center space-evenly')).toEqual({
      alignContent: 'center',
      justifyContent: 'space-evenly',
    });
  });

  it('place-content: flex-start alone copies to justify-content', () => {
    expect(transformDecl('placeContent', 'flex-start')).toEqual({
      alignContent: 'flex-start',
      justifyContent: 'flex-start',
    });
  });

  it('place-content: copied single start normalizes to both longhands', () => {
    expect(transformDecl('placeContent', 'start')).toEqual({
      alignContent: 'flex-start',
      justifyContent: 'flex-start',
    });
  });

  describeOnRnWeb(() => {
    // On rn-web the browser implements the full CSS Box Alignment 3 §5.2
    // grammar, including baselines, normal, the safe / unsafe overflow
    // prefixes, and the left / right keywords on justify-content. Native
    // can't honor those values (Yoga's keyword set is narrower), but the
    // browser can: pass the raw declaration through so the browser sees
    // exactly what the author wrote.
    it('place-content: two-keyword form passes through to the browser', () => {
      expect(transformDecl('placeContent', 'flex-start space-between')).toEqual({
        placeContent: 'flex-start space-between',
      });
    });

    it('place-content: baseline passes through to the browser', () => {
      expect(transformDecl('placeContent', 'baseline')).toEqual({
        placeContent: 'baseline',
      });
    });

    it('place-content: normal passes through to the browser', () => {
      expect(transformDecl('placeContent', 'normal')).toEqual({
        placeContent: 'normal',
      });
    });

    it('place-content: safe center keeps the overflow-position prefix', () => {
      expect(transformDecl('placeContent', 'safe center')).toEqual({
        placeContent: 'safe center',
      });
    });

    it('place-content: center left forwards the justify-only keyword', () => {
      expect(transformDecl('placeContent', 'center left')).toEqual({
        placeContent: 'center left',
      });
    });
  });
});

// https://drafts.csswg.org/css-fonts-4/#font-prop (editor's draft, fetched 2026-05-13)
describe('font shorthand spec compliance (CSS Fonts 4 §2.7)', () => {
  // Value begins with optional style/weight/variant in any order, then
  // required <'font-size'> and optional / <'line-height'>, then <'font-family'>#.
  // "Canonical order: per grammar"
  it('font: expands style weight size line-height and family', () => {
    expect(transformDecl('font', 'italic bold 14px/1.5 Helvetica')).toMatchInlineSnapshot(`
      {
        "fontFamily": "Helvetica",
        "fontSize": 14,
        "fontStyle": "italic",
        "fontVariant": [],
        "fontWeight": "bold",
        "lineHeight": 1.5,
      }
    `);
  });

  it('font: size and family only supply defaults for omitted style weight variant', () => {
    expect(transformDecl('font', '16px Arial')).toMatchInlineSnapshot(`
      {
        "fontFamily": "Arial",
        "fontSize": 16,
        "fontStyle": "normal",
        "fontVariant": [],
        "fontWeight": "normal",
      }
    `);
  });

  it('font: numeric weight with generic family resolves on native (iOS preset in Jest)', () => {
    expect(transformDecl('font', '700 14px sans-serif')).toMatchInlineSnapshot(`
      {
        "fontFamily": "System",
        "fontSize": 14,
        "fontStyle": "normal",
        "fontVariant": [],
        "fontWeight": 700,
      }
    `);
  });

  // CSS Inline 3 / CSS 2.1 line-height: percentage refers to computed font-size.
  it('font: percentage line-height resolves against px font-size on native', () => {
    expect(transformDecl('font', '16px/150% Arial')).toEqual({
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontVariant: [],
      fontSize: 16,
      fontFamily: 'Arial',
      lineHeight: 24,
    });
  });

  // CSS Fonts 4 §2.7 grammar admits more leading keyword classes than RN
  // can render. Each unsupported class must drop with a stable warnOnce so
  // authors see the silent narrowing rather than wonder why their
  // declaration disappeared.
  describe('unsupported keyword classes on native warn (CSS Fonts 4 §2.7)', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      resetWarningsForTest();
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    // "<font-width-css3> = normal | <font-stretch-absolute>" with
    // <font-stretch-absolute> = ultra-condensed | extra-condensed |
    // condensed | semi-condensed | semi-expanded | expanded |
    // extra-expanded | ultra-expanded.
    it('font: <font-width-css3> keyword (condensed) warns and drops', () => {
      expect(transformDecl('font', 'condensed 14px Arial')).toEqual({});
      const msg = warnSpy.mock.calls[0]?.[0] as string | undefined;
      expect(msg).toMatch(/font-width|font-stretch/i);
      expect(msg).toMatch(/condensed/);
    });

    // CSS Fonts 4 §2.3 absolute-size reference table used by Chrome /
    // Safari / Firefox at default medium (16px). To guarantee identical
    // rendering across web, iOS, and Android, we resolve to the same
    // pixel values on every platform instead of forwarding the keyword.
    // Authors who want Dynamic Type accessibility scaling on iOS can
    // still set the `dynamicTypeRamp` Text prop directly.
    it.each([
      ['xx-small', 9],
      ['x-small', 10],
      ['small', 13],
      ['medium', 16],
      ['large', 18],
      ['x-large', 24],
      ['xx-large', 32],
      ['xxx-large', 48],
    ] as const)('font: <absolute-size> %s resolves to %ipx (CSS Fonts 4 §2.3)', (keyword, px) => {
      expect(transformDecl('font', `${keyword} Arial`)).toMatchObject({
        fontSize: px,
        fontFamily: 'Arial',
      });
    });

    // CSS Fonts 4 §2.3.2 relative-size keywords: "larger" steps to the
    // next entry on the absolute-size ramp when the inherited size
    // matches a keyword, otherwise multiplies by 1.2. Resolved at
    // render time against the inherited cascade font-size so web,
    // iOS, and Android land on the same value.
    it('font: relative-size keyword (larger) emits a 2-byte resolver sentinel', () => {
      expect(transformDecl('font', 'larger Arial')).toMatchObject({
        fontSize: '\0+',
        fontFamily: 'Arial',
      });
    });

    it('font: relative-size keyword (smaller) emits a 2-byte resolver sentinel', () => {
      expect(transformDecl('font', 'smaller Arial')).toMatchObject({
        fontSize: '\0-',
      });
    });

    // System fonts: <'font'> = caption | icon | menu | message-box |
    // small-caption | status-bar.
    it('font: system font name (caption) warns and drops', () => {
      expect(transformDecl('font', 'caption')).toEqual({});
      const msg = warnSpy.mock.calls[0]?.[0] as string | undefined;
      expect(msg).toMatch(/system font/i);
      expect(msg).toMatch(/caption/);
    });
  });

  describeOnRnWeb(() => {
    it('font: percentage line-height passes through for the browser', () => {
      expect(transformDecl('font', '16px/150% Arial')).toEqual({
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontVariant: [],
        fontSize: 16,
        fontFamily: 'Arial',
        lineHeight: '150%',
      });
    });

    // Parity guarantee: rn-web must resolve absolute-size keywords to the
    // same pixel values native uses so the rendered text matches on every
    // platform. Otherwise the browser's default-medium and the user's
    // browser preference could drift away from iOS / Android.
    it.each([
      ['xx-small', 9],
      ['x-small', 10],
      ['small', 13],
      ['medium', 16],
      ['large', 18],
      ['x-large', 24],
      ['xx-large', 32],
      ['xxx-large', 48],
    ] as const)('font: <absolute-size> %s resolves to %ipx on rn-web', (keyword, px) => {
      expect(transformDecl('font', `${keyword} Arial`)).toMatchObject({
        fontSize: px,
        fontFamily: 'Arial',
      });
    });
  });
});

describe('fontFamily and fontVariant', () => {
  it('font-family: multi-word unquoted', () => {
    expect(transformDecl('fontFamily', 'Helvetica Neue')).toEqual({
      fontFamily: 'Helvetica Neue',
    });
  });

  it('font-family: quoted string', () => {
    expect(transformDecl('fontFamily', '"Helvetica Neue"')).toEqual({
      fontFamily: 'Helvetica Neue',
    });
  });

  it('font-variant: array of idents', () => {
    expect(transformDecl('fontVariant', 'small-caps tabular-nums')).toMatchInlineSnapshot(`
      {
        "fontVariant": [
          "small-caps",
          "tabular-nums",
        ],
      }
    `);
  });
});

// https://drafts.csswg.org/css-text-decor-4/#text-decoration-property (editor's draft, fetched 2026-05-13)
// Native transform maps shorthand to line/style/color longhands; it does not parse
// text-decoration-thickness (CSS Text Decoration 4 §2.6 value grammar).
describe('text-decoration shorthand spec compliance (CSS Text Decoration Level 4 §2.6)', () => {
  // "This property is a shorthand for setting text-decoration-line,
  // text-decoration-thickness, text-decoration-style, and text-decoration-color
  // in one declaration. Omitted values are set to their initial values."
  // text-decoration-color propdef: "Initial: currentcolor". The undefined
  // entry resets an earlier explicit color while leaving RN to paint the
  // line in the text color (its currentcolor behavior).
  it('text-decoration: line keyword sets line with initial style and color', () => {
    expect(transformDecl('textDecoration', 'underline')).toMatchInlineSnapshot(`
      {
        "textDecorationColor": undefined,
        "textDecorationLine": "underline",
        "textDecorationStyle": "solid",
      }
    `);
  });

  it('text-decoration: dual line keywords serialize in canonical order', () => {
    expect(transformDecl('textDecoration', 'line-through underline').textDecorationLine).toBe(
      'underline line-through'
    );
  });

  // CSS Text Decoration 4 §2.1: "none" is exclusive; combining it with any
  // other line keyword makes the declaration invalid. The longhand handler
  // already rejects; the shorthand must do the same.
  it('text-decoration: rejects underline none (none is exclusive)', () => {
    expect(transformDecl('textDecoration', 'underline none')).toEqual({});
  });

  it('text-decoration: rejects none underline (none is exclusive)', () => {
    expect(transformDecl('textDecoration', 'none underline')).toEqual({});
  });

  // CSS Text Decoration 4 §2.1 canonical order: `underline || overline ||
  // line-through || blink`. The serialization must reflect that order
  // regardless of the authored token order.
  it('text-decoration: serializes underline + overline in canonical order', () => {
    expect(transformDecl('textDecoration', 'overline underline').textDecorationLine).toBe(
      'underline overline'
    );
  });

  it('text-decoration: serializes underline + overline + line-through in canonical order', () => {
    expect(
      transformDecl('textDecoration', 'line-through overline underline').textDecorationLine
    ).toBe('underline overline line-through');
  });

  // RN 0.85's TextStyleTypes declares `textDecorationStyle?: 'solid' |
  // 'double' | 'dotted' | 'dashed'`; `wavy` is missing from the type, RN
  // drops it on iOS / Android. Warn so the silent narrowing surfaces
  // before the underline renders solid.
  describe('text-decoration-style platform skew (RN 0.85)', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      resetWarningsForTest();
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('text-decoration: underline wavy red warns and falls back to solid', () => {
      const out = transformDecl('textDecoration', 'underline wavy red');
      expect(out.textDecorationStyle).toBe('solid');
      expect(out.textDecorationLine).toBe('underline');
      expect(out.textDecorationColor).toBe('red');
      const msg = warnSpy.mock.calls[0]?.[0] as string | undefined;
      expect(msg).toMatch(/wavy/);
      expect(msg).toMatch(/React Native|iOS|Android/);
    });
  });

  // https://drafts.csswg.org/css-text-decor-4/#text-decoration-thickness-property (editor's draft)
  // "Value: auto | from-font | <length-percentage> | <line-width>"
  // A <length-percentage> admits a math function. RN cannot draw the thickness, so the
  // component is consumed and the rest of the shorthand still applies.
  it('text-decoration: a math-function thickness is consumed and the rest applies', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(transformDecl('textDecoration', 'underline calc(1px + 1px) red')).toEqual({
        textDecorationColor: 'red',
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('text-decoration: line style and color together', () => {
    expect(transformDecl('textDecoration', 'underline dashed red')).toMatchInlineSnapshot(`
      {
        "textDecorationColor": "red",
        "textDecorationLine": "underline",
        "textDecorationStyle": "dashed",
      }
    `);
  });

  describeOnRnWeb(() => {
    it('text-decoration: underline dashed red matches native longhand split', () => {
      expect(transformDecl('textDecoration', 'underline dashed red')).toEqual({
        textDecorationLine: 'underline',
        textDecorationStyle: 'dashed',
        textDecorationColor: 'red',
      });
    });
  });
});

// https://drafts.csswg.org/css-text-decor-4/#text-decoration-line-property (editor's draft, fetched 2026-05-13)
describe('text-decoration-line shorthand spec compliance (CSS Text Decoration Level 4 §2.1)', () => {
  // Value: none | [ underline || overline || line-through || blink ] | spelling-error | grammar-error
  it('text-decoration-line: single keyword', () => {
    expect(transformDecl('textDecorationLine', 'line-through')).toEqual({
      textDecorationLine: 'line-through',
    });
  });

  it('text-decoration-line: rejects none combined with another line keyword', () => {
    expect(transformDecl('textDecorationLine', 'none underline')).toEqual({});
    expect(transformDecl('textDecorationLine', 'underline none')).toEqual({});
  });
});

// https://drafts.csswg.org/css-text-decor-4/#text-shadow-property (editor's draft, fetched 2026-05-13)
describe('text-shadow (CSS Text Decoration Level 4 §4) and shadow-offset', () => {
  // Value: none | <shadow>#
  // "This property accepts a comma-separated list of shadow effects to be applied to the text of the element.
  // Values are interpreted as for box-shadow [CSS-BACKGROUNDS-3]."
  it('text-shadow: offset blur and color', () => {
    expect(transformDecl('textShadow', '2px 4px 6px red')).toMatchInlineSnapshot(`
      {
        "textShadowColor": "red",
        "textShadowOffset": {
          "height": 4,
          "width": 2,
        },
        "textShadowRadius": 6,
      }
    `);
  });

  it('text-shadow: none keyword', () => {
    expect(transformDecl('textShadow', 'none')).toMatchInlineSnapshot(`
      {
        "textShadowColor": "black",
        "textShadowOffset": {
          "height": 0,
          "width": 0,
        },
        "textShadowRadius": 0,
      }
    `);
  });

  it('shadow-offset: width only duplicates x as y', () => {
    expect(transformDecl('shadowOffset', '3px')).toMatchInlineSnapshot(`
      {
        "shadowOffset": {
          "height": 3,
          "width": 3,
        },
      }
    `);
  });

  it('shadow-offset: x and y', () => {
    expect(transformDecl('shadowOffset', '3px 5px')).toMatchInlineSnapshot(`
      {
        "shadowOffset": {
          "height": 5,
          "width": 3,
        },
      }
    `);
  });
});

// https://drafts.csswg.org/css-values-4/#math
describe('CSS Values 4 §10.3-10.6 (Math L4 functions)', () => {
  // §10.3 stepped-value functions
  describe('round()', () => {
    it('default strategy = nearest', () => {
      expect(transformDecl('width', 'round(15.7, 5)')).toEqual({ width: 15 });
      expect(transformDecl('width', 'round(17.5, 5)')).toEqual({ width: 20 });
    });

    it('explicit nearest', () => {
      expect(transformDecl('width', 'round(nearest, 15.7px, 5px)')).toEqual({ width: 15 });
    });

    it('up strategy (ceiling)', () => {
      expect(transformDecl('width', 'round(up, 15.1px, 5px)')).toEqual({ width: 20 });
    });

    it('down strategy (floor)', () => {
      expect(transformDecl('width', 'round(down, 15.9px, 5px)')).toEqual({ width: 15 });
    });

    // margin-top has no range, so a negative result survives range checking.
    it('to-zero strategy (truncate)', () => {
      expect(transformDecl('margin-top', 'round(to-zero, -15.9px, 5px)')).toEqual({
        marginTop: -15,
      });
    });

    it('B defaults to 1 when omitted', () => {
      expect(transformDecl('width', 'round(15.7)')).toEqual({ width: 16 });
    });
  });

  // mod / rem: mod takes sign of divisor; rem takes sign of dividend.
  describe('mod() and rem()', () => {
    it('mod(7, 3) = 1', () => {
      expect(transformDecl('width', 'mod(7, 3)')).toEqual({ width: 1 });
    });

    it('mod(-7, 3) = 2 (sign of divisor)', () => {
      expect(transformDecl('width', 'mod(-7, 3)')).toEqual({ width: 2 });
    });

    it('rem(7, 3) = 1', () => {
      expect(transformDecl('width', 'rem(7, 3)')).toEqual({ width: 1 });
    });

    it('rem(-7, 3) = -1 (sign of dividend)', () => {
      expect(transformDecl('margin-top', 'rem(-7, 3)')).toEqual({ marginTop: -1 });
    });
  });

  // §10.4 trig functions
  describe('sin / cos / tan', () => {
    it('sin(90deg) = 1', () => {
      expect(transformDecl('opacity', 'sin(90deg)')).toEqual({ opacity: 1 });
    });

    it('cos(0) = 1 (bare-number treated as radians)', () => {
      expect(transformDecl('opacity', 'cos(0)')).toEqual({ opacity: 1 });
    });

    it('tan(45deg) ≈ 1', () => {
      const out = transformDecl('opacity', 'tan(45deg)') as { opacity: number };
      expect(out.opacity).toBeCloseTo(1, 5);
    });
  });

  // The inverse trig functions return <angle> (degrees). Tested via
  // a numeric-shaped property; the fold emits `'<n>deg'` for non-px
  // units, which surfaces the value + unit in one place.
  describe('asin / acos / atan', () => {
    it('asin(1) folds to 90deg', () => {
      expect(transformDecl('width', 'asin(1)')).toEqual({ width: '90deg' });
    });

    it('acos(0) folds to 90deg', () => {
      expect(transformDecl('width', 'acos(0)')).toEqual({ width: '90deg' });
    });

    it('atan(1) folds to 45deg', () => {
      expect(transformDecl('width', 'atan(1)')).toEqual({ width: '45deg' });
    });

    it('atan2(1, 1) folds to 45deg', () => {
      expect(transformDecl('width', 'atan2(1, 1)')).toEqual({ width: '45deg' });
    });

    it('asin(2) (out of domain) declines the fold and drops with a warning', () => {
      // Out-of-domain values would produce NaN; the fold bails and no
      // render-time resolver builds asin(), so the declaration drops.
      resetWarningsForTest();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(transformDecl('width', 'asin(2)')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(1);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  // §10.5 exponential functions
  describe('pow / sqrt / hypot / log / exp', () => {
    it('pow(2, 10) = 1024', () => {
      expect(transformDecl('width', 'pow(2, 10)')).toEqual({ width: 1024 });
    });

    it('sqrt(16) = 4', () => {
      expect(transformDecl('width', 'sqrt(16)')).toEqual({ width: 4 });
    });

    it('hypot(3, 4) = 5', () => {
      expect(transformDecl('width', 'hypot(3, 4)')).toEqual({ width: 5 });
    });

    it('log(e) = 1', () => {
      const out = transformDecl('opacity', 'log(e)') as { opacity: number };
      expect(out.opacity).toBeCloseTo(1, 5);
    });

    it('log(100, 10) = 2', () => {
      // opacity clamps to [0,1], so the value 2 is read on margin-top.
      const out = transformDecl('margin-top', 'log(100, 10)') as { marginTop: number };
      expect(out.marginTop).toBeCloseTo(2, 5);
    });

    it('exp(0) = 1', () => {
      expect(transformDecl('opacity', 'exp(0)')).toEqual({ opacity: 1 });
    });
  });

  // §10.6 sign-related functions
  describe('abs / sign', () => {
    it('abs(-12px) = 12', () => {
      expect(transformDecl('width', 'abs(-12px)')).toEqual({ width: 12 });
    });

    // opacity clamps to [0,1], so the value -1 is read on z-index, which has no lower bound.
    it('sign(-5) = -1', () => {
      expect(transformDecl('z-index', 'sign(-5)')).toEqual({ zIndex: -1 });
    });

    it('sign(0) = 0', () => {
      expect(transformDecl('opacity', 'sign(0)')).toEqual({ opacity: 0 });
    });

    it('sign(5) = 1', () => {
      expect(transformDecl('opacity', 'sign(5)')).toEqual({ opacity: 1 });
    });
  });

  // Math keyword constants still compose with the new functions.
  it('round(pi * 10, 1) ≈ 31', () => {
    expect(transformDecl('width', 'round(calc(pi * 10), 1)')).toEqual({ width: 31 });
  });
});

// https://drafts.csswg.org/css-logical-1/#border-shorthands
describe('CSS Logical 1 §4.5 (border-inline / border-block)', () => {
  // Single-edge longhands map to RN's logical / physical edge keys
  // under horizontal-tb (Yoga's only writing mode).
  it('border-inline-start-color → borderStartColor', () => {
    expect(transformDecl('borderInlineStartColor', 'red')).toEqual({ borderStartColor: 'red' });
  });

  it('border-inline-end-width → borderEndWidth', () => {
    expect(transformDecl('borderInlineEndWidth', '2px')).toEqual({ borderEndWidth: 2 });
  });

  it('border-block-start-color → borderTopColor', () => {
    expect(transformDecl('borderBlockStartColor', 'red')).toEqual({ borderTopColor: 'red' });
  });

  it('border-block-end-width → borderBottomWidth', () => {
    expect(transformDecl('borderBlockEndWidth', '3px')).toEqual({ borderBottomWidth: 3 });
  });

  // Per-edge style longhands have no RN surface; drop + warn.
  it('border-inline-start-style: dashed drops on native (warn)', () => {
    expect(transformDecl('borderInlineStartStyle', 'dashed')).toEqual({});
  });

  // Axis shorthands cycle a single value to both edges.
  it('border-inline-color: red → borderStartColor + borderEndColor', () => {
    expect(transformDecl('borderInlineColor', 'red')).toEqual({
      borderStartColor: 'red',
      borderEndColor: 'red',
    });
  });

  it('border-inline-color: red green → start red, end green', () => {
    expect(transformDecl('borderInlineColor', 'red green')).toEqual({
      borderStartColor: 'red',
      borderEndColor: 'green',
    });
  });

  it('border-block-width: 2px → borderTopWidth + borderBottomWidth', () => {
    expect(transformDecl('borderBlockWidth', '2px')).toEqual({
      borderTopWidth: 2,
      borderBottomWidth: 2,
    });
  });

  it('border-block-width: 2px 4px → top 2, bottom 4', () => {
    expect(transformDecl('borderBlockWidth', '2px 4px')).toEqual({
      borderTopWidth: 2,
      borderBottomWidth: 4,
    });
  });

  // Composite single-edge shorthand.
  it('border-inline-start: 2px solid red emits width + color + warns style', () => {
    expect(transformDecl('borderInlineStart', '2px solid red')).toEqual({
      borderStartWidth: 2,
      borderStartColor: 'red',
    });
  });

  it('border-block-end: 1px red emits width + color (style omitted)', () => {
    expect(transformDecl('borderBlockEnd', '1px red')).toEqual({
      borderBottomWidth: 1,
      borderBottomColor: 'red',
    });
  });

  // Mode-spanning: both start + end of the axis get the same value.
  it('border-inline: 2px red applies to both inline edges', () => {
    expect(transformDecl('borderInline', '2px red')).toEqual({
      borderStartWidth: 2,
      borderEndWidth: 2,
      borderStartColor: 'red',
      borderEndColor: 'red',
    });
  });

  it('border-block: 3px green applies to both block edges', () => {
    expect(transformDecl('borderBlock', '3px green')).toEqual({
      borderTopWidth: 3,
      borderBottomWidth: 3,
      borderTopColor: 'green',
      borderBottomColor: 'green',
    });
  });

  describeOnRnWeb(() => {
    it('per-edge style emits the camelCase key for atomic CSS hyphenation', () => {
      expect(transformDecl('borderInlineStartStyle', 'dashed')).toEqual({
        borderInlineStartStyle: 'dashed',
      });
    });
  });
});

// https://drafts.csswg.org/css-ui-4/#outline-style
describe('CSS UI 4 §3.3 (outline-style: hidden invalid)', () => {
  it('outline-style: hidden drops on native + warns (invalid per spec)', () => {
    expect(transformDecl('outlineStyle', 'hidden')).toEqual({});
  });

  it('outline-style: solid passes through', () => {
    expect(transformDecl('outlineStyle', 'solid')).toEqual({ outlineStyle: 'solid' });
  });

  it('outline-style: none → solid + width 0', () => {
    expect(transformDecl('outlineStyle', 'none')).toEqual({
      outlineStyle: 'solid',
      outlineWidth: 0,
    });
  });
});

// https://drafts.csswg.org/css-backgrounds-3/#background
describe('background shorthand spec compliance (CSS Backgrounds 3 §2.10)', () => {
  // "The background shorthand property first resets all the individual
  // background properties ... then assigns any explicit values specified
  // for this layer in the declaration."
  it('background: <color> only → backgroundColor', () => {
    expect(transformDecl('background', 'red')).toEqual({ backgroundColor: 'red' });
  });

  // "Finally background-color is set to the specified color, if any, else
  // set to its initial value."
  it('background: <image> only → emits dual-emit longhands with defaults', () => {
    // backgroundPosition default `0% 0%` is multi-token; the rn-web
    // key is skipped to avoid the validator warning. Per spec the
    // shorthand also resets background-color to its initial value
    // (transparent).
    expect(transformDecl('background', 'linear-gradient(red, blue)')).toEqual({
      backgroundColor: 'transparent',
      experimental_backgroundImage: 'linear-gradient(red, blue)',
      backgroundImage: 'linear-gradient(red, blue)',
      experimental_backgroundPosition: '0% 0%',
      experimental_backgroundSize: 'auto',
      backgroundSize: 'auto',
      experimental_backgroundRepeat: 'repeat',
      backgroundRepeat: 'repeat',
    });
  });

  it('background: <image> <color> emits both image bundle + backgroundColor', () => {
    expect(transformDecl('background', 'linear-gradient(red, blue) green')).toEqual({
      backgroundColor: 'green',
      experimental_backgroundImage: 'linear-gradient(red, blue)',
      backgroundImage: 'linear-gradient(red, blue)',
      experimental_backgroundPosition: '0% 0%',
      experimental_backgroundSize: 'auto',
      backgroundSize: 'auto',
      experimental_backgroundRepeat: 'repeat',
      backgroundRepeat: 'repeat',
    });
  });

  it('background: <image> <position> / <size> <repeat>', () => {
    // `cover` folds to `auto` on the native key (RN 0.85 parser drops
    // the keyword form, producing an empty list that crashes the draw
    // pass); rn-web keeps the keyword so the browser resolves it.
    expect(
      transformDecl('background', 'linear-gradient(red, blue) center / cover no-repeat')
    ).toEqual({
      backgroundColor: 'transparent',
      experimental_backgroundImage: 'linear-gradient(red, blue)',
      backgroundImage: 'linear-gradient(red, blue)',
      experimental_backgroundPosition: 'center',
      backgroundPosition: 'center',
      experimental_backgroundSize: 'auto',
      backgroundSize: 'cover',
      experimental_backgroundRepeat: 'no-repeat',
      backgroundRepeat: 'no-repeat',
    });
  });

  it('background shorthand collapses equivalent center keyword positions before dual emit', () => {
    expect(transformDecl('background', 'linear-gradient(red, blue) center top / cover')).toEqual({
      backgroundColor: 'transparent',
      experimental_backgroundImage: 'linear-gradient(red, blue)',
      backgroundImage: 'linear-gradient(red, blue)',
      experimental_backgroundPosition: 'top',
      backgroundPosition: 'top',
      experimental_backgroundSize: 'auto',
      backgroundSize: 'cover',
      experimental_backgroundRepeat: 'repeat',
      backgroundRepeat: 'repeat',
    });
  });

  // "A pair of keywords can be reordered, while a combination of keyword
  // and length or percentage cannot. So center left is valid while 50%
  // left is not."
  it('rejects invalid background-position grammar inside the shorthand', () => {
    expect(transformDecl('background', 'linear-gradient(red, blue) 50% left')).toEqual({});
  });

  // "<bg-size> = [ <length-percentage [0,∞]> | auto ]{1,2} |
  // cover | contain"
  it('rejects invalid background-size grammar inside the shorthand', () => {
    expect(transformDecl('background', 'linear-gradient(red, blue) center / cover auto')).toEqual(
      {}
    );
    expect(transformDecl('background', 'linear-gradient(red, blue) center / -1px')).toEqual({});
  });

  // "This property’s value is given as a comma-separated list of values..."
  it('background: <image1>, <image2> emits comma-separated longhands', () => {
    const out = transformDecl(
      'background',
      'linear-gradient(red, blue), linear-gradient(green, yellow)'
    );
    expect(out.experimental_backgroundImage).toBe(
      'linear-gradient(red, blue), linear-gradient(green, yellow)'
    );
    expect(out.experimental_backgroundPosition).toBe('0% 0%');
  });

  // Per Backgrounds 3 list matching, one background-position / size /
  // repeat value cycles across all image layers. Collapsing identical
  // defaults preserves paint while avoiding host validators that reject
  // redundant comma lists.
  it('collapses identical default longhands from layered background shorthand', () => {
    const out = transformDecl(
      'background',
      'linear-gradient(red, blue), linear-gradient(green, yellow)'
    );
    expect(out.experimental_backgroundPosition).toBe('0% 0%');
    expect(out.experimental_backgroundSize).toBe('auto');
    expect(out.backgroundSize).toBe('auto');
    expect(out.experimental_backgroundRepeat).toBe('repeat');
    expect(out.backgroundRepeat).toBe('repeat');
  });

  // "A color is permitted in <final-bg-layer>, but not in <bg-layer>."
  it('rejects color on a non-final layer', () => {
    expect(transformDecl('background', 'red, linear-gradient(blue, green)')).toEqual({});
  });

  // "`background-attachment: fixed` ... the background is fixed with
  // regard to the viewport." RN has no viewport-anchored background
  // surface, so the native path warns and drops the attachment.
  it('background: <image> fixed warns once on native', () => {
    const out = transformDecl('background', 'linear-gradient(red, blue) fixed');
    expect(out.experimental_backgroundImage).toBe('linear-gradient(red, blue)');
  });

  // "`local` ... the background scrolls with the box’s contents..."
  // RN has no content-anchored background surface, so the native path
  // warns and drops the attachment.
  it('background: <image> local warns once on native', () => {
    resetWarningsForTest();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = transformDecl('background', 'linear-gradient(red, blue) local');
      expect(out.experimental_backgroundImage).toBe('linear-gradient(red, blue)');
      expect(warnSpy).toHaveBeenCalledWith(
        '[sc] `background-attachment: local` is ignored on React Native because iOS and Android do not expose content-anchored backgrounds. rn-web keeps it. Remove the declaration.'
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('rejects unrecognized tokens', () => {
    expect(transformDecl('background', 'banana')).toEqual({});
  });

  // "Finally background-color is set to the specified color, if any, else
  // set to its initial value."
  it('background: none resets backgroundColor to transparent', () => {
    expect(transformDecl('background', 'none')).toEqual({
      backgroundColor: 'transparent',
      experimental_backgroundImage: 'none',
      backgroundImage: 'none',
      experimental_backgroundPosition: '0% 0%',
      experimental_backgroundSize: 'auto',
      backgroundSize: 'auto',
      experimental_backgroundRepeat: 'repeat',
      backgroundRepeat: 'repeat',
    });
  });

  // "<repeat-style> = repeat-x | repeat-y | [repeat | space | round |
  // no-repeat]{1,2}"
  it('rejects repeat-x repeat-y combo (single-form excluded from two-token slot)', () => {
    expect(transformDecl('background', 'linear-gradient(red, blue) repeat-x repeat-y')).toEqual({});
  });

  it('rejects mixing single-form and two-value repeat keywords', () => {
    expect(transformDecl('background', 'linear-gradient(red, blue) repeat-x space')).toEqual({});
  });

  // "<repeat-style> = repeat-x | repeat-y | [repeat | space | round |
  // no-repeat]{1,2}"
  it('accepts two-value repeat (space round)', () => {
    const out = transformDecl('background', 'linear-gradient(red, blue) space round');
    expect(out.experimental_backgroundRepeat).toBe('space round');
    expect(out.backgroundRepeat).toBe('space round');
  });

  describeOnRnWeb(() => {
    // "<bg-layer> = <bg-image> || <bg-position> [ / <bg-size> ]? ||
    // <repeat-style> || <attachment> || <visual-box> || <visual-box>"
    it('keeps attachment, origin, and clip longhands for browser parsing', () => {
      expect(
        transformDecl(
          'background',
          'linear-gradient(red, blue) center / cover fixed content-box padding-box'
        )
      ).toEqual({
        backgroundColor: 'transparent',
        experimental_backgroundImage: 'linear-gradient(red, blue)',
        backgroundImage: 'linear-gradient(red, blue)',
        experimental_backgroundPosition: 'center',
        backgroundPosition: 'center',
        experimental_backgroundSize: 'auto',
        backgroundSize: 'cover',
        experimental_backgroundRepeat: 'repeat',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
        backgroundOrigin: 'content-box',
        backgroundClip: 'padding-box',
      });
    });

    // "If one <visual-box> value is present then it sets both
    // background-origin and background-clip to that value."
    it('uses one visual-box for both origin and clip on rn-web', () => {
      expect(transformDecl('background', 'linear-gradient(red, blue) border-box')).toEqual({
        backgroundColor: 'transparent',
        experimental_backgroundImage: 'linear-gradient(red, blue)',
        backgroundImage: 'linear-gradient(red, blue)',
        experimental_backgroundPosition: '0% 0%',
        experimental_backgroundSize: 'auto',
        backgroundSize: 'auto',
        experimental_backgroundRepeat: 'repeat',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'scroll',
        backgroundOrigin: 'border-box',
        backgroundClip: 'border-box',
      });
    });

    // Native path warns on `local` / `fixed`; rn-web keeps the authored
    // attachment for the browser without `[sc]` noise.
    it('background: local emits attachment on rn-web without native dev warning', () => {
      resetWarningsForTest();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(transformDecl('background', 'linear-gradient(red, blue) local')).toEqual({
          backgroundColor: 'transparent',
          experimental_backgroundImage: 'linear-gradient(red, blue)',
          backgroundImage: 'linear-gradient(red, blue)',
          experimental_backgroundPosition: '0% 0%',
          experimental_backgroundSize: 'auto',
          backgroundSize: 'auto',
          experimental_backgroundRepeat: 'repeat',
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'local',
          backgroundOrigin: 'padding-box',
          backgroundClip: 'border-box',
        });
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});

describe('background box longhands spec compliance (CSS Backgrounds 3 §2.5, §2.7, §2.8)', () => {
  // "<attachment> = scroll | fixed | local"
  it('background-attachment: fixed drops on native', () => {
    expect(transformDecl('backgroundAttachment', 'fixed')).toEqual({});
  });

  // "Value: <attachment>#"
  it('background-attachment rejects unknown native values', () => {
    expect(transformDecl('backgroundAttachment', 'sticky')).toEqual({});
  });

  // "Value: <visual-box>#"
  it('background-origin drops non-default native positioning areas', () => {
    expect(transformDecl('backgroundOrigin', 'content-box')).toEqual({});
  });

  // "Initial: padding-box"
  it('background-origin: padding-box is a native no-op', () => {
    expect(transformDecl('backgroundOrigin', 'padding-box')).toEqual({});
  });

  // "Value: <visual-box>#"
  it('background-clip drops non-default native painting areas', () => {
    expect(transformDecl('backgroundClip', 'padding-box')).toEqual({});
  });

  // "Initial: border-box"
  it('background-clip: border-box is a native no-op', () => {
    expect(transformDecl('backgroundClip', 'border-box')).toEqual({});
  });

  it('comma-list defaults are native no-ops without warnings', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(transformDecl('backgroundAttachment', 'scroll, scroll')).toEqual({});
      expect(transformDecl('backgroundOrigin', 'padding-box, padding-box')).toEqual({});
      expect(transformDecl('backgroundClip', 'border-box, border-box')).toEqual({});
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  describeOnRnWeb(() => {
    // "The property’s value is given as a comma-separated list of
    // <attachment> keywords..."
    it('background-attachment passes through for browser parsing', () => {
      expect(transformDecl('backgroundAttachment', 'fixed, local')).toEqual({
        backgroundAttachment: 'fixed,local',
      });
    });

    // "Computed value: list, each item a keyword as specified"
    it('background-origin passes through authored visual boxes', () => {
      expect(transformDecl('backgroundOrigin', 'content-box, border-box')).toEqual({
        backgroundOrigin: 'content-box,border-box',
      });
    });

    // "Determines the background painting area, which determines the
    // area within which the background is painted."
    it('background-clip passes through authored visual boxes', () => {
      expect(transformDecl('backgroundClip', 'padding-box, content-box')).toEqual({
        backgroundClip: 'padding-box,content-box',
      });
    });
  });
});

// https://drafts.csswg.org/css-fonts-4/#font-style-prop
describe('CSS Fonts 4 §2.4 (font-style)', () => {
  it('font-style: normal', () => {
    expect(transformDecl('fontStyle', 'normal')).toEqual({ fontStyle: 'normal' });
  });

  it('font-style: italic', () => {
    expect(transformDecl('fontStyle', 'italic')).toEqual({ fontStyle: 'italic' });
  });

  it('font-style: oblique (no angle) maps to italic on native', () => {
    expect(transformDecl('fontStyle', 'oblique')).toEqual({ fontStyle: 'italic' });
  });

  it('font-style: oblique <angle> drops the angle + warns once on native', () => {
    expect(transformDecl('fontStyle', 'oblique 14deg')).toEqual({ fontStyle: 'italic' });
    expect(transformDecl('fontStyle', 'oblique -10deg')).toEqual({ fontStyle: 'italic' });
  });

  it('rejects unknown keyword', () => {
    expect(transformDecl('fontStyle', 'banana')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('passes oblique <angle> through to the browser', () => {
      expect(transformDecl('fontStyle', 'oblique 14deg')).toEqual({ fontStyle: 'oblique 14deg' });
    });
  });
});

// https://drafts.csswg.org/css-inline-3/#line-height-property (editor's draft, fetched 2026-05-13)
describe('line-height characterization (CSS Inline Layout 3)', () => {
  it('line-height: unitless number passes through', () => {
    expect(transformDecl('lineHeight', '1.4')).toEqual({ lineHeight: 1.4 });
  });

  it('line-height: <px length> passes through', () => {
    expect(transformDecl('lineHeight', '20px')).toEqual({ lineHeight: 20 });
  });

  it('line-height: <percentage> maps to em ratio (Inline 3 §5.1: computed relative to 1em)', () => {
    expect(transformDecl('lineHeight', '140%')).toEqual({ lineHeight: '1.4em' });
  });

  it('line-height: em / rem / lh / rlh pass through for the cascade resolver', () => {
    expect(transformDecl('lineHeight', '1.2em')).toEqual({ lineHeight: '1.2em' });
    expect(transformDecl('lineHeight', '1.2rem')).toEqual({ lineHeight: '1.2rem' });
    expect(transformDecl('lineHeight', '1lh')).toEqual({ lineHeight: '1lh' });
    expect(transformDecl('lineHeight', '0.5rlh')).toEqual({ lineHeight: '0.5rlh' });
  });

  it('line-height: normal is a no-op on native (RN default applies)', () => {
    expect(transformDecl('lineHeight', 'normal')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('line-height: percentage passes through for the browser', () => {
      expect(transformDecl('lineHeight', '140%')).toEqual({ lineHeight: '140%' });
    });

    it('line-height: em passes through for the browser', () => {
      expect(transformDecl('lineHeight', '1.2em')).toEqual({ lineHeight: '1.2em' });
    });
  });
});

// https://drafts.csswg.org/css-text-3/#letter-spacing-property (editor's draft, fetched 2026-05-13)
describe('CSS Text 3 §11.1 (letter-spacing) characterization', () => {
  it('letter-spacing: <number> passes through', () => {
    expect(transformDecl('letterSpacing', '0.5')).toEqual({ letterSpacing: 0.5 });
  });

  it('letter-spacing: <px length> passes through', () => {
    expect(transformDecl('letterSpacing', '2px')).toEqual({ letterSpacing: 2 });
  });

  // Font-relative units flow through the cascade resolver and pick up
  // the inherited font-size at render time, the same path em / rem / lh
  // take for other length properties.
  it('letter-spacing: em emits the raw value for the cascade resolver', () => {
    expect(transformDecl('letterSpacing', '0.05em')).toEqual({ letterSpacing: '0.05em' });
  });

  it('letter-spacing: rem emits the raw value for the cascade resolver', () => {
    expect(transformDecl('letterSpacing', '0.1rem')).toEqual({ letterSpacing: '0.1rem' });
  });

  it('letter-spacing: lh emits the raw value for the cascade resolver', () => {
    expect(transformDecl('letterSpacing', '0.1lh')).toEqual({ letterSpacing: '0.1lh' });
  });

  it('letter-spacing: normal collapses to zero', () => {
    expect(transformDecl('letterSpacing', 'normal')).toEqual({ letterSpacing: 0 });
  });

  describeOnRnWeb(() => {
    it('letter-spacing: em passes through for the browser', () => {
      expect(transformDecl('letterSpacing', '0.05em')).toEqual({ letterSpacing: '0.05em' });
    });
  });
});

// https://drafts.csswg.org/css-fonts-4/#font-size-prop (editor's draft)
//
// "Value: <absolute-size> | <relative-size> | <length-percentage [0,∞]> | math"
// "Percentages: refer to parent element’s font size"
//
// https://drafts.csswg.org/css-inline-3/#line-height-property
//
// "Value: normal | <number [0,∞]> | <length-percentage [0,∞]>"
//
// https://drafts.csswg.org/css-text-4/#letter-spacing-property
//
// "Value: normal | <length-percentage>"
//
// https://drafts.csswg.org/css-values-4/#calc-serialize (editor's draft, 10.13 Serialization)
//
// "If the root of the calculation tree fn represents is a numeric value (number,
// percentage, or dimension), and the serialization being produced is of a computed
// value or later, then clamp the value to the range allowed for its context (if
// necessary), then serialize the value as normal and return the result."
describe('math functions in font-size, line-height, and letter-spacing', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Operands that need the render environment (em, viewport units) stay as
  // authored text for the render-time resolver.
  it.each([
    ['fontSize', 'calc(1em + 2px)'],
    ['fontSize', 'clamp(14px, 2vw, 20px)'],
    ['fontSize', 'min(2em, 30px)'],
    ['fontSize', 'max(1rem, 12px)'],
    ['lineHeight', 'calc(1em + 4px)'],
    ['lineHeight', 'clamp(18px, 4vw, 28px)'],
    ['letterSpacing', 'calc(0.1em + 1px)'],
    ['letterSpacing', 'max(0.5px, 0.02em)'],
  ] as const)('%s: %s defers to the render-time resolver', (prop, value) => {
    expect(transformDecl(prop, value)).toEqual({ [prop]: value });
  });

  // A static result folds at compile time; a negative result clamps to the
  // property's range ([0,∞] for font-size and line-height).
  it.each([
    ['fontSize', 'calc(10px + 4px)', 14],
    ['fontSize', 'clamp(10px, 12px, 20px)', 12],
    ['fontSize', 'calc(2px - 10px)', 0],
    ['lineHeight', 'calc(10px + 14px)', 24],
    ['lineHeight', 'calc(2px - 10px)', 0],
    ['letterSpacing', 'calc(1px + 1px)', 2],
    ['letterSpacing', 'calc(2px - 10px)', -8],
  ] as const)('%s: %s folds at compile time to %s', (prop, value, expected) => {
    expect(transformDecl(prop, value)).toEqual({ [prop]: expected });
  });

  // A percentage in these properties refers to the font size, which the
  // math resolver cannot anchor (it resolves against the container width),
  // so the declaration drops with the shared parse warning.
  it.each([
    ['fontSize', 'calc(50% + 2px)'],
    ['lineHeight', 'calc(100% + 2px)'],
    ['letterSpacing', 'min(10%, 2px)'],
  ] as const)('%s: %s drops because a percentage cannot be resolved', (prop, value) => {
    expect(transformDecl(prop, value)).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  // The resolver cannot build an unfinished expression.
  it.each(['fontSize', 'lineHeight', 'letterSpacing'] as const)(
    '%s: a math function the resolver cannot build warns and drops',
    prop => {
      expect(transformDecl(prop, 'calc(1em + )')).toEqual({});
      expect(warnSpy).toHaveBeenCalledTimes(1);
    }
  );

  // "font: <size>[/<line-height>] <family>" takes the same <length-percentage>
  // and math forms in its size and line-height slots.
  it('font: math in the size and line-height slots defers to the render-time resolver', () => {
    expect(transformDecl('font', 'italic calc(1em + 2px)/calc(20px + 4px) serif')).toEqual({
      fontFamily: 'Times New Roman',
      fontSize: 'calc(1em + 2px)',
      fontStyle: 'italic',
      fontVariant: [],
      fontWeight: 'normal',
      lineHeight: 24,
    });
  });

  it('font: a deferred line-height slot keeps its authored text', () => {
    expect(transformDecl('font', 'clamp(14px, 2vw, 20px)/calc(1em + 4px) serif')).toEqual({
      fontFamily: 'Times New Roman',
      fontSize: 'clamp(14px, 2vw, 20px)',
      fontStyle: 'normal',
      fontVariant: [],
      fontWeight: 'normal',
      lineHeight: 'calc(1em + 4px)',
    });
  });

  // The size and line-height slots take the ranges quoted above ([0,∞] for both).
  it('font: a static math size and line-height below zero clamp to 0', () => {
    expect(transformDecl('font', 'calc(2px - 10px)/calc(1px - 5px) serif')).toEqual({
      fontFamily: 'Times New Roman',
      fontSize: 0,
      fontStyle: 'normal',
      fontVariant: [],
      fontWeight: 'normal',
      lineHeight: 0,
    });
  });

  it('font: an unbuildable math size warns and drops the declaration', () => {
    expect(transformDecl('font', 'calc(1em + ) serif')).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  describeOnRnWeb(() => {
    it('font-size: a font-relative calc passes through for the browser', () => {
      expect(transformDecl('fontSize', 'calc(1em + 2px)')).toEqual({ fontSize: 'calc(1em + 2px)' });
    });

    it('font: a font-relative calc size passes through for the browser', () => {
      expect(transformDecl('font', 'calc(1em + 2px) serif')).toMatchObject({
        fontSize: 'calc(1em + 2px)',
      });
    });
  });
});

// https://drafts.csswg.org/css-fonts-4/#generic-family-value (editor's draft, fetched 2026-05-13)
describe('CSS Fonts 4 §2.1.5 (generic font families)', () => {
  // Per the spec keyword set: serif | sans-serif | cursive | fantasy |
  // monospace | system-ui | ui-serif | ui-sans-serif | ui-monospace |
  // ui-rounded | math | emoji | fangsong. RN jest preset reports iOS,
  // so the picks below use the iOS lookup table.
  it.each([
    ['sans-serif', 'System'],
    ['system-ui', 'System'],
    ['ui-sans-serif', 'System'],
    ['serif', 'Times New Roman'],
    ['ui-serif', 'Times New Roman'],
    ['monospace', 'Menlo'],
    ['ui-monospace', 'Menlo'],
    ['ui-rounded', 'SF Pro Rounded'],
    ['cursive', 'Snell Roundhand'],
    ['fantasy', 'Papyrus'],
    ['emoji', 'Apple Color Emoji'],
    ['math', 'System'],
    ['fangsong', 'PingFang SC'],
  ])('font-family: %s resolves to iOS face %s', (keyword, face) => {
    expect(transformDecl('fontFamily', keyword)).toEqual({ fontFamily: face });
  });

  it('non-generic family passes through unchanged', () => {
    expect(transformDecl('fontFamily', 'Helvetica Neue')).toEqual({ fontFamily: 'Helvetica Neue' });
  });

  it('quoted family passes through (preserved casing)', () => {
    expect(transformDecl('fontFamily', '"Avenir Next"')).toEqual({ fontFamily: 'Avenir Next' });
  });

  // CSS Fonts 4 §2.1: comma-separated list. RN's fontFamily is a single
  // string; collapse to the first family and warn once.
  it('font-family with comma fallbacks keeps only the first family and warns', () => {
    expect(transformDecl('fontFamily', '"Avenir Next", Arial, sans-serif')).toEqual({
      fontFamily: 'Avenir Next',
    });
  });

  describeOnRnWeb(() => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('generic keyword passes through (browser resolves)', () => {
      expect(transformDecl('fontFamily', 'sans-serif')).toEqual({ fontFamily: 'sans-serif' });
    });

    it('ui-rounded passes through', () => {
      expect(transformDecl('fontFamily', 'ui-rounded')).toEqual({ fontFamily: 'ui-rounded' });
    });

    it('comma fallbacks pass through without native fallback warning', () => {
      expect(transformDecl('fontFamily', '"Avenir Next", Arial, sans-serif')).toEqual({
        fontFamily: '"Avenir Next", Arial, sans-serif',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// https://drafts.csswg.org/css-sizing-4/#aspect-ratio
describe('CSS Sizing 4 §4.1 (aspect-ratio)', () => {
  // "Value: auto || <ratio>". Both forms in any order; either alone.
  it('aspect-ratio: <number>', () => {
    expect(transformDecl('aspectRatio', '1.5')).toEqual({ aspectRatio: 1.5 });
  });

  it('aspect-ratio: <number> / <number>', () => {
    expect(transformDecl('aspectRatio', '16 / 9')).toEqual({ aspectRatio: 16 / 9 });
  });

  // "Initial: auto"; bare `auto` produces no constraint on non-replaced
  // styled views; emitted as the string so RN and rn-web both interpret
  // (rn-web honors via the browser; RN treats unknown string as no-op).
  it('aspect-ratio: auto (bare)', () => {
    expect(transformDecl('aspectRatio', 'auto')).toEqual({ aspectRatio: 'auto' });
  });

  // Two-value form: `auto <ratio>` and `<ratio> auto` (any order).
  it('aspect-ratio: auto <ratio> emits the ratio + warns about replaced-element semantics', () => {
    expect(transformDecl('aspectRatio', 'auto 2')).toEqual({ aspectRatio: 2 });
  });

  it('aspect-ratio: <ratio> auto emits the ratio (order-agnostic)', () => {
    expect(transformDecl('aspectRatio', '2 auto')).toEqual({ aspectRatio: 2 });
  });

  it('aspect-ratio: auto 16/9 emits the ratio', () => {
    expect(transformDecl('aspectRatio', 'auto 16 / 9')).toEqual({ aspectRatio: 16 / 9 });
  });

  // css-sizing-4 §4.1 (re-fetched 2026-06-10): "If the <ratio> is
  // degenerate, the property instead behaves as auto."
  it('aspect-ratio: 16 / 0 (degenerate) behaves as auto', () => {
    expect(transformDecl('aspectRatio', '16 / 0')).toEqual({ aspectRatio: 'auto' });
  });

  it('aspect-ratio: <number> garbage is rejected', () => {
    expect(transformDecl('aspectRatio', '1.5 nonsense')).toEqual({});
  });
});

// https://drafts.csswg.org/css-text-4/#text-align-property
describe('CSS Text 4 §7.1 (text-align)', () => {
  // "Initial: start." RN's platform text engine (iOS RCTTextAttributes +
  // Android TextLayoutManager) already swaps left ↔ right when the
  // inherited paragraph direction is rtl, so the compile output stays
  // direction-independent: `start` / `match-parent` → `left`, `end` →
  // `right`. Emitting a direction-aware value at compile time would
  // double-correct and land the text on the wrong edge.
  it('text-align: start compiles to textAlign: left', () => {
    expect(transformDecl('textAlign', 'start')).toEqual({ textAlign: 'left' });
  });

  it('text-align: end compiles to textAlign: right', () => {
    expect(transformDecl('textAlign', 'end')).toEqual({ textAlign: 'right' });
  });

  it('text-align: match-parent compiles to textAlign: left', () => {
    expect(transformDecl('textAlign', 'match-parent')).toEqual({ textAlign: 'left' });
  });

  it.each([['auto'], ['left'], ['right'], ['center'], ['justify']])(
    'text-align: %s passes through unchanged',
    value => {
      expect(transformDecl('textAlign', value)).toEqual({ textAlign: value });
    }
  );

  describeOnRnWeb(() => {
    it('text-align: start passes through (browser honors)', () => {
      expect(transformDecl('textAlign', 'start')).toEqual({ textAlign: 'start' });
    });

    it('text-align: end passes through (browser honors)', () => {
      expect(transformDecl('textAlign', 'end')).toEqual({ textAlign: 'end' });
    });

    it('text-align: match-parent passes through (browser honors)', () => {
      expect(transformDecl('textAlign', 'match-parent')).toEqual({ textAlign: 'match-parent' });
    });
  });
});

// https://drafts.csswg.org/css-align-3/#place-items-property
// https://drafts.csswg.org/css-align-3/#place-self-property
describe('CSS Box Alignment 3 §7.3 (place-items) and §6.3 (place-self)', () => {
  // "Value: <'align-items'> <'justify-items'>?. The first value is
  // assigned to align-items. The second value is assigned to
  // justify-items; if omitted, it is copied from the first value."
  it('place-items: single value copies to both halves', () => {
    expect(transformDecl('placeItems', 'center')).toEqual({
      alignItems: 'center',
      justifyItems: 'center',
    });
  });

  it('place-items: two values map first to align-items, second to justify-items', () => {
    expect(transformDecl('placeItems', 'center stretch')).toEqual({
      alignItems: 'center',
      justifyItems: 'stretch',
    });
  });

  // CSS Box Alignment 3 §6.2: <self-position> = center | start | end |
  // self-start | self-end | flex-start | flex-end. Yoga and rn-web's
  // Style.js Flow types both accept only the flex-prefixed forms; so
  // bare `start` / `end` / `self-start` / `self-end` normalize to the
  // flex variants per `knowledge_rnweb_alignment_enum.md`.
  it('place-items: normalizes bare `start` to `flex-start`', () => {
    expect(transformDecl('placeItems', 'start')).toEqual({
      alignItems: 'flex-start',
      justifyItems: 'flex-start',
    });
  });

  it('place-items: normalizes bare `end` to `flex-end`', () => {
    expect(transformDecl('placeItems', 'end')).toEqual({
      alignItems: 'flex-end',
      justifyItems: 'flex-end',
    });
  });

  it('place-items: normalizes `self-start` to `flex-start`', () => {
    expect(transformDecl('placeItems', 'self-start')).toEqual({
      alignItems: 'flex-start',
      justifyItems: 'flex-start',
    });
  });

  it('place-items: accepts `baseline` for align-items', () => {
    expect(transformDecl('placeItems', 'baseline')).toEqual({
      alignItems: 'baseline',
      justifyItems: 'baseline',
    });
  });

  it('place-items: accepts `normal` and `stretch`', () => {
    expect(transformDecl('placeItems', 'normal')).toEqual({
      alignItems: 'normal',
      justifyItems: 'normal',
    });
    expect(transformDecl('placeItems', 'stretch')).toEqual({
      alignItems: 'stretch',
      justifyItems: 'stretch',
    });
  });

  // "This shorthand property sets both the align-self and justify-self
  // properties in a single declaration. The first value is assigned to
  // align-self. The second value is assigned to justify-self; if
  // omitted, it is copied from the first value."
  it('place-self: single value copies to both halves', () => {
    expect(transformDecl('placeSelf', 'center')).toEqual({
      alignSelf: 'center',
      justifySelf: 'center',
    });
  });

  it('place-self: two values map first to align-self, second to justify-self', () => {
    expect(transformDecl('placeSelf', 'center stretch')).toEqual({
      alignSelf: 'center',
      justifySelf: 'stretch',
    });
  });

  // align-self / justify-self both default to `auto` per their property
  // tables; place-items doesn't accept `auto` (since align-items doesn't).
  it('place-self: accepts `auto`', () => {
    expect(transformDecl('placeSelf', 'auto')).toEqual({
      alignSelf: 'auto',
      justifySelf: 'auto',
    });
  });

  it('place-items: rejects `auto` (not valid for align-items / justify-items)', () => {
    // The shorthand parser returns null → `native-shorthand-parse` warn
    // path. `transformDecl` returns the empty bag for unparseable
    // shorthand values.
    expect(transformDecl('placeItems', 'auto')).toEqual({});
  });

  it('place-items: rejects unknown keyword', () => {
    expect(transformDecl('placeItems', 'invalid')).toEqual({});
  });
});

describe('bug fixes from CSSTN', () => {
  it('border: none emits borderStyle: none (not solid)', () => {
    const r = transformDecl('border', 'none') as any;
    expect(r.borderStyle).toBe('none');
  });

  it('transform: bare number translateX is now accepted (pass-through)', () => {
    expect(transformDecl('transform', 'translateX(10)')).toEqual({
      transform: 'translateX(10)',
    });
  });

  it('boxShadow: passes through (RN parses natively)', () => {
    expect(transformDecl('boxShadow', '0 2px 4px rgba(0,0,0,.2)')).toEqual({
      boxShadow: '0 2px 4px rgba(0,0,0,.2)',
    });
  });

  it('filter: blur+saturate passes through', () => {
    expect(transformDecl('filter', 'blur(4px) saturate(1.5)')).toEqual({
      filter: 'blur(4px) saturate(1.5)',
    });
  });

  it('backgroundImage: dual-emits gradient (RN experimental_ + standard CSS name for rn-web)', () => {
    expect(transformDecl('backgroundImage', 'linear-gradient(90deg, red, blue)')).toEqual({
      experimental_backgroundImage: 'linear-gradient(90deg, red, blue)',
      backgroundImage: 'linear-gradient(90deg, red, blue)',
    });
  });
});

// https://drafts.csswg.org/css-transforms-1/#two-dimension-transform-functions
// https://drafts.csswg.org/css-transforms-2/#three-dimension-transform-functions
describe('transform CSS string (CSS Transforms 1 / 2; pass-through)', () => {
  const identity3d = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';

  // "<matrix()> = matrix( <number>#{6} )"
  it('matrix() six-parameter 2D form passes through', () => {
    expect(transformDecl('transform', 'matrix(1, 0, 0, 1, 40, 40)')).toEqual({
      transform: 'matrix(1, 0, 0, 1, 40, 40)',
    });
  });

  // "<matrix3d()> = matrix3d( <number>#{16} )"
  it('matrix3d() sixteen-parameter form passes through', () => {
    expect(transformDecl('transform', identity3d)).toEqual({
      transform: identity3d,
    });
  });

  // Vendor function tokens in the value are host-parsed; keep the authored string.
  it('vendor-prefixed matrix() in the transform list passes through', () => {
    expect(transformDecl('transform', '-webkit-matrix(1, 0, 0, 1, 0, 0)')).toEqual({
      transform: '-webkit-matrix(1, 0, 0, 1, 0, 0)',
    });
  });

  describeOnRnWeb(() => {
    it('matrix() and matrix3d() pass through unchanged on rn-web', () => {
      expect(transformDecl('transform', 'matrix(1, 0, 0, 1, 40, 40)')).toEqual({
        transform: 'matrix(1, 0, 0, 1, 40, 40)',
      });
      expect(transformDecl('transform', identity3d)).toEqual({
        transform: identity3d,
      });
    });
  });
});

// https://drafts.csswg.org/css-align-3/#place-items-property
describe('place-items spec compliance (CSS Box Alignment 3 §7.3)', () => {
  // "<'align-items'> <'justify-items'>?
  //  This shorthand property sets both the align-items and justify-items
  //  properties in a single declaration."
  it('place-items: single value mirrors to both longhands', () => {
    expect(transformDecl('placeItems', 'center')).toEqual({
      alignItems: 'center',
      justifyItems: 'center',
    });
  });

  // "If the second value is omitted, it is copied from the first value
  //  (unless that value is a <baseline-position>, in which case it
  //  defaults to start)."
  // RN's flex-only engine treats `start` ≡ `flex-start`, so we keep the
  // mirror semantics; the baseline carve-out is moot for non-grid.
  it('place-items: two values map first to align-items, second to justify-items', () => {
    expect(transformDecl('placeItems', 'start end')).toEqual({
      alignItems: 'flex-start',
      justifyItems: 'flex-end',
    });
  });

  // "<baseline-position> = [ first | last ]? baseline"
  it('place-items: accepts `first baseline` two-token form (qualifier drops on RN)', () => {
    expect(transformDecl('placeItems', 'first baseline')).toEqual({
      alignItems: 'baseline',
      justifyItems: 'baseline',
    });
  });

  it('place-items: accepts `last baseline` two-token form (qualifier drops on RN)', () => {
    expect(transformDecl('placeItems', 'last baseline')).toEqual({
      alignItems: 'baseline',
      justifyItems: 'baseline',
    });
  });

  // "<self-position> = center | start | end | self-start | self-end |
  //  flex-start | flex-end
  //  <overflow-position> = unsafe | safe
  //  <overflow-position>? <self-position>"
  it('place-items: accepts `safe center` overflow-position prefix (prefix drops on RN)', () => {
    expect(transformDecl('placeItems', 'safe center')).toEqual({
      alignItems: 'center',
      justifyItems: 'center',
    });
  });

  it('place-items: accepts `unsafe end` overflow-position prefix (prefix drops on RN)', () => {
    expect(transformDecl('placeItems', 'unsafe end')).toEqual({
      alignItems: 'flex-end',
      justifyItems: 'flex-end',
    });
  });

  it('place-items: accepts `stretch` (single-value mirrors)', () => {
    expect(transformDecl('placeItems', 'stretch')).toEqual({
      alignItems: 'stretch',
      justifyItems: 'stretch',
    });
  });

  // "If a value is not a valid value for either align-items or
  //  justify-items, the entire declaration is invalid."
  it('place-items: rejects unknown keyword', () => {
    expect(transformDecl('placeItems', 'bananas')).toEqual({});
  });
});

// https://drafts.csswg.org/css-align-3/#place-self-property
describe('place-self spec compliance (CSS Box Alignment 3 §6.3)', () => {
  // "<'align-self'> <'justify-self'>?
  //  This shorthand property sets both the align-self and justify-self
  //  properties in a single declaration."
  it('place-self: single value mirrors to both longhands', () => {
    expect(transformDecl('placeSelf', 'center')).toEqual({
      alignSelf: 'center',
      justifySelf: 'center',
    });
  });

  // "If the second value is omitted, it is copied from the first value."
  it('place-self: two values map first to align-self, second to justify-self', () => {
    expect(transformDecl('placeSelf', 'start end')).toEqual({
      alignSelf: 'flex-start',
      justifySelf: 'flex-end',
    });
  });

  // align-self / justify-self both default to `auto` per their property
  // tables; the shorthand admits it.
  it('place-self: accepts `auto`', () => {
    expect(transformDecl('placeSelf', 'auto')).toEqual({
      alignSelf: 'auto',
      justifySelf: 'auto',
    });
  });

  // "<baseline-position> = [ first | last ]? baseline"
  it('place-self: accepts `first baseline` two-token form (qualifier drops on RN)', () => {
    expect(transformDecl('placeSelf', 'first baseline')).toEqual({
      alignSelf: 'baseline',
      justifySelf: 'baseline',
    });
  });

  it('place-self: accepts `last baseline` two-token form (qualifier drops on RN)', () => {
    expect(transformDecl('placeSelf', 'last baseline')).toEqual({
      alignSelf: 'baseline',
      justifySelf: 'baseline',
    });
  });

  // "<overflow-position>? <self-position>"
  it('place-self: accepts `safe center` overflow-position prefix (prefix drops on RN)', () => {
    expect(transformDecl('placeSelf', 'safe center')).toEqual({
      alignSelf: 'center',
      justifySelf: 'center',
    });
  });

  it('place-self: accepts `unsafe end` overflow-position prefix (prefix drops on RN)', () => {
    expect(transformDecl('placeSelf', 'unsafe end')).toEqual({
      alignSelf: 'flex-end',
      justifySelf: 'flex-end',
    });
  });

  it('place-self: accepts `stretch` (single-value mirrors)', () => {
    expect(transformDecl('placeSelf', 'stretch')).toEqual({
      alignSelf: 'stretch',
      justifySelf: 'stretch',
    });
  });

  it('place-self: rejects unknown keyword', () => {
    expect(transformDecl('placeSelf', 'bananas')).toEqual({});
  });

  // rn-web's style compiler doesn't enum-validate align values; it
  // passes any value through to the DOM. The browser implements CSS
  // Box Alignment 3 end-to-end (start/end normalize to flex-start/end
  // inside flex containers per §6.2.4; safe / unsafe overflow prefixes
  // and first/last baseline qualifiers are honored). Skip our native
  // normalization on rn-web so authors get the full spec surface.
  describeOnRnWeb(() => {
    it('place-items passes through raw so the browser parses the full grammar', () => {
      expect(transformDecl('placeItems', 'safe center')).toEqual({ placeItems: 'safe center' });
      expect(transformDecl('placeItems', 'first baseline')).toEqual({
        placeItems: 'first baseline',
      });
      expect(transformDecl('placeItems', 'start end')).toEqual({ placeItems: 'start end' });
    });

    it('place-self passes through raw so the browser parses the full grammar', () => {
      expect(transformDecl('placeSelf', 'unsafe end')).toEqual({ placeSelf: 'unsafe end' });
      expect(transformDecl('placeSelf', 'last baseline')).toEqual({
        placeSelf: 'last baseline',
      });
    });
  });
});

// https://drafts.csswg.org/css-sizing-4/#aspect-ratio
describe('aspect-ratio spec compliance (CSS Sizing 4 §4.1)', () => {
  // "Initial: auto"
  it('aspect-ratio: auto', () => {
    expect(transformDecl('aspectRatio', 'auto')).toEqual({ aspectRatio: 'auto' });
  });

  // "<ratio> = <number [0,∞]> [ / <number [0,∞]> ]?"
  it('aspect-ratio: bare ratio `16/9` resolves to numeric quotient', () => {
    expect(transformDecl('aspectRatio', '16/9')).toEqual({ aspectRatio: 16 / 9 });
  });

  // Two-value form: `auto && <ratio>` (order-agnostic). css-sizing-4 §4.1
  // (re-fetched 2026-06-10): "If both auto and a <ratio> are specified
  // together, the preferred aspect ratio is the specified ratio of
  // width / height unless it is a replaced element with a natural aspect
  // ratio". On non-replaced boxes the ratio applying IS the spec behavior,
  // so this emits silently (the replaced-element deviation is documented
  // in rn-css-compatibility.md).
  it('aspect-ratio: `auto 16/9` emits the ratio', () => {
    expect(transformDecl('aspectRatio', 'auto 16/9')).toEqual({ aspectRatio: 16 / 9 });
  });

  // Single-number ratio (CSS Values 4 ratio shorthand): one number implies
  // a `<number> / 1` ratio.
  it('aspect-ratio: single-number ratio `2`', () => {
    expect(transformDecl('aspectRatio', '2')).toEqual({ aspectRatio: 2 });
  });

  // css-sizing-4 §4.1 (re-fetched 2026-06-10): "If the <ratio> is
  // degenerate, the property instead behaves as auto." Zero components are
  // inside the grammar range `<number [0,∞]>`, so the declaration parses
  // and resolves to auto rather than being dropped.
  it('aspect-ratio: bare zero behaves as auto', () => {
    expect(transformDecl('aspectRatio', '0')).toEqual({ aspectRatio: 'auto' });
  });

  it('aspect-ratio: `0/3` (zero numerator) behaves as auto', () => {
    expect(transformDecl('aspectRatio', '0/3')).toEqual({ aspectRatio: 'auto' });
  });

  it('aspect-ratio: `3/0` (zero denominator) behaves as auto', () => {
    expect(transformDecl('aspectRatio', '3/0')).toEqual({ aspectRatio: 'auto' });
  });

  // Negative numbers are outside the `<number [0,∞]>` grammar range:
  // a syntax violation, so the declaration drops entirely.
  it('aspect-ratio: rejects negative bare ratio', () => {
    expect(transformDecl('aspectRatio', '-1')).toEqual({});
  });

  it('aspect-ratio: rejects `-1/2` (negative numerator)', () => {
    expect(transformDecl('aspectRatio', '-1/2')).toEqual({});
  });
});

// https://drafts.csswg.org/css-fonts-4/#font-style-prop
describe('font-style spec compliance (CSS Fonts 4 §2.4)', () => {
  // "Value: normal | italic | oblique <angle [-90deg,90deg]>?"
  it('font-style: normal', () => {
    expect(transformDecl('fontStyle', 'normal')).toEqual({ fontStyle: 'normal' });
  });

  it('font-style: italic', () => {
    expect(transformDecl('fontStyle', 'italic')).toEqual({ fontStyle: 'italic' });
  });

  it('font-style: oblique (no angle) maps to italic on native', () => {
    expect(transformDecl('fontStyle', 'oblique')).toEqual({ fontStyle: 'italic' });
  });

  it('font-style: oblique 14deg maps to italic on native (angle drops + warns)', () => {
    expect(transformDecl('fontStyle', 'oblique 14deg')).toEqual({ fontStyle: 'italic' });
  });

  it('font-style: oblique -45deg maps to italic on native', () => {
    expect(transformDecl('fontStyle', 'oblique -45deg')).toEqual({ fontStyle: 'italic' });
  });

  // "Values outside the range [-90deg,90deg] are not valid and must be
  //  ignored." (CSS Fonts 4 §2.4)
  it('font-style: rejects oblique 91deg (out of range)', () => {
    expect(transformDecl('fontStyle', 'oblique 91deg')).toEqual({});
  });

  it('font-style: rejects oblique -91deg (out of range)', () => {
    expect(transformDecl('fontStyle', 'oblique -91deg')).toEqual({});
  });

  // Per CSS Fonts 4 §2.4 the grammar also lists `oblique left` and
  // `oblique right` as italic-direction shorthands.
  it('font-style: oblique left maps to italic on native', () => {
    expect(transformDecl('fontStyle', 'oblique left')).toEqual({ fontStyle: 'italic' });
  });

  it('font-style: oblique right maps to italic on native', () => {
    expect(transformDecl('fontStyle', 'oblique right')).toEqual({ fontStyle: 'italic' });
  });

  // CSS keyword matching is ASCII-case-insensitive per CSS Syntax 3 §4.
  it('font-style: ASCII-case-insensitive matching (`Oblique` ≡ `oblique`)', () => {
    expect(transformDecl('fontStyle', 'Oblique')).toEqual({ fontStyle: 'italic' });
  });

  describeOnRnWeb(() => {
    it('font-style: oblique 14deg passes through (browser honors slant axis)', () => {
      expect(transformDecl('fontStyle', 'oblique 14deg')).toEqual({ fontStyle: 'oblique 14deg' });
    });

    it('font-style: oblique left passes through (browser honors italic direction)', () => {
      expect(transformDecl('fontStyle', 'oblique left')).toEqual({ fontStyle: 'oblique left' });
    });

    it('font-style: rejects oblique 91deg on rn-web too (spec range applies on every host)', () => {
      expect(transformDecl('fontStyle', 'oblique 91deg')).toEqual({});
    });
  });
});

// https://drafts.csswg.org/css-fonts-4/#generic-family-value
describe('Generic font families spec compliance (CSS Fonts 4 §3.1.1)', () => {
  // "User agents must match these names case insensitively."
  // The spec keyword set (§3.1.1): serif | sans-serif | cursive | fantasy
  //  | monospace | system-ui | ui-serif | ui-sans-serif | ui-monospace
  //  | ui-rounded | math | emoji | fangsong.
  // The native preset is iOS; the iOS lookup table is the resolved face.
  it.each([
    ['serif', 'Times New Roman'],
    ['sans-serif', 'System'],
    ['cursive', 'Snell Roundhand'],
    ['fantasy', 'Papyrus'],
    ['monospace', 'Menlo'],
    ['system-ui', 'System'],
    ['ui-serif', 'Times New Roman'],
    ['ui-sans-serif', 'System'],
    ['ui-monospace', 'Menlo'],
    ['ui-rounded', 'SF Pro Rounded'],
    ['math', 'System'],
    ['emoji', 'Apple Color Emoji'],
    ['fangsong', 'PingFang SC'],
  ])('font-family: %s resolves to %s (lowercase)', (keyword, face) => {
    expect(transformDecl('fontFamily', keyword)).toEqual({ fontFamily: face });
  });

  // ASCII-case-insensitive variants must resolve identically.
  it.each([
    ['Sans-Serif', 'System'],
    ['SANS-SERIF', 'System'],
    ['SERIF', 'Times New Roman'],
    ['Monospace', 'Menlo'],
    ['System-UI', 'System'],
    ['UI-Rounded', 'SF Pro Rounded'],
    ['FANGSONG', 'PingFang SC'],
  ])('font-family: %s resolves to %s (uppercase variant)', (keyword, face) => {
    expect(transformDecl('fontFamily', keyword)).toEqual({ fontFamily: face });
  });

  // Quotes opt the family out of generic resolution by definition. Per
  // §3.1.1: "Authors cannot quote generic family names; quoting causes
  // them to be interpreted as <family-name>s." The case of the quoted
  // string must be preserved verbatim.
  it('font-family: quoted generic-shaped string preserves case + opts out of generic lookup', () => {
    expect(transformDecl('fontFamily', '"Sans-Serif"')).toEqual({ fontFamily: 'Sans-Serif' });
  });

  it('font-family: quoted family preserves case (`"Times New Roman"`)', () => {
    expect(transformDecl('fontFamily', '"Times New Roman"')).toEqual({
      fontFamily: 'Times New Roman',
    });
  });

  // RN's `fontFamily` is a single string; comma-separated fallbacks
  // collapse to the first family with a one-time dev warn.
  it('font-family: comma fallbacks truncate to the first family + warn', () => {
    expect(transformDecl('fontFamily', '"Avenir Next", Arial, sans-serif')).toEqual({
      fontFamily: 'Avenir Next',
    });
  });
});

// https://drafts.csswg.org/css-logical-1/#border-shorthands
describe('border-inline / border-block spec compliance (CSS Logical Properties 1 §4.5 + §4.6)', () => {
  // Under RN's horizontal-tb writing mode (the only mode Yoga
  // supports), CSS Logical Properties 1 §3.2 maps:
  //   inline-start → physical left (under ltr); RN's `borderStart*` honors `direction`
  //   inline-end   → physical right
  //   block-start  → physical top
  //   block-end    → physical bottom

  beforeEach(() => {
    resetWarningsForTest();
  });

  describe('§4.5 single-edge longhand mapping (width / color)', () => {
    // §4.5: "The 'border-{inline,block}-{start,end}-{width,style,color}'
    // longhands are equivalent to the corresponding 'border-*' physical
    // longhands under the element's writing mode and direction."

    it('border-inline-start-width maps to borderStartWidth', () => {
      expect(transformDecl('borderInlineStartWidth', '2px')).toEqual({ borderStartWidth: 2 });
    });

    it('border-inline-end-width maps to borderEndWidth', () => {
      expect(transformDecl('borderInlineEndWidth', '3px')).toEqual({ borderEndWidth: 3 });
    });

    it('border-block-start-width maps to borderTopWidth', () => {
      expect(transformDecl('borderBlockStartWidth', '4px')).toEqual({ borderTopWidth: 4 });
    });

    it('border-block-end-width maps to borderBottomWidth', () => {
      expect(transformDecl('borderBlockEndWidth', '5px')).toEqual({ borderBottomWidth: 5 });
    });

    it('border-inline-start-color maps to borderStartColor', () => {
      expect(transformDecl('borderInlineStartColor', 'red')).toEqual({ borderStartColor: 'red' });
    });

    it('border-inline-end-color maps to borderEndColor', () => {
      expect(transformDecl('borderInlineEndColor', 'blue')).toEqual({ borderEndColor: 'blue' });
    });

    it('border-block-start-color maps to borderTopColor', () => {
      expect(transformDecl('borderBlockStartColor', 'green')).toEqual({ borderTopColor: 'green' });
    });

    it('border-block-end-color maps to borderBottomColor', () => {
      expect(transformDecl('borderBlockEndColor', '#000')).toEqual({ borderBottomColor: '#000' });
    });
  });

  describe('§4.5 single-edge style longhand on native (RN has no per-edge borderStyle)', () => {
    // §4.5: per-edge style longhands exist; RN 0.85 only exposes the
    // whole-element `borderStyle`. Native build drops the decl and
    // emits the per-edge-style warn so the author sees what happened.

    it('border-inline-start-style: solid is silently accepted (RN default border style)', () => {
      // `solid` matches RN's whole-element default border style, so the
      // drop is render-invisible; only non-default styles warn.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInlineStartStyle', 'solid')).toEqual({});
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-inline-end-style: dotted drops on native (whole-element borderStyle only)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInlineEndStyle', 'dotted')).toEqual({});
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-block-start-style: dashed drops on native', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderBlockStartStyle', 'dashed')).toEqual({});
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-block-end-style: none drops on native', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderBlockEndStyle', 'none')).toEqual({});
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('§4.5 composite single-edge shorthands', () => {
    // §4.5: "The 'border-{inline,block}-{start,end}' shorthand sets
    // the width, style, and color longhands for a single edge."

    it('border-inline-start: 1px solid red expands to width + color (style drops on native)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInlineStart', '1px solid red')).toEqual({
          borderStartWidth: 1,
          borderStartColor: 'red',
        });
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-inline-end: 2px dashed #abc expands to the end longhands', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInlineEnd', '2px dashed #abc')).toEqual({
          borderEndWidth: 2,
          borderEndColor: '#abc',
        });
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-block-start: 4px solid blue expands to the top longhands', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderBlockStart', '4px solid blue')).toEqual({
          borderTopWidth: 4,
          borderTopColor: 'blue',
        });
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-block-end: 5px dotted green expands to the bottom longhands', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderBlockEnd', '5px dotted green')).toEqual({
          borderBottomWidth: 5,
          borderBottomColor: 'green',
        });
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('§4.6 axis shorthands (one-value form applies to both edges)', () => {
    // §4.6: "If two values are present, the first applies to the
    // start edge and the second to the end edge; if one is present,
    // it applies to both."

    it('border-inline-width: 1px applies to BOTH start + end edges', () => {
      expect(transformDecl('borderInlineWidth', '1px')).toEqual({
        borderStartWidth: 1,
        borderEndWidth: 1,
      });
    });

    it('border-inline-width: 1px 2px applies first to start, second to end', () => {
      expect(transformDecl('borderInlineWidth', '1px 2px')).toEqual({
        borderStartWidth: 1,
        borderEndWidth: 2,
      });
    });

    it('border-block-width: 3px applies to BOTH top + bottom edges', () => {
      expect(transformDecl('borderBlockWidth', '3px')).toEqual({
        borderTopWidth: 3,
        borderBottomWidth: 3,
      });
    });

    it('border-block-width: 3px 4px applies first to top, second to bottom', () => {
      expect(transformDecl('borderBlockWidth', '3px 4px')).toEqual({
        borderTopWidth: 3,
        borderBottomWidth: 4,
      });
    });

    it('border-inline-color: red applies to BOTH start + end colors', () => {
      expect(transformDecl('borderInlineColor', 'red')).toEqual({
        borderStartColor: 'red',
        borderEndColor: 'red',
      });
    });

    it('border-inline-color: red blue applies first to start, second to end', () => {
      expect(transformDecl('borderInlineColor', 'red blue')).toEqual({
        borderStartColor: 'red',
        borderEndColor: 'blue',
      });
    });

    it('border-block-color: red applies to BOTH top + bottom colors', () => {
      expect(transformDecl('borderBlockColor', 'red')).toEqual({
        borderTopColor: 'red',
        borderBottomColor: 'red',
      });
    });

    it('border-block-color: red blue applies first to top, second to bottom', () => {
      expect(transformDecl('borderBlockColor', 'red blue')).toEqual({
        borderTopColor: 'red',
        borderBottomColor: 'blue',
      });
    });

    it('border-inline-style: solid is silently accepted (RN default border style)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInlineStyle', 'solid')).toEqual({});
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    // §4.6 two-value style: only `'solid'` works on RN 0.85 since
    // `borderStyle` is whole-element. Emit a warn for two-value
    // mixed-style input (`dashed solid`) and drop.
    it('border-inline-style: dashed solid drops on native + emits the per-edge-style warn', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInlineStyle', 'dashed solid')).toEqual({});
        const messages = warnSpy.mock.calls.map(c => String(c[0]));
        expect(messages.some(m => m.includes('Per-edge `border-inline-style: dashed solid`'))).toBe(
          true
        );
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-block-style: dotted drops on native + emits the per-edge-style warn', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderBlockStyle', 'dotted')).toEqual({});
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('§4.6 mode-spanning shorthands (apply to BOTH edges of the axis)', () => {
    // §4.6: "The 'border-{inline,block}' shorthand sets all four
    // (width, style, color) longhands on BOTH edges of the
    // corresponding axis."

    it('border-inline: 1px solid red expands to BOTH start + end longhands', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderInline', '1px solid red')).toEqual({
          borderStartWidth: 1,
          borderEndWidth: 1,
          borderStartColor: 'red',
          borderEndColor: 'red',
        });
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-block: 2px dashed blue expands to BOTH top + bottom longhands', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        expect(transformDecl('borderBlock', '2px dashed blue')).toEqual({
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderTopColor: 'blue',
          borderBottomColor: 'blue',
        });
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('border-inline: red (color-only) sets BOTH start + end colors', () => {
      expect(transformDecl('borderInline', 'red')).toEqual({
        borderStartColor: 'red',
        borderEndColor: 'red',
      });
    });

    it('border-block: 4px (width-only) sets BOTH top + bottom widths', () => {
      expect(transformDecl('borderBlock', '4px')).toEqual({
        borderTopWidth: 4,
        borderBottomWidth: 4,
      });
    });
  });

  describe('on rn-web: logical properties pass through to the browser', () => {
    // §4.5 + §4.6: rn-web routes logical names to the browser, which
    // already implements them natively. The polyfill emits the
    // per-edge-style longhand in camelCase form so rn-web's atomic-CSS
    // pipeline hyphenates it and the browser parses it.
    const g = global as { __NATIVE_WEB__?: boolean };
    const originalNativeWeb = g.__NATIVE_WEB__;
    beforeAll(() => {
      g.__NATIVE_WEB__ = true;
    });
    afterAll(() => {
      g.__NATIVE_WEB__ = originalNativeWeb;
    });

    it('border-inline-start-style: solid emits a camelCase per-edge style on rn-web', () => {
      expect(transformDecl('borderInlineStartStyle', 'solid')).toEqual({
        borderInlineStartStyle: 'solid',
      });
    });

    it('border-inline-end-style: dashed emits a camelCase per-edge style on rn-web', () => {
      expect(transformDecl('borderInlineEndStyle', 'dashed')).toEqual({
        borderInlineEndStyle: 'dashed',
      });
    });

    it('border-block-start-style: dotted emits a camelCase per-edge style on rn-web', () => {
      expect(transformDecl('borderBlockStartStyle', 'dotted')).toEqual({
        borderBlockStartStyle: 'dotted',
      });
    });

    it('border-inline-style: dashed solid honors two-value per-edge style on rn-web', () => {
      expect(transformDecl('borderInlineStyle', 'dashed solid')).toEqual({
        borderInlineStartStyle: 'dashed',
        borderInlineEndStyle: 'solid',
      });
    });

    it('border-inline: 1px solid red includes the per-edge style on rn-web', () => {
      expect(transformDecl('borderInline', '1px solid red')).toEqual({
        borderStartWidth: 1,
        borderEndWidth: 1,
        borderStartColor: 'red',
        borderEndColor: 'red',
        borderInlineStartStyle: 'solid',
        borderInlineEndStyle: 'solid',
      });
    });
  });
});

// CSS Text 4 §7.1: text-align: justify-all degrades to justify on native + warn;
// CSS Text 4 §7.3: text-align-all routes through the same handler.
// https://drafts.csswg.org/css-text-4/#text-align-property
describe('text-align spec compliance (CSS Text 4 §7.1 + §7.3)', () => {
  beforeEach(() => {
    resetWarningsForTest();
  });

  // §7.1: "justify-all: Same as justify, but enforces justification on
  // the last line too." RN has no last-line surface; degrade to
  // `justify` and warn.
  it('text-align: justify-all degrades to justify on native + emits the degrade warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(transformDecl('textAlign', 'justify-all')).toEqual({ textAlign: 'justify' });
      const messages = warnSpy.mock.calls.map(c => String(c[0]));
      expect(
        messages.some(m => m.includes('text-align: justify-all') && m.includes('final line'))
      ).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  // §7.3: "The text-align-all CSS property sets the inline alignment
  // of all lines of text in the box, except for the last line of each
  // paragraph (which uses text-align-last)." Maps through the
  // text-align handler; same keyword grammar.
  it('text-align-all: start compiles to textAlign: left', () => {
    expect(transformDecl('textAlignAll', 'start')).toEqual({ textAlign: 'left' });
  });

  it('text-align-all: center passes through directly', () => {
    expect(transformDecl('textAlignAll', 'center')).toEqual({ textAlign: 'center' });
  });

  it('text-align-all: justify-all degrades to justify (shares the text-align handler)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(transformDecl('textAlignAll', 'justify-all')).toEqual({ textAlign: 'justify' });
    } finally {
      warnSpy.mockRestore();
    }
  });
});

// CSS Text 4 §5.4: text-wrap: nowrap means "no line breaking" (the
// line overflows horizontally). RN cannot truly overflow horizontally;
// the polyfill applies the closest approximation silently
// (numberOfLines:1 + ellipsizeMode:'clip'), so the user-observed
// behavior matches the spec intent without dev noise.
// https://drafts.csswg.org/css-text-4/#text-wrap-mode
describe('text-wrap nowrap spec compliance (CSS Text 4 §5.4)', () => {
  beforeEach(() => {
    resetWarningsForTest();
  });

  // §5.4: "nowrap: No line breaking opportunities are honored. Text
  // that would overflow the available space is rendered overflowing."
  it('text-wrap: nowrap emits numberOfLines:1 + ellipsizeMode:clip silently', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(transformDecl('textWrap', 'nowrap')).toEqual({
        textWrap: 'nowrap',
        numberOfLines: 1,
        ellipsizeMode: 'clip',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('text-wrap-mode: nowrap emits numberOfLines:1 + ellipsizeMode:clip silently', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(transformDecl('textWrapMode', 'nowrap')).toEqual({
        textWrapMode: 'nowrap',
        numberOfLines: 1,
        ellipsizeMode: 'clip',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  // §5.4 wrap is the default; no last-resort clip mapping needed.
  it('text-wrap: wrap does NOT clip (default wrapping)', () => {
    expect(transformDecl('textWrap', 'wrap')).toEqual({ textWrap: 'wrap' });
  });
});

// CSS Transforms 2 §9: perspective-origin: sets the vanishing point
// for perspective-transformed descendants. RN 0.85 has no surface;
// drops with a one-time warn. rn-web honors the property natively.
// https://drafts.csswg.org/css-transforms-2/#perspective-origin-property
describe('perspective-origin spec compliance (CSS Transforms 2 §9)', () => {
  beforeEach(() => {
    resetWarningsForTest();
  });

  // §9: "The perspective-origin CSS property determines the position
  // at which the viewer is looking. It is used as the vanishing point
  // by the perspective property."
  it('perspective-origin: center drops on native + emits the unsupported warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(transformDecl('perspectiveOrigin', 'center')).toEqual({});
      const messages = warnSpy.mock.calls.map(c => String(c[0]));
      expect(messages.some(m => m.includes('perspective-origin') && m.includes('ignored'))).toBe(
        true
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('perspective-origin: 25% 75% drops on native (no surface)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(transformDecl('perspectiveOrigin', '25% 75%')).toEqual({});
    } finally {
      warnSpy.mockRestore();
    }
  });

  describe('on rn-web: passes through to the browser', () => {
    const g = global as { __NATIVE_WEB__?: boolean };
    const originalNativeWeb = g.__NATIVE_WEB__;
    beforeAll(() => {
      g.__NATIVE_WEB__ = true;
    });
    afterAll(() => {
      g.__NATIVE_WEB__ = originalNativeWeb;
    });

    it('perspective-origin: center passes through on rn-web', () => {
      expect(transformDecl('perspectiveOrigin', 'center')).toEqual({
        perspectiveOrigin: 'center',
      });
    });

    it('perspective-origin: 25% 75% passes through on rn-web', () => {
      expect(transformDecl('perspectiveOrigin', '25% 75%')).toEqual({
        perspectiveOrigin: '25% 75%',
      });
    });
  });
});

describe('transformDecl: warnings that name a fix', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('border-radius with elliptical radii tells the author to use one radius per corner', () => {
    expect(transformDecl('borderRadius', '10px / 20px')).toEqual({});
    expect(warnSpy.mock.calls).toEqual([
      [
        '[sc] `border-radius: 10px / 20px` is ignored on React Native because iOS and Android cannot draw separate horizontal and vertical corner radii. Use one radius per corner, such as `border-radius: 10px`.',
      ],
    ]);
  });

  it('text-decoration: underline wavy tells the author which styles render', () => {
    expect(transformDecl('textDecoration', 'underline wavy')).toEqual({
      textDecorationLine: 'underline',
      textDecorationStyle: 'solid',
    });
    expect(warnSpy.mock.calls).toEqual([
      [
        '[sc] `text-decoration-style: wavy` is ignored on React Native because iOS and Android cannot draw wavy underlines. Falling back to solid. Use `solid`, `double`, `dotted`, or `dashed` for a style that renders.',
      ],
    ]);
  });
});
