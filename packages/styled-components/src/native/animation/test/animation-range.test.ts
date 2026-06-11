import { resetNativeStyleCache, toNativeStyles } from '../../../models/compileNative';
import { resetWarningsForTest } from '../../transform/dev';
import { resolveRangeBoundary } from '../range';
import type { RangeBoundary } from '../types';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

beforeEach(() => {
  resetNativeStyleCache();
  resetWarningsForTest();
});

function rangeOf(css: string) {
  const r = toNativeStyles(`animation-name: pulse; ${css}`, stubStyleSheet);
  const desc = r.animations![0];
  return { start: desc.rangeStart, end: desc.rangeEnd };
}

// ──────────────────────────────────────────────────────────────────────
// CSS Scroll-driven Animations Module Level 1, Appendix A: Timeline Ranges.
// Drafts source: https://drafts.csswg.org/scroll-animations-1/ (fetched
// 2026-06-09 into /tmp/scroll-animations-1.html).
//
// Verbatim grammar from the spec:
//   animation-range:        [ <'animation-range-start'> <'animation-range-end'>? ]#
//   animation-range-start:  [ normal | <length-percentage> | <timeline-range-name> <length-percentage>? ]#
//   animation-range-end:    [ normal | <length-percentage> | <timeline-range-name> <length-percentage>? ]#
//   Initial: normal (both longhands)
//
// Spec quotes that drove these tests:
// - "If <'animation-range-end'> is omitted and <'animation-range-start'>
//   includes a <timeline-range-name> component, then animation-range-end is
//   set to that same <timeline-range-name> and 100%. Otherwise, any omitted
//   longhand is set to its initial value."
// - animation-range-start, <timeline-range-name> <length-percentage>?: "If
//   the <length-percentage> is omitted, it defaults to 0%."
// - animation-range-end, <timeline-range-name> <length-percentage>?: "If
//   the <length-percentage> is omitted, it defaults to 100%."
// - "The animation-range properties are reset-only sub-properties of the
//   animation shorthand."
// - "These list-valued properties form a coordinating list property group
//   with animation-name as the coordinating list base property."
// - §3.1 defines the <timeline-range-name> set for view progress timelines:
//   cover, contain, entry, exit, entry-crossing, exit-crossing, scroll.
//
// Deviation note: the spec carries an open inline issue "Define application
// to time-driven animations." Application is therefore only defined for
// scroll/view timelines; until those land, descriptors carry the parsed
// range and the time-driven engine ignores it (matching shipped browser
// behavior, where animation-range has no effect on document timelines).
// ──────────────────────────────────────────────────────────────────────
describe('animation-range spec compliance (Scroll-driven Animations L1, Appendix A)', () => {
  describe('animation-range shorthand expansion (spec example table)', () => {
    // Each case below is one row of the spec's worked example block under
    // "Specifying an Animation's Timeline Range: the animation-range
    // shorthand"; the expected start/end pairs are the spec's own
    // longhand expansions.
    it('animation-range: entry 10% exit 90%', () => {
      expect(rangeOf('animation-range: entry 10% exit 90%;')).toEqual({
        start: { rangeName: 'entry', value: 10, unit: '%', calcRaw: null },
        end: { rangeName: 'exit', value: 90, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: entry (name alone implies 0% to same-name 100%)', () => {
      expect(rangeOf('animation-range: entry;')).toEqual({
        start: { rangeName: 'entry', value: 0, unit: '%', calcRaw: null },
        end: { rangeName: 'entry', value: 100, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: entry exit', () => {
      expect(rangeOf('animation-range: entry exit;')).toEqual({
        start: { rangeName: 'entry', value: 0, unit: '%', calcRaw: null },
        end: { rangeName: 'exit', value: 100, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: 10% (no name: omitted end is normal)', () => {
      expect(rangeOf('animation-range: 10%;')).toEqual({
        start: { rangeName: null, value: 10, unit: '%', calcRaw: null },
        end: 'normal',
      });
    });

    it('animation-range: 10% 90%', () => {
      expect(rangeOf('animation-range: 10% 90%;')).toEqual({
        start: { rangeName: null, value: 10, unit: '%', calcRaw: null },
        end: { rangeName: null, value: 90, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: entry 10% exit', () => {
      expect(rangeOf('animation-range: entry 10% exit;')).toEqual({
        start: { rangeName: 'entry', value: 10, unit: '%', calcRaw: null },
        end: { rangeName: 'exit', value: 100, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: 10% exit 90%', () => {
      expect(rangeOf('animation-range: 10% exit 90%;')).toEqual({
        start: { rangeName: null, value: 10, unit: '%', calcRaw: null },
        end: { rangeName: 'exit', value: 90, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: entry 10% 90%', () => {
      expect(rangeOf('animation-range: entry 10% 90%;')).toEqual({
        start: { rangeName: 'entry', value: 10, unit: '%', calcRaw: null },
        end: { rangeName: null, value: 90, unit: '%', calcRaw: null },
      });
    });

    it('animation-range: normal (explicit keyword round-trips)', () => {
      expect(rangeOf('animation-range: normal;')).toEqual({
        start: 'normal',
        end: 'normal',
      });
    });
  });

  describe('animation-range-start / animation-range-end longhands', () => {
    it('initial value is normal for both longhands', () => {
      expect(rangeOf('')).toEqual({ start: 'normal', end: 'normal' });
    });

    it('range-start name alone defaults to 0% of the named range', () => {
      expect(rangeOf('animation-range-start: contain;').start).toEqual({
        rangeName: 'contain',
        value: 0,
        unit: '%',
        calcRaw: null,
      });
    });

    it('range-end name alone defaults to 100% of the named range', () => {
      expect(rangeOf('animation-range-end: contain;').end).toEqual({
        rangeName: 'contain',
        value: 100,
        unit: '%',
        calcRaw: null,
      });
    });

    it('plain percentages measure from the start of the timeline', () => {
      expect(rangeOf('animation-range-start: 25%; animation-range-end: 75%;')).toEqual({
        start: { rangeName: null, value: 25, unit: '%', calcRaw: null },
        end: { rangeName: null, value: 75, unit: '%', calcRaw: null },
      });
    });

    it('<length> offsets are accepted and folded to device px', () => {
      // <length-percentage> per grammar; absolute units fold via the
      // CSS Values 4 §5.2 ratios (1in = 96px), same policy as the rest
      // of the native pipeline.
      expect(rangeOf('animation-range-start: 120px; animation-range-end: 1in;')).toEqual({
        start: { rangeName: null, value: 120, unit: 'px', calcRaw: null },
        end: { rangeName: null, value: 96, unit: 'px', calcRaw: null },
      });
    });

    it('all seven spec-defined timeline range names parse', () => {
      for (const name of [
        'cover',
        'contain',
        'entry',
        'exit',
        'entry-crossing',
        'exit-crossing',
        'scroll',
      ]) {
        expect(rangeOf(`animation-range-start: ${name} 50%;`).start).toEqual({
          rangeName: name,
          value: 50,
          unit: '%',
          calcRaw: null,
        });
      }
    });

    it('an unknown range name invalidates the declaration (stays normal)', () => {
      expect(rangeOf('animation-range-start: bogus 50%;').start).toBe('normal');
    });

    it('a bare unknown ident invalidates the declaration (stays normal)', () => {
      expect(rangeOf('animation-range-start: bogus;').start).toBe('normal');
    });
  });

  describe('calc() range offsets', () => {
    it('single-unit calc() folds statically', () => {
      expect(rangeOf('animation-range-start: calc(10% + 15%);').start).toEqual({
        rangeName: null,
        value: 25,
        unit: '%',
        calcRaw: null,
      });
    });

    it('mixed-unit calc() defers (spec example: entry calc(100% - 100px))', () => {
      // The spec's own example uses mixed percent+length calc for ranges;
      // mixed forms can only resolve once the timeline extent is known,
      // so the raw expression is carried on the descriptor.
      expect(rangeOf('animation-range: entry calc(100% - 100px) exit calc(0% + 100px);')).toEqual({
        start: { rangeName: 'entry', value: 0, unit: '%', calcRaw: 'calc(100% - 100px)' },
        end: { rangeName: 'exit', value: 0, unit: '%', calcRaw: 'calc(0% + 100px)' },
      });
    });
  });

  describe('coordinating list semantics (base property: animation-name)', () => {
    it('comma lists pair range entries with animation names', () => {
      const r = toNativeStyles(
        'animation-name: reveal, hide; animation-range: entry, exit;',
        stubStyleSheet
      );
      expect(r.animations![0].rangeStart).toEqual({
        rangeName: 'entry',
        value: 0,
        unit: '%',
        calcRaw: null,
      });
      expect(r.animations![1].rangeStart).toEqual({
        rangeName: 'exit',
        value: 0,
        unit: '%',
        calcRaw: null,
      });
    });

    it('shorter range lists cycle to match the name list', () => {
      const r = toNativeStyles(
        'animation-name: a, b, c; animation-range-start: 10%, 20%;',
        stubStyleSheet
      );
      expect(r.animations!.map(d => (d.rangeStart as any).value)).toEqual([10, 20, 10]);
    });
  });

  describe('reset-only sub-property of the animation shorthand', () => {
    // "The animation-range properties are reset-only sub-properties of the
    // animation shorthand." A later `animation` declaration resets ranges
    // to their initial value; range declarations after the shorthand stick.
    it('a later animation shorthand resets a prior animation-range', () => {
      expect(rangeOf('animation-range: entry; animation: pulse 1s;')).toEqual({
        start: 'normal',
        end: 'normal',
      });
    });

    it('animation-range after the shorthand applies on top of it', () => {
      const r = toNativeStyles('animation: pulse 1s; animation-range: entry;', stubStyleSheet);
      expect(r.animations![0].rangeStart).toEqual({
        rangeName: 'entry',
        value: 0,
        unit: '%',
        calcRaw: null,
      });
    });
  });
});

// ──────────────────────────────────────────────────────────────────────
// Boundary resolution to timeline fractions. Spec basis:
// - animation-range-start, <length-percentage>: "The animation attachment
//   range starts at the specified point on the timeline measuring from the
//   start of the timeline."
// - <timeline-range-name> <length-percentage>?: "... measuring from the
//   start of the specified named timeline range."
// - animation-range-start, normal: "The start of the animation's attachment
//   range is the start of its associated timeline".
// - animation-range-end, normal: "The end of the animation's attachment
//   range is the end of its associated timeline".
// - Appendix A: "The start of the segment is represented as 0% progress
//   through the range; the end of the segment is represented as 100%
//   progress through the range."
// ──────────────────────────────────────────────────────────────────────
describe('resolveRangeBoundary (attachment range to timeline fraction)', () => {
  const pct = (value: number): RangeBoundary => ({
    rangeName: null,
    value,
    unit: '%',
    calcRaw: null,
  });

  it('normal resolves to the timeline start (0) for range-start', () => {
    expect(resolveRangeBoundary('normal', true, 400, null)).toBe(0);
  });

  it('normal resolves to the timeline end (1) for range-end', () => {
    expect(resolveRangeBoundary('normal', false, 400, null)).toBe(1);
  });

  it('plain percentages resolve without needing the extent', () => {
    expect(resolveRangeBoundary(pct(25), true, null, null)).toBe(0.25);
  });

  it('px offsets resolve against the timeline extent', () => {
    expect(
      resolveRangeBoundary(
        { rangeName: null, value: 100, unit: 'px', calcRaw: null },
        true,
        400,
        null
      )
    ).toBe(0.25);
  });

  it('px offsets without a known extent cannot resolve yet', () => {
    expect(
      resolveRangeBoundary(
        { rangeName: null, value: 100, unit: 'px', calcRaw: null },
        true,
        null,
        null
      )
    ).toBeNull();
  });

  it('named-range percentages measure from the start of the named segment', () => {
    // entry segment [100px, 200px] of a 400px timeline; entry 50% =
    // 100 + 0.5 * (200 - 100) = 150px = 0.375 of the timeline.
    expect(
      resolveRangeBoundary({ rangeName: 'entry', value: 50, unit: '%', calcRaw: null }, true, 400, {
        entry: { startPx: 100, endPx: 200 },
      })
    ).toBe(0.375);
  });

  it('named ranges the timeline does not define cannot resolve', () => {
    expect(
      resolveRangeBoundary(
        { rangeName: 'entry', value: 0, unit: '%', calcRaw: null },
        true,
        400,
        null
      )
    ).toBeNull();
    expect(
      resolveRangeBoundary(
        { rangeName: 'entry', value: 0, unit: '%', calcRaw: null },
        true,
        400,
        {}
      )
    ).toBeNull();
  });

  it('deferred mixed calc() resolves percentages against the segment length', () => {
    // calc(100% - 100px) against the whole 400px timeline: 400 - 100 =
    // 300px = 0.75.
    expect(
      resolveRangeBoundary(
        { rangeName: null, value: 0, unit: '%', calcRaw: 'calc(100% - 100px)' },
        true,
        400,
        null
      )
    ).toBe(0.75);
  });

  it('deferred calc() inside a named range resolves against that segment', () => {
    // entry [100, 200]: calc(0% + 50px) = 100 + 50 = 150px = 0.375.
    expect(
      resolveRangeBoundary(
        { rangeName: 'entry', value: 0, unit: '%', calcRaw: 'calc(0% + 50px)' },
        true,
        400,
        { entry: { startPx: 100, endPx: 200 } }
      )
    ).toBe(0.375);
  });

  it('calc() at the exact segment endpoints lands on the segment bounds', () => {
    // entry [100, 200] of 400px: calc(0% + 0px) = 100px = 0.25 (segment
    // start); calc(100% - 0px) = 200px = 0.5 (segment end).
    const named = { entry: { startPx: 100, endPx: 200 } };
    expect(
      resolveRangeBoundary(
        { rangeName: 'entry', value: 0, unit: '%', calcRaw: 'calc(0% + 0px)' },
        true,
        400,
        named
      )
    ).toBe(0.25);
    expect(
      resolveRangeBoundary(
        { rangeName: 'entry', value: 0, unit: '%', calcRaw: 'calc(100% - 0px)' },
        true,
        400,
        named
      )
    ).toBe(0.5);
  });

  it('calc() folding to a non-length unit cannot resolve (angle is not an offset)', () => {
    expect(
      resolveRangeBoundary(
        { rangeName: null, value: 0, unit: '%', calcRaw: 'calc(45deg + 45deg)' },
        true,
        400,
        null
      )
    ).toBeNull();
  });

  it('deferred calc() without a known extent cannot resolve yet', () => {
    expect(
      resolveRangeBoundary(
        { rangeName: null, value: 0, unit: '%', calcRaw: 'calc(50% - 10px)' },
        true,
        null,
        null
      )
    ).toBeNull();
  });
});
