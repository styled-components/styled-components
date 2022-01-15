import reactPrimitives from 'react-primitives';
import constructWithOptions, { Construct } from '../constructors/constructWithOptions';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import useTheme from '../hooks/useTheme';
import _InlineStyle from '../models/InlineStyle';
import _StyledNativeComponent from '../models/StyledNativeComponent';
import ThemeProvider, { ThemeConsumer, ThemeContext } from '../models/ThemeProvider';
import { IStyledNativeComponentFactory, NativeTarget } from '../types';
import isStyledComponent from '../utils/isStyledComponent';

const InlineStyle = _InlineStyle(reactPrimitives.StyleSheet);
const StyledNativeComponent = _StyledNativeComponent(InlineStyle);
let styled = <Target extends NativeTarget>(tag: NativeTarget) =>
  constructWithOptions<Target, IStyledNativeComponentFactory<Target>>(StyledNativeComponent, tag);

/* React native lazy-requires each of these modules for some reason, so let's
 *  assume it's for a good reason and not eagerly load them all */
const aliases = ['Image', 'Text', 'Touchable', 'View'] as const;

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.forEach(alias =>
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get() {
      return styled(reactPrimitives[alias]);
    },
  })
);

styled = styled as typeof styled & {
  [E in typeof aliases[number]]: ReturnType<
    <Props extends {} = {}>() => ReturnType<Construct<E, Props>>
  >;
};

export { css, isStyledComponent, ThemeProvider, ThemeConsumer, ThemeContext, withTheme, useTheme };

export default styled as typeof styled & {
  [key in typeof aliases[number]]: ReturnType<typeof constructWithOptions>;
};
