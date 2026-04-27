import React from 'react';
import constructWithOptions, { Styled } from '../constructors/constructWithOptions';
import createTheme from '../constructors/createTheme.native';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import _InlineStyle, { cssToStyleObject } from '../models/InlineStyle';
import _StyledNativeComponent from '../models/StyledNativeComponent';
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from '../models/ThemeProvider';
import { NativeTarget, RuleSet } from '../types';
import flatten from '../utils/flatten';
import isStyledComponent from '../utils/isStyledComponent';
import { joinStringArray } from '../utils/joinStrings';

const reactNative = require('react-native') as Awaited<typeof import('react-native')>;

const InlineStyle = _InlineStyle(reactNative.StyleSheet);
const StyledNativeComponent = _StyledNativeComponent(InlineStyle);

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

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.forEach(alias =>
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get() {
      if (alias in reactNative && reactNative[alias]) {
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
  const flatCSS = joinStringArray(flatten(rules) as string[]);
  return cssToStyleObject(flatCSS, reactNative.StyleSheet);
};

export {
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
  Runtime,
  StyledObject,
  StyledOptions,
} from '../types';
export {
  ContainerContext,
  matchMedia,
  useBreakpoint,
  useContainer,
  useContainerQuery,
  useMediaEnv,
  useMediaQuery,
} from './responsive';
export type { ContainerEntry, MediaQueryEnv } from './responsive';
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
