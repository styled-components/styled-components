import type KeyframesClass from '../models/Keyframes';
import type StyleSheet from '../sheet';
import type { Compiler, RuleSet } from '../types';
import { CR, HYPHEN, LF, NUL, SPACE, TAB, UPPER_I } from '../utils/charCodes';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import getComponentName from '../utils/getComponentName';
import isPlainObject from '../utils/isPlainObject';
import { fifoSet } from '../utils/fifoMap';
import { objectToCSS } from '../utils/objectToCSS';
import {
  AtRuleNode,
  DeclNode,
  KeyframeFrame,
  KeyframesNode,
  Node,
  NodeKind,
  Root,
  RuleNode,
} from './ast';
import { emitWeb, EmitOptions } from './emit-web';
import { parse, stripCommaSpaces } from './parser';
import { getSource, InterpolationKind, Source } from './source';

/**
 * Resolved `${mixin}` fragment. Carried via a parallel side table so
 * `fillAst` can splice the child's AST as siblings without re-parsing.
 */
export interface FastPathFragment {
  source: Source;
  filled: string[];
  fragments: (FastPathFragment | null)[] | null;
}

/**
 * Resolve `Source` slots into a `string[]`. Dispatches on pre-classified
 * `kinds` so the hot path skips per-slot typeof checks.
 *
 * `outBuffer` is reused to keep warm renders allocation-free.
 * `sheet`/`compiler` are required for `${kf}` slots; absence forces bail.
 * `outFragments`, when supplied, receives `${mixin}` slot resolutions for
 * AST splicing; absence forces bail on fragment slots.
 *
 * Returns `null` on any shape the fast path doesn't cover, signaling the
 * caller to fall back to the legacy pipeline.
 */
export function evaluateForFastPath(
  source: Source,
  fillContext: unknown,
  outBuffer?: string[],
  sheet?: StyleSheet,
  compiler?: Compiler,
  outFragments?: (FastPathFragment | null)[]
): string[] | null {
  const interps = source.interpolations;
  const n = interps.length;
  if (n === 0) return EMPTY_FILLED;
  const kinds = source.kinds;
  const statics = source.staticValues;
  const filled = outBuffer || new Array<string>(n);
  if (filled.length !== n) filled.length = n;
  if (outFragments !== undefined && outFragments.length !== n) outFragments.length = n;
  for (let i = 0; i < n; i++) {
    if (outFragments !== undefined) outFragments[i] = null;
    const kind = kinds[i];
    const embedded = !source.slotIsStandalone[i];
    if (kind === InterpolationKind.StatelessFn) {
      const fn = interps[i] as (ctx: unknown) => unknown;
      const result = fn(fillContext);
      if (typeof result === 'string') {
        filled[i] = result;
      } else {
        const coerced = coerceFnResult(
          result,
          fillContext,
          sheet,
          compiler,
          outFragments,
          i,
          embedded
        );
        if (coerced === null) {
          // Likely a non-styled component used as a selector ref.
          if (
            process.env.NODE_ENV !== 'production' &&
            typeof result === 'object' &&
            result !== null &&
            !Array.isArray(result) &&
            !isPlainObject(result)
          ) {
            console.error(
              getComponentName(fn as never) +
                ' is not a styled component and cannot be referred to via component selector.' +
                ' See https://styled-components.com/docs/advanced#referring-to-other-components' +
                ' for more details.'
            );
          }
          return null;
        }
        filled[i] = coerced;
      }
    } else if (kind === InterpolationKind.Static) {
      filled[i] = statics[i];
    } else if (kind === InterpolationKind.Keyframes) {
      if (sheet === undefined || compiler === undefined) return null;
      const kf = interps[i] as KeyframesClass;
      kf.inject(sheet, compiler);
      filled[i] = kf.getName(compiler);
    } else if (kind === InterpolationKind.Fragment) {
      const frag = resolveFragment(interps[i] as RuleSet<any>, fillContext, sheet, compiler);
      if (frag === null) return null;
      if (source.slotIsStandalone[i]) {
        // Block-position: splice the child's AST as parent siblings via the
        // fragments side table. Bail when caller didn't allocate one.
        if (outFragments === undefined) return null;
        outFragments[i] = frag;
        filled[i] = '';
      } else {
        filled[i] = stringifyEmbeddedFragment(frag);
      }
    } else {
      const resolved = resolveInterpolation(
        interps[i],
        fillContext,
        sheet,
        compiler,
        outFragments,
        i,
        embedded
      );
      if (resolved === null) return null;
      filled[i] = resolved;
    }
  }
  return filled;
}

