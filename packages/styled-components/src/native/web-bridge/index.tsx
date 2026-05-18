/**
 * Experimental rn-web bridge. Routes `styled-components/native` consumers
 * running under react-native-web through the web pipeline (CSSOM
 * insertRule, hashed className output) instead of building an RN style
 * object that react-native-web then re-tokenizes back into atomic CSS.
 *
 * Two pipelines doing the same work was the win to delete; the small
 * trick that makes it possible is styleq's `$$css` escape hatch. We
 * wrap each rn-web primitive in a shim that converts the className
 * the web `styled` factory hands it into a `{ $$css: true, sc: cls }`
 * style entry; rn-web composes that into its DOM className alongside
 * its own atomic classes.
 *
 * The bridged surface mirrors `styled-components/native`'s alias list,
 * lifted to whichever components rn-web actually exports at runtime.
 * Web-native HTML elements (`styled.a`, `styled.select`, `styled.div`,
 * etc.) and arbitrary `styled(Component)` calls work for free because
 * the underlying factory is the web `styled` — only the rn-web
 * primitives need the `$$css` shim.
 *
 * @see ../../test/rn-web-contract.test.tsx — locks the $$css contract
 */

import * as React from 'react';

// Side-effect: opt the document into both color schemes so
// `light-dark()` resolves to its dark argument under OS preference and
// `useColorScheme()` reflects the OS choice. Without this opt-in the
// browser locks the document to light for legacy compatibility, and
// `matchMedia('(prefers-color-scheme: dark)')` reports false even on
// dark systems, which propagates through React Native Web's
// `useColorScheme()` into every theme-aware component. Set as an
// inline style on `<html>` so it beats anything a host stylesheet
// declares at lower specificity. The `if (!colorScheme)` guard
// preserves an explicit author choice (e.g.
// `style="color-scheme: only light"` to force light).
if (typeof document !== 'undefined') {
  const docEl = document.documentElement;
  if (docEl && !docEl.style.colorScheme) {
    docEl.style.colorScheme = 'light dark';
  }
}

