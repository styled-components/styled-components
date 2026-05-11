import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  useWindowDimensions,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { FeatureJumpSelect, JumpGroup } from '@/components/FeatureJumpSelect';
import { lightTheme, theme as t } from '@/theme/tokens';

// Raw JS numbers for content padding math. `t.space.*` tokens are
// createTheme sentinels that resolve via CSS calc; JS `+` against them
// silently string-coerces. Use these for contentContainerStyle.
const SPACE = lightTheme.space;

// Rail chrome uses `light-dark()` directly rather than `t.colors.*`
// sentinels. On rn-web, the native entry currently flattens createTheme
// leaves to literal hex at render time (no `var(--sc-*)` emission like
// the web build), so a theme switch doesn't repaint without a full
// React re-render of every consumer. `light-dark()` resolves natively
// in the browser via `prefers-color-scheme`, and v7 polyfills it on
// iOS/Android — one declaration, all platforms.
const C = {
  ink: 'light-dark(#0e0e10, #f5f3ee)',
  fgMuted: 'light-dark(#46464a, #a8a8ac)',
  fgFaint: 'light-dark(#7c7c80, #6c6c70)',
  // Borders read quieter in dark mode: light-on-dark perception
  // amplifies contrast, so the same fgFaint value that's appropriately
  // subtle on cream feels too loud against near-black. Drop dark to
  // ~22% lightness so the divider sits structurally without claiming
  // attention.
  rule: 'light-dark(#7c7c80, #3a3a3f)',
  bg: 'light-dark(#f5f3ee, #0e0e10)',
};

/**
 * Universal-codebase shell: one CSS pass, three form factors.
 *
 * Phone (default):    column flow. Rail sits as a centered header above
 *                     the scrolling list.
 * Tablet (≥ 720px):   row flow. Rail becomes a fixed-width left column;
 *                     category nav appears.
 * Desktop (≥ 1100px): row flow with wider rail and richer gutters.
 *
 * Insets are JS values (safe-area inset math can't be expressed in CSS
 * @media), so they pin via inline style. Everything else is declarative.
 */

const RAIL_BREAKPOINT = 720;

const Shell = styled.View`
  flex: 1;
  background-color: ${C.bg};
  flex-direction: column;

  @media (min-width: 720px) {
    flex-direction: row;
  }
`;

// On desktop, the rail is wrapped in this ScrollView so it can scroll
// independently when the viewport is shorter than the rail's content
// (long category lists + safe-area paddings on a small laptop screen).
// Width and right divider live here because they're container-level
// concerns, not content-level. The inner Rail keeps its padding,
// gap, and alignment.
const RailScroll = styled.ScrollView`
  width: 260px;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 260px;
  border-right-width: ${t.borderWidth.hairline}px;
  border-right-color: ${C.rule};

  @media (min-width: 1100px) {
    width: 320px;
    flex-basis: 320px;
  }
`;

const Rail = styled.View<{ $top: number; $bottom: number; $left: number; $right: number }>`
  padding-top: calc(${p => p.$top}px + ${t.space.xl}px);
  padding-bottom: ${t.space.md}px;
  padding-left: calc(${p => p.$left}px + ${t.space.md}px);
  padding-right: calc(${p => p.$right}px + ${t.space.md}px);
  gap: ${t.space.sm}px;
  align-items: center;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-bottom-color: ${C.rule};

  @media (min-width: 720px) {
    padding-bottom: calc(${p => p.$bottom}px + ${t.space.lg}px);
    padding-right: ${t.space.md}px;
    align-items: flex-start;
    border-bottom-width: 0;
  }

  @media (min-width: 1100px) {
    padding-left: calc(${p => p.$left}px + ${t.space.xl}px);
    padding-right: ${t.space.lg}px;
  }
`;

const RailHeroWrap = styled.View`
  align-items: center;
  padding-bottom: ${t.space.xxs}px;

  @media (min-width: 720px) {
    align-items: flex-start;
  }
`;

const Title = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.display}px;
  line-height: ${t.lineHeight.display}px;
  color: ${C.ink};
  letter-spacing: -0.5px;
  text-align: center;

  @media (min-width: 720px) {
    font-size: ${t.fontSize.title}px;
    line-height: ${t.lineHeight.title}px;
    text-align: left;
  }

  @media (min-width: 1100px) {
    font-size: ${t.fontSize.display}px;
    line-height: ${t.lineHeight.display}px;
  }
`;

const Summary = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.brief}px;
  line-height: ${t.lineHeight.brief}px;
  color: ${C.fgMuted};
  text-align: center;

  @media (min-width: 720px) {
    text-align: left;
  }
`;

