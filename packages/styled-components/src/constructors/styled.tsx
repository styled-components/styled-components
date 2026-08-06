import createStyledComponent from '../models/StyledComponent';
import { BaseObject, TargetProps, WebTarget } from '../types';
import type { SupportedHTMLElements } from '../utils/domElements';
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
  constructWithOptions<'web', Target, TargetProps<'web', Target> & InjectedProps>(
    createStyledComponent,
    tag
  );

/**
 * Shape test for a property read that should become a shorthand: all-lowercase
 * HTML tags, plus the closed set of camelCase SVG names. Deliberately
 * permissive on the lowercase side so `styled.blink` yields a factory just as
 * `styled('blink')` does. Excludes `then` because promise adoption would treat
 * a returned factory as a thenable; other probes (`$$typeof`, `toJSON`,
 * `displayName`) fail the shape test on their own.
 */
const TAG_NAME_RE =
  /^(?:[a-z][a-z\d]*|fe[A-Z][a-zA-Z]*|clipPath|foreignObject|linearGradient|radialGradient|textPath)$/;

function isTagShorthand(prop: string): boolean {
  return prop !== 'then' && TAG_NAME_RE.test(prop);
}

const shorthands = new Map<string, ReturnType<typeof baseStyled>>();

/**
 * `styled.div` and friends are built on first access and cached, so an app pays
 * only for the tags it uses and no bundle carries a table of element names.
 */
const styled = new Proxy(baseStyled, {
  get(target, prop) {
    if (typeof prop === 'string') {
      const cached = shorthands.get(prop);
      if (cached !== undefined) return cached;

      if (!(prop in target) && isTagShorthand(prop)) {
        const shorthand = baseStyled(prop);
        shorthands.set(prop, shorthand);
        return shorthand;
      }
    }

    return Reflect.get(target, prop);
  },

  /** Feature detection (`'div' in styled`) has to agree with what `get` answers. */
  has(target, prop) {
    return prop in target || (typeof prop === 'string' && isTagShorthand(prop));
  },

  // The mapped type below is the contract; the trap answers for every member of it.
}) as typeof baseStyled & {
  [E in SupportedHTMLElements]: StyledInstance<'web', E, TargetProps<'web', E>>;
};

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
