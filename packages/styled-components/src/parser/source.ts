import {
  CLOSE_BRACE,
  COLON,
  COMMA,
  isWS,
  NUL,
  OPEN_BRACE,
  OPEN_PAREN,
  SEMICOLON,
  SLASH,
} from '../utils/charCodes';
import type { BaseObject, RuleSet } from '../types';
import { normalize } from '../utils/normalize';
import {
  CAN_HOLD_REFERENCE,
  isServerOpaqueReference,
  referenceText,
} from '../utils/serverReference';
import { warnOnce } from '../utils/warnOnce';
import { DYN, NodeKind, Root, TemplateValue } from './ast';
import { parse, ParseOptions, scanQPB } from './parser';

/**
 * Pre-classified slot shape so the fast path skips typeof checks. Order
 * matches hot-path likelihood (`StatelessFn` first).
 *
 * - `StatelessFn`: `(p) => …`; call and coerce.
 * - `Static`: primitive baked at construction (`${10}px`); also styled-
 *   component refs (pre-stringified to `.${styledComponentId}`) and, in a
 *   server build, client and temporary references (their marker text).
 * - `General`: arrays, plain objects, and `${kf}` refs; full walk, bail on
 *   shapes the fast emitter doesn't cover. A keyframes ref resolves here at
 *   fill time since its hashed name varies per StyleSheetManager.
 * - `Fragment`: `${mixin}` ref; resolved recursively into FastPathFragment.
 */
export const enum InterpolationKind {
  StatelessFn = 1,
  Static = 2,
  General = 3,
  Fragment = 4,
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
  /** @internal */
  ast: Root;
  /** @internal */
  strings: ReadonlyArray<string>;
  /** @internal */
  interpolations: ReadonlyArray<unknown>;
  /** @internal */
  kinds: ReadonlyArray<InterpolationKind>;
  /** @internal */
  staticValues: ReadonlyArray<string>;
  /**
   * `true` for block-position (lifted to `InterpolationNode`), `false` for embedded.
   * @internal
   */
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
export function parseSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>,
  options?: ParseOptions
): Source {
  const css = interleaveWithSentinels(strings, interpolations);
  const preprocessed = normalize(css);
  // `templates: true` widens the parse() return type to
  // `Root<string | TemplateValue>` since `interleaveWithSentinels` may
  // have emitted `\0I` slots that `templateOrString` will turn into
  // TemplateValue fields. The runtime parser behavior is unchanged; the
  // flag is a type-system witness.
  const ast = parse(preprocessed, { keepCommaSpaces: __NATIVE__, ...options, templates: true });
  const n = interpolations.length;
  const kinds: InterpolationKind[] = [];
  const staticValues: string[] = [];
  const slotIsStandalone: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const slot = interpolations[i];
    const t = typeof slot;
    const ref = t === 'function' || t === 'object';
    let kind = InterpolationKind.Static;
    let value = '';
    if (t === 'string') {
      value = slot as string;
    } else if (t === 'number') {
      value = String(slot);
    } else if (slot === null || slot === undefined || slot === false) {
      // Static-empty.
    } else if (CAN_HOLD_REFERENCE && isServerOpaqueReference(slot)) {
      // A reference has no class and throws on most reads, so it is checked before any is made.
      value = referenceText(slot);
    } else if (ref && (slot as { styledComponentId?: string }).styledComponentId !== undefined) {
      // Styled-component ref: pre-stringify the class selector and dispatch as Static.
      value = '.' + (slot as { styledComponentId: string }).styledComponentId;
    } else if (isCssProduct(slot)) {
      // `css\`...\`` fragment ref; the child's Source is lazy-parsed at fill time.
      kind = InterpolationKind.Fragment;
    } else {
      kind = t === 'function' ? InterpolationKind.StatelessFn : InterpolationKind.General;
    }
    kinds[i] = kind;
    staticValues[i] = value;
    slotIsStandalone[i] = false;
  }
  // Eagerly mark every node whose subtree depends on an interpolation slot
  // (`\0I` embedded in any string field, or an InterpolationNode descendant).
  // The flag rides on the node as a Symbol-keyed property so consumers do a
  // single hidden-class slot read per render-miss instead of a WeakMap probe.
  // Native classifications for Rule / AtRule nodes (`[NATIVE_RULE_CLASS]` /
  // `[NATIVE_AT_CLASS]`) are stamped by the parser at construction time
  // and ride through here untouched.
  markDynamic(ast, slotIsStandalone);
  return { ast, strings, interpolations, kinds, staticValues, slotIsStandalone };
}