const RailJumpWrap = styled.View`
  margin-top: ${t.space.sm}px;
  align-self: stretch;
`;

const RailNav = styled.View`
  display: none;

  @media (min-width: 720px) {
    display: flex;
    margin-top: ${t.space.md}px;
    align-self: stretch;
    gap: ${t.space.xxs}px;
  }
`;

const RailNavHeading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${C.fgFaint};
  margin-bottom: ${t.space.xxs}px;
`;

const RailLink = styled.Pressable`
  padding-top: ${t.space.xxs}px;
  padding-bottom: ${t.space.xxs}px;
`;

// Pseudo-state rules on a styled.Text child of a Pressable are dead:
// only the Pressable receives the `{ hovered, focused, pressed }`
// state callback that the v7 native engine bridges into pseudo
// matching. We forward those flags into `data-*` attributes via the
// function-child form and react to them with attribute selectors,
// which the engine evaluates as plain DOM/View attribute checks.
const RailLinkLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${C.fgMuted};
  transition: color 120ms ease-out;

  &[data-hovered='true'],
  &[data-focused='true'] {
    color: ${C.ink};
  }

  &[data-pressed='true'] {
    color: ${C.fgFaint};
  }
`;

const Main = styled.View`
  flex: 1;
  min-width: 0;
  min-height: 0;
`;

// Sibling of Main (not child) so position: absolute anchors to the full
// Shell viewport. On tablet/desktop the rail sits at the page's left
// edge; the button shifts past it so it lines up with the content column
// instead of floating over the rail. Visual language mirrors FpsMeter
// at top-right.
const BackToTop = styled.Pressable<{ $topInset: number; $leftInset: number }>`
  position: absolute;
  top: calc(${p => p.$topInset}px + ${t.space.xs}px);
  left: calc(${p => p.$leftInset}px + ${t.space.md}px);
  flex-direction: row;
  align-items: center;
  gap: ${t.space.xs}px;
  padding: ${t.space.xxs}px ${t.space.xs}px;
  background-color: ${t.colors.surfaceMuted};
  border-width: ${t.borderWidth.hairline}px;
  border-color: ${t.colors.border};
  z-index: 1000;

  @media (min-width: 720px) {
    left: calc(260px + ${t.space.md}px);
  }

  @media (min-width: 1100px) {
    left: calc(320px + ${t.space.md}px);
  }
`;

const BackToTopLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.5px;
  color: ${t.colors.ink};
`;

const SCROLL_TOP_THRESHOLD = 480;

const ItemWrapper = styled.View`
  padding-left: ${t.space.md}px;
  padding-right: ${t.space.md}px;

  @media (min-width: 720px) {
    padding-left: ${t.space.lg}px;
    padding-right: ${t.space.lg}px;
  }

  @media (min-width: 1100px) {
    padding-left: ${t.space.xl}px;
    padding-right: ${t.space.xl}px;
    max-width: 920px;
  }
