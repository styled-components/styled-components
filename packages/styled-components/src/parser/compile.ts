import type KeyframesClass from '../models/Keyframes';
import type { CompiledKeyframes, KeyframesCompiler } from '../models/Keyframes';
import type StyleSheet from '../sheet';
import type { Compiler, RuleSet } from '../types';
import { AT, CLOSE_BRACE, COLON, isIdentChar, isWS, SEMICOLON } from '../utils/charCodes';
import { fifoSet } from '../utils/fifoMap';
import getComponentName from '../utils/getComponentName';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import isPlainObject from '../utils/isPlainObject';
import { normalize } from '../utils/normalize';
import { objectToCSS } from '../utils/objectToCSS';
import { warnOnce } from '../utils/warnOnce';
import {
  DeclNode,
  DYN,
  InterpolationNode,
  KeyframeFrame,
  Node,
  NodeKind,
  Root,
  RuleNode,
  SlotHead,
  StaticAtRuleNode,
  StaticDeclNode,
  StaticKeyframeFrame,
  StaticKeyframesNode,
  StaticNode,
  StaticRoot,
  StaticRuleNode,
  TemplateValue,
} from './ast';
import { isKeyframesName } from './atRuleNames';
import { emitWeb, EmitOptions } from './emit-web';
import {
  isCustomProperty,
  parse,
  scanQPB,
  SlotEntry,
  splitTopLevelCommas,
  stripCommaSpaces,
  TOP_LEVEL,
} from './parser';
import {
  checkSlotValue,
  chunkChangesReading,
  splitDeclarations,
  VALUE_FAILED,
  VALUE_SEMICOLON,
} from './slotValue';
import {
  CLIENT_REFERENCE,
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

const EMPTY_SOURCE: Source = {
  ast: [],
  strings: [''],
  interpolations: [],
  kinds: [],
  staticValues: [],
  slotIsStandalone: [],
  slotEntries: [],
};

/**
 * Side-table entry for a slot whose value cannot be resolved (a non-styled
 * component, or a client reference). It contributes no text, and a rule it
 * heads is dropped rather than widened to the selector around it. Compared
 * by identity.
 */
const UNRESOLVED: FastPathFragment = { source: EMPTY_SOURCE, filled: [], fragments: null };

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
  const styledId = (value as { styledComponentId?: string }).styledComponentId;
  if (styledId !== undefined) return '.' + styledId;
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
      return standalone ? fragmentText(frag) : trimWhitespace(fragmentText(frag));
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
    return objectToCSS(value as Record<string, unknown>, r.context, frag =>
      resolveValue(frag, r, index, false, owner)
    );
  }
  return String(value);
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

