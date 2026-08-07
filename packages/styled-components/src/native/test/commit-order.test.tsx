/**
 * Commit-order baseline for the native registry hooks.
 *
 * The other native suites assert *what* lands in a registry. This one
 * asserts *when*, relative to a consumer's own commit phases, because
 * the migration off passive and layout effects moves work between
 * phases and three failure modes pass straight through a
 * what-only assertion:
 *
 * - Phase shift. Ref detach runs in the mutation phase, ref attach in
 *   the layout phase, effect cleanup after paint. Moving a
 *   deregistration from effect cleanup to ref cleanup moves it earlier,
 *   so a sibling reading that registry through useSyncExternalStore
 *   observes a different intermediate state for a frame.
 * - Trigger-set mismatch. `useEffect(fn, [entry])` cleans up whenever
 *   `entry` changes; a frozen ref callback cleans up on unmount and on
 *   ref-identity change only. A deregistration keyed on `entry` silently
 *   stops happening when the scroll container swaps.
 * - Never armed. If the decorated props reach a composite rather than a
 *   host, or the ref is dropped by prop filtering, the teardown never
 *   registers. "Registry empty after unmount" passes identically whether
 *   cleanup ran or registration never happened.
 *
 * The expected sequences below are a banked baseline recorded against
 * the effect-based implementation. They are hand-written rather than
 * snapshotted on purpose: a migration that changes the order has to edit
 * this file deliberately and say why, instead of running `jest -u`.
 */

