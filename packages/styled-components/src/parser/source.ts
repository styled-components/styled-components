import type { RuleSet } from '../types';
import { fifoSet } from '../utils/fifoMap';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { warnOnce } from '../utils/warnOnce';
import type { Root } from './ast';
import { parse, ParseOptions, SlotTable } from './parser';
import { removeComments, replaceNul, scan, stops } from './reader';

/** A statement ends at `;`, `{`, or `}`. */
const STATEMENT_END = stops(';{}');

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
 * - `Unresolved`: a client reference, whose class name the server cannot
 *   read; never called or read at fill time.
 */
export const enum InterpolationKind {
  StatelessFn = 1,
  Static = 2,
  General = 3,
  Keyframes = 4,
  Fragment = 5,
  Unresolved = 6,
}

/**
 * Frozen, parsed tagged-template. Constructed once per `styled()` call
 * (lazily, on first render) and reused across every subsequent render.
 * Standalone slots become `InterpolationNode`s in the AST, head slots ride
 * on their rule or frame, and slots inside a value/selector string become
 * `TemplateValue` fields. `kinds`/`staticValues` are parallel to
 * `interpolations` for fast dispatch.
 *
 * `ast`, `slotIsStandalone`, and `id` come from the parse, which a shared
 * template reuses across every call of its call site (see
 * {@link attachTemplateInputs}); they are shared and never mutated.
 */
export interface Source {
  ast: Root;
  /**
   * Names the parse: positive and equal for every Source sharing one parse,
   * so it identifies the template text and slot roles; `0` for a parse owned
   * by this Source alone.
   */
  id: number;
  interpolations: ReadonlyArray<unknown>;
  kinds: ReadonlyArray<InterpolationKind>;
  /** `true` for slots whose value splices as statements (standalone and head slots). */
  slotIsStandalone: ReadonlyArray<boolean>;
  staticValues: ReadonlyArray<string>;
  strings: ReadonlyArray<string>;
}

/** What a parse yields: everything in a {@link Source} that depends only on the strings and the parse flags. */
interface TemplateParse {
  ast: Root;
  id: number;
  /** `false` for each slot the parse removed. */
  kept: ReadonlyArray<boolean>;
  standalone: ReadonlyArray<boolean>;
}

/**
 * Parses of each shared strings array, keyed by {@link flagKey}, prefixed
 * with `f` for a frame list. The slot
 * flags that shape a parse (missing-`;` recovery, client references) come
 * from the values, so each flag combination met at the call site has its own
 * parse; nearly every call site only has the unflagged one, keyed `''`.
 */
const sharedParses = new WeakMap<ReadonlyArray<string>, Map<string, TemplateParse>>();
/** Flag combinations kept per call site; a bound for values that vary without end. */
const FLAG_COMBINATION_LIMIT = 16;
let lastParseId = 0;

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
export function isClientReference(value: unknown): boolean {
  const t = typeof value;
  return (
    (t === 'function' || (t === 'object' && value !== null)) &&
    (value as { $$typeof?: symbol }).$$typeof === CLIENT_REFERENCE
  );
}

/** How {@link readSource} reads a template; a set of bits. */
const enum Read {
  /** Look the parse up by `strings` identity; the caller guarantees the array is never mutated. */
  Shared = 1,
  /** Read as a frame list, the block of a `@keyframes` rule. */
  Frames = 2,
}

/**
 * Classify each value and read the template: join the strings around
 * `\0S<n>\0` slot markers and parse (which removes comments, and any slot
 * written inside one). The parser assigns every slot its role in that one
 * reading. With `shared`, the parse is looked up by `strings`
 * identity and reused; the caller guarantees the array is never mutated.
 */
export function parseSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  shared: boolean = false
): Source {
  return readSource(strings, interpolations, shared ? Read.Shared : 0);
}

/**
 * {@link parseSource} for a `keyframes` template: the template is a frame
 * list, read with the roles of the block of a `@keyframes` rule.
 */
export function parseFrameList(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  shared: boolean
): Source {
  return readSource(strings, interpolations, shared ? Read.Shared | Read.Frames : Read.Frames);
}

