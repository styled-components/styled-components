import React from 'react';
import type {
  AnimationDescriptor,
  TimelineAxis,
  TimelineRangeName,
  ViewSubjectLayout,
} from './animation/types';
import { resolveRangeBoundary, type NamedRangeRect } from './animation/range';
import { warnOnce } from './transform/dev';
import { getRN } from './responsive';
import { isWebPlatform } from './polyfills';
import { isDebugEnabled } from './animation/debug';

/**
 * Debug trace, enabled via `setAnimationDebug(true)`. Shares the
 * `[sc/anim]` prefix with the animation adapter so one grep catches the
 * whole motion pipeline in Metro / Hermes inspector.
 */
function dbg(tag: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log('[sc/anim]', tag, ...args);
}

/**
 * Live state for one scroll progress timeline, published by a styled
 * scroll container. `offsetX` / `offsetY` are Animated.Values updated
 * from scroll events without re-rendering; the extents are plain
 * numbers whose changes re-publish the context value so consumers
 * rebuild their interpolations against the new scroll distance.
 */
export interface ScrollTimelineEntry {
  /** Animated.Value tracking contentOffset.x. */
  offsetX: any;
  /** Animated.Value tracking contentOffset.y. */
  offsetY: any;
  /**
   * UI-thread twins of offsetX / offsetY, mapped from the scroller's
   * native scroll event so native-driver-eligible interpolations
   * (opacity, transforms) keep pace with the finger. Kept SEPARATE from
   * the JS pair: a native-tagged value poisons every interpolation
   * chained off it, and layout-prop interpolations (width, colors) would
   * error with "not supported by native animated module". The JS scroll
   * handler echoes the same offsets into these via setValue ONLY until
   * the native event attaches (see nativeAttached), which keeps the
   * JS-side shadow readable in test renderers and pre-attachment
   * renders.
   */
  offsetXNative: any;
  offsetYNative: any;
  /** True when this host can drive the native pair from the UI thread. */
  nativeDriven: boolean;
  /**
   * Set once the native scroll event is attached (a real view tag
   * resolved). From then on the JS handler must NOT echo into the native
   * pair: each echo fires the JS-side update callback, re-rendering the
   * Animated consumer, and on the new architecture every such commit
   * rewrites the view with a one-frame-stale style snapshot, exactly
   * the JS-fights-native wobble the native pair exists to eliminate.
   */
  nativeAttached: boolean;
  /** Scrollable overflow minus container size, per axis. 0 = inactive. */
  extentX: number;
  extentY: number;
  /** Scrollport size per axis; view progress timelines need it to place
   *  the subject's visibility range. 0 = not yet measured. */
  viewportW: number;
  viewportH: number;
  /** Declared axis when this entry backs a named timeline. */
  axis: TimelineAxis;
  /**
   * Clone registry for `position: sticky` children. Each sticky child
   * publishes a layout-pinned twin of its rendered element; the
   * scroller's overlay host subscribes and renders them outside the
   * scrolling coordinate space.
   */
  stickyClones: StickyCloneRegistry;
  /**
   * `scroll-snap-align` children register their measured layout here;
   * the scroll container derives `snapToOffsets` from the registry.
   */
  snapTargets: SnapTargetRegistry;
  /** Host instance captured by the publisher's composed ref; the snap
   *  settle corrector drives its imperative scrollTo through this. */
  host: any;
}

export interface SnapTargetEntry {
  align: string;
  h: number;
  stop: boolean;
  w: number;
  x: number;
  y: number;
}

export interface SnapTargetRegistry {
  listeners: Set<() => void>;
  targets: Map<object, SnapTargetEntry>;
  version: number;
}

export interface StickyCloneRegistry {
  clones: Map<number, React.ReactElement>;
  listeners: Set<() => void>;
  version: number;
}

/** Common listener/version shape of the per-entry registries. */
interface VersionedRegistry {
  listeners: Set<() => void>;
  version: number;
}

function notifyRegistry(registry: VersionedRegistry): void {
  registry.version++;
  registry.listeners.forEach(l => l());
}

const noopUnsubscribe = () => {};

/** Re-render the caller whenever the registry's version bumps. Both
 *  callbacks are memoized on the registry so React reuses the
 *  subscription instead of scheduling a passive effect per render. */
function useRegistryVersion(registry: VersionedRegistry | null): void {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      if (registry === null) return noopUnsubscribe;
      registry.listeners.add(cb);
      return () => {
        registry.listeners.delete(cb);
      };
    },
    [registry]
  );
  const getVersion = React.useCallback(
    () => (registry === null ? 0 : registry.version),
    [registry]
  );
  React.useSyncExternalStore(subscribe, getVersion, getVersion);
}

export type { ViewSubjectLayout };

export interface ScrollTimelineContextValue {
  /** Nearest ancestor styled scroll container's timeline. */
  nearest: ScrollTimelineEntry | null;
  /** Named timelines in scope (`scroll-timeline-name` ancestors). */
  named: Record<string, ScrollTimelineEntry>;
}

const EMPTY_NAMED: Record<string, ScrollTimelineEntry> = Object.freeze({});

export const DEFAULT_SCROLL_TIMELINES: ScrollTimelineContextValue = Object.freeze({
  nearest: null,
  named: EMPTY_NAMED,
});

