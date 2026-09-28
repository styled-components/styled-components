import type KeyframesClass from '../models/Keyframes';
import type { CompiledKeyframes, KeyframesCompiler } from '../models/Keyframes';
import type { RuleSet } from '../types';
import { fifoSet } from '../utils/fifoMap';
import getComponentName from '../utils/getComponentName';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import isPlainObject from '../utils/isPlainObject';
import { walkObject } from '../utils/objectToCSS';
import { warnOnce } from '../utils/warnOnce';
import { trimRange } from './parser';
import {
  CLIENT_REFERENCE,
  emptyTemplate,
  getSource,
  InterpolationKind,
  isCssProduct,
  parseSource,
  Source,
} from './source';

/**
 * Resolved `${mixin}` fragment. Carried via a parallel side table so
 * `fillSource` can splice the child's AST as siblings without re-parsing.
 */
export interface FastPathFragment {
  source: Source;
  filled: string[];
  fragments: (FastPathFragment | null)[] | null;
}

/**
 * Side-table entry for a slot whose value cannot be resolved (a non-styled
 * component, or a client reference). It contributes no text, and a rule it
 * heads is dropped rather than widened to the selector around it. Compared
 * by identity.
 */
export const UNRESOLVED: FastPathFragment = {
  source: parseSource([''], []),
  filled: [],
  fragments: null,
};

/** Whether a fragment, or a fragment nested in it, holds a value that could not be resolved. */
export function holdsUnresolved(frag: FastPathFragment): boolean {
  const fragments = frag.fragments;
  if (fragments === null) return false;
  for (let i = 0; i < fragments.length; i++) {
    const child = fragments[i];
    if (child === UNRESOLVED || (child !== null && holdsUnresolved(child))) return true;
  }
  return false;
}

/**
 * True when any slot in a fast-path fragments buffer resolved to a fragment.
 * A plain for-loop, not `.some()`: this runs on the per-render fast path and
 * must stay monomorphic so V8 inlines it at each call site.
 */
export function hasAnyFragment(fragments: (FastPathFragment | null)[]): boolean {
  for (let i = 0; i < fragments.length; i++) {
    if (fragments[i] !== null) return true;
  }
  return false;
}

/** What value resolution writes to, shared by every slot of one evaluation. */
interface Resolver {
  compiler: KeyframesCompiler | undefined;
  context: unknown;
  fragments: (FastPathFragment | null)[] | undefined;
  keyframes: CompiledKeyframes[] | undefined;
}

/**
 * Resolve `Source` slots into a `string[]`. Dispatches on pre-classified
 * `kinds` so the hot path skips per-slot typeof checks.
 *
 * `outBuffer` is reused to keep warm renders allocation-free. `compiler`
 * names `${kf}` slots; with `outKeyframes` it also compiles them for the
 * caller's generate→inject pipeline (the parser stays pure). `outFragments`,
 * when supplied, receives `${mixin}` slot resolutions for AST splicing;
 * without it a mixin is spliced from its text.
 */
export function evaluateForFastPath(
  source: Source,
  fillContext: unknown,
  outBuffer?: string[],
  compiler?: KeyframesCompiler,
  outFragments?: (FastPathFragment | null)[],
  outKeyframes?: CompiledKeyframes[]
): string[] {
  const interps = source.interpolations;
  const n = interps.length;
  if (n === 0) return EMPTY_FILLED;
  const kinds = source.kinds;
  const statics = source.staticValues;
  const filled = outBuffer || new Array<string>(n);
  if (filled.length !== n) filled.length = n;
  if (outFragments !== undefined && outFragments.length !== n) outFragments.length = n;
  // Allocated on the first slot that needs full resolution; strings and
  // static slots never pay for it.
  let resolver: Resolver | null = null;
  for (let i = 0; i < n; i++) {
    if (outFragments !== undefined) outFragments[i] = null;
    const kind = kinds[i];
    if (kind === InterpolationKind.StatelessFn) {
      const fn = interps[i] as (ctx: unknown) => unknown;
      const result = fn(fillContext);
      if (typeof result === 'string') {
        filled[i] = result;
        continue;
      }
      if (typeof result === 'number') {
        filled[i] = String(result);
        continue;
      }
      if (resolver === null) {
        resolver = {
          compiler,
          context: fillContext,
          fragments: outFragments,
          keyframes: outKeyframes,
        };
      }
      filled[i] = resolveValue(result, resolver, i, source.slotIsStandalone[i], fn);
    } else if (kind === InterpolationKind.Static) {
      filled[i] = statics[i];
    } else if (kind === InterpolationKind.Unresolved) {
      filled[i] = '';
      if (outFragments !== undefined) outFragments[i] = UNRESOLVED;
    } else {
      if (resolver === null) {
        resolver = {
          compiler,
          context: fillContext,
          fragments: outFragments,
          keyframes: outKeyframes,
        };
      }
      filled[i] = resolveValue(interps[i], resolver, i, source.slotIsStandalone[i], undefined);
    }
  }
  return filled;
}

