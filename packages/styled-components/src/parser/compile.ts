import type KeyframesClass from '../models/Keyframes';
import type { CompiledKeyframes } from '../models/Keyframes';
import type StyleSheet from '../sheet';
import type { Compiler, RuleSet } from '../types';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import getComponentName from '../utils/getComponentName';
import isPlainObject from '../utils/isPlainObject';
import { fifoSet } from '../utils/fifoMap';
import { objectToCSS } from '../utils/objectToCSS';
import { normalize } from '../utils/normalize';
import { warnOnce } from '../utils/warnOnce';
import { AT, COMMA } from '../utils/charCodes';
import {
  DeclNode,
  DYN,
  Node,
  NodeKind,
  Root,
  StaticDeclNode,
  StaticKeyframeFrame,
  StaticKeyframesNode,
  StaticNode,
  StaticRoot,
  TemplateValue,
} from './ast';
import { emitWeb, EmitOptions } from './emit-web';
import {
  isCustomProperty,
  parse,
  rulesToFrames,
  staysOneField,
  stripCommaSpaces,
  trimRange,
  wholeStatements,
} from './parser';
import { CLIENT_REFERENCE, getSource, InterpolationKind, isCssProduct, Source } from './source';

/**
 * Resolved `${mixin}` fragment. Carried via a parallel side table so
 * `fillAst` can splice the child's AST as siblings without re-parsing.
 */
