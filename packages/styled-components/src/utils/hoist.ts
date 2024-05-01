import React from 'react';
import { AnyComponent } from '../types';

const hasSymbol = typeof Symbol === 'function' && Symbol.for;

// copied from react-is
const REACT_MEMO_TYPE = hasSymbol ? Symbol.for('react.memo') : 0xead3;
const REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for('react.forward_ref') : 0xead0;

/**
 * Adapted from hoist-non-react-statics to avoid the react-is dependency.
 */
const REACT_STATICS = {
  childContextTypes: true,
  contextType: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDefaultProps: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  mixins: true,
  propTypes: true,
  type: true,
};

const KNOWN_STATICS = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true,
};

const FORWARD_REF_STATICS = {
  $$typeof: true,
  render: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
};

const MEMO_STATICS = {
  $$typeof: true,
  compare: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
  type: true,
};

const TYPE_STATICS = {
  [REACT_FORWARD_REF_TYPE]: FORWARD_REF_STATICS,
  [REACT_MEMO_TYPE]: MEMO_STATICS,
};

type OmniComponent = AnyComponent;

// adapted from react-is
function isMemo(
  object: OmniComponent | React.MemoExoticComponent<any>
): object is React.MemoExoticComponent<any> {
  const $$typeofType = 'type' in object && object.type.$$typeof;

  return $$typeofType === REACT_MEMO_TYPE;
}

function getStatics(component: OmniComponent) {
  // React v16.11 and below
  if (isMemo(component)) {
    return MEMO_STATICS;
  }

  // React v16.12 and above
  return '$$typeof' in component
    ? TYPE_STATICS[component['$$typeof'] as unknown as string]
    : REACT_STATICS;
}

const defineProperty = Object.defineProperty;
const getOwnPropertyNames = Object.getOwnPropertyNames;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const getPrototypeOf = Object.getPrototypeOf;
const objectPrototype = Object.prototype;

type ExcludeList = {
  [key: string]: true;
};

type NonReactStatics<S extends OmniComponent, C extends ExcludeList = {}> = {
  [key in Exclude<
    keyof S,
    S extends React.MemoExoticComponent<any>
      ? keyof typeof MEMO_STATICS | keyof C
      : S extends React.ForwardRefExoticComponent<any>
        ? keyof typeof FORWARD_REF_STATICS | keyof C
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

    if (objectPrototype) {
      const inheritedComponent = getPrototypeOf(sourceComponent);
      if (inheritedComponent && inheritedComponent !== objectPrototype) {
        hoistNonReactStatics(targetComponent, inheritedComponent, excludelist);
      }
    }

    let keys: (String | Symbol)[] = getOwnPropertyNames(sourceComponent);

    if (getOwnPropertySymbols) {
      keys = keys.concat(getOwnPropertySymbols(sourceComponent));
    }

    const targetStatics = getStatics(targetComponent);
    const sourceStatics = getStatics(sourceComponent);

    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i] as unknown as string;
      if (
        !(key in KNOWN_STATICS) &&
        !(excludelist && excludelist[key]) &&
        !(sourceStatics && key in sourceStatics) &&
        !(targetStatics && key in targetStatics)
      ) {
        const descriptor = getOwnPropertyDescriptor(sourceComponent, key);

        try {
          // Avoid failures from read-only properties
          defineProperty(targetComponent, key, descriptor!);
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  return targetComponent as T & NonReactStatics<S, C>;
}