/** `read` is a set of {@link Read} bits. */
function readSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  read: number
): Source {
  const n = interpolations.length;
  const kinds: InterpolationKind[] = n === 0 ? EMPTY : [];
  const staticValues: string[] = n === 0 ? EMPTY : [];
  let recover: boolean[] | null = null;
  let clientRefs: boolean[] | null = null;
  for (let i = 0; i < n; i++) {
    const slot = interpolations[i];
    const t = typeof slot;
    let kind = InterpolationKind.Static;
    let text = '';
    if (t === 'string') {
      text = replaceNul(slot as string);
    } else if (t === 'number') {
      text = String(slot);
    } else if (slot !== null && slot !== undefined && t !== 'boolean') {
      if (isClientReference(slot)) {
        // Checked first: a client reference proxy throws when called, and on
        // any property read other than its own markers.
        kind = InterpolationKind.Unresolved;
        if (clientRefs === null) clientRefs = falseFlags(n);
        clientRefs[i] = true;
      } else if (
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

  // A mismatched count cannot come from a tagged template; it gets a parse of its own.
  const frames = (read & Read.Frames) !== 0;
  const flags: TemplateFlags =
    recover === null && clientRefs === null
      ? frames
        ? UNFLAGGED_FRAMES
        : UNFLAGGED_RULES
      : { clientRefs, frames, recover };
  const parsed =
    (read & Read.Shared) !== 0 && strings.length === n + 1
      ? sharedParse(strings, n, flags)
      : readTemplate(strings, n, flags);
  const kept = parsed.kept;
  for (let i = 0; i < n; i++) {
    if (!kept[i]) {
      // Removed by the parse (inside a comment, or in a dropped statement):
      // never called, compiled, or injected.
      kinds[i] = InterpolationKind.Static;
      staticValues[i] = '';
    } else if (__DEV__ && clientRefs !== null && clientRefs[i]) {
      warnClientReference(interpolations[i]);
    }
  }
  return {
    ast: parsed.ast,
    id: parsed.id,
    interpolations,
    kinds,
    slotIsStandalone: parsed.standalone,
    staticValues,
    strings,
  };
}

/** What shapes a parse besides the strings: the slot flags from the values, and the block read. */
interface TemplateFlags {
  clientRefs: ReadonlyArray<boolean> | null;
  frames: boolean;
  recover: ReadonlyArray<boolean> | null;
}

const UNFLAGGED_RULES: TemplateFlags = { clientRefs: null, frames: false, recover: null };
const UNFLAGGED_FRAMES: TemplateFlags = { clientRefs: null, frames: true, recover: null };

/** Parse `strings` with `n` slots; `id` is `0`, the parse belongs to one Source. */
function readTemplate(
  strings: ReadonlyArray<string>,
  n: number,
  flags: TemplateFlags
): TemplateParse {
  if (n === 0) {
    return {
      ast: parse(strings.length > 0 ? strings[0] : '', flags.frames ? FRAMES : undefined),
      id: 0,
      kept: EMPTY,
      standalone: EMPTY,
    };
  }
  let joined = strings[0] || '';
  for (let i = 1; i < strings.length; i++) joined += '\0S' + (i - 1) + '\0' + (strings[i] || '');

  const kept = falseFlags(n);
  const standalone = falseFlags(n);
  const slots: SlotTable = {
    clientRefs: flags.clientRefs,
    kept,
    recover: flags.recover,
    standalone,
  };
  const ast = parse(joined, { frames: flags.frames, slots, templates: true });
  return { ast, id: 0, kept, standalone };
}

const FRAMES: ParseOptions = { frames: true };

/** {@link readTemplate} through the per-strings cache, under a fresh positive id on a miss. */
function sharedParse(
  strings: ReadonlyArray<string>,
  n: number,
  flags: TemplateFlags
): TemplateParse {
  let parses = sharedParses.get(strings);
  if (parses === undefined) {
    parses = new Map();
    sharedParses.set(strings, parses);
  }
  const recover = flags.recover;
  const clientRefs = flags.clientRefs;
  let key = recover === null && clientRefs === null ? '' : flagKey(n, recover, clientRefs);
  if (flags.frames) key = 'f' + key;
  let parsed = parses.get(key);
  if (parsed === undefined) {
    parsed = readTemplate(strings, n, flags);
    parsed.id = ++lastParseId;
    fifoSet(parses, key, parsed, FLAG_COMBINATION_LIMIT);
  }
  return parsed;
}

/** The slots flagged for recovery (`r`) or as client references (`c`), in order. */
function flagKey(
  n: number,
  recover: ReadonlyArray<boolean> | null,
  clientRefs: ReadonlyArray<boolean> | null
): string {
  let key = '';
  for (let i = 0; i < n; i++) {
    if (recover !== null && recover[i]) key += 'r' + i;
    else if (clientRefs !== null && clientRefs[i]) key += 'c' + i;
  }
  return key;
}

const EMPTY: never[] = [];

/** Interned all-empty strings arrays by slot count, shared so their parses are too. */
const emptyTemplates = new Map<number, ReadonlyArray<string>>();
const EMPTY_TEMPLATE_LIMIT = 32;

/**
 * An immutable strings array of `n + 1` empty strings: the template of `n`
 * slots with no text between them. Reused per `n`, so a parse of it can be
 * shared through {@link parseSource}.
 */
export function emptyTemplate(n: number): ReadonlyArray<string> {
  let strings = emptyTemplates.get(n);
  if (strings === undefined) {
    const fresh: string[] = [];
    for (let i = 0; i <= n; i++) fresh.push('');
    strings = Object.freeze(fresh);
    fifoSet(emptyTemplates, n, strings, EMPTY_TEMPLATE_LIMIT);
  }
  return strings;
}

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
 * interpolations, source, shared]` is monomorphic in both pre- and post-parse
 * states; the parsed `Source` holds the same input arrays by reference.
 * `shared` marks strings whose parse is reused by identity (see
 * {@link attachTemplateInputs}).
 */
type SourceSlot = [
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  source: Source | null,
  shared: boolean,
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
 * first `getSource(rules)` call, from a parse of its own.
 */
export function attachSourceInputs<T extends RuleSet<any>>(
  rules: T,
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): T {
  (rules as unknown as RulesWithSlot)[SOURCE_SLOT] = [strings, interpolations, null, false];
  return rules;
}

/**
 * {@link attachSourceInputs} for a tagged template's `strings`, or one from
 * {@link emptyTemplate}: an array that is never mutated and is the same on
 * every evaluation of its call site, so every `RuleSet` built from it shares
 * one parse.
 */
export function attachTemplateInputs<T extends RuleSet<any>>(
  rules: T,
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): T {
  (rules as unknown as RulesWithSlot)[SOURCE_SLOT] = [strings, interpolations, null, true];
  return rules;
}

/** The template inputs a `RuleSet` was built from; `undefined` for one built outside `css`. */
export function templateInputs(rules: RuleSet<any>): Readonly<SourceSlot> | undefined {
  return (rules as unknown as RulesWithSlot)[SOURCE_SLOT];
}

/**
 * A `RuleSet` whose template inputs are `strings` and `interpolations`,
 * sharing the parse of `strings` when `shared` (see {@link attachTemplateInputs}).
 */
export function ruleSetFromInputs(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  shared: boolean
): RuleSet<object> {
  const rules: RuleSet<object> = [];
  return shared
    ? attachTemplateInputs(rules, strings, interpolations)
    : attachSourceInputs(rules, strings, interpolations);
}

export function isCssProduct(arr: unknown): boolean {
  return Array.isArray(arr) && (arr as RulesWithSlot)[SOURCE_SLOT] !== undefined;
}

export function getSource(rules: RuleSet<any>): Source | undefined {
  const slot = (rules as unknown as RulesWithSlot)[SOURCE_SLOT];
  if (slot === undefined) return undefined;
  if (slot[2] !== null) return slot[2];
  const source = parseSource(slot[0], slot[1], slot[3]);
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
  const css = removeComments(slot[0].join('\0'), true);
  const blockLike = scan(css, 0, css.length, STATEMENT_END, 0, 0) < css.length;
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
