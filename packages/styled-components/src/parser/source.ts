import {
  AMPERSAND,
  ASTERISK,
  CLOSE_BRACE,
  COLON,
  DOT,
  GT,
  HASH,
  isWS,
  OPEN_BRACE,
  OPEN_BRACKET,
  PLUS,
  SEMICOLON,
  TILDE,
} from '../utils/charCodes';
import type { RuleSet } from '../types';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { normalize } from '../utils/normalize';
import { warnOnce } from '../utils/warnOnce';
import { DYN, Node, NodeKind, Root } from './ast';
import { parse, ParseOptions } from './parser';

/**
 * Pre-classified slot shape so the fast path skips typeof checks. Order
 * matches hot-path likelihood (`StatelessFn` first).
 *
 * - `StatelessFn`: `(p) => …`; call and coerce.
 * - `Static`: primitive baked at construction (`${10}px`); also styled-
 *   component refs (pre-stringified to `.${styledComponentId}`).
 * - `General`: arrays, plain objects, complex functions; full walk,
 *   bail on shapes the fast emitter doesn't cover.
 * - `Keyframes`: `${kf}` ref; resolved at fill time against the active
 *   sheet/compiler since the hashed name varies per StyleSheetManager.
 * - `Fragment`: `${mixin}` ref; resolved recursively into FastPathFragment.
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
 * Standalone interpolation slots become `InterpolationNode`s in the AST;
 * embedded slots inside value/selector strings become `TemplateValue`
 * fields. `kinds`/`staticValues` are parallel to `interpolations` for
 * fast dispatch.
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

export const CLIENT_REFERENCE = Symbol.for('react.client.reference');

interface ClientReferenceShape {
  $$typeof: symbol;
  $$id?: string;
  name?: string;
}

function warnClientReference(ref: unknown): void {
  if (!__DEV__) return;
  const r = ref as ClientReferenceShape;
  const id = r.$$id;
  const label = (id && id.includes('#') ? id.split('#').pop() : id) || r.name || 'unknown';
  warnOnce(
    'rsc-client-ref-selector',
    `interpolating a client component (${label}) as a selector is not supported in server components. The component selector pattern requires access to the component's internal class name, which is not available across the server/client boundary. Use a plain CSS class selector instead.`,
    label
  );
}

/**
 * Two sentinel kinds, classified by the slot's surrounding text:
 *
 * - `\0J<n>\0` standalone: at a CSS statement boundary; lifted to an
 *   `InterpolationNode` and spliced as siblings at fill time.
 * - `\0I<n>\0` embedded: inside a value/selector/prelude; preserved in
 *   the string and substituted in-place at fill time.
 */
export function parseSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  options?: ParseOptions
): Source {
  const css = interleaveWithSentinels(strings, interpolations.length);
  const preprocessed = normalize(css);
  // `templates: true` widens the parse() return type to
  // `Root<string | TemplateValue>` since `interleaveWithSentinels` may
  // have emitted `\0I` slots that `templateOrString` will turn into
  // TemplateValue fields. The runtime parser behavior is unchanged; the
  // flag is a type-system witness.
  const ast = parse(preprocessed, { ...options, templates: true });
  const n = interpolations.length;
  const kinds: InterpolationKind[] = [];
  const staticValues: string[] = [];
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
      if (__DEV__) warnClientReference(slot);
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
  const slotIsStandalone: boolean[] = [];
  for (let i = 0; i < n; i++) slotIsStandalone[i] = false;
  markStandaloneSlots(ast, slotIsStandalone);
  // Eagerly mark every node whose subtree depends on an interpolation slot
  // (`\0I` embedded in any string field, or an InterpolationNode descendant).
  // The flag rides on the node as a Symbol-keyed property so consumers do a
  // single hidden-class slot read per render-miss instead of a WeakMap probe.
  // Replaces the early-v7 lazy `interpolatedCache`. See `perf_cache_layout.md`.
  // Native classifications for Rule / AtRule nodes (`[NATIVE_RULE_CLASS]` /
  // `[NATIVE_AT_CLASS]`) are stamped by the parser at construction time
  // and ride through here untouched.
  markDynamic(ast);
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
 * Walk the AST once and tag every node whose own strings or descendants
 * carry a parse-time-resolved interpolation slot ({@link TemplateValue}
 * field, or an InterpolationNode descendant). Sets `node[DYN] = true` on
 * matched nodes; absence (`undefined`) is the static encoding.
 *
 * Phase C reduces the per-field check from `indexOf('\0I')` scans to a
 * single `typeof !== 'string'` test (TemplateValue fields are objects,
 * static fields are strings). The parser converted sentinel-bearing
 * strings to TemplateValue at construction time so this walk is the
 * subtree-aggregating pass only.
 *
 * `dynamic(node)` in `compile.ts` reads the flag via a single property
 * access; descendants don't need to be re-walked because the flag bubbles
 * up here.
 */
function markDynamic(nodes: Root): boolean {
  let any = false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let dyn = false;
    switch (node.kind) {
      case NodeKind.Decl:
        dyn = typeof node.prop !== 'string' || typeof node.value !== 'string';
        break;
      case NodeKind.Rule: {
        for (let j = 0; j < node.selectors.length; j++) {
          if (typeof node.selectors[j] !== 'string') {
            dyn = true;
            break;
          }
        }
        if (markDynamic(node.children) || dyn) dyn = true;
        break;
      }
      case NodeKind.AtRule: {
        if (typeof node.name !== 'string' || typeof node.prelude !== 'string') {
          dyn = true;
        }
        if (node.children !== null && markDynamic(node.children)) dyn = true;
        break;
      }
      case NodeKind.Keyframes: {
        if (typeof node.name !== 'string' || typeof node.prelude !== 'string') {
          dyn = true;
        } else {
          outer: for (let f = 0; f < node.frames.length; f++) {
            const frame = node.frames[f];
            for (let s = 0; s < frame.stops.length; s++) {
              if (typeof frame.stops[s] !== 'string') {
                dyn = true;
                break outer;
              }
            }
            for (let d = 0; d < frame.children.length; d++) {
              const decl = frame.children[d];
              if (typeof decl.prop !== 'string' || typeof decl.value !== 'string') {
                dyn = true;
                break outer;
              }
            }
          }
        }
        break;
      }
      case NodeKind.Interpolation:
        dyn = true;
        break;
    }
    if (dyn) {
      // Define non-enumerable so the flag is invisible to `toEqual`,
      // `JSON.stringify`, `Object.keys`, and `for..in`. Symbol-keyed +
      // non-enumerable is the only combination where Jest's `equals()`
      // (which calls both `Object.keys` and `Object.getOwnPropertySymbols`)
      // skips the property entirely. Write happens once per Source; read
      // happens per fillNode call, which V8 still inline-caches as a
      // single hidden-class slot load.
      Object.defineProperty(node, DYN, { value: true, enumerable: false, configurable: true });
      any = true;
    }
  }
  return any;
}

