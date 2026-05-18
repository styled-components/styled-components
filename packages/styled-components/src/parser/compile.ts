import type KeyframesClass from '../models/Keyframes';
import type { CompiledKeyframes } from '../models/Keyframes';
import type StyleSheet from '../sheet';
import type { Compiler, RuleSet } from '../types';
import { isWS } from '../utils/charCodes';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import getComponentName from '../utils/getComponentName';
import isPlainObject from '../utils/isPlainObject';
import { fifoSet } from '../utils/fifoMap';
import { objectToCSS } from '../utils/objectToCSS';
import { warnOnce } from '../utils/warnOnce';
import {
  DYN,
  Node,
  NodeKind,
  Root,
  StaticAtRuleNode,
  StaticDeclNode,
  StaticKeyframeFrame,
  StaticKeyframesNode,
  StaticNode,
  StaticRoot,
  StaticRuleNode,
  TemplateValue,
} from './ast';
import { emitWeb, EmitOptions } from './emit-web';
import { isCustomProperty, parse, stripCommaSpaces } from './parser';
import { CLIENT_REFERENCE, getSource, InterpolationKind, Source } from './source';

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
 * `compiler` + `outKeyframes` are both required to resolve `${kf}` slots ;
 * the parser is pure, callers consume the buffer through their own
 * generate→inject pipeline. Absence of either bails on kf interpolation.
 * `outFragments`, when supplied, receives `${mixin}` slot resolutions for
 * AST splicing; absence forces bail on fragment slots.
 *
 * Returns `null` on any shape the fast path doesn't cover; the caller then
 * falls back to recompiling the joined CSS string via `compiler.compile`.
 */
export function evaluateForFastPath(
  source: Source,
  fillContext: unknown,
  outBuffer?: string[],
  compiler?: Compiler,
  outFragments?: (FastPathFragment | null)[],
  outKeyframes?: CompiledKeyframes[]
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
    const standalone = source.slotIsStandalone[i];
    const embedded = !standalone;
    if (kind === InterpolationKind.StatelessFn) {
      const fn = interps[i] as (ctx: unknown) => unknown;
      const result = fn(fillContext);
      if (typeof result === 'string') {
        filled[i] = result;
      } else {
        const resolved = resolveInterpolation(
          result,
          fillContext,
          compiler,
          outFragments,
          i,
          embedded,
          outKeyframes
        );
        if (resolved === null) {
          // Likely a non-styled component used as a selector ref.
          if (
            __DEV__ &&
            typeof result === 'object' &&
            result !== null &&
            !Array.isArray(result) &&
            !isPlainObject(result)
          ) {
            const name = getComponentName(fn as never);
            warnOnce(
              'non-styled-selector',
              `${name} is not a styled component and cannot be referred to via component selector. See https://styled-components.com/docs/advanced#referring-to-other-components for more details.`,
              name
            );
          }
          return null;
        }
        filled[i] = resolved;
      }
    } else if (kind === InterpolationKind.Static) {
      filled[i] = statics[i];
    } else if (kind === InterpolationKind.Keyframes) {
      if (compiler === undefined || outKeyframes === undefined) return null;
      const kf = interps[i] as KeyframesClass;
      const compiled = kf.compile(compiler);
      filled[i] = compiled.name;
      outKeyframes.push(compiled);
    } else if (kind === InterpolationKind.Fragment) {
      const frag = resolveFragment(interps[i] as RuleSet<any>, fillContext, compiler, outKeyframes);
      if (frag === null) return null;
      if (standalone) {
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
        compiler,
        outFragments,
        i,
        embedded,
        outKeyframes
      );
      if (resolved === null) return null;
      filled[i] = resolved;
    }
  }
  return filled;
}

const EMPTY_FILLED: string[] = [];

/**
 * Resolve a `css\`...\`` fragment slot into a `FastPathFragment`. The child's
 * interpolations evaluate against the parent's fill context so nested function
 * slots see the same props and theme. Returns `null` when the child lacks a
 * Source or any nested slot bails.
 */
