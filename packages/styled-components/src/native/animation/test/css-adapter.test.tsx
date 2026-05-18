import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../../';
import { resetResponsiveCache } from '../../responsive';
import { cssAdapter, __resetCssAdapterForTesting } from '../cssAdapter';
import { getAnimationAdapter, setAnimationAdapter } from '../types';

interface MockSheet {
  cssRules: { length: number };
  insertRule: jest.Mock<number, [string, number]>;
}

interface MockStyleTag {
  setAttribute: jest.Mock;
  sheet: MockSheet;
}

interface MockDocument {
  head: {
    querySelector: jest.Mock<MockStyleTag | null, [string]>;
    appendChild: jest.Mock;
  };
  createElement: jest.Mock<MockStyleTag, [string]>;
}

function mockDocument(): { doc: MockDocument; sheet: MockSheet } {
  const sheet: MockSheet = {
    cssRules: { length: 0 },
    insertRule: jest.fn((_rule: string, _idx: number) => {
      sheet.cssRules.length += 1;
      return 0;
    }),
  };
  const tag: MockStyleTag = {
    setAttribute: jest.fn(),
    sheet,
  };
  const doc: MockDocument = {
    head: {
      querySelector: jest.fn(() => null),
      appendChild: jest.fn(),
    },
    createElement: jest.fn(() => tag),
  };
  return { doc, sheet };
}

describe('cssAdapter (rn-web)', () => {
  let prior: ReturnType<typeof getAnimationAdapter>;
  let savedDocument: unknown;

  beforeAll(() => {
    prior = getAnimationAdapter();
    setAnimationAdapter(cssAdapter);
    savedDocument = (global as { document?: unknown }).document;
  });

  afterAll(() => {
    setAnimationAdapter(prior);
    (global as { document?: unknown }).document = savedDocument;
  });

  beforeEach(() => {
    resetResponsiveCache();
    __resetCssAdapterForTesting();
    const { doc } = mockDocument();
    (global as { document?: unknown }).document = doc;
  });

  it('emits CSS transition longhands instead of wrapping with Animated', () => {
    const Card = styled.View`
      background-color: red;
      transition: background-color 280ms ease-out;
    `;
    const tree = TestRenderer.create(<Card />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toMatchObject({
      backgroundColor: 'red',
      transitionProperty: 'background-color',
      transitionDuration: '280ms',
      transitionDelay: '0ms',
      transitionTimingFunction: 'cubic-bezier(0,0,0.58,1)',
    });
  });

  it('omits transitionBehavior when no layer requests allow-discrete', () => {
    const Card = styled.View`
      transition: opacity 200ms linear;
    `;
    const tree = TestRenderer.create(<Card />);
    const view = tree.root.findByType(View);
    expect(view.props.style).not.toHaveProperty('transitionBehavior');
  });

  it('emits comma-separated transitionBehavior when any entry uses allow-discrete', () => {
    const Card = styled.View`
      transition-property: opacity, display;
      transition-duration: 100ms, 200ms;
      transition-timing-function: linear, linear;
      transition-delay: 0ms, 0ms;
      transition-behavior: normal, allow-discrete;
    `;
    const tree = TestRenderer.create(<Card />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toMatchObject({
      transitionProperty: 'opacity, display',
      transitionDuration: '100ms, 200ms',
      transitionBehavior: 'normal, allow-discrete',
    });
  });

  it('emits animation longhands and injects @keyframes once', () => {
    const Spinner = styled.View`
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      animation: spin 1s linear infinite;
    `;
    const tree = TestRenderer.create(<Spinner />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toMatchObject({
      animationName: 'spin',
      animationDuration: '1000ms',
      animationDelay: '0ms',
      animationIterationCount: 'infinite',
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
      animationTimingFunction: 'linear',
    });

    const doc = (global as { document: MockDocument }).document;
    const tag = doc.createElement.mock.results[0]?.value as MockStyleTag | undefined;
    expect(tag?.sheet.insertRule).toHaveBeenCalledTimes(1);
    const rule = tag?.sheet.insertRule.mock.calls[0][0];
    expect(rule).toContain('@keyframes spin');
    expect(rule).toContain('transform:rotate(0deg)');
    expect(rule).toContain('transform:rotate(360deg)');

    // Re-rendering the same animation must not re-inject the rule.
    TestRenderer.create(<Spinner />);
    expect(tag?.sheet.insertRule).toHaveBeenCalledTimes(1);
  });

  it('emits comma-separated animation longhands for two parallel animations', () => {
    const Box = styled.View`
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
      animation:
        a 100ms linear,
        b 200ms ease-in;
    `;
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style.animationName).toMatch(/a/);
    expect(view.props.style.animationName).toMatch(/b/);
    expect(view.props.style.animationDuration).toBe('100ms, 200ms');
    expect(view.props.style.animationTimingFunction).toContain('linear');
    expect(view.props.style.animationTimingFunction).toContain('cubic-bezier');

    const doc = (global as { document: MockDocument }).document;
    const tag = doc.createElement.mock.results[0]?.value as MockStyleTag | undefined;
    expect(tag?.sheet.insertRule).toHaveBeenCalledTimes(2);
  });

  it('omits animationComposition when every effect uses replace (initial)', () => {
    const Box = styled.View`
      @keyframes x {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      animation: x 200ms linear;
    `;
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style).not.toHaveProperty('animationComposition');
  });

  it('emits comma-separated animationComposition when any effect uses add or accumulate', () => {
    const Box = styled.View`
      @keyframes a {
        from {
          opacity: 0;
        }
        to {
          opacity: 0.5;
        }
      }
      @keyframes b {
        from {
          opacity: 0.5;
        }
        to {
          opacity: 1;
        }
      }
      animation-name: a, b;
      animation-duration: 100ms, 100ms;
      animation-timing-function: linear, linear;
      animation-composition: add, accumulate;
    `;
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toMatchObject({
      animationComposition: 'add, accumulate',
    });
  });

  it('serializes cubic-bezier timing functions verbatim', () => {
    const Box = styled.View`
      transition: opacity 200ms cubic-bezier(0.42, 0, 0.58, 1);
    `;
    const tree = TestRenderer.create(<Box />);
    const view = tree.root.findByType(View);
    expect(view.props.style.transitionTimingFunction).toBe('cubic-bezier(0.42,0,0.58,1)');
  });

  it('passes through components with no transition or animation unchanged', () => {
    const Plain = styled.View`
      padding: 10px;
    `;
    const tree = TestRenderer.create(<Plain />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ padding: 10 });
  });

  it('merges array-form resolved layers into a single object', () => {
    // When an attribute-selector bucket matches, `assembleFinalStyle`
    // returns `[base, conditionalBucket]`. The adapter must merge those
    // layers into one object; spreading the array directly would yield
    // numeric keys (`{0: ..., 1: ...}`) that React DOM then writes to
    // CSSStyleDeclaration's read-only indexed accessor, which throws
    // "Attempted to assign to readonly property" in WebKit.
    const Btn = styled.View`
      background-color: red;
      transition: background-color 200ms ease-out;

      &[data-hovered='true'] {
        background-color: blue;
      }
    `;
    const tree = TestRenderer.create(<Btn data-hovered="true" />);
    const view = tree.root.findByType(View);
    const keys = Object.keys(view.props.style);
    expect(keys).not.toContain('0');
    expect(keys).not.toContain('1');
    expect(view.props.style).toMatchObject({
      backgroundColor: 'blue',
      transitionProperty: 'background-color',
      transitionDuration: '200ms',
    });
  });
});
