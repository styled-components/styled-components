import {
  CLOSE_BRACE,
  COLON,
  COMMA,
  OPEN_BRACE,
  OPEN_PAREN,
  SEMICOLON,
  SLASH,
} from '../utils/charCodes';
import type { BaseObject, RuleSet } from '../types';
import { EMPTY_ARRAY } from '../utils/empties';
import { normalize } from '../utils/normalize';
import {
  CAN_HOLD_REFERENCE,
  isServerOpaqueReference,
  referenceText,
} from '../utils/serverReference';
import { warnOnce } from '../utils/warnOnce';
import { InterpolationKind, Root } from './ast';
import { parse, scanQPB, SENTINEL_RE, STOP_COLON, STOP_FIELD } from './parser';

/**
 * Frozen, parsed tagged-template. Constructed once per `styled()` call
 * (lazily, on first render) and reused across every subsequent render.
 * Standalone interpolation slots become `InterpolationNode`s in the AST;
 * embedded slots inside value/selector strings become `TemplateValue`
 * fields. `kinds`/`staticValues` are parallel to `interpolations` for
 * fast dispatch; a `kinds` entry packs the {@link InterpolationKind} in
 * `InterpolationKind.Mask` and sets `InterpolationKind.Standalone` for a
 * block-position slot.
 */
export interface Source {
  /** @internal */
  ast: Root;
  /** @internal */
  strings: ReadonlyArray<string>;
  /** @internal */
  interpolations: ReadonlyArray<unknown>;
  /** @internal */
  kinds: ReadonlyArray<number>;
  /** @internal */
  staticValues: ReadonlyArray<string>;
}

/**
 * Parse a template once. The strings and slots interleave as `\0<n>\0` sentinels, and the
 * parser reads each slot as a whole statement (lifted to an `InterpolationNode`) or as part of
 * a value, selector, or prelude (a `TemplateValue` field), recording the former on `kinds`.
 */
export function parseSource(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): Source {
  const n = interpolations.length;
  if (n === 0) {
    return {
      ast: parse(normalize(strings[0] || '')),
      strings,
      interpolations,
      kinds: EMPTY_ARRAY,
      staticValues: EMPTY_ARRAY,
    };
  }

  const kinds: number[] = [];
  const staticValues: string[] = [];
  let css = strings[0] || '';
  for (let i = 0; i < n; i++) {
    const slot = interpolations[i];
    const t = typeof slot;
    let kind = InterpolationKind.Static;
    let value = '';
    let id: string | undefined;
    if (t === 'string') {
      value = slot as string;
    } else if (t === 'number') {
      value = String(slot);
    } else if (slot === null || slot === undefined || slot === false) {
      // Static-empty.
    } else if (CAN_HOLD_REFERENCE && isServerOpaqueReference(slot)) {
      // A reference has no class and throws on most reads, so it is checked before any is made.
      value = referenceText(slot);
    } else if (
      (t === 'function' || t === 'object') &&
      (id = (slot as { styledComponentId?: string }).styledComponentId) !== undefined
    ) {
      // Styled-component ref: pre-stringify the class selector and dispatch as Static.
      value = '.' + id;
    } else if (isCssProduct(slot)) {
      // `css\`...\`` fragment ref; the child's Source is lazy-parsed at fill time.
      kind = InterpolationKind.Fragment;
    } else {
      kind = t === 'function' ? InterpolationKind.StatelessFn : InterpolationKind.General;
    }
    kinds[i] = kind;
    staticValues[i] = value;
    css += '\0' + i + '\0' + (strings[i + 1] || '');
  }

  const ast = parse(normalize(css), kinds);
  if (__DEV__) {
    let built = 0;
    let soFar = '';
    for (let i = 0; i < n; i++) {
      if (kinds[i] === InterpolationKind.Fragment) {
        while (built <= i) {
          soFar +=
            built === 0 ? strings[0] || '' : '\0' + (built - 1) + '\0' + (strings[built] || '');
          built++;
        }
        warnSwallowedFragment(
          soFar,
          strings[i] || '',
          (interpolations[i] as { [SOURCE_SLOT]: SourceSlot })[SOURCE_SLOT]
        );
      }
    }
  }
  return { ast, strings, interpolations, kinds, staticValues };
}

