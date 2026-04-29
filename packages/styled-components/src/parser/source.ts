import {
  AMPERSAND,
  ASTERISK,
  CLOSE_BRACE,
  COLON,
  CR,
  DOT,
  GT,
  HASH,
  LF,
  OPEN_BRACE,
  OPEN_BRACKET,
  PLUS,
  SEMICOLON,
  SPACE,
  TAB,
  TILDE,
} from '../utils/charCodes';
import type { RuleSet } from '../types';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { preprocessCSS } from '../utils/preprocessCSS';
import { NodeKind, Root } from './ast';
import { parse, ParseOptions } from './parser';

/**
 * Pre-classified slot shape so the fast path skips typeof checks. Order
 * matches hot-path likelihood (`StatelessFn` first).
 *
 * - `StatelessFn` — `(p) => …`; call and coerce.
 * - `Static` — primitive baked at construction (`${10}px`); also styled-
 *   component refs (pre-stringified to `.${styledComponentId}`).
 * - `General` — arrays, plain objects, complex functions; full walk,
 *   bail on shapes the fast emitter doesn't cover.
 * - `Keyframes` — `${kf}` ref; resolved at fill time against the active
 *   sheet/compiler since the hashed name varies per StyleSheetManager.
 * - `Fragment` — `${mixin}` ref; resolved recursively into FastPathFragment.
 */
export const enum InterpolationKind {
  StatelessFn = 1,
  Static = 2,
  General = 3,
  Keyframes = 4,
  Fragment = 5,
}

/**
 * Frozen, parsed tagged-template. Constructed once per `styled()` call
 * (lazily, on first render) and reused across every subsequent render.
 *
 * `ast` carries `\0J<n>\0` block-position sentinels lifted to
 * `InterpolationNode`s and `\0I<n>\0` embedded sentinels inside value/
 * selector strings for fill-time substitution. `strings` is retained so the
 * render-time fill can rebuild a hash-compatible CSS string.
 * `kinds`/`staticValues` are parallel to `interpolations` for fast dispatch.
 */
export interface Source {
  ast: Root;
  strings: ReadonlyArray<string>;
  interpolations: ReadonlyArray<unknown>;
  kinds: ReadonlyArray<InterpolationKind>;
  staticValues: ReadonlyArray<string>;
  /** `true` for block-position (lifted to `InterpolationNode`), `false` for embedded. */
  slotIsStandalone: ReadonlyArray<boolean>;
}

/**
 * Two sentinel kinds, classified by the slot's surrounding text:
 *
 * - `\0J<n>\0` standalone: at a CSS statement boundary; lifted to an
 *   `InterpolationNode` and spliced as siblings at fill time.
 * - `\0I<n>\0` embedded: inside a value/selector/prelude; preserved in
 *   the string and substituted in-place at fill time.
 */
const CLIENT_REFERENCE = Symbol.for('react.client.reference');

interface ClientReferenceShape {
  $$typeof: symbol;
  $$id?: string;
  name?: string;
}

function warnClientReference(ref: unknown): void {
  const r = ref as ClientReferenceShape;
  const id = r.$$id;
  const label = (id && id.includes('#') ? id.split('#').pop() : id) || r.name || 'unknown';
  console.warn(
    'Interpolating a client component (' +
      label +
      ') as a selector is not supported in server components. The component selector pattern' +
      " requires access to the component's internal class name, which is not available across" +
      ' the server/client boundary. Use a plain CSS class selector instead.'
  );
}

export function parseSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  options?: ParseOptions
): Source {
  const css = interleaveWithSentinels(strings, interpolations.length);
  const preprocessed = preprocessCSS(css);
  const ast = parse(preprocessed, options);
  const n = interpolations.length;
  const kinds: InterpolationKind[] = new Array(n);
  const staticValues: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const slot = interpolations[i];
    const t = typeof slot;
    if (t === 'string') {
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = slot as string;
    } else if (t === 'number') {
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = String(slot);
    } else if (slot === null || slot === undefined || slot === false) {
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = '';
    } else if (
      (t === 'function' || t === 'object') &&
      (slot as { styledComponentId?: string }).styledComponentId !== undefined
    ) {
      // Styled-component ref: pre-stringify the class selector and dispatch as Static.
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = '.' + (slot as { styledComponentId: string }).styledComponentId;
    } else if (t === 'object' && KEYFRAMES_SYMBOL in (slot as object)) {
      // Keyframes ref: hash + sheet registration deferred to fill time.
      kinds[i] = InterpolationKind.Keyframes;
      staticValues[i] = '';
    } else if (isCssProduct(slot)) {
      // `css\`...\`` fragment ref; the child's Source is lazy-parsed at fill time.
      kinds[i] = InterpolationKind.Fragment;
      staticValues[i] = '';
    } else if (
      (t === 'function' || t === 'object') &&
      (slot as { $$typeof?: symbol }).$$typeof === CLIENT_REFERENCE
    ) {
      // Client reference proxies throw when invoked from a server component.
      // Classify as Static-empty + dev warn so the rest of the template renders.
      if (process.env.NODE_ENV !== 'production') warnClientReference(slot);
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = '';
    } else if (t === 'function' && (slot as Function).length <= 1) {
      kinds[i] = InterpolationKind.StatelessFn;
      staticValues[i] = '';
    } else {
      kinds[i] = InterpolationKind.General;
      staticValues[i] = '';
    }
  }
  const slotIsStandalone: boolean[] = new Array(n);
  for (let i = 0; i < n; i++) slotIsStandalone[i] = false;
  markStandaloneSlots(ast, slotIsStandalone);
  return { ast, strings, interpolations, kinds, staticValues, slotIsStandalone };
}