/** A keyframes value's generated name; compiled for injection when the caller collects keyframes. */
function keyframesName(kf: KeyframesClass, r: Resolver): string {
  if (r.compiler === undefined) return kf.getName();
  if (r.keyframes === undefined) return kf.getName(r.compiler);
  const compiled = kf.compile(r.compiler);
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
 */
const arraySources = new WeakMap<ReadonlyArray<unknown>, Source>();

function resolveArrayFragment(arr: ReadonlyArray<unknown>, r: Resolver): FastPathFragment {
  let source = arraySources.get(arr);
  if (source === undefined) {
    const strings: string[] = [''];
    for (let i = 0; i < arr.length; i++) strings.push('');
    source = parseSource(strings, arr);
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

function fragmentText(frag: FastPathFragment): string {
  return buildHashCSS(frag.source.strings, frag.filled, frag.fragments);
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
 * An empty `parentSelector` marks a global style, whose top level has no
 * parent for a selector-less block to apply to.
 */
export function compileWebFilled(
  source: Source,
  filled: ReadonlyArray<string>,
  parentSelector: string,
  options?: EmitOptions,
  fragments?: ReadonlyArray<FastPathFragment | null> | null
): string[] {
  return emitWeb(
    fillSource(source, filled, fragments, parentSelector === ''),
    parentSelector,
    options
  );
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
): string[] {
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
 * Read the parse-time `[DYN]` flag set by the templated parse in `parser.ts`.
 * `true` means the node, or any descendant, depends on a runtime
 * interpolation slot, so `fillNode` must walk it. Falsy means the subtree
 * is structurally fixed across renders, so `fillNode` returns the existing
 * node by reference. InterpolationNodes are always dynamic by definition.
 */
function dynamic(node: Node): boolean {
  return node.kind === NodeKind.Interpolation
    ? true
    : (node as Exclude<Node, { kind: NodeKind.Interpolation }>)[DYN] === true;
}

/** One source's fill inputs, at one nesting position. */
interface Fill {
  entries: ReadonlyArray<SlotEntry | null>;
  filled: ReadonlyArray<string>;
  fragments: ReadonlyArray<FastPathFragment | null> | null | undefined;
  /** At the top level of a global style, where a block has no parent to apply to. */
  root: boolean;
}

/**
 * Fill a source's AST with its slot values: fields realize to text, slot
 * splices become their statements, heads resolve to rules. A value that
 * fails its check drops only its enclosing construct.
 *
 * Identity-preserving: when no node depends on `filled`, returns the AST
 * itself; per-node identity is preserved through `fillNode`.
 */
export function fillSource(
  source: Source,
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null | undefined,
  root = false
): StaticRoot {
  return fillNodes(source.ast, { entries: source.slotEntries, filled, fragments, root });
}

function nestedFill(fill: Fill): Fill {
  return fill.root ? { ...fill, root: false } : fill;
}

function fillNodes(nodes: Root, fill: Fill): StaticRoot {
  let out: StaticNode[] | null = null;
  // When `out` stays null every node filled as identity, so the input
  // already had string-only fields and serves as a `StaticRoot`.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const filledNode = fillNode(node, fill);

    if (Array.isArray(filledNode)) {
      if (out === null) out = nodes.slice(0, i) as StaticNode[];
      for (let j = 0; j < filledNode.length; j++) out.push(filledNode[j]);
    } else if (filledNode === undefined) {
      if (out === null) out = nodes.slice(0, i) as StaticNode[];
    } else if ((filledNode as Node) !== node) {
      if (out === null) out = nodes.slice(0, i) as StaticNode[];
      out.push(filledNode);
    } else if (out !== null) {
      out.push(filledNode);
    }
  }
  return out === null ? (nodes as StaticRoot) : out;
}

function fillNode(node: Node, fill: Fill): StaticNode | StaticNode[] | undefined {
  // Static subtree: the parse guarantees no TemplateValue field anywhere
  // below, so the node already has the `StaticNode` shape at runtime.
  if (!dynamic(node)) return node as StaticNode;

  switch (node.kind) {
    case NodeKind.Decl:
      return fillDecl(node, fill);
    case NodeKind.Rule:
      return fillRule(node, fill);
    case NodeKind.AtRule:
      return fillAtRule(node, fill);
    case NodeKind.Keyframes:
      return fillKeyframes(node.name, node.prelude, node.frames, fill);
    case NodeKind.Interpolation: {
      const spliced = spliceNodes(node.index, fill);
      return spliced.length === 0 ? undefined : spliced;
    }
  }
}

function fillDecl(node: DeclNode, fill: Fill): StaticDeclNode | StaticDeclNode[] | undefined {
  // Both prop and value can be TemplateValue for templates like
  // `${theme.vars.colors.bg}: #111;` (createTheme.vars overrides).
  const propRaw = realize(node.prop, fill, '');
  let split = realizedSemicolon;
  const valueRaw = propRaw === null ? null : realize(node.value, fill, '');
  if (propRaw === null || valueRaw === null) {
    if (__DEV__) warnDropped('declaration `' + fieldText(node.prop) + '`');
    return undefined;
  }
  if (realizedSemicolon) split = true;
  const prop = typeof node.prop !== 'string' ? trimWhitespace(propRaw) : propRaw;
  if (split) {
    const decls = splitDeclarations(prop + ':' + valueRaw);
    const kept: StaticDeclNode[] = [];
    for (let i = 0; i < decls.length; i++) {
      if (decls[i].prop.charCodeAt(0) !== AT) kept.push(decls[i]);
    }
    return kept.length === 0 ? undefined : kept;
  }
  if (prop === '') return undefined;
  // Re-normalize substituted values to match the parser's normalizeValue;
  // skip re-normalization on the static-decl warm path. Custom properties
  // preserve empty values (`--x: ;` is spec-legal).
  const value = typeof node.value !== 'string' ? normalizeSubstituted(valueRaw) : valueRaw;
  if (value === '' && !isCustomProperty(prop)) return undefined;
  return { kind: NodeKind.Decl, prop, value };
}

/**
 * Realize a selector or stop list: each templated entry is checked, then
 * split on top-level commas again so every selector a value adds stays one
 * list entry of its own. `null` when a value fails its check (a `;` fails
 * too: it ends the rule early).
 */
function realizeList(list: ReadonlyArray<string | TemplateValue>, fill: Fill): string[] | null {
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    if (typeof entry === 'string') {
      out.push(entry);
      continue;
    }
    const text = realize(entry, fill, '');
    if (text === null || realizedSemicolon) return null;
    if (text.indexOf(',') === -1) {
      out.push(text);
    } else {
      const parts = splitTopLevelCommas(text, true);
      for (let j = 0; j < parts.length; j++) out.push(parts[j]);
    }
  }
  return out;
}

function fillRule(node: RuleNode, fill: Fill): StaticNode | StaticNode[] | undefined {
  if (node.head !== undefined) return fillHeadRule(node, node.head, fill);
  let selectorsChanged = false;
  for (let i = 0; i < node.selectors.length; i++) {
    if (typeof node.selectors[i] !== 'string') selectorsChanged = true;
  }
  const selectors = selectorsChanged ? realizeList(node.selectors, fill) : null;
  if (selectorsChanged && selectors === null) {
    if (__DEV__) warnDropped('rule `' + listText(node.selectors) + '`');
    return undefined;
  }
  const children = fillNodes(node.children, nestedFill(fill));
  if (selectors === null) {
    // Every selector was already a string, so the node is a `StaticRuleNode`
    // at runtime once its children fill as identity.
    if ((children as unknown) === node.children) return node as unknown as StaticRuleNode;
    return { kind: NodeKind.Rule, selectors: node.selectors as string[], children };
  }
  return { kind: NodeKind.Rule, selectors, children };
}

function fillAtRule(
  node: Extract<Node, { kind: NodeKind.AtRule }>,
  fill: Fill
): StaticNode | StaticNode[] | undefined {
  let name: string;
  if (typeof node.name === 'string') {
    name = node.name;
  } else {
    const realized = realize(node.name, fill, '');
    if (realized === null || !isAtRuleName(realized)) {
      if (__DEV__) {
        const shown = realized === null ? fieldText(node.name) : realized;
        warnOnce(
          'at-rule-name',
          `\`@${shown}\` is not an at-rule name, so the rule was dropped. Interpolate a name such as \`media\`.`,
          shown
        );
      }
      return undefined;
    }
    name = realized;
    if (node.children !== null && isKeyframesName(name)) {
      // Read as a block of rules at parse time; each rule is a frame.
      return fillKeyframes(name, node.prelude, node.children, fill);
    }
  }
  const prelude = realize(node.prelude, fill, '');
  if (prelude === null || realizedSemicolon) {
    if (__DEV__) warnDropped('at-rule `@' + name + ' ' + fieldText(node.prelude) + '`');
    return undefined;
  }
  const children = node.children === null ? null : fillNodes(node.children, fill);
  if (
    typeof node.name === 'string' &&
    typeof node.prelude === 'string' &&
    (children as unknown) === node.children
  ) {
    return node as unknown as StaticAtRuleNode;
  }
  return { kind: NodeKind.AtRule, name, prelude, children };
}

/**
 * Fill a @keyframes rule. `frames` are the parsed frames, or the rules of
 * a block whose templated at-rule name realized to a keyframes name.
 */
function fillKeyframes(
  nameField: string | TemplateValue,
  preludeField: string | TemplateValue,
  frames: ReadonlyArray<KeyframeFrame | Node>,
  fill: Fill
): StaticKeyframesNode | undefined {
  const name = typeof nameField === 'string' ? nameField : realize(nameField, fill, '');
  let prelude = realize(preludeField, fill, '');
  if (name === null || prelude === null || realizedSemicolon) {
    if (__DEV__) warnDropped('@keyframes `' + fieldText(preludeField) + '`');
    return undefined;
  }
  if (typeof preludeField !== 'string') {
    prelude = trimWhitespace(prelude);
    if (!isIdentifier(prelude)) {
      if (__DEV__) {
        warnOnce(
          'keyframes-name',
          `\`${prelude}\` is not a @keyframes name, so the @keyframes block was dropped. Interpolate a keyframes object or a name such as \`fade-in\`.`,
          prelude
        );
      }
      return undefined;
    }
  }
  const out: StaticKeyframeFrame[] = [];
  const nested = nestedFill(fill);
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if ('kind' in frame) {
      if (frame.kind === NodeKind.Interpolation) {
        appendFrames(spliceNodes(frame.index, fill), out);
      } else {
        const filled = fillNode(frame, nested);
        if (filled !== undefined) appendFrames(Array.isArray(filled) ? filled : [filled], out);
      }
      continue;
    }
    const decls = fillFrameDecls(frame.children, fill);
    let stops: string[] | null;
    if (frame.head !== undefined) {
      const head = readHead(frame.head, fill);
      if (head === undefined) continue;
      appendFrames(head.statements, out);
      if (head.dropped) continue;
      if (head.remainder !== null && head.remainder.charCodeAt(0) === AT) {
        if (__DEV__) {
          warnOnce(
            'head-at-rule',
            `\`${head.remainder}\` cannot stand before a @keyframes frame, so the frame was dropped. A value before a frame block may only give its stops, like \`50%\`.`,
            head.remainder
          );
        }
        continue;
      }
      const text = head.remainder === null ? head.rest : head.remainder + head.gap + head.rest;
      stops = splitTopLevelCommas(text, true);
      if (stops.length === 0) continue;
    } else {
      stops = realizeList(frame.stops, fill);
      if (stops === null) {
        if (__DEV__) warnDropped('@keyframes frame `' + listText(frame.stops) + '`');
        continue;
      }
    }
    out.push({ stops, children: decls });
  }
  return { kind: NodeKind.Keyframes, name, prelude, frames: out };
}

/**
 * The statements a standalone slot splices. A fragment slot splices the
 * child's filled AST (its splices resolve in its own index space); a string
 * is parsed, with the cache amortizing the round-trip across repeated
 * dynamic strings.
 */
function spliceNodes(index: number, fill: Fill): StaticRoot {
  const frag = fill.fragments ? fill.fragments[index] : null;
  if (frag !== null && frag !== undefined) {
    if (frag === UNRESOLVED) return EMPTY_ROOT;
    return fillSource(frag.source, frag.filled, frag.fragments, fill.root);
  }
  const text = fill.filled[index];
  if (text === '' || text === undefined) return EMPTY_ROOT;
  return parseStringFragment(text);
}

const EMPTY_ROOT: StaticRoot = [];

/** A head's slot values read front to back, per the head resolution rules. */
interface ResolvedHead {
  /** A value failed its check, or could not be resolved: the rule or frame is dropped. */
  dropped: boolean;
  /** Whitespace written after the head's last slot. */
  gap: string;
  /** Selector or at-rule text the slots contribute; `null` when none. */
  remainder: string | null;
  /** The realized text after the head. */
  rest: string;
  /** Statements to splice before the rule or frame; kept when the rule is dropped. */
  statements: StaticNode[];
}

/**
 * Read a head's slot values. Returns `undefined` when the rule must be
 * dropped along with every statement (a client reference the server cannot
 * resolve at parse time).
 */
function readHead(head: SlotHead, fill: Fill): ResolvedHead | undefined {
  if (head.unresolved === true) return undefined;
  const statements: StaticNode[] = [];
  const gap = head.gaps[head.gaps.length - 1];
  let remainder: string | null = null;
  for (let k = 0; k < head.slots.length; k++) {
    const index = head.slots[k];
    const frag = fill.fragments ? fill.fragments[index] : null;
    if (frag === UNRESOLVED) return droppedHead(statements, gap);
    const hasFrag = frag !== null && frag !== undefined;
    const raw = hasFrag ? fragmentText(frag) : fill.filled[index];
    if (remainder !== null) {
      // Once a slot starts the selector, later slots join it as text.
      const before: string = remainder + head.gaps[k - 1];
      if (checkSlotValue(raw, TOP_LEVEL, before) !== 0) {
        if (__DEV__) warnDropped('rule headed by `' + raw + '`');
        return droppedHead(statements, gap);
      }
      remainder = before + raw;
      continue;
    }
    const text = normalize(raw, false);
    const cut = lastStatementEnd(text);
    const rest = trimWhitespace(text.substring(cut + 1));
    if (cut !== -1) {
      const spliced =
        hasFrag && rest === ''
          ? fillSource(frag.source, frag.filled, frag.fragments, fill.root)
          : parseStringFragment(text.substring(0, cut + 1));
      for (let j = 0; j < spliced.length; j++) statements.push(spliced[j]);
    }
    if (rest !== '') {
      if (checkSlotValue(rest, TOP_LEVEL, '') !== 0) {
        if (__DEV__) warnDropped('rule headed by `' + rest + '`');
        return droppedHead(statements, gap);
      }
      remainder = rest;
    }
  }
  const prefix = remainder === null ? '' : remainder + gap;
  const rest = realize(head.rest, fill, prefix);
  if (
    rest === null ||
    realizedSemicolon ||
    (typeof head.rest === 'string' && prefix !== '' && chunkChangesReading(prefix, rest, true))
  ) {
    if (__DEV__) warnDropped('rule `' + fieldText(head.rest) + '`');
    return droppedHead(statements, gap);
  }
  return { dropped: false, gap, remainder, rest: trimWhitespace(rest), statements };
}

function droppedHead(statements: StaticNode[], gap: string): ResolvedHead {
  return { dropped: true, gap, remainder: null, rest: '', statements };
}

/** At-keywords a head may turn its rule into: the conditional group rules. */
const HEAD_AT_RULES: ReadonlySet<string> = new Set([
  'container',
  'layer',
  'media',
  'scope',
  'starting-style',
  'supports',
]);

/**
 * Fill a rule headed by slots: the statements the head values hold splice
 * before it, and the rule takes its selector (or conditional group at-rule)
 * from what remains plus the selector text after the head.
 */
function fillHeadRule(node: RuleNode, head: SlotHead, fill: Fill): StaticNode[] | undefined {
  const resolved = readHead(head, fill);
  if (resolved === undefined) return undefined;
  const out = resolved.statements;
  if (resolved.dropped) return out.length === 0 ? undefined : out;
  const remainder = resolved.remainder;
  if (remainder === null) {
    const selectors = splitTopLevelCommas(resolved.rest, true);
    if (selectors.length === 0) {
      if (fill.root) {
        if (__DEV__) {
          warnOnce(
            'global-empty-head',
            'A block at the top level of createGlobalStyle has no selector, since the value heading it is empty, so it was dropped. Give the block a selector such as `body`.'
          );
        }
        return out.length === 0 ? undefined : out;
      }
      selectors.push('&');
    }
    out.push({
      kind: NodeKind.Rule,
      selectors,
      children: fillNodes(node.children, nestedFill(fill)),
    });
    return out;
  }
  if (remainder.charCodeAt(0) === AT) {
    let end = 1;
    while (end < remainder.length && isIdentChar(remainder.charCodeAt(end))) end++;
    const name = remainder.substring(1, end);
    if (!HEAD_AT_RULES.has(name.toLowerCase())) {
      if (__DEV__) {
        warnOnce(
          'head-at-rule',
          `\`@${name}\` cannot stand before a nested rule, so the rule was dropped. Only @media, @supports, @container, @layer, @scope, and @starting-style can wrap a rule this way.`,
          name
        );
      }
      return out.length === 0 ? undefined : out;
    }
    const prelude = trimWhitespace(remainder.substring(end) + resolved.gap + resolved.rest);
    out.push({ kind: NodeKind.AtRule, name, prelude, children: fillNodes(node.children, fill) });
    return out;
  }
  if (__DEV__ && looksLikeDeclaration(remainder)) {
    warnOnce(
      'head-declaration',
      `\`${remainder}\` is written before a nested rule and reads as part of its selector. End a mixin placed before a rule with \`;\`.`,
      remainder
    );
  }
  const selectors = splitTopLevelCommas(remainder + resolved.gap + resolved.rest, true);
  out.push({
    kind: NodeKind.Rule,
    selectors,
    children: fillNodes(node.children, nestedFill(fill)),
  });
  return out;
}

/** Index of the last `;` or `}` outside strings, parentheses, and brackets; -1 for none. */
function lastStatementEnd(text: string): number {
  let last = -1;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const end = scanQPB(text, i, len, SEMICOLON, CLOSE_BRACE, -1, -1);
    if (end >= len) break;
    last = end;
    i = end + 1;
  }
  return last;
}

/**
 * Whether selector text reads as a `name: value` declaration: an identifier,
 * a colon, then whitespace or nothing. A pseudo-class never has whitespace
 * after its colon.
 */
function looksLikeDeclaration(text: string): boolean {
  const len = text.length;
  let i = 0;
  while (i < len && isIdentChar(text.charCodeAt(i))) i++;
  if (i === 0) return false;
  while (i < len && isWS(text.charCodeAt(i))) i++;
  if (text.charCodeAt(i) !== COLON) return false;
  return i + 1 >= len || isWS(text.charCodeAt(i + 1));
}

/** An identifier: ASCII ident characters, not starting with a digit or a hyphen and digit. */
function isIdentifier(text: string): boolean {
  if (text.length === 0) return false;
  for (let i = 0; i < text.length; i++) {
    if (!isIdentChar(text.charCodeAt(i))) return false;
  }
  const first = text.charCodeAt(0);
  const lead = first === 45 /* - */ ? text.charCodeAt(1) : first;
  return !(lead >= 48 && lead <= 57) && !(first === 45 && text.length === 1);
}

function isAtRuleName(text: string): boolean {
  return isIdentifier(text);
}

/**
 * Append spliced statements to a frame list: a rule becomes a frame whose
 * selectors are its stops. Anything else does not belong in a frame list
 * and is dropped with a dev warning.
 */
function appendFrames(nodes: StaticRoot, frames: StaticKeyframeFrame[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind === NodeKind.Rule) {
      const decls: StaticDeclNode[] = [];
      keepDecls(node.children, decls);
      frames.push({ stops: node.selectors, children: decls });
    } else if (__DEV__) {
      warnOnce(
        'keyframes-splice',
        'a value spliced into a @keyframes frame list held something other than frame blocks (like `to { opacity: 1; }`); it was dropped.'
      );
    }
  }
}