const EMPTY_FILLED: string[] = [];

/**
 * Coerce a stateless-function result to its substituted text. Object/function
 * results delegate to `resolveInterpolation` so the brand checks handle them;
 * unsupported shapes bail. `fragmentsOut`/`slotIndex` thread through so a
 * function-returned fragment populates the parent's side table.
 */
function coerceFnResult(
  result: unknown,
  fillContext: unknown,
  sheet?: StyleSheet,
  compiler?: Compiler,
  fragmentsOut?: (FastPathFragment | null)[],
  slotIndex?: number,
  embedded?: boolean
): string | null {
  if (typeof result === 'number') return String(result);
  if (result === null || result === undefined || result === false) return '';
  if (typeof result === 'function' || typeof result === 'object') {
    return resolveInterpolation(
      result,
      fillContext,
      sheet,
      compiler,
      fragmentsOut,
      slotIndex,
      embedded
    );
  }
  return null;
}

/**
 * Resolve a `css\`...\`` fragment slot into a `FastPathFragment`. The child's
 * interpolations evaluate against the parent's fill context so nested function
 * slots see the same props and theme. Returns `null` when the child lacks a
 * Source or any nested slot bails.
 */
function resolveFragment(
  rules: RuleSet<any>,
  fillContext: unknown,
  sheet?: StyleSheet,
  compiler?: Compiler
): FastPathFragment | null {
  const childSource = getSource(rules);
  if (childSource === undefined) return null;
  const childFragments: (FastPathFragment | null)[] = [];
  const childFilled = evaluateForFastPath(
    childSource,
    fillContext,
    undefined,
    sheet,
    compiler,
    childFragments
  );
  if (childFilled === null) return null;
  // Drop the fragments array when no slots are populated, so callers can
  // skip the per-slot consult.
  let hasChildFragments = false;
  for (let i = 0; i < childFragments.length; i++) {
    if (childFragments[i] !== null) {
      hasChildFragments = true;
      break;
    }
  }
  return {
    source: childSource,
    filled: childFilled === EMPTY_FILLED ? [] : childFilled,
    fragments: hasChildFragments ? childFragments : null,
  };
}

/**
 * Build the legacy-equivalent CSS string from `Source.strings` and resolved
 * values. Output bytes match the v6 `flatten + join` pipeline so SSR class
 * hashes stay stable. Fragment slots expand recursively.
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

/**
 * Stringify a fragment for embedded substitution. Trims outer whitespace
 * so multi-line fragment templates flow correctly in mid-value position
 * (e.g. `animation: ${frag} linear`); whole-value position already trims
 * via `normalizeSubstituted`. Internal whitespace is preserved — users
 * may write meaningful runs inside fragments.
 */
function stringifyEmbeddedFragment(frag: FastPathFragment): string {
  return trimWhitespace(buildHashCSS(frag.source.strings, frag.filled, frag.fragments));
}

/**
 * Build a per-instance cache key from resolved interpolation values. NUL
 * separates fields so primitives can't collide across positions; fragment
 * slots contribute their child strings + filled tuple recursively.
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
      key += '\0F';
      for (let j = 0; j < frag.source.strings.length; j++) {
        key += '\0' + frag.source.strings[j];
      }
      key += buildInterpKey(frag.filled, frag.fragments);
    } else {
      key += '\0' + filled[i];
    }
  }
  return key;
}

/**
 * Fill the construction-time AST with `filled` values and emit web CSS.
 * Output bytes match `compiler.compile(css, ...)` on the same logical input.
 * Returns `null` when block-level filled text carries unparseable structure.
 */