function resolveFragment(
  rules: RuleSet<any>,
  fillContext: unknown,
  compiler?: Compiler,
  outKeyframes?: CompiledKeyframes[]
): FastPathFragment | null {
  const childSource = getSource(rules);
  if (childSource === undefined) return null;
  const childFragments: (FastPathFragment | null)[] = [];
  const childFilled = evaluateForFastPath(
    childSource,
    fillContext,
    undefined,
    compiler,
    childFragments,
    outKeyframes
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

/**
 * Stringify a fragment for embedded substitution. Trims outer whitespace
 * so multi-line fragment templates flow correctly in mid-value position
 * (e.g. `animation: ${frag} linear`); whole-value position already trims
 * via `normalizeSubstituted`. Internal whitespace is preserved;users
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
  // `fillAst` is identity-preserving: when `filled.length === 0` (no
  // interpolations), it returns `source.ast` by reference and types it
  // as `StaticRoot`. So the no-interpolation fast path costs one extra
  // function call but avoids a duplicate `as StaticRoot` cast here.
  const filledAst = fillAst(source.ast, filled, fragments);
  if (filledAst === null) return null;
  return emitWeb(filledAst, parentSelector, options);
}

/**
 * Test wrapper: evaluate + fill + emit in one call. Production renders split
 * the steps so per-instance caches can lookup between evaluate and fill.
 * `sheet`, when supplied, receives any `${kf}`-collected keyframes;matches
 * the real generate→inject contract that production callers implement.
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
  const keyframes: CompiledKeyframes[] = [];
  const filled = evaluateForFastPath(
    source,
    fillContext,
    undefined,
    compiler,
    fragments,
    keyframes
  );
  if (filled === null) return null;
  if (sheet !== undefined) {
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      if (!sheet.hasNameForId(kf.id, kf.name)) {
        sheet.insertRules(kf.id, kf.name, kf.rules);
      }
    }
  }
  return compileWebFilled(
    source,
    filled,
    parentSelector,
    options,
    fragments.length > 0 ? fragments : null
  );
}

/**
 * Coerce a runtime value to its substituted text. Handles
 * function-returns-X cases (the directly-typed slot shapes are pre-classified
 * in `parseSource` and never reach here). Returns `null` to bail.
 *
 * Client reference proxies are bailed before invocation; the string-input
 * compile path issues the canonical dev warning.
 */
function resolveInterpolation(
  slot: unknown,
  fillContext: unknown,
  compiler?: Compiler,
  fragmentsOut?: (FastPathFragment | null)[],
  slotIndex?: number,
  embedded?: boolean,
  outKeyframes?: CompiledKeyframes[]
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
    // Keyframes reference. Caller's `outKeyframes` carries the compiled
    // payload through their own generate→inject pipeline; bail when missing.
    if (t === 'object' && KEYFRAMES_SYMBOL in (slot as object)) {
      if (compiler === undefined || outKeyframes === undefined) return null;
      const kf = slot as KeyframesClass;
      const compiled = kf.compile(compiler);
      outKeyframes.push(compiled);
      return compiled.name;
    }
    // css`` fragment ref returned from a function. Embedded slots
    // stringify the fragment as text (block sibling-splice would corrupt
    // the surrounding value/selector). Standalone slots populate the
    // fragments side table for AST splicing in fillAst.
    if (Array.isArray(slot)) {
      const frag = resolveFragment(slot as RuleSet<any>, fillContext, compiler, outKeyframes);
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
      // Design-token shape; an own `toString` on the object means the
      // author wants a stringified value, not iteration of every key as a
      // CSS declaration. Honor the explicit override before iterating.
      if (Object.prototype.hasOwnProperty.call(slot, 'toString')) {
        return String(slot);
      }
      return objectToCSS(slot as Record<string, unknown>, fillContext);
    }
    if (t === 'function') {
      if ((slot as { $$typeof?: symbol }).$$typeof === CLIENT_REFERENCE) return null;
      const fn = slot as (ctx: unknown) => unknown;
      if (fn.length > 1) return null; // multi-arg functions only resolve via the string-input compile path
      return resolveInterpolation(
        fn(fillContext),
        fillContext,
        compiler,
        fragmentsOut,
        slotIndex,
        embedded,
        outKeyframes
      );
    }
    return null;
  }
  return null;
}

/**
 * Read the parse-time `[DYN]` flag set by `markDynamic` in `source.ts`.
 * `true` means the node, or any descendant, depends on a runtime
 * interpolation slot, so `fillNode` must walk it. Falsy means the subtree
 * is structurally fixed across renders, so `fillNode` returns the existing
 * node by reference. InterpolationNodes are always dynamic by definition.
 *
 * Single hidden-class slot read per call; the early-v7 lazy `WeakMap` is
 * gone (`perf_cache_layout.md`).
 */
function dynamic(node: Node): boolean {
  return node.kind === NodeKind.Interpolation
    ? true
    : (node as Exclude<Node, { kind: NodeKind.Interpolation }>)[DYN] === true;
}

/**
 * Replace structural splices in node fields ({@link TemplateValue})
 * with their resolved string forms; lift `InterpolationNode` slots into
 * spliced siblings (string fragments or pre-parsed `${mixin}` ASTs).
 * Returns `null` to bail when block-level filled text carries
 * unparseable structure (structural CSS chars in a substituted slot).
 *
 * Identity-preserving: when no descendant of any input node depends on
 * `filled`, returns `nodes` itself; per-node identity is preserved
 * through `fillNode` (Phase A's static-subtree fast path).
 */
export function fillAst(
  nodes: Root,
  filled: ReadonlyArray<string>,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): StaticRoot | null {
  let out: StaticNode[] | null = null;
  // When `out` stays null we know every node serialized as identity (no
  // TemplateValue realized). The input `nodes` therefore already had
  // string-only fields and we can return it as a `StaticRoot`. The cast
  // is structural: the underlying objects are the same; only the field
  // type witness differs.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const filledNode = fillNode(node, filled, fragments);
    if (filledNode === null) return null;

    if (Array.isArray(filledNode)) {
      if (out === null) {
        out = nodes.slice(0, i) as StaticNode[];
      }
      for (let j = 0; j < filledNode.length; j++) out.push(filledNode[j]);
    } else if (filledNode === undefined) {
      if (out === null) {
        out = nodes.slice(0, i) as StaticNode[];
      }
    } else if ((filledNode as Node) !== node) {
      if (out === null) {
        out = nodes.slice(0, i) as StaticNode[];
      }
      out.push(filledNode);
    } else if (out !== null) {
      out.push(filledNode);
    }
  }
  return out === null ? (nodes as StaticRoot) : out;
}

