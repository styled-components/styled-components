/**
 * env(safe-area-inset-*) when `react-native-safe-area-context` is not
 * installed. The peer require throws, so `loadPeer()` catches and the
 * resolver falls back to zeros unless an explicit `SafeAreaInsetsProvider`
 * supplies insets. A dev warning fires when no source is available and is
 * suppressed by an explicit provider.
 */

import React from 'react';
import { View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { SafeAreaInsetsProvider } from '../';
import { resetSafeAreaPeerForTest } from '../safeArea';
import { resetWarnOnce } from '../../utils/warnOnce';

// Simulate the optional peer being absent: requiring it throws.
jest.mock('react-native-safe-area-context', () => {
  throw new Error('peer not installed');
});

const Pad = styled.View`
  padding-top: env(safe-area-inset-top);
`;

describe('env(safe-area-inset-*) without the react-native-safe-area-context peer', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetSafeAreaPeerForTest();
    resetWarnOnce();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warnSpy.mockRestore());

  it('resolves to 0 and warns when no source is available', () => {
    const tree = TestRenderer.create(<Pad />);

    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 0 });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no inset source is available'));
  });

  it('feeds insets from SafeAreaInsetsProvider with the peer absent, and suppresses the warning', () => {
    const tree = TestRenderer.create(
      <SafeAreaInsetsProvider insets={{ top: 42, right: 0, bottom: 0, left: 0 }}>
        <Pad />
      </SafeAreaInsetsProvider>
    );

    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 42 });
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('no inset source is available')
    );
  });

  it('does not warn for a function-interpolated component that never uses env(safe-area)', () => {
    // The conservative subscription arm makes any function-interpolated
    // component consume insets, but the warning must fire only for a static
    // env(safe-area-inset-*) literal, not this opt-in.
    const Dynamic = styled.View<{ $pad: number }>`
      padding-top: ${p => p.$pad}px;
    `;
    const tree = TestRenderer.create(<Dynamic $pad={8} />);

    expect(tree.root.findByType(View).props.style).toEqual({ paddingTop: 8 });
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('no inset source is available')
    );
  });
});