export function compileWebFilled(
  source: Source,
  filled: ReadonlyArray<string>,
  parentSelector: string,
  options?: EmitOptions,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): string[] | null {
  if (filled.length === 0) {
    return emitWeb(source.ast, parentSelector, options);
  }
  const filledAst = fillAst(source.ast, filled, fragments);
  if (filledAst === null) return null;
  return emitWeb(filledAst, parentSelector, options);
}

/**
 * Test wrapper: evaluate + fill + emit in one call. Production renders split
 * the steps so per-instance caches can lookup between evaluate and fill.
 * @internal
 */
export function compileWeb(
  source: Source,
  fillContext: unknown,
  parentSelector: string,
  options?: EmitOptions,
  sheet?: StyleSheet,
  compiler?: Compiler
): string[] | null {
  const fragments: (FastPathFragment | null)[] = [];
  const filled = evaluateForFastPath(source, fillContext, undefined, sheet, compiler, fragments);
  if (filled === null) return null;
  return compileWebFilled(
    source,
    filled,
    parentSelector,
    options,
    fragments.length > 0 ? fragments : null
  );
}

const CLIENT_REFERENCE = Symbol.for('react.client.reference');

/**
 * Coerce a runtime value to its substituted text. Handles
 * function-returns-X cases (the directly-typed slot shapes are pre-classified
 * in `parseSource` and never reach here). Returns `null` to bail.
 *
 * Client reference proxies are bailed before invocation; the legacy path
 * issues the canonical dev warning.
 */
function resolveInterpolation(
  slot: unknown,
  fillContext: unknown,
  sheet?: StyleSheet,
  compiler?: Compiler,
  fragmentsOut?: (FastPathFragment | null)[],
  slotIndex?: number,
  embedded?: boolean
): string | null {
  if (typeof slot === 'string') return slot;
  if (typeof slot === 'number') return String(slot);
  if (slot === null || slot === undefined || slot === false) return '';
  const t = typeof slot;
  if (t === 'function' || t === 'object') {
    // Styled-component reference (`function` in React 19, `object` for
    // forwardRef-based components from older callers).
    if ((slot as { styledComponentId?: string }).styledComponentId !== undefined) {
      return '.' + (slot as { styledComponentId: string }).styledComponentId;
    }
    // Keyframes reference. Inject into the sheet and substitute the
    // compiler-hashed name; bail when the caller hasn't supplied a sheet
    // (e.g. native, test paths) so legacy behavior stays observable.
    if (t === 'object' && KEYFRAMES_SYMBOL in (slot as object)) {
      if (sheet === undefined || compiler === undefined) return null;
      const kf = slot as KeyframesClass;
      kf.inject(sheet, compiler);
      return kf.getName(compiler);
    }
    // css`` fragment ref returned from a function. Embedded slots
    // stringify the fragment as text (block sibling-splice would corrupt
    // the surrounding value/selector). Standalone slots populate the
    // fragments side table for AST splicing in fillAst.
    if (Array.isArray(slot)) {
      const frag = resolveFragment(slot as RuleSet<any>, fillContext, sheet, compiler);
      if (frag === null) return null;
      if (embedded) return stringifyEmbeddedFragment(frag);
      if (fragmentsOut === undefined || slotIndex === undefined) return null;
      fragmentsOut[slotIndex] = frag;
      return '';
    }
    // Plain-object style block returned from a function (`css(p => ({...}))`).
    // `objectToCSS` resolves nested function values against `fillContext`
    // and stringifies the rest. Returns `null` only for shapes that need
    // Source-aware splicing (e.g. tagged `css\`...\`` fragments inside an
    // object value); the caller bails on null.
    if (t === 'object' && isPlainObject(slot)) {
      return objectToCSS(slot as Record<string, unknown>, fillContext);
    }
    if (t === 'function') {
      if ((slot as { $$typeof?: symbol }).$$typeof === CLIENT_REFERENCE) return null;
      const fn = slot as (ctx: unknown) => unknown;
      if (fn.length > 1) return null; // multi-arg functions belong to the legacy path
      return resolveInterpolation(
        fn(fillContext),
        fillContext,
        sheet,
        compiler,
        fragmentsOut,
        slotIndex,
        embedded
      );
    }
    return null;
  }
  return null;
}

