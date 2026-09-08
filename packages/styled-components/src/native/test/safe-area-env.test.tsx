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
 * `<SafeAreaProvider>`. Without the peer, recognized names still
 * substitute (as `0`), matching a rectangular display.
 */

import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../';
import { resetSafeAreaPeerForTest } from '../safeArea';
import { resetWarnOnce } from '../../utils/warnOnce';

const mockState = {
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

jest.mock(
  'react-native-safe-area-context',
  () => ({
    useSafeAreaInsets: () => mockState.insets,
  }),
  { virtual: true }
);

describe('env(safe-area-inset-*) SafeAreaProvider wiring', () => {
  beforeEach(() => {
    resetSafeAreaPeerForTest();
    resetWarnOnce();
    mockState.insets = { top: 47, right: 0, bottom: 34, left: 0 };
  });

  // Spec §3: recognized name substitutes the environment variable value.
  it('resolves env(safe-area-inset-top) from useSafeAreaInsets()', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
    `;
    const tree = TestRenderer.create(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 47 });
  });

  it('resolves all four safe-area-inset sides', () => {
    mockState.insets = { top: 10, right: 11, bottom: 12, left: 13 };
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
      padding-right: env(safe-area-inset-right);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
    `;
    const tree = TestRenderer.create(<Pad />);
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
    const tree = TestRenderer.create(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 47 });
  });

  it('re-resolves when safe-area insets change', () => {
    const Pad = styled.View<{ $n?: number }>`
      padding-top: env(safe-area-inset-top);
    `;
    const tree = TestRenderer.create(<Pad $n={0} />);
    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 47 });

    // New object identity, as SafeAreaProvider does when insets update.
    // Bump a prop so React re-renders; the mock is not a live context store.
    mockState.insets = { top: 60, right: 0, bottom: 34, left: 0 };
    tree.update(<Pad $n={1} />);
    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 60 });
  });

  it('composes env() inside calc()', () => {
    const Pad = styled.View`
      padding-top: calc(env(safe-area-inset-top) + 10px);
    `;
    const tree = TestRenderer.create(<Pad />);
    const view = tree.root.findByType(View);
    expect(view.props.style).toEqual({ paddingTop: 57 });
  });

  it('marks components that use safe-area env() for the subscription gate', () => {
    const Pad = styled.View`
      padding-top: env(safe-area-inset-top);
    `;
    expect(Pad.nativeStyle.usesSafeAreaInsets).toBe(true);
  });
});
