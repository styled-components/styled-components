import { resetWarningsForTest } from '../../dev';
import { transformDecl } from '../../index';
import { tokenize } from '../../tokenize';
import { TokenKind } from '../../tokens';
import { staticColorFunctionToHex } from '../colorMath';
import { parseLinearEasing } from '../linearEasing';

describe('logical properties spec compliance (CSS Logical Properties Level 1 §4)', () => {
  // Spec source: https://drafts.csswg.org/css-logical-1/
  // Polyfill scope on RN: shorthand expansion for margin-inline /
  // margin-block / padding-inline / padding-block / inset-inline /
  // inset-block (1-2 values), the four-value inset shorthand, and
  // longhand passthrough. RN's Yoga (0.71+) supports the *Block* /
  // *Inline* longhands directly, so they pass through unchanged.

  describe('§4.2 margin-block / margin-inline shorthands', () => {
    // Spec: `margin-block, margin-inline = <margin-top>{1,2}` ;
    // "The first value represents the start edge style, and the second
    // value represents the end edge style. If only one value is given,
    // it applies to both the start and end edges."

    it('margin-inline single value applies to both edges', () => {
      expect(transformDecl('margin-inline', '10px')).toEqual({
        marginStart: 10,
        marginEnd: 10,
      });
    });

    it('margin-inline two values: start, end', () => {
      expect(transformDecl('margin-inline', '10px 20px')).toEqual({
        marginStart: 10,
        marginEnd: 20,
      });
    });

    it('margin-block single value applies to both edges', () => {
      expect(transformDecl('margin-block', '8px')).toEqual({
        marginTop: 8,
        marginBottom: 8,
      });
    });

    it('margin-block two values: start, end', () => {
      expect(transformDecl('margin-block', '8px 12px')).toEqual({
        marginTop: 8,
        marginBottom: 12,
      });
    });
  });

  describe('§4.4 padding-block / padding-inline shorthands', () => {
    it('padding-inline single value', () => {
      expect(transformDecl('padding-inline', '5%')).toEqual({
        paddingStart: '5%',
        paddingEnd: '5%',
      });
    });

    it('padding-inline two values', () => {
      expect(transformDecl('padding-inline', '5% 10%')).toEqual({
        paddingStart: '5%',
        paddingEnd: '10%',
      });
    });

    it('padding-block single value', () => {
      expect(transformDecl('padding-block', '4px')).toEqual({
        paddingTop: 4,
        paddingBottom: 4,
      });
    });

    it('padding-block two values', () => {
      expect(transformDecl('padding-block', '4px 8px')).toEqual({
        paddingTop: 4,
        paddingBottom: 8,
      });
    });
  });

  describe('§4.3 inset-block / inset-inline shorthands', () => {
    it('inset-inline single value', () => {
      expect(transformDecl('inset-inline', '0')).toEqual({
        insetInlineStart: 0,
        insetInlineEnd: 0,
      });
    });

    it('inset-inline two values: start, end', () => {
      expect(transformDecl('inset-inline', '0 auto')).toEqual({
        insetInlineStart: 0,
        insetInlineEnd: 'auto',
      });
    });

    it('inset-block single value', () => {
      expect(transformDecl('inset-block', '10px')).toEqual({
        insetBlockStart: 10,
        insetBlockEnd: 10,
      });
    });

    it('inset-block two values', () => {
      expect(transformDecl('inset-block', '10px 20px')).toEqual({
        insetBlockStart: 10,
        insetBlockEnd: 20,
      });
    });
  });

  describe('§4.3 inset four-value shorthand', () => {
    // Spec: `inset = <top>{1,4}`;same expansion rules as the
    // physical `margin` / `padding` shorthands:
    //   1: all four sides
    //   2: block (top/bottom), inline (left/right)
    //   3: top, inline, bottom
    //   4: top, right, bottom, left (clockwise)
    it('1 value: applies to all four sides', () => {
      expect(transformDecl('inset', '10px')).toEqual({
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      });
    });

    it('2 values: block / inline', () => {
      expect(transformDecl('inset', '10px 20px')).toEqual({
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
      });
    });

    it('3 values: top, inline, bottom', () => {
      expect(transformDecl('inset', '10px 20px 30px')).toEqual({
        top: 10,
        right: 20,
        bottom: 30,
        left: 20,
      });
    });

    it('4 values: top, right, bottom, left (clockwise)', () => {
      expect(transformDecl('inset', '10px 20px 30px 40px')).toEqual({
        top: 10,
        right: 20,
        bottom: 30,
        left: 40,
      });
    });

    it('accepts auto in any slot', () => {
      expect(transformDecl('inset', 'auto 0')).toEqual({
        top: 'auto',
        right: 0,
        bottom: 'auto',
        left: 0,
      });
    });
  });

  describe('§4.2-§4.4 logical longhand passthrough', () => {
    // RN's Yoga (0.71+) accepts the logical longhand names directly;
    // the polyfill passes them through unchanged.
    it('margin-block-start / -end pass through', () => {
      expect(transformDecl('margin-block-start', '5px')).toEqual({ marginBlockStart: 5 });
      expect(transformDecl('margin-block-end', '5px')).toEqual({ marginBlockEnd: 5 });
    });

    it('margin-inline-start / -end pass through', () => {
      expect(transformDecl('margin-inline-start', '5px')).toEqual({ marginInlineStart: 5 });
      expect(transformDecl('margin-inline-end', '5px')).toEqual({ marginInlineEnd: 5 });
    });

    it('padding-block-start / -end pass through', () => {
      expect(transformDecl('padding-block-start', '5px')).toEqual({ paddingBlockStart: 5 });
      expect(transformDecl('padding-block-end', '5px')).toEqual({ paddingBlockEnd: 5 });
    });

    it('padding-inline-start / -end pass through', () => {
      expect(transformDecl('padding-inline-start', '5px')).toEqual({ paddingInlineStart: 5 });
      expect(transformDecl('padding-inline-end', '5px')).toEqual({ paddingInlineEnd: 5 });
    });

    it('inset-block-start / -end pass through', () => {
      expect(transformDecl('inset-block-start', '0')).toEqual({ insetBlockStart: 0 });
      expect(transformDecl('inset-block-end', '0')).toEqual({ insetBlockEnd: 0 });
    });

    it('inset-inline-start / -end pass through', () => {
      expect(transformDecl('inset-inline-start', '0')).toEqual({ insetInlineStart: 0 });
      expect(transformDecl('inset-inline-end', '0')).toEqual({ insetInlineEnd: 0 });
    });
  });
});

describe('static math functions', () => {
  it('clamp with all static px arms', () => {
    expect(transformDecl('width', 'clamp(100px, 150px, 200px)')).toEqual({
      width: 150,
    });
    expect(transformDecl('width', 'clamp(100px, 300px, 200px)')).toEqual({
      width: 200, // clamped to max
    });
  });

  it('min / max with px arms', () => {
    expect(transformDecl('width', 'min(100px, 200px)')).toEqual({ width: 100 });
    expect(transformDecl('width', 'max(100px, 200px)')).toEqual({ width: 200 });
  });

  it('calc with addition / subtraction', () => {
    expect(transformDecl('width', 'calc(100px + 20px)')).toEqual({ width: 120 });
    expect(transformDecl('width', 'calc(100px - 20px)')).toEqual({ width: 80 });
  });

  it('calc with multiplication / division', () => {
    expect(transformDecl('width', 'calc(10px * 4)')).toEqual({ width: 40 });
    expect(transformDecl('width', 'calc(100px / 4)')).toEqual({ width: 25 });
  });

  it('calc with operator precedence', () => {
    expect(transformDecl('width', 'calc(10px + 4px * 2)')).toEqual({ width: 18 });
  });

  it('clamp with all percent arms', () => {
    expect(transformDecl('width', 'clamp(20%, 50%, 80%)')).toEqual({ width: '50%' });
  });

  it('min / max with mixed percent + number fallback', () => {
    expect(transformDecl('opacity', 'min(0.5, 0.75)')).toEqual({ opacity: 0.5 });
  });

  it('defers when any arm is a viewport unit', () => {
    // vw is runtime-polyfillable, not static;transformDecl should
    // NOT return a resolved number. Falls through to string
    // coercion (render-time polyfill runner in task #5 will
    // finish the job).
    const out = transformDecl('width', 'clamp(100px, 50vw, 300px)');
    expect(typeof out.width).toBe('string');
    expect(out.width).toContain('clamp(');
  });
});

