import React from 'react';
import { Dict } from '../types';
import type { ScrollTimelineEntry } from './scrollTimeline';

/**
 * Quiet window after the last scroll-ish event before the rest position
 * is checked. Long enough that a native snap animation (which keeps
 * emitting scroll events) always postpones the check, so the corrector
 * never fights the engine; short enough that a stranded scroller visibly
 * settles right after the finger lifts.
 */
const SETTLE_QUIET_MS = 320;

/** Sub-pixel slack: fractional page widths make offsets land within a
 *  hair of the grid; only visibly off-grid rests get corrected. */
const SETTLE_TOLERANCE = 1;

interface SettleState {
  offX: number;
  offY: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Settle guarantee for the `scroll-snap-type: * mandatory` paging lift.
 *
 * RN's Android snap engine leaves holes where the scroller rests between
 * snap positions (device-verified on RN 0.85: touch-down cancels an
 * in-flight snap animation and touch-up without a drag never re-snaps).
 * css-scroll-snap-1 §6.1 requires a mandatory snap container to rest on
 * a snap position whenever there is no active scroll operation, so the
 * styled scroller watches its own rest position and issues an animated
 * scrollTo to the nearest snap point when the engine misses. iOS paging
 * is native and never misses; there the check is a no-op.
 *
 * Viewport, extent, and the host instance come from the scroll-timeline
 * entry: the publisher is always active on a styled scroller, and its
 * composed handlers already maintain those measurements. This hook only
 * shadows the latest contentOffset (the entry stores offsets as
 * Animated.Values, readable from JS only via private API).
 *
 * Snap grid precedence mirrors the engine: user-supplied `snapToOffsets`,
 * then `snapToInterval`, then full-scrollport pages.
 */
export function useSnapSettle(
  active: boolean,
  entry: ScrollTimelineEntry | null,
  elementProps: Dict<any>
): Dict<any> {
  const ref = React.useRef<SettleState | null>(null);
  React.useEffect(
    () => () => {
      const s = ref.current;
      if (s !== null && s.timer !== null) clearTimeout(s.timer);
    },
    []
  );
  if (!active || __NATIVE_WEB__ || entry === null) return elementProps;
  if (ref.current === null) ref.current = { offX: 0, offY: 0, timer: null };
  const s = ref.current;

  const horizontal = elementProps.horizontal === true;
  const snapToInterval = elementProps.snapToInterval;
  const snapToOffsets = elementProps.snapToOffsets;

  const check = () => {
    s.timer = null;
    const host = entry.host;
    if (host === null) return;
    const viewport = horizontal ? entry.viewportW : entry.viewportH;
    if (viewport <= 0) return;
    const max = horizontal ? entry.extentX : entry.extentY;
    const off = horizontal ? s.offX : s.offY;
    let target: number;
    if (Array.isArray(snapToOffsets) && snapToOffsets.length > 0) {
      target = snapToOffsets[0];
      let best = Math.abs(off - target);
      for (let i = 1; i < snapToOffsets.length; i++) {
        const d = Math.abs(off - snapToOffsets[i]);
        if (d < best) {
          best = d;
          target = snapToOffsets[i];
        }
      }
    } else {
      const unit =
        typeof snapToInterval === 'number' && snapToInterval > 0 ? snapToInterval : viewport;
      target = Math.round(off / unit) * unit;
    }
    if (target < 0) target = 0;
    else if (target > max) target = max;
    if (Math.abs(target - off) <= SETTLE_TOLERANCE) return;
    if (typeof host.scrollTo === 'function') {
      host.scrollTo(horizontal ? { animated: true, x: target } : { animated: true, y: target });
    } else if (typeof host.scrollToOffset === 'function') {
      host.scrollToOffset({ animated: true, offset: target });
    } else if (typeof host.getScrollResponder === 'function') {
      const r = host.getScrollResponder();
      if (r !== null && typeof r.scrollTo === 'function') {
        r.scrollTo(horizontal ? { animated: true, x: target } : { animated: true, y: target });
      }
    }
  };
  const schedule = () => {
    if (s.timer !== null) clearTimeout(s.timer);
    s.timer = setTimeout(check, SETTLE_QUIET_MS);
  };
  const scrollish = (user: unknown) => (e: any) => {
    const co = e !== null && typeof e === 'object' ? e.nativeEvent?.contentOffset : undefined;
    if (co !== undefined) {
      s.offX = co.x;
      s.offY = co.y;
    }
    schedule();
    if (typeof user === 'function') user(e);
  };
  const touch = (user: unknown) => (e: any) => {
    schedule();
    if (typeof user === 'function') user(e);
  };

  return {
    ...elementProps,
    onMomentumScrollEnd: scrollish(elementProps.onMomentumScrollEnd),
    onScroll: scrollish(elementProps.onScroll),
    onScrollEndDrag: scrollish(elementProps.onScrollEndDrag),
    onTouchCancel: touch(elementProps.onTouchCancel),
    onTouchEnd: touch(elementProps.onTouchEnd),
  };
}