/**
 * Substitute `\0I<n>\0` sentinels in node strings and splice resolved
 * `InterpolationNode`s (fragments or parsed strings) as siblings. Returns
 * `null` to bail when block-level filled text carries unparseable structure.
 */
export function fillAst(
  nodes: Root,
  filled: ReadonlyArray<string>,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): Root | null {
  const out: Node[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const filledNode = fillNode(node, filled, fragments);
    if (filledNode === null) return null;
    if (Array.isArray(filledNode)) {
      for (let j = 0; j < filledNode.length; j++) out.push(filledNode[j]);
    } else if (filledNode !== undefined) {
      out.push(filledNode);
    }
  }
  return out;
}

function fillNode(
  node: Node,
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null | undefined
): Node | Node[] | undefined | null {
  switch (node.kind) {
    case NodeKind.Decl: {
      // Both prop and value carry `\0I<n>\0` for templates like
      // `${theme.vars.colors.bg}: #111;` (createTheme.vars overrides).
      const propRaw = substitute(node.prop, filled);
      if (propRaw === null) return null;
      const prop = propRaw === node.prop ? propRaw : trimWhitespace(propRaw);
      if (prop === '') return undefined;
      const value = substitute(node.value, filled);
      if (value === null) return null;
      // Re-normalize substituted values to match the parser's normalizeValue;
      // skip re-normalization on the static-decl warm path. Custom properties
      // preserve empty values (`--x: ;` is spec-legal).
      const final = value === node.value ? value : normalizeSubstituted(value);
      if (final === '' && !isCustomProperty(prop)) return undefined;
      const decl: DeclNode = { kind: NodeKind.Decl, prop, value: final };
      return decl;
    }
    case NodeKind.Rule: {
      const selectors: string[] = new Array(node.selectors.length);
      for (let i = 0; i < node.selectors.length; i++) {
        const sel = substitute(node.selectors[i], filled);
        if (sel === null) return null;
        selectors[i] = sel;
      }
      const children = fillAst(node.children, filled, fragments);
      if (children === null) return null;
      const rule: RuleNode = { kind: NodeKind.Rule, selectors, children };
      return rule;
    }
    case NodeKind.AtRule: {
      const prelude = substitute(node.prelude, filled);
      if (prelude === null) return null;
      const children = node.children === null ? null : fillAst(node.children, filled, fragments);
      if (children === null && node.children !== null) return null;
      const at: AtRuleNode = { kind: NodeKind.AtRule, name: node.name, prelude, children };
      return at;
    }
    case NodeKind.Keyframes: {
      const prelude = substitute(node.prelude, filled);
      if (prelude === null) return null;
      const frames: KeyframeFrame[] = new Array(node.frames.length);
      for (let i = 0; i < node.frames.length; i++) {
        const frame = node.frames[i];
        const decls: DeclNode[] = new Array(frame.children.length);
        for (let j = 0; j < frame.children.length; j++) {
          const decl = frame.children[j];
          const value = substitute(decl.value, filled);
          if (value === null) return null;
          decls[j] = { kind: NodeKind.Decl, prop: decl.prop, value };
        }
        frames[i] = { stops: frame.stops.slice(), children: decls };
      }
      const kf: KeyframesNode = { kind: NodeKind.Keyframes, name: node.name, prelude, frames };
      return kf;
    }
    case NodeKind.Interpolation: {
      // Fragment slot: splice the child's filled AST as siblings. The child's
      // sentinels resolve in its own index space.
      const frag = fragments ? fragments[node.index] : null;
      if (frag !== null && frag !== undefined) {
        const childFilled = fillAst(frag.source.ast, frag.filled, frag.fragments);
        if (childFilled === null) return null;
        return childFilled.length === 0 ? undefined : (childFilled as Node[]);
      }
      const fragment = filled[node.index];
      if (fragment === '' || fragment === undefined) return undefined;
      // String fragment: parse the substituted text and splice. The cache
      // amortizes the round-trip across repeated dynamic strings.
      const parsed = parseStringFragment(fragment);
      return parsed.length === 0 ? undefined : (parsed as Node[]);
    }
  }
}

