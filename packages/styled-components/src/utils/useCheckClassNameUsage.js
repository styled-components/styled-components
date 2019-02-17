// @flow
import { useRef, useEffect, useCallback, type Ref, type ElementType } from 'react';
import ReactDOM from 'react-dom';
import getComponentName from './getComponentName';
import { IS_BROWSER } from '../constants';
import type { Target } from '../types';

function useCombinedRefs<T: ElementType>(ref1: Ref<T>, ref2: Ref<T> | null) {
  return useCallback(
    (ref: any) => {
      if (typeof ref1 === 'function') {
        ref1(ref);
      } else if (typeof ref1 === 'object' && ref1 !== null) {
        // eslint-disable-next-line no-param-reassign
        ref1.current = ref;
      }

      if (typeof ref2 === 'function') {
        ref2(ref);
      } else if (typeof ref2 === 'object' && ref2 !== null) {
        // eslint-disable-next-line no-param-reassign
        ref2.current = ref;
      }
    },
    [ref1, ref2]
  );
}

// this sounds like it should be a WeakSet instead
const didWarnAboutClassNameUsage = new Set();
function useDevelopmentCheckClassNameUsage(
  ref: Ref<*>,
  target: Target,
  generatedClassName: string,
  suppressClassNameWarning: boolean
) {
  const ownRefDefault: { current: any } = useRef(null);
  const ownRef = suppressClassNameWarning ? null : ownRefDefault;
  const refToUse = useCombinedRefs(ref, ownRef);

  // maybe useLayoutEffect? probably doesn't need to
  useEffect(() => {
    if (suppressClassNameWarning || didWarnAboutClassNameUsage.has(target)) {
      return;
    }
    didWarnAboutClassNameUsage.add(target);

    const classNames = generatedClassName
      .replace(/ +/g, ' ')
      .trim()
      .split(' ');
    // eslint-disable-next-line react/no-find-dom-node
    const node: Element | null = (ReactDOM.findDOMNode(ownRefDefault.current): any);
    const selector = classNames.map(s => `.${s}`).join('');

    if (
      node &&
      node.nodeType === 1 &&
      !classNames.every(className => node.classList && node.classList.contains(className)) &&
      !node.querySelector(selector)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `It looks like you've wrapped styled() around your React component (${getComponentName(
          target
        )}), but the className prop is not being passed down to a child. No styles will be rendered unless className is composed within your React component.`
      );
    }
  }, []);

  return refToUse;
}

// prettier breaks the type cast; want to cast the function type itself, not its result
// prettier-ignore
export default (process.env.NODE_ENV === 'production' || !IS_BROWSER
  ? (((target: Ref<*>) => target): typeof useDevelopmentCheckClassNameUsage)
  : useDevelopmentCheckClassNameUsage);
