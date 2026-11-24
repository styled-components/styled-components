import React from 'react';
import type { AnyComponent } from '../types';

/**
 * Adapted from hoist-non-react-statics to avoid the react-is dependency.
 * Plain objects (not null-prototype) so `key in KNOWN_STATICS` also filters
 * `Object.prototype` keys like `toString` without coercing symbols.
 */
const COMMON_STATICS = {
  defaultProps: true,
  displayName: true,
  propTypes: true,
};

const REACT_STATICS = {
  ...COMMON_STATICS,
  contextType: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  type: true,
};

const KNOWN_STATICS = {
  // React identity markers; hoisting from an RSC reference target makes
  // the wrapper look like the reference and React skips its body (#5672).
  $$async: true,
  $$bound: true,
  $$id: true,
  $$typeof: true,
  arguments: true,
  arity: true,
  callee: true,
  caller: true,
  length: true,
  name: true,
  prototype: true,
};

const FORWARD_REF_STATICS = {
  ...COMMON_STATICS,
  render: true,
};

const MEMO_STATICS = {
  ...COMMON_STATICS,
  compare: true,
  type: true,
};

const TYPE_STATICS: Record<symbol, Record<string, boolean>> = {
  [Symbol.for('react.forward_ref')]: FORWARD_REF_STATICS,
  [Symbol.for('react.memo')]: MEMO_STATICS,
};

type OmniComponent = AnyComponent;

function getStatics(component: OmniComponent) {
  return '$$typeof' in component ? TYPE_STATICS[component.$$typeof] : REACT_STATICS;
}

type ExcludeList = {
  [key: string]: true;
};

export type NonReactStatics<S extends OmniComponent, C extends ExcludeList = {}> = {
  [key in Exclude<
    keyof S,
    // biome-ignore lint/suspicious/noExplicitAny: public through `withTheme`'s return type; `MemoExoticComponent<ComponentType<never>>` fails with "Type 'ComponentType<never>' does not satisfy the constraint 'ComponentType<any>'"
    S extends React.MemoExoticComponent<any>
      ? keyof typeof MEMO_STATICS | '$$typeof' | keyof C
      : // biome-ignore lint/suspicious/noExplicitAny: same probe as above for forwardRef components; `never` compiles but changes the emitted .d.ts of the public `NonReactStatics`
        S extends React.ForwardRefExoticComponent<any>
        ? keyof typeof FORWARD_REF_STATICS | '$$typeof' | keyof C
        : keyof typeof REACT_STATICS | keyof typeof KNOWN_STATICS | keyof C
  >]: S[key];
};

export default function hoistNonReactStatics<
  T extends OmniComponent,
  S extends OmniComponent,
  C extends ExcludeList = {},
>(targetComponent: T, sourceComponent: S, excludelist?: C | undefined) {
  if (typeof sourceComponent !== 'string') {
    // don't hoist over string (html) components

    // React 19 ref-as-prop means styled components are plain functions;
    // `getPrototypeOf(fn)` returns Function.prototype, which has no statics
    // worth hoisting (`length`/`name`/`apply`/`bind`/…). Skipping it avoids
    // an extra pass through KNOWN_STATICS per styled-component creation.
    const inheritedComponent = Object.getPrototypeOf(sourceComponent);
    if (
      inheritedComponent &&
      inheritedComponent !== Object.prototype &&
      inheritedComponent !== Function.prototype
    ) {
      hoistNonReactStatics(targetComponent, inheritedComponent, excludelist);
    }

    const keys = Reflect.ownKeys(sourceComponent);

    const targetStatics = getStatics(targetComponent);
    const sourceStatics = getStatics(sourceComponent);

    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      if (
        !(key in KNOWN_STATICS) &&
        !(excludelist && typeof key === 'string' && excludelist[key]) &&
        !(sourceStatics && key in sourceStatics) &&
        !(targetStatics && key in targetStatics)
      ) {
        const descriptor = Object.getOwnPropertyDescriptor(sourceComponent, key);

        if (descriptor !== undefined) {
          try {
            // Avoid failures from read-only properties
            Object.defineProperty(targetComponent, key, descriptor);
          } catch (e) {
            /* ignore */
          }
        }
      }
    }
  }

  return targetComponent as T & NonReactStatics<S, C>;
}
