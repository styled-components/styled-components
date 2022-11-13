import React from 'react';
import constructWithOptions, { Styled } from '../constructors/constructWithOptions';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import useTheme from '../hooks/useTheme';
import _InlineStyle from '../models/InlineStyle';
import _StyledNativeComponent from '../models/StyledNativeComponent';
import ThemeProvider, { ThemeConsumer, ThemeContext } from '../models/ThemeProvider';
import { NativeTarget } from '../types';
import isStyledComponent from '../utils/isStyledComponent';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const reactNative = require('react-native') as Awaited<typeof import('react-native')>;

const InlineStyle = _InlineStyle(reactNative.StyleSheet);
const StyledNativeComponent = _StyledNativeComponent(InlineStyle);

const baseStyled = <Target extends NativeTarget>(tag: Target) =>
  constructWithOptions<'native', Target>(StyledNativeComponent, tag);

/* React native lazy-requires each of these modules for some reason, so let's
 *  assume it's for a good reason and not eagerly load them all */
const aliases = [
  'ActivityIndicator',
  'Button',
  'DatePickerIOS',
  'DrawerLayoutAndroid',
  'FlatList',
  'Image',
  'ImageBackground',
  'KeyboardAvoidingView',
  'Modal',
  'Pressable',
  'ProgressBarAndroid',
  'ProgressViewIOS',
  'RefreshControl',
  'SafeAreaView',
  'ScrollView',
  'SectionList',
  'Slider',
  'Switch',
  'Text',
  'TextInput',
  'TouchableHighlight',
  'TouchableOpacity',
  'View',
  'VirtualizedList',
] as const;

type KnownComponents = typeof aliases[number];

/** Isolates RN-provided components since they don't expose a helper type for this. */
type RNComponents = {
  [K in keyof typeof reactNative]: typeof reactNative[K] extends React.ComponentType<any>
    ? typeof reactNative[K]
    : never;
};

const styled = baseStyled as typeof baseStyled & {
  [E in KnownComponents]: Styled<'native', RNComponents[E]>;
};

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.forEach(alias =>
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get() {
      if (alias in reactNative && reactNative[alias]) {
        return styled(reactNative[alias]);
      }

      throw new Error(
        `${alias} is not available in the currently-installed version of react-native`
      );
    },
  })
);

export {
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
export { css, isStyledComponent, ThemeProvider, ThemeConsumer, ThemeContext, withTheme, useTheme };

export default styled;
