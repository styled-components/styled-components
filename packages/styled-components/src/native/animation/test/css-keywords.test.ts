import {
  CSS_EASING_KEYWORDS,
  evaluateCubicBezier,
  evaluateEasing,
  evaluateSteps,
  parseEasing,
  parseTimeToMs,
} from '../css-keywords';

describe('CSS easing keyword table', () => {
  it('maps `ease` to the spec-correct cubic-bezier coefficients', () => {
    // RN `Easing.ease` is `bezier(0.42, 0, 1, 1)`;the CSS `ease-in`
    // curve. This table exists to bypass that divergence trap.
    expect(CSS_EASING_KEYWORDS.ease).toMatchInlineSnapshot(`
      [
        0.25,
        0.1,
        0.25,
        1,
      ]
    `);
  });

  it('maps `ease-in` to (0.42, 0, 1, 1)', () => {
    expect(CSS_EASING_KEYWORDS['ease-in']).toEqual([0.42, 0, 1, 1]);
  });

  it('maps `ease-out` to (0, 0, 0.58, 1)', () => {
    expect(CSS_EASING_KEYWORDS['ease-out']).toEqual([0, 0, 0.58, 1]);
  });

  it('maps `ease-in-out` to (0.42, 0, 0.58, 1)', () => {
    expect(CSS_EASING_KEYWORDS['ease-in-out']).toEqual([0.42, 0, 0.58, 1]);
  });
});

describe('parseEasing', () => {
  it('parses linear keyword', () => {
    expect(parseEasing('linear')).toEqual({ kind: 'linear' });
  });

  it('parses step-start / step-end aliases', () => {
    expect(parseEasing('step-start')).toEqual({ kind: 'steps', n: 1, jump: 'jump-start' });
    expect(parseEasing('step-end')).toEqual({ kind: 'steps', n: 1, jump: 'jump-end' });
  });

  it('parses cubic-bezier(...)', () => {
    expect(parseEasing('cubic-bezier(0.1, 0.2, 0.3, 0.4)')).toEqual({
      kind: 'cubic-bezier',
      p: [0.1, 0.2, 0.3, 0.4],
    });
  });

  it('rejects cubic-bezier with x outside [0, 1]', () => {
    // Spec: x1 and x2 must be in [0, 1].
    expect(parseEasing('cubic-bezier(-0.1, 0, 1, 1)')).toBeNull();
    expect(parseEasing('cubic-bezier(0, 0, 1.1, 1)')).toBeNull();
  });

  it('accepts cubic-bezier with y outside [0, 1]', () => {
    // Spec: y values are unbounded.
    expect(parseEasing('cubic-bezier(0, -2, 1, 5)')).toEqual({
      kind: 'cubic-bezier',
      p: [0, -2, 1, 5],
    });
  });

  it('parses all four steps() jump-types', () => {
    expect(parseEasing('steps(4, jump-start)')).toEqual({
      kind: 'steps',
      n: 4,
      jump: 'jump-start',
    });
    expect(parseEasing('steps(4, jump-end)')).toEqual({ kind: 'steps', n: 4, jump: 'jump-end' });
    expect(parseEasing('steps(4, jump-none)')).toEqual({ kind: 'steps', n: 4, jump: 'jump-none' });
    expect(parseEasing('steps(4, jump-both)')).toEqual({ kind: 'steps', n: 4, jump: 'jump-both' });
  });

  it('accepts deprecated `start` / `end` aliases', () => {
    expect(parseEasing('steps(4, start)')).toEqual({ kind: 'steps', n: 4, jump: 'jump-start' });
    expect(parseEasing('steps(4, end)')).toEqual({ kind: 'steps', n: 4, jump: 'jump-end' });
  });

  it('defaults steps to jump-end when no second arg given', () => {
    expect(parseEasing('steps(4)')).toEqual({ kind: 'steps', n: 4, jump: 'jump-end' });
  });

  it('rejects invalid steps configurations', () => {
    expect(parseEasing('steps(0)')).toBeNull(); // n=0 invalid
    expect(parseEasing('steps(1, jump-none)')).toBeNull(); // n=1 + jump-none invalid
  });

  it('parses linear() multi-stop list', () => {
    const out = parseEasing('linear(0, 0.5, 1)') as any;
    expect(out.kind).toBe('linear-stops');
    expect(out.stops).toMatchInlineSnapshot(`
      [
        [
          0,
          0,
        ],
        [
          0.5,
          0.5,
        ],
        [
          1,
          1,
        ],
      ]
    `);
  });

  it('parses linear() with explicit position percentages', () => {
    const out = parseEasing('linear(0, 0.25 50%, 1)') as any;
    expect(out.stops).toMatchInlineSnapshot(`
      [
        [
          0,
          0,
        ],
        [
          0.5,
          0.25,
        ],
        [
          1,
          1,
        ],
      ]
    `);
  });

  it('parses linear() with multi-position stops', () => {
    // `0.5 25% 75%` should expand to two stops at the same Y.
    const out = parseEasing('linear(0, 0.5 25% 75%, 1)') as any;
    expect(out.stops).toMatchInlineSnapshot(`
      [
        [
          0,
          0,
        ],
        [
          0.25,
          0.5,
        ],
        [
          0.75,
          0.5,
        ],
        [
          1,
          1,
        ],
      ]
    `);
  });

  it('returns null for unparseable input', () => {
    expect(parseEasing('not-a-thing')).toBeNull();
    expect(parseEasing('')).toBeNull();
  });
});

