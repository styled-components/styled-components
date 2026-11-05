import { StyledComponentBrand } from '../types';

const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');

/**
 * Type guard that returns true if the target is a styled component.
 *
 * Accepts both `object` and `function` carriers because Preact's react-compat
 * `forwardRef` returns a function while React's returns an object (#5736).
 * `$$typeof` is checked alongside the `styledComponentId` brand so that function
 * and `memo` HOCs which hoist the brand from a styled component are not folded
 * into its chain. A `forwardRef` HOC carries both and still passes.
 */
export default function isStyledComponent(target: any): target is StyledComponentBrand {
  return (
    target != null &&
    (typeof target === 'object' || typeof target === 'function') &&
    target.$$typeof === REACT_FORWARD_REF_TYPE &&
    'styledComponentId' in target
  );
}
