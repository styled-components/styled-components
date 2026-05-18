/**
 * End-to-end coverage for the native animation + transition compile path
 * (`toNativeStyles`): shorthand parsing, longhand coordinating lists, cascade
 * ordering inside one stylesheet string, and keyframes collection.
 *
 * Spec anchors use editor drafts on drafts.csswg.org. Verbatim normative
 * quotes live next to the narrowest `describe` / `it` that enforces them.
 */
import { resetNativeStyleCache, toNativeStyles } from '../../../models/compileNative';
import { resetWarningsForTest } from '../../transform/dev';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

beforeEach(() => {
  resetNativeStyleCache();
  resetWarningsForTest();
});

describe('animations and transitions (compile pipeline)', () => {
  describe('transition shorthand', () => {
    // https://drafts.csswg.org/css-transitions-1/#single-transition
    // "<single-transition> = [ none | <single-transition-property> ] || …"
    it('single `transition: none` is valid (one segment, none as property)', () => {
      const r = toNativeStyles('transition: none;', stubStyleSheet);
      expect(r.transitions).toEqual([
        expect.objectContaining({
          property: 'none',
          durationMs: 0,
          delayMs: 0,
          behavior: 'normal',
        }),
      ]);
    });

    it('accepts `all` as the transition-property keyword', () => {
      const r = toNativeStyles('transition: all 150ms linear;', stubStyleSheet);
      expect(r.transitions).toHaveLength(1);
      expect(r.transitions![0].property).toBe('all');
      expect(r.transitions![0].durationMs).toBe(150);
      expect(r.transitions![0].timingFunction).toEqual({ kind: 'linear' });
    });

    // Order note: first <time> duration, second delay (Transitions 1 §2.5).
    it('allows easing before duration tokens when still unambiguous', () => {
      const r = toNativeStyles('transition: opacity ease 300ms 40ms;', stubStyleSheet);
      expect(r.transitions![0].property).toBe('opacity');
      expect(r.transitions![0].durationMs).toBe(300);
      expect(r.transitions![0].delayMs).toBe(40);
      expect(r.transitions![0].timingFunction).toEqual({
        kind: 'cubic-bezier',
        p: [0.25, 0.1, 0.25, 1],
      });
    });
  });

  // https://drafts.csswg.org/css-transitions-1/#list-matching
  describe('transition longhands (coordinated lists)', () => {
    // Same list-matching prose as `smoke.test.ts`: shorter lists repeat.
    it('pairs transition-timing-function with transition-property then repeats', () => {
      const r = toNativeStyles(
        'transition-property: opacity, margin-top, border-color; transition-duration: 50ms, 80ms; transition-timing-function: linear, steps(2, jump-end);',
        stubStyleSheet
      );
      expect(r.transitions).toHaveLength(3);
      expect(r.transitions![0].timingFunction).toEqual({ kind: 'linear' });
      expect(r.transitions![1].timingFunction).toEqual({
        kind: 'steps',
        n: 2,
        jump: 'jump-end',
      });
      expect(r.transitions![2].timingFunction).toEqual({ kind: 'linear' });
    });

    it('coordinates transition-behavior across multiple transition-property entries', () => {
      const r = toNativeStyles(
        'transition-property: opacity, transform; transition-duration: 100ms, 200ms; transition-behavior: normal, allow-discrete;',
        stubStyleSheet
      );
      expect(r.transitions).toHaveLength(2);
      expect(r.transitions![0].behavior).toBe('normal');
      expect(r.transitions![1].behavior).toBe('allow-discrete');
    });

    it('cycles a single transition-behavior keyword for two properties', () => {
      const r = toNativeStyles(
        'transition-property: opacity, transform; transition-duration: 100ms, 200ms; transition-behavior: allow-discrete;',
        stubStyleSheet
      );
      expect(r.transitions![0].behavior).toBe('allow-discrete');
      expect(r.transitions![1].behavior).toBe('allow-discrete');
    });
  });

  // https://drafts.csswg.org/css-animations-1/#typedef-single-animation
  describe('animation shorthand', () => {
    it('`animation: none` yields a single effect with name none', () => {
      const r = toNativeStyles('animation: none;', stubStyleSheet);
      expect(r.animations).toEqual([
        expect.objectContaining({
          name: 'none',
          durationMs: 0,
          playState: 'running',
        }),
      ]);
    });

    it('comma list with two named animations keeps distinct names and timings', () => {
      const r = toNativeStyles(
        'animation: fade 300ms linear 10ms, rise 600ms ease-out 20ms;',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(2);
      expect(r.animations!.map(a => [a.name, a.durationMs, a.delayMs])).toEqual([
        ['fade', 300, 10],
        ['rise', 600, 20],
      ]);
    });
  });

  // https://drafts.csswg.org/css-animations-1/#animation-definition
  describe('animation longhands (coordinated lists)', () => {
    // "… animation-name as the coordinating list base property …"
    it('pairs animation-duration entries with animation-name', () => {
      const r = toNativeStyles(
        'animation-name: x, y; animation-duration: 120ms, 240ms; animation-timing-function: linear;',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(2);
      expect(r.animations!.map(a => [a.name, a.durationMs])).toEqual([
        ['x', 120],
        ['y', 240],
      ]);
    });

    it('pairs animation-play-state with each animation-name', () => {
      const r = toNativeStyles(
        'animation-name: spin, pulse; animation-duration: 1s, 1s; animation-play-state: running, paused;',
        stubStyleSheet
      );
      expect(r.animations![0].playState).toBe('running');
      expect(r.animations![1].playState).toBe('paused');
    });

    it('repeats a shorter animation-direction list to match animation-name length', () => {
      const r = toNativeStyles(
        'animation-name: a, b, c; animation-duration: 1s, 1s, 1s; animation-direction: alternate, reverse;',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(3);
      expect(r.animations!.map(a => a.direction)).toEqual(['alternate', 'reverse', 'alternate']);
    });

    it('pairs animation-iteration-count list with animation-name', () => {
      const r = toNativeStyles(
        'animation-name: a, b; animation-duration: 1s, 1s; animation-iteration-count: 2, 3;',
        stubStyleSheet
      );
      expect(r.animations![0].iterationCount).toBe(2);
      expect(r.animations![1].iterationCount).toBe(3);
    });

    it('pairs animation-fill-mode list with animation-name', () => {
      const r = toNativeStyles(
        'animation-name: a, b; animation-duration: 1s, 1s; animation-fill-mode: forwards, both;',
        stubStyleSheet
      );
      expect(r.animations![0].fillMode).toBe('forwards');
      expect(r.animations![1].fillMode).toBe('both');
    });

    it('pairs animation-composition list with animation-name', () => {
      const r = toNativeStyles(
        'animation-name: a, b; animation-duration: 1s, 1s; animation-composition: add, accumulate;',
        stubStyleSheet
      );
      expect(r.animations![0].composition).toBe('add');
      expect(r.animations![1].composition).toBe('accumulate');
    });
  });

  describe('declaration order inside one string (cascade)', () => {
    it('later animation-delay replaces delays from an earlier animation shorthand', () => {
      const r = toNativeStyles(
        'animation: a 1s 10ms linear, b 2s 20ms linear; animation-delay: 100ms;',
        stubStyleSheet
      );
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].delayMs).toBe(100);
      expect(r.animations![1].delayMs).toBe(100);
    });

    it('later transition-duration overrides an earlier transition shorthand duration', () => {
      const r = toNativeStyles(
        'transition: opacity 50ms linear; transition-duration: 400ms;',
        stubStyleSheet
      );
      expect(r.transitions).toHaveLength(1);
      expect(r.transitions![0].property).toBe('opacity');
      expect(r.transitions![0].durationMs).toBe(400);
    });
  });

  describe('keyframes collection with multiple animations', () => {
    it('collects two @keyframes blocks referenced by one rule', () => {
      const r = toNativeStyles(
        `animation: k1 1s linear, k2 1s linear;
         @keyframes k1 { from { opacity: 0; } to { opacity: 0.5; } }
         @keyframes k2 { from { transform: scale(0); } to { transform: scale(1); } }`,
        stubStyleSheet
      );
      expect(r.keyframes.map(k => k.name).sort()).toEqual(['k1', 'k2']);
      expect(r.animations).toHaveLength(2);
      expect(r.animations!.map(a => a.name)).toEqual(['k1', 'k2']);
    });
  });
});