const EMPTY_FILLED: string[] = [];

/**
 * Resolve a runtime value to the text a slot substitutes, per its shape.
 * A standalone (or head) slot records a mixin in the fragments side table
 * and substitutes `''`. `owner` is the function that returned `value`, named
 * in the warning for a non-styled component.
 */
function resolveValue(
  value: unknown,
  r: Resolver,
  index: number,
  standalone: boolean,
  owner: unknown
): string {
  const t = typeof value;
  if (t === 'string') return value as string;
  if (t === 'number' || t === 'bigint') return String(value);
  // `true`, `false`, `undefined`, symbols, and `null` substitute nothing.
  if ((t !== 'function' && t !== 'object') || value === null) return '';
  // Read first: a client reference proxy throws on any other property read.
  const brand = (value as { $$typeof?: symbol }).$$typeof;
  if (brand === CLIENT_REFERENCE) {
    unresolved(r, index);
    if (__DEV__) {
      warnOnce(
        'client-ref-value',
        'a client component was interpolated into styles where a value is needed; its class name is not available across the server/client boundary, so that part of the styles was dropped. Use a plain CSS class selector instead.'
      );
    }
    return '';
  }
  const styledId = (value as { styledComponentId?: string }).styledComponentId;
  if (styledId !== undefined) return '.' + styledId;
  if (t === 'object' && KEYFRAMES_SYMBOL in (value as object)) {
    return keyframesName(value as KeyframesClass, r);
  }
  if (Array.isArray(value)) {
    if (isCssProduct(value)) {
      const frag = resolveFragment(value as RuleSet<any>, r);
      if (frag === null) return '';
      if (standalone && r.fragments !== undefined) {
        r.fragments[index] = frag;
        return '';
      }
      if (holdsUnresolved(frag)) {
        unresolved(r, index);
        return '';
      }
      const text = fragmentText(frag);
      return standalone ? text : trimRange(text, 0, text.length);
    }
    if (standalone && r.fragments !== undefined) {
      r.fragments[index] = resolveArrayFragment(value, r);
      return '';
    }
    let text = '';
    for (let i = 0; i < value.length; i++) text += resolveValue(value[i], r, index, false, owner);
    return text;
  }
  if (t === 'function') {
    const fn = value as ((ctx: unknown) => unknown) & {
      prototype?: { isReactComponent?: unknown };
    };
    if (fn.prototype !== undefined && fn.prototype.isReactComponent) {
      return nonStyled(fn, r, index);
    }
    return resolveValue(fn(r.context), r, index, standalone, fn);
  }
  // React elements and component objects (forwardRef, memo, lazy) carry
  // `$$typeof`; an element is named by the component that rendered it.
  if (brand !== undefined) {
    const element = owner !== undefined && 'props' in (value as object);
    return nonStyled(element ? owner : value, r, index);
  }
  if (isPlainObject(value)) {
    if (Object.prototype.hasOwnProperty.call(value, 'toString')) return String(value);
    const walked = walkObject(value as Record<string, unknown>, {
      context: r.context,
      fragmentText: frag => fragmentValueText(frag as RuleSet<any>, r),
    });
    const interpolations = walked.interpolations;
    // Only ordinary values: the text parses as a mixin, as template text does.
    if (interpolations === null || walked.strings === null) return walked.pending;
    const strings = walked.strings;
    strings.push(walked.pending);
    const values: string[] = [];
    for (let i = 0; i < interpolations.length; i++) values.push(String(interpolations[i]));
    if (standalone && r.fragments !== undefined) {
      r.fragments[index] = {
        source: objectSource(strings, values),
        filled: values,
        fragments: null,
      };
      return '';
    }
    return buildHashCSS(strings, values);
  }
  return String(value);
}

/**
 * Parsed sources of style objects met at render time, keyed by their
 * template text: an object's values are slots or ordinary text, so objects
 * of one shape share a source.
 */
const objectSources = new Map<string, Source>();
const OBJECT_SOURCE_LIMIT = 200;

function objectSource(strings: string[], values: string[]): Source {
  let key = strings[0];
  for (let i = 1; i < strings.length; i++) key += '\0' + strings[i];
  let source = objectSources.get(key);
  if (source === undefined) {
    source = parseSource(strings, values);
    fifoSet(objectSources, key, source, OBJECT_SOURCE_LIMIT);
  }
  return source;
}

/** A css fragment value's trimmed text in a style object; `null` when it holds a value that cannot be resolved. */
function fragmentValueText(rules: RuleSet<any>, r: Resolver): string | null {
  const frag = resolveFragment(rules, r);
  if (frag === null) return '';
  if (holdsUnresolved(frag)) return null;
  const text = fragmentText(frag);
  return trimRange(text, 0, text.length);
}

