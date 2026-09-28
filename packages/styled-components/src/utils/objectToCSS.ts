import { isCssProduct } from '../parser/source';
import addUnitIfNeeded from './addUnitIfNeeded';
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

/**
 * Code points that make a value text other than ordinary: anything the slot
 * value check reads, and NUL, which starts a slot marker. Parentheses are
 * ordinary only when balanced.
 */
const SPECIAL = new Uint8Array(128);
for (const c of '{}[];"\'\\/*\0') SPECIAL[c.charCodeAt(0)] = 1;

/**
 * Whether a formatted value reads the same written into the template as
 * text, so it needs no value check: no special code point, and balanced
 * parentheses. Any other value becomes a value slot.
 */
function isOrdinary(value: string): boolean {
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 128) continue;
    if (SPECIAL[c] === 1) return false;
    if (c === 40) depth++;
    else if (c === 41 && --depth < 0) return false;
  }
  return depth === 0;
}

class TemplateWriter implements ObjectTemplate {
  interpolations: unknown[] = [];
  pending = '';
  strings: string[] = [];

  slot(value: unknown): void {
    this.strings.push(this.pending);
    this.pending = '';
    this.interpolations.push(value);
  }

  declaration(key: string, value: unknown): void {
    const formatted = addUnitIfNeeded(key, value);
    if (formatted === '') return;
    this.pending += hyphenate(key) + ':';
    if (isOrdinary(formatted)) this.pending += formatted;
    else this.slot(formatted);
    this.pending += ';';
  }

  walk(o: Record<string, unknown>, render: ObjectRender | undefined): void {
    for (const key in o) {
      if (!hasOwn.call(o, key)) continue;
      let val: unknown = o[key];
      if (render !== undefined) {
        while (isFunction(val)) val = (val as (ctx: unknown) => unknown)(render.context);
      }
      if (val === undefined || val === null || val === false || val === '') continue;
      if (isPlainObject(val)) {
        // Own `toString` means the author wants a stringified value at
        // this slot, not a nested selector block.
        if (hasOwn.call(val, 'toString')) {
          this.declaration(key, val);
        } else {
          this.pending += key + '{';
          this.walk(val as Record<string, unknown>, render);
          this.pending += '}';
        }
      } else if (render === undefined && (isFunction(val) || isCssProduct(val))) {
        this.pending += hyphenate(key) + ':';
        this.slot(val);
        this.pending += ';';
      } else if (isCssProduct(val)) {
        const text = (render as ObjectRender).fragmentText(val);
        if (text !== null) this.declaration(key, text);
      } else {
        this.declaration(key, val);
      }
    }
  }
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
 */
export default function objectToTemplate(
  obj: Record<string, unknown>,
  render?: ObjectRender
): ObjectTemplate {
  const writer = new TemplateWriter();
  writer.walk(obj, render);
  writer.strings.push(writer.pending);
  return writer;
}