function fillNode(
  node: Node,
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null | undefined
): StaticNode | StaticNode[] | undefined | null {
  // Static subtree: no descendant reads `filled`, no TemplateValue fields
  // anywhere in this subtree (`markDynamic` guarantees this), so the
  // existing node serves unchanged. Phase A's identity-preservation
  // optimization for cache-miss render. The widening cast is sound: the
  // `dynamic` predicate's invariant is exactly `Root<string>` shape.
  if (!dynamic(node)) return node as StaticNode;

  switch (node.kind) {
    case NodeKind.Decl: {
      // Both prop and value can be TemplateValue for templates like
      // `${theme.vars.colors.bg}: #111;` (createTheme.vars overrides).
      const propRaw = realize(node.prop, filled);
      if (propRaw === null) return null;
      const prop =
        typeof node.prop !== 'string' && propRaw !== '' ? trimWhitespace(propRaw) : propRaw;
      if (prop === '') return undefined;
      const valueRaw = realize(node.value, filled);
      if (valueRaw === null) return null;
      // Re-normalize substituted values to match the parser's normalizeValue;
      // skip re-normalization on the static-decl warm path. Custom properties
      // preserve empty values (`--x: ;` is spec-legal).
      const final = typeof node.value !== 'string' ? normalizeSubstituted(valueRaw) : valueRaw;
      if (final === '' && !isCustomProperty(prop)) return undefined;
      const decl: StaticDeclNode = { kind: NodeKind.Decl, prop, value: final };
      return decl;
    }
    case NodeKind.Rule: {
      // Realize every selector. If the input was already string-only and
      // children identity is preserved, we return the input node by
      // reference (Phase A fast path). The cast widens the field-type
      // witness to `string`: justified because (a) every selector tested
      // as a string and (b) `children` reference-equals the realized
      // StaticNode[], so the input node was already a `StaticRuleNode`
      // shape at runtime.
      const filledSelectors: string[] = [];
      let selectorsChanged = false;
      for (let i = 0; i < node.selectors.length; i++) {
        const sel = realize(node.selectors[i], filled);
        if (sel === null) return null;
        filledSelectors[i] = sel;
        if (typeof node.selectors[i] !== 'string') selectorsChanged = true;
      }
      const children = fillAst(node.children, filled, fragments);
      if (children === null) return null;
      if (!selectorsChanged && (children as unknown) === node.children) {
        return node as unknown as StaticRuleNode;
      }
      return { kind: NodeKind.Rule, selectors: filledSelectors, children };
    }
    case NodeKind.AtRule: {
      // At-rule name with an interpolation: bail to the string-input path so
      // `parse()` can reclassify (e.g. `@${'-webkit-'}keyframes` → Keyframes
      // node, not AtRule). Fast path can't safely substitute the name without
      // re-parsing the substituted text.
      if (typeof node.name !== 'string') return null;
      const prelude = realize(node.prelude, filled);
      if (prelude === null) return null;
      const children = node.children === null ? null : fillAst(node.children, filled, fragments);
      if (children === null && node.children !== null) return null;
      if (typeof node.prelude === 'string' && (children as unknown) === node.children) {
        return node as unknown as StaticAtRuleNode;
      }
      return { kind: NodeKind.AtRule, name: node.name, prelude, children };
    }
    case NodeKind.Keyframes: {
      if (typeof node.name !== 'string') return null;
      const prelude = realize(node.prelude, filled);
      if (prelude === null) return null;
      const frames: StaticKeyframeFrame[] = [];
      for (let i = 0; i < node.frames.length; i++) {
        const frame = node.frames[i];
        const decls: StaticDeclNode[] = [];
        for (let j = 0; j < frame.children.length; j++) {
          const decl = frame.children[j];
          const value = realize(decl.value, filled);
          if (value === null) return null;
          // decl.prop in keyframe frames is preserved as-authored; if it
          // happened to be a TemplateValue we'd realize it too, but the
          // grammar (`50% { color: red }`) doesn't admit prop interpolation
          // here in practice. Treat it identically for safety.
          const propRaw = realize(decl.prop, filled);
          if (propRaw === null) return null;
          decls[j] = { kind: NodeKind.Decl, prop: propRaw, value };
        }
        const stops: string[] = [];
        for (let k = 0; k < frame.stops.length; k++) {
          const stop = realize(frame.stops[k], filled);
          if (stop === null) return null;
          stops[k] = stop;
        }
        frames[i] = { stops, children: decls };
      }
      const kf: StaticKeyframesNode = {
        kind: NodeKind.Keyframes,
        name: node.name,
        prelude,
        frames,
      };
      return kf;
    }
    case NodeKind.Interpolation: {
      // Fragment slot: splice the child's filled AST as siblings. The child's
      // splices resolve in its own index space.
      const frag = fragments ? fragments[node.index] : null;
      if (frag !== null && frag !== undefined) {
        const childFilled = fillAst(frag.source.ast, frag.filled, frag.fragments);
        if (childFilled === null) return null;
        return childFilled.length === 0 ? undefined : childFilled;
      }
      const fragment = filled[node.index];
      if (fragment === '' || fragment === undefined) return undefined;
      // String fragment: parse the substituted text and splice. The cache
      // amortizes the round-trip across repeated dynamic strings.
      const parsed = parseStringFragment(fragment);
      return parsed.length === 0 ? undefined : parsed;
    }
  }
}

