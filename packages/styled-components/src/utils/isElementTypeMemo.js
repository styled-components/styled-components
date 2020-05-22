// @flow
import React from 'react';

const hasSymbol = typeof Symbol === 'function' && Symbol.for;

const TypeOfReactMemo = hasSymbol
  ? Symbol.for('react.memo')
  : // $FlowFixMe — accessing impl detail (see https://github.com/facebook/react/issues/12882#issuecomment-440227651)
    typeof React.memo === 'function' && React.memo(() => null).$$typeof;

/**
 * Determines whether an element type is the result of `React.memo`.
 * Note: Use `ReactIs.isMemo()` if you need to test an actual react element (ie. the return of `React.createElement`).
 * This fn is in lieu of the currently unmerged https://github.com/facebook/react/pull/15349
 */
export default function isElementTypeMemo(test: any): boolean %checks {
  return TypeOfReactMemo && test && test.$$typeof === TypeOfReactMemo;
}
