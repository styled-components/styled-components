import createStyledComponent from '../models/StyledComponent';
import { BaseObject, DefaultTheme, KnownTarget, WebTarget } from '../types';
import domElements from '../utils/domElements';
import constructWithOptions, { Styled } from './constructWithOptions';

const baseStyled = <Target extends WebTarget>(tag: Target) =>
  constructWithOptions<'web', DefaultTheme, Target>(createStyledComponent, tag);

/**
 * A factory for creating styled-components. You may use it directly via `styled()` or one of the
 * convenience methods like `styled.div` to create a particular element.
 *
 * ```tsx
 * // syntaxes for making a component
 * styled('div')``;
 * styled(CustomReactComponent)``;
 * styled.div``;
 *
 * // syntaxes for composing styles (note these work with any way of making a styled-component from above)
 * styled.div`
 *   color: red;
 *
 *   > * {
 *     color: black;
 *   }
 * `;
 *
 * styled.div({
 *   color: 'red',
 *   '> *': { color: 'black' }
 * });
 *
 * styled.div(props => ({
 *   color: 'red',
 *   '> *': { color: 'black' }
 * }));
 *
 * // then use it like any other React component
 * const Box = styled.div`
 *   color: red;
 * `;
 *
 * function MyUI() {
 *   return (
 *     <Box>Things inside are red</Box>
 *   );
 * }
 * ```
 */
const styled = baseStyled as typeof baseStyled & {
  [E in keyof JSX.IntrinsicElements]: Styled<'web', DefaultTheme, E, JSX.IntrinsicElements[E]>;
};

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  // @ts-ignore weird SVG element stuff
  styled[domElement] = baseStyled<typeof domElement>(domElement);
});

export default styled;

export type ThemedStyledWebFactory<Theme extends object = DefaultTheme> = (<
  Target extends WebTarget
>(
  tag: Target
) => Styled<
  'web',
  Theme,
  Target,
  Target extends KnownTarget ? React.ComponentPropsWithRef<Target> : BaseObject
>) & { [E in keyof JSX.IntrinsicElements]: Styled<'web', Theme, E, JSX.IntrinsicElements[E]> };

/**
 * This method is only necessary if there is a desire to provide separate `styled` factories that
 * are preconfigured for a particular custom theme. Most commonly this will be third-party libraries
 * composing styled-components that wish to skip the module-augmentation step that is typically
 * required for providing custom theme data.
 *
 * ```tsx
 * const styled = createThemedWebFactory<MyCustomTheme>();
 *
 * styled.div``
 * ```
 */
export const createThemedWebFactory = <Theme extends object>() =>
  styled as ThemedStyledWebFactory<Theme>;
