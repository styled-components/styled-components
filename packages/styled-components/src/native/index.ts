import React from 'react';
import constructWithOptions, { Styled } from '../constructors/constructWithOptions';
import createTheme from '../constructors/createTheme.native';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import _NativeStyle, { cssToStyleObject } from '../models/NativeStyle';
import _StyledNativeComponent from '../models/StyledNativeComponent';
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from '../models/ThemeProvider';
import { buildHashCSS, evaluateForFastPath, FastPathFragment } from '../parser/compile';
import { getSource, synthesizeSourceForRuleSet } from '../parser/source';
import { NativeTarget, RuleSet } from '../types';
import isStyledComponent from '../utils/isStyledComponent';

// Side-effect: registers the default Animated-based animation adapter.
// Replace by importing `styled-components/native/reanimated` from the
// consumer's app entry.
import './animation';
export { setAnimationDebug } from './animation';

const reactNative = require('react-native') as Awaited<typeof import('react-native')>;

const NativeStyle = _NativeStyle(reactNative.StyleSheet);
const StyledNativeComponent = _StyledNativeComponent(NativeStyle);

/**
 * Create a styled component for React Native.
 *
 * ```tsx
 * const Card = styled.View`padding: 16px; background-color: white;`;
 * const Label = styled(Text)`font-size: 14px;`;
 * ```
 */
const baseStyled = <Target extends NativeTarget>(tag: Target) =>
  constructWithOptions<'native', Target>(StyledNativeComponent, tag);

const aliases = [
  'ActivityIndicator',
  'Button',
  'FlatList',
  'Image',
  'ImageBackground',
  'InputAccessoryView',
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
  'TouchableNativeFeedback',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'View',
  'VirtualizedList',
] as const;

type KnownComponents = (typeof aliases)[number];

/** Isolates RN-provided components since they don't expose a helper type for this. */
type RNComponents = {
  [K in keyof typeof reactNative]: (typeof reactNative)[K] extends React.ComponentType<any>
    ? (typeof reactNative)[K]
    : never;
};

const styled = baseStyled as typeof baseStyled & {
  [E in KnownComponents]: Styled<'native', RNComponents[E], React.ComponentProps<RNComponents[E]>>;
};

// ScrollView baseline. Native ships `flex-shrink: 1` (vs View's `0`);
// pin to `0` so explicit `width:` / `height:` declarations aren't
// silently overridden in flex parents.
let cachedScrollViewBase: NativeTarget | undefined;
function getScrollViewBase(): NativeTarget {
  if (cachedScrollViewBase) return cachedScrollViewBase;
  cachedScrollViewBase = styled(reactNative.ScrollView as NativeTarget)`
    flex-shrink: 0;
  ` as unknown as NativeTarget;
  return cachedScrollViewBase;
}

aliases.forEach(alias =>
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get() {
      if (alias in reactNative && reactNative[alias]) {
        if (alias === 'ScrollView') return styled(getScrollViewBase());
        return styled(reactNative[alias] as NativeTarget);
      }

      throw new Error(
        `${alias} is not available in the currently-installed version of react-native`
      );
    },
  })
);

/**
 * Convert a `css` tagged template to a React Native StyleSheet object.
 *
 * ```tsx
 * const styles = toStyleSheet(css`background-color: red; padding: 10px;`);
 * // { backgroundColor: 'red', paddingTop: 10, ... }
 * ```
 */
const toStyleSheet = (rules: RuleSet<object>) => {
  synthesizeSourceForRuleSet(rules);
  const source = getSource(rules);
  let flatCSS = '';
  if (source !== undefined) {
    const fragments: (FastPathFragment | null)[] = [];
    const filled = evaluateForFastPath(source, {} as never, undefined, undefined, fragments);
    if (filled !== null) {
      let hasFragments = false;
      for (let i = 0; i < fragments.length; i++) {
        if (fragments[i] !== null) {
          hasFragments = true;
          break;
        }
      }
      flatCSS = buildHashCSS(source.strings, filled, hasFragments ? fragments : null);
    }
  }
  return cssToStyleObject(flatCSS, reactNative.StyleSheet);
};

export {
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
} from '../types';
export {
  matchMedia,
  useBreakpoint,
  useContainer,
  useContainerQuery,
  useMediaEnv,
  useMediaQuery,
} from './responsive';
export type { ContainerEntry, MediaQueryEnv } from './responsive';
export { NativeStyleContext, useNativeStyleContext } from './NativeStyleContext';
export type {
  ContainerContextValue,
  NativeCascadeValues,
  NativeStyleContextValue,
} from './NativeStyleContext';
export { ParentContext, useParentContext } from './ParentContext';
export type { ParentContextValue } from './ParentContext';
export {
  createTheme,
  css,
  styled as default,
  isStyledComponent,
  styled,
  ThemeConsumer,
  ThemeContext,
  ThemeProvider,
  toStyleSheet,
  useTheme,
  withTheme,
};