function markStandaloneSlots(nodes: Root, out: boolean[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind === NodeKind.Interpolation) {
      out[node.index] = true;
    } else if (node.kind === NodeKind.Rule) {
      markStandaloneSlots(node.children, out);
    } else if (node.kind === NodeKind.AtRule) {
      if (node.children !== null) markStandaloneSlots(node.children, out);
    }
  }
}

/**
 * Lazily-built `Source` per `RuleSet`. WeakMap-keyed so freed components
 * release their AST. Slot shape `[strings, interpolations, source]` is
 * monomorphic in both pre- and post-parse states (~23% cheaper at
 * construction than an object shape per microbench); inputs are zeroed
 * after parse since `source.strings` / `.interpolations` carry them forward.
 */
type SourceSlot = [
  strings: ReadonlyArray<string> | null,
  interpolations: ReadonlyArray<unknown> | null,
  source: Source | null,
];

const sourceSlots = new WeakMap<RuleSet<any>, SourceSlot>();

/**
 * Record a `RuleSet`'s template inputs. The `Source` is lazily produced on
 * first `getSource(rules)` call. Used by the `css\`...\`` constructor.
 */
export function attachSourceInputs<T extends RuleSet<any>>(
  rules: T,
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): T {
  sourceSlots.set(rules, [strings, interpolations, null]);
  return rules;
}

/** Membership test: was this Array produced by the `css(...)` helper? */
export function isCssProduct(arr: unknown): boolean {
  return Array.isArray(arr) && sourceSlots.has(arr as RuleSet<any>);
}

/** Read the `Source` for a `RuleSet`, parsing on demand. */
export function getSource(rules: RuleSet<any>): Source | undefined {
  const slot = sourceSlots.get(rules);
  if (slot === undefined) return undefined;
  if (slot[2] !== null) return slot[2];
  const source = parseSource(slot[0]!, slot[1]!);
  slot[0] = null;
  slot[1] = null;
  slot[2] = source;
  return source;
}

/**
 * Synthesize a Source for a RuleSet built outside `css(...)`. Walks the
 * array, accumulating string chunks into template parts and lifting non-
 * string entries to interpolation slots. Idempotent: returns `false` when
 * a Source is already attached.
 */
export function synthesizeSourceForRuleSet(rules: RuleSet<any>): boolean {
  if (sourceSlots.has(rules)) return false;
  const strings: string[] = [];
  const interpolations: unknown[] = [];
  let pending = '';
  const pushSlot = (slot: unknown): void => {
    strings.push(pending);
    pending = '';
    interpolations.push(slot);
  };
  const walk = (arr: ReadonlyArray<unknown>): void => {
    for (let i = 0; i < arr.length; i++) {
      const chunk = arr[i];
      if (chunk === undefined || chunk === null || chunk === false || chunk === '') continue;
      if (typeof chunk === 'string') {
        pending += chunk;
      } else if (Array.isArray(chunk)) {
        walk(chunk);
      } else {
        pushSlot(chunk);
      }
    }
  };
  walk(rules);
  strings.push(pending);
  attachSourceInputs(rules, strings, interpolations);
  return true;
}

/**
 * Concatenate two RuleSets' Source inputs into one combined template.
 * Used by `styled(Base)\`...\`` extension on native. The seam between the
 * two arrays joins as a single CSS chunk (no slot bridges them).
 */