export interface FastPathFragment {
  source: Source;
  /** @internal */
  filled: string[];
  /** @internal */
  fragments: (FastPathFragment | null)[] | null;
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

/**
 * Resolve `Source` slots into a `string[]`. Dispatches on pre-classified
 * `kinds` so the hot path skips per-slot typeof checks.
 *
 * `outBuffer` is reused to keep warm renders allocation-free.
 * `compiler` + `outKeyframes` are both required to resolve `${kf}` slots ;
 * the parser is pure, callers consume the buffer through their own
 * generate→inject pipeline. Absence of either bails on kf interpolation.
 * `outFragments` receives `${mixin}` slot resolutions for AST splicing.
 *
 * Returns `null` on any shape that has no text form; the caller renders no
 * styles for it. The slots after one still run, since each may call hooks.
 */
export function evaluateForFastPath(
  source: Source,
  fillContext: unknown,
  outBuffer: string[] | undefined,
  compiler: Compiler | undefined,
  outFragments: (FastPathFragment | null)[],
  outKeyframes?: CompiledKeyframes[]
): string[] | null {
  const interps = source.interpolations;
  const n = interps.length;
  if (n === 0) return EMPTY_FILLED;
  const kinds = source.kinds;
  const statics = source.staticValues;
  const filled = outBuffer || new Array<string>(n);
  if (filled.length !== n) filled.length = n;
  if (outFragments.length !== n) outFragments.length = n;
  let hasText = true;
  for (let i = 0; i < n; i++) {
    outFragments[i] = null;
    const kind = kinds[i];
    if (kind === InterpolationKind.Static) {
      filled[i] = statics[i];
      continue;
    }

    const stateless = kind === InterpolationKind.StatelessFn;
    const slot = stateless ? (interps[i] as (ctx: unknown) => unknown)(fillContext) : interps[i];
    const resolved =
      typeof slot === 'string'
        ? slot
        : kind === InterpolationKind.Fragment
          ? resolveFragment(slot as ReadonlyArray<unknown>, fillContext, compiler, outKeyframes)
          : resolveInterpolation(slot, fillContext, compiler, outKeyframes);
    if (resolved === null) {
      // Likely a non-styled component used as a selector ref.
      if (
        __DEV__ &&
        stateless &&
        typeof slot === 'object' &&
        slot !== null &&
        !Array.isArray(slot) &&
        !isPlainObject(slot)
      ) {
        const name = getComponentName(interps[i] as never);
        warnOnce(
          'non-styled-selector',
          `${name} is not a styled component and cannot be referred to via component selector. Wrap it with styled() first. See https://styled-components.com/docs/advanced#referring-to-other-components for more details.`,
          name
        );
      }
      hasText = false;
    } else if (typeof resolved === 'string') {
      filled[i] = resolved;
    } else if (source.slotIsStandalone[i]) {
      // Block-position: splice the child's AST as parent siblings via the
      // fragments side table.
      outFragments[i] = resolved;
      filled[i] = '';
    } else {
      filled[i] = stringifyEmbeddedFragment(resolved);
    }
  }
  return hasText ? filled : null;
}

const EMPTY_FILLED: string[] = [];

/** A slot's text with nothing to add to a selector: empty, or a falsy number from `${count && mixin}`. */
const holdsNothing = (text: string): boolean => text === '' || text === '0' || text === 'NaN';

/**
 * Resolve a `css\`...\`` fragment slot into a `FastPathFragment`. The child's
 * interpolations evaluate against the parent's fill context so nested function
 * slots see the same props and theme. Returns `null` when the child lacks a
 * Source or any nested slot bails.
 */
function resolveFragment(
  rules: ReadonlyArray<unknown>,
  fillContext: unknown,
  compiler?: Compiler,
  outKeyframes?: CompiledKeyframes[]
): FastPathFragment | null {
  const childSource = getSource(rules as RuleSet<never>);
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
  return {
    source: childSource,
    filled: childFilled === EMPTY_FILLED ? [] : childFilled,
    fragments: hasAnyFragment(childFragments) ? childFragments : null,
  };
}

/**
 * Reconstruct the joined CSS string from `Source.strings` and resolved
 * interpolation values, the text class names hash so they stay stable across
 * server and client. Fragment slots expand recursively.
 */
export function buildHashCSS(
  strings: ReadonlyArray<string>,
  filled: ReadonlyArray<string>,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): string {
  let out = strings[0] || '';
  for (let i = 0; i < filled.length; i++) {
    const frag = fragments ? fragments[i] : null;
    if (frag) {
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
 * in `fillDecl`. Internal whitespace is preserved; users may write
 * meaningful runs inside fragments.
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
    if (frag) {
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
 */
export function compileWebFilled(
  source: Source,
  filled: ReadonlyArray<string>,
  parentSelector: string,
  options?: EmitOptions,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): string[] {
  // `fillAst` is identity-preserving: when `filled.length === 0` (no
  // interpolations), it returns `source.ast` by reference and types it
  // as `StaticRoot`. So the no-interpolation fast path costs one extra
  // function call but avoids a duplicate `as StaticRoot` cast here.
  return emitWeb(fillAst(source.ast, filled, fragments), parentSelector, options);
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
 * Coerce a runtime value to its substituted text, or to a fragment the caller places.
 * Handles function-returns-X cases (the directly-typed slot shapes are pre-classified
 * in `parseSource` and never reach here). Returns `null` to bail.
 *
 * Client reference proxies are bailed before invocation.
 */
function resolveInterpolation(
  slot: unknown,
  fillContext: unknown,
  compiler?: Compiler,
  outKeyframes?: CompiledKeyframes[]
): string | FastPathFragment | null {
  if (typeof slot === 'string') return slot;
  if (typeof slot === 'number' || typeof slot === 'bigint') return String(slot);
  if (slot === null || slot === undefined || typeof slot === 'boolean') return '';
  const t = typeof slot;
  if (t !== 'function' && t !== 'object') return null;

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
  // css`` fragment ref returned from a function; the caller splices it as
  // siblings in block position and stringifies it inside a value or selector.
  if (isCssProduct(slot)) return resolveFragment(slot, fillContext, compiler, outKeyframes);

  // A plain array, not a css`` product: its items join as text.
  if (Array.isArray(slot)) {
    let text = '';
    for (let i = 0; i < slot.length; i++) {
      const item = resolveInterpolation(slot[i], fillContext, compiler, outKeyframes);
      if (item === null) return null;
      text += typeof item === 'string' ? item : stringifyEmbeddedFragment(item);
    }
    return text;
  }
  if (t === 'function') {
    if ((slot as { $$typeof?: symbol }).$$typeof === CLIENT_REFERENCE) return null;
    const fn = slot as (ctx: unknown) => unknown;
    return resolveInterpolation(fn(fillContext), fillContext, compiler, outKeyframes);
  }
  // An object with a `toString` of its own (a design token, a color class, a `Date`) reads as
  // that text, not as a block of declarations. A React element and a class with the default
  // `toString` have no text form.
  const toText = (slot as object).toString;
  if (toText && toText !== Object.prototype.toString) return String(slot);

  // Plain-object style block returned from a function (`css(p => ({...}))`).
  // `objectToCSS` resolves nested function values against `fillContext`
  // and stringifies the rest. Returns `null` for a `css\`...\`` fragment
  // inside an object value (needs Source-aware splicing) and for a function
  // value met with no `fillContext` (always set here); the caller bails on null.
  return isPlainObject(slot) ? objectToCSS(slot, fillContext) : null;
}

/**
 * Replace structural splices in node fields ({@link TemplateValue})
 * with their resolved string forms; lift `InterpolationNode` slots into
 * spliced siblings (string fragments or pre-parsed `${mixin}` ASTs).
 * The blocks come from the template alone: a value is read on its own, so it
 * cannot open or close one of them.
 *
 * Identity-preserving: when no descendant of any input node depends on
 * `filled`, returns `nodes` itself; `fillNode` returns a static subtree
 * by reference.
 */
export function fillAst(
  nodes: Root,
  filled: ReadonlyArray<string>,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): StaticRoot {
  let out: StaticNode[] | null = null;
  /** Selector text from block-position slots, waiting for a rule to start (`${Child} h2 {`). */
  let head = '';
  let headStart = 0;
  // When `out` stays null we know every node serialized as identity (no
  // TemplateValue realized). The input `nodes` therefore already had
  // string-only fields and we can return it as a `StaticRoot`. The cast
  // is structural: the underlying objects are the same; only the field
  // type witness differs.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (out !== null && head !== '' && node.kind === NodeKind.Rule) {
      const selectors = joinSelectors(node.selectors, filled);
      if (!atRuleEnds(head, selectors)) {
        out.length = headStart;
        const rule = fillHead(head + selectors, fillAst(node.children, filled, fragments));
        for (let j = 0; j < rule.length; j++) out.push(rule[j]);
        head = '';
        continue;
      }
    }

    const filledNode = fillNode(node, filled, fragments);
    if (out === null && (filledNode as Node) === node) continue;
    if (out === null) out = nodes.slice(0, i) as StaticNode[];

    if (node.kind !== NodeKind.Interpolation || node.ended) {
      head = '';
    } else if (i + 1 < nodes.length && nodes[i + 1].kind !== NodeKind.Decl) {
      const fragment = fragments?.[node.index];
      const text = slotHeadText(
        fragment ? stringifyEmbeddedFragment(fragment) : filled[node.index],
        nodes[i + 1]
      );
      if (text === null) {
        head = '';
      } else if (text !== '') {
        if (head === '') headStart = out.length;
        head += text + ' ';
      }
    }

    if (Array.isArray(filledNode)) {
      for (let j = 0; j < filledNode.length; j++) out.push(filledNode[j]);
    } else if (filledNode !== undefined) {
      out.push(filledNode);
    }
  }
  return out === null ? (nodes as StaticRoot) : out;
}

/**
 * The text a block-position slot adds to a rule starting after it, empty when it holds
 * nothing (a falsy number counts, from `${count && mixin}`) and `null` when it holds
 * statements. A value spaced as `name: value` is a declaration. Unspaced, `a:hover` and a
 * minified `top:0` read alike, so what follows decides: a class, id, attribute, or `*` keeps
 * it a selector, anything else a declaration.
 */
function slotHeadText(value: string, next: Node): string | null {
  const text = trimWhitespace(value);
  if (holdsNothing(text)) return '';

  const first = next.kind === NodeKind.Rule ? next.selectors[0] : '';
  const named = /^[\w-]+\s*:(\s?)/.exec(text);
  return !staysOneField(text) ||
    normalize(text) !== text ||
    (named &&
      (named[1] || !'*.#['.includes((typeof first === 'string' ? first : first.chunks[0])[0])))
    ? null
    : text;
}

/**
 * Whether an at-rule with a prelude ends at `value`, leaving `after` as a rule of its own.
 * A query goes on through a list, or words up to a `(`: `${'@media screen'} and (color) {`.
 */
function atRuleEnds(value: string, after: string): boolean {
  return /^@\S+\s+\S/.test(value) && !/^\s*(?:,|$)|^[\w\s-]*\(/.test(after);
}

function fillNode(
  node: Node,
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null | undefined
): StaticNode | StaticNode[] | undefined {
  // Static subtree: no descendant reads `filled`, no TemplateValue fields
  // anywhere in this subtree (`markDynamic` sets `DYN` on every other node,
  // including every interpolation), so the existing node serves unchanged. The
  // widening cast is sound: an unmarked node is exactly `Root<string>` shape.
  if (!node[DYN]) return node as StaticNode;

  switch (node.kind) {
    case NodeKind.Decl:
      return fillDecl(node, filled);
    case NodeKind.Rule: {
      const children = fillAst(node.children, filled, fragments);
      const filledSelectors: string[] = [];
      for (let i = 0; i < node.selectors.length; i++) {
        const field = node.selectors[i];
        const sel = realize(field, filled, COMMA);
        // The parser picks the rule kind before a slot has a value, so a slot holding an
        // at-rule (`${media.md} {`) is read on its own too.
        const bare = sel === null || typeof field === 'string' ? null : trimWhitespace(sel);
        if (sel === null || bare?.charCodeAt(0) === AT) {
          // A value opening the head and ending a statement reads ahead of it, leaving only
          // authored text in the head: `${mixin} &:hover {`.
          const first = node.selectors[0];
          const opening =
            typeof first !== 'string' && first.chunks[0] === '' ? filled[first.slots[0]] : '';
          const headText = joinSelectors(node.selectors, filled);
          const lead =
            /[;}]\s*$/.test(normalize(opening)) ||
            atRuleEnds(opening, headText.slice(opening.length))
              ? opening
              : '';
          return parseValue(lead).concat(fillHead(headText.slice(lead.length), children));
        }
        if (bare === null || node.selectors.length === 1 || !holdsNothing(bare)) {
          // Trimmed: a self-reference is recognized by the selector starting and ending with it.
          filledSelectors.push(bare ?? sel);
        }
      }
      if (filledSelectors.length === 0) return fillHead('', children);
      return { kind: NodeKind.Rule, selectors: filledSelectors, children };
    }
    case NodeKind.AtRule: {
      const children = node.children === null ? null : fillAst(node.children, filled, fragments);
      const prelude = realize(node.prelude, filled);
      // A name holding a value can change what the at-rule is (`@${'-webkit-'}keyframes`).
      if (typeof node.name !== 'string' || prelude === null) {
        const head = atRuleHead(node.name, node.prelude, filled);
        return children === null ? parseValue(head + ';') : fillHead(head, children);
      }
      return { kind: NodeKind.AtRule, name: node.name, prelude, children };
    }
    case NodeKind.Keyframes: {
      const frames: StaticKeyframeFrame[] = [];
      for (let i = 0; i < node.frames.length; i++) {
        const frame = node.frames[i];
        const decls = frame.children
          .flatMap(child => fillDecl(child, filled) ?? [])
          .filter((child): child is StaticDeclNode => child.kind === NodeKind.Decl);
        const stops = frame.stops.map(stop => fieldText(stop, filled));
        const stopText = stops.join(',');
        if (staysOneField(stopText)) {
          frames.push({ stops, children: decls });
        } else {
          const read = rulesToFrames(fillHead(stopText, decls));
          for (let k = 0; k < read.length; k++) frames.push(read[k]);
        }
      }
      const prelude = realize(node.prelude, filled);
      if (typeof node.name !== 'string' || prelude === null) {
        return fillHead(atRuleHead(node.name, node.prelude, filled), [], frames);
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
      if (frag) {
        return fillAst(frag.source.ast, frag.filled, frag.fragments);
      }
      const fragment = filled[node.index];
      if (!fragment) return undefined;
      // String fragment: parse the substituted text and splice. The cache
      // amortizes the round-trip across repeated dynamic strings.
      return parseValue(fragment);
    }
  }
}

function fillDecl(
  node: DeclNode,
  filled: ReadonlyArray<string>
): StaticDeclNode | StaticNode[] | undefined {
  // Both prop and value can be TemplateValue for templates like
  // `${theme.vars.colors.bg}: #111;` (createTheme.vars overrides).
  const propRaw = realize(node.prop, filled);
  const valueRaw = realize(node.value, filled);
  if (propRaw === null || valueRaw === null) {
    return parseValue(fieldText(node.prop, filled) + ':' + fieldText(node.value, filled));
  }

  const prop = typeof node.prop !== 'string' ? trimWhitespace(propRaw) : propRaw;
  if (prop === '') return undefined;
  // Re-normalize substituted values to match the parser's normalizeValue
  // (trim, then strip spaces after top-level commas) so output bytes match
  // authored text; skip it on the static-decl warm path. Custom
  // properties preserve empty values (`--x: ;` is spec-legal).
  const value =
    typeof node.value === 'string'
      ? valueRaw
      : __NATIVE__
        ? trimWhitespace(valueRaw)
        : stripCommaSpaces(trimWhitespace(valueRaw));
  if (value === '' && !isCustomProperty(prop)) return undefined;
  return { kind: NodeKind.Decl, prop, value };
}

/**
 * Read a rule head holding a value on its own and give the block it opens the template's
 * `children`, so a value can neither move them nor name the rule from text outside the head.
 * A head that does not read as one statement, or that opens no named block, leaves the rule
 * and its children out; rules the value wrote whole ahead of the head stay.
 */
function fillHead(
  head: string,
  children: StaticRoot,
  frames?: StaticKeyframeFrame[]
): StaticNode[] {
  const nodes = parseValue(head + '{}');
  const block = staysOneField(normalize(head)) ? nodes[nodes.length - 1] : undefined;
  const opened: StaticNode | null =
    block === undefined
      ? null
      : block.kind === NodeKind.Rule &&
          block.children.length === 0 &&
          block.selectors.join('') !== ''
        ? { ...block, children }
        : block.kind === NodeKind.AtRule && block.children?.length === 0
          ? { ...block, children }
          : block.kind === NodeKind.Keyframes && block.frames.length === 0
            ? { ...block, frames: frames ?? rulesToFrames(children) }
            : null;
  if (opened !== null) return nodes.slice(0, -1).concat(opened);

  if (__DEV__) {
    const shown = head.slice(0, 80);
    warnOnce(
      'value-ended-head',
      `An interpolated value leaves "${shown}" with no selector or condition for the block after it, so that block was dropped. Write the selector or condition whole, with no \`;\`, before the \`{\`.`,
      shown
    );
  }
  return nodes.filter(node => node.kind !== NodeKind.AtRule || node.children !== null);
}

function atRuleHead(
  name: string | TemplateValue,
  prelude: string | TemplateValue,
  filled: ReadonlyArray<string>
): string {
  return '@' + fieldText(name, filled) + ' ' + fieldText(prelude, filled);
}

function joinSelectors(
  selectors: ReadonlyArray<string | TemplateValue>,
  filled: ReadonlyArray<string>
): string {
  let out = '';
  for (let i = 0; i < selectors.length; i++) {
    out += (i > 0 ? ',' : '') + fieldText(selectors[i], filled);
  }
  return out;
}

/** Splice the filled values between a field's pre-extracted chunks. */
export function fieldText(field: string | TemplateValue, filled: ReadonlyArray<string>): string {
  if (typeof field === 'string') return field;
  const { chunks, slots } = field;
  let out = chunks[0];
  for (let i = 0; i < slots.length; i++) {
    out += filled[slots[i]];
    out += chunks[i + 1];
  }
  return out;
}

/** The filled text of a field, or `null` when the caller must read it on its own. */
function realize(
  field: string | TemplateValue,
  filled: ReadonlyArray<string>,
  stop?: number
): string | null {
  if (typeof field === 'string') return field;
  const out = fieldText(field, filled);
  return staysOneField(out, stop) ? out : null;
}

function trimWhitespace(s: string): string {
  return trimRange(s, 0, s.length);
}

/**
 * Per-string AST cache for text a value reads on its own.
 * Bounded so streaming unique strings can't leak.
 *
 * `parse` runs without `templates`, so a `\0I` inside the text stays plain text and the
 * AST is fully static; a value cannot read another value through a sentinel.
 */
const valueCache = new Map<string, StaticRoot>();
const VALUE_CACHE_LIMIT = 200;

/** Parse a value on its own, so all it can hold is declarations and whole rules. */
function parseValue(s: string): StaticRoot {
  const cached = valueCache.get(s);
  if (cached !== undefined) return cached;

  const parsed = parse(wholeStatements(s), { keepCommaSpaces: __NATIVE__ });
  fifoSet(valueCache, s, parsed, VALUE_CACHE_LIMIT);
  return parsed;
}
