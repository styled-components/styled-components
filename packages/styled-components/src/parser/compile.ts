import type { CompiledKeyframes } from '../models/Keyframes';
import type StyleSheet from '../sheet';
import type { Compiler } from '../types';
import { AT, CLOSE_BRACE, COLON, isIdentChar, isWS, SEMICOLON } from '../utils/charCodes';
import { fifoSet } from '../utils/fifoMap';
import { normalize } from '../utils/normalize';
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
  trimRange,
} from './parser';
import {
  checkSlotValue,
  chunkChangesReading,
  splitDeclarations,
  VALUE_FAILED,
  VALUE_SEMICOLON,
} from './slotValue';
import { evaluateForFastPath, FastPathFragment, fragmentText, UNRESOLVED } from './evaluate';
import type { Source } from './source';

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
    if (realized === null || !isIdentifier(realized)) {
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
      stops = splitTopLevelCommas(head.text, true);
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
  /** Selector or at-rule text the slots contribute; `null` when none. */
  remainder: string | null;
  /** Statements to splice before the rule or frame; kept when the rule is dropped. */
  statements: StaticNode[];
  /**
   * The rule's selector (or at-rule) text: the remainder and the whitespace
   * written after the head's last slot, then the realized text after the head.
   */
  text: string;
}

/**
 * Read a head's slot values. Returns `undefined` when the rule must be
 * dropped along with every statement (a client reference the server cannot
 * resolve at parse time).
 */
function readHead(head: SlotHead, fill: Fill): ResolvedHead | undefined {
  if (head.unresolved === true) return undefined;
  const statements: StaticNode[] = [];
  let remainder: string | null = null;
  for (let k = 0; k < head.slots.length; k++) {
    const index = head.slots[k];
    const frag = fill.fragments ? fill.fragments[index] : null;
    if (frag === UNRESOLVED) return droppedHead(statements);
    const hasFrag = frag !== null && frag !== undefined;
    const raw = hasFrag ? fragmentText(frag) : fill.filled[index];
    if (remainder !== null) {
      // Once a slot starts the selector, later slots join it as text.
      const before: string = remainder + head.gaps[k - 1];
      if (checkSlotValue(raw, TOP_LEVEL, before) !== 0) {
        if (__DEV__) warnDropped('rule headed by `' + raw + '`');
        return droppedHead(statements);
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
        return droppedHead(statements);
      }
      remainder = rest;
    }
  }
  const prefix = remainder === null ? '' : remainder + head.gaps[head.gaps.length - 1];
  const rest = realize(head.rest, fill, prefix);
  if (
    rest === null ||
    realizedSemicolon ||
    (typeof head.rest === 'string' && prefix !== '' && chunkChangesReading(prefix, rest, true))
  ) {
    if (__DEV__) warnDropped('rule `' + fieldText(head.rest) + '`');
    return droppedHead(statements);
  }
  return { dropped: false, remainder, statements, text: prefix + trimWhitespace(rest) };
}

function droppedHead(statements: StaticNode[]): ResolvedHead {
  return { dropped: true, remainder: null, statements, text: '' };
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
  const { remainder, text } = resolved;
  if (remainder !== null && remainder.charCodeAt(0) === AT) {
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
    const prelude = trimWhitespace(text.substring(end));
    out.push({ kind: NodeKind.AtRule, name, prelude, children: fillNodes(node.children, fill) });
    return out;
  }
  if (__DEV__ && remainder !== null && looksLikeDeclaration(remainder)) {
    warnOnce(
      'head-declaration',
      `\`${remainder}\` is written before a nested rule and reads as part of its selector. End a mixin placed before a rule with \`;\`.`,
      remainder
    );
  }
  const selectors = splitTopLevelCommas(text, true);
  if (remainder === null && selectors.length === 0) {
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

/**
 * An identifier: ASCII ident characters, not a lone hyphen, and not starting
 * with a digit or a hyphen and digit. Anchored with no nested quantifier, so
 * linear-time.
 */
const IDENTIFIER = /^(?!-?\d|-$)[\w-]+$/;

function isIdentifier(text: string): boolean {
  return IDENTIFIER.test(text);
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

/** A frame's filled declarations; a splice keeps only the declarations it holds. */
function fillFrameDecls(
  children: Array<DeclNode | InterpolationNode>,
  fill: Fill
): StaticDeclNode[] {
  const decls: StaticDeclNode[] = [];
  keepDecls(fillNodes(children, fill), decls);
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
  return trimRange(s, 0, s.length);
}

/**
 * Mirror the parser's `normalizeValue` for substituted text. Output bytes
 * match the string-input `compiler.compile` path so SSR class hashes stay stable.
 */
function normalizeSubstituted(value: string): string {
  return stripCommaSpaces(trimWhitespace(value));
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
