import {
  CLOSE_BRACE,
  CLOSE_PAREN,
  DOUBLE_QUOTE,
  OPEN_BRACE,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
} from '../utils/charCodes';
import type { RuleSet } from '../types';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { isEscaped, normalize } from '../utils/normalize';
import { warnOnce } from '../utils/warnOnce';
import { DYN, Node, NodeKind, Root, SlotHead, TemplateValue } from './ast';
import { parse, ParseOptions, SlotEntry, SlotTable } from './parser';

/**
 * Pre-classified slot shape so the fast path skips typeof checks. Order
 * matches hot-path likelihood (`StatelessFn` first).
 *
 * - `StatelessFn`: `(p) => …`; call and coerce.
 * - `Static`: primitive baked at construction (`${10}px`); also styled-
 *   component refs (pre-stringified to `.${styledComponentId}`), and slots
 *   the parse removed (written inside a comment), baked to `''`.
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
 * Standalone slots become `InterpolationNode`s in the AST, head slots ride
 * on their rule or frame, and slots inside a value/selector string become
 * `TemplateValue` fields. `kinds`/`staticValues` are parallel to
 * `interpolations` for fast dispatch.
 */
export interface Source {
  ast: Root;
  strings: ReadonlyArray<string>;
  interpolations: ReadonlyArray<unknown>;
  kinds: ReadonlyArray<InterpolationKind>;
  staticValues: ReadonlyArray<string>;
  /** `true` for slots whose value splices as statements (standalone and head slots). */
  slotIsStandalone: ReadonlyArray<boolean>;
  /** Tokenizer state at each slot's position; `null` for a slot the parse removed. */
  slotEntries: ReadonlyArray<SlotEntry | null>;
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

/** Whether `value` is a React client reference proxy. */
function isClientReference(value: unknown): boolean {
  const t = typeof value;
  return (
    (t === 'function' || (t === 'object' && value !== null)) &&
    (value as { $$typeof?: symbol }).$$typeof === CLIENT_REFERENCE
  );
}

/**
 * Join the template strings around `\0S<n>\0` slot markers, normalize once
 * (removing comments, and any slot written inside one), and parse. The
 * parser assigns every slot its role in that one reading.
 */
export function parseSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  options?: ParseOptions
): Source {
  const n = interpolations.length;
  if (n === 0) {
    return {
      ast: parse(normalize(strings.length > 0 ? strings[0] : ''), options),
      strings,
      interpolations,
      kinds: EMPTY,
      staticValues: EMPTY,
      slotIsStandalone: EMPTY,
      slotEntries: EMPTY,
    };
  }

  const kinds: InterpolationKind[] = [];
  const staticValues: string[] = [];
  let recover: boolean[] | null = null;
  let clientRefs: boolean[] | null = null;
  for (let i = 0; i < n; i++) {
    const slot = interpolations[i];
    const t = typeof slot;
    if (t === 'string') {
      kinds.push(InterpolationKind.Static);
      staticValues.push(slot as string);
    } else if (t === 'number') {
      kinds.push(InterpolationKind.Static);
      staticValues.push(String(slot));
    } else if (slot === null || slot === undefined || slot === false) {
      kinds.push(InterpolationKind.Static);
      staticValues.push('');
    } else if (
      (t === 'function' || t === 'object') &&
      (slot as { styledComponentId?: string }).styledComponentId !== undefined
    ) {
      // Styled-component ref: pre-stringify the class selector and dispatch as Static.
      kinds.push(InterpolationKind.Static);
      staticValues.push('.' + (slot as { styledComponentId: string }).styledComponentId);
    } else if (t === 'object' && KEYFRAMES_SYMBOL in (slot as object)) {
      // Keyframes ref: hash + sheet registration deferred to fill time.
      kinds.push(InterpolationKind.Keyframes);
      staticValues.push('');
    } else if (isCssProduct(slot)) {
      // `css\`...\`` fragment ref; the child's Source is lazy-parsed at fill time.
      kinds.push(InterpolationKind.Fragment);
      staticValues.push('');
      if (isBlockLikeFragment(slot as RulesWithSlot)) {
        if (recover === null) recover = falseFlags(n);
        recover[i] = true;
      }
    } else if (isClientReference(slot)) {
      // Client reference proxies throw when invoked from a server component.
      // Classify as Static-empty so the rest of the template renders.
      if (clientRefs === null) clientRefs = falseFlags(n);
      clientRefs[i] = true;
      kinds.push(InterpolationKind.Static);
      staticValues.push('');
    } else if (t === 'function' && (slot as Function).length <= 1) {
      kinds.push(InterpolationKind.StatelessFn);
      staticValues.push('');
    } else {
      kinds.push(InterpolationKind.General);
      staticValues.push('');
    }
  }

  let joined = strings[0] || '';
  for (let i = 1; i < strings.length; i++) joined += '\0S' + (i - 1) + '\0' + (strings[i] || '');

  const entries: Array<SlotEntry | null> = [];
  for (let i = 0; i < n; i++) entries.push(null);
  const slots: SlotTable = { entries, recover };
  const ast = parse(normalize(joined), { ...options, slots, templates: true });
  const marks: SlotMarks = { clientRefs, live: falseFlags(n), standalone: falseFlags(n) };
  markDynamic(ast, marks);

  for (let i = 0; i < n; i++) {
    if (!marks.live[i]) {
      // Removed by the parse (inside a comment, or in a dropped statement):
      // never called, compiled, or injected.
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = '';
      entries[i] = null;
    } else if (__DEV__ && clientRefs !== null && clientRefs[i]) {
      warnClientReference(interpolations[i]);
    }
  }
  return {
    ast,
    strings,
    interpolations,
    kinds,
    staticValues,
    slotIsStandalone: marks.standalone,
    slotEntries: entries,
  };
}