export function concatSourceInputs(
  combinedRules: RuleSet<any>,
  baseRules: RuleSet<any>,
  extensionRules: RuleSet<any>
): RuleSet<any> {
  const baseSlot = sourceSlots.get(baseRules);
  const extSlot = sourceSlots.get(extensionRules);
  if (baseSlot === undefined || extSlot === undefined) return combinedRules;
  const baseStrings = baseSlot[2] !== null ? baseSlot[2].strings : baseSlot[0]!;
  const baseInterpolations = baseSlot[2] !== null ? baseSlot[2].interpolations : baseSlot[1]!;
  const extStrings = extSlot[2] !== null ? extSlot[2].strings : extSlot[0]!;
  const extInterpolations = extSlot[2] !== null ? extSlot[2].interpolations : extSlot[1]!;
  // Seam: last string of base + first string of extension joins as one
  // CSS chunk. The slots in between stay positionally addressable because
  // the resulting string array still satisfies
  // `strings.length === interpolations.length + 1`.
  const combinedStrings: string[] = [];
  for (let i = 0; i < baseStrings.length - 1; i++) combinedStrings.push(baseStrings[i]);
  combinedStrings.push((baseStrings[baseStrings.length - 1] || '') + (extStrings[0] || ''));
  for (let i = 1; i < extStrings.length; i++) combinedStrings.push(extStrings[i]);
  const combinedInterpolations: unknown[] = [];
  for (let i = 0; i < baseInterpolations.length; i++) {
    combinedInterpolations.push(baseInterpolations[i]);
  }
  for (let i = 0; i < extInterpolations.length; i++) {
    combinedInterpolations.push(extInterpolations[i]);
  }
  attachSourceInputs(combinedRules, combinedStrings, combinedInterpolations);
  return combinedRules;
}

function interleaveWithSentinels(strings: ReadonlyArray<string>, count: number): string {
  if (count === 0) return strings.length > 0 ? strings[0] : '';

  let prevWasStandalone = true; // start of input is a statement boundary
  let out = strings[0] || '';
  for (let i = 0; i < count; i++) {
    const prefix = strings[i] || '';
    const suffix = strings[i + 1] || '';
    const standalone = isStandaloneSlot(prefix, suffix, prevWasStandalone);
    out += standalone ? '\0J' : '\0I';
    out += i;
    out += '\0';
    out += suffix;
    prevWasStandalone = standalone;
  }
  return out;
}

/**
 * Decide whether a `${...}` slot is at a CSS statement boundary. Returns
 * `true` for standalone (block-position; the parser lifts to an
 * `InterpolationNode` sibling of Decl/Rule/AtRule, sentinel `\0J`) and
 * `false` for embedded (sentinel `\0I` rides inside a value/selector/
 * prelude string).
 *
 * - The immediate prefix's last non-whitespace character is the primary
 *   signal: `;` `{` `}` end a statement and put the next position at a
 *   boundary. Override: when the prefix ends in `{` but the suffix starts
 *   with `:`, the slot is at a property-name spot inside a Decl
 *   (`${vars.bg}: value;`); stay embedded.
 * - When the prefix is empty or whitespace-only, the previous slot's
 *   classification carries through. This is what makes `${a} ${b}` produce
 *   two standalone Interpolation nodes (the space between them is whitespace
 *   only, so context is inherited from `${a}`'s standalone classification).
 * - The suffix is consulted only when both the prefix is empty/whitespace
 *   AND the previous slot was embedded; the suffix's first non-whitespace
 *   then breaks the inherited context if it's a statement terminator.
 */
function isStandaloneSlot(prefix: string, suffix: string, prevWasStandalone: boolean): boolean {
  const last = lastNonWhitespaceCharCode(prefix);
  if (last === SEMICOLON || last === OPEN_BRACE || last === CLOSE_BRACE) {
    // Block-position by prefix (`;` `{` `}`), but check if the suffix puts
    // the slot at a property-name spot (`${vars.bg}: value;`) inside a
    // Decl. A leading `:` in the suffix means the slot is the property
    // name; stay embedded so substitute() resolves it without lifting an
    // InterpolationNode that the parser would classify as block.
    const nextAfterPrefixBoundary = firstNonWhitespaceCharCode(suffix);
    if (nextAfterPrefixBoundary === COLON) return false;
    return true;
  }
  if (last !== -1) return false;
  // Prefix is empty/whitespace; the slot inherits its parent context from
  // the previous slot. An embedded inheritance never flips: a `;` after the
  // slot terminates the surrounding decl, not this slot's value position
  // (e.g. `padding: ${a} ${b};` keeps `${b}` embedded in the value). A
  // standalone inheritance can be flipped to embedded when the suffix
  // starts a selector continuation (`&`, `.`, etc.) or `{`.
  if (!prevWasStandalone) return false;
  const next = firstNonWhitespaceCharCode(suffix);
  if (next === -1) return prevWasStandalone;
  if (isSelectorContinuationChar(next) || next === OPEN_BRACE) return false;
  return true;
}

function isSelectorContinuationChar(code: number): boolean {
  return (
    code === AMPERSAND ||
    code === DOT ||
    code === HASH ||
    code === OPEN_BRACKET ||
    code === GT ||
    code === PLUS ||
    code === TILDE ||
    code === ASTERISK ||
    code === COLON
  );
}

function lastNonWhitespaceCharCode(s: string): number {
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.charCodeAt(i);
    if (c !== SPACE && c !== TAB && c !== LF && c !== CR) return c;
  }
  return -1;
}

function firstNonWhitespaceCharCode(s: string): number {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c !== SPACE && c !== TAB && c !== LF && c !== CR) return c;
  }
  return -1;
}
