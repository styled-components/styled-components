import type { Dict } from '../types';

export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);
export const EMPTY_OBJECT: Readonly<Dict<never>> = Object.freeze({});

/** The render context of a `keyframes` template, which has none: its functions are written as their source text. */
export const NO_CONTEXT: object = {};
