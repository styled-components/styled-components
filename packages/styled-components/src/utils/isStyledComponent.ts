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
 * render is skipped. React Native styled components set `styledComponentId` to
 * `true` (no CSS class selector), which is accepted here for chain folding.
 */
export default function isStyledComponent(target: any): target is StyledComponentBrand {
  return (
    target != null &&
    (typeof target === 'object' || typeof target === 'function') &&
    target.$$typeof === REACT_FORWARD_REF_TYPE &&
    (hasStyledComponentBrand(target) || target.styledComponentId === true)
  );
}

/**
 * True for anything that renders with a web styled component's non-empty string
 * class id: the component itself, or an HOC that hoisted its statics. Excludes
 * React Native's boolean `true` brand so CSS selector flattening never emits
 * `.true`; chain folding needs `isStyledComponent`, since an HOC's own render
 * must still run.
 */
export function hasStyledComponentBrand(
  target: object
): target is { readonly styledComponentId: string } {
  const id = (target as { styledComponentId?: unknown }).styledComponentId;
  return typeof id === 'string' && id.length > 0;
}