/** Keep the declarations of `nodes`; anything else is dropped with a dev warning. */
function keepDecls(nodes: StaticRoot, out: StaticDeclNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind === NodeKind.Decl) {
      out.push(node);
    } else if (__DEV__) {
      warnOnce(
        'keyframes-splice-frame',
        'a value spliced into a @keyframes frame held a nested rule or at-rule; only declarations belong in a frame, so it was dropped.'
      );
    }
  }
}

function fillFrameDecls(
  children: ReadonlyArray<DeclNode | InterpolationNode>,
  fill: Fill
): StaticDeclNode[] {
  const decls: StaticDeclNode[] = [];
  for (let j = 0; j < children.length; j++) {
    const child = children[j];
    if (child.kind === NodeKind.Interpolation) {
      keepDecls(spliceNodes(child.index, fill), decls);
      continue;
    }
    // Frame declarations carry no `[DYN]` flag; read their fields.
    if (typeof child.prop === 'string' && typeof child.value === 'string') {
      decls.push(child as StaticDeclNode);
      continue;
    }
    const filled = fillDecl(child, fill);
    if (filled === undefined) continue;
    if (Array.isArray(filled)) {
      for (let k = 0; k < filled.length; k++) decls.push(filled[k]);
    } else {
      decls.push(filled);
    }
  }
  return decls;
}