describe('static color math', () => {
  it('oklch → hex', () => {
    // red ≈ oklch(0.628 0.2577 29.23)
    const tok = tokenize('oklch(0.628 0.2577 29.23)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // Should be close to pure red
    expect(hex!.slice(1, 3)).toMatch(/^f[0-9a-f]$/);
  });

  it('oklch with alpha', () => {
    const tok = tokenize('oklch(0.5 0.2 200 / 0.5)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{8}$/);
  });

  it('color-mix: 50/50 in srgb of red + blue (display-space mix per CSS Color 5)', () => {
    const tok = tokenize('color-mix(in srgb, #ff0000 50%, #0000ff 50%)')[0];
    const hex = staticColorFunctionToHex(tok);
    // `in srgb` mixes in display-space sRGB coordinates directly.
    expect(hex).toBe('#800080');
  });

  it('color-mix: implicit 50/50', () => {
    const tok = tokenize('color-mix(in srgb, #ff0000, #0000ff)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toBe('#800080');
  });

  it('color-mix: 25/75', () => {
    const tok = tokenize('color-mix(in srgb, #ff0000 25%, #0000ff 75%)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('color-mix: in oklch perceptual mix produces valid hex', () => {
    const tok = tokenize('color-mix(in oklch, red, blue)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // Perceptual mix differs from naive sRGB midpoint #800080
    expect(hex).not.toBe('#800080');
  });

  it('color-mix: percentages summing < 100 scale the alpha (Color L5 §3.1)', () => {
    const tok = tokenize('color-mix(in oklch, red 30%, blue 20%)')[0];
    const hex = staticColorFunctionToHex(tok);
    // 30 + 20 = 50, so alpha = 0.5 → 8-digit hex with `80` alpha byte
    expect(hex).toMatch(/^#[0-9a-f]{6}80$/);
  });

  it('lab(50% 0 0) is mid-gray (L=50 in CIE Lab, not L=0.5)', () => {
    // Per CSS Color L4, lab() L percent maps to 0..100 (not 0..1 like oklab).
    // L=50, a=0, b=0 → neutral mid-gray ≈ #777777.
    const tok = tokenize('lab(50% 0 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const r = parseInt(hex!.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x60);
    expect(r).toBeLessThan(0xa0);
  });

  it('lab(50 0 0) (number form) matches lab(50% 0 0) (percent form)', () => {
    const numTok = tokenize('lab(50 0 0)')[0];
    const pctTok = tokenize('lab(50% 0 0)')[0];
    expect(staticColorFunctionToHex(numTok)).toBe(staticColorFunctionToHex(pctTok));
  });

  it('lch(50% 0 0) is mid-gray (L=50 in CIE Lch)', () => {
    const tok = tokenize('lch(50% 0 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    const r = parseInt(hex!.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x60);
    expect(r).toBeLessThan(0xa0);
  });

  it('oklab(50% 0 0) keeps L=0.5 mapping (oklab L is 0..1)', () => {
    const tok = tokenize('oklab(50% 0 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    const r = parseInt(hex!.slice(1, 3), 16);
    // oklab L=0.5 → mid-gray-ish on the perceptual ramp
    expect(r).toBeGreaterThan(0x50);
    expect(r).toBeLessThan(0xa0);
  });

  it('lab(50% 100% 0) scales a-axis percent to ±125 per CSS Color L4', () => {
    // a=100% means fully red on the a-axis (positive a = red direction).
    // Per spec, 100% maps to a=125 (lab a/b range is ±125).
    const tok = tokenize('lab(50% 100% 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // Should be reddish;r channel dominant.
    const r = parseInt(hex!.slice(1, 3), 16);
    const g = parseInt(hex!.slice(3, 5), 16);
    const b = parseInt(hex!.slice(5, 7), 16);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('transformDecl wires color-math into backgroundColor', () => {
    const out = transformDecl('backgroundColor', 'color-mix(in srgb, red, blue)');
    // red + blue 50/50 in sRGB display space = #800080
    expect(out.backgroundColor).toBe('#800080');
  });

  it('defers when color-mix has a var() operand', () => {
    const out = transformDecl('color', 'color-mix(in srgb, var(--a), blue)');
    // Non-resolvable;passes through as string
    expect(typeof out.color).toBe('string');
    expect(out.color).toContain('var');
  });

  describe('rn-web bundle path (__NATIVE_WEB__ true)', () => {
    // rn-web's `normalizeColor` (via `@react-native/normalize-colors`)
    // only recognises hex / rgb / hsl / hwb. Modern color functions get
    // stripped to `undefined` (transparent) before the browser sees
    // them, so the static color fold runs on rn-web too. Out-of-gamut
    // values clip per channel rather than render wide-gamut natively;
    // re-enable function-form passthrough when rn-web learns the
    // modern color grammar.
    beforeAll(() => {
      (global as { __NATIVE_WEB__?: boolean }).__NATIVE_WEB__ = true;
    });
    afterAll(() => {
      (global as { __NATIVE_WEB__?: boolean }).__NATIVE_WEB__ = false;
    });

    it('folds color-mix to hex so rn-web renders something instead of transparent', () => {
      const out = transformDecl('backgroundColor', 'color-mix(in srgb, red, blue)');
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/i);
    });

    it('folds oklch / oklab / lch / lab to hex', () => {
      expect(transformDecl('color', 'oklch(0.7 0.15 200)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(transformDecl('color', 'oklab(0.5 0 0)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(transformDecl('color', 'lch(50% 30 200)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(transformDecl('color', 'lab(50% 20 -10)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
    });

    it('wraps light-dark in a CSS custom property so the browser handles theme reactivity', () => {
      // rn-web's normalizeColor strips light-dark() to undefined; routing
      // through `var(--sc-ld-<prop>)` bypasses normalization (`var()` is
      // in isWebColor's allow-list) and lets the browser do the work.
      // The var name is pre-hyphenated because rn-web's class-block
      // emission runs property names through `hyphenateStyleName`; the
      // var declaration would otherwise land as `--sc-ld-background-color`
      // while its reference stayed camelCase, dangling silently.
      // The `colorScheme: 'light dark'` opt-in is emitted alongside so
      // the browser actually resolves to the second arg under dark
      // preference (default is `normal`, which always picks the first).
      expect(transformDecl('background-color', 'light-dark(#fafafa, #1a1a1a)')).toEqual({
        backgroundColor: 'var(--sc-ld-background-color)',
        '--sc-ld-background-color': 'light-dark(#fafafa, #1a1a1a)',
        colorScheme: 'light dark',
      });
    });

    it('wraps light-dark on color prop too (covers Text)', () => {
      expect(transformDecl('color', 'light-dark(#0e0e10, #f5f3ee)')).toEqual({
        color: 'var(--sc-ld-color)',
        '--sc-ld-color': 'light-dark(#0e0e10, #f5f3ee)',
        colorScheme: 'light dark',
      });
    });

    it('hyphenates multi-word property names in the var-indirection key', () => {
      // borderColor (or any camelCase prop) would otherwise emit a
      // case-sensitive mismatch between the var() reference and the
      // declaration once rn-web's hyphenateStyleName runs.
      expect(transformDecl('border-color', 'light-dark(#000, #fff)')).toEqual({
        borderColor: 'var(--sc-ld-border-color)',
        '--sc-ld-border-color': 'light-dark(#000, #fff)',
        colorScheme: 'light dark',
      });
    });
  });
});

describe('rgb / hsl / hwb spec compliance (CSS Color Module Level 4 §6-§7)', () => {
  // §6.1 (rgb), §7.1 (hsl), §7.2 (hwb) all permit both modern
  // (`fn(a b c / d)`) and legacy comma-separated (`fn(a, b, c, d)`)
  // forms. §4.4 defines the `none` channel keyword which the used value
  // resolves to 0 for static computations. Block comments inside any
  // function argument are valid CSS (per syntax §4) and WPT exercises
  // them; the tokenizer strips them before parsing.
  //
  // `transformDecl` doesn't fold rgb / hsl / hwb to hex — RN's
  // normalizeColor handles those natively at runtime. The static fold
  // path exists for color-mix operand parsing (its operands roundtrip
  // through these readers) and for the WPT parity test. Tests call
  // `staticColorFunctionToHex` directly to exercise the new behavior;
  // a color-mix integration check covers the call-site that actually
  // exercises it in production.

  function fold(value: string): string | null {
    const toks = tokenize(value);
    if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) return null;
    return staticColorFunctionToHex(toks[0]);
  }

  describe('§6.1 rgb() legacy 4-arg comma form', () => {
    it('rgba(R, G, B, A) accepts comma-separated alpha', () => {
      expect(fold('rgba(255, 0, 0, 0.5)')).toBe('#ff000080');
    });

    it('rgb(R, G, B, A) accepts comma-separated alpha (modern alias)', () => {
      expect(fold('rgb(255, 0, 0, 0.5)')).toBe('#ff000080');
    });
  });

  describe('§7.1 hsl() / §7.2 hwb() legacy 4-arg comma form', () => {
    it('hsla(H, S, L, A) accepts comma-separated alpha', () => {
      expect(fold('hsla(120, 100%, 50%, 0.5)')).toBe('#00ff0080');
    });

    it('hsl(H, S, L, A) accepts comma-separated alpha (modern alias)', () => {
      expect(fold('hsl(120, 100%, 50%, 0.5)')).toBe('#00ff0080');
    });
  });

  describe('§4.4 `none` channel keyword (used value 0 for static fold)', () => {
    it('rgb(none none none) → black opaque', () => {
      expect(fold('rgb(none none none)')).toBe('#000000');
    });

    it('rgb(none none none / none) → black, alpha 0', () => {
      expect(fold('rgb(none none none / none)')).toBe('#00000000');
    });

    it('hsl(none none none) → black opaque', () => {
      expect(fold('hsl(none none none)')).toBe('#000000');
    });

    it('hwb(none none none) → fully saturated red (hue 0, w=0, b=0)', () => {
      expect(fold('hwb(none none none)')).toBe('#ff0000');
    });
  });

  describe('inline /* */ comments inside function args (CSS Syntax §4)', () => {
    it('rgb(/* R */0, /* G */51, /* B */255) parses comment-stripped', () => {
      expect(fold('rgb(/* R */0, /* G */51, /* B */255)')).toBe('#0033ff');
    });

    it('comments inside oklch() / lch() / lab() pass through too', () => {
      expect(fold('oklch(/* L */ 0.7 0.15 200)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('integration: color-mix folds legacy + none operands', () => {
    // The static color fold runs on the legacy / `none` forms via
    // color-mix operand parsing; that path is reachable through
    // `transformDecl` because color-mix is in `mightBeModernColor`.
    it('color-mix accepts legacy 4-arg rgba operand', () => {
      const out = transformDecl(
        'backgroundColor',
        'color-mix(in srgb, rgba(255, 0, 0, 0.5), blue)'
      );
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix accepts hsla legacy 4-arg operand', () => {
      const out = transformDecl(
        'backgroundColor',
        'color-mix(in srgb, hsla(120, 100%, 50%, 0.5), white)'
      );
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix accepts `none` channel operand (carry-forward)', () => {
      const out = transformDecl('backgroundColor', 'color-mix(in srgb, rgb(255 none none), blue)');
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });
  });
});

describe('color() spec compliance (CSS Color Module Level 4 §10)', () => {
  // Spec: https://drafts.csswg.org/css-color/#color-function
  // Grammar: color() = color( <colorspace> <number-or-percentage>{3}
  //   [ / <alpha-value> ]? )
  // §10.3 predefined colorspaces: srgb, srgb-linear, display-p3,
  //   a98-rgb, prophoto-rgb, rec2020, xyz, xyz-d50, xyz-d65
  // The fold returns sRGB hex; non-sRGB inputs go through the same
  // OKLCh bisection mapper that {@link labToRgb} uses for out-of-gamut
  // values.

  function fold(value: string): string | null {
    const toks = tokenize(value);
    if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) return null;
    return staticColorFunctionToHex(toks[0]);
  }

  describe('§10 percent ↔ number equivalence', () => {
    // §10: each channel is `<number> | <percentage>`; 100% maps to 1.0
    // for RGB spaces, and to 1.0 for XYZ spaces relative to D50 / D65
    // reference white. Same input expressed two ways MUST round to the
    // same byte.
    it('color(srgb 100% 50% 20%) ≡ color(srgb 1 0.5 0.2)', () => {
      expect(fold('color(srgb 100% 50% 20%)')).toBe(fold('color(srgb 1 0.5 0.2)'));
    });

    it('color(display-p3 100% 50% 20%) ≡ color(display-p3 1 0.5 0.2)', () => {
      expect(fold('color(display-p3 100% 50% 20%)')).toBe(fold('color(display-p3 1 0.5 0.2)'));
    });

    it('color(xyz 50% 50% 50%) ≡ color(xyz 0.5 0.5 0.5)', () => {
      expect(fold('color(xyz 50% 50% 50%)')).toBe(fold('color(xyz 0.5 0.5 0.5)'));
    });
  });

  describe('§4.4 `none` channel keyword', () => {
    it('color(srgb none none none) → black opaque', () => {
      expect(fold('color(srgb none none none)')).toBe('#000000');
    });

    it('color(srgb none none none / none) → black, alpha 0', () => {
      expect(fold('color(srgb none none none / none)')).toBe('#00000000');
    });

    it('color(display-p3 1 none none) treats missing channel as 0', () => {
      // display-p3 1 0 0 → bright P3 red → gamut-maps to sRGB
      expect(fold('color(display-p3 1 none none)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§10 alpha argument', () => {
    it('alpha defaults to 1 when omitted', () => {
      expect(fold('color(srgb 1 0 0)')).toBe('#ff0000');
    });

    it('alpha accepts numbers (0..1)', () => {
      expect(fold('color(srgb 1 0 0 / 0.5)')).toBe('#ff000080');
    });

    it('alpha accepts percentages (0..100)', () => {
      expect(fold('color(srgb 1 0 0 / 50%)')).toBe('#ff000080');
    });
  });

  describe('§10.3 predefined RGB colorspaces produce sensible hex', () => {
    it('srgb 1 0 0 → red', () => {
      expect(fold('color(srgb 1 0 0)')).toBe('#ff0000');
    });

    it('srgb-linear 1 0 0 gamma-encodes to display sRGB red', () => {
      expect(fold('color(srgb-linear 1 0 0)')).toBe('#ff0000');
    });

    it('srgb-linear 0.5 0.5 0.5 gamma-encodes to mid-gray (~#bcbcbc)', () => {
      // Linear 0.5 → display sRGB ≈ 0.7354 → ~188
      const hex = fold('color(srgb-linear 0.5 0.5 0.5)');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      // All channels equal
      expect(hex!.slice(1, 3)).toBe(hex!.slice(3, 5));
      expect(hex!.slice(3, 5)).toBe(hex!.slice(5, 7));
    });

    it('display-p3 1 0 0 (out-of-sRGB-gamut) clips to sRGB red-ish', () => {
      // Wide-gamut P3 red maps through OKLCh bisection to sRGB ≈ #ff0000
      expect(fold('color(display-p3 1 0 0)')).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('a98-rgb / prophoto-rgb / rec2020 fold without throwing', () => {
      expect(fold('color(a98-rgb 0.5 0.5 0.5)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(fold('color(prophoto-rgb 0.5 0.5 0.5)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(fold('color(rec2020 0.5 0.5 0.5)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§10.4 XYZ colorspaces', () => {
    it('xyz / xyz-d65 are aliases', () => {
      expect(fold('color(xyz 0.5 0.5 0.5)')).toBe(fold('color(xyz-d65 0.5 0.5 0.5)'));
    });

    it('xyz-d50 produces different hex than xyz-d65 (different white)', () => {
      // D50 white through identity matrix ≠ D65 white through same matrix
      // because the chromaticities differ.
      const d50 = fold('color(xyz-d50 0.9642 1.0 0.8249)');
      const d65 = fold('color(xyz-d65 0.9504 1.0 1.0888)');
      // Both are near-white in sRGB but go through different matrices.
      expect(d50).toMatch(/^#[0-9a-f]{6}$/);
      expect(d65).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('invalid input bails to null', () => {
    it('unknown colorspace identifier returns null', () => {
      expect(fold('color(unknown-space 1 0 0)')).toBeNull();
    });

    it('missing colorspace identifier returns null', () => {
      expect(fold('color(1 0 0)')).toBeNull();
    });

    it('comma-separated channels return null (§10 requires whitespace)', () => {
      expect(fold('color(srgb 1, 0, 0)')).toBeNull();
    });

    it('fewer than 3 channels returns null', () => {
      expect(fold('color(srgb 1 0)')).toBeNull();
    });
  });

  describe('integration: transformDecl folds color() and warns when it cannot', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      resetWarningsForTest();
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('color(srgb 1 0 0) folds via transformDecl', () => {
      expect(transformDecl('backgroundColor', 'color(srgb 1 0 0)')).toEqual({
        backgroundColor: '#ff0000',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('color(display-p3 1 0 0) folds via transformDecl', () => {
      const out = transformDecl('backgroundColor', 'color(display-p3 1 0 0)');
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('color(unknown-space …) emits a warnOnce naming the value + property', () => {
      transformDecl('color', 'color(unknown-space 1 0 0)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const msg = warnSpy.mock.calls[0][0] as string;
      expect(msg).toContain('color(unknown-space 1 0 0)');
      expect(msg).toContain('"color"');
      expect(msg).toContain('modern color form');
    });

    it('color-mix in an unrecognised space emits a warnOnce', () => {
      // `okhsv` isn't in CSS Color L4 §17; reaches the warn-and-defer path.
      transformDecl('backgroundColor', 'color-mix(in okhsv, red, blue)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('color-mix(in okhsv, red, blue)');
    });

    it('relative-color syntax emits a warnOnce', () => {
      transformDecl('color', 'oklch(from red l c h)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('oklch(from red l c h)');
    });

    it('warning dedupes on repeat declarations of the same value', () => {
      transformDecl('color', 'oklch(from red l c h)');
      transformDecl('color', 'oklch(from red l c h)');
      transformDecl('color', 'oklch(from red l c h)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('does not warn for sentinel-bearing values (runtime resolver handles them)', () => {
      // `\0sc:colors.brand` is a createTheme sentinel; the resolver path
      // substitutes it at render time. The static fold can't run, but
      // that's by design — no warning.
      transformDecl('color', 'oklch(0.7 0.15 \0sc:colors.brandHue:200)');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('color-mix() spec compliance (CSS Color Module Level 5 §3)', () => {
  // Spec source: https://drafts.csswg.org/css-color-5/#color-mix
  // Grammar:
  //   color-mix() = color-mix( <color-interpolation-method>?,
  //                            [ <color> && <percentage [0,100]>? ]# )
  // Polyfill scope: srgb, oklab, oklch, lab, lch interpolation spaces.
  // Hue interpolation methods: shorter (default) / longer / increasing
  // / decreasing per CSS Color 4 §13.4. Number of colors: 1+.

  function mix(value: string): string | null {
    return staticColorFunctionToHex(tokenize(value)[0]);
  }

  describe('§3.1 colorspace', () => {
    // Spec: "If no color interpolation method is specified, assume Oklab."
    it('defaults to Oklab when no interpolation method is given', () => {
      expect(mix('color-mix(red, blue)')).toBe(mix('color-mix(in oklab, red, blue)'));
    });

    it('accepts explicit `in oklab`', () => {
      expect(mix('color-mix(in oklab, red, blue)')).toMatch(/^#[0-9a-f]{6}$/);
    });

    // Hue interpolation methods come after the colorspace ident:
    //   `<color-interpolation-method> = in <colorspace> [<hue-method> hue]?`
    it('accepts an explicit hue-interpolation method (cylindrical spaces)', () => {
      expect(mix('color-mix(in oklch shorter hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(mix('color-mix(in oklch longer hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(mix('color-mix(in oklch increasing hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(mix('color-mix(in oklch decreasing hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§3.2 percentage normalization', () => {
    // Spec: "These syntactic forms are thus all equivalent:"
    //   color-mix(in lch, purple 50%, plum 50%)
    //   color-mix(in lch, purple 50%, plum)
    //   color-mix(in lch, purple, plum 50%)
    //   color-mix(in lch, purple, plum)
    //   color-mix(in lch, plum, purple)        (commutative for non-polar)
    //   color-mix(in lch, purple 80%, plum 80%) (sum > 100 normalizes)
    it('treats 50/50, 50/none, none/50, none/none as equivalent', () => {
      const a = mix('color-mix(in srgb, red 50%, blue 50%)');
      expect(mix('color-mix(in srgb, red 50%, blue)')).toBe(a);
      expect(mix('color-mix(in srgb, red, blue 50%)')).toBe(a);
      expect(mix('color-mix(in srgb, red, blue)')).toBe(a);
    });

    it('80%/80% normalizes to 50/50 (sum > 100 scales down)', () => {
      const a = mix('color-mix(in srgb, red 50%, blue 50%)');
      expect(mix('color-mix(in srgb, red 80%, blue 80%)')).toBe(a);
    });

    // Spec: "However, this form is not the same, as the alpha is less
    // than one: color-mix(in lch, purple 30%, plum 30%)"
    it('30%/30% (sum < 100) scales the alpha down by leftover', () => {
      const hex = mix('color-mix(in srgb, red 30%, blue 30%)');
      // sum = 60, leftover = 40, alpha mult = 0.6 → alpha byte 0x99 (≈153)
      expect(hex).toMatch(/^#[0-9a-f]{6}99$/i);
    });

    // Spec: "Negative percentages are specifically disallowed."
    it('rejects negative percentages', () => {
      expect(mix('color-mix(in srgb, red -10%, blue 50%)')).toBeNull();
      expect(mix('color-mix(in srgb, red 50%, blue -10%)')).toBeNull();
    });

    // Spec: "Percentages are required to be in the range 0% to 100%."
    // Per Values 5 §6.1: percentages above 100% are clamped to 100%.
    it('clamps percentages above 100% to 100%', () => {
      expect(mix('color-mix(in srgb, red 150%, blue)')).toBe(
        mix('color-mix(in srgb, red 100%, blue)')
      );
    });
  });

  describe('§3.3 result calculation', () => {
    // Spec: "If leftover is 100%, return transparent black, converted to
    // the specified interpolation <color-space>."
    it('0%/0% returns transparent black', () => {
      expect(mix('color-mix(in srgb, red 0%, blue 0%)')).toBe('#00000000');
      expect(mix('color-mix(in oklch, teal 0%, olive 0%)')).toBe('#00000000');
    });

    // Spec: "If items is length 1, set color to the color of that sole
    // item, converted to the specified interpolation <color-space>."
    it('accepts a single-color list (sole item, %=100 implied)', () => {
      // Single-color mix in srgb is just that color (gamut-clamped).
      expect(mix('color-mix(in srgb, red)')).toBe('#ff0000');
      expect(mix('color-mix(in srgb, red 100%)')).toBe('#ff0000');
    });

    // Spec: "color-mix(in oklab, teal, olive, blue);";three colors,
    // each contributing one-third of the final result.
    it('accepts a 3-color list (each contributes 1/3 by default)', () => {
      const hex = mix('color-mix(in srgb, red, green, blue)');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      // Each channel ≈ (255 + 128 + 0) / 3 / spread; just sanity-check it's
      // in the dark-gray-to-mid range, not saturating any single channel.
      expect(hex).not.toBe('#ff0000');
      expect(hex).not.toBe('#0000ff');
      expect(hex).not.toBe('#008000');
    });

    it('accepts a 3-color list with explicit percentages summing to 100', () => {
      const hex = mix('color-mix(in srgb, red 50%, green 25%, blue 25%)');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§13.4 hue interpolation methods (cylindrical spaces)', () => {
    // Spec: "Unless otherwise specified, if no specific hue
    // interpolation algorithm is selected by the host syntax, the
    // default is shorter."
    it('default cylindrical mix uses shorter (matches explicit `shorter hue`)', () => {
      const a = mix('color-mix(in oklch, red, yellow)');
      const b = mix('color-mix(in oklch shorter hue, red, yellow)');
      expect(a).toBe(b);
    });

    // Spec §13.4.1 shorter: "Hue angles are interpolated to take the
    // shorter of the two arcs between the starting and ending hues."
    // red oklch ≈ hue 30, yellow oklch ≈ hue 110. dh = 80, no wrap.
    // Midpoint hue ≈ 70. Should land in orange territory.
    it('shorter takes the short arc between hues', () => {
      const hex = mix('color-mix(in oklch shorter hue, red, yellow)')!;
      // Orange-ish: r > g > b
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
    });

    // Spec §13.4.2 longer: "Hue angles are interpolated to take the
    // longer of the two arcs between the starting and ending hues."
    // red 30, yellow 110. dh = 80, between 0 and 180 → θ₁ += 360.
    // Midpoint angle ≈ (30+360+110)/2 = 250 → in the blue-purple region.
    it('longer takes the long arc (different result from shorter)', () => {
      const shorter = mix('color-mix(in oklch shorter hue, red, yellow)');
      const longer = mix('color-mix(in oklch longer hue, red, yellow)');
      expect(shorter).not.toBe(longer);
    });

    // Spec §13.4.3 increasing: "the angle is always increasing".
    // For red(30)→yellow(110), dh > 0 already → matches shorter.
    it('increasing matches shorter when θ₂ > θ₁ already', () => {
      const inc = mix('color-mix(in oklch increasing hue, red, yellow)');
      const sh = mix('color-mix(in oklch shorter hue, red, yellow)');
      expect(inc).toBe(sh);
    });

    // Spec §13.4.4 decreasing: "the angle is always decreasing".
    // For red(30)→yellow(110), forces θ₁ += 360 to get a decreasing
    // wrap; midpoint comes out elsewhere.
    it('decreasing differs from shorter for ascending hue pairs', () => {
      const sh = mix('color-mix(in oklch shorter hue, red, yellow)');
      const dec = mix('color-mix(in oklch decreasing hue, red, yellow)');
      expect(dec).not.toBe(sh);
    });

    // Hue methods on non-cylindrical spaces are silently ignored per
    // spec (the method only applies to polar spaces). Implementations
    // that bail are also acceptable; we accept-and-ignore for ergonomics.
    it('ignores hue method on rectangular spaces (srgb / oklab / lab)', () => {
      const plain = mix('color-mix(in srgb, red, yellow)');
      const withMethod = mix('color-mix(in srgb shorter hue, red, yellow)');
      expect(withMethod).toBe(plain);
    });
  });
});

describe('out-of-gamut handling (channel clip)', () => {
  // Convert a hex string back to OKLCh hue (degrees) so we can assert
  // the input hue survived gamut mapping.
  function hexToOklchHue(hex: string): number {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const linearize = (v: number) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const rL = linearize(r);
    const gL = linearize(g);
    const bL = linearize(b);
    const lc = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
    const mc = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
    const sc = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;
    const l_ = Math.cbrt(lc);
    const m_ = Math.cbrt(mc);
    const s_ = Math.cbrt(sc);
    const aOk = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    let deg = (Math.atan2(bOk, aOk) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }

  it('out-of-gamut oklch keeps hue family (vivid green stays green-ish)', () => {
    // `oklch(0.7 0.4 130)` is a high-chroma green well outside sRGB.
    // The polyfill uses channel-clipping;preserves saturation/punch
    // at the cost of a small hue shift toward the dominant channel.
    // For this severely out-of-gamut input the output stays in the
    // green family (110°-145°) without rotating into yellow or cyan.
    const tok = tokenize('oklch(0.7 0.4 130)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    const hue = hexToOklchHue(hex);
    expect(hue).toBeGreaterThan(110);
    expect(hue).toBeLessThan(145);
  });

  it('out-of-gamut oklch keeps hue family (vivid magenta stays magenta-ish)', () => {
    // High-chroma red-magenta outside sRGB. Channel-clip output stays
    // in the magenta-to-red family (340°-360°).
    const tok = tokenize('oklch(0.55 0.35 350)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    const hue = hexToOklchHue(hex);
    expect(hue).toBeGreaterThan(340);
    expect(hue).toBeLessThan(360);
  });

  it('out-of-gamut oklch reduces chroma vs the naive clip baseline', () => {
    // Same hue (130°) at two chromas: 0.4 (out of gamut) and 0.18
    // (in gamut). The mapped 0.4 result should land near the in-gamut
    // 0.18 result;chroma was cut down to the boundary, not channels.
    const out = staticColorFunctionToHex(tokenize('oklch(0.7 0.4 130)')[0])!;
    const inGamut = staticColorFunctionToHex(tokenize('oklch(0.7 0.18 130)')[0])!;
    // Same green family, similar G byte; mapped should be close.
    const gOut = parseInt(out.slice(3, 5), 16);
    const gIn = parseInt(inGamut.slice(3, 5), 16);
    expect(Math.abs(gOut - gIn)).toBeLessThan(40);
  });

  it('lightness >= 1 maps to white in destination', () => {
    const tok = tokenize('oklch(1.2 0.1 30)')[0];
    expect(staticColorFunctionToHex(tok)).toBe('#ffffff');
  });

  it('lightness <= 0 maps to black in destination', () => {
    const tok = tokenize('oklch(-0.1 0.1 30)')[0];
    expect(staticColorFunctionToHex(tok)).toBe('#000000');
  });

  it('out-of-gamut CIE lab keeps hue family', () => {
    // `lab(60% 100% 0)` puts a-axis at +125 (way outside sRGB). The
    // CSS Color 4 algo routes CIE Lab through OKLCh for the bisection,
    // so the result should still be reddish (R dominant) rather than
    // hue-rotated by per-channel clip.
    const tok = tokenize('lab(60% 100% 0)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('in-gamut colors are byte-identical to pre-mapping output', () => {
    // Mid-gray is trivially in-gamut. The gamut-map fast path returns
    // the direct conversion unchanged.
    const tok = tokenize('oklch(0.5 0 0)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    // L=0.5, C=0, H=0;neutral gray at oklab(0.5, 0, 0).
    // Should round to a single-byte mid-gray hex.
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBe(g);
    expect(g).toBe(b);
    // L=0.5 in OKLab → ≈ #777 (perceptual midpoint)
    expect(r).toBeGreaterThan(0x60);
    expect(r).toBeLessThan(0xa0);
  });
});

describe('line-clamp spec compliance (CSS Overflow Module Level 4 §5.1)', () => {
  // Spec source: https://drafts.csswg.org/css-overflow-4/#line-clamp
  // Grammar:
  //   line-clamp = none | [<integer [1,∞]> || <'block-ellipsis'>] -webkit-legacy?
  //   -webkit-line-clamp = none | <integer [1,∞]>
  // Polyfill maps to RN's `numberOfLines` on Text. RN's Text only
  // supports a fixed "…" ellipsis, so the <block-ellipsis> string
  // value (e.g. `"..."`) is parsed and silently ignored. The
  // -webkit-legacy keyword has no RN equivalent and is also ignored.

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§5.1 line-clamp shorthand', () => {
    // Spec: `line-clamp = none | [<integer [1,∞]> || <block-ellipsis>] -webkit-legacy?`

    it('positive integer maps to numberOfLines + overflow hidden', () => {
      expect(transformDecl('line-clamp', '3')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });

    // Spec value "none": "Sets max-lines to none, continue to auto, and
    // block-ellipsis to no-ellipsis." On RN this maps to numberOfLines:
    // 0 (RN's "no limit") with no overflow override.
    it('none disables clamping (numberOfLines: 0, no overflow)', () => {
      expect(transformDecl('line-clamp', 'none')).toEqual({ numberOfLines: 0 });
    });

    // Spec grammar: <integer [1,∞]>. Zero is invalid as a line count.
    it('rejects zero (spec requires integer ≥ 1)', () => {
      expect(transformDecl('line-clamp', '0')).toEqual({});
    });

    it('rejects negative integers', () => {
      expect(transformDecl('line-clamp', '-2')).toEqual({});
    });

    it('rejects non-integer numbers', () => {
      expect(transformDecl('line-clamp', '1.5')).toEqual({});
    });

    // Spec: integer can be followed by a <block-ellipsis> string. RN's
    // Text only renders the default "…" ellipsis; we accept the integer
    // and silently drop the string per the documented deviation.
    it('accepts integer + <block-ellipsis> string (string ignored on RN)', () => {
      expect(transformDecl('line-clamp', '5 "..."')).toEqual({
        numberOfLines: 5,
        overflow: 'hidden',
      });
    });

    // Spec: -webkit-legacy keyword opts into the legacy fragmenter
    // behavior. No RN equivalent; we accept and ignore the keyword.
    it('accepts integer + -webkit-legacy (keyword ignored on RN)', () => {
      expect(transformDecl('line-clamp', '3 -webkit-legacy')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });

    // Spec: -webkit-legacy alone is invalid; the grammar requires the
    // legacy keyword to follow an integer or block-ellipsis.
    it('rejects bare -webkit-legacy', () => {
      expect(transformDecl('line-clamp', '-webkit-legacy')).toEqual({});
    });
  });

  describe('§5.1.1 -webkit-line-clamp legacy', () => {
    // Spec: `-webkit-line-clamp = none | <integer [1,∞]>`
    it('-webkit-line-clamp: positive integer', () => {
      expect(transformDecl('-webkit-line-clamp', '3')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });

    it('-webkit-line-clamp: none disables clamping', () => {
      expect(transformDecl('-webkit-line-clamp', 'none')).toEqual({ numberOfLines: 0 });
    });

    it('-webkit-line-clamp: rejects zero', () => {
      expect(transformDecl('-webkit-line-clamp', '0')).toEqual({});
    });
  });
});

describe('linear() easing', () => {
  it('parses a simple linear curve', () => {
    const tok = tokenize('linear(0, 0.5, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toMatchInlineSnapshot(`
      [
        {
          "t": 0,
          "v": 0,
        },
        {
          "t": 0.5,
          "v": 0.5,
        },
        {
          "t": 1,
          "v": 1,
        },
      ]
    `);
  });

  it('parses a sigmoid-ish curve', () => {
    const tok = tokenize('linear(0, 0.2, 0.8, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toHaveLength(4);
    expect(stops![0].t).toBe(0);
    expect(stops![stops!.length - 1].t).toBe(1);
  });

  it('honours explicit input times', () => {
    const tok = tokenize('linear(0, 0.5 25%, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toHaveLength(3);
    expect(stops![1]).toMatchInlineSnapshot(`
      {
        "t": 0.25,
        "v": 0.5,
      }
    `);
  });
});

describe('linear() easing spec compliance (CSS Easing Functions Level 2 §2.1)', () => {
  // Spec source: https://drafts.csswg.org/css-easing-2/#the-linear-easing-function
  // Polyfill scope: parses control points into a list of {t, v} pairs
  // ready for the animation runtime. Output is the canonicalized form
  // per §2.1 (every control point has an input progress value, and
  // input values are monotonically non-decreasing).

  function stops(value: string) {
    return parseLinearEasing(tokenize(value)[0]);
  }

  describe('§2.1 grammar', () => {
    // Spec grammar: `linear() = linear( [ <number> && <percentage>{0,2} ]# )`
    //;1+ comma-separated args, each with one number and 0-2 percents.
    it('rejects an empty linear()', () => {
      expect(stops('linear()')).toBeNull();
    });

    it('accepts a single point: linear(0.5)', () => {
      // Spec §2.1.2: "If points holds only a single item, return the
      // output progress value of that item.";input doesn't matter.
      // Polyfill stores it with the canonicalized t=0.
      expect(stops('linear(0.5)')).toEqual([{ t: 0, v: 0.5 }]);
    });

    it('accepts a 2-point linear ramp: linear(0, 1)', () => {
      // Per Easing 1: "linear" keyword is equivalent to linear(0, 1).
      expect(stops('linear(0, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 1, v: 1 },
      ]);
    });

    // Spec: "When the argument has two <percentage>s, it defines two
    // control points in the specified order, one per <percentage>."
    it('expands a 2-percentage form into two control points (same v)', () => {
      // Spec example: "linear(0, 0.25 25% 75%, 1) serializes as
      //                linear(0, 0.25 25%, 0.25 75%, 1)"
      expect(stops('linear(0, 0.25 25% 75%, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.25, v: 0.25 },
        { t: 0.75, v: 0.25 },
        { t: 1, v: 1 },
      ]);
    });

    it('rejects more than two percentages on a single argument', () => {
      // 3+ percents violate `<percentage>{0,2}`.
      expect(stops('linear(0.5 10% 20% 30%)')).toBeNull();
    });

    it('rejects an argument missing the <number>', () => {
      expect(stops('linear(50%)')).toBeNull();
    });
  });

  describe('§2.1 canonicalization', () => {
    // Canonicalize step 1: "If the first control point lacks an input
    // progress value, set its input progress value to 0."
    it('first point with no input gets t=0', () => {
      const r = stops('linear(0.3, 1 100%)');
      expect(r![0].t).toBe(0);
    });

    // Step 2: "If the last control point lacks an input progress value,
    // set its input progress value to 1."
    it('last point with no input gets t=1', () => {
      const r = stops('linear(0 0%, 0.5)');
      expect(r![r!.length - 1].t).toBe(1);
    });

    // Step 3: "If any control point has an input progress value that is
    // less than the input progress value of any preceding control point,
    // set its input progress value to the largest input progress value
    // of any preceding control point."
    it('clamps a non-monotonic point up to the running max', () => {
      // Inputs: 0, 30%, 20%, 100% → after clamp: 0, 30%, 30%, 100%
      expect(stops('linear(0, 0.5 30%, 0.7 20%, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.3, v: 0.5 },
        { t: 0.3, v: 0.7 },
        { t: 1, v: 1 },
      ]);
    });

    // Step 4: "If any control point still lacks an input progress
    // value, then for each contiguous run of such control points, set
    // their input progress values so that they are evenly spaced
    // between the preceding and following control points with input
    // progress values."
    it('evenly distributes a contiguous run of unspecified inputs', () => {
      // Specified: 0% on first, 100% on last. Three middle points with
      // no input → spaced at 25%, 50%, 75%.
      expect(stops('linear(0, 0.25, 0.5, 0.75, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.25, v: 0.25 },
        { t: 0.5, v: 0.5 },
        { t: 0.75, v: 0.75 },
        { t: 1, v: 1 },
      ]);
    });

    it('distributes between explicit anchors', () => {
      // 0% at start, 80% on the explicit, 100% at end. Two unspecified
      // between 80% and 100%? Actually the implicit-runs case: between
      // 0% (first) and 80% (4th of 4 stops) we have 2 unspecified →
      // spaced at (80-0)/3 = ~26.67% and ~53.33%.
      const r = stops('linear(0, 0.25, 0.5, 0.75 80%, 1)');
      expect(r![0].t).toBe(0);
      expect(r![3].t).toBeCloseTo(0.8, 5);
      expect(r![4].t).toBe(1);
      expect(r![1].t).toBeCloseTo(0.8 / 3, 5);
      expect(r![2].t).toBeCloseTo((2 * 0.8) / 3, 5);
    });
  });

  describe('numeric ranges (no spec restriction)', () => {
    // Spec §2.1 doesn't restrict the numeric range;values can exceed
    // [0, 1] for output (overshoot) and [0, 100%] for input (extrapolate
    // outside the curve domain).
    it('accepts overshoot output values (e.g. > 1 or < 0)', () => {
      const r = stops('linear(0, 1.2 50%, 1)');
      expect(r![1].v).toBe(1.2);
    });

    it('accepts negative percentages on input', () => {
      const r = stops('linear(0 -10%, 0.5, 1 110%)');
      expect(r![0].t).toBe(-0.1);
      expect(r![r!.length - 1].t).toBe(1.1);
    });
  });
});

describe('text-wrap spec compliance (CSS Text Module Level 4 §5.5)', () => {
  // Spec: text-wrap shorthand = <text-wrap-mode> || <text-wrap-style>
  //   text-wrap-mode  = wrap | nowrap
  //   text-wrap-style = auto | balance | stable | pretty
  //
  // RN 0.85 mapping (verified against StyleSheetTypes.d.ts + TextProps.js):
  //   - nowrap         → numberOfLines: 1 (Text prop via SPECIAL_CASE_PROPS)
  //   - balance        → textBreakStrategy: 'balanced'   (Android-only)
  //   - pretty         → textBreakStrategy: 'highQuality' (Android-only)
  //   - stable         → no equivalent on either platform; warnOnce
  //   - wrap / auto    → no-op (defaults)
  // The textWrap key is preserved on the style object so rn-web's browser
  // engine still honors the original shorthand.

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§5.5 grammar + RN mapping', () => {
    it('mode alone: wrap', () => {
      expect(transformDecl('text-wrap', 'wrap')).toEqual({ textWrap: 'wrap' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('mode alone: nowrap maps to numberOfLines: 1', () => {
      expect(transformDecl('text-wrap', 'nowrap')).toEqual({
        textWrap: 'nowrap',
        numberOfLines: 1,
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('style alone: auto', () => {
      expect(transformDecl('text-wrap', 'auto')).toEqual({ textWrap: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('style alone: balance maps to textBreakStrategy (Android)', () => {
      expect(transformDecl('text-wrap', 'balance')).toEqual({
        textWrap: 'balance',
        textBreakStrategy: 'balanced',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-wrap: balance/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/iOS/);
    });

    it('style alone: pretty maps to textBreakStrategy (Android)', () => {
      expect(transformDecl('text-wrap', 'pretty')).toEqual({
        textWrap: 'pretty',
        textBreakStrategy: 'highQuality',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-wrap: pretty/);
    });

    it('style alone: stable warns (no RN equivalent)', () => {
      expect(transformDecl('text-wrap', 'stable')).toEqual({ textWrap: 'stable' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-wrap: stable/);
    });

    it('combined: nowrap balance (mode + style both translated)', () => {
      expect(transformDecl('text-wrap', 'nowrap balance')).toEqual({
        textWrap: 'nowrap balance',
        numberOfLines: 1,
        textBreakStrategy: 'balanced',
      });
    });

    it('combined: order independent per `||` grammar', () => {
      expect(transformDecl('text-wrap', 'balance wrap')).toEqual({
        textWrap: 'wrap balance',
        textBreakStrategy: 'balanced',
      });
    });

    it('rejects duplicate mode', () => {
      expect(transformDecl('text-wrap', 'wrap nowrap')).toEqual({});
    });

    it('rejects duplicate style', () => {
      expect(transformDecl('text-wrap', 'balance pretty')).toEqual({});
    });

    it('rejects unknown ident', () => {
      expect(transformDecl('text-wrap', 'foo')).toEqual({});
    });

    it('rejects empty value', () => {
      expect(transformDecl('text-wrap', '')).toEqual({});
    });
  });

  describe('dedupe', () => {
    it('warns at most once per problematic value', () => {
      transformDecl('text-wrap', 'balance');
      transformDecl('text-wrap', 'balance');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('hyphens spec compliance (CSS Text Module Level 4 §6.3.1)', () => {
  // Spec source: drafts.csswg.org/css-text-4/#hyphens-property
  //
  //   Name:        hyphens
  //   Value:       none | manual | auto
  //   Initial:     manual
  //   Applies to:  text
  //
  // RN 0.85 mapping (verified against Text.d.ts:100):
  //   - Android: `android_hyphenationFrequency: 'none' | 'normal' | 'full'`
  //     is a Text component prop, lifted via SPECIAL_CASE_PROPS like
  //     numberOfLines / textBreakStrategy.
  //   - iOS: no equivalent style or prop in 0.85. Soft-hyphens in source
  //     text still break naturally on both platforms, so spec `manual`
  //     matches iOS native behavior regardless of the declaration.
  //   - rn-web: browser handles `hyphens` natively from the style key.

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§6.3.1 value definitions + RN mapping', () => {
    // Spec verbatim: "Words are not hyphenated, even if characters inside
    // the word explicitly define hyphenation opportunities."
    it('hyphens: none → android_hyphenationFrequency: "none"', () => {
      expect(transformDecl('hyphens', 'none')).toEqual({
        hyphens: 'none',
        android_hyphenationFrequency: 'none',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // Spec verbatim: "Words are only hyphenated where there are characters
    // inside the word that explicitly suggest hyphenation opportunities."
    // Mapped to android `'none'` because Android's text engine honors
    // explicit U+00AD soft-hyphens irrespective of the frequency setting.
    it('hyphens: manual → android_hyphenationFrequency: "none" (soft-hyphens still honored)', () => {
      expect(transformDecl('hyphens', 'manual')).toEqual({
        hyphens: 'manual',
        android_hyphenationFrequency: 'none',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // Spec verbatim: "Words may be broken at hyphenation opportunities
    // determined automatically by a language-appropriate hyphenation
    // resource in addition to those indicated explicitly by a conditional
    // hyphen."
    it('hyphens: auto → android_hyphenationFrequency: "normal" + iOS warn', () => {
      expect(transformDecl('hyphens', 'auto')).toEqual({
        hyphens: 'auto',
        android_hyphenationFrequency: 'normal',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/hyphens: auto/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/iOS/);
    });
  });

  describe('invalid input', () => {
    // Spec value-list is closed: only `none | manual | auto` accepted.
    it('unknown keyword drops the declaration', () => {
      expect(transformDecl('hyphens', 'never')).toEqual({});
    });

    it('rejects multi-token values (single ident grammar)', () => {
      expect(transformDecl('hyphens', 'auto manual')).toEqual({});
    });
  });

  describe('dedupe', () => {
    it('warns at most once on repeated auto declarations', () => {
      transformDecl('hyphens', 'auto');
      transformDecl('hyphens', 'auto');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('gap spec compliance (CSS Box Alignment 3 §8.3)', () => {
  // Spec: gap = <'row-gap'> <'column-gap'>?
  // Each axis: normal | <length-percentage [0,∞]>
  // RN 0.85 supports gap (single value) + rowGap + columnGap natively.
  // We pass the one-value form as `gap`; two-value splits to longhands.

  it('single value emits gap', () => {
    expect(transformDecl('gap', '12px')).toEqual({ gap: 12 });
  });

  it('two values split into rowGap / columnGap', () => {
    expect(transformDecl('gap', '8px 12px')).toEqual({ rowGap: 8, columnGap: 12 });
  });

  it('two values with one zero', () => {
    expect(transformDecl('gap', '0 16px')).toEqual({ rowGap: 0, columnGap: 16 });
  });

  it('accepts percentage axis values', () => {
    expect(transformDecl('gap', '10% 5%')).toEqual({ rowGap: '10%', columnGap: '5%' });
  });

  it('accepts normal keyword', () => {
    expect(transformDecl('gap', 'normal')).toEqual({ gap: 'normal' });
  });

  it('rejects three values (per grammar)', () => {
    expect(transformDecl('gap', '4px 8px 12px')).toEqual({});
  });

  it('rejects unknown ident', () => {
    expect(transformDecl('gap', 'foo')).toEqual({});
  });
});

describe('outline spec compliance (CSS UI 4 §6)', () => {
  // Spec: outline = <'outline-width'> || <'outline-style'> || <'outline-color'>
  // RN 0.85 supports outlineWidth / outlineStyle / outlineColor / outlineOffset
  // longhands but not the shorthand. outlineStyle is restricted to
  // 'solid' | 'dotted' | 'dashed'; web-only styles warn and pass through
  // for rn-web.

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('width + style + color', () => {
    expect(transformDecl('outline', '2px solid red')).toEqual({
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: 'red',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('order independent (color first)', () => {
    expect(transformDecl('outline', 'red 2px solid')).toEqual({
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: 'red',
    });
  });

  it('width only', () => {
    expect(transformDecl('outline', '3px')).toEqual({ outlineWidth: 3 });
  });

  it('style only', () => {
    expect(transformDecl('outline', 'dotted')).toEqual({ outlineStyle: 'dotted' });
  });

  it('color only', () => {
    expect(transformDecl('outline', '#abc')).toEqual({ outlineColor: '#abc' });
  });

  it('none short-circuits to zero width', () => {
    expect(transformDecl('outline', 'none')).toEqual({
      outlineWidth: 0,
      outlineStyle: 'solid',
      outlineColor: 'transparent',
    });
  });

  it.each(['auto', 'double', 'groove', 'ridge', 'inset', 'outset'])(
    'web-only style: %s passes through with warnOnce',
    style => {
      expect(transformDecl('outline', `2px ${style} red`)).toEqual({
        outlineWidth: 2,
        outlineStyle: style,
        outlineColor: 'red',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(new RegExp(`outline-style: ${style}`));
    }
  );

  it('rejects empty', () => {
    expect(transformDecl('outline', '')).toEqual({});
  });

  it('rejects unknown ident', () => {
    expect(transformDecl('outline', 'wibble')).toEqual({});
  });
});

describe('standalone transform properties (CSS Transforms 2 §3)', () => {
  // Spec:
  //   translate: <length-percentage> <length-percentage>? <length>?
  //   rotate:    <angle> | [x|y|z] <angle>
  //   scale:     <number-percentage>{1,3}
  // RN 0.85 has no top-level translate / rotate / scale style keys; we lower
  // to a CSS `transform` string which RN parses natively. Composition with
  // an authored `transform:` is left to the cascade (last decl wins).

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('translate', () => {
    it('single value (x only)', () => {
      expect(transformDecl('translate', '10px')).toEqual({ transform: 'translateX(10px)' });
    });

    it('two values (x y)', () => {
      expect(transformDecl('translate', '10px 20px')).toEqual({
        transform: 'translate(10px, 20px)',
      });
    });

    it('zero values render without units', () => {
      expect(transformDecl('translate', '0 16px')).toEqual({
        transform: 'translate(0, 16px)',
      });
    });

    it('three values (3D) warn + drop Z', () => {
      expect(transformDecl('translate', '10px 20px 5px')).toEqual({
        transform: 'translate(10px, 20px)',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects empty', () => {
      expect(transformDecl('translate', '')).toEqual({});
    });
  });

  describe('rotate', () => {
    it('angle only', () => {
      expect(transformDecl('rotate', '45deg')).toEqual({ transform: 'rotate(45deg)' });
    });

    it('with explicit z axis', () => {
      expect(transformDecl('rotate', 'z 45deg')).toEqual({ transform: 'rotateZ(45deg)' });
    });

    it('with x axis', () => {
      expect(transformDecl('rotate', 'x 30deg')).toEqual({ transform: 'rotateX(30deg)' });
    });

    it('with y axis', () => {
      expect(transformDecl('rotate', 'y 60deg')).toEqual({ transform: 'rotateY(60deg)' });
    });

    it('rejects non-angle', () => {
      expect(transformDecl('rotate', '45')).toEqual({});
    });
  });

  describe('scale', () => {
    it('single number value', () => {
      expect(transformDecl('scale', '2')).toEqual({ transform: 'scale(2)' });
    });

    it('two values emit scaleX + scaleY (RN rejects scale(x, y) in string form)', () => {
      expect(transformDecl('scale', '2 0.5')).toEqual({ transform: 'scaleX(2) scaleY(0.5)' });
    });

    it('single percentage value', () => {
      expect(transformDecl('scale', '50%')).toEqual({ transform: 'scale(0.5)' });
    });

    it('three values (3D) warn + drop Z', () => {
      expect(transformDecl('scale', '2 1 0.5')).toEqual({ transform: 'scaleX(2) scaleY(1)' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects length values', () => {
      expect(transformDecl('scale', '2px')).toEqual({});
    });
  });
});

describe('caret-color spec compliance (CSS UI 4 §5.2.1)', () => {
  // Spec source: drafts.csswg.org/css-ui-4/#caret-color
  //
  //   Name:        caret-color
  //   Value:       auto | <color> [auto | <color>]?
  //   Initial:     auto
  //   Applies to:  text or elements that accept text input
  //   Inherited:   yes
  //
  // RN 0.85 mapping (verified against TextInput.d.ts:362 + TextInput.js:745):
  //   - Android: `cursorColor` is a TextInput prop that "set[s] the color
  //     of the cursor (or 'caret') in the component" "independently from
  //     the color of the text selection box". Spec-precise on Android.
  //     Lifted via SPECIAL_CASE_PROPS.
  //   - iOS: RN provides no API to color the caret without also tinting
  //     the selection range (the iOS `selectionColor` prop maps to UIKit's
  //     `tintColor` and affects both). caret-color drops on iOS; users
  //     wanting an iOS caret tint should pass `selectionColor` directly.
  //   - rn-web: browser handles `caretColor` natively from the style key.
  //
  // Spec verbatim for value definitions:
  //   "This property controls the color of the insertion caret. It takes
  //   one or two values. The first value has the following effects:"
  //   - auto: "User agents should use currentColor. User agents may
  //     automatically adjust the color of caret to ensure good visibility
  //     and contrast..."
  //   - <color>: "The caret is colored with the specified color."

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§5.2.1 single-value form', () => {
    // Spec verbatim: "User agents should use currentColor." auto matches
    // RN's default behavior on every platform. We emit only the style
    // key so rn-web sees it and native UAs keep their default caret.
    it('caret-color: auto → caretColor style only, no cursorColor lift', () => {
      expect(transformDecl('caret-color', 'auto')).toEqual({ caretColor: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // Spec verbatim: "The caret is colored with the specified color."
    // Named color form.
    it('caret-color: red → caretColor + cursorColor + iOS limitation warn', () => {
      expect(transformDecl('caret-color', 'red')).toEqual({
        caretColor: 'red',
        cursorColor: 'red',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/caret-color/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/iOS/);
    });

    it('caret-color: #00aacc → hex color emits both keys', () => {
      expect(transformDecl('caret-color', '#00aacc')).toEqual({
        caretColor: '#00aacc',
        cursorColor: '#00aacc',
      });
    });

    it('caret-color: rgb(0 170 204) → function color emits both keys', () => {
      expect(transformDecl('caret-color', 'rgb(0 170 204)')).toEqual({
        caretColor: 'rgb(0 170 204)',
        cursorColor: 'rgb(0 170 204)',
      });
    });

    it('caret-color: currentColor → ident color emits both keys', () => {
      // currentColor is a <color> per CSS Color 4. The rn-web browser
      // resolves it; native RN's normalizeColor doesn't, so cursorColor
      // would be ignored on Android in this case. We still emit the lift
      // so the value reaches the native side; RN handles "unknown color"
      // by leaving the default in place.
      expect(transformDecl('caret-color', 'currentColor')).toEqual({
        caretColor: 'currentColor',
        cursorColor: 'currentColor',
      });
    });
  });

  describe('§5.2.1 two-value form', () => {
    // Spec verbatim: "If caret-shape is block, or auto behaving as block,
    // then it determines the color of the text overlapping the caret.
    // If the second value is omitted, the behavior is the same as if
    // auto had been specified."
    //
    // RN has no block-caret rendering, so the second value has no effect
    // anywhere our polyfill emits. We accept the grammar and apply only
    // the first value with a warnOnce documenting the limitation.

    it('caret-color: red auto → first value drives both keys + block-caret warn', () => {
      expect(transformDecl('caret-color', 'red auto')).toEqual({
        caretColor: 'red',
        cursorColor: 'red',
      });
      // One warn for the iOS limitation, one for the block-caret second value.
      expect(warnSpy).toHaveBeenCalledTimes(2);
      const messages = warnSpy.mock.calls.map(c => c[0]).join('\n');
      expect(messages).toMatch(/iOS/);
      expect(messages).toMatch(/second value|block/);
    });

    it('caret-color: auto blue → first auto, no cursorColor lift, block-caret warn', () => {
      expect(transformDecl('caret-color', 'auto blue')).toEqual({ caretColor: 'auto' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/second value|block/);
    });
  });

  describe('invalid input', () => {
    // Grammar is `auto | <color> [auto | <color>]?`. Non-color functions
    // and unknown idents fail the <color> production and drop.
    it('three tokens drops the declaration', () => {
      expect(transformDecl('caret-color', 'red blue green')).toEqual({});
    });

    it('numeric-only drops the declaration', () => {
      expect(transformDecl('caret-color', '42px')).toEqual({});
    });

    it('non-color function drops the declaration', () => {
      expect(transformDecl('caret-color', 'calc(1px)')).toEqual({});
    });

    it('unknown ident drops the declaration', () => {
      expect(transformDecl('caret-color', 'notacolor')).toEqual({});
    });
  });

  describe('dedupe', () => {
    it('warns at most once on repeated <color> declarations', () => {
      transformDecl('caret-color', 'red');
      transformDecl('caret-color', 'red');
      transformDecl('caret-color', 'blue');
      // iOS-limitation warn fires once globally (no per-value suffix).
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('text-decoration platform skew (Android underline color)', () => {
  // RN 0.85's `TextStyleAndroid` omits `textDecorationColor` and
  // `textDecorationStyle`; both are iOS-only. Android paints the
  // underline in the text color via `ReactUnderlineSpan` (extends
  // `android.text.style.UnderlineSpan` unchanged), and the shadow
  // tree drops the unrecognised keys silently. We warn so consumers
  // hit by the discrepancy aren't left wondering why their underline
  // is the wrong color on Android.
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('warns + emits color when text-decoration carries an explicit color', () => {
    expect(transformDecl('text-decoration', 'underline #f00')).toEqual({
      textDecorationLine: 'underline',
      textDecorationStyle: 'solid',
      textDecorationColor: '#f00',
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/text-decoration-color/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/only applies on iOS/);
  });

  it('does not warn when text-decoration omits the color (default black falls back)', () => {
    expect(transformDecl('text-decoration', 'underline')).toEqual({
      textDecorationLine: 'underline',
      textDecorationStyle: 'solid',
      textDecorationColor: 'black',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('dedupe gates on the raw color value (one warn per unique color)', () => {
    transformDecl('text-decoration', 'underline #f00');
    transformDecl('text-decoration', 'underline #f00');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    transformDecl('text-decoration', 'underline #0f0');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