export const ScrollTimelineContext =
  React.createContext<ScrollTimelineContextValue>(DEFAULT_SCROLL_TIMELINES);

export function createScrollTimelineEntry(axis: TimelineAxis): ScrollTimelineEntry | null {
  const Animated = getRN().Animated;
  if (!Animated) return null;
  const offsetX = new Animated.Value(0);
  const offsetY = new Animated.Value(0);
  const nativeDriven = !isWebPlatform() && typeof Animated.attachNativeEvent === 'function';
  return {
    offsetX,
    offsetY,
    offsetXNative: nativeDriven ? new Animated.Value(0) : offsetX,
    offsetYNative: nativeDriven ? new Animated.Value(0) : offsetY,
    nativeDriven,
    nativeAttached: false,
    extentX: 0,
    extentY: 0,
    viewportW: 0,
    viewportH: 0,
    axis,
    stickyClones: { clones: new Map(), listeners: new Set(), version: 0 },
    snapTargets: { listeners: new Set(), targets: new Map(), version: 0 },
    host: null,
  };
}

/** block → y, inline → x; horizontal-tb is Yoga's only writing mode. */
function isHorizontalAxis(axis: TimelineAxis): boolean {
  return axis === 'inline' || axis === 'x';
}

export function axisOffsetNode(
  entry: ScrollTimelineEntry,
  axis: TimelineAxis,
  preferNative?: boolean
): any {
  if (preferNative === true && entry.nativeDriven) {
    return isHorizontalAxis(axis) ? entry.offsetXNative : entry.offsetYNative;
  }
  return isHorizontalAxis(axis) ? entry.offsetX : entry.offsetY;
}

export function axisExtent(entry: ScrollTimelineEntry, axis: TimelineAxis): number {
  return isHorizontalAxis(axis) ? entry.extentX : entry.extentY;
}

/**
 * Resolve an animation descriptor's timeline reference against the
 * published timelines. Returns the entry plus the effective axis, or
 * `null` for inactive timelines (no scroller in scope, unsupported
 * scroller keyword, unknown name).
 */
export function resolveTimelineEntry(
  desc: AnimationDescriptor,
  timelines: ScrollTimelineContextValue
): { entry: ScrollTimelineEntry; axis: TimelineAxis } | null {
  const timeline = desc.timeline;
  if (timeline.kind === 'scroll') {
    if (timeline.scroller !== 'nearest') {
      if (__DEV__) {
        warnOnce(
          'native-scroll-timeline-scroller-unsupported',
          `\`animation-timeline: scroll(${timeline.scroller})\` is not supported on React Native: there is no document viewport scroller, and self-referencing scrollers are not wired up yet. Use \`scroll(nearest)\` (the default) inside a styled ScrollView, or a named timeline via \`scroll-timeline-name\`.`,
          timeline.scroller
        );
      }
      return null;
    }
    const entry = timelines.nearest;
    return entry === null ? null : { entry, axis: timeline.axis };
  }
  if (timeline.kind === 'named') {
    const entry = timelines.named[timeline.name];
    return entry === undefined ? null : { entry, axis: entry.axis };
  }
  if (timeline.kind === 'view') {
    if (timeline.inset !== null && __DEV__) {
      warnOnce(
        'native-view-timeline-inset-unsupported',
        `\`animation-timeline: view(... ${timeline.inset})\` declares a view-timeline inset, which is not applied on React Native; the visibility range stays the full scrollport. Adjust the attachment range with \`animation-range\` instead.`,
        timeline.inset
      );
    }
    const entry = timelines.nearest;
    return entry === null ? null : { entry, axis: timeline.axis };
  }
  return null;
}

/**
 * Build the Animated node producing this animation's progress (0..1)
 * from a scroll timeline entry. Applies the attachment range and the
 * iteration/direction mapping over the finite range. Returns `null`
 * when the timeline is inactive (zero extent, empty range, infinite
 * iterations).
 */
