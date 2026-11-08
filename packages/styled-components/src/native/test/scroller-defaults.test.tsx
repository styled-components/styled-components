/**
 * Web-parity ergonomics defaults for styled scrollers.
 *
 * Browsers nest scrolling natively; React Native's Android ScrollView
 * requires `nestedScrollEnabled` before an inner scroller may claim a
 * gesture from a scrollable ancestor. The native layer's mission is
 * mapping idiomatic web behavior onto RN, so styled scrollers default
 * the prop to true. User-supplied props always win.
 */

import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../';
import { resetNativeStyleCache, toNativeStyles } from '../../models/compileNative';
import { resetResponsiveCache } from '../responsive';
import { resetWarningsForTest } from '../transform/dev';

let renderers: TestRenderer.ReactTestRenderer[] = [];
function track(r: TestRenderer.ReactTestRenderer) {
  renderers.push(r);
  return r;
}

beforeEach(() => {
  resetResponsiveCache();
  resetNativeStyleCache();
  resetWarningsForTest();
});

afterEach(() => {
  for (const r of renderers) {
    try {
      act(() => r.unmount());
    } catch {}
  }
  renderers = [];
});

describe('nestedScrollEnabled default on styled scrollers', () => {
  it('styled.ScrollView defaults nestedScrollEnabled to true', () => {
    const Scroller = styled.ScrollView`
      height: 100px;
    `;
    const tree = track(TestRenderer.create(<Scroller />));
    expect(tree.root.findByType(ScrollView).props.nestedScrollEnabled).toBe(true);
  });

  it('a user-supplied nestedScrollEnabled={false} wins over the default', () => {
    const Scroller = styled.ScrollView`
      height: 100px;
    `;
    const tree = track(TestRenderer.create(<Scroller nestedScrollEnabled={false} />));
    expect(tree.root.findByType(ScrollView).props.nestedScrollEnabled).toBe(false);
  });

  it('styled.FlatList defaults nestedScrollEnabled to true', () => {
    const List = styled.FlatList`
      height: 100px;
    `;
    const tree = track(
      TestRenderer.create(
        <List data={['a']} renderItem={() => <Text>row</Text>} keyExtractor={(x: string) => x} />
      )
    );
    expect(tree.root.findByType(FlatList).props.nestedScrollEnabled).toBe(true);
  });

  it('non-scrollable targets get no nestedScrollEnabled prop', () => {
    const Box = styled.View`
      height: 100px;
    `;
    const tree = track(TestRenderer.create(<Box />));
    expect(tree.root.findByType(View).props.nestedScrollEnabled).toBeUndefined();
  });

  it('dynamic styles (interpolated) keep the default too', () => {
    const Scroller = styled.ScrollView<{ $h: number }>`
      height: ${p => p.$h}px;
    `;
    const tree = track(TestRenderer.create(<Scroller $h={120} />));
    expect(tree.root.findByType(ScrollView).props.nestedScrollEnabled).toBe(true);
  });
});