const EMPTY: never[] = [];

/** A packed array of `n` `false` values. */
function falseFlags(n: number): boolean[] {
  const flags: boolean[] = [];
  for (let i = 0; i < n; i++) flags.push(false);
  return flags;
}

/** Mark every slot of a field live; `true` when the field holds any. */
function markField(field: string | TemplateValue, live: boolean[]): boolean {
  if (typeof field === 'string') return false;
  for (let i = 0; i < field.slots.length; i++) live[field.slots[i]] = true;
  return true;
}

function markSplice(slot: number, marks: SlotMarks): void {
  marks.standalone[slot] = true;
  marks.live[slot] = true;
}

function markHead(head: SlotHead, marks: SlotMarks): void {
  for (let i = 0; i < head.slots.length; i++) {
    const slot = head.slots[i];
    marks.standalone[slot] = true;
    marks.live[slot] = true;
    if (marks.clientRefs !== null && marks.clientRefs[slot]) head.unresolved = true;
  }
  markField(head.rest, marks.live);
}

/** What the walk records per slot, parallel to the interpolations. */
interface SlotMarks {
  /** Slots whose value is a client reference; `null` when there are none. */
  clientRefs: ReadonlyArray<boolean> | null;
  live: boolean[];
  standalone: boolean[];
}

/**
 * Walk the AST once. Tags every node whose own fields or descendants carry
 * a slot ({@link TemplateValue} field, head, or InterpolationNode) with
 * `node[DYN] = true` (absence is the static encoding), records which slots
 * splice as statements (standalone and head slots), and which slots appear
 * anywhere at all.
 *
 * `dynamic(node)` in `compile.ts` reads the flag via a single property
 * access; descendants don't need to be re-walked because the flag bubbles
 * up here. Native classifications for Rule / AtRule nodes are stamped by
 * the parser at construction time and ride through here untouched.
 */
