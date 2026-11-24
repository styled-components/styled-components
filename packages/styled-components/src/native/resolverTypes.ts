/**
 * Pure type-only contracts shared between the native resolver pipeline and
 * `src/types.ts`. Keeping these out of `responsive.ts` and `resolvers.ts`
 * prevents the web declaration graph (`dist/index.d.ts`) from transitively
 * pulling in `react-native`.
 */

/** Viewport and user-preference environment evaluated by native media queries and resolvers. */
export interface MediaQueryEnv {
  colorScheme: 'light' | 'dark' | null | undefined;
  fontScale: number;
  height: number;
  pixelRatio: number;
  reduceMotion: boolean;
  width: number;
}

/** The four safe-area insets `env(safe-area-inset-*)` resolves against (CSS top/right/bottom/left order). */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Environment passed to each {@link Resolver} at render time. Composes
 * everything needed to finish any deferred CSS evaluation.
 */
export interface ResolveEnv {
  /** Nearest named / unnamed container dimensions. */
  container: { height: number; width: number } | null;
  /**
   * Cascade-published CSS custom properties keyed by their `--name`.
   * Sourced from NativeStyleContext.cascade.customProperties. `null` when
   * no ancestor has declared any.
   */
  customProperties: ReadonlyMap<string, string> | null;
  /**
   * Inherited writing direction. Anchors `text-align: start | end`.
   * Sourced from NativeStyleContext.cascade.direction.
   */
  direction: 'ltr' | 'rtl';
  /**
   * Parent's resolved font-size in px. Anchors `em` resolution at
   * render time. Sourced from NativeStyleContext.cascade.fontSize.
   */
  fontSize: number;
  /** Safe-area insets for `env(safe-area-inset-*)`, supplied by the native render path. */
  insets: SafeAreaInsets;
  /**
   * Parent's resolved line-height in px. Anchors `lh` resolution.
   * Sourced from NativeStyleContext.cascade.lineHeight.
   */
  lineHeight: number;
  media: MediaQueryEnv;
  /**
   * The component's declared `position-anchor` name; the implicit
   * target for `anchor()` / `anchor-size()` without an explicit name.
   */
  positionAnchor?: string;
  /**
   * The styled component's props: the attribute source for `attr()`.
   * Same bag the attribute-selector matcher ([data-x="y"]) reads.
   */
  props?: Record<string, unknown> | null;
  /** Root font-size for `rem` resolution (defaults to 16). */
  rootFontSize: number;
  /** Total children of the parent, for `sibling-count()`. Defaults to 1. */
  siblingCount?: number;
  /**
   * 1-based position among the parent's children, for `sibling-index()`.
   * Sourced from ParentContext. `undefined` (untracked) resolves as 1
   * (only child).
   */
  siblingIndex?: number;
  /** Current theme object (deep-merged from ThemeProvider stack on native). */
  // biome-ignore lint/suspicious/noExplicitAny: public adapter contract (AnimatedStyleInput.env is reachable from the reanimatedAdapter export). With `unknown`, an adapter reading `input.env.theme.colors.primary` fails with TS18046: 'input.env.theme.colors' is of type 'unknown'.
  theme: Record<string, any>;
}

/**
 * A function that resolves a single style-prop value at render time
 * against the current {@link ResolveEnv}. Returns the resolved value
 * to write into the merged style object; number, string, or null
 * (drop the key).
 */
export type Resolver = (env: ResolveEnv) => number | string | null;