`;

export interface CategoryRef {
  label: string;
  /** Index in the FlatList's data array to scroll to. */
  index: number;
}

interface Props<Item> {
  /** Title is also the AsyncStorage key suffix for scroll restoration. */
  title: string;
  summary?: string;
  /**
   * Optional brand element rendered above the title. Sits inside the
   * list header so it scrolls with the rest of the catalog.
   */
  hero?: React.ReactNode;
  /**
   * If provided, on mount the scaffold scrolls to the section
   * whose slug matches. Wins over any persisted scroll position so deep
   * links land deterministically.
   */
  focusSlug?: string;
  /** Flat list of items to render. */
  data: ReadonlyArray<Item>;
  /** Render a single item. */
  renderItem: ListRenderItem<Item>;
  /** Stable key per item. */
  keyExtractor: (item: Item, index: number) => string;
  /**
   * Optional anchor map for focusSlug deep-linking. Maps slug → item index.
   * Built by the caller from `data` so the scaffold can scrollToIndex once
   * the matching slug is requested.
   */
  anchorIndex?: ReadonlyMap<string, number>;
  /**
   * Optional category index. Surfaces as a clickable nav in the rail at
   * tablet/desktop breakpoints; hidden via CSS on phone.
   */
  categories?: ReadonlyArray<CategoryRef>;
  /**
   * Optional fine-grained jump list grouped by category. Renders a
   * select-style dropdown below the summary on every form factor; lets
   * the user land directly on any feature without scrolling.
   */
  jumpList?: ReadonlyArray<JumpGroup>;
}

const STORAGE_PREFIX = 'sc-showcase:scroll:';
const PERSIST_THROTTLE_MS = 200;
const STYLE_HIDDEN = { opacity: 0 } as const;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 1 } as const;

/**
 * Virtualized scaffold backed by a `FlatList`. Off-screen items unmount,
 * so heavy widgets (timers, transitions, container queries) only run for
 * what's on screen.
 *
 * Scroll position is persisted as the topmost visible item's INDEX
 * rather than a pixel offset. Pixel-offset restoration is unreliable
 * under virtualization: cold mount only renders `windowSize` viewports,
 * so a saved offset deep in the list gets clamped to whatever's been
 * laid out, the persist callback then captures the clamped position,
 * and the saved offset is overwritten before the rest of the list
 * mounts. Index-based restoration tells FlatList "land on item N" and
 * its native virtualization handles batching the rows up to N.
 *
 * `focusSlug` deep-linking continues to use `scrollToIndex` via the
 * caller-supplied `anchorIndex` map.
 */
export function ScreenScaffold<Item>({
  title,
  summary,
  hero,
  focusSlug,
  data,
  renderItem,
  keyExtractor,
  anchorIndex,
  categories,
  jumpList,
}: Props<Item>) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const railIsSide = viewportWidth >= RAIL_BREAKPOINT;
  const listRef = React.useRef<FlatList<Item> | null>(null);
  const lastWriteRef = React.useRef(0);
  const lastIndexRef = React.useRef(0);
  const writeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Persist + scroll-target suppression. Two states:
  //   number — a category-nav scrollToIndex is in flight; suppress
  //            persist and gate `onScrollToIndexFailed` retry until
  //            the target appears in viewable items.
  //   null   — idle; persist live.
  const restoreTargetRef = React.useRef<number | null>(null);
  const storageKey = STORAGE_PREFIX + title;

  // Restoration is a two-step dance: read AsyncStorage, then once the
  // FlatList has mounted, fire `scrollToIndex` on the saved row. We
  // deliberately do NOT pass `initialScrollIndex` to FlatList. Without
  // `getItemLayout`, FlatList reserves space above the saved index
  // using the running average of items in the render window — and when
  // item heights vary wildly (a tiny category heading sits above 600px
  // widgets), that reservation overshoots and never collapses to actual
  // height. The visible symptom is a phantom band between the header
  // and the first row that persists until full re-mount.
  const [restoreState, setRestoreState] = React.useState<{
    ready: boolean;
    initialIndex?: number;
  }>({ ready: false });

  // Visual gate for Android: hide the FlatList during the brief
  // scroll-to-index window so the user doesn't see the in-flight scroll
  // motion (Android's `animated: false` is not always truly instant
  // when virtualization is interleaved with `onScrollToIndexFailed`
  // retry logic). iOS lands genuinely instantly so the gate stays off.
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const finalize = (idx: number | undefined) => {
      if (cancelled) return;
      if (idx !== undefined && idx > 0 && idx < data.length) {
        setRestoreState({ ready: true, initialIndex: idx });
      } else {
        setRestoreState({ ready: true });
      }
    };

    if (focusSlug) {
      finalize(anchorIndex?.get(focusSlug));
      return;
    }
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        const parsed = raw == null ? NaN : parseInt(raw, 10);
        finalize(Number.isFinite(parsed) ? parsed : undefined);
      })
      .catch(() => finalize(undefined));
    return () => {
      cancelled = true;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [storageKey, focusSlug, anchorIndex, data.length]);

  const persist = React.useCallback(
    (idx: number) => {
      if (restoreTargetRef.current !== null) return; // category-nav target pending
      lastIndexRef.current = idx;
      const now = Date.now();
      if (now - lastWriteRef.current >= PERSIST_THROTTLE_MS) {
        lastWriteRef.current = now;
        AsyncStorage.setItem(storageKey, String(idx)).catch(() => undefined);
        if (writeTimerRef.current) {
          clearTimeout(writeTimerRef.current);
          writeTimerRef.current = null;
        }
        return;
      }
      if (!writeTimerRef.current) {
        writeTimerRef.current = setTimeout(() => {
          writeTimerRef.current = null;
          lastWriteRef.current = Date.now();
          AsyncStorage.setItem(storageKey, String(lastIndexRef.current)).catch(() => undefined);
        }, PERSIST_THROTTLE_MS);
      }
    },
    [storageKey]
  );

  // Persist gate. Starts `false`; set `true` once restoration has either
  // landed (target index appears in viewable items) or been determined
  // unnecessary (no saved value, no `focusSlug`). Without this gate the
  // FlatList's initial `onViewableItemsChanged` for the top of the list
  // raced against the async AsyncStorage read and overwrote the saved
  // index with `0` before restoration could fire.
  const restorationSettledRef = React.useRef(false);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      const top = viewableItems[0];
      if (top.index == null) return;
      const target = restoreTargetRef.current;
      if (target !== null) {
        if (typeof target === 'number' && viewableItems.some(v => v.index === target)) {
          restoreTargetRef.current = null;
          restorationSettledRef.current = true;
          // Reveal the FlatList now that the target is on-screen.
          // No-op when not hidden (iOS path, or no restoration needed).
          setHiddenRef.current(false);
        }
        return;
      }
      if (!restorationSettledRef.current) return;
      persistRef.current(top.index);
    }
  ).current;

  const persistRef = React.useRef(persist);
  React.useEffect(() => {
    persistRef.current = persist;
  }, [persist]);
  // setHidden bound through a ref so the stable `onViewableItemsChanged`
  // closure (built once via `useRef`) reaches the latest React setter
  // without being recreated on every render.
  const setHiddenRef = React.useRef(setHidden);
  React.useEffect(() => {
    setHiddenRef.current = setHidden;
  }, []);

  const onScrollBeginDrag = React.useCallback(() => {
    // User-initiated drag takes precedence over any in-flight
    // restoration target and opens the persist gate. Without the
    // gate flip a drag that started before restoration could land
    // would update `lastIndexRef` but never persist it.
    restoreTargetRef.current = null;
    restorationSettledRef.current = true;
    setHidden(false);
  }, []);

  // Drive scrollToIndex post-mount. RAF defers one frame so the
  // FlatList has rendered its initial window (`initialNumToRender`)
  // before we try to target a row; without it scrollToIndex frequently
  // bounces through `onScrollToIndexFailed` even for shallow indices.
  // The `restoreFiredRef` gate keeps this single-shot so subsequent
  // `restoreState` changes don't re-trigger restoration.
  const restoreFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (!restoreState.ready) return;
    if (restoreFiredRef.current) return;
    const idx = restoreState.initialIndex;
    if (idx === undefined) {
      // No saved index (or `focusSlug` with an unknown slug). Settle the
      // persist gate so subsequent scrolls write through; without this
      // first-launch users could scroll, kill the app, and find nothing
      // persisted because the gate stayed `false` forever.
      restorationSettledRef.current = true;
      return;
    }
    restoreFiredRef.current = true;
    restoreTargetRef.current = idx;
    if (Platform.OS === 'android') setHidden(true);
    const rafId = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0 });
    });
    // Safety reveal: if the restoration somehow fails to land (e.g.
    // `onScrollToIndexFailed` exhausts its retries silently), unhide
    // after a short ceiling so the user is never permanently blank.
    const revealTimer = setTimeout(() => setHidden(false), 800);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(revealTimer);
    };
  }, [restoreState.ready, restoreState.initialIndex]);

  const flushPersist = React.useCallback(() => {
    if (writeTimerRef.current) {
      clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
    if (restoreTargetRef.current !== null) return; // category-nav target pending
    lastWriteRef.current = Date.now();
    AsyncStorage.setItem(storageKey, String(lastIndexRef.current)).catch(() => undefined);
  }, [storageKey]);

  const wrappedRenderItem = React.useCallback<ListRenderItem<Item>>(
    info => <ItemWrapper>{renderItem(info)}</ItemWrapper>,
    [renderItem]
  );

  const [showBackToTop, setShowBackToTop] = React.useState(false);
  // Mirror of `showBackToTop` for the onScroll callback so we don't
  // call setState 60 times per second — only on the threshold crossing.
  const showBackToTopRef = React.useRef(false);

  const onScroll = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shouldShow = e.nativeEvent.contentOffset.y > SCROLL_TOP_THRESHOLD;
    if (shouldShow !== showBackToTopRef.current) {
      showBackToTopRef.current = shouldShow;
      setShowBackToTop(shouldShow);
    }
  }, []);

  const handleBackToTop = React.useCallback(() => {
    restoreTargetRef.current = null;
    restorationSettledRef.current = true;
    setHidden(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleCategoryPress = React.useCallback((index: number) => {
    // Reuse the deep-link restoration target: if the target index isn't
    // laid out yet (virtualization), `onScrollToIndexFailed` reads this
    // ref to drive the offset-then-retry fallback. Setting it to null
    // here would short-circuit that path and the scroll would silently
    // no-op for indices outside the rendered window.
    restoreTargetRef.current = index;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  }, []);

  const handleSlugJump = React.useCallback(
    (slug: string) => {
      const idx = anchorIndex?.get(slug);
      if (idx === undefined) return;
      restoreTargetRef.current = idx;
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
    },
    [anchorIndex]
  );

  // FlatList's `scrollToIndex` only succeeds once the target index has
  // been measured, but virtualization only mounts a few viewports past
  // the visible area. On cold mount with a deeply saved index, a naive
  // retry loop spins forever because no scroll motion reaches the
  // target. Workaround: jump to an estimated offset (target index
  // multiplied by the reported average item length); that motion
  // mounts items in the target region, after which the precise
  // `scrollToIndex` call succeeds.
  const onScrollToIndexFailed = React.useCallback(
    (info: { index: number; averageItemLength: number }) => {
      if (restoreTargetRef.current === null) return;
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      setTimeout(() => {
        if (restoreTargetRef.current === null) return;
        listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0 });
      }, 100);
    },
    []
  );

  // Rail content is the same in both layouts; only its parent differs.
  // Phone (< 720px): the rail rides inside the FlatList header so it
  //   scrolls away with the page — no fixed chrome eating viewport.
  // Tablet/Desktop (≥ 720px): the rail becomes a sibling of the FlatList,
  //   so it stays put while the list scrolls underneath it.
  const railNode = (
    <Rail $top={insets.top} $bottom={insets.bottom} $left={insets.left} $right={insets.right}>
      {hero ? <RailHeroWrap>{hero}</RailHeroWrap> : null}
      <Title>{title}</Title>
      {summary ? <Summary>{summary}</Summary> : null}
      {jumpList && jumpList.length > 0 ? (
        <RailJumpWrap>
          <FeatureJumpSelect groups={jumpList} onJump={handleSlugJump} />
        </RailJumpWrap>
      ) : null}
      {categories && categories.length > 0 ? (
        <RailNav>
          <RailNavHeading>Sections</RailNavHeading>
          {categories.map(c => (
            <RailLink
              key={c.label}
              accessibilityRole="button"
              onPress={() => handleCategoryPress(c.index)}
            >
              {state => {
                // RN's typings only expose `pressed`, but Pressable on
                // rn-web (and v7's pseudo-state polyfill on iOS/Android)
                // also forwards `hovered` / `focused`. Cast wider to
                // surface them; the engine matches `data-*` selectors
                // against the rendered props.
                const s = state as { pressed: boolean; hovered?: boolean; focused?: boolean };
                return (
                  <RailLinkLabel
                    data-hovered={String(!!s.hovered)}
                    data-focused={String(!!s.focused)}
                    data-pressed={String(s.pressed)}
                  >
                    {c.label}
                  </RailLinkLabel>
                );
              }}
            </RailLink>
          ))}
        </RailNav>
      ) : null}
    </Rail>
  );

  return (
    <Shell>
      {railIsSide ? <RailScroll showsVerticalScrollIndicator={false}>{railNode}</RailScroll> : null}
      <Main>
        {restoreState.ready ? (
          <FlatList<Item>
            ref={listRef}
            data={data as Item[]}
            renderItem={wrappedRenderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={railIsSide ? null : railNode}
            style={hidden ? STYLE_HIDDEN : undefined}
            contentContainerStyle={{
              paddingTop: railIsSide ? insets.top + SPACE.xl : 0,
              paddingBottom: insets.bottom + 34,
              paddingLeft: railIsSide ? 0 : insets.left,
              paddingRight: insets.right,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={flushPersist}
            onMomentumScrollEnd={flushPersist}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
            onScrollToIndexFailed={onScrollToIndexFailed}
            scrollEventThrottle={16}
            // Virtualization tuning. Heights vary widely (some widgets
            // animate / contain grids), so we keep getItemLayout off and lean
            // on a moderate window size. removeClippedSubviews keeps native
            // views off the screen as we scroll past them.
            initialNumToRender={4}
            windowSize={5}
            maxToRenderPerBatch={4}
            updateCellsBatchingPeriod={32}
            removeClippedSubviews
          />
        ) : null}
      </Main>
      {showBackToTop ? (
        <BackToTop
          $topInset={insets.top}
          $leftInset={insets.left}
          accessibilityRole="button"
          accessibilityLabel="Scroll to top"
          onPress={handleBackToTop}
        >
          <BackToTopLabel>↑ Top</BackToTopLabel>
        </BackToTop>
      ) : null}
    </Shell>
  );
}