function markDynamic(nodes: ReadonlyArray<Node>, marks: SlotMarks): boolean {
  const live = marks.live;
  let any = false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let dyn = false;
    switch (node.kind) {
      case NodeKind.Decl:
        if (markField(node.prop, live)) dyn = true;
        if (markField(node.value, live)) dyn = true;
        break;
      case NodeKind.Rule: {
        for (let j = 0; j < node.selectors.length; j++) {
          if (markField(node.selectors[j], live)) dyn = true;
        }
        // A head resolves from its slot values on every fill, even when the
        // text after it is static.
        if (node.head !== undefined) {
          markHead(node.head, marks);
          dyn = true;
        }
        if (markDynamic(node.children, marks)) dyn = true;
        break;
      }
      case NodeKind.AtRule: {
        if (markField(node.name, live)) dyn = true;
        if (markField(node.prelude, live)) dyn = true;
        if (node.children !== null && markDynamic(node.children, marks)) dyn = true;
        break;
      }
      case NodeKind.Keyframes: {
        if (markField(node.name, live)) dyn = true;
        if (markField(node.prelude, live)) dyn = true;
        for (let f = 0; f < node.frames.length; f++) {
          const frame = node.frames[f];
          if ('kind' in frame) {
            markSplice(frame.index, marks);
            dyn = true;
            continue;
          }
          if (frame.head !== undefined) {
            markHead(frame.head, marks);
            dyn = true;
          }
          for (let s = 0; s < frame.stops.length; s++) {
            if (markField(frame.stops[s], live)) dyn = true;
          }
          for (let d = 0; d < frame.children.length; d++) {
            const child = frame.children[d];
            if (child.kind === NodeKind.Interpolation) {
              markSplice(child.index, marks);
              dyn = true;
            } else {
              if (markField(child.prop, live)) dyn = true;
              if (markField(child.value, live)) dyn = true;
            }
          }
        }
        break;
      }
      case NodeKind.Interpolation:
        markSplice(node.index, marks);
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
 * states; the parsed `Source` holds the same input arrays by reference.
 */
type SourceSlot = [
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  source: Source | null,
];

/** Module-private symbol; users cannot reach it without
 *  `Object.getOwnPropertySymbols`, so the slot is invisible to typical
 *  consumers (iteration, spread, JSON, for..in). */
const SOURCE_SLOT: unique symbol = Symbol('sc.source');
/** Memoizes `isBlockLikeFragment`'s scan of the fragment's source strings.
 *  A `css\`\`` product reused across many outer templates only needs the
 *  scan once. */
const BLOCK_LIKE: unique symbol = Symbol('sc.blocklike');

type RulesWithSlot = ReadonlyArray<unknown> & {
  [SOURCE_SLOT]?: SourceSlot;
  [BLOCK_LIKE]?: boolean;
};

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
  const source = parseSource(slot[0], slot[1]);
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
  const baseStrings = baseSlot[0];
  const baseInterpolations = baseSlot[1];
  const extStrings = extSlot[0];
  const extInterpolations = extSlot[1];
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

/**
 * Whether a `css\`\`` fragment's source holds `;`, `{`, or `}` outside
 * comments, strings, and parentheses, so it cannot be only a value. Such a
 * fragment, interpolated directly, ends a declaration missing its `;`.
 */
function isBlockLikeFragment(rules: RulesWithSlot): boolean {
  const cached = rules[BLOCK_LIKE];
  if (cached !== undefined) return cached;
  const slot = rules[SOURCE_SLOT];
  if (slot === undefined) return false;
  // NUL stands in for each of the fragment's own slots: it is not a quote,
  // parenthesis, or comment character, so the scan reads the text around a
  // slot as the parser will.
  const css = normalize(slot[0].join('\0'), false);
  let blockLike = false;
  let quote = 0;
  let parenDepth = 0;
  for (let j = 0; j < css.length; j++) {
    const c = css.charCodeAt(j);
    if (quote !== 0) {
      if (c === quote && !isEscaped(css, j)) quote = 0;
    } else if ((c === DOUBLE_QUOTE || c === SINGLE_QUOTE) && !isEscaped(css, j)) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      parenDepth++;
    } else if (c === CLOSE_PAREN) {
      if (parenDepth > 0) parenDepth--;
    } else if (parenDepth === 0 && (c === SEMICOLON || c === OPEN_BRACE || c === CLOSE_BRACE)) {
      blockLike = true;
      break;
    }
  }
  // Non-enumerable so the cached flag stays invisible to `toEqual` /
  // `Object.keys` / JSON walks, matching the documented pattern used by
  // {@link DYN} and the parser's NATIVE_RULE_CLASS / NATIVE_AT_CLASS
  // symbol slots.
  Object.defineProperty(rules, BLOCK_LIKE, {
    value: blockLike,
    enumerable: false,
    configurable: true,
  });
  return blockLike;
}