/** Drop a non-styled component's slot, with a dev warning naming it. */
function nonStyled(component: unknown, r: Resolver, index: number): string {
  unresolved(r, index);
  if (__DEV__) {
    const name = getComponentName(component as never);
    warnOnce(
      'non-styled-selector',
      `${name} is not a styled component and cannot be referred to via component selector. See https://styled-components.com/docs/advanced#referring-to-other-components for more details.`,
      name
    );
  }
  return '';
}

function unresolved(r: Resolver, index: number): void {
  if (r.fragments !== undefined) r.fragments[index] = UNRESOLVED;
}

/**
 * A keyframes value's generated name; compiled for injection when the caller
 * collects keyframes, together with the keyframes its frames name.
 */
function keyframesName(kf: KeyframesClass, r: Resolver): string {
  if (r.compiler === undefined) return kf.getName();
  if (r.keyframes === undefined) return kf.getName(r.compiler);
  const compiled = kf.compile(r.compiler);
  const named = compiled.keyframes;
  if (named !== undefined) for (let i = 0; i < named.length; i++) r.keyframes.push(named[i]);
  r.keyframes.push(compiled);
  return compiled.name;
}

/**
 * Resolve a `css\`...\`` fragment slot into a `FastPathFragment`. The child's
 * interpolations evaluate against the parent's fill context so nested function
 * slots see the same props and theme. Returns `null` when the child lacks a
 * Source.
 */
function resolveFragment(rules: RuleSet<any>, r: Resolver): FastPathFragment | null {
  const childSource = getSource(rules);
  if (childSource === undefined) return null;
  return evaluateFragment(childSource, r);
}

function evaluateFragment(childSource: Source, r: Resolver): FastPathFragment {
  const childFragments: (FastPathFragment | null)[] = [];
  const childFilled = evaluateForFastPath(
    childSource,
    r.context,
    undefined,
    r.compiler,
    childFragments,
    r.keyframes
  );
  return {
    source: childSource,
    filled: childFilled === EMPTY_FILLED ? [] : childFilled,
    // Dropped when no slot holds one, so callers skip the per-slot consult.
    fragments: hasAnyFragment(childFragments) ? childFragments : null,
  };
}

/**
 * Sources for plain arrays met at a standalone slot: each element is a slot
 * of its own, so the elements splice in order and each resolves by its shape.
 * Arrays of one length share a parse, so a fresh array each render is not
 * parsed again.
 */
const arraySources = new WeakMap<ReadonlyArray<unknown>, Source>();

function resolveArrayFragment(arr: ReadonlyArray<unknown>, r: Resolver): FastPathFragment {
  let source = arraySources.get(arr);
  if (source === undefined) {
    source = parseSource(emptyTemplate(arr.length), arr, true);
    arraySources.set(arr, source);
  }
  return evaluateFragment(source, r);
}

/**
 * Reconstruct the joined CSS string from `Source.strings` and resolved
 * interpolation values. Output bytes are identical to the v6 string-input
 * pipeline so SSR class hashes stay stable. Fragment slots expand recursively.
 */
export function buildHashCSS(
  strings: ReadonlyArray<string>,
  filled: ReadonlyArray<string>,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): string {
  if (filled.length === 0) return strings.length > 0 ? strings[0] : '';
  let out = strings[0] || '';
  for (let i = 0; i < filled.length; i++) {
    const frag = fragments ? fragments[i] : null;
    if (frag !== null && frag !== undefined) {
      out += buildHashCSS(frag.source.strings, frag.filled, frag.fragments);
    } else {
      out += filled[i];
    }
    out += strings[i + 1] || '';
  }
  return out;
}

/** A resolved fragment's filled source text. */
export function fragmentText(frag: FastPathFragment): string {
  return buildHashCSS(frag.source.strings, frag.filled, frag.fragments);
}

/**
 * Build a per-instance cache key from resolved interpolation values. NUL
 * separates fields so primitives can't collide across positions; fragment
 * slots contribute their parse (its shared {@link Source.id}, or its strings
 * when the parse is its own), a NUL ending that part, and their filled tuple
 * recursively.
 *
 * Single-slot fast path returns `filled[0]` directly (when no prefix). The
 * caller's Map is per-instance and per-source-shape so a single-slot key
 * can't collide with a multi-slot one. Reusing the slot's flat string
 * identity keeps V8's cached string hash warm across renders.
 */
export function buildInterpKey(
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null | undefined,
  prefix: string = ''
): string {
  if (
    prefix === '' &&
    filled.length === 1 &&
    (fragments === null || fragments === undefined || fragments[0] === null)
  ) {
    return filled[0];
  }
  let key = prefix;
  for (let i = 0; i < filled.length; i++) {
    const frag = fragments ? fragments[i] : null;
    if (frag !== null && frag !== undefined) {
      const source = frag.source;
      if (source.id !== 0) {
        key += '\0F' + source.id + '\0';
      } else {
        key += '\0F';
        for (let j = 0; j < source.strings.length; j++) key += '\0' + source.strings[j];
        key += '\0';
      }
      key += buildInterpKey(frag.filled, frag.fragments);
    } else {
      key += '\0' + filled[i];
    }
  }
  return key;
}