/**
 * Replace `\0I<digits>\0` sentinels in `s` with `filled[index]`. Other
 * NUL-prefixed sequences (e.g. native theme `\0sc:` tokens) pass through.
 * Returns `null` when a substitution would inject CSS structural characters
 * (`;` `{` `}`), forcing the caller to bail to the legacy path.
 */
function substitute(s: string, filled: ReadonlyArray<string>): string | null {
  if (s.length === 0 || s.indexOf('\0') === -1) return s;

  const len = s.length;
  let out = '';
  let i = 0;
  let segStart = 0;

  while (i < len) {
    if (s.charCodeAt(i) !== NUL) {
      i++;
      continue;
    }
    if (i + 2 >= len || s.charCodeAt(i + 1) !== UPPER_I) {
      // Non-interpolation NUL prefix (e.g. native theme `\0s`).
      i++;
      continue;
    }

    let j = i + 2;
    let index = 0;
    let digits = 0;
    while (j < len) {
      const c = s.charCodeAt(j);
      if (c >= 48 && c <= 57) {
        index = index * 10 + (c - 48);
        digits++;
        j++;
        continue;
      }
      break;
    }
    if (digits === 0 || j >= len || s.charCodeAt(j) !== NUL) {
      // Malformed sentinel; treat as opaque text.
      i++;
      continue;
    }
    if (index >= filled.length) return null;
    const replacement = filled[index];
    if (hasStructural(replacement)) return null;

    out += s.substring(segStart, i);
    out += replacement;
    i = j + 1;
    segStart = i;
  }

  if (segStart === 0) return s;
  out += s.substring(segStart);
  return out;
}

function trimWhitespace(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end) {
    const c = s.charCodeAt(start);
    if (c === SPACE || c === TAB || c === LF || c === CR) start++;
    else break;
  }
  while (end > start) {
    const c = s.charCodeAt(end - 1);
    if (c === SPACE || c === TAB || c === LF || c === CR) end--;
    else break;
  }
  if (start === 0 && end === s.length) return s;
  return s.substring(start, end);
}

/**
 * Mirror the parser's `normalizeValue` for substituted text. Output bytes
 * match the legacy `compiler(css, ...)` path so SSR class hashes stay stable.
 */
function normalizeSubstituted(value: string): string {
  const trimmed = trimWhitespace(value);
  if (trimmed.length === 0) return trimmed;
  if (trimmed.indexOf(',') === -1) return trimmed;
  return stripCommaSpaces(trimmed);
}

function isCustomProperty(prop: string): boolean {
  return prop.length > 2 && prop.charCodeAt(0) === HYPHEN && prop.charCodeAt(1) === HYPHEN;
}

function hasStructural(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 59 /* ; */ || c === 123 /* { */ || c === 125 /* } */) return true;
  }
  return false;
}

/**
 * Per-string AST cache for block-level fragments returned as raw CSS text.
 * Bounded so streaming unique strings can't leak.
 */
const stringFragmentCache = new Map<string, Root>();
const STRING_FRAGMENT_CACHE_LIMIT = 200;

function parseStringFragment(s: string): Root {
  const cached = stringFragmentCache.get(s);
  if (cached !== undefined) return cached;
  const parsed = parse(s);
  fifoSet(stringFragmentCache, s, parsed, STRING_FRAGMENT_CACHE_LIMIT);
  return parsed;
}
