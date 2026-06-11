/**
 * scroll-snap-align via measured children: aligned children of a styled
 * scroll container register their layout; the scroller derives
 * `snapToOffsets` and passes them to React Native's snap engine.
 *
 * css-scroll-snap-1 §5.2 (editor's draft, fetched 2026-06-10):
 *   "start: Start alignment of this box's scroll snap area within the
 *    scroll container's snapport is a snap position in the specified
 *    axis."
 *   (end / center analogous; "none: This box does not define a snap
 *    position in the specified axis.")
 */

import React from 'react';
import { ScrollView, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../';
import { resetNativeStyleCache } from '../../models/compileNative';
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

const Snapper = styled.ScrollView`
  scroll-snap-type: x mandatory;
  height: 160px;
`;

const Card = styled.View<{ $align?: string }>`
  width: 200px;
  height: 160px;
  scroll-snap-align: ${p => p.$align ?? 'start'};
`;

function scrollerLayout(host: any, width = 300, height = 160) {
  act(() => {
    host.props.onLayout({ nativeEvent: { layout: { height, width, x: 0, y: 0 } } });
    host.props.onContentSizeChange(900, height);
  });
}

function cardLayout(node: any, x: number, width = 200, height = 160) {
  act(() => {
    node.props.onLayout({ nativeEvent: { layout: { height, width, x, y: 0 } } });
  });
}

function findCards(tree: TestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(View).filter(n => n.props.testID === 'card');
}

describe('scroll-snap-align derives snapToOffsets on the scroll container', () => {
  it('start-aligned children produce their content x positions', () => {
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal>
          <Card testID="card" />
          <Card testID="card" />
          <Card testID="card" />
        </Snapper>
      )
    );
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    const cards = findCards(tree);
    cardLayout(cards[0], 0);
    cardLayout(cards[1], 200);
    cardLayout(cards[2], 400);
    expect(tree.root.findByType(ScrollView).props.snapToOffsets).toEqual([0, 200, 400]);
  });

  it('center alignment centers the snap area in the snapport', () => {
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal>
          <Card testID="card" $align="center" />
        </Snapper>
      )
    );
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    // center of a 200-wide card at x=300 is 400; viewport 300 → offset 250.
    cardLayout(findCards(tree)[0], 300);
    expect(tree.root.findByType(ScrollView).props.snapToOffsets).toEqual([250]);
  });

  it('end alignment aligns the trailing edge; offsets clamp to the extent', () => {
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal>
          <Card testID="card" $align="end" />
        </Snapper>
      )
    );
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    // end of a 200-wide card at x=700 is 900; viewport 300 → offset 600,
    // which is exactly the scrollable extent (content 900 - viewport 300).
    cardLayout(findCards(tree)[0], 700);
    expect(tree.root.findByType(ScrollView).props.snapToOffsets).toEqual([600]);
  });

  it('scroll-snap-stop: always sets disableIntervalMomentum on the scroller', () => {
    const Stopper = styled.View`
      width: 200px;
      scroll-snap-align: start;
      scroll-snap-stop: always;
    `;
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal>
          <Stopper testID="card" />
        </Snapper>
      )
    );
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    cardLayout(findCards(tree)[0], 0);
    const props = tree.root.findByType(ScrollView).props;
    expect(props.snapToOffsets).toEqual([0]);
    expect(props.disableIntervalMomentum).toBe(true);
  });

  it('user-supplied snapToOffsets win over derived ones', () => {
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal snapToOffsets={[0, 123]}>
          <Card testID="card" />
        </Snapper>
      )
    );
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    cardLayout(findCards(tree)[0], 200);
    expect(tree.root.findByType(ScrollView).props.snapToOffsets).toEqual([0, 123]);
  });

  it('no aligned children leaves the paging approximation untouched', () => {
    const Plain = styled.View`
      width: 200px;
    `;
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal>
          <Plain testID="card" />
        </Snapper>
      )
    );
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    // The plain child composes no layout listener; nothing registers.
    expect(findCards(tree)[0].props.onLayout).toBeUndefined();
    const props = tree.root.findByType(ScrollView).props;
    expect(props.snapToOffsets).toBeUndefined();
    expect(props.pagingEnabled).toBe(true);
  });

  it('an unmounting child drops its offset', () => {
    function Demo({ count }: { count: number }) {
      return (
        <Snapper horizontal>
          {Array.from({ length: count }, (_, i) => (
            <Card key={i} testID="card" />
          ))}
        </Snapper>
      );
    }
    const tree = track(TestRenderer.create(<Demo count={2} />));
    const host = tree.root.findByType(ScrollView);
    scrollerLayout(host);
    const cards = findCards(tree);
    cardLayout(cards[0], 0);
    cardLayout(cards[1], 200);
    expect(tree.root.findByType(ScrollView).props.snapToOffsets).toEqual([0, 200]);
    act(() => {
      tree.update(<Demo count={1} />);
    });
    expect(tree.root.findByType(ScrollView).props.snapToOffsets).toEqual([0]);
  });
});
