import { isCssProduct } from '../parser/source';
import addUnitIfNeeded from './addUnitIfNeeded';
import hyphenate from './hyphenateStyleName';
import isFunction from './isFunction';
import isPlainObject from './isPlainObject';

/**
 * Result of converting a style object into a synthetic template literal:
 * `strings` and `interpolations` ride into `parseSource` exactly like a
 * tagged-template would, so the rest of the pipeline (Source, fast path,
 * AST emit) handles object-shaped inputs identically to `css\`...\``.
 *
 * `strings.length === interpolations.length + 1` always holds.
 */
export interface ObjectTemplate {
  strings: string[];
  interpolations: unknown[];
}

/**
 * Walk a style object and produce a synthetic template literal. Function
 * values and `css\`...\`` fragments are extracted as interpolation slots
 * at value position; primitives format inline. Nested plain-object values
 * become nested rules whose key is the raw selector text (so `&:hover`,
 * `@media (...)`, etc. round-trip unchanged).
 */
export default function objectToTemplate(obj: Record<string, unknown>): ObjectTemplate {
  const strings: string[] = [];
  const interpolations: unknown[] = [];
  let pending = '';

  function pushSlot(slot: unknown): void {
    strings.push(pending);
    pending = '';
    interpolations.push(slot);
  }

  function walk(o: Record<string, unknown>): void {
    for (const key in o) {
      if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
      const val = o[key];
      if (val === undefined || val === null || val === false || val === '') continue;
      if (isPlainObject(val)) {
        pending += key + '{';
        walk(val as Record<string, unknown>);
        pending += '}';
      } else if (isFunction(val) || isCssProduct(val)) {
        pending += hyphenate(key) + ':';
        pushSlot(val);
        pending += ';';
      } else {
        const formatted = addUnitIfNeeded(key, val);
        if (formatted === '') continue;
        pending += hyphenate(key) + ':' + formatted + ';';
      }
    }
  }

  walk(obj);
  strings.push(pending);
  return { strings, interpolations };
}

/**
 * Render-time stringifier for plain objects produced by function
 * interpolations (`css(p => ({color: p.fg}))`, `${p => ({...})}`). Resolves
 * nested function values against the supplied fill context (mirroring
 * legacy `flatten`'s recursive call behavior) and emits a flat CSS text
 * string. Returns `null` when an unsupported shape (e.g. an unresolved
 * `css\`...\`` fragment inside an object value, deeply nested arrays) is
 * encountered so the caller can fall through to a legacy path.
 */
export function objectToCSS(obj: Record<string, unknown>, fillContext?: unknown): string | null {
  let css = '';
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    let val: unknown = obj[key];
    // Resolve function values recursively (with a shallow recursion limit
    // implicit in the call chain) so `{ color: p => p.fg }` works the same
    // as `{ color: 'tomato' }` once the prop reaches us.
    while (isFunction(val) && fillContext !== undefined) {
      val = (val as (ctx: unknown) => unknown)(fillContext);
    }
    if (val === undefined || val === null || val === false || val === '') continue;
    if (isPlainObject(val)) {
      const inner = objectToCSS(val as Record<string, unknown>, fillContext);
      if (inner === null) return null;
      css += key + '{' + inner + '}';
    } else if (isCssProduct(val)) {
      // Tagged css`` fragment inside an object value — needs Source-aware
      // splicing the caller can do with the slot variant.
      return null;
    } else {
      const formatted = addUnitIfNeeded(key, val);
      if (formatted === '') continue;
      css += hyphenate(key) + ':' + formatted + ';';
    }
  }
  return css;
}