/**
 * Walk the AST once and tag every node whose own strings or descendants
 * carry a parse-time-resolved interpolation slot ({@link TemplateValue}
 * field, or an InterpolationNode descendant). Sets `node[DYN] = true` on
 * matched nodes; absence (`undefined`) is the static encoding.
 *
 * The per-field check is a single `typeof !== 'string'` test (TemplateValue
 * fields are objects, static fields are strings). The parser converted
 * sentinel-bearing strings to TemplateValue at construction time so this
 * walk is the subtree-aggregating pass only.
 *
 * `fillNode` in `compile.ts` reads the flag via a single property
 * access; descendants don't need to be re-walked because the flag bubbles
 * up here. The same walk records each block-position slot in `standalone`.
 */
function isTemplated(field: string | TemplateValue): boolean {
  return typeof field !== 'string';
}

function markDynamic(nodes: Root, standalone: boolean[]): boolean {
  let any = false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let dyn = false;
    switch (node.kind) {
      case NodeKind.Decl:
        dyn = isTemplated(node.prop) || isTemplated(node.value);
        break;
      case NodeKind.Rule: {
        dyn = node.selectors.some(isTemplated);
        if (markDynamic(node.children, standalone)) dyn = true;
        break;
      }
      case NodeKind.AtRule: {
        dyn = isTemplated(node.name) || isTemplated(node.prelude);
        if (node.children !== null && markDynamic(node.children, standalone)) dyn = true;
        break;
      }
      case NodeKind.Keyframes: {
        dyn =
          isTemplated(node.name) ||
          isTemplated(node.prelude) ||
          node.frames.some(
            frame =>
              frame.stops.some(isTemplated) ||
              frame.children.some(decl => isTemplated(decl.prop) || isTemplated(decl.value))
          );
        break;
      }
      case NodeKind.Interpolation:
        standalone[node.index] = true;
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
const SOURCE_SLOT: unique symbol = Symbol();

type RulesWithSlot = ReadonlyArray<unknown> & {
  [SOURCE_SLOT]?: SourceSlot;
};

/**
 * Record a `RuleSet`'s template inputs. The `Source` is lazily produced on
 * first `getSource(rules)` call. Used by the `css\`...\`` constructor.
 */
export function attachSourceInputs<T extends RuleSet<never>>(
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

export function isCssProduct(arr: unknown): arr is RulesWithSlot & { [SOURCE_SLOT]: SourceSlot } {
  return Array.isArray(arr) && (arr as RulesWithSlot)[SOURCE_SLOT] !== undefined;
}

export function getSource(rules: RuleSet<never>): Source | undefined {
  const slot = (rules as unknown as RulesWithSlot)[SOURCE_SLOT];
  if (slot === undefined) return undefined;
  const parsed = slot[2];
  if (parsed !== null) return parsed;
  const strings = slot[0];
  const interpolations = slot[1];
  if (strings === null || interpolations === null) return undefined;
  const source = parseSource(strings, interpolations);
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
export function synthesizeSourceForRuleSet(rules: RuleSet<never>): boolean {
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

function slotInputs(slot: SourceSlot): Pick<Source, 'strings' | 'interpolations'> | undefined {
  const parsed = slot[2];
  if (parsed !== null) return parsed;
  const strings = slot[0];
  const interpolations = slot[1];
  return strings !== null && interpolations !== null ? { strings, interpolations } : undefined;
}

/**
 * Concatenate two RuleSets' Source inputs into one combined template.
 * Used by `styled(Base)\`...\`` extension on native. The seam between the
 * two arrays joins as a single CSS chunk (no slot bridges them).
 */
export function concatSourceInputs<Props extends BaseObject>(
  combinedRules: RuleSet<Props>,
  baseRules: RuleSet<never>,
  extensionRules: RuleSet<never>
): RuleSet<Props> {
  const baseSlot = (baseRules as unknown as RulesWithSlot)[SOURCE_SLOT];
  const extSlot = (extensionRules as unknown as RulesWithSlot)[SOURCE_SLOT];
  if (baseSlot === undefined || extSlot === undefined) return combinedRules;
  const base = slotInputs(baseSlot);
  const ext = slotInputs(extSlot);
  if (base === undefined || ext === undefined) return combinedRules;
  const { strings: baseStrings, interpolations: baseInterpolations } = base;
  const { strings: extStrings, interpolations: extInterpolations } = ext;
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

function interleaveWithSentinels(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): string {
  const count = interpolations.length;
  if (count === 0) return strings[0] || '';

  const standalone = readStandaloneSlots(strings, count);
  let out = strings[0] || '';
  for (let i = 0; i < count; i++) {
    const prefix = strings[i] || '';
    const suffix = strings[i + 1] || '';
    if (__DEV__ && !standalone[i]) warnSwallowedFragment(out, prefix, interpolations[i]);
    out += (standalone[i] ? '\0J' : '\0I') + i + '\0' + suffix;
  }
  return out;
}

/**
 * Mark the slots that are whole statements (sentinel `\0J`, lifted to a sibling
 * node), in one pass over the comment-free template. Every other slot is
 * embedded (`\0I`) in a value, selector, or prelude. That includes any slot
 * inside a string or parentheses, which the top-level scan never stops on.
 *
 * The last slot with only whitespace or other slots before it in its statement is
 * embedded when the text after it can only continue that slot, or when the
 * statement opens a block with no other text
 * (`${Child} {`). Anything else is standalone, so a mixin keeps its place without
 * a `;` (a newline carries no meaning, since a CSS minifier removes it). A
 * standalone slot holding a selector (`${Child} h2 {`) is only known at fill time,
 * where `fillAst` reads it with the head of the rule after it.
 */
function readStandaloneSlots(strings: ReadonlyArray<string>, count: number): boolean[] {
  // The marker ends in a space: if a `\` escapes its NUL, the markers after it still read.
  let marked = strings[0] || '';
  for (let i = 0; i < count; i++) marked += '\0' + i + ' ' + (strings[i + 1] || '');
  const css = normalize(marked);
  const len = css.length;

  const standalone: boolean[] = [];
  let waiting: number[] = [];
  let continues: boolean | undefined; // Undefined until the statement has text after its slots.
  let i = 0;
  for (;;) {
    const stop = scanQPB(css, i, len, SEMICOLON, OPEN_BRACE, CLOSE_BRACE, NUL);
    if (continues === undefined) {
      let j = i;
      while (j < stop && isWS(css.charCodeAt(j))) j++;
      // A class, id, attribute, or `*` joins a slot only when written against it (`${Child}.x`);
      // with whitespace (`${mixin} .x {`) it starts its own rule.
      if (j < stop) continues = (j === i ? '&:>+~,*.#[' : '&:>+~,').includes(css[j]);
    }

    const stopCode = css.charCodeAt(stop);
    if (stopCode === NUL) {
      const end = css.indexOf(' ', stop + 1);
      if (continues === undefined) waiting.push(+css.slice(stop + 1, end));
      // An authored NUL can leave no space to find.
      i = end < 0 ? len : end + 1;
      continue;
    }

    // Only the last slot can run into what follows. Past the end of the template, `stopCode`
    // is NaN and the statement counts as closed.
    const standaloneCount = waiting.length - ((continues ?? stopCode === OPEN_BRACE) ? 1 : 0);
    for (let k = 0; k < standaloneCount; k++) standalone[waiting[k]] = true;
    if (stop >= len) return standalone;

    waiting = [];
    continues = undefined;
    i = stop + 1;
  }
}

/**
 * Dev warning for an embedded slot holding a `css\`...\`` fragment whose
 * source carries statements (`;` `{` `}`): the author left out the `;`
 * before it, so the fragment text lands inside the preceding declaration's
 * value. Value-position slots (prefix ends in `:` `,` `(` `/`) are the
 * intended embedded use and stay silent.
 */
function warnSwallowedFragment(sourceSoFar: string, prefix: string, interpolation: unknown): void {
  const trimmed = prefix.trimEnd();
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last === COLON || last === COMMA || last === OPEN_PAREN || last === SLASH) return;
  if (!isCssProduct(interpolation)) return;
  const slot = interpolation[SOURCE_SLOT];
  const strings = slot[2] !== null ? slot[2].strings : slot[0];
  if (strings === null) return;
  for (let i = 0; i < strings.length; i++) {
    const s = strings[i];
    for (let j = 0; j < s.length; j++) {
      const c = s.charCodeAt(j);
      if (c === SEMICOLON || c === OPEN_BRACE || c === CLOSE_BRACE) {
        // The swallowing declaration starts after the last top-level `;` `{`
        // `}` of the whole source so far, so it can span earlier slots.
        const text = normalize(sourceSoFar);
        const textEnd = text.length;
        let from = 0;
        let k: number;
        while (
          (k = scanQPB(text, from, textEnd, SEMICOLON, OPEN_BRACE, CLOSE_BRACE, -1)) < textEnd
        ) {
          from = k + 1;
        }
        const statement = text.slice(from).trim();
        const colon = scanQPB(statement, 0, statement.length, COLON, -1, -1, -1);
        // No colon means the slot starts a selector, where a fragment's statements are fine.
        if (colon >= statement.length) return;
        const property = statement
          .slice(0, colon)
          .trim()
          .replace(/\0[IJ]\d+\0/g, '${...}');
        warnOnce(
          'fragment-missing-semicolon',
          `a css fragment is interpolated inside the \`${property}\` declaration with no \`;\` before it, so the fragment text becomes part of that declaration's value. Add a \`;\` before the \`\${...}\` interpolation.`,
          statement
        );
        return;
      }
    }
  }
}
