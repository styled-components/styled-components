/**
 * env(safe-area-inset-*) wiring through SafeAreaProvider.
 *
 * Spec source: https://drafts.csswg.org/css-env-1/
 *
 * CSS Environment Variables Level 1 §2.1 Safe area inset variables:
 * "The safe area insets are four environment variables that define a
 * rectangle by its top, right, bottom, and left insets from the edge of
 * the viewport. For rectangular displays, these must all be zero, but
 * for nonrectangular displays they must form a rectangle, chosen by the
 * user agent, such that all content inside the rectangle is visible..."
 *
 * CSS Environment Variables Level 1 §3 Using Environment Variables:
 * "If the name provided by the first argument of the env() function is
 * a recognized environment variable name ... replace the env() function
 * by the value of the named environment variable."
 *
 * On React Native the UA values come from `react-native-safe-area-context`
 * when that optional peer is installed and the tree is under
 * `<SafeAreaProvider>`. Without the peer or provider, recognized names
 * still substitute (as `0`), matching a rectangular display.
 */

import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { SafeAreaInsetsProvider } from '../';
import { resetSafeAreaPeerForTest } from '../safeArea';
import { resetWarnOnce } from '../../utils/warnOnce';

type Insets = { top: number; right: number; bottom: number; left: number };

const mockState: { insets: Insets } = {
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = require('react') as typeof React;
  const SafeAreaInsetsContext = ReactActual.createContext<Insets | null>(null);
  return {
    SafeAreaInsetsContext,
    SafeAreaProvider: ({ children, insets }: { children?: React.ReactNode; insets?: Insets }) =>
      ReactActual.createElement(
        SafeAreaInsetsContext.Provider,
        { value: insets ?? mockState.insets },
        children
      ),
  };
});

const { SafeAreaProvider } = require('react-native-safe-area-context') as {
  SafeAreaProvider: React.ComponentType<{ children?: React.ReactNode; insets?: Insets }>;
};

function renderWithInsets(ui: React.ReactElement, insets?: Insets) {
  return TestRenderer.create(<SafeAreaProvider insets={insets}>{ui}</SafeAreaProvider>);
}

describe('env(safe-area-inset-*) SafeAreaProvider wiring', () => {
  beforeEach(() => {
    resetSafeAreaPeerForTest();
    resetWarnOnce();
    mockState.insets = { top: 47, right: 0, bottom: 34, left: 0 };
  });

  // Spec §3: recognized name substitutes the environment variable value.
  it('resolves env(safe-area-inset-top) from SafeAreaProvider insets', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
    `;
    const tree = renderWithInsets(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 47 });
  });

  it('resolves all four safe-area-inset sides', () => {
    const insets = { top: 10, right: 11, bottom: 12, left: 13 };
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
      padding-right: env(safe-area-inset-right);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
    `;
    const tree = renderWithInsets(<Pad />, insets);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({
      paddingTop: 10,
      paddingRight: 11,
      paddingBottom: 12,
      paddingLeft: 13,
    });
  });

  // Spec §3: recognized names ignore their fallback.
  it('ignores the fallback when the inset name is recognized', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top, 99px);
    `;
    const tree = renderWithInsets(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 47 });
  });

  it('re-resolves when safe-area insets change', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
    `;
    const tree = renderWithInsets(<Pad />, { top: 47, right: 0, bottom: 34, left: 0 });
    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 47 });

    tree.update(
      <SafeAreaProvider insets={{ top: 60, right: 0, bottom: 34, left: 0 }}>
        <Pad />
      </SafeAreaProvider>
    );
    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 60 });
  });

  it('composes env() inside calc()', () => {
    const Pad = styled.View`
      padding-top: calc(env(safe-area-inset-top) + 10px);
    `;
    const tree = renderWithInsets(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 57 });
  });

  it('resolves to 0 without a provider when the peer is present', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
    `;
    const tree = TestRenderer.create(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 0 });
  });

  it('marks components that use safe-area env() for the subscription gate', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
    `;
    expect(Pad.nativeStyle.usesSafeAreaInsets).toBe(true);
  });
});

describe('SafeAreaInsetsProvider', () => {
  beforeEach(() => {
    resetSafeAreaPeerForTest();
    resetWarnOnce();
  });

  const Pad = styled.View`
    padding-top: env(safe-area-inset-top);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
  `;

  it('feeds insets explicitly, no peer provider needed', () => {
    const tree = TestRenderer.create(
      <SafeAreaInsetsProvider insets={{ top: 10, right: 11, bottom: 12, left: 13 }}>
        <Pad />
      </SafeAreaInsetsProvider>
    );
    expect(tree.root.findByType(View).props.style).toEqual({
      paddingTop: 10,
      paddingRight: 11,
      paddingBottom: 12,
      paddingLeft: 13,
    });
  });

  it('overrides the ambient SafeAreaProvider insets', () => {
    const tree = renderWithInsets(
      <SafeAreaInsetsProvider insets={{ top: 100, right: 0, bottom: 0, left: 0 }}>
        <Pad />
      </SafeAreaInsetsProvider>,
      { top: 47, right: 5, bottom: 34, left: 5 }
    );
    // Explicit value wins over the peer context on every edge.
    expect(tree.root.findByType(View).props.style).toEqual({
      paddingTop: 100,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    });
  });

  it('a fresh inline insets object with equal values does not re-resolve descendants', () => {
    const Leaf = styled.View`
      padding-top: env(safe-area-inset-top);
    `;

    // `tick` changes each update to force a real re-render of the wrapper,
    // which hands SafeAreaInsetsProvider a brand-new inline object every time
    // with identical scalar values.
    function Wrapper({ tick }: { tick: number }) {
      void tick;
      return (
        <SafeAreaInsetsProvider insets={{ top: 20, right: 0, bottom: 0, left: 0 }}>
          <Leaf />
        </SafeAreaInsetsProvider>
      );
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      renderer = TestRenderer.create(<Wrapper tick={0} />);
    });
    // The resolved style object is referentially reused only on a full render-cache
    // hit; a slot-14 (safe-area) miss rebuilds it. Capturing its identity across
    // updates is the sensor for "kept hitting the cache."
    const styleAfterMount = renderer.root.findByType(View).props.style;
    expect(styleAfterMount).toEqual({ paddingTop: 20 });

    TestRenderer.act(() => renderer.update(<Wrapper tick={1} />));
    TestRenderer.act(() => renderer.update(<Wrapper tick={2} />));
    TestRenderer.act(() => renderer.update(<Wrapper tick={3} />));

    // The memoized context value keeps its reference across those re-renders,
    // so the safe-area cache slot never changes and the resolved style object
    // stays identical. Drop the useMemo (or its scalar dep array) in
    // SafeAreaInsetsProvider and each fresh inline object flows through as a new
    // context value, missing the cache and rebuilding the style every tick.
    expect(renderer.root.findByType(View).props.style).toBe(styleAfterMount);
  });
});