export function buildScrollProgressNode(
  desc: AnimationDescriptor,
  entry: ScrollTimelineEntry,
  axis: TimelineAxis,
  viewSubject?: ViewSubjectLayout | null,
  preferNative?: boolean
): any | null {
  const extent = axisExtent(entry, axis);

  // Scroll-offset px positions the progress interpolation maps to 0 / 1.
  let basePx0: number;
  let basePx1: number;
  if (desc.timeline.kind === 'view') {
    const horizontal = isHorizontalAxis(axis);
    const vp = horizontal ? entry.viewportW : entry.viewportH;
    // Inactive until the scroller viewport and the subject have measured.
    if (!(vp > 0) || viewSubject === null || viewSubject === undefined) return null;
    const so = horizontal ? viewSubject.x : viewSubject.y;
    const sh = horizontal ? viewSubject.width : viewSubject.height;
    // Cover range in scroll offsets: starts when the subject's start edge
    // meets the scrollport's end edge (so - vp), ends when its end edge
    // leaves the start edge (so + sh). The named ranges below are px from
    // the cover start; with d = vp the coincidence offsets reduce to
    // contain = [min(vp, sh), max(vp, sh)].
    const coverStart = so - vp;
    const coverLen = sh + vp;
    // "If the 0% position and 100% position coincide ... the timeline is
    // inactive."
    if (!(coverLen > 0)) return null;
    const lo = Math.min(vp, sh);
    const hi = Math.max(vp, sh);
    const named: Partial<Record<TimelineRangeName, NamedRangeRect>> = {
      cover: { startPx: 0, endPx: coverLen },
      contain: { startPx: lo, endPx: hi },
      entry: { startPx: 0, endPx: lo },
      exit: { startPx: hi, endPx: coverLen },
      'entry-crossing': { startPx: 0, endPx: sh },
      'exit-crossing': { startPx: vp, endPx: vp + sh },
      scroll: { startPx: -coverStart, endPx: extent - coverStart },
    };
    const r0 = resolveRangeBoundary(desc.rangeStart, true, coverLen, named);
    const r1 = resolveRangeBoundary(desc.rangeEnd, false, coverLen, named);
    if (r0 === null || r1 === null || r1 <= r0) return null;
    basePx0 = coverStart + r0 * coverLen;
    basePx1 = coverStart + r1 * coverLen;
  } else {
    if (!(extent > 0)) return null;
    const r0 = resolveRangeBoundary(desc.rangeStart, true, extent, null);
    const r1 = resolveRangeBoundary(desc.rangeEnd, false, extent, null);
    if (r0 === null || r1 === null || r1 <= r0) return null;
    basePx0 = r0 * extent;
    basePx1 = r1 * extent;
  }

  const count = desc.iterationCount;
  if (!Number.isFinite(count)) {
    // Scroll-driven timelines are finite; an infinite iteration count
    // yields zero-duration iterations per spec, i.e. nothing to render.
    if (__DEV__) {
      warnOnce(
        'native-scroll-timeline-infinite-iterations',
        `The scroll-driven animation "${desc.name}" declares \`animation-iteration-count: infinite\`, which produces zero-length iterations on a finite timeline. Use a finite iteration count.`,
        desc.name
      );
    }
    return null;
  }
  if (count <= 0) return null;

  let progress = axisOffsetNode(entry, axis, preferNative).interpolate({
    inputRange: [basePx0, basePx1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const reverseAll = desc.direction === 'reverse' || desc.direction === 'alternate-reverse';
  const alternates = desc.direction === 'alternate' || desc.direction === 'alternate-reverse';

  if (count !== 1 || reverseAll) {
    // Map whole-range progress through the iteration structure: each
    // iteration spans 1/count of the range; alternate flips odd cycles.
    // Discontinuities (sawtooth resets) need an epsilon step because
    // interpolation input ranges must be monotonic.
    const inputRange: number[] = [];
    const outputRange: number[] = [];
    const whole = Math.ceil(count);
    const EPS = 1e-6;
    for (let k = 0; k < whole; k++) {
      const startP = k / count;
      const endP = Math.min((k + 1) / count, 1);
      const localEnd = Math.min(count - k, 1);
      let outStart = 0;
      let outEnd = localEnd;
      const flipped = reverseAll !== (alternates && k % 2 === 1);
      if (flipped) {
        outStart = 1;
        outEnd = 1 - localEnd;
      }
      if (inputRange.length > 0) {
        const prevOut = outputRange[outputRange.length - 1];
        if (prevOut !== outStart) {
          // Discontinuous boundary: hold the previous output until just
          // before the new segment starts.
          inputRange.push(startP + EPS);
          outputRange.push(outStart);
        }
      } else {
        inputRange.push(startP);
        outputRange.push(outStart);
      }
      inputRange.push(endP);
      outputRange.push(outEnd);
    }
    progress = progress.interpolate({
      inputRange,
      outputRange,
      extrapolate: 'clamp',
    });
  }

  return progress;
}

/** Component names whose host views emit scroll events RN-side. */
const SCROLLABLE_TARGETS = new Set([
  'ScrollView',
  'FlatList',
  'SectionList',
  'VirtualizedList',
  'AnimatedScrollView',
]);

export function isScrollableTargetName(name: string | undefined): boolean {
  return name !== undefined && SCROLLABLE_TARGETS.has(name);
}

interface PublisherState {
  entry: ScrollTimelineEntry | null;
  contentW: number;
  contentH: number;
  /** Parent-relative frame of the scroller; positions the overlay host. */
  frame: { h: number; w: number; x: number; y: number } | null;
  viewportW: number;
  viewportH: number;
}

/**
 * Render-path hook for styled scroll containers: tracks offsets and
 * extents from the scroller's own events and publishes them through
 * ScrollTimelineContext. Returns the (possibly) augmented element
 * props and a wrap function that layers the Provider when publishing.
 *
 * Hook order is unconditional; `active` only gates the prop work, so
 * non-scroller components pay two refs, a state slot, and a context
 * read.
 */
export function useScrollTimelinePublisher(
  active: boolean,
  namedDecl: { name: string; axis: TimelineAxis } | undefined,
  elementProps: Record<string, any>
): [
  Record<string, any>,
  (inner: React.ReactElement) => React.ReactElement,
  ScrollTimelineEntry | null,
] {
  const parent = React.useContext(ScrollTimelineContext);
  const stateRef = React.useRef<PublisherState | null>(null);
  const [version, setVersion] = React.useState(0);

  if (active && stateRef.current === null) {
    stateRef.current = {
      entry: createScrollTimelineEntry(namedDecl?.axis ?? 'block'),
      contentW: 0,
      contentH: 0,
      frame: null,
      viewportW: 0,
      viewportH: 0,
    };
  }
  const hostRef = React.useRef<any>(null);
  const activeEntry = active ? (stateRef.current?.entry ?? null) : null;
  // Drive the entry's offsets from the UI thread as well: native-driver
  // interpolations (opacity / transform keyframes) then keep pace with
  // the finger instead of trailing the JS thread. The JS onScroll below
  // still runs for extent bookkeeping, layout-prop interpolations, and
  // anything reading the values from JS; its setValue echo writes the
  // value the native mapping already applied for that event, so it is a
  // steady-state no-op (under JS jank it can momentarily rewind one
  // frame, corrected by the next UI-thread event - strictly better than
  // the pure-JS path that lagged continuously).
  React.useEffect(() => {
    const trace = __DEV__ && isDebugEnabled();
    if (activeEntry === null || !activeEntry.nativeDriven) {
      if (trace && activeEntry !== null)
        dbg('scroll-timeline attach: skipped, entry is not native-driven');
      return;
    }
    const rn = getRN();
    const Animated = rn.Animated;
    if (!Animated || typeof Animated.attachNativeEvent !== 'function') {
      if (trace) dbg('scroll-timeline attach: skipped, Animated.attachNativeEvent unavailable');
      return;
    }
    const inst = hostRef.current;
    if (inst == null) {
      if (trace) dbg('scroll-timeline attach: skipped, host ref is empty');
      return;
    }
    // Prefer the host component ref like RN's own sticky-header attach;
    // attachNativeEvent resolves the tag via findNodeHandle internally
    // and SILENTLY no-ops when it can't, so pre-resolve in dev to make
    // a failed attachment loud instead of a quiet JS-paced fallback.
    const node =
      typeof inst.getNativeScrollRef === 'function'
        ? inst.getNativeScrollRef()
        : typeof inst.getScrollableNode === 'function'
          ? inst.getScrollableNode()
          : inst;
    if (node == null) {
      if (trace) dbg('scroll-timeline attach: skipped, scrollable node is empty');
      return;
    }
    // Pre-resolve the tag: attachNativeEvent silently no-ops on a null
    // tag (after native-tagging the values), which would leave the echo
    // disabled with nothing driving the native pair. Test renderers
    // resolve no tags, so they keep the echo and stay observable.
    // `getRN()` deliberately exposes no `findNodeHandle` (Fabric public
    // instances carry the tag directly), so the field reads do the work.
    const tag = resolveNativeViewTag(node, (rn as any).findNodeHandle ?? null);
    if (tag === null) {
      if (trace) dbg('scroll-timeline attach: no native view tag on the scroll host');
      if (__DEV__ && !isJestLikeHost()) {
        warnOnce(
          'native-scroll-timeline-attach-failed',
          'Could not resolve a native view tag for a styled scroll container, so its scroll timeline (and any position: sticky children) fall back to JavaScript-paced updates and may visibly trail fast scrolling. This usually means the scroll component does not expose its host ref.',
          'attach'
        );
      }
      return;
    }
    try {
      const sub = Animated.attachNativeEvent(node, 'onScroll', [
        {
          nativeEvent: {
            contentOffset: { x: activeEntry.offsetXNative, y: activeEntry.offsetYNative },
          },
        },
      ]);
      activeEntry.nativeAttached = true;
      if (trace) dbg('scroll-timeline attach: ok, native scroll event attached to tag', tag);
      return () => {
        activeEntry.nativeAttached = false;
        if (__DEV__ && isDebugEnabled()) dbg('scroll-timeline attach: detached from tag', tag);
        sub.detach();
      };
    } catch (e) {
      if (trace) dbg('scroll-timeline attach: attachNativeEvent threw', e);
      // Hosts without native animated support (test renderers, exotic
      // scrollables) keep the JS-driven path.
      if (__DEV__) {
        warnOnce(
          'native-scroll-timeline-attach-failed',
          'Attaching the native scroll event for a styled scroll container threw' +
            (e instanceof Error ? ` (${e.message})` : '') +
            '; its scroll timeline and position: sticky children fall back to JavaScript-paced updates.',
          'threw'
        );
      }
      return;
    }
  }, [activeEntry]);
  const state = stateRef.current;
  const entry = active ? (state?.entry ?? null) : null;
  const name = namedDecl?.name;
  // Identity changes only when extents bump `version` (or scope inputs
  // move), so descendants' context subscriptions and render caches stay
  // stable across unrelated scroller re-renders.
  const contextValue = React.useMemo<ScrollTimelineContextValue | null>(
    () =>
      entry === null
        ? null
        : {
            nearest: entry,
            named: name !== undefined ? { ...parent.named, [name]: entry } : parent.named,
          },
    [entry, name, parent, version]
  );

  if (!active || state === null || entry === null || contextValue === null) {
    return [elementProps, identityWrap, null];
  }

  const refreshExtents = () => {
    const extentX = Math.max(0, state.contentW - state.viewportW);
    const extentY = Math.max(0, state.contentH - state.viewportH);
    if (
      extentX !== entry.extentX ||
      extentY !== entry.extentY ||
      state.viewportW !== entry.viewportW ||
      state.viewportH !== entry.viewportH
    ) {
      entry.extentX = extentX;
      entry.extentY = extentY;
      entry.viewportW = state.viewportW;
      entry.viewportH = state.viewportH;
      setVersion(v => v + 1);
    }
  };

  const userOnScroll = elementProps.onScroll;
  const userOnLayout = elementProps.onLayout;
  const userOnContentSizeChange = elementProps.onContentSizeChange;

  const onScroll = (e: any) => {
    const ne = e?.nativeEvent;
    if (ne) {
      if (ne.contentOffset) {
        const x = ne.contentOffset.x ?? 0;
        const y = ne.contentOffset.y ?? 0;
        entry.offsetX.setValue(x);
        entry.offsetY.setValue(y);
        // Echo into the native pair ONLY until the native event attaches;
        // see the nativeAttached field note.
        if (entry.nativeDriven && !entry.nativeAttached) {
          entry.offsetXNative.setValue(x);
          entry.offsetYNative.setValue(y);
        }
      }
      if (ne.contentSize && ne.layoutMeasurement) {
        state.contentW = ne.contentSize.width ?? state.contentW;
        state.contentH = ne.contentSize.height ?? state.contentH;
        state.viewportW = ne.layoutMeasurement.width ?? state.viewportW;
        state.viewportH = ne.layoutMeasurement.height ?? state.viewportH;
        refreshExtents();
      }
    }
    if (typeof userOnScroll === 'function') userOnScroll(e);
  };
  const onLayout = (e: any) => {
    const l = e?.nativeEvent?.layout;
    if (l) {
      state.viewportW = l.width;
      state.viewportH = l.height;
      const f = state.frame;
      if (f === null || f.x !== l.x || f.y !== l.y || f.w !== l.width || f.h !== l.height) {
        state.frame = { h: l.height, w: l.width, x: l.x, y: l.y };
        setVersion(v => v + 1);
      }
      refreshExtents();
    }
    if (typeof userOnLayout === 'function') userOnLayout(e);
  };
  const onContentSizeChange = (w: number, h: number) => {
    state.contentW = w;
    state.contentH = h;
    refreshExtents();
    if (typeof userOnContentSizeChange === 'function') userOnContentSizeChange(w, h);
  };

  const userRef = elementProps.ref;
  const augmented: Record<string, any> = {
    ...elementProps,
    onScroll,
    onLayout,
    onContentSizeChange,
    ref: (inst: any) => {
      hostRef.current = inst;
      entry.host = inst;
      if (typeof userRef === 'function') userRef(inst);
      else if (userRef != null && typeof userRef === 'object') userRef.current = inst;
    },
  };
  if (augmented.scrollEventThrottle === undefined) augmented.scrollEventThrottle = 16;

  // The browser implements position: sticky itself on rn-web (the
  // declaration passes through at compile time), so the overlay host
  // tree-shakes out of that bundle.
  const wrap = (inner: React.ReactElement): React.ReactElement =>
    React.createElement(
      ScrollTimelineContext.Provider,
      { value: contextValue },
      __NATIVE_WEB__
        ? inner
        : React.createElement(
            React.Fragment,
            null,
            inner,
            React.createElement(StickyOverlayHost, {
              frame: state.frame,
              registry: entry.stickyClones,
            })
          )
    );
  return [augmented, wrap, entry];
}

function identityWrap(inner: React.ReactElement): React.ReactElement {
  return inner;
}

let viewComponentCache: any = null;
function getViewComponent(): any {
  if (viewComponentCache === null) {
    try {
      viewComponentCache = require('react-native').View ?? 'View';
    } catch {
      viewComponentCache = 'View';
    }
  }
  return viewComponentCache;
}

/**
 * Sibling of a styled scroll container, absolutely positioned over its
 * measured frame, rendering the layout-pinned twins of its `position:
 * sticky` children. Being outside the scrolling coordinate space, a
 * stuck twin is stationary by construction: nothing updates per frame,
 * so it cannot trail or wobble during flings. `box-none` keeps the
 * host transparent to touches outside the twins themselves.
 */
function StickyOverlayHost(props: {
  frame: { h: number; w: number; x: number; y: number } | null;
  registry: StickyCloneRegistry;
}): React.ReactElement | null {
  const { frame, registry } = props;
  useRegistryVersion(registry);
  if (frame === null || registry.clones.size === 0) return null;
  return React.createElement(
    getViewComponent(),
    {
      pointerEvents: 'box-none',
      style: {
        height: frame.h,
        left: frame.x,
        position: 'absolute',
        top: frame.y,
        width: frame.w,
        zIndex: 10,
      },
    },
    ...registry.clones.values()
  );
}

/**
 * Cache key for the built progress node; when any component changes,
 * the adapter rebuilds the keyframe interpolations against a fresh
 * node. Entry identity is stable per publisher, so extent + range +
 * iteration shape is sufficient.
 */
export function scrollTimelineKey(
  desc: AnimationDescriptor,
  entry: ScrollTimelineEntry,
  axis: TimelineAxis,
  viewSubject?: ViewSubjectLayout | null,
  preferNative?: boolean
): string {
  let key =
    (preferNative === true ? 'n:' : 'j:') +
    axisExtent(entry, axis) +
    ':' +
    axis +
    ':' +
    desc.iterationCount +
    ':' +
    desc.direction +
    ':' +
    JSON.stringify(desc.rangeStart) +
    ':' +
    JSON.stringify(desc.rangeEnd);
  if (desc.timeline.kind === 'view') {
    const horizontal = isHorizontalAxis(axis);
    const vp = horizontal ? entry.viewportW : entry.viewportH;
    const so = viewSubject ? (horizontal ? viewSubject.x : viewSubject.y) : -1;
    const sh = viewSubject ? (horizontal ? viewSubject.width : viewSubject.height) : -1;
    key += ':view:' + vp + ':' + so + ':' + sh;
  }
  return key;
}

/**
 * Render-path hook for view progress subjects: captures the element's
 * layout from a composed onLayout so the adapter can place the subject
 * within its scroller's visibility range. Coordinates are
 * parent-relative, so the supported subjects are direct children of the
 * styled scroll container; deeper subjects keep an inactive timeline.
 *
 * Hook order is unconditional; `active` only gates the prop work.
 */
export function useViewTimelineSubject(
  active: boolean
): [ViewSubjectLayout | null, (props: Record<string, any>) => Record<string, any>] {
  const [layout, setLayout] = React.useState<ViewSubjectLayout | null>(null);
  const layoutRef = React.useRef<ViewSubjectLayout | null>(null);
  layoutRef.current = layout;

  if (!active) return [null, identityProps];

  const compose = (props: Record<string, any>): Record<string, any> => {
    const userOnLayout = props.onLayout;
    const onLayout = (e: any) => {
      const l = e?.nativeEvent?.layout;
      if (l) {
        const prev = layoutRef.current;
        if (
          prev === null ||
          prev.x !== l.x ||
          prev.y !== l.y ||
          prev.width !== l.width ||
          prev.height !== l.height
        ) {
          setLayout({ x: l.x, y: l.y, width: l.width, height: l.height });
        }
      }
      if (typeof userOnLayout === 'function') userOnLayout(e);
    };
    return { ...props, onLayout };
  };
  return [layout, compose];
}

/**
 * `scroll-snap-align` child registration. The child reports its measured
 * layout (content-relative, so direct children of the scroll container
 * only, same constraint as view() subjects) plus its alignment into the
 * nearest styled scroll container's snap registry. The scroll container
 * derives `snapToOffsets` from the registry (see useSnapOffsets).
 */
export function useSnapTargetRegistration(
  target: { align: string; stop: boolean } | undefined,
  elementProps: Record<string, any>
): Record<string, any> {
  const parent = React.useContext(ScrollTimelineContext);
  const keyRef = React.useRef<{ reg: SnapTargetRegistry | null } | null>(null);
  if (keyRef.current === null) keyRef.current = { reg: null };
  const key = keyRef.current;
  React.useEffect(
    () => () => {
      if (key.reg !== null && key.reg.targets.delete(key)) notifyRegistry(key.reg);
      key.reg = null;
    },
    [key]
  );
  if (target === undefined || __NATIVE_WEB__) return elementProps;
  const entry = parent.nearest;
  if (entry === null) return elementProps;
  const registry = entry.snapTargets;
  key.reg = registry;

  const userOnLayout = elementProps.onLayout;
  const onLayout = (e: any) => {
    const l = e?.nativeEvent?.layout;
    if (l !== undefined) {
      const prev = registry.targets.get(key);
      if (
        prev === undefined ||
        prev.x !== l.x ||
        prev.y !== l.y ||
        prev.w !== l.width ||
        prev.h !== l.height ||
        prev.align !== target.align ||
        prev.stop !== target.stop
      ) {
        registry.targets.set(key, {
          align: target.align,
          h: l.height,
          stop: target.stop,
          w: l.width,
          x: l.x,
          y: l.y,
        });
        notifyRegistry(registry);
      }
    }
    if (typeof userOnLayout === 'function') userOnLayout(e);
  };
  return { ...elementProps, onLayout };
}

/** Pick the axis keyword from a 1-2 keyword scroll-snap-align value:
 *  one keyword applies to both axes; two are [block, inline]. */
function alignForAxis(align: string, horizontal: boolean): string {
  const space = align.indexOf(' ');
  if (space === -1) return align;
  return horizontal ? align.slice(space + 1) : align.slice(0, space);
}

/**
 * Scroll-container side of CSS scroll snap: derive `snapToOffsets` from
 * the registered `scroll-snap-align` children. Offsets follow
 * css-scroll-snap-1 alignment (start / center / end of the snap area
 * against the snapport), clamped to the scrollable extent. Any child
 * with `scroll-snap-stop: always` sets `disableIntervalMomentum`.
 * User-supplied snapToOffsets / snapToInterval win untouched.
 */
export function useSnapOffsets(
  active: boolean,
  entry: ScrollTimelineEntry | null,
  elementProps: Record<string, any>
): Record<string, any> {
  useRegistryVersion(entry !== null ? entry.snapTargets : null);
  // The derived array keeps its identity while the inputs hold so the
  // host's snapToOffsets prop compares equal across unrelated re-renders
  // (Paper deep-diffs it per commit; Fabric re-serializes on change).
  const cache = React.useRef<{ key: string; offsets: number[]; stop: boolean } | null>(null);

  if (!active || __NATIVE_WEB__ || entry === null) return elementProps;
  const registry = entry.snapTargets;
  if (registry.targets.size === 0) return elementProps;
  if (elementProps.snapToOffsets !== undefined || elementProps.snapToInterval !== undefined) {
    return elementProps;
  }

  const horizontal = elementProps.horizontal === true;
  const viewport = horizontal ? entry.viewportW : entry.viewportH;
  if (viewport <= 0) return elementProps;
  // Extent is exactly the maximum scroll offset (content minus viewport,
  // clamped to >= 0 by the publisher).
  const maxOff = horizontal ? entry.extentX : entry.extentY;

  const cacheKey =
    registry.version + ':' + viewport + ':' + maxOff + ':' + (horizontal ? 'x' : 'y');
  let deduped: number[];
  let stop: boolean;
  if (cache.current !== null && cache.current.key === cacheKey) {
    deduped = cache.current.offsets;
    stop = cache.current.stop;
  } else {
    const offsets: number[] = [];
    stop = false;
    registry.targets.forEach(t => {
      if (t.stop) stop = true;
      const align = alignForAxis(t.align, horizontal);
      if (align === 'none') return;
      const pos = horizontal ? t.x : t.y;
      const size = horizontal ? t.w : t.h;
      let off: number;
      if (align === 'center') off = pos + size / 2 - viewport / 2;
      else if (align === 'end') off = pos + size - viewport;
      else off = pos;
      if (off < 0) off = 0;
      if (off > maxOff) off = maxOff;
      offsets.push(off);
    });
    offsets.sort((a, b) => a - b);
    deduped = offsets.length === 0 ? offsets : [offsets[0]];
    for (let i = 1; i < offsets.length; i++) {
      if (offsets[i] - deduped[deduped.length - 1] > 0.5) deduped.push(offsets[i]);
    }
    cache.current = { key: cacheKey, offsets: deduped, stop };
  }
  if (deduped.length === 0) return elementProps;
  const out: Record<string, any> = { ...elementProps, snapToOffsets: deduped };
  if (stop && out.disableIntervalMomentum === undefined) out.disableIntervalMomentum = true;
  return out;
}

/** True under test renderers, where view tags never resolve by design. */
function isJestLikeHost(): boolean {
  return typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID;
}

function identityProps(props: Record<string, any>): Record<string, any> {
  return props;
}

/**
 * Resolve a host instance's native view tag the way RN's animated event
 * attach does: Fabric public instances (ReactNativeElement) carry
 * `__nativeTag`, Paper host instances carry `_nativeTag`, and anything
 * else goes through `findNodeHandle` when one is supplied. Returns null
 * when no tag exists (test renderers).
 */
export function resolveNativeViewTag(
  node: any,
  findNodeHandle: ((node: any) => number | null) | null
): number | null {
  if (typeof node.__nativeTag === 'number') return node.__nativeTag;
  if (typeof node._nativeTag === 'number') return node._nativeTag;
  if (typeof findNodeHandle === 'function') {
    const tag = findNodeHandle(node);
    return typeof tag === 'number' ? tag : null;
  }
  return null;
}

const ANIMATED_WRAPPER_CACHE = new WeakMap<object, any>();

/**
 * Animated-component wrapper for a host element type, cached per target
 * so the wrapped identity is render-stable (a fresh wrapper each render
 * would remount the element). Sticky twins need it to consume the
 * UI-thread opacity nodes.
 */
export function getAnimatedComponentCached(target: any): any | null {
  const Animated = getRN().Animated;
  if (!Animated || typeof Animated.createAnimatedComponent !== 'function') return null;
  if (typeof target !== 'function' && (typeof target !== 'object' || target === null)) return null;
  const cached = ANIMATED_WRAPPER_CACHE.get(target);
  if (cached !== undefined) return cached;
  const wrapped = Animated.createAnimatedComponent(target);
  ANIMATED_WRAPPER_CACHE.set(target, wrapped);
  return wrapped;
}

interface StickyLayout {
  width: number;
  x: number;
  y: number;
}

export interface StickyPosition {
  /** True when the layer identity changed since the previous render;
   *  the render path must invalidate its element-props cache. */
  changed: boolean;
  /** Compose the layout listener (and stuck-state accessibility flag)
   *  onto the in-flow element props. */
  compose: (props: Record<string, any>) => Record<string, any>;
  /** In-flow fade-out at the crossover, or null while inactive /
   *  unmeasured / outside a styled scroller. */
  layer: { opacity: any } | null;
  /** Publish the layout-pinned twin of the final rendered element into
   *  the scroller's overlay. `style` is the element's resolved style
   *  WITHOUT the in-flow fade layer. */
  register: (type: any, props: Record<string, any>, style: any) => void;
}

function noopRegister(): void {}

const INACTIVE_STICKY: StickyPosition = {
  changed: false,
  compose: identityProps,
  layer: null,
  register: noopRegister,
};

let stickyIdCounter = 0;

/**
 * Render-path hook for `position: sticky` elements. The element renders
 * twice: the in-flow original keeps its layout slot, and a clone is
 * published into the nearest styled scroll container's overlay host,
 * absolutely pinned at the scrollport's top edge. Visibility hands off
 * at the crossover through complementary UI-thread opacity
 * interpolations over half a pixel of scroll, so the stuck position is
 * fixed by layout and never trails a fling. (Both per-frame translate
 * driving and React Native's own `stickyHeaderIndices` visibly shimmer
 * under scroll momentum on the new architecture; position must not
 * depend on per-frame updates at all.)
 *
 * Touch routing and accessibility flip with a JS-paced stuck flag;
 * binary, crossover-only, where a frame of latency is imperceptible.
 *
 * Direct children of the scroller only: the element's resting position
 * comes from its parent-relative onLayout. Hook order is unconditional;
 * `active` only gates the work.
 */
export function useStickyPosition(active: boolean): StickyPosition {
  const timelines = React.useContext(ScrollTimelineContext);
  const [layout, setLayout] = React.useState<StickyLayout | null>(null);
  const [stuck, setStuck] = React.useState(false);
  const layoutRef = React.useRef<StickyLayout | null>(null);
  layoutRef.current = layout;
  const prevLayerRef = React.useRef<StickyPosition['layer']>(null);
  const idRef = React.useRef(0);
  if (idRef.current === 0) idRef.current = ++stickyIdCounter;
  const cloneRef = React.useRef<React.ReactElement | null>(null);

  const entry = active ? timelines.nearest : null;
  const layoutY = layout === null ? null : layout.y;

  const fades = React.useMemo(() => {
    if (entry === null || layoutY === null) {
      if (__DEV__ && isDebugEnabled() && active) {
        dbg(
          'sticky: twin not built,',
          entry === null ? 'no styled scroll container in scope' : 'awaiting onLayout'
        );
      }
      return null;
    }
    if (__DEV__ && isDebugEnabled()) {
      dbg('sticky: overlay twin pinned, layoutY =', layoutY);
    }
    const offset = axisOffsetNode(entry, 'block', true);
    // Half a pixel of scroll swaps the twins; both opacities read the
    // same UI-thread value, so they are complementary every frame.
    const inputRange = [layoutY - 0.5, layoutY];
    return {
      cloneOpacity: offset.interpolate({ extrapolate: 'clamp', inputRange, outputRange: [0, 1] }),
      inFlowOpacity: offset.interpolate({ extrapolate: 'clamp', inputRange, outputRange: [1, 0] }),
    };
  }, [entry, layoutY]);

  const layer = React.useMemo(
    () => (fades === null ? null : { opacity: fades.inFlowOpacity }),
    [fades]
  );
  const changed = layer !== prevLayerRef.current;
  prevLayerRef.current = layer;

  // Stuck flag for touch routing and accessibility. JS-paced on
  // purpose: it changes only at the crossover, and pointerEvents /
  // accessibility props cannot be driven natively anyway.
  React.useEffect(() => {
    if (entry === null || layoutY === null) return;
    const read = () => {
      const v = typeof entry.offsetY.__getValue === 'function' ? entry.offsetY.__getValue() : 0;
      setStuck(v >= layoutY);
    };
    read();
    const sub = entry.offsetY.addListener(({ value }: { value: number }) =>
      setStuck(value >= layoutY)
    );
    return () => entry.offsetY.removeListener(sub);
  }, [entry, layoutY]);

  // Publish the twin built by register() below. Runs every render: the
  // element captures this render's props/style, and sticky elements
  // re-render rarely (mount, layout change, crossover).
  React.useEffect(() => {
    if (entry === null) return;
    const registry = entry.stickyClones;
    const clone = cloneRef.current;
    if (clone !== null) {
      registry.clones.set(idRef.current, clone);
      notifyRegistry(registry);
    }
  });

  React.useEffect(() => {
    if (entry === null) return;
    const registry = entry.stickyClones;
    return () => {
      if (registry.clones.delete(idRef.current)) notifyRegistry(registry);
    };
  }, [entry]);

  if (!active) {
    cloneRef.current = null;
    return INACTIVE_STICKY;
  }

  const compose = (props: Record<string, any>): Record<string, any> => {
    const userOnLayout = props.onLayout;
    const onLayout = (e: any) => {
      const l = e?.nativeEvent?.layout;
      if (l && typeof l.y === 'number') {
        const prev = layoutRef.current;
        if (prev === null || prev.x !== l.x || prev.y !== l.y || prev.width !== l.width) {
          setLayout({ width: l.width, x: l.x, y: l.y });
        }
      }
      if (typeof userOnLayout === 'function') userOnLayout(e);
    };
    const out: Record<string, any> = { ...props, onLayout };
    if (stuck) {
      // The pinned twin is the visible, interactive one now.
      out.accessibilityElementsHidden = true;
      out.importantForAccessibility = 'no-hide-descendants';
    }
    return out;
  };

  const register = (type: any, props: Record<string, any>, style: any): void => {
    if (entry === null || layout === null || fades === null) {
      cloneRef.current = null;
      return;
    }
    const { onLayout: _onLayout, ref: _ref, style: _style, ...rest } = props;
    cloneRef.current = React.createElement(type, {
      ...rest,
      accessibilityElementsHidden: !stuck,
      importantForAccessibility: stuck ? 'auto' : 'no-hide-descendants',
      key: 'sc-sticky-' + idRef.current,
      pointerEvents: stuck ? 'auto' : 'none',
      style: [
        style,
        {
          left: layout.x,
          opacity: fades.cloneOpacity,
          position: 'absolute',
          top: 0,
          width: layout.width,
        },
      ],
    });
  };

  return { changed, compose, layer, register };
}
