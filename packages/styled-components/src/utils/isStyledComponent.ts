import { StyledComponentBrand } from '../types';

const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');

/**
 * Type guard that returns true if the target is a styled component.
 *
 * Accepts both `object` and `function` carriers because preact/compat's
 * `forwardRef` returns a function while React's returns an object (#5736).
 * `$$typeof` is checked alongside the `styledComponentId` brand so that function
 * and `memo` HOCs which hoist the brand from a styled component are not folded
 * into its chain. A `forwardRef` HOC carries both, so it is folded and its own
 * render is skipped.
 */
export default function isStyledComponent(target: any): target is StyledComponentBrand {
  return (
    target != null &&
    (typeof target === 'object' || typeof target === 'function') &&
    target.$$typeof === REACT_FORWARD_REF_TYPE &&
    hasStyledComponentBrand(target)
  );
}

/**
 * True for anything that renders with a styled component's class: the component
 * itself, or an HOC that hoisted its statics. For selectors only; chain folding
 * needs `isStyledComponent`, since an HOC's own render must still run.
 */
export function hasStyledComponentBrand(
  target: object
): target is { readonly styledComponentId: string } {
  return 'styledComponentId' in target;
}
