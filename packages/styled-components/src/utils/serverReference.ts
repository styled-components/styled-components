import { IS_RSC } from './isRsc';
import { warnOnce } from './warnOnce';

/**
 * Whether a template can hold a reference. Flight makes them only under the `react-server`
 * condition, so plain server rendering (a client tree) skips every reference check.
 */
export const CAN_HOLD_REFERENCE = __SERVER__ && IS_RSC;

/** `$$typeof` of a `'use client'` export as a server component receives it. */
export const CLIENT_REFERENCE = /*#__PURE__*/ Symbol.for('react.client.reference');

/** `$$typeof` of a value a server action received from the client. */
export const TEMPORARY_REFERENCE = /*#__PURE__*/ Symbol.for('react.temporary.reference');

/**
 * Text a reference stands for while a template is filled; the drop pass in `parser/compile.ts`
 * removes the node holding it before emit. Fixed, because it enters the class hash, which must
 * match across processes. It starts with a NUL, which an author's CSS never holds.
 */
export const REFERENCE_MARKER = '\0sc-ref\0';

/** Whether `text` holds the marker a reference filled in. */
export function hasReferenceMarker(text: string): boolean {
  return text.includes(REFERENCE_MARKER);
}

/** What `isServerOpaqueReference` proves: only the tag is safe to read. */
export type ServerReference = { readonly $$typeof: symbol };

/**
 * True for a client reference or a temporary reference, in any shape Flight makes (a function,
 * or the object a module proxy is). Reads only `$$typeof`, which is safe on all of them; nearly
 * every other read throws, so a caller checks this before reading anything else. Only a server
 * build holds one, so callers gate it on `CAN_HOLD_REFERENCE`. The `in` probe and plain read, unlike
 * `Reflect.get`, stay on the engine's inline-cache path for the values a template holds.
 */
export function isServerOpaqueReference(value: unknown): value is ServerReference {
  if (typeof value !== 'function' && (typeof value !== 'object' || value === null)) return false;
  if (!('$$typeof' in value)) return false;

  const tag = value.$$typeof;

  return (
    (tag === CLIENT_REFERENCE || tag === TEMPORARY_REFERENCE) && !('styledComponentId' in value)
  );
}

/** The export name an id ends in; a default export names no component, so its module id stands in. */
function exportLabel(id: unknown): string {
  if (typeof id !== 'string') return '';

  const hash = id.lastIndexOf('#');
  const name = id.slice(hash + 1);

  return name === 'default' && hash > 0 ? id.slice(0, hash) : name;
}

/**
 * The marker to fill in for `reference`. In development it warns once per export, naming it (a
 * temporary reference has no name to read).
 */
export function referenceText(reference: ServerReference): string {
  if (__DEV__) {
    if (reference.$$typeof === TEMPORARY_REFERENCE) {
      warnOnce(
        'rsc-temporary-ref-style',
        "A value a server action received from the client was interpolated into a server component's styles; the selector, at-rule, or declaration holding it was dropped. Interpolate values the server owns."
      );
    } else {
      // `name` is read only when the id names no export.
      const label =
        exportLabel(Reflect.get(reference, '$$id')) ||
        String(Reflect.get(reference, 'name') || 'unknown');

      warnOnce(
        'rsc-client-ref-style',
        `\`${label}\` is a 'use client' export, so a server component's styles cannot reference it, and the selector, at-rule, or declaration holding it was dropped. Define the styled component in a module without 'use client' so the server can read its class.`,
        label
      );
    }
  }

  return REFERENCE_MARKER;
}
