import React from 'react';
import styledError from './error';

/**
 * True in React Server Component environments (`createContext` is missing).
 * Non-server builds replace the expression with `false` via
 * rollup-plugin-replace, dead-code-eliminating the React import here.
 *
 * Lives outside `constants.ts` so React-free modules (parser, plugins,
 * native transforms) don't transitively pull React in.
 */
export const IS_RSC: boolean = typeof React.createContext === 'undefined';

/**
 * A browser build that lands in a Server Components environment (the edge
 * runtime applies the `browser` file map) would otherwise fail later with an
 * anonymous "createContext is not a function". Spelled with `!` because the
 * build rewrites the `typeof` form of the check above.
 */
if (!IS_RSC && !React.createContext) throw styledError(19);
