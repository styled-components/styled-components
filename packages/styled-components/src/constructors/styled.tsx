import * as React from 'react';
import createStyledComponent from '../models/StyledComponent';
import { BaseObject, KnownTarget, WebTarget } from '../types';
import domElements, { SupportedHTMLElements } from '../utils/domElements';
import constructWithOptions, { Styled as StyledInstance } from './constructWithOptions';

/**
 * Create a styled component from an HTML element or React component.
 *
 * ```tsx
 * const Button = styled.button`color: red;`;
 * const Link = styled(RouterLink)`text-decoration: none;`;
 * ```
 */
const baseStyled = <Target extends WebTarget, InjectedProps extends object = BaseObject>(
  tag: Target
) =>
  constructWithOptions<
    'web',
    Target,
    Target extends KnownTarget ? React.ComponentPropsWithRef<Target> & InjectedProps : InjectedProps
  >(createStyledComponent, tag);

const styled = baseStyled as typeof baseStyled & {
  [E in SupportedHTMLElements]: StyledInstance<'web', E, React.JSX.IntrinsicElements[E]>;
};

// Shorthands for all valid HTML Elements.
// The type assertion avoids 120 Styled<> instantiations during type checking —
// the correct types are declared on the `styled` const above via the mapped type.
domElements.forEach(domElement => {
  (styled as any)[domElement] = baseStyled(domElement);
});

export default styled;
export { StyledInstance };

/**
 * This is the type of the `styled` HOC.
 */
export type Styled = typeof styled;

/**
 * Use this higher-order type for scenarios where you are wrapping `styled`
 * and providing extra props as a third-party library.
 */
export type LibraryStyled<LibraryProps extends object = BaseObject> = <Target extends WebTarget>(
  tag: Target
) => typeof baseStyled<Target, LibraryProps>;
