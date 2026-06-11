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
          "rangeEnd": "normal",
          "rangeStart": "normal",
          "timeline": {
            "kind": "auto",
          },
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
        "rangeEnd": "normal",
        "rangeStart": "normal",
        "timeline": {
          "kind": "auto",
        },
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
          "rangeEnd": "normal",
          "rangeStart": "normal",
          "timeline": {
            "kind": "auto",
          },
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
          "rangeEnd": "normal",
          "rangeStart": "normal",
          "timeline": {
            "kind": "auto",
          },
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

  // https://drafts.csswg.org/css-transitions-1/#transition-property-property
  describe('CSS Transitions 1 §2.1 (editor draft; transition-property)', () => {
    // Propdef table: Initial: all
    it('defaults transitionProperty to "all" when only transition-duration is set', () => {
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
  });

  // https://drafts.csswg.org/css-transitions-1/#transition-shorthand-property
  describe('CSS Transitions 1 §2.5 (editor draft; transition shorthand)', () => {
    // "Note that order is important within the items in this property:
    // the first value that can be parsed as a time is assigned to the
    // transition-duration,
    // and the second value that can be parsed as a time is assigned to
    // transition-delay."
    it('first <time> is duration; second <time> is delay', () => {
      const r = toNativeStyles('transition: opacity 200ms linear 50ms;', stubStyleSheet);
      expect(r.transitions![0].durationMs).toBe(200);
      expect(r.transitions![0].delayMs).toBe(50);
    });

    // "If there is more than one <single-transition> in the shorthand,
    // and any of the transitions has
    // none as the <single-transition-property>,
    // then the declaration is invalid."
    it('rejects comma list when any segment uses none as the transition-property', () => {
      expect(
        toNativeStyles('transition: opacity 1s, none 2s;', stubStyleSheet).transitions
      ).toBeUndefined();
      expect(
        toNativeStyles('transition: opacity 1s, none;', stubStyleSheet).transitions
      ).toBeUndefined();
      expect(
        toNativeStyles('transition: none, opacity 1s;', stubStyleSheet).transitions
      ).toBeUndefined();
    });

    it('accepts comma list without none as a transition-property', () => {
      const r = toNativeStyles('transition: opacity 1s, transform 2s;', stubStyleSheet);
      expect(r.transitions).toHaveLength(2);
      expect(r.transitions![0].property).toBe('opacity');
      expect(r.transitions![1].property).toBe('transform');
    });
  });

  // https://drafts.csswg.org/css-transitions-1/#list-matching
  describe('CSS Transitions 1 (editor draft; coordinated transition lists, #list-matching)', () => {
    // "If one of the other properties doesn’t have enough
    // comma-separated values to match the number of values of
    // transition-property, the user agent must calculate its used value by
    // repeating the list of values until there are enough."
    it('repeats a shorter transition-duration list to match transition-property', () => {
      const r = toNativeStyles(
        'transition-property: opacity, left, top, width; transition-duration: 2s, 1s;',
        stubStyleSheet
      );
      expect(r.transitions).toHaveLength(4);
      expect(r.transitions!.map(t => [t.property, t.durationMs])).toEqual([
        ['opacity', 2000],
        ['left', 1000],
        ['top', 2000],
        ['width', 1000],
      ]);
    });

    it('pairs transition-delay list entries with transition-property when lengths match', () => {
      const r = toNativeStyles(
        'transition-property: opacity, transform; transition-duration: 100ms, 200ms; transition-delay: 10ms, 30ms;',
        stubStyleSheet
      );
      expect(r.transitions).toHaveLength(2);
      expect(r.transitions![0].delayMs).toBe(10);
      expect(r.transitions![1].delayMs).toBe(30);
    });

    it('cycles a single transition-delay across paired transition-property items', () => {
      const r = toNativeStyles(
        'transition-property: opacity, transform; transition-duration: 100ms, 200ms; transition-delay: 25ms;',
        stubStyleSheet
      );
      expect(r.transitions![0].delayMs).toBe(25);
      expect(r.transitions![1].delayMs).toBe(25);
    });
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

  // https://drafts.csswg.org/css-animations-1/#timing-functions
  // https://drafts.csswg.org/css-animations-1/#animation-timing-function
  describe('CSS Animations 1 §3.1 / §4.3 (editor draft; keyframe timing functions)', () => {
    // §3.1: "A keyframe style rule may also declare the timing function that is to be used as the animation moves to the next keyframe."
    it('§3.1: timing on an end-only `100%` keyframe is ignored (no stored per-frame easing)', () => {
      const r = toNativeStyles(
        'animation: k 1s linear; @keyframes k { 0% { opacity: 0; animation-timing-function: ease-out; } 100% { opacity: 1; animation-timing-function: ease-in; } }',
        stubStyleSheet
      );
      const frames = r.keyframes![0].frames;
      const end = frames.find(f => f.stops.join() === '100%')!;
      expect(end.decls).not.toHaveProperty('animationTimingFunction');
      expect(end.easing).toBeUndefined();
      const start = frames.find(f => f.stops.join() === '0%')!;
      expect(start.easing).toMatchObject({ kind: 'cubic-bezier', p: [0, 0, 0.58, 1] });
    });

    // §3.1: same paragraph: "A timing function specified on the to or 100% keyframe is ignored."
    it('§3.1: timing on an end-only `to` keyframe is ignored (no stored per-frame easing)', () => {
      const r = toNativeStyles(
        'animation: k 1s; @keyframes k { from { opacity: 0; } to { opacity: 1; animation-timing-function: ease-in; } }',
        stubStyleSheet
      );
      const toFrame = r.keyframes![0].frames.find(f => f.stops.join() === 'to')!;
      expect(toFrame.easing).toBeUndefined();
      expect(toFrame.decls).not.toHaveProperty('animationTimingFunction');
    });

    // §3.1: mixed stops include a non-end selector, so the frame is not "the to/100% keyframe" for ignore purposes.
    it('§3.1: `0%, 100%` shared frame is not end-only; declared timing is kept', () => {
      const r = toNativeStyles(
        'animation: k 1s; @keyframes k { 0%, 100% { opacity: 1; animation-timing-function: ease-in; } 50% { opacity: 0.5; } }',
        stubStyleSheet
      );
      const shared = r.keyframes![0].frames.find(
        f => f.stops.includes('0%') && f.stops.includes('100%')
      )!;
      expect(shared.easing).toMatchObject({ kind: 'cubic-bezier', p: [0.42, 0, 1, 1] });
    });

    // §4.3: "When specified in a keyframe, animation-timing-function defines the progression of the animation between the current keyframe and the next keyframe for the animating property in sorted keyframe selector order (which may be an implicit 100% keyframe)."
    it('§4.3: keyframe timing is stored on the originating stop for the segment toward the next keyframe', () => {
      const r = toNativeStyles(
        'animation: k 1s; @keyframes k { 0% { opacity: 0; animation-timing-function: steps(4, end); } 100% { opacity: 1; } }',
        stubStyleSheet
      );
      const f0 = r.keyframes![0].frames.find(f => f.stops.includes('0%'))!;
      expect(f0.easing).toEqual({ kind: 'steps', n: 4, jump: 'jump-end' });
      expect(f0.decls).not.toHaveProperty('animationTimingFunction');
      const f1 = r.keyframes![0].frames.find(f => f.stops.includes('100%'))!;
      expect(f1.easing).toBeUndefined();
    });
  });

  // https://drafts.csswg.org/css-animations-1/#animation-definition
  describe('CSS Animations 1 §4 (editor draft; coordinating list property group)', () => {
    // "These list-valued properties, which are all longhands of the animation shorthand,
    // form a coordinating list property group with animation-name as the coordinating list base property
    // and each item in the coordinated value list defining the properties of a single animation effect."
    it('§4: a single animation-delay entry cycles across paired animation-name items', () => {
      const r = toNativeStyles('animation: a 1s, b 2s; animation-delay: 100ms;', stubStyleSheet);
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].delayMs).toBe(100);
      expect(r.animations![1].delayMs).toBe(100);
    });

    it('§4: animation-delay list items pair with animation-name entries when lengths match', () => {
      const r = toNativeStyles(
        'animation: a 1s, b 2s; animation-delay: 50ms, 150ms;',
        stubStyleSheet
      );
      expect(r.animations![0].delayMs).toBe(50);
      expect(r.animations![1].delayMs).toBe(150);
    });

    it('§4: a single animation-fill-mode entry cycles across paired animation-name items', () => {
      const r = toNativeStyles(
        'animation: a 1s, b 1s; animation-fill-mode: forwards;',
        stubStyleSheet
      );
      expect(r.animations![0].fillMode).toBe('forwards');
      expect(r.animations![1].fillMode).toBe('forwards');
    });

    it('§4: animation-timing-function list entries pair with animation-name when list lengths match', () => {
      const r = toNativeStyles(
        'animation: a 1s, b 1s; animation-timing-function: ease-in, ease-out;',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].timingFunction).toEqual({
        kind: 'cubic-bezier',
        p: [0.42, 0, 1, 1],
      });
      expect(r.animations![1].timingFunction).toEqual({
        kind: 'cubic-bezier',
        p: [0, 0, 0.58, 1],
      });
    });

    it('§4: a shorter animation-timing-function list repeats to match animation-name length', () => {
      const r = toNativeStyles(
        'animation: a 1s, b 1s, c 1s; animation-timing-function: linear, steps(2, jump-end);',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(3);
      expect(r.animations![0].timingFunction).toEqual({ kind: 'linear' });
      expect(r.animations![1].timingFunction).toEqual({
        kind: 'steps',
        n: 2,
        jump: 'jump-end',
      });
      expect(r.animations![2].timingFunction).toEqual({ kind: 'linear' });
    });
  });

  // https://drafts.csswg.org/css-animations-1/#animation-iteration-count
  describe('CSS Animations 1 §4.4 (editor draft; animation-iteration-count)', () => {
    // "Initial: 1"
    it('§4.4: omits longhand defaults iterationCount to 1', () => {
      const r = toNativeStyles('animation: x 1s;', stubStyleSheet);
      expect(r.animations![0].iterationCount).toBe(1);
    });

    // "<single-animation-iteration-count> = infinite | <number [0,∞]>"
    it.each([
      ['infinite', Infinity],
      ['infinity', Infinity],
      ['3', 3],
      ['2.5', 2.5],
    ] as const)('§4.4: shorthand accepts %s for iteration count', (text, expected) => {
      const r = toNativeStyles(`animation: k 1s ${text};`, stubStyleSheet);
      expect(r.animations![0].iterationCount).toBe(expected);
    });

    it('§4.4: iteration slot accepts calc() containing infinity keyword', () => {
      const r = toNativeStyles('animation: k 1s calc(infinity);', stubStyleSheet);
      expect(r.animations![0].iterationCount).toBe(Infinity);
    });
  });

  // https://drafts.csswg.org/css-animations-1/#animation-direction
  describe('CSS Animations 1 §4.5 (editor draft; animation-direction)', () => {
    // "<single-animation-direction> = normal | reverse | alternate | alternate-reverse"
    it.each(['normal', 'reverse', 'alternate', 'alternate-reverse'] as const)(
      '§4.5: shorthand accepts %s',
      dir => {
        const r = toNativeStyles(`animation: spin 1s linear ${dir};`, stubStyleSheet);
        expect(r.animations![0].direction).toBe(dir);
      }
    );
  });

  // https://drafts.csswg.org/css-animations-1/#typedef-single-animation-fill-mode
  describe('CSS Animations 1 §4.8 (editor draft; animation-fill-mode)', () => {
    // "<single-animation-fill-mode> = none | forwards | backwards | both"
    it.each(['none', 'forwards', 'backwards', 'both'] as const)(
      '§4.8: shorthand accepts %s',
      fill => {
        const r = toNativeStyles(`animation: spin 1s linear ${fill};`, stubStyleSheet);
        expect(r.animations![0].fillMode).toBe(fill);
      }
    );
  });

  // https://drafts.csswg.org/css-animations-1/#animation
  describe('CSS Animations 1 §4.9 (editor draft; animation shorthand)', () => {
    // "Order is important within each animation definition: the first value in each <single-animation> that can be parsed as a <time> is assigned to the animation-duration, and the second value in each <single-animation> that can be parsed as a <time> is assigned to animation-delay."
    it('§4.9: first <time> is duration; second <time> is delay', () => {
      const r = toNativeStyles('animation: fade 200ms linear 50ms;', stubStyleSheet);
      expect(r.animations![0].durationMs).toBe(200);
      expect(r.animations![0].delayMs).toBe(50);
    });

    // "When parsing, keywords that are valid for properties other than animation-name whose values were not found earlier in the shorthand must be accepted for those properties rather than for animation-name."
    it('§4.9: fill-mode keyword is bound before the keyframes-name (forwards is not the animation name)', () => {
      const r = toNativeStyles('animation: 1s linear forwards spin;', stubStyleSheet);
      expect(r.animations![0].name).toBe('spin');
      expect(r.animations![0].fillMode).toBe('forwards');
    });
  });

  // https://drafts.csswg.org/css-animations-2/#animation-composition
  describe('CSS Animations 2 §4.8 (editor draft; animation-composition)', () => {
    // Propdef: Value: <single-animation-composition>#
    // "<single-animation-composition> = replace | add | accumulate"
    // Initial: replace
    it.each([
      ['replace', 'replace'],
      ['add', 'add'],
      ['accumulate', 'accumulate'],
    ] as const)('parses animation-composition: %s', (keyword, expected) => {
      const r = toNativeStyles(
        `animation: x 1s; animation-composition: ${keyword};`,
        stubStyleSheet
      );
      expect(r.animations![0].composition).toBe(expected);
    });

    it('defaults composition to replace when animation-composition is omitted', () => {
      const r = toNativeStyles('animation: x 1s;', stubStyleSheet);
      expect(r.animations![0].composition).toBe('replace');
    });

    // Coordinating list: a shorter animation-composition list cycles per
    // CSS Values "coordinating list property group" rules (same model as
    // `animation-*` longhands in CSS Animations 1 §4).
    it('cycles a single animation-composition keyword across paired animation names', () => {
      const r = toNativeStyles(
        'animation: a 1s, b 2s; animation-composition: add;',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].composition).toBe('add');
      expect(r.animations![1].composition).toBe('add');
    });
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
