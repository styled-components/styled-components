import React from 'react';

/**
 * True in React Server Component environments (`createContext` is missing).
 * Non-server builds replace the expression with `false` via
 * rollup-plugin-replace, dead-code-eliminating the React import here.
 *
 * Lives outside `constants.ts` so React-free modules (parser, plugins,
 * native transforms) don't transitively pull React in.
 */
export const IS_RSC: boolean = typeof React.createContext === 'undefined';
