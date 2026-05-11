import { resetNativeStyleCache, toNativeStyles } from '../../../models/compileNative';
import { resetWarningsForTest } from '../../transform/dev';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

beforeEach(() => {
  resetNativeStyleCache();
  resetWarningsForTest();
});

describe('animation/transition shorthand parsing', () => {
  it('parses a basic transition shorthand', () => {
    const r = toNativeStyles(
      'background-color: red; transition: background-color 280ms ease-out;',
      stubStyleSheet
    );
    expect(r.transitions).toMatchInlineSnapshot(`
      [
        {
          "behavior": "normal",
          "delayMs": 0,
          "durationMs": 280,
          "property": "backgroundColor",
          "timingFunction": {
            "kind": "cubic-bezier",
            "p": [
              0,
              0,
              0.58,
              1,
            ],
          },
        },
      ]
    `);
    expect(r.base).toMatchInlineSnapshot(`
      {
        "backgroundColor": "red",
      }
    `);
  });

  it('parses an animation shorthand with iteration count + direction', () => {
    const r = toNativeStyles(
      'animation: pulse 700ms ease-in-out infinite alternate;',
      stubStyleSheet
    );
    expect(r.animations).toMatchInlineSnapshot(`
      [
        {
          "composition": "replace",
          "delayMs": 0,
          "direction": "alternate",
          "durationMs": 700,
          "fillMode": "none",
          "iterationCount": Infinity,
          "name": "pulse",
          "playState": "running",
          "timingFunction": {
            "kind": "cubic-bezier",
            "p": [
              0.42,
              0,
              0.58,
              1,
            ],
          },
        },
      ]
    `);
  });

  it('parses CSS `ease` keyword to spec-correct bezier (not RN Easing.ease)', () => {
    const r = toNativeStyles('transition: opacity 200ms ease;', stubStyleSheet);
    // Confirms the divergence trap: CSS `ease` = (0.25, 0.1, 0.25, 1),
    // not (0.42, 0, 1, 1) which is what RN Easing.ease maps to.
    expect(r.transitions![0].timingFunction).toMatchInlineSnapshot(`
      {
        "kind": "cubic-bezier",
        "p": [
          0.25,
          0.1,
          0.25,
          1,
        ],
      }
    `);
  });

  it('parses cubic-bezier(...) easing', () => {
    const r = toNativeStyles(
      'transition: opacity 200ms cubic-bezier(0.1, 0.2, 0.3, 0.4);',
      stubStyleSheet
    );
    expect(r.transitions![0].timingFunction).toMatchInlineSnapshot(`
      {
        "kind": "cubic-bezier",
        "p": [
          0.1,
          0.2,
          0.3,
          0.4,
        ],
      }
    `);
  });

  it('parses steps(N, jump-type) easing', () => {
    const r = toNativeStyles('transition: opacity 200ms steps(4, jump-end);', stubStyleSheet);
    expect(r.transitions![0].timingFunction).toMatchInlineSnapshot(`
      {
        "jump": "jump-end",
        "kind": "steps",
        "n": 4,
      }
    `);
  });

  it('parses negative animation-delay (skip-ahead)', () => {
    const r = toNativeStyles('animation: foo 1s -500ms;', stubStyleSheet);
    expect(r.animations![0]).toMatchInlineSnapshot(`
      {
        "composition": "replace",
        "delayMs": -500,
        "direction": "normal",
        "durationMs": 1000,
        "fillMode": "none",
        "iterationCount": 1,
        "name": "foo",
        "playState": "running",
        "timingFunction": {
          "kind": "cubic-bezier",
          "p": [
            0.25,
            0.1,
            0.25,
            1,
          ],
        },
      }
    `);
  });

  it('parses fractional iteration count', () => {
    const r = toNativeStyles('animation: bar 1s 2.5;', stubStyleSheet);
    expect(r.animations![0].iterationCount).toBe(2.5);
  });

  // animation-iteration-count is the one slot where CSS Values 4 §10.7.2
  // `infinity` survives instead of being rejected. CSS3 already gives it
  // the `infinite` keyword for the same effect; we accept either spelling
  // and the calc() form so authors using v7's modern math context don't
  // hit a wall at the iteration-count slot.
  describe('infinity → infinite alias (CSS Values 4 §10.7.2)', () => {
    it('accepts the bare `infinity` keyword', () => {
      const r = toNativeStyles('animation: bar 1s infinity;', stubStyleSheet);
      expect(r.animations![0].iterationCount).toBe(Infinity);
    });

    it('accepts calc(infinity)', () => {
      const r = toNativeStyles('animation: bar 1s calc(infinity);', stubStyleSheet);
      expect(r.animations![0].iterationCount).toBe(Infinity);
    });

    it('accepts calc(infinity * 2)', () => {
      const r = toNativeStyles('animation: bar 1s calc(infinity * 2);', stubStyleSheet);
      expect(r.animations![0].iterationCount).toBe(Infinity);
    });

    it('rejects calc(-infinity);iteration count must be non-negative', () => {
      // `getShorthand` returns null → transformDecl emits {} for the
      // animation-iteration-count slot, dropping the declaration. The
      // animation shorthand path falls back to its default iterationCount.
      const r = toNativeStyles('animation: foo 1s calc(-infinity);', stubStyleSheet);
      // Whole shorthand fails parse, no animation emitted.
      expect(r.animations).toBeUndefined();
    });

    it('rejects calc(NaN)', () => {
      const r = toNativeStyles('animation: foo 1s calc(NaN);', stubStyleSheet);
      expect(r.animations).toBeUndefined();
    });
  });

  it('parses multi-animation comma list', () => {
    const r = toNativeStyles('animation: a 200ms ease-in, b 400ms ease-out 100ms;', stubStyleSheet);
    expect(r.animations).toMatchInlineSnapshot(`
      [
        {
          "composition": "replace",
          "delayMs": 0,
          "direction": "normal",
          "durationMs": 200,
          "fillMode": "none",
          "iterationCount": 1,
          "name": "a",
          "playState": "running",
          "timingFunction": {
            "kind": "cubic-bezier",
            "p": [
              0.42,
              0,
              1,
              1,
            ],
          },
        },
        {
          "composition": "replace",
          "delayMs": 100,
          "direction": "normal",
          "durationMs": 400,
          "fillMode": "none",
          "iterationCount": 1,
          "name": "b",
          "playState": "running",
          "timingFunction": {
            "kind": "cubic-bezier",
            "p": [
              0,
              0,
              0.58,
              1,
            ],
          },
        },
      ]
    `);
  });

  it('cycles longhand list-length per spec', () => {
    const r = toNativeStyles(
      'animation-name: a, b, c; animation-duration: 100ms, 200ms;',
      stubStyleSheet
    );
    expect(r.animations).toHaveLength(3);
    expect(r.animations!.map(a => [a.name, a.durationMs])).toMatchInlineSnapshot(`
      [
        [
          "a",
          100,
        ],
        [
          "b",
          200,
        ],
        [
          "c",
          100,
        ],
      ]
    `);
  });

  it('defaults transitionProperty to "all" when only longhand-duration set', () => {
    const r = toNativeStyles('transition-duration: 200ms;', stubStyleSheet);
    expect(r.transitions).toMatchInlineSnapshot(`
      [
        {
          "behavior": "normal",
          "delayMs": 0,
          "durationMs": 200,
          "property": "all",
          "timingFunction": {
            "kind": "cubic-bezier",
            "p": [
              0.25,
              0.1,
              0.25,
              1,
            ],
          },
        },
      ]
    `);
  });

  it('parses transition-behavior: allow-discrete', () => {
    const r = toNativeStyles('transition: display 200ms allow-discrete;', stubStyleSheet);
    expect(r.transitions![0].behavior).toBe('allow-discrete');
  });

  it('does not set animations/transitions when none declared', () => {
    const r = toNativeStyles('color: red;', stubStyleSheet);
    expect(r.animations).toBeUndefined();
    expect(r.transitions).toBeUndefined();
  });

  it('extracts per-frame animation-timing-function from keyframe block', () => {
    const r = toNativeStyles(
      'animation: foo 1s; @keyframes foo { 0% { opacity: 0; animation-timing-function: ease-out; } 100% { opacity: 1; } }',
      stubStyleSheet
    );
    expect(r.keyframes).toHaveLength(1);
    expect(r.keyframes[0].frames[0].easing).toMatchInlineSnapshot(`
      {
        "kind": "cubic-bezier",
        "p": [
          0,
          0,
          0.58,
          1,
        ],
      }
    `);
    expect(r.keyframes[0].frames[0].decls).not.toHaveProperty('animationTimingFunction');
    expect(r.keyframes[0].frames[1].easing).toBeUndefined();
  });

  it('extracts different per-frame easings from each keyframe stop', () => {
    const r = toNativeStyles(
      'animation: bar 1s; @keyframes bar { 0% { opacity: 0; animation-timing-function: ease-in; } 50% { opacity: 0.5; animation-timing-function: linear; } 100% { opacity: 1; } }',
      stubStyleSheet
    );
    expect(r.keyframes[0].frames[0].easing).toMatchInlineSnapshot(`
      {
        "kind": "cubic-bezier",
        "p": [
          0.42,
          0,
          1,
          1,
        ],
      }
    `);
    expect(r.keyframes[0].frames[1].easing).toMatchInlineSnapshot(`
      {
        "kind": "linear",
      }
    `);
    expect(r.keyframes[0].frames[2].easing).toBeUndefined();
  });

  it('produces empty decls when animation-timing-function is the only declaration', () => {
    const r = toNativeStyles(
      'animation: baz 1s; @keyframes baz { 0% { animation-timing-function: ease-out; } 100% { opacity: 1; } }',
      stubStyleSheet
    );
    expect(r.keyframes[0].frames[0].decls).toMatchInlineSnapshot(`{}`);
    expect(r.keyframes[0].frames[0].easing).toBeDefined();
  });

  // Dynamic `animation-play-state` (CSS Animations §4.6). The longhand
  // is read out of the same `base` dict as every other animation field,
  // so a prop-driven interpolation flowing into `animation-play-state`
  // produces a fresh descriptor each render. The adapter's prev/next
  // play-state diff (`src/native/animation/index.ts`) then drives the
  // pause / resume side-effects without parser-side changes.
  describe('animation-play-state dynamism', () => {
    it('reads `running` from the longhand', () => {
      const r = toNativeStyles(
        'animation: pulse 1s; animation-play-state: running;',
        stubStyleSheet
      );
      expect(r.animations![0].playState).toBe('running');
    });

    it('reads `paused` from the longhand', () => {
      const r = toNativeStyles(
        'animation: pulse 1s; animation-play-state: paused;',
        stubStyleSheet
      );
      expect(r.animations![0].playState).toBe('paused');
    });

    it('produces distinct descriptors when only the play-state differs', () => {
      // Two CSS strings that differ only in play-state must produce
      // two cache entries with different `playState` values. This is
      // the load-bearing assertion for dynamic prop-driven pause: the
      // styled-components shell stitches the interpolation result into
      // the source string before reaching `toNativeStyles`, so the
      // cache key naturally varies on the resolved play-state.
      const running = toNativeStyles(
        'animation: pulse 1s; animation-play-state: running;',
        stubStyleSheet
      );
      const paused = toNativeStyles(
        'animation: pulse 1s; animation-play-state: paused;',
        stubStyleSheet
      );
      expect(running.animations![0].playState).toBe('running');
      expect(paused.animations![0].playState).toBe('paused');
    });
  });
});
