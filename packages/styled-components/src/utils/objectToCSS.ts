import { staysOneField, wholeStatements } from '../parser/parser';
import { isCssProduct } from '../parser/source';
import addUnitIfNeeded from './addUnitIfNeeded';
import hyphenate from './hyphenateStyleName';
import isFunction from './isFunction';
import isPlainObject from './isPlainObject';
import { normalize } from './normalize';

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Result of converting a style object into a synthetic template literal:
 * `strings` and `interpolations` ride into `parseSource` exactly like a
 * tagged-template would, so the rest of the pipeline (Source, fast path,
 * AST emit) handles object-shaped inputs identically to `css\`...\``.
 *
 * `strings.length === interpolations.length + 1` always holds.
 */
export interface ObjectTemplate {
  /** @internal */
  strings: string[];
  /** @internal */
  interpolations: unknown[];
}

/**
 * One walk serves both object entry points. Primitives format inline through
 * `write`; nested plain objects become nested rules whose key is the raw
 * selector text (so `&:hover`, `@media (...)`, etc. round-trip unchanged); a
 * function or `css\`...\`` fragment at value position goes to `slot`, which
 * returns `false` to abandon the walk. A primitive that would not stay one field
 * in the text (including a `//` that reads as a comment to the end of the text,
 * and a NUL, which reads as a slot) also goes to `slot`, so it reads as a value
 * rather than as authored CSS.
 * With a `fillContext`, function values keep resolving against it until the value
 * is no longer a function. A plain object with its own `toString` is a design
 * token, not a block.
 */
function walkStyleObject(
  obj: Record<string, unknown>,
  write: (text: string) => void,
  slot: (value: unknown) => boolean,
  fillContext: unknown
): boolean {
  for (const key in obj) {
    if (!hasOwn.call(obj, key)) continue;
    let val: unknown = obj[key];
    while (isFunction(val) && fillContext !== undefined) {
      val = (val as (ctx: unknown) => unknown)(fillContext);
    }
    if (val === undefined || val === null || val === false || val === '') continue;
    if (isPlainObject(val) && !hasOwn.call(val, 'toString')) {
      write(key + '{');
      if (!walkStyleObject(val as Record<string, unknown>, write, slot, fillContext)) return false;
      write('}');
    } else if (isFunction(val) || isCssProduct(val)) {
      write(hyphenate(key) + ':');
      if (!slot(val)) return false;
      write(';');
    } else {
      const formatted = addUnitIfNeeded(key, val);
      if (formatted === '') continue;

      write(hyphenate(key) + ':');
      // `normalize` reads a `//` right after a colon as part of a value, as in `a:http://x`.
      const declaration = 'a:' + formatted;
      if (
        formatted.indexOf('\0') === -1 &&
        (formatted.indexOf('//') === -1 || normalize(declaration) === declaration) &&
        staysOneField(formatted)
      ) {
        write(formatted);
      } else if (!slot(formatted)) {
        return false;
      }
      write(';');
    }
  }
  return true;
}

/**
 * Walk a style object and produce a synthetic template literal. Function
 * values and `css\`...\`` fragments are extracted as interpolation slots
 * at value position; primitives format inline.
 */
export default function objectToTemplate(obj: Record<string, unknown>): ObjectTemplate {
  const strings: string[] = [];
  const interpolations: unknown[] = [];
  let pending = '';

  walkStyleObject(
    obj,
    text => {
      pending += text;
    },
    value => {
      strings.push(pending);
      pending = '';
      interpolations.push(value);
      return true;
    },
    undefined
  );
  strings.push(pending);
  return { strings, interpolations };
}

/**
 * Render-time stringifier for plain objects produced by function
 * interpolations (`css(p => ({color: p.fg}))`, `${p => ({...})}`). Emits a
 * flat CSS text string. Returns `null` when a `css\`...\`` fragment sits
 * inside an object value, which has no text form, and when a function value
 * is met with no `fillContext` to resolve it against. A text value keeps only
 * its whole statements, since the walk joins it with the text around it.
 */
export function objectToCSS(obj: Record<string, unknown>, fillContext?: unknown): string | null {
  let css = '';
  const complete = walkStyleObject(
    obj,
    text => {
      css += text;
    },
    value => {
      if (typeof value !== 'string') return false;
      css += wholeStatements(value);
      return true;
    },
    fillContext
  );
  return complete ? css : null;
}
