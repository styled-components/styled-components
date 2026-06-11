/**
 * Snap settle corrector: when `scroll-snap-type: * mandatory` lifts the
 * paging approximation, the styled scroller also guarantees the rest
 * position lands on the snap grid. RN's Android snap engine has holes
 * (device-verified: catching an in-flight snap animation with a tap and
 * lifting without dragging strands the scroller between pages, because
 * touch-down cancels the snap runnable and touch-up only re-snaps after
 * a real drag). The corrector watches the scroller settle and issues an
 * animated scrollTo to the nearest snap point when the rest offset is
 * off-grid. css-scroll-snap-1 §6.1: "mandatory: ... the visual viewport
 * of this scroll container must rest on a snap position when there are
 * no active scrolling operations".
 */

import React from 'react';
import { ScrollView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import styled from '../';
import { resetNativeStyleCache } from '../../models/compileNative';
import { resetResponsiveCache } from '../responsive';
import { resetWarningsForTest } from '../transform/dev';

jest.useFakeTimers();

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
  act(() => {
    jest.runOnlyPendingTimers();
  });
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

function mountSnapper(extraProps: Record<string, unknown> = {}) {
  const tree = track(TestRenderer.create(<Snapper horizontal {...extraProps} />));
  const host = tree.root.findByType(ScrollView);
  const scrollTo = jest.fn();
  (host.instance as any).scrollTo = scrollTo;
  return { host, scrollTo, tree };
}

function fire(host: any, name: string, ...args: unknown[]) {
  act(() => {
    host.props[name](...args);
  });
}

function layoutEvent(width: number, height = 160) {
  return { nativeEvent: { layout: { height, width, x: 0, y: 0 } } };
}

function scrollEvent(x: number, contentW = 900) {
  return {
    nativeEvent: {
      contentOffset: { x, y: 0 },
      contentSize: { height: 160, width: contentW },
      layoutMeasurement: { height: 160, width: 300 },
    },
  };
}

function settle() {
  act(() => {
    jest.advanceTimersByTime(500);
  });
}

describe('snap settle corrector (mandatory lift)', () => {
  it('corrects an off-grid rest to the nearest page (catch-tap strand)', () => {
    const { host, scrollTo } = mountSnapper();
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onContentSizeChange', 900, 160);
    fire(host, 'onScroll', scrollEvent(130));
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ animated: true, x: 0 });
  });

  it('rounds up past the page midpoint', () => {
    const { host, scrollTo } = mountSnapper();
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onContentSizeChange', 900, 160);
    fire(host, 'onScroll', scrollEvent(200));
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).toHaveBeenCalledWith({ animated: true, x: 300 });
  });

  it('does nothing when the rest position is already on the grid', () => {
    const { host, scrollTo } = mountSnapper();
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onContentSizeChange', 900, 160);
    fire(host, 'onScroll', scrollEvent(300));
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('waits for scrolling to go quiet before checking', () => {
    const { host, scrollTo } = mountSnapper();
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onContentSizeChange', 900, 160);
    fire(host, 'onTouchEnd', {});
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // a native snap animation is still emitting scroll events; each one
    // postpones the check so the corrector never fights the engine.
    fire(host, 'onScroll', scrollEvent(130));
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(scrollTo).not.toHaveBeenCalled();
    settle();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('clamps the target to the scrollable extent', () => {
    const { host, scrollTo } = mountSnapper();
    fire(host, 'onLayout', layoutEvent(300));
    // max offset is 400 (content 700, viewport 300); rounding 550 to the
    // 600 page must clamp to 400.
    fire(host, 'onScroll', scrollEvent(550, 700));
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).toHaveBeenCalledWith({ animated: true, x: 400 });
  });

  it('honors a user-supplied snapToInterval over the page size', () => {
    const { host, scrollTo } = mountSnapper({ snapToInterval: 100 });
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onContentSizeChange', 900, 160);
    fire(host, 'onScroll', scrollEvent(130));
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).toHaveBeenCalledWith({ animated: true, x: 100 });
  });

  it('honors user-supplied snapToOffsets', () => {
    const { host, scrollTo } = mountSnapper({ snapToOffsets: [0, 250, 700] });
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onContentSizeChange', 900, 160);
    fire(host, 'onScroll', scrollEvent(300));
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).toHaveBeenCalledWith({ animated: true, x: 250 });
  });

  it('composes user touch and scroll handlers', () => {
    const onScroll = jest.fn();
    const onTouchEnd = jest.fn();
    const { host } = mountSnapper({ onScroll, onTouchEnd });
    fire(host, 'onLayout', layoutEvent(300));
    fire(host, 'onScroll', scrollEvent(50));
    fire(host, 'onTouchEnd', {});
    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onTouchEnd).toHaveBeenCalledTimes(1);
    settle();
  });

  it('does not attach to scrollers without the mandatory lift', () => {
    const Free = styled.ScrollView`
      height: 160px;
    `;
    const tree = track(TestRenderer.create(<Free horizontal />));
    const host = tree.root.findByType(ScrollView);
    expect(host.props.onTouchEnd).toBeUndefined();
  });

  it('does not attach when the user passes pagingEnabled directly (no CSS lift)', () => {
    const Free = styled.ScrollView`
      height: 160px;
    `;
    const tree = track(TestRenderer.create(<Free horizontal pagingEnabled />));
    const host = tree.root.findByType(ScrollView);
    expect(host.props.onTouchEnd).toBeUndefined();
  });

  it('vertical mandatory scroller corrects on the y axis', () => {
    const Vert = styled.ScrollView`
      scroll-snap-type: y mandatory;
    `;
    const tree = track(TestRenderer.create(<Vert />));
    const host = tree.root.findByType(ScrollView);
    const scrollTo = jest.fn();
    (host.instance as any).scrollTo = scrollTo;
    fire(host, 'onLayout', { nativeEvent: { layout: { height: 400, width: 300, x: 0, y: 0 } } });
    fire(host, 'onContentSizeChange', 300, 1200);
    act(() => {
      host.props.onScroll({
        nativeEvent: {
          contentOffset: { x: 0, y: 540 },
          contentSize: { height: 1200, width: 300 },
          layoutMeasurement: { height: 400, width: 300 },
        },
      });
    });
    fire(host, 'onTouchEnd', {});
    settle();
    expect(scrollTo).toHaveBeenCalledWith({ animated: true, y: 400 });
  });
});