// react-native ships its own types; react-native-web is the runtime
// substrate when the host bundler maps `react-native` → `react-native-web`.
// rn-web mirrors RN's component API so the types apply cleanly.
import type {
  ActivityIndicator as RNActivityIndicator,
  Button as RNButton,
  FlatList as RNFlatList,
  Image as RNImage,
  ImageBackground as RNImageBackground,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Modal as RNModal,
  Pressable as RNPressable,
  RefreshControl as RNRefreshControl,
  SafeAreaView as RNSafeAreaView,
  ScrollView as RNScrollView,
  SectionList as RNSectionList,
  StatusBar as RNStatusBar,
  Switch as RNSwitch,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableHighlight as RNTouchableHighlight,
  TouchableOpacity as RNTouchableOpacity,
  TouchableWithoutFeedback as RNTouchableWithoutFeedback,
  View as RNView,
  VirtualizedList as RNVirtualizedList,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const reactNativeWeb = require('react-native-web') as Record<string, unknown>;

import styledWeb from '../../constructors/styled';
import createTheme from '../../constructors/createTheme';
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from '../../models/ThemeProvider';
import css from '../../constructors/css';
import keyframes from '../../constructors/keyframes';
import createGlobalStyle from '../../constructors/createGlobalStyle';
import withTheme from '../../hoc/withTheme';
import isStyledComponent from '../../utils/isStyledComponent';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import type { Styled } from '../../constructors/constructWithOptions';

type BridgedProps = {
  className?: string;
  style?: unknown;
  [key: string]: unknown;
};

/**
 * rn-web's `preprocess.js` emits `matrix(${vals.join(',')})` for
 * `transform: [{matrix: [...]}]` regardless of element count. With a
 * 16-element matrix the result is `matrix(a, b, c, ..., p)` which
 * isn't valid CSS — `matrix()` takes 6 args, `matrix3d()` takes 16.
 * The browser drops the entire `transform` declaration as invalid,
 * collapsing 3D transforms (every face stacks at origin).
 *
 * Rewrite 16-element matrix entries to `matrix3d` before rn-web's
 * preprocess sees them so the right CSS function name is emitted.
 */
function rewrite3dMatrices(style: unknown): unknown {
  if (style == null || typeof style !== 'object') return style;
  if (Array.isArray(style)) {
    let changed = false;
    const out = new Array<unknown>(style.length);
    for (let i = 0; i < style.length; i++) {
      const before = style[i];
      const after = rewrite3dMatrices(before);
      if (after !== before) changed = true;
      out[i] = after;
    }
    return changed ? out : style;
  }
  const obj = style as Record<string, unknown>;
  const t = obj.transform;
  if (!Array.isArray(t)) return style;
  let changed = false;
  const rewritten = new Array<unknown>(t.length);
  for (let i = 0; i < t.length; i++) {
    const entry = t[i];
    if (
      entry != null &&
      typeof entry === 'object' &&
      Array.isArray((entry as { matrix?: unknown[] }).matrix) &&
      (entry as { matrix: unknown[] }).matrix.length === 16
    ) {
      changed = true;
      rewritten[i] = { matrix3d: (entry as { matrix: unknown[] }).matrix };
    } else {
      rewritten[i] = entry;
    }
  }
  return changed ? { ...obj, transform: rewritten } : style;
}

/**
 * Wrap a rn-web primitive so the web pipeline's `className` prop becomes a
 * styleq `$$css` entry in `style`. rn-web's createDOMProps reads `style`
 * exclusively for className generation, so we must deliver our class
 * through `style` to land on the DOM.
 */
function bridgePrimitive<P extends BridgedProps>(
  Component: React.ComponentType<P>,
  displayName: string
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<unknown>> {
  const Bridged = React.forwardRef<unknown, P>((props, ref) => {
    const { className, style, ...rest } = props;
    const fixedStyle = rewrite3dMatrices(style);
    const merged = className ? [{ $$css: true, sc: className }, fixedStyle] : fixedStyle;
    return React.createElement(Component, {
      ...(rest as object),
      ref,
      style: merged,
    } as unknown as P);
  });
  Bridged.displayName = displayName;
  return Bridged;
}

/**
 * Full rn-web alias surface that the native entry exposes. The bridge
 * mirrors it so consumers swapping `styled-components/native` for the
 * bridge subpath see the same primitives. Each alias is constructed
 * lazily on first access (matches the native entry's `Object.defineProperty`
 * pattern) so unused primitives stay tree-shake-friendly.
 *
 * Aliases not present in the installed rn-web build throw on access
 * with a developer-readable message, matching native-entry behavior.
 */
const aliases = [
  'ActivityIndicator',
  'Button',
  'FlatList',
  'Image',
  'ImageBackground',
  'KeyboardAvoidingView',
  'Modal',
  'Pressable',
  'RefreshControl',
  'SafeAreaView',
  'ScrollView',
  'SectionList',
  'StatusBar',
  'Switch',
  'Text',
  'TextInput',
  'TouchableHighlight',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'View',
  'VirtualizedList',
] as const;

type KnownAlias = (typeof aliases)[number];

type BridgedNamespace = {
  ActivityIndicator: Styled<
    'web',
    typeof RNActivityIndicator,
    React.ComponentPropsWithRef<typeof RNActivityIndicator>
  >;
  Button: Styled<'web', typeof RNButton, React.ComponentPropsWithRef<typeof RNButton>>;
  FlatList: Styled<'web', typeof RNFlatList, React.ComponentPropsWithRef<typeof RNFlatList>>;
  Image: Styled<'web', typeof RNImage, React.ComponentPropsWithRef<typeof RNImage>>;
  ImageBackground: Styled<
    'web',
    typeof RNImageBackground,
    React.ComponentPropsWithRef<typeof RNImageBackground>
  >;
  KeyboardAvoidingView: Styled<
    'web',
    typeof RNKeyboardAvoidingView,
    React.ComponentPropsWithRef<typeof RNKeyboardAvoidingView>
  >;
  Modal: Styled<'web', typeof RNModal, React.ComponentPropsWithRef<typeof RNModal>>;
  Pressable: Styled<'web', typeof RNPressable, React.ComponentPropsWithRef<typeof RNPressable>>;
  RefreshControl: Styled<
    'web',
    typeof RNRefreshControl,
    React.ComponentPropsWithRef<typeof RNRefreshControl>
  >;
  SafeAreaView: Styled<
    'web',
    typeof RNSafeAreaView,
    React.ComponentPropsWithRef<typeof RNSafeAreaView>
  >;
  ScrollView: Styled<'web', typeof RNScrollView, React.ComponentPropsWithRef<typeof RNScrollView>>;
  SectionList: Styled<
    'web',
    typeof RNSectionList,
    React.ComponentPropsWithRef<typeof RNSectionList>
  >;
  StatusBar: Styled<'web', typeof RNStatusBar, React.ComponentPropsWithRef<typeof RNStatusBar>>;
  Switch: Styled<'web', typeof RNSwitch, React.ComponentPropsWithRef<typeof RNSwitch>>;
  Text: Styled<'web', typeof RNText, React.ComponentPropsWithRef<typeof RNText>>;
  TextInput: Styled<'web', typeof RNTextInput, React.ComponentPropsWithRef<typeof RNTextInput>>;
  TouchableHighlight: Styled<
    'web',
    typeof RNTouchableHighlight,
    React.ComponentPropsWithRef<typeof RNTouchableHighlight>
  >;
  TouchableOpacity: Styled<
    'web',
    typeof RNTouchableOpacity,
    React.ComponentPropsWithRef<typeof RNTouchableOpacity>
  >;
  TouchableWithoutFeedback: Styled<
    'web',
    typeof RNTouchableWithoutFeedback,
    React.ComponentPropsWithRef<typeof RNTouchableWithoutFeedback>
  >;
  View: Styled<'web', typeof RNView, React.ComponentPropsWithRef<typeof RNView>>;
  VirtualizedList: Styled<
    'web',
    typeof RNVirtualizedList,
    React.ComponentPropsWithRef<typeof RNVirtualizedList>
  >;
};

/**
 * `styled` bound to rn-web primitives. `styled.View\`...\`` produces a
 * styled component that renders rn-web's `<View>` while injecting CSS
 * through the web pipeline. Web-native HTML elements (`styled.a`,
 * `styled.select`, etc.) and arbitrary `styled(Component)` calls work
 * unchanged because the underlying factory IS the web `styled`.
 */
const styled = styledWeb as typeof styledWeb & BridgedNamespace;

/**
 * Per-alias baseline styles. Pressable renders as `<div>` (or
 * `<button>` when a role is set) on rn-web and inherits the default
 * text cursor; users can't tell at a glance which elements are
 * interactive. The baseline restores web affordance. Authored CSS in
 * downstream components overrides as usual.
 */
const baselineCss: Partial<Record<KnownAlias, string>> = {
  Pressable: 'cursor: pointer;',
};

/**
 * CSS-to-prop lifts for primitives whose rn-web rendering doesn't
 * pick up the spec CSS surface. rn-web abstracts the HTML element
 * away (Image renders as `<div>` with background-image, Switch as a
 * custom div/span tree), so declarations like `object-fit` or
 * `accent-color` reach the CSSOM but have no visual effect on the
 * rendered output. The lift mirrors what the native engine's
 * `SPECIAL_CASE_PROPS` mechanism did at compile time: pull the value
 * out of the authored CSS, hand it to rn-web as the component prop
 * that the component actually consumes.
 *
 * Limitations:
 * - Static values only. Dynamic interpolations (e.g.
 *   `object-fit: ${p => p.$fit}`) aren't lifted; consumers needing
 *   dynamic values should pass `resizeMode={...}` / `trackColor={...}`
 *   directly as props on the rendered element.
 * - Modern color functions (`oklch()`, `color-mix()`, etc.) that
 *   reach rn-web's `normalizeColor` are normalized to `transparent`.
 *   The bridge ships the value verbatim; consumers wanting modern
 *   color support on a lifted prop need to author with hex / rgb /
 *   hsl until rn-web's color subset catches up to CSS Color 4.
 */
type CssLiftMap = Record<string, { prop: string; transform?: (v: string) => unknown }>;

const imageLifts: CssLiftMap = {
  'object-fit': {
    prop: 'resizeMode',
    transform: v => {
      // CSS Images 3 §5.5 → rn-web Image.resizeMode enum.
      // `fill` stretches without preserving aspect (`stretch` on rn-web).
      // `none` displays the intrinsic size (`center` on rn-web is the
      // nearest analog: no scaling, anchored at center).
      // `scale-down` collapses to `contain` since rn-web has no
      // direct analog — both keep aspect and never upscale past the
      // intrinsic size when the image fits the box.
      if (v === 'fill') return 'stretch';
      if (v === 'none') return 'center';
      if (v === 'scale-down') return 'contain';
      return v;
    },
  },
};

const switchLifts: CssLiftMap = {
  'accent-color': {
    prop: 'trackColor',
    // rn-web Switch only consumes color via its `trackColor.true` /
    // `trackColor.false` prop; CSS `accent-color` doesn't reach the
    // custom-rendered control.
    transform: v => ({ true: v, false: v }),
  },
};

const liftsByAlias: Partial<Record<KnownAlias, CssLiftMap>> = {
  Image: imageLifts,
  ImageBackground: imageLifts,
  Switch: switchLifts,
};

/**
 * Walk the static string segments of a tagged template and extract
 * any CSS declarations matching the lift map. Dynamic segments
 * (interpolated args) are skipped because we can't statically evaluate
 * them. Returns the lifted prop bag ready to feed `.attrs()`.
 */
function extractCssLifts(
  strings: TemplateStringsArray,
  lifts: CssLiftMap
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [cssProp, { prop, transform }] of Object.entries(lifts)) {
    // Match `<prop>: <value>;` on its own line or at the start of a
    // declaration block. Word-boundary anchors avoid matching inside
    // longer identifiers (e.g. don't match `-webkit-object-fit`).
    const escaped = cssProp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[;{\\s])${escaped}\\s*:\\s*([^;}\\n]+)`, 'i');
    for (const segment of strings) {
      const m = segment.match(re);
      if (m) {
        const value = m[1]
          .trim()
          .replace(/!important$/i, '')
          .trim();
        out[prop] = transform ? transform(value) : value;
        break;
      }
    }
  }
  return out;
}

const bridgedCache = new Map<KnownAlias, unknown>();
aliases.forEach(alias => {
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get(): unknown {
      const cached = bridgedCache.get(alias);
      if (cached) return cached;
      const primitive = reactNativeWeb[alias];
      if (!primitive) {
        throw new Error(
          `${alias} is not available in the currently-installed version of react-native-web`
        );
      }
      const bridged = bridgePrimitive(
        primitive as React.ComponentType<BridgedProps>,
        'Bridged' + alias
      );
      const baseline = baselineCss[alias];
      const base = baseline
        ? styledWeb(bridged)`
            ${baseline}
          `
        : bridged;
      const styledBridged = styledWeb(base as React.ComponentType);
      const lifts = liftsByAlias[alias];
      let exposed: unknown = styledBridged;
      if (lifts !== undefined) {
        // Wrap as a tagged-template factory that extracts CSS lifts
        // and forwards them through `.attrs()` so rn-web's component
        // receives the lifted props at render time. Chain methods
        // like `.attrs()` directly on the bridge result are NOT
        // preserved by this wrapper; consumers wanting both lifts
        // and chained attrs should pass the prop explicitly on the
        // rendered element instead.
        const liftedFactory = (
          strings: TemplateStringsArray,
          ...args: unknown[]
        ): React.ComponentType<unknown> => {
          const liftedAttrs = extractCssLifts(strings, lifts);
          const target =
            Object.keys(liftedAttrs).length > 0
              ? (styledBridged as unknown as { attrs: (a: unknown) => unknown }).attrs(liftedAttrs)
              : styledBridged;
          return (
            target as unknown as (
              s: TemplateStringsArray,
              ...a: unknown[]
            ) => React.ComponentType<unknown>
          )(strings, ...args);
        };
        exposed = liftedFactory;
      }
      bridgedCache.set(alias, exposed);
      return exposed;
    },
  });
});

/**
 * `toStyleSheet` mirrors the native entry's helper for evaluating a `css`
 * tagged template into a flat RN-style object. On the bridge there is
 * no RN StyleSheet to map onto; consumers wanting the equivalent
 * web-side primitive should use `css` directly. We export a stub so
 * the named symbol exists, matching the native module surface for
 * drop-in replacement.
 */
function toStyleSheet(): Record<string, unknown> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '`toStyleSheet` is a no-op on the rn-web bridge; the web pipeline emits CSS through CSSOM rather than RN style objects.'
    );
  }
  return {};
}

export default styled;
export {
  styled,
  createTheme,
  css,
  keyframes,
  createGlobalStyle,
  withTheme,
  isStyledComponent,
  ThemeProvider,
  ThemeConsumer,
  ThemeContext,
  toStyleSheet,
  useTheme,
  StyleSheetManager,
  ServerStyleSheet,
};

// Mirror the responsive + native-context surface so consumers calling
// these from `styled-components/native` on rn-web keep getting the
// same module-level identifiers. `useContainer` family returns null /
// false on the bridge because container queries are handled natively
// by the browser via `@container` CSS — there's no need for a JS
// hook to mirror them.
export {
  matchMedia,
  useBreakpoint,
  useContainer,
  useContainerQuery,
  useMediaEnv,
  useMediaQuery,
} from '../responsive';
export type { ContainerEntry, MediaQueryEnv } from '../responsive';
export { NativeStyleContext, useNativeStyleContext } from '../NativeStyleContext';
export type {
  ContainerContextValue,
  NativeCascadeValues,
  NativeStyleContextValue,
} from '../NativeStyleContext';
export { ParentContext, useParentContext } from '../ParentContext';
export type { ParentContextValue } from '../ParentContext';

export type {
  CompiledAst,
  CSSKeyframes,
  CSSObject,
  CSSProperties,
  CSSPseudos,
  DefaultTheme,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  NativeTarget,
  PolymorphicComponent,
  PolymorphicComponentProps,
  RuleSet,
  Runtime,
  StyledObject,
  StyledOptions,
} from '../../types';
