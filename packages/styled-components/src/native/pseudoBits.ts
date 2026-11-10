import type { PseudoState } from '../parser/ast';

/**
 * One bit per pseudo-class a native rule can read. A compiled style ORs the bits of every
 * pseudo-class it reads into `pseudoReads`, so the render path pays for a state only when a rule asks.
 * Kept apart from the matching code, which imports the compiler that imports these bits.
 */
export const PSEUDO_BIT = {
  disabled: 8,
  enabled: 16,
  focus: 2,
  hover: 1,
  pressed: 4,
  readOnly: 32,
  readWrite: 64,
} as const satisfies Record<PseudoState, number>;

/** Each pseudo-class as an author writes it, for messages. */
export const PSEUDO_TO_SELECTOR = {
  disabled: ':disabled',
  enabled: ':enabled',
  focus: ':focus',
  hover: ':hover',
  pressed: ':active',
  readOnly: ':read-only',
  readWrite: ':read-write',
} as const satisfies Record<PseudoState, string>;

/** A Map, so an inherited name such as `constructor` is never a pseudo-class. */
export const KNOWN_PSEUDOS = /* @__PURE__ */ new Map<string, PseudoState>([
  ['active', 'pressed'],
  ['disabled', 'disabled'],
  ['enabled', 'enabled'],
  ['focus', 'focus'],
  ['focus-visible', 'focus'],
  ['hover', 'hover'],
  ['read-only', 'readOnly'],
  ['read-write', 'readWrite'],
]);

/** Pseudo-classes whose state comes from press, hover and focus events. */
export const INTERACTION_BITS = PSEUDO_BIT.hover | PSEUDO_BIT.focus | PSEUDO_BIT.pressed;

/** Pseudo-classes whose state comes from the element's props. */
export const ELEMENT_STATE_BITS =
  PSEUDO_BIT.disabled | PSEUDO_BIT.enabled | PSEUDO_BIT.readOnly | PSEUDO_BIT.readWrite;
