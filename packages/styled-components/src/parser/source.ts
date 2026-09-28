import type { RuleSet } from '../types';
import { CLOSE_BRACE, OPEN_BRACE, SEMICOLON } from '../utils/charCodes';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { normalize } from '../utils/normalize';
import { warnOnce } from '../utils/warnOnce';
import type { Root } from './ast';
import { parse, ParseOptions, scanQP, SlotEntry, SlotTable } from './parser';

/**
 * Pre-classified slot shape so the fast path skips typeof checks. Order
 * matches hot-path likelihood (`StatelessFn` first).
 *
 * - `StatelessFn`: `(p) => …`; call and coerce.
 * - `Static`: primitive baked at construction (`${10}px`); also styled-
 *   component refs (pre-stringified to `.${styledComponentId}`), and slots
 *   the parse removed (written inside a comment), baked to `''`.
 * - `General`: arrays, plain objects, functions of two or more parameters,
 *   class components; resolved by shape on every fill.
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
    let kind = InterpolationKind.Static;
    let text = '';
    if (t === 'string') {
      text = slot as string;
    } else if (t === 'number') {
      text = String(slot);
    } else if (slot !== null && slot !== undefined && t !== 'boolean') {
      if (
        (t === 'function' || t === 'object') &&
        (slot as { styledComponentId?: string }).styledComponentId !== undefined
      ) {
        // Styled-component ref: pre-stringify the class selector and dispatch as Static.
        text = '.' + (slot as { styledComponentId: string }).styledComponentId;
      } else if (t === 'object' && KEYFRAMES_SYMBOL in (slot as object)) {
        // Keyframes ref: hash + sheet registration deferred to fill time.
        kind = InterpolationKind.Keyframes;
      } else if (isCssProduct(slot)) {
        // `css\`...\`` fragment ref; the child's Source is lazy-parsed at fill time.
        kind = InterpolationKind.Fragment;
        if (isBlockLikeFragment(slot as RulesWithSlot)) {
          if (recover === null) recover = falseFlags(n);
          recover[i] = true;
        }
      } else if (isClientReference(slot)) {
        // Client reference proxies throw when invoked from a server component.
        // Classify as Static-empty so the rest of the template renders.
        if (clientRefs === null) clientRefs = falseFlags(n);
        clientRefs[i] = true;
      } else if (
        t === 'function' &&
        (slot as Function).length <= 1 &&
        !(slot as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent
      ) {
        kind = InterpolationKind.StatelessFn;
      } else {
        kind = InterpolationKind.General;
      }
    }
    kinds.push(kind);
    staticValues.push(text);
  }

  let joined = strings[0] || '';
  for (let i = 1; i < strings.length; i++) joined += '\0S' + (i - 1) + '\0' + (strings[i] || '');

  const entries: Array<SlotEntry | null> = [];
  for (let i = 0; i < n; i++) entries.push(null);
  const standalone = falseFlags(n);
  const slots: SlotTable = { clientRefs, entries, recover, standalone };
  const ast = parse(normalize(joined), { ...options, slots, templates: true });

  for (let i = 0; i < n; i++) {
    if (entries[i] === null) {
      // Removed by the parse (inside a comment, or in a dropped statement):
      // never called, compiled, or injected.
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = '';
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
    slotIsStandalone: standalone,
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
 * Whether a `css\`\`` fragment's source holds an unescaped `;`, `{`, or `}`
 * outside comments, strings, and parentheses, so it cannot be only a value.
 * Such a fragment, interpolated directly, ends a declaration missing its `;`.
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
  const blockLike = scanQP(css, 0, css.length, SEMICOLON, OPEN_BRACE, CLOSE_BRACE, -1) < css.length;
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
