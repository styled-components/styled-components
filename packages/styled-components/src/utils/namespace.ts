import {
  PSEUDO_ELEMENT,
  scanQPB,
  splitTopLevelCommas,
  staysOneField,
  STOP_COLON,
  STOP_COMBINATOR,
  STOP_COMMA,
  STOP_FIELD,
  STOP_RBRACKET,
  STOP_RPAREN,
  STOP_WS,
  trimRange,
} from '../parser/parser';
import * as $ from './charCodes';
import type { SelectorTransform } from './compiler';

/** A namespace as `createNamespaceTransform` writes it; a compiler derives it once, since it fixes its namespace. */
export interface NamespaceForm {
  /** The namespace joined onto a root name: '' when it cannot be joined onto a compound. */
  join: string;
  /** The namespace and a descendant combinator; '' when the namespace is not one field and drops every rule. */
  prefix: string;
}

/**
 * A document-level view-transition pseudo, with or without the universal selector. Else `html` or
 * `:root` as a whole name: no name character, escape or `|` (a namespace bar) after it.
 */
const ROOT_ITEM = /\*?::view-transition|(?:html|:root)(?![\w\\|-]|[^\0-\x7f])/iy;

/**
 * A hex escape (`\31`) closing the text, after an even run of backslashes so `\\31` is not one.
 * The escape takes one whitespace after its digits as its end, so text written right after it
 * would read as part of the code point, or lose its meaning (a space meant as a combinator).
 * Linear: inside a backslash run only the character before the run can start a match.
 */
const TRAILING_HEX_ESCAPE = /(?:^|[^\\])(?:\\\\)*\\[\da-f]{1,6}$/i;

/** The form of `namespace` for `createNamespaceTransform`, or `undefined` when blank. */
export function namespaceForm(namespace: string): NamespaceForm | undefined {
  const trimmed = trimRange(namespace);
  if (trimmed === '') return undefined;

  const compound = isOneCompound(trimmed);
  if (!compound && !staysOneField(trimmed)) return { join: '', prefix: '' };

  // Trimming removed the whitespace that ends a trailing hex escape.
  const written = TRAILING_HEX_ESCAPE.test(trimmed) ? trimmed + ' ' : trimmed;
  return { join: compound ? written : '', prefix: written + ' ' };
}

/**
 * Whether the trimmed namespace is one closed compound without a pseudo-element. The scan stops at
 * a top-level byte only, and a colon's end restarts it with no state to carry, so every character
 * is read once.
 */
function isOneCompound(trimmed: string): boolean {
  const first = trimmed.charCodeAt(0);
  if (first !== $.HASH && first !== $.DOT && first !== $.OPEN_BRACKET && first !== $.COLON) {
    return false;
  }

  const len = trimmed.length;
  let stop = len;
  for (
    let from = 0;
    (stop = scanQPB(
      trimmed,
      from,
      len,
      STOP_COLON | STOP_WS | STOP_COMMA | STOP_COMBINATOR | STOP_FIELD | STOP_RPAREN | STOP_RBRACKET
    )) < len;
    from = stop + 1
  ) {
    if (trimmed.charCodeAt(stop) !== $.COLON) return false;

    PSEUDO_ELEMENT.lastIndex = stop;
    if (PSEUDO_ELEMENT.test(trimmed)) return false;
  }
  return stop === len;
}

/**
 * The item with the namespace written for the root it names, else the item behind the prefix.
 * `ROOT_ITEM.lastIndex` is 0 between calls: a miss resets it, and a hit's end is read, then cleared.
 */
function prefixItem(item: string, namespace: NamespaceForm): string {
  const { join } = namespace;
  const first = item.charCodeAt(0);
  const mayBeRoot =
    join !== '' &&
    ((first | $.UPPER_TO_LOWER) === $.LOWER_H || first === $.COLON || first === $.ASTERISK);
  if (!mayBeRoot || !ROOT_ITEM.test(item)) return namespace.prefix + item;

  const nameEnd = ROOT_ITEM.lastIndex;
  ROOT_ITEM.lastIndex = 0;
  if (first === $.ASTERISK || item.charCodeAt(1) === $.COLON) {
    return ':is(' + join + ',' + join + ' *)' + item.substring(first === $.ASTERISK ? 1 : 0);
  }

  return item.substring(0, nameEnd) + join + item.substring(nameEnd);
}

/**
 * A selector transform that writes the namespace into every emitted rule head after `&`
 * resolution, ahead of any plugin rewrite. Each top-level comma-separated item is placed by
 * `prefixItem` (rules in docs/namespace.md "Placement model", rows in `emit-web.test.ts`);
 * commas inside `:is()`, `[attr]` and strings stay. Keyframes and declaration-body at-rules
 * never reach a selector transform, so they take no namespace.
 */
export function createNamespaceTransform(form: NamespaceForm): SelectorTransform {
  if (form.prefix === '') return () => [];

  return selector => {
    if (selector.indexOf(',') === -1) return prefixItem(selector, form);

    const parts = splitTopLevelCommas(selector);
    for (let i = 0; i < parts.length; i++) parts[i] = prefixItem(parts[i], form);
    return parts.join(',');
  };
}
