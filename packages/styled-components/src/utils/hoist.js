// @flow
/**
 * This is a modified version of hoist-non-react-statics v3.
 * BSD License: https://github.com/mridgway/hoist-non-react-statics/blob/master/LICENSE.md
 */
import { ForwardRef } from 'react-is';

const REACT_STATICS = {
  childContextTypes: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDerivedStateFromProps: true,
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

const TYPE_STATICS = {
  [ForwardRef]: {
    $$typeof: true,
    render: true,
  },
};

const {
  defineProperty,
  getOwnPropertyNames,
  getOwnPropertySymbols = () => [],
  getOwnPropertyDescriptor,
  getPrototypeOf,
  prototype: objectPrototype,
} = Object;

const { prototype: arrayPrototype } = Array;

export default function hoistNonReactStatics(
  targetComponent: any,
  sourceComponent: any,
  blacklist: ?Object
): any {
  if (typeof sourceComponent !== 'string') {
    // don't hoist over string (html) components

    const inheritedComponent = getPrototypeOf(sourceComponent);

    if (inheritedComponent && inheritedComponent !== objectPrototype) {
      hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
    }

    const keys = arrayPrototype.concat(
      getOwnPropertyNames(sourceComponent),
      // $FlowFixMe
      getOwnPropertySymbols(sourceComponent)
    );

    const targetStatics = TYPE_STATICS[targetComponent.$$typeof] || REACT_STATICS;

    const sourceStatics = TYPE_STATICS[sourceComponent.$$typeof] || REACT_STATICS;

    let i = keys.length;
    let descriptor;
    let key;

    // eslint-disable-next-line no-plusplus
    while (i--) {
      key = keys[i];

      if (
        // $FlowFixMe
        !KNOWN_STATICS[key] &&
        !(blacklist && blacklist[key]) &&
        !(sourceStatics && sourceStatics[key]) &&
        // $FlowFixMe
        !(targetStatics && targetStatics[key])
      ) {
        descriptor = getOwnPropertyDescriptor(sourceComponent, key);

        if (descriptor) {
          try {
            // Avoid failures from read-only properties
            defineProperty(targetComponent, key, descriptor);
          } catch (e) {
            /* fail silently */
          }
        }
      }
    }

    return targetComponent;
  }

  return targetComponent;
}