import React from 'react';
import { ScrollView, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { resetNativeStyleCache } from '../../models/compileNative';
import styled from '../';
import { getRN, resetResponsiveCache } from '../responsive';
import { resetWarningsForTest } from '../transform/dev';
import {
  getAnchorRect,
  resetAnchorsForTest,
  subscribeAnchors,
  useAnchorNamePublisher,
} from '../anchorRegistry';
import {
  attachNativeScrollMapping,
  createScrollTimelineEntry,
  ScrollTimelineContext,
  type ScrollTimelineContextValue,
  type ScrollTimelineEntry,
  useSnapTargetRegistration,
  useStickyPosition,
} from '../scrollTimeline';
import { useSnapSettle } from '../snapSettle';
import { useComposedRef } from '../composeRef';

/** Names the anchor probe reports on; the module keeps no name list. */
const ANCHOR_NAMES = ['--a', '--b'];

let log: string[] = [];
let labels: Map<unknown, string>;
let counters: Map<string, number>;

function rec(text: string): void {
  log.push(text);
}

/** Stable label for a registry key whose real value is a module-scoped
 *  counter or an opaque object, neither reproducible across runs. */
function label(prefix: string, key: unknown): string {
  const existing = labels.get(key);
  if (existing !== undefined) return existing;
  const n = counters.get(prefix) ?? 0;
  counters.set(prefix, n + 1);
  const next = `${prefix}#${n}`;
  labels.set(key, next);
  return next;
}

/**
 * Wrap a live entry's registry mutation points. The recorder listener is
 * added before any subscriber hook runs, so it always reports first
 * within a single notify pass, which keeps the interleaving stable.
 */
function instrument(entry: ScrollTimelineEntry): ScrollTimelineEntry {
  const sticky = entry.stickyClones;
  const stickySet = sticky.clones.set.bind(sticky.clones);
  const stickyDelete = sticky.clones.delete.bind(sticky.clones);
  sticky.clones.set = (key, value) => {
    rec(`sticky.set ${label('sticky', key)}`);
    return stickySet(key, value);
  };
  sticky.clones.delete = key => {
    const removed = stickyDelete(key);
    rec(`sticky.delete ${label('sticky', key)} -> ${removed}`);
    return removed;
  };
  sticky.listeners.add(() => rec('sticky.notify'));

  const snap = entry.snapTargets;
  const snapSet = snap.targets.set.bind(snap.targets);
  const snapDelete = snap.targets.delete.bind(snap.targets);
  snap.targets.set = (key, value) => {
    rec(`snap.set ${label('snap', key)}`);
    return snapSet(key, value);
  };
  snap.targets.delete = key => {
    const removed = snapDelete(key);
    rec(`snap.delete ${label('snap', key)} -> ${removed}`);
    return removed;
  };
  snap.listeners.add(() => rec('snap.notify'));

  return entry;
}

function newEntry(): ScrollTimelineEntry {
  const entry = createScrollTimelineEntry('block');
  if (entry === null) throw new Error('Animated unavailable; the RN mock did not load.');
  return instrument(entry);
}

/**
 * Consumer standing in for application code around the hooks. Records
 * from every phase a migration could move work across, so the flat log
 * pins registry writes against the commit timeline rather than against
 * each other.
 */
function Sentinel({ tag }: { tag: string }): React.ReactElement {
  rec(`${tag}:render`);
  React.useInsertionEffect(() => {
    rec(`${tag}:insertion`);
    return () => rec(`${tag}:insertion-cleanup`);
  });
  React.useLayoutEffect(() => {
    rec(`${tag}:layout`);
    return () => rec(`${tag}:layout-cleanup`);
  });
  React.useEffect(() => {
    rec(`${tag}:passive`);
    return () => rec(`${tag}:passive-cleanup`);
  });
  // Frozen identity: an inline arrow would detach and reattach every
  // render, which is noise here rather than signal.
  const ref = React.useCallback(
    (node: unknown) => {
      rec(`${tag}:ref${node === null ? '-detach' : '-attach'}`);
    },
    [tag]
  );
  return <View ref={ref} />;
}

function StickyChild({ testID }: { testID: string }): React.ReactElement {
  rec('sticky:render');
  const sticky = useStickyPosition(true);
  const props = sticky.compose({});
  sticky.register(View, props, { height: 10 });
  return <View {...props} testID={testID} />;
}

function SnapChild({ testID }: { testID: string }): React.ReactElement {
  rec('snap:render');
  const props = useSnapTargetRegistration({ align: 'start', stop: false }, {});
  return <View {...props} testID={testID} />;
}

function AnchorChild({ name, testID }: { name: string; testID: string }): React.ReactElement {
  rec('anchor:render');
  const props = useAnchorNamePublisher(name, {});
  return <View {...props} testID={testID} />;
}

interface TreeProps {
  anchorName: string;
  entry: ScrollTimelineEntry;
  withSticky?: boolean;
}

function Tree({ anchorName, entry, withSticky = true }: TreeProps): React.ReactElement {
  const value = React.useMemo<ScrollTimelineContextValue>(
    () => ({ named: {}, nearest: entry }),
    [entry]
  );
  return (
    <ScrollTimelineContext.Provider value={value}>
      <Sentinel tag="head" />
      {withSticky ? <StickyChild testID="sticky" /> : null}
      <SnapChild testID="snap" />
      <AnchorChild name={anchorName} testID="anchor" />
      <Sentinel tag="tail" />
    </ScrollTimelineContext.Provider>
  );
}

function layoutOf(x: number, y: number, width: number, height: number) {
  return { nativeEvent: { layout: { height, width, x, y } } };
}

/** Fire onLayout on every participant that has one, in tree order. */
function measure(renderer: TestRenderer.ReactTestRenderer): void {
  act(() => {
    for (const testID of ['sticky', 'snap', 'anchor']) {
      const found = renderer.root.findAll(
        n => typeof n.type !== 'string' && n.props.testID === testID,
        { deep: true }
      );
      for (const node of found) {
        const onLayout = node.props.onLayout;
        if (typeof onLayout === 'function') onLayout(layoutOf(0, 40, 200, 60));
      }
    }
  });
}

let renderers: TestRenderer.ReactTestRenderer[] = [];
function track(r: TestRenderer.ReactTestRenderer) {
  renderers.push(r);
  return r;
}

beforeEach(() => {
  log = [];
  labels = new Map();
  counters = new Map();
  resetResponsiveCache();
  resetNativeStyleCache();
  resetWarningsForTest();
  resetAnchorsForTest();
  // Subscribe after the reset: resetAnchorsForTest clears the listeners.
  subscribeAnchors(() => {
    const present = ANCHOR_NAMES.filter(n => getAnchorRect(n) !== undefined);
    rec(`anchor.notify [${present.join(',')}]`);
  });
});

afterEach(() => {
  for (const r of renderers) {
    try {
      act(() => r.unmount());
    } catch {}
  }
  renderers = [];
});

/**
 * Guard against a vacuous comparison. Two equal arrays prove nothing if
 * neither contains what the test is about, and a harness whose ref
 * plumbing silently broke records only sentinel markers.
 */
function assertNonVacuous(seq: string[]): void {
  expect(seq.some(s => s.startsWith('sticky.'))).toBe(true);
  expect(seq.some(s => s.startsWith('snap.'))).toBe(true);
  expect(seq.some(s => s.startsWith('anchor.'))).toBe(true);
  expect(seq.some(s => s.includes(':layout'))).toBe(true);
  expect(seq.some(s => s.includes(':passive'))).toBe(true);
  expect(seq.some(s => s.includes(':ref-'))).toBe(true);
}

/** Take and clear the log, so each phase of a scenario reads alone. */
function take(): string[] {
  const out = log;
  log = [];
  return out;
}

describe('commit-order baseline', () => {
  it('mount then measure', () => {
    const entry = newEntry();
    const renderer = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    const mount = take();
    measure(renderer);
    const measured = take();

    assertNonVacuous([...mount, ...measured]);
    // Nothing registers on mount alone: every registration is keyed on a
    // measured layout, and sticky publishes only once `register` has a
    // clone to publish.
    expect(mount).toEqual([
      'head:render',
      'sticky:render',
      'snap:render',
      'anchor:render',
      'tail:render',
      'head:insertion',
      'tail:insertion',
      'head:ref-attach',
      'head:layout',
      'tail:ref-attach',
      'tail:layout',
      'head:passive',
      'tail:passive',
    ]);
    // Sticky renders exactly once per measure. It used to render twice,
    // the second render being an effect calling setStuck with the value
    // the first render could already have read; subscribing to the
    // Animated.Value settles the flag in the same commit that learns the
    // layout. Any migration that re-adds a second render shows up here.
    expect(measured).toEqual([
      'snap.set snap#0',
      'snap.notify',
      'anchor.notify [--a]',
      'sticky:render',
      'sticky.set sticky#0',
      'sticky.notify',
    ]);
  });

  it('unmount', () => {
    const entry = newEntry();
    const renderer = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    measure(renderer);
    take();
    act(() => renderer.unmount());
    // Snap and anchor tear down from ref cleanup, so they land in the
    // mutation phase alongside the sentinels' ref detach, BEFORE paint.
    // They used to sit in the passive block at the bottom. That move is
    // the point of the migration: a sibling reading either registry
    // through useSyncExternalStore no longer paints one frame against a
    // registry still holding a dead entry.
    //
    // Sticky is still in the passive block because its publish half
    // stays an effect; see the carve-out note in useStickyPosition.
    expect(take()).toEqual([
      'head:insertion-cleanup',
      'head:layout-cleanup',
      'head:ref-detach',
      'snap.delete snap#0 -> true',
      'snap.notify',
      'anchor.notify []',
      'tail:insertion-cleanup',
      'tail:layout-cleanup',
      'tail:ref-detach',
      'head:passive-cleanup',
      'sticky.delete sticky#0 -> true',
      'sticky.notify',
      'tail:passive-cleanup',
    ]);
  });

  it('entry change: the scroll container swaps', () => {
    const first = newEntry();
    const renderer = track(TestRenderer.create(<Tree anchorName="--a" entry={first} />));
    measure(renderer);
    take();
    const second = newEntry();
    act(() => renderer.update(<Tree anchorName="--a" entry={second} />));
    // Only sticky reacts, because only sticky's deregistration is keyed
    // on `entry`: the clone moves to the new registry within the same
    // commit. Snap has no entry-keyed teardown, so its target sits in the
    // OLD registry and the new one stays empty until the child measures
    // again, which is why the log shows no snap op at all here.
    expect(take()).toEqual([
      'head:render',
      'sticky:render',
      'snap:render',
      'anchor:render',
      'tail:render',
      'head:insertion-cleanup',
      'head:insertion',
      'head:layout-cleanup',
      'tail:insertion-cleanup',
      'tail:insertion',
      'tail:layout-cleanup',
      'head:layout',
      'tail:layout',
      'head:passive-cleanup',
      'sticky.delete sticky#0 -> true',
      'sticky.notify',
      'tail:passive-cleanup',
      'head:passive',
      'sticky.set sticky#0',
      'sticky.notify',
      'tail:passive',
    ]);
  });

  it('anchor rename', () => {
    const entry = newEntry();
    const renderer = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    measure(renderer);
    take();
    act(() => renderer.update(<Tree anchorName="--b" entry={entry} />));
    measure(renderer);
    // The rename releases `--a` in the mutation phase and republishes as
    // `--b` on the next layout, so the registry ends holding one name.
    // This was a bug until the ref callback landed: the teardown it
    // replaced was a bare `[]`-dep effect reading the name from a ref, so
    // it only ever fired at unmount and the old rect outlived the rename
    // for every `anchor()` consumer still resolving it. Keying the ref
    // callback's identity on `name` is what fixes it, since React runs a
    // ref cleanup on identity change as well as on unmount.
    expect(take()).toEqual([
      'head:render',
      'sticky:render',
      'snap:render',
      'anchor:render',
      'tail:render',
      'head:insertion-cleanup',
      'head:insertion',
      'head:layout-cleanup',
      'anchor.notify []',
      'tail:insertion-cleanup',
      'tail:insertion',
      'tail:layout-cleanup',
      'head:layout',
      'tail:layout',
      'head:passive-cleanup',
      'tail:passive-cleanup',
      'head:passive',
      'sticky.set sticky#0',
      'sticky.notify',
      'tail:passive',
      'anchor.notify [--b]',
    ]);
  });

  it('sibling removal', () => {
    const entry = newEntry();
    const renderer = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    measure(renderer);
    take();
    act(() => renderer.update(<Tree anchorName="--a" entry={entry} withSticky={false} />));
    // A deleted subtree's passive cleanup is flushed ahead of the
    // surviving siblings' own effect churn, so the sticky delete lands
    // between the sentinels' layout and passive phases rather than after
    // both, unlike the whole-tree unmount above.
    expect(take()).toEqual([
      'head:render',
      'snap:render',
      'anchor:render',
      'tail:render',
      'head:insertion-cleanup',
      'head:insertion',
      'head:layout-cleanup',
      'tail:insertion-cleanup',
      'tail:insertion',
      'tail:layout-cleanup',
      'head:layout',
      'tail:layout',
      'sticky.delete sticky#0 -> true',
      'sticky.notify',
      'head:passive-cleanup',
      'tail:passive-cleanup',
      'head:passive',
      'tail:passive',
    ]);
  });

  it('StrictMode mount', () => {
    const entry = newEntry();
    track(
      TestRenderer.create(
        <React.StrictMode>
          <Tree anchorName="--a" entry={entry} />
        </React.StrictMode>
      )
    );
    // The double-invoke teardown attempts a delete for a key that was
    // never registered (nothing has been measured yet), and both report
    // `false`, so no spurious notify reaches a subscriber. A migration
    // that starts notifying on a missing key shows up here as an extra
    // `.notify` line.
    expect(take()).toEqual([
      'head:render',
      'head:render',
      'sticky:render',
      'sticky:render',
      'snap:render',
      'snap:render',
      'anchor:render',
      'anchor:render',
      'tail:render',
      'tail:render',
      'head:insertion',
      'tail:insertion',
      'head:ref-attach',
      'head:layout',
      'tail:ref-attach',
      'tail:layout',
      'head:passive',
      'tail:passive',
      'head:layout-cleanup',
      'head:ref-detach',
      'snap.delete snap#0 -> false',
      'tail:layout-cleanup',
      'tail:ref-detach',
      'head:passive-cleanup',
      'sticky.delete sticky#0 -> false',
      'tail:passive-cleanup',
      'head:ref-attach',
      'head:layout',
      'tail:ref-attach',
      'tail:layout',
      'head:passive',
      'tail:passive',
    ]);
  });

  /**
   * Renders per scroll, measured rather than assumed. 120 frames per
   * case, one commit per frame, because a real scroll delivers each
   * event separately and batching them into one act would measure
   * React's batching instead of the subscription.
   *
   * Recorded against both implementations. Effect: 0 / 2 / 120.
   * Subscription: 0 / 1 / 120. The crossing case is the only one that
   * carries a delta, and the whole delta is the single extra render the
   * effect spent on subscribe: it had to call setStuck after commit to
   * learn a value the render could already read.
   *
   * The other two cases were identical before the change, since React's
   * eager bailout already skipped an unchanged setStuck. They are kept
   * so nobody re-derives a per-frame win that never existed, and so a
   * regression that starts rendering per frame fails. The middle case
   * doubles as the "already stuck" control: one crossing at the start,
   * then 119 frames past the threshold that cost nothing.
   *
   * `layoutY` is 40; see `measure`.
   */
  it('renders scale with threshold crossings, not with scroll frames', () => {
    const entry = newEntry();
    const renderer = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    measure(renderer);
    take();
    const renders = () => take().filter(s => s === 'sticky:render').length;
    const frames = (next: (i: number) => number) => {
      for (let i = 0; i < 120; i++) act(() => entry.offsetY.setValue(next(i)));
    };

    frames(i => (i % 39) + 0.5); // approaching the threshold at 40, never crossing
    expect(renders()).toBe(0);

    frames(i => 40 + (i % 50)); // past the threshold, crossing once at the start
    expect(renders()).toBe(1);

    frames(i => (i % 2 === 0 ? 10 : 60)); // crossing on every frame
    expect(renders()).toBe(120);
  });

  it('unmount then remount reuses nothing', () => {
    const entry = newEntry();
    const first = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    measure(first);
    act(() => first.unmount());
    take();

    const second = track(TestRenderer.create(<Tree anchorName="--a" entry={entry} />));
    measure(second);
    const seq = take();
    // A remount into the same entry must produce a fresh key rather than
    // reviving the old one; a recycled key would collide with a clone
    // the first mount left behind if any teardown had been missed.
    expect(seq).toContain('sticky.set sticky#1');
    expect(seq).toContain('snap.set snap#1');
    expect(seq).not.toContain('sticky.set sticky#0');
  });
});

/**
 * Both halves or neither. "Empty after unmount" alone passes identically
 * whether cleanup ran or registration never happened, so each registry
 * is asserted non-empty first. These drive the real styled components
 * rather than the hooks directly, which is what makes the arm half able
 * to fail: a ref or prop that never reaches a host element shows up here
 * and nowhere in the hook-level sequences above.
 */
describe('arm and release', () => {
  const Scroller = styled.ScrollView`
    height: 500px;
  `;
  // Declaring `scroll-snap-type` warns about RN's paging default. The
  // warning is correct and fires at declaration time, before the console
  // gate starts capturing, so it prints without failing. Do not silence
  // it globally: that would blind every other suite to the same message.
  const Snapper = styled.ScrollView`
    height: 160px;
    scroll-snap-type: x mandatory;
  `;
  const Card = styled.View`
    scroll-snap-align: start;
    width: 200px;
  `;
  const Header = styled.View`
    height: 40px;
    position: sticky;
  `;
  const Anchored = styled.View`
    anchor-name: --probe;
    height: 20px;
  `;

  /** Forwards onLayout to a host but drops `ref`, the way an ordinary
   *  third-party RN component that renders its own host does. */
  function DropsRef({ onLayout, testID }: { onLayout?: unknown; testID?: string }) {
    return <View onLayout={onLayout as never} testID={testID} />;
  }

  const withWarnSpy = (run: (warn: jest.SpyInstance) => void) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      run(warn);
    } finally {
      warn.mockRestore();
    }
  };

  function scroller(tree: TestRenderer.ReactTestRenderer) {
    const nodes = tree.root.findAllByType(ScrollView);
    return nodes[nodes.length - 1];
  }

  function measureScroller(tree: TestRenderer.ReactTestRenderer, width = 300, height = 160) {
    act(() => {
      const host = scroller(tree);
      host.props.onLayout(layoutOf(0, 0, width, height));
      host.props.onContentSizeChange(900, height);
    });
  }

  /** Host instance carrying the composed onLayout, not the wrapper. */
  function inFlow(tree: TestRenderer.ReactTestRenderer, testID: string) {
    const found = tree.root
      .findAllByProps({ testID })
      .filter(n => typeof n.props.onLayout === 'function');
    if (found.length === 0) throw new Error(`no measurable host for testID=${testID}`);
    return found[0];
  }

  function cloneCount(tree: TestRenderer.ReactTestRenderer, testID: string): number {
    const overlays = tree.root.findAll(n => {
      if (typeof n.type !== 'string' || n.props.pointerEvents !== 'box-none') return false;
      return [n.props.style]
        .flat(Infinity)
        .filter(Boolean)
        .some((l: Record<string, unknown>) => l.position === 'absolute');
    });
    // Host elements only, deduped: overlay hosts nest, and each clone
    // appears once as the composite `View` and again as its host node.
    const seen = new Set<TestRenderer.ReactTestInstance>();
    for (const overlay of overlays) {
      for (const node of overlay.findAll(
        n => typeof n.type === 'string' && n.props.testID === testID
      )) {
        seen.add(node);
      }
    }
    return seen.size;
  }

  it('snap targets: registered on measure, gone when the child leaves', () => {
    const tree = track(
      TestRenderer.create(
        <Snapper horizontal>
          <Card testID="card" />
        </Snapper>
      )
    );
    measureScroller(tree);
    act(() => inFlow(tree, 'card').props.onLayout(layoutOf(0, 0, 200, 160)));

    expect(scroller(tree).props.snapToOffsets).toEqual([0]);

    act(() => tree.update(<Snapper horizontal />));
    expect(scroller(tree).props.snapToOffsets).toBeUndefined();
  });

  it('sticky clones: published on measure, gone when the child leaves', () => {
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Header testID="header" />
        </Scroller>
      )
    );
    measureScroller(tree, 300, 500);
    act(() => inFlow(tree, 'header').props.onLayout(layoutOf(0, 40, 300, 40)));

    expect(cloneCount(tree, 'header')).toBe(1);

    act(() => tree.update(<Scroller />));
    expect(cloneCount(tree, 'header')).toBe(0);
  });

  /**
   * A caller's inline arrow ref changes identity every render. That is
   * the caller's business, but it must not reach the library's teardown:
   * anything memoized on the caller's ref tears down and re-arms on every
   * render, and a teardown that can only re-arm from the next onLayout
   * never comes back.
   */
  it('a caller ref that changes identity does not drop the anchor rect', () => {
    const tree = track(TestRenderer.create(<Anchored testID="anchored" ref={() => {}} />));
    act(() => inFlow(tree, 'anchored').props.onLayout(layoutOf(5, 7, 20, 20)));
    expect(getAnchorRect('--probe')).toEqual({ height: 20, width: 20, x: 5, y: 7 });

    // A re-render with a fresh arrow. No layout follows, so a teardown
    // that fires here loses the rect for good.
    act(() => tree.update(<Anchored testID="anchored" ref={() => {}} />));
    expect(getAnchorRect('--probe')).toEqual({ height: 20, width: 20, x: 5, y: 7 });
  });

  /**
   * These hooks nest: each one wraps the props the last one returned, so
   * React only ever sees the outermost ref. An inner layer that re-keys
   * behind a frozen outer one is invisible to React unless the outer ref
   * changes identity too, and the failure is silent in both directions:
   * the inner teardown never runs and the inner setup never arms, while
   * every registry assertion still passes because the element itself is
   * mounted and measured. `useComposedRef` keys on an incoming ref of its
   * own making for exactly this reason.
   */
  it('an inner layer that re-keys is not swallowed by a frozen outer one', () => {
    const seen: string[] = [];
    function Layered({ phase }: { phase: number }) {
      const inner = useComposedRef<unknown>(
        () => {
          seen.push(`inner attach ${phase}`);
          return () => seen.push(`inner detach ${phase}`);
        },
        undefined,
        [phase]
      );
      const outer = useComposedRef<unknown>(
        () => {
          seen.push('outer attach');
          return () => seen.push('outer detach');
        },
        inner,
        []
      );
      return <View ref={outer as never} />;
    }

    const tree = track(TestRenderer.create(<Layered phase={0} />));
    expect(seen).toEqual(['outer attach', 'inner attach 0']);

    act(() => tree.update(<Layered phase={1} />));
    expect(seen).toEqual([
      'outer attach',
      'inner attach 0',
      'inner detach 0',
      'outer detach',
      'outer attach',
      'inner attach 1',
    ]);

    act(() => tree.unmount());
    expect(seen.slice(-2)).toEqual(['inner detach 1', 'outer detach']);
  });

  it("a caller's ref still stays out of the keys when the layers nest", () => {
    const seen: string[] = [];
    function Layered() {
      const inner = useComposedRef<unknown>(
        () => {
          seen.push('inner attach');
          return () => seen.push('inner detach');
        },
        undefined,
        []
      );
      const outer = useComposedRef<unknown>(
        () => {
          seen.push('outer attach');
          return () => seen.push('outer detach');
        },
        inner,
        []
      );
      return <View ref={outer as never} />;
    }
    const tree = track(TestRenderer.create(<Layered />));
    act(() => tree.update(<Layered />));
    act(() => tree.update(<Layered />));
    expect(seen).toEqual(['outer attach', 'inner attach']);
  });

  /**
   * A target that forwards onLayout to a host but drops `ref` is ordinary
   * in third-party RN components. Registration rides onLayout and
   * teardown rides the ref, so such a target would register and never
   * deregister: a rect nothing can ever remove.
   *
   * The contract is that both halves share the ref's fate. Publishing is
   * gated on the ref having attached, so a target that drops it gets a
   * loud no-op instead of a silent permanent leak.
   */
  it('a target that drops the ref never registers, rather than leaking', () => {
    const Leaky = styled(DropsRef)`
      anchor-name: --dropped;
      height: 20px;
    `;
    withWarnSpy(warn => {
      const tree = track(TestRenderer.create(<Leaky testID="leaky" />));
      act(() => inFlow(tree, 'leaky').props.onLayout(layoutOf(1, 2, 3, 4)));
      expect(getAnchorRect('--dropped')).toBeUndefined();
      expect(warn.mock.calls.map(String).join('\n')).toContain('--dropped');

      act(() => tree.unmount());
      expect(getAnchorRect('--dropped')).toBeUndefined();
    });
  });

  it('a snap target that drops the ref never registers an offset', () => {
    const LeakyCard = styled(DropsRef)`
      scroll-snap-align: start;
      width: 200px;
    `;
    withWarnSpy(warn => {
      const tree = track(
        TestRenderer.create(
          <Snapper horizontal>
            <LeakyCard testID="card" />
          </Snapper>
        )
      );
      measureScroller(tree);
      act(() => inFlow(tree, 'card').props.onLayout(layoutOf(0, 0, 200, 160)));

      // Registering here would strand the offset: the scroller could
      // never drop it, because the deregistration rides the same ref.
      expect(scroller(tree).props.snapToOffsets).toBeUndefined();
      expect(warn.mock.calls.map(String).join('\n')).toContain('scroll-snap-align is inactive');
    });
  });

  it('anchor rects: published on measure, gone on unmount', () => {
    const tree = track(TestRenderer.create(<Anchored testID="anchored" />));
    act(() => inFlow(tree, 'anchored').props.onLayout(layoutOf(5, 7, 20, 20)));

    expect(getAnchorRect('--probe')).toEqual({ height: 20, width: 20, x: 5, y: 7 });

    act(() => tree.unmount());
    expect(getAnchorRect('--probe')).toBeUndefined();
  });

  /**
   * The publisher's host ref is what carries the native scroll mapping's
   * attach and detach, so proving the ref runs at all is the arm half for
   * that mapping. `entry.host` is the observable: the settle corrector
   * drives its imperative scrollTo through it, so a ref that stopped
   * running would strand the corrector with no host.
   */
  it('publisher host ref: entry.host set on mount, cleared on unmount', () => {
    let entry: ScrollTimelineEntry | null = null;
    function Peek(): null {
      entry = React.useContext(ScrollTimelineContext).nearest;
      return null;
    }
    const tree = track(
      TestRenderer.create(
        <Scroller>
          <Peek />
        </Scroller>
      )
    );
    const captured = entry;
    if (captured === null) throw new Error('the scroller published no timeline entry');
    expect(captured.host).not.toBeNull();

    act(() => tree.unmount());
    expect(captured.host).toBeNull();
  });

  /**
   * The mapping is unreachable through a real styled ScrollView here:
   * RN's jest mock never populates the inner host ref, so
   * `getNativeScrollRef()` returns undefined, no view tag resolves, and
   * the attach branch never executes. A stand-in scroller that does
   * expose a tagged host is what makes the branch reachable, and it is
   * the only assertion here that covers the whole chain: publisher ref
   * callback, committed host, attach, and detach on cleanup.
   */
  describe('native scroll mapping', () => {
    class TaggedScrollView extends React.Component<{ children?: React.ReactNode }> {
      // Recognized as a scroller by name, the same way an Animated
      // wrapper or a user subclass is.
      static displayName = 'ScrollView';
      getNativeScrollRef() {
        return { __nativeTag: 42 };
      }
      render() {
        return <View>{this.props.children}</View>;
      }
    }
    const TaggedScroller = styled(TaggedScrollView)`
      height: 500px;
    `;
    // Declared out here, not inside a test: compiling `scroll-snap-type`
    // emits a paging warning, and the console gate captures anything a
    // test body emits.
    const SnappingScroller = styled(TaggedScrollView)`
      height: 500px;
      scroll-snap-type: y mandatory;
    `;

    const withAttachSpy = (run: (attach: jest.Mock, detach: jest.Mock) => void) => {
      const Animated = getRN().Animated;
      // Control: without this the assertions below would pass vacuously
      // against an entry that was never native-driven to begin with.
      expect(typeof Animated?.attachNativeEvent).toBe('function');
      const detach = jest.fn();
      const attach = jest.fn(() => ({ detach }));
      const spy = jest.spyOn(Animated, 'attachNativeEvent').mockImplementation(attach as never);
      try {
        run(attach, detach);
      } finally {
        spy.mockRestore();
      }
    };

    it('attaches to a host exposing a native tag, and detaches on cleanup', () => {
      withAttachSpy((attach, detach) => {
        const entry = newEntry();
        expect(entry.nativeDriven).toBe(true);

        const cleanup = attachNativeScrollMapping(entry, {
          getNativeScrollRef: () => ({ __nativeTag: 42 }),
        });

        expect(attach).toHaveBeenCalledTimes(1);
        expect(entry.nativeAttached).toBe(true);
        if (cleanup === undefined)
          throw new Error('attach reported success but returned no detach');

        cleanup();
        expect(detach).toHaveBeenCalledTimes(1);
        expect(entry.nativeAttached).toBe(false);
      });
    });

    it('a styled scroller attaches on mount and detaches on unmount', () => {
      withAttachSpy((attach, detach) => {
        const tree = track(TestRenderer.create(<TaggedScroller />));
        expect(attach).toHaveBeenCalledTimes(1);
        expect(detach).not.toHaveBeenCalled();

        // A re-render must not re-attach: the ref callback's identity is
        // pinned to the entry, not to the render.
        act(() => tree.update(<TaggedScroller />));
        expect(attach).toHaveBeenCalledTimes(1);
        expect(detach).not.toHaveBeenCalled();

        act(() => tree.unmount());
        expect(detach).toHaveBeenCalledTimes(1);
      });
    });

    /**
     * Two hooks put a ref on the same scroller: the timeline publisher
     * carries the native attach, and the settle corrector carries its
     * timer teardown. The settle hook runs second and spreads the props
     * the publisher already returned, so it would overwrite that ref
     * outright if it did not compose. A regression here disables the
     * UI-thread mapping on every snapping scroller and nothing else
     * notices, because both halves keep working on their own.
     */
    it('a caller ref that changes identity does not re-attach the mapping', () => {
      withAttachSpy((attach, detach) => {
        const tree = track(TestRenderer.create(<TaggedScroller ref={() => {}} />));
        expect(attach).toHaveBeenCalledTimes(1);

        act(() => tree.update(<TaggedScroller ref={() => {}} />));
        act(() => tree.update(<TaggedScroller ref={() => {}} />));
        // Re-attaching the native scroll event per render is the exact
        // cost this mapping exists to avoid.
        expect(attach).toHaveBeenCalledTimes(1);
        expect(detach).not.toHaveBeenCalled();
      });
    });

    it('composes with the settle corrector rather than overwriting its ref', () => {
      withAttachSpy((attach, detach) => {
        const tree = track(TestRenderer.create(<SnappingScroller />));
        expect(attach).toHaveBeenCalledTimes(1);

        act(() => tree.unmount());
        expect(detach).toHaveBeenCalledTimes(1);
      });
    });

    it('skips a host with no resolvable tag rather than half-attaching', () => {
      withAttachSpy(attach => {
        const entry = newEntry();
        expect(
          attachNativeScrollMapping(entry, { getNativeScrollRef: () => ({}) })
        ).toBeUndefined();
        expect(attach).not.toHaveBeenCalled();
        // Not merely "no attach": leaving this true would disable the JS
        // echo with nothing driving the native pair in its place.
        expect(entry.nativeAttached).toBe(false);
      });
    });
  });

  it('settle timer: fires while mounted, cancelled on unmount', () => {
    jest.useFakeTimers();
    try {
      const entry = newEntry();
      entry.host = { scrollTo: jest.fn() };
      entry.viewportW = 300;
      entry.extentX = 600;

      function Settler(): React.ReactElement {
        const props = useSnapSettle(true, entry, { horizontal: true });
        return <View {...props} testID="settler" />;
      }

      const scrolled = (node: TestRenderer.ReactTestInstance, x: number) =>
        act(() => {
          node.props.onScrollEndDrag({ nativeEvent: { contentOffset: { x, y: 0 } } });
        });

      const armed = track(TestRenderer.create(<Settler />));
      scrolled(armed.root.findByProps({ testID: 'settler' }), 250);
      act(() => jest.runAllTimers());
      // Armed: a rest at 250 with a 300-wide scrollport is off-grid, so
      // the corrector drives the scroller to the nearest page.
      expect(entry.host.scrollTo).toHaveBeenCalledWith({ animated: true, x: 300 });

      entry.host.scrollTo.mockClear();
      const released = track(TestRenderer.create(<Settler />));
      scrolled(released.root.findByProps({ testID: 'settler' }), 250);
      act(() => released.unmount());
      act(() => jest.runAllTimers());
      expect(entry.host.scrollTo).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