describe('flex pin when a styled scroller declares an explicit dimension', () => {
  // RN's ScrollView base style ships `flexGrow: 1, flexShrink: 1`
  // (ScrollView.js styles.baseVertical), so a declared height stretches
  // or collapses with the flex parent instead of holding. CSS elements
  // default `flex-grow: 0` (css-flexbox-1 §7.2). The styled scroller
  // baseline pins `flexShrink: 0` unconditionally; the `flexGrow: 0`
  // pin is conditional on an authored width/height with no authored
  // flex factor (compiled `scrollerFlexPin`).
  function flatStyle(tree: TestRenderer.ReactTestRenderer) {
    return StyleSheet.flatten(tree.root.findByType(ScrollView).props.style);
  }

  it('height declaration pins flexGrow/flexShrink to 0', () => {
    const Scroller = styled.ScrollView`
      height: 280px;
    `;
    const tree = track(TestRenderer.create(<Scroller />));
    expect(flatStyle(tree)).toEqual(
      expect.objectContaining({ height: 280, flexGrow: 0, flexShrink: 0 })
    );
  });

  it('width declaration pins too (horizontal scroller)', () => {
    const Scroller = styled.ScrollView`
      width: 240px;
    `;
    const tree = track(TestRenderer.create(<Scroller horizontal />));
    expect(flatStyle(tree)).toEqual(
      expect.objectContaining({ width: 240, flexGrow: 0, flexShrink: 0 })
    );
  });

  it('no declared dimension keeps the platform grow (fill) behavior', () => {
    const Scroller = styled.ScrollView`
      border-radius: 4px;
    `;
    const tree = track(TestRenderer.create(<Scroller />));
    const flat = flatStyle(tree);
    // No grow pin: an undimensioned scroller keeps RN's fill behavior.
    expect(flat.flexGrow).toBeUndefined();
    // The baseline shrink pin is unconditional on styled scrollers.
    expect(flat.flexShrink).toBe(0);
  });

  it('an authored flex factor suppresses the grow pin', () => {
    const Scroller = styled.ScrollView`
      height: 280px;
      flex-grow: 1;
    `;
    const tree = track(TestRenderer.create(<Scroller />));
    expect(flatStyle(tree).flexGrow).toBe(1);
  });

  // The render order already puts an authored flexGrow above the pin, so the flag is the observable.
  it.each(['flex-grow: var(--g);', 'flex-grow: var(--g) !important;', 'flex: var(--g);'])(
    'an authored flex factor "%s" suppresses the compiled grow pin',
    decl => {
      const compiled = toNativeStyles(`--g: 1; width: 240px; ${decl}`, StyleSheet as never);
      expect(compiled.scrollerFlexPin).toBeUndefined();
    }
  );

  it('a var() width with no flex factor still compiles the grow pin', () => {
    const compiled = toNativeStyles('--w: 240px; width: var(--w);', StyleSheet as never);
    expect(compiled.scrollerFlexPin).toBe(true);
  });

  it.each(['inline-size', 'block-size'])(
    'a var() %s with no flex factor compiles the grow pin',
    prop => {
      const compiled = toNativeStyles(`--w: 240px; ${prop}: var(--w);`, StyleSheet as never);
      expect(compiled.scrollerFlexPin).toBe(true);
    }
  );

  it('a width declared only inside an @media bucket does not compile the grow pin', () => {
    const compiled = toNativeStyles(
      '@media (min-width: 100px) { width: 240px; }',
      StyleSheet as never
    );
    expect(compiled.scrollerFlexPin).toBeUndefined();
  });

  it('an authored flex-shrink overrides the baseline', () => {
    const Scroller = styled.ScrollView`
      flex-shrink: 1;
    `;
    const tree = track(TestRenderer.create(<Scroller />));
    expect(flatStyle(tree).flexShrink).toBe(1);
  });

  it('a runtime style prop flexGrow beats the pin', () => {
    const Scroller = styled.ScrollView`
      height: 280px;
    `;
    const tree = track(TestRenderer.create(<Scroller style={{ flexGrow: 1 }} />));
    // The pin is a library default: it beats ScrollView's base
    // `flexGrow: 1` but sits below anything the consumer passes at the
    // callsite (only `!important` declarations outrank the style prop).
    expect(flatStyle(tree).flexGrow).toBe(1);
  });

  it('dynamic (interpolated) dimensions pin as well', () => {
    const Scroller = styled.ScrollView<{ $h: number }>`
      height: ${p => p.$h}px;
    `;
    const tree = track(TestRenderer.create(<Scroller $h={120} />));
    expect(flatStyle(tree)).toEqual(
      expect.objectContaining({ height: 120, flexGrow: 0, flexShrink: 0 })
    );
  });

  it('styled.FlatList gets the same baseline and pin', () => {
    const List = styled.FlatList`
      height: 200px;
    `;
    const tree = track(
      TestRenderer.create(
        <List data={['a']} renderItem={() => <Text>row</Text>} keyExtractor={(x: string) => x} />
      )
    );
    const flat = StyleSheet.flatten(tree.root.findByType(FlatList).props.style);
    expect(flat).toEqual(expect.objectContaining({ height: 200, flexGrow: 0, flexShrink: 0 }));
  });

  it('non-scrollable targets never pin', () => {
    const Box = styled.View`
      height: 280px;
    `;
    const tree = track(TestRenderer.create(<Box />));
    const flat = StyleSheet.flatten(tree.root.findByType(View).props.style);
    expect(flat.flexGrow).toBeUndefined();
    expect(flat.flexShrink).toBeUndefined();
  });
});