/**
 * Per-`RuleSet` template-input + lazy `Source` cache. Stored as a symbol-
 * keyed property on the rules array itself rather than via a `WeakMap`
 * entry: V8 adds a single hidden-class transition for the named slot and
 * skips the per-call weak-entry allocation, which dominates the previous
 * WeakMap path (~40x cheaper in microbench, same GC story because freeing
 * the rules array drops the symbol slot with it). Slot shape `[strings,
 * interpolations, source]` is monomorphic in both pre- and post-parse
 * states; the inputs are zeroed after parse since `source.strings` /
 * `.interpolations` carry them forward.
 */
type SourceSlot = [
  strings: ReadonlyArray<string> | null,
  interpolations: ReadonlyArray<unknown> | null,
  source: Source | null,
];

/** Module-private symbol; users cannot reach it without
 *  `Object.getOwnPropertySymbols`, so the slot is invisible to typical
 *  consumers (iteration, spread, JSON, for..in). */
const SOURCE_SLOT: unique symbol = Symbol('sc.source');

type RulesWithSlot = ReadonlyArray<unknown> & { [SOURCE_SLOT]?: SourceSlot };

/**
 * Record a `RuleSet`'s template inputs. The `Source` is lazily produced on
 * first `getSource(rules)` call. Used by the `css\`...\`` constructor.
 */
export function attachSourceInputs<T extends RuleSet<any>>(
  rules: T,
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): T {
  (rules as unknown as { [SOURCE_SLOT]: SourceSlot })[SOURCE_SLOT] = [
    strings,
    interpolations,
    null,
  ];
  return rules;
}

export function isCssProduct(arr: unknown): boolean {
  return Array.isArray(arr) && (arr as RulesWithSlot)[SOURCE_SLOT] !== undefined;
}

export function getSource(rules: RuleSet<any>): Source | undefined {
  const slot = (rules as unknown as RulesWithSlot)[SOURCE_SLOT];
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
  if ((rules as unknown as RulesWithSlot)[SOURCE_SLOT] !== undefined) return false;
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
  const baseSlot = (baseRules as unknown as RulesWithSlot)[SOURCE_SLOT];
  const extSlot = (extensionRules as unknown as RulesWithSlot)[SOURCE_SLOT];
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
  const last = nonWsCharCode(prefix, prefix.length - 1, -1);
  if (last === SEMICOLON || last === OPEN_BRACE || last === CLOSE_BRACE) {
    // Block-position by prefix (`;` `{` `}`). Two suffix overrides flip the
    // slot to embedded: a leading `:` puts the slot at a property-name spot
    // inside a Decl (`${vars.bg}: value;`); a leading selector-continuation
    // char or `{` puts the slot at the start of a selector
    // (`${Foo} & { ... }`, `${Foo} > & { ... }`, `${Foo} { ... }`).
    const nextAfterPrefixBoundary = nonWsCharCode(suffix, 0, 1);
    if (nextAfterPrefixBoundary === -1) return true;
    if (isSelectorContinuationChar(nextAfterPrefixBoundary)) return false;
    if (nextAfterPrefixBoundary === OPEN_BRACE) return false;
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
  const next = nonWsCharCode(suffix, 0, 1);
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

/**
 * Find the first non-whitespace char code walking from `start` by `step`
 * (+1 = forward scan from index 0; -1 = reverse scan from `s.length - 1`).
 * Returns -1 if the string is empty or only whitespace.
 */
function nonWsCharCode(s: string, start: number, step: number): number {
  const len = s.length;
  for (let i = start; i >= 0 && i < len; i += step) {
    const c = s.charCodeAt(i);
    if (!isWS(c)) return c;
  }
  return -1;
}