describe('evaluateCubicBezier', () => {
  it('returns 0 at progress 0 and 1 at progress 1', () => {
    expect(evaluateCubicBezier(0.42, 0, 0.58, 1, 0)).toBe(0);
    expect(evaluateCubicBezier(0.42, 0, 0.58, 1, 1)).toBe(1);
  });

  it('produces expected midpoint output for ease-in-out', () => {
    // Symmetric curve: midpoint should be 0.5.
    const mid = evaluateCubicBezier(0.42, 0, 0.58, 1, 0.5);
    expect(mid).toBeCloseTo(0.5, 2);
  });
});

describe('evaluateSteps', () => {
  it('jump-end produces expected step levels', () => {
    // n=4, jump-end: outputs are 0, 0.25, 0.5, 0.75, 1 at boundaries.
    expect(evaluateSteps(4, 'jump-end', 0)).toBe(0);
    expect(evaluateSteps(4, 'jump-end', 0.24)).toBe(0);
    expect(evaluateSteps(4, 'jump-end', 0.25)).toBe(0.25);
    expect(evaluateSteps(4, 'jump-end', 0.99)).toBe(0.75);
    expect(evaluateSteps(4, 'jump-end', 1)).toBe(1);
  });

  it('jump-start produces expected step levels', () => {
    // n=4, jump-start: outputs are 0.25, 0.5, 0.75, 1 (jumps up at start).
    expect(evaluateSteps(4, 'jump-start', 0)).toBe(0.25);
    expect(evaluateSteps(4, 'jump-start', 0.5)).toBe(0.75);
    expect(evaluateSteps(4, 'jump-start', 1)).toBe(1);
  });

  it('jump-none distributes evenly between 0 and 1', () => {
    expect(evaluateSteps(3, 'jump-none', 0)).toBe(0);
    expect(evaluateSteps(3, 'jump-none', 0.5)).toBeCloseTo(0.5, 2);
    expect(evaluateSteps(3, 'jump-none', 1)).toBe(1);
  });
});

describe('evaluateEasing dispatch', () => {
  it('dispatches by kind', () => {
    expect(evaluateEasing({ kind: 'linear' }, 0.5)).toBe(0.5);
    expect(evaluateEasing({ kind: 'cubic-bezier', p: [0, 0, 1, 1] }, 0.5)).toBeCloseTo(0.5, 2);
    expect(evaluateEasing({ kind: 'steps', n: 2, jump: 'jump-end' }, 0.5)).toBe(0.5);
    expect(
      evaluateEasing(
        {
          kind: 'linear-stops',
          stops: [
            [0, 0],
            [1, 1],
          ],
        },
        0.5
      )
    ).toBe(0.5);
  });
});

describe('parseTimeToMs', () => {
  it('parses milliseconds', () => {
    expect(parseTimeToMs('500ms')).toBe(500);
  });
  it('parses seconds and converts to milliseconds', () => {
    expect(parseTimeToMs('0.5s')).toBe(500);
    expect(parseTimeToMs('2s')).toBe(2000);
  });
  it('passes through bare numbers (legacy RN convention)', () => {
    expect(parseTimeToMs('500')).toBe(500);
    expect(parseTimeToMs(500)).toBe(500);
  });
});
