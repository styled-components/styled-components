import reactPrimitives from 'react-primitives';
import constructWithOptions, { NativeStyled } from '../constructors/constructWithOptions';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import useTheme from '../hooks/useTheme';
import _InlineStyle from '../models/InlineStyle';
import _StyledNativeComponent from '../models/StyledNativeComponent';
import ThemeProvider, { ThemeConsumer, ThemeContext } from '../models/ThemeProvider';
import { NativeTarget } from '../types';
import isStyledComponent from '../utils/isStyledComponent';

const InlineStyle = _InlineStyle(reactPrimitives.StyleSheet);
const StyledNativeComponent = _StyledNativeComponent(InlineStyle);

const baseStyled = <Target extends NativeTarget>(tag: Target) =>
  constructWithOptions<'native', Target>(StyledNativeComponent, tag);

/* React native lazy-requires each of these modules for some reason, so let's
 *  assume it's for a good reason and not eagerly load them all */
const aliases = ['Image', 'Text', 'Touchable', 'View'] as const;

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.forEach(alias =>
  Object.defineProperty(baseStyled, alias, {
    enumerable: true,
    configurable: false,
    get() {
      return baseStyled(reactPrimitives[alias]);
    },
  })
);

type RNComponents = {
  [K in keyof typeof reactPrimitives]: typeof reactPrimitives[K] extends React.JSXElementConstructor<any>
    ? typeof reactPrimitives[K]
    : never;
};

const styled = baseStyled as typeof baseStyled & {
  [E in typeof aliases[number]]: NativeStyled<
    RNComponents[E],
    React.ComponentProps<RNComponents[E]>
  >;
};

export { css, isStyledComponent, ThemeProvider, ThemeConsumer, ThemeContext, withTheme, useTheme };

export default styled;