/** Set by {@link realize}: a value held a `;` at the top level of its statement. */
let realizedSemicolon = false;

/**
 * Realize a {@link TemplateValue} or pass through a static string, checking
 * each slot value from its entry state and each template chunk after a
 * value for a changed reading. Returns `null` when a check fails; sets
 * {@link realizedSemicolon}. `prefix` is realized text written before the
 * field in the same statement.
 */
function realize(field: string | TemplateValue, fill: Fill, prefix: string): string | null {
  realizedSemicolon = false;
  if (typeof field === 'string') return field;
  const { chunks, slots } = field;
  let out = chunks[0];
  if (prefix !== '' && chunkChangesReading(prefix, out, true)) return null;
  for (let i = 0; i < slots.length; i++) {
    const idx = slots[i];
    if (idx >= fill.filled.length) return null;
    const value = fill.filled[idx];
    const entry = fill.entries[idx] || TOP_LEVEL;
    const flags = checkSlotValue(value, entry, prefix === '' ? out : prefix + out);
    if ((flags & VALUE_FAILED) !== 0) return null;
    if ((flags & VALUE_SEMICOLON) !== 0) realizedSemicolon = true;
    out += value;
    const chunk = chunks[i + 1];
    if (chunk !== '' && chunkChangesReading(out, chunk, entry.quote === 0 && !entry.url)) {
      return null;
    }
    out += chunk;
  }
  return out;
}

/** A field as written, each slot shown as `${…}`; for dev warnings. */
function fieldText(field: string | TemplateValue): string {
  if (typeof field === 'string') return field;
  return field.chunks.join('${…}');
}

function listText(list: ReadonlyArray<string | TemplateValue>): string {
  let text = '';
  for (let i = 0; i < list.length; i++) text += (i > 0 ? ', ' : '') + fieldText(list[i]);
  return text;
}

/** Dev warning for a construct dropped because a value in it failed its check. */
function warnDropped(construct: string): void {
  warnOnce(
    'slot-value',
    `The ${construct} was dropped: an interpolated value in it holds \`{\` or \`}\`, a \`;\` outside a declaration value, or leaves a string, comment, parenthesis, bracket, or \`url(\` open. Interpolate plain values, and write rules and blocks in the template or a css\`\` mixin.`,
    construct
  );
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
 * The fragment string `s` is a runtime-resolved value (a standalone or head
 * slot's text), parsed without `templates`, so any slot-shaped bytes in it
 * stay opaque and the parser produces a fully-static AST.
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
