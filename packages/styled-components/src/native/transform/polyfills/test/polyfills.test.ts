import { transformDecl } from '../../index';
import { tokenize } from '../../tokenize';
import { staticColorFunctionToHex } from '../colorMath';
import { parseLinearEasing } from '../linearEasing';

describe('logical shorthand polyfill', () => {
  it('margin-inline expands to marginStart / marginEnd', () => {
    expect(transformDecl('margin-inline', '10px 20px')).toEqual({
      marginStart: 10,
      marginEnd: 20,
    });
  });

  it('margin-inline: single value applies to both ends', () => {
    expect(transformDecl('margin-inline', '10px')).toEqual({
      marginStart: 10,
      marginEnd: 10,
    });
  });

  it('margin-block expands to marginTop / marginBottom', () => {
    expect(transformDecl('margin-block', '8px 12px')).toEqual({
      marginTop: 8,
      marginBottom: 12,
    });
  });

  it('padding-inline / padding-block', () => {
    expect(transformDecl('padding-inline', '5% 10%')).toEqual({
      paddingStart: '5%',
      paddingEnd: '10%',
    });
    expect(transformDecl('padding-block', '4px')).toEqual({
      paddingTop: 4,
      paddingBottom: 4,
    });
  });

  it('inset-inline / inset-block', () => {
    expect(transformDecl('inset-inline', '0 auto')).toEqual({
      insetInlineStart: 0,
      insetInlineEnd: 'auto',
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
    // vw is runtime-polyfillable, not static — transformDecl should
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
    // Should be reddish — r channel dominant.
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
    // Non-resolvable — passes through as string
    expect(typeof out.color).toBe('string');
    expect(out.color).toContain('var');
  });
});

describe('line-clamp polyfill', () => {
  it('line-clamp: 3 → numberOfLines + overflow hidden', () => {
    expect(transformDecl('line-clamp', '3')).toEqual({
      numberOfLines: 3,
      overflow: 'hidden',
    });
  });

  it('line-clamp: 0', () => {
    expect(transformDecl('line-clamp', '0')).toEqual({
      numberOfLines: 0,
      overflow: 'hidden',
    });
  });

  it('line-clamp: rejects non-integer', () => {
    const out = transformDecl('line-clamp', '1.5');
    expect(out.numberOfLines).toBeUndefined();
  });
});

describe('linear() easing', () => {
  it('parses a simple linear curve', () => {
    const tok = tokenize('linear(0, 0.5, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toEqual([
      { t: 0, v: 0 },
      { t: 0.5, v: 0.5 },
      { t: 1, v: 1 },
    ]);
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
    expect(stops![1]).toEqual({ t: 0.25, v: 0.5 });
  });
});