/**
 * Per-`RuleSet` template-input + lazy `Source` cache. Stored as a symbol-
 * keyed property on the rules array itself rather than via a `WeakMap`
 * entry: V8 adds a single hidden-class transition for the named slot and
 * skips the per-call weak-entry allocation (~40x cheaper in microbench,
 * same GC story because freeing the rules array drops the symbol slot
 * with it). Holds `[strings, interpolations]` until the first `getSource`
 * parse, then replaces the tuple with the `Source` directly so warm reads
 * skip an array indirection and drop the input tuple.
 */
type SourceSlot = [strings: ReadonlyArray<string>, interpolations: ReadonlyArray<unknown>] | Source;

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
  (rules as unknown as { [SOURCE_SLOT]: SourceSlot })[SOURCE_SLOT] = [strings, interpolations];
  return rules;
}

export function isCssProduct(arr: unknown): arr is RulesWithSlot & { [SOURCE_SLOT]: SourceSlot } {
  return Array.isArray(arr) && (arr as RulesWithSlot)[SOURCE_SLOT] !== undefined;
}

export function getSource(rules: RuleSet<never>): Source | undefined {
  const slot = (rules as unknown as RulesWithSlot)[SOURCE_SLOT];
  if (slot === undefined) return undefined;
  if (!Array.isArray(slot)) return slot;
  const source = parseSource(slot[0], slot[1]);
  if (!Object.isFrozen(rules)) {
    (rules as unknown as { [SOURCE_SLOT]: SourceSlot })[SOURCE_SLOT] = source;
  }
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
  const walk = (arr: ReadonlyArray<unknown>): void => {
    for (let i = 0; i < arr.length; i++) {
      const chunk = arr[i];
      if (chunk === undefined || chunk === null || chunk === false || chunk === '') continue;
      if (typeof chunk === 'string') {
        pending += chunk;
      } else if (Array.isArray(chunk)) {
        walk(chunk);
      } else {
        strings.push(pending);
        pending = '';
        interpolations.push(chunk);
      }
    }
  };
  walk(rules);
  strings.push(pending);
  attachSourceInputs(rules, strings, interpolations);
  return true;
}

function slotInputs(slot: SourceSlot): Pick<Source, 'strings' | 'interpolations'> {
  return Array.isArray(slot) ? { strings: slot[0], interpolations: slot[1] } : slot;
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
  const { strings: baseStrings, interpolations: baseInterpolations } = slotInputs(baseSlot);
  const { strings: extStrings, interpolations: extInterpolations } = slotInputs(extSlot);
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
 * Dev warning for an embedded slot holding a `css\`...\`` fragment whose
 * source carries statements (`;` `{` `}`): the author left out the `;`
 * before it, so the fragment text lands inside the preceding declaration's
 * value. Value-position slots (prefix ends in `:` `,` `(` `/`) are the
 * intended embedded use and stay silent.
 */
function warnSwallowedFragment(sourceSoFar: string, prefix: string, slot: SourceSlot): void {
  const trimmed = prefix.trimEnd();
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last === COLON || last === COMMA || last === OPEN_PAREN || last === SLASH) return;
  const strings = Array.isArray(slot) ? slot[0] : slot.strings;
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
        while ((k = scanQPB(text, from, textEnd, STOP_FIELD)) < textEnd) {
          from = k + 1;
        }
        const statement = text.slice(from).trim();
        const colon = scanQPB(statement, 0, statement.length, STOP_COLON);
        // No colon means the slot starts a selector, where a fragment's statements are fine.
        if (colon >= statement.length) return;
        const property = statement.slice(0, colon).trim().replace(SENTINEL_RE, '${...}');
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
