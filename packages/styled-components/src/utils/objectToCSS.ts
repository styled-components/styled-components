import { readsAsTemplateValue } from '../parser/slotValue';
import { isCssProduct } from '../parser/source';
import addUnitIfNeeded from './addUnitIfNeeded';
import { NO_CONTEXT } from './empties';
import hyphenate from './hyphenateStyleName';
import isFunction from './isFunction';
import isPlainObject from './isPlainObject';

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
  interpolations: unknown[];
  strings: string[];
}

/** How a style object met at render time resolves its function and css fragment values. */
export interface ObjectRender {
  context: unknown;
  /** A css fragment value's text, or `null` to drop its declaration. */
  fragmentText: (fragment: unknown) => string | null;
}

/** A walked style object; see {@link walkObject}. */
export interface WalkedObject {
  interpolations: unknown[] | null;
  pending: string;
  strings: string[] | null;
}

/**
 * Walk a style object into a synthetic template literal. Keys are written
 * as template text (property names, and nested selectors or at-rules whose
 * block holds the nested object); a value with anything other than ordinary
 * text becomes a value slot, checked like `color: ${value}`.
 *
 * Without `render` (a static object), function values and css fragments
 * become slots resolved at fill time. With it (an object met at render
 * time), function values are called with the render context and css
 * fragments give their text.
 *
 * The template is `strings` and `interpolations` with `pending` as the last
 * string; both arrays are `null` when every value is ordinary, and `pending`
 * is then the object's whole text.
 */
export function walkObject(
  obj: Record<string, unknown>,
  render: ObjectRender | undefined
): WalkedObject {
  /** Allocated on the first slot; `null` while the text holds only ordinary values. */
  let interpolations: unknown[] | null = null;
  let strings: string[] | null = null;
  let pending = '';

  const slot = (value: unknown): void => {
    if (strings === null || interpolations === null) {
      strings = [];
      interpolations = [];
    }
    strings.push(pending);
    pending = '';
    interpolations.push(value);
  };

  const declaration = (key: string, value: unknown): void => {
    const formatted = addUnitIfNeeded(key, value);
    if (formatted === '') return;
    if (typeof value === 'number' || readsAsTemplateValue(formatted)) {
      pending += hyphenate(key) + ':' + formatted + ';';
    } else {
      pending += hyphenate(key) + ':';
      slot(formatted);
      pending += ';';
    }
  };

  const walk = (o: Record<string, unknown>): void => {
    for (const key in o) {
      if (!hasOwn.call(o, key)) continue;
      let val: unknown = o[key];
      if (render !== undefined) {
        while (isFunction(val)) {
          val =
            render.context === NO_CONTEXT
              ? String(val)
              : (val as (ctx: unknown) => unknown)(render.context);
        }
      }
      if (val === undefined || val === null || val === false || val === '') continue;
      if (isPlainObject(val)) {
        // Own `toString` means the author wants a stringified value at
        // this slot, not a nested selector block.
        if (hasOwn.call(val, 'toString')) {
          declaration(key, val);
        } else {
          pending += key + '{';
          walk(val as Record<string, unknown>);
          pending += '}';
        }
      } else if (isCssProduct(val) || isFunction(val)) {
        if (render === undefined) {
          pending += hyphenate(key) + ':';
          slot(val);
          pending += ';';
        } else {
          const text = render.fragmentText(val);
          if (text !== null) declaration(key, text);
        }
      } else {
        declaration(key, val);
      }
    }
  };

  walk(obj);
  return { interpolations, pending, strings };
}

/** {@link walkObject} for a static object, as a template for `parseSource`. */
export default function objectToTemplate(obj: Record<string, unknown>): ObjectTemplate {
  const walked = walkObject(obj, undefined);
  const strings = walked.strings === null ? [] : walked.strings;
  strings.push(walked.pending);
  return { interpolations: walked.interpolations === null ? [] : walked.interpolations, strings };
}
