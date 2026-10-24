import type { StyledComponentBrand } from '../types';

// biome-ignore lint/suspicious/noExplicitAny: public export; `unknown` is a pure widening but changes the emitted .d.ts of a public function, which needs the maintainers' approval first
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