/**
 * Realize a {@link TemplateValue} or pass through a static string.
 * Returns `null` when any spliced slot value would inject CSS structural
 * characters (`;` `{` `}`), forcing the caller to bail the fast path
 * to the string-input compile path. The slot-out-of-bounds case also
 * returns `null` for safety.
 *
 * Phase C: replaces the v7-pre-Phase-C `substitute(s, filled)` scan over
 * a `\0I<n>\0` sentinel string with a direct splice over pre-extracted
 * chunks + slot indices.
 */
function realize(field: string | TemplateValue, filled: ReadonlyArray<string>): string | null {
  if (typeof field === 'string') return field;
  const { chunks, slots } = field;
  let out = chunks[0];
  for (let i = 0; i < slots.length; i++) {
    const idx = slots[i];
    if (idx >= filled.length) return null;
    const value = filled[idx];
    for (let j = 0; j < value.length; j++) {
      const c = value.charCodeAt(j);
      if (c === 59 /* ; */ || c === 123 /* { */ || c === 125 /* } */) return null;
    }
    out += value;
    out += chunks[i + 1];
  }
  return out;
}

function trimWhitespace(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end) {
    const c = s.charCodeAt(start);
    if (isWS(c)) start++;
    else break;
  }
  while (end > start) {
    const c = s.charCodeAt(end - 1);
    if (isWS(c)) end--;
    else break;
  }
  if (start === 0 && end === s.length) return s;
  return s.substring(start, end);
}

/**
 * Mirror the parser's `normalizeValue` for substituted text. Output bytes
 * match the string-input `compiler.compile` path so SSR class hashes stay stable.
 */
function normalizeSubstituted(value: string): string {
  const trimmed = trimWhitespace(value);
  if (trimmed.length === 0) return trimmed;
  if (trimmed.indexOf(',') === -1) return trimmed;
  return stripCommaSpaces(trimmed);
}

/**
 * Per-string AST cache for block-level fragments returned as raw CSS text.
 * Bounded so streaming unique strings can't leak.
 *
 * The fragment string `s` is a runtime-resolved value (filled[node.index]
 * for an InterpolationNode), so it carries no `\0I` interpolation
 * sentinels;the parser produces a fully-static AST.
 */
const stringFragmentCache = new Map<string, StaticRoot>();
const STRING_FRAGMENT_CACHE_LIMIT = 200;

function parseStringFragment(s: string): StaticRoot {
  const cached = stringFragmentCache.get(s);
  if (cached !== undefined) return cached;
  const parsed = parse(s);
  fifoSet(stringFragmentCache, s, parsed, STRING_FRAGMENT_CACHE_LIMIT);
  return parsed;
}
