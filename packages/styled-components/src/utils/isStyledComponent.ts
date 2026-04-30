import type { StyledComponentBrand } from '../types';

/** Type guard that returns true if the target is a styled component. */
export default function isStyledComponent(target: any): target is StyledComponentBrand {
  // With React 19 ref-as-prop, styled components are plain function components
  // (typeof === 'function'). Earlier versions used React.forwardRef which
  // returns an exotic object. Accept both shapes for back-compat of consumers
  // still using forwardRef-based styled components.
  return (
    target != null &&
    (typeof target === 'function' || typeof target === 'object') &&
    'styledComponentId' in target
  );
}
