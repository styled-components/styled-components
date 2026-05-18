import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../../';
import { resetResponsiveCache } from '../../responsive';
import {
  getAnimationAdapter,
  resetAnimationAdapter,
  setAnimationAdapter,
  AnimationAdapter,
  AnimatedStyleInput,
  AnimatedStyleOutput,
} from '../types';
import '../'; // ensure default adapter side-effect registers

describe('animation adapter integration', () => {
  beforeEach(() => {
    resetResponsiveCache();
  });

  it('default adapter is registered when native is imported', () => {
    expect(getAnimationAdapter()?.id).toMatchInlineSnapshot(`"animated"`);
  });

  it('component without animation features renders unchanged', () => {
    const Box = styled.View`
      color: red;
      padding: 10px;
    `;
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toMatchInlineSnapshot(`
      {
        "color": "red",
        "padding": 10,
      }
    `);
  });

  it('routes a component with `transition` through the slow path with adapter applied', () => {
    // Capture the adapter inputs to verify the descriptor flows through.
    const captured: AnimatedStyleInput[] = [];
    const stub: AnimationAdapter = {
      id: 'capture',
      useAnimatedStyle: input => {
        captured.push(input);
        return { style: input.resolved, elementType: input.target };
      },
    };
    const prior = getAnimationAdapter();
    setAnimationAdapter(stub);
    try {
      const Card = styled.View`
        background-color: red;
        transition: background-color 280ms ease-out;
      `;
      TestRenderer.create(<Card />);
      expect(captured).toHaveLength(1);
      expect(captured[0].compiled.transitions).toMatchInlineSnapshot(`
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
    } finally {
      setAnimationAdapter(prior);
    }
  });

  it('passes multiple animation descriptors and keyframes through the adapter hook', () => {
    const captured: AnimatedStyleInput[] = [];
    const stub: AnimationAdapter = {
      id: 'capture-multi-anim',
      useAnimatedStyle: input => {
        captured.push(input);
        return { style: input.resolved, elementType: input.target };
      },
    };
    const prior = getAnimationAdapter();
    setAnimationAdapter(stub);
    try {
      const Box = styled.View`
        animation:
          a 100ms linear,
          b 100ms linear;
        @keyframes a {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes b {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `;
      TestRenderer.create(<Box />);
      expect(captured).toHaveLength(1);
      expect(captured[0].compiled.animations).toHaveLength(2);
      expect(captured[0].compiled.animations!.map(a => a.name)).toEqual(['a', 'b']);
      expect(captured[0].compiled.keyframes.map(k => k.name).sort()).toEqual(['a', 'b']);
    } finally {
      setAnimationAdapter(prior);
    }
  });

  it('passes resolved env (including reduceMotion) to the adapter', () => {
    const seen: boolean[] = [];
    const stub: AnimationAdapter = {
      id: 'capture-env',
      useAnimatedStyle: input => {
        seen.push(input.env.media.reduceMotion);
        return { style: input.resolved, elementType: input.target };
      },
    };
    const prior = getAnimationAdapter();
    setAnimationAdapter(stub);
    try {
      const Card = styled.View`
        background-color: red;
        transition: background-color 280ms ease-out;
      `;
      TestRenderer.create(<Card />);
      expect(seen.length).toBeGreaterThan(0);
      // Default RN test env: reduceMotion is false until AccessibilityInfo
      // resolves; we just assert the field is plumbed.
      expect(typeof seen[0]).toBe('boolean');
    } finally {
      setAnimationAdapter(prior);
    }
  });

  it('falls back to passthrough when no adapter is registered', () => {
    const prior = getAnimationAdapter();
    resetAnimationAdapter();
    try {
      const Card = styled.View`
        background-color: red;
        transition: background-color 200ms ease;
      `;
      const tree = TestRenderer.create(<Card />);
      const view = tree.root.findByType(View);
      // No adapter → resolved style passes through unchanged.
      expect(view.props.style).toMatchInlineSnapshot(`
        {
          "backgroundColor": "red",
        }
      `);
    } finally {
      setAnimationAdapter(prior);
    }
  });

  it('disqualifies animation-bearing static components from the static path', () => {
    const Card = styled.View`
      background-color: red;
      transition: background-color 200ms ease;
    `;
    expect((Card as any).nativeStyle.staticEligible).toBe(false);
  });

  it('keeps the static path for components without animation features', () => {
    const Card = styled.View`
      background-color: red;
      padding: 10px;
    `;
    expect((Card as any).nativeStyle.staticEligible).toBe(true);
  });
});

jest.mock(
  'react-native-reanimated',
  () => ({
    __esModule: true,
    default: {
      createAnimatedComponent: (c: unknown) => c,
    },
    cubicBezier: (a: number, b: number, c: number, d: number) => ({
      kind: 'reanimated.cubicBezier',
      args: [a, b, c, d],
    }),
    steps: (n: number, j: string) => ({ kind: 'reanimated.steps', n, j }),
    linear: (...stops: unknown[]) => ({ kind: 'reanimated.linear', stops }),
  }),
  { virtual: true }
);

describe('reanimated adapter swap', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.resetModules();
    require('../../animation');
  });

  it('importing the subpath registers the reanimated adapter', () => {
    require('../../reanimated');
    const { getAnimationAdapter } = require('../../animation/types');
    expect(getAnimationAdapter()?.id).toMatchInlineSnapshot(`"reanimated"`);
  });

  it('replaces the default Animated adapter when imported after it', () => {
    require('../../animation');
    let { getAnimationAdapter } = require('../../animation/types');
    expect(getAnimationAdapter()?.id).toMatchInlineSnapshot(`"animated"`);
    require('../../reanimated');
    ({ getAnimationAdapter } = require('../../animation/types'));
    expect(getAnimationAdapter()?.id).toMatchInlineSnapshot(`"reanimated"`);
  });

  it('throws a clear error when react-native-reanimated is missing', () => {
    jest.doMock('react-native-reanimated', () => {
      throw new Error('not installed');
    });
    expect(() => {
      require('../../reanimated');
    }).toThrow(/requires `react-native-reanimated/);
    jest.dontMock('react-native-reanimated');
  });
});

// Re-export for the test discovery.
export type { AnimatedStyleOutput };
