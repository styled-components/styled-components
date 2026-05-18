/**
 * Reanimated 4 CSS-layer adapter: descriptor → style props. Uses an isolated
 * `jest.resetModules()` graph with a virtual `react-native-reanimated` mock,
 * then restores the default Animated adapter for other suites.
 */
import type { CompiledKeyframes } from '../../../models/compileNative';
import type { AnimationDescriptor, TransitionDescriptor } from '../types';
import type { ResolveEnv } from '../../transform/polyfills/resolvers';

const mockCubicBezier = jest.fn((a: number, b: number, c: number, d: number) => ({
  kind: 'mock-cubicBezier',
  a,
  b,
  c,
  d,
}));
const mockSteps = jest.fn((n: number, j: string) => ({ kind: 'mock-steps', n, j }));
const mockCreateAnimatedComponent = jest.fn((c: unknown) => c);

const testResolveEnv: ResolveEnv = {
  media: {
    width: 400,
    height: 800,
    colorScheme: 'light',
    reduceMotion: false,
    fontScale: 1,
    pixelRatio: 1,
  },
  container: { width: 200, height: 100 },
  theme: {},
  insets: { top: 44, right: 0, bottom: 34, left: 0 },
  rootFontSize: 16,
  fontSize: 16,
  lineHeight: 24,
  direction: 'ltr',
};

function easeOut(): TransitionDescriptor['timingFunction'] {
  return { kind: 'cubic-bezier', p: [0, 0, 0.58, 1] };
}

function easeDefault(): TransitionDescriptor['timingFunction'] {
  return { kind: 'cubic-bezier', p: [0.25, 0.1, 0.25, 1] };
}

function animDefaults(partial: Partial<AnimationDescriptor>): AnimationDescriptor {
  return {
    name: 'fade',
    durationMs: 1000,
    timingFunction: { kind: 'linear' },
    delayMs: 0,
    iterationCount: 1,
    direction: 'normal',
    fillMode: 'none',
    playState: 'running',
    composition: 'replace',
    ...partial,
  };
}

function transDefaults(partial: Partial<TransitionDescriptor>): TransitionDescriptor {
  return {
    property: 'opacity',
    durationMs: 200,
    timingFunction: easeDefault(),
    delayMs: 0,
    behavior: 'normal',
    ...partial,
  };
}

let mapDescriptors: (
  animations: AnimationDescriptor[] | undefined,
  transitions: TransitionDescriptor[] | undefined,
  ctx?: { keyframes?: CompiledKeyframes[]; env?: ResolveEnv }
) => Record<string, unknown>;

beforeAll(() => {
  jest.resetModules();
  jest.doMock(
    'react-native-reanimated',
    () => ({
      __esModule: true,
      default: {
        createAnimatedComponent: mockCreateAnimatedComponent,
      },
      cubicBezier: mockCubicBezier,
      steps: mockSteps,
      linear: jest.fn((...stops: unknown[]) => ({ kind: 'mock-linear', stops })),
    }),
    { virtual: true }
  );
  ({
    __mapDescriptorsToCSSLayerForTests: mapDescriptors,
  } = require('../../reanimated/mapDescriptorsToCSSLayerForTests'));
});

afterAll(() => {
  jest.resetModules();
  require('../../animation');
});

beforeEach(() => {
  mockCubicBezier.mockClear();
  mockSteps.mockClear();
  mockCreateAnimatedComponent.mockClear();
});

