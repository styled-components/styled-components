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
    const merged = className ? [{ $$css: true, sc: className }, style] : style;
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

const bridgedCache = new Map<KnownAlias, ReturnType<typeof styledWeb>>();
aliases.forEach(alias => {
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get(): ReturnType<typeof styledWeb> {
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
      const styledBridged = styledWeb(bridged);
      bridgedCache.set(alias, styledBridged);
      return styledBridged;
    },
  });
});

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
  useTheme,
  StyleSheetManager,
  ServerStyleSheet,
};
