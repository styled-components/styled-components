import React from 'react';
import styledError from './error';

/**
 * True in React Server Component environments (`createContext` is missing).
 * Every bundle but the server one replaces the expression with `false` via
 * rollup-plugin-replace; the React import survives only where the edge guard
 * below reads it.
 *
 * Lives outside `constants.ts` so React-free modules (parser, plugins,
 * native transforms) don't transitively pull React in.
 */
export const IS_RSC: boolean = typeof React.createContext === 'undefined';

/** Edge-runtime guard: see docs/bundling.md "Edge runtime". Never spell the `typeof` form here, the build rewrites it. */
if (!__SERVER__ && !__NATIVE__ && !IS_RSC && !React.createContext) throw styledError(19);