describe('reanimated adapter mapDescriptorsToCSSLayer', () => {
  it('returns an empty object when there are no animations or transitions', () => {
    expect(mapDescriptors(undefined, undefined)).toEqual({});
  });

  it('does not emit animation props without keyframes + env (Reanimated rejects string names)', () => {
    const out = mapDescriptors([animDefaults({ name: 'fade' })], undefined);
    expect(out).not.toHaveProperty('animationName');
    expect(out).not.toHaveProperty('animationDuration');
  });

  it('maps a single transition and omits transitionBehavior when behavior is normal', () => {
    const out = mapDescriptors(undefined, [transDefaults({ timingFunction: easeOut() })]);
    expect(out.transitionProperty).toBe('opacity');
    expect(out.transitionDuration).toBe(200);
    expect(out.transitionDelay).toBe(0);
    expect(mockCubicBezier).toHaveBeenCalledWith(0, 0, 0.58, 1);
    expect(out).not.toHaveProperty('transitionBehavior');
  });

  it('includes transitionBehavior only for allow-discrete', () => {
    const out = mapDescriptors(undefined, [
      transDefaults({ behavior: 'allow-discrete', timingFunction: easeOut() }),
    ]);
    expect(out.transitionBehavior).toBe('allow-discrete');
  });

  it('maps multiple transitions as parallel arrays and omits all-normal behavior', () => {
    const out = mapDescriptors(undefined, [
      transDefaults({ property: 'opacity', durationMs: 100, timingFunction: easeOut() }),
      transDefaults({
        property: 'transform',
        durationMs: 300,
        timingFunction: { kind: 'linear' },
        behavior: 'normal',
      }),
    ]);
    expect(out.transitionProperty).toEqual(['opacity', 'transform']);
    expect(out.transitionDuration).toEqual([100, 300]);
    expect(out.transitionDelay).toEqual([0, 0]);
    expect(out).not.toHaveProperty('transitionBehavior');
  });

  it('includes transitionBehavior array when any entry uses allow-discrete', () => {
    const out = mapDescriptors(undefined, [
      transDefaults({ property: 'opacity', behavior: 'normal', timingFunction: easeOut() }),
      transDefaults({
        property: 'display',
        behavior: 'allow-discrete',
        timingFunction: easeOut(),
      }),
    ]);
    expect(out.transitionBehavior).toEqual(['normal', 'allow-discrete']);
  });

  it('maps a single animation to a keyframes object plus timing longhands', () => {
    const keyframes: CompiledKeyframes[] = [
      {
        name: 'fade',
        frames: [
          { stops: ['from'], decls: { opacity: 0 } },
          { stops: ['to'], decls: { opacity: 1 } },
        ],
      },
    ];
    const out = mapDescriptors([animDefaults({ name: 'fade', durationMs: 800 })], undefined, {
      keyframes,
      env: testResolveEnv,
    });
    expect(out.animationName).toEqual({ from: { opacity: 0 }, to: { opacity: 1 } });
    expect(out.animationDuration).toBe(800);
    expect(out.animationDelay).toBe(0);
    expect(out).not.toHaveProperty('animationComposition');
  });

  it('maps per-keyframe easing onto keyframe blocks', () => {
    const keyframes: CompiledKeyframes[] = [
      {
        name: 'kf',
        frames: [
          { stops: ['from'], decls: { opacity: 0 } },
          {
            stops: ['to'],
            decls: { opacity: 1 },
            easing: { kind: 'cubic-bezier', p: [0, 0, 0.58, 1] },
          },
        ],
      },
    ];
    mapDescriptors([animDefaults({ name: 'kf' })], undefined, {
      keyframes,
      env: testResolveEnv,
    });
    expect(mockCubicBezier).toHaveBeenCalledWith(0, 0, 0.58, 1);
  });

  it('maps multiple animations to parallel keyframe objects', () => {
    const keyframes: CompiledKeyframes[] = [
      {
        name: 'a',
        frames: [
          { stops: ['from'], decls: { opacity: 0 } },
          { stops: ['to'], decls: { opacity: 1 } },
        ],
      },
      {
        name: 'b',
        frames: [
          { stops: ['from'], decls: { marginTop: 0 } },
          { stops: ['to'], decls: { marginTop: 10 } },
        ],
      },
    ];
    const out = mapDescriptors(
      [animDefaults({ name: 'a', durationMs: 300 }), animDefaults({ name: 'b', durationMs: 500 })],
      undefined,
      { keyframes, env: testResolveEnv }
    );
    expect(out.animationName).toEqual([
      { from: { opacity: 0 }, to: { opacity: 1 } },
      { from: { marginTop: 0 }, to: { marginTop: 10 } },
    ]);
    expect(out.animationDuration).toEqual([300, 500]);
    expect(out).not.toHaveProperty('animationComposition');
  });

  it('zeros animation and transition timing when reduceMotion is true', () => {
    const keyframes: CompiledKeyframes[] = [
      {
        name: 'fade',
        frames: [{ stops: ['from'], decls: { opacity: 0 } }],
      },
    ];
    const out = mapDescriptors(
      [animDefaults({ name: 'fade', durationMs: 500, delayMs: 100 })],
      [transDefaults({ durationMs: 300, delayMs: 50 })],
      { keyframes, env: testResolveEnv, reduceMotion: true }
    );
    expect(out.animationDuration).toBe(0);
    expect(out.animationDelay).toBe(0);
    expect(out.transitionDuration).toBe(0);
    expect(out.transitionDelay).toBe(0);
  });

  it('routes steps() easing through reanimated.steps', () => {
    mapDescriptors(undefined, [
      transDefaults({
        timingFunction: { kind: 'steps', n: 4, jump: 'jump-end' },
      }),
    ]);
    expect(mockSteps).toHaveBeenCalledWith(4, 'jump-end');
  });
});
