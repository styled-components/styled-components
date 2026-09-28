import type { CompiledKeyframes } from '../models/Keyframes';
import type StyleSheet from '../sheet';
import type { Compiler } from '../types';
import { AT, COLON, DIGIT_0, DIGIT_9, HYPHEN, isWS } from '../utils/charCodes';
import { fifoSet } from '../utils/fifoMap';
import { warnOnce } from '../utils/warnOnce';
import {
  ALWAYS_READ,
  DeclNode,
  DYN,
  Node,
  NodeKind,
  Root,
  RuleNode,
  SlotHead,
  StaticAtRuleNode,
  StaticDeclNode,
  StaticKeyframesNode,
  StaticNode,
  StaticRoot,
  StaticRuleNode,
  TemplateValue,
} from './ast';
import { ampersandJoinsCall, emitWeb, EmitOptions, nextAmpersand } from './emit-web';
import { isCustomProperty, isKeyframesName, parse, splitTopLevelCommas, trimRange } from './parser';
import {
  BRACKETS,
  COMMENTS,
  FIELD_FAILED,
  FIELD_SEMICOLON,
  isIdentCode,
  readField,
  removeComments,
  scan,
  stops,
} from './reader';
import { isPlainValue, splitDeclarations } from './slotValue';
import {
  evaluateForFastPath,
  FastPathFragment,
  fragmentText,
  holdsUnresolved,
  UNRESOLVED,
} from './evaluate';
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
  return fillNodes(source.ast, { filled, fragments, root });
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
      return fillKeyframes(node.name, node.prelude, node.children, fill);
    case NodeKind.Interpolation: {
      const spliced = spliceNodes(node.index, fill);
      return spliced.length === 0 ? undefined : spliced;
    }
  }
}

function fillDecl(node: DeclNode, fill: Fill): StaticDeclNode | StaticDeclNode[] | undefined {
  // Both prop and value can be TemplateValue for templates like
  // `${theme.vars.colors.bg}: #111;` (createTheme.vars overrides).
  const propRaw = realize(node.prop, fill);
  let split = realizedSemicolon;
  const valueRaw = propRaw === null ? null : realize(node.value, fill);
  if (propRaw === null || valueRaw === null) {
    if (__DEV__) warnRealizeFailed('declaration `' + fieldText(node.prop) + '`');
    return undefined;
  }
  if (realizedSemicolon) split = true;
  const prop = typeof node.prop !== 'string' ? trimRange(propRaw, 0, propRaw.length) : propRaw;
  if (prop.charCodeAt(0) === AT) {
    if (__DEV__) {
      warnOnce(
        'property-at',
        `\`${prop}\` is not a property name, so its declaration was dropped. Interpolate a property name such as \`color\`.`,
        prop
      );
    }
    return undefined;
  }
  if (split) {
    const decls = splitDeclarations(prop + ':' + valueRaw);
    const kept: StaticDeclNode[] = [];
    for (let i = 0; i < decls.length; i++) {
      if (decls[i].prop.charCodeAt(0) !== AT) kept.push(decls[i]);
    }
    return kept.length === 0 ? undefined : kept;
  }
  if (prop === '') return undefined;
  // Custom properties preserve empty values (`--x: ;` is spec-legal).
  const value = typeof node.value !== 'string' ? trimRange(valueRaw, 0, valueRaw.length) : valueRaw;
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
    const realized = realize(entry, fill);
    if (realized === null || realizedSemicolon) return null;
    const text = removeComments(realized, false);
    if (joinsCall(text)) {
      realizeWarned = true;
      return null;
    }
    if (text === realized && text.indexOf(',') === -1) {
      out.push(text);
    } else {
      const parts = splitList(text);
      for (let j = 0; j < parts.length; j++) out.push(parts[j]);
    }
  }
  return out;
}

/**
 * Nest each selector in a list holding a slot under the parent, unless it
 * holds `&` outside strings, parentheses, and brackets, read as the emitter
 * reads it when writing the selector. The parts are emitted
 * as written otherwise, and `&` only inside `:not()` or `:has()` would leave
 * the selector unscoped. Skipped at the top level of a global style, which
 * has no parent.
 */
function anchorSelectors(selectors: string[], fill: Fill): string[] {
  if (fill.root) return selectors;
  for (let i = 0; i < selectors.length; i++) {
    const s = selectors[i];
    if (s.indexOf('&') !== -1 && nextAmpersand(s, 0, true) === s.length) {
      selectors[i] = '& ' + s;
    }
  }
  return selectors;
}

/** Split realized selector or stop text on top-level commas, trimming each part and dropping empty parts. */
function splitList(text: string): string[] {
  const raw = splitTopLevelCommas(text);
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const part = trimRange(raw[i], 0, raw[i].length);
    if (part !== '') parts.push(part);
  }
  return parts;
}

function fillRule(node: RuleNode, fill: Fill): StaticNode | StaticNode[] | undefined {
  if (node.head !== undefined) return fillHeadRule(node, node.head, fill);
  let selectorsChanged = false;
  for (let i = 0; i < node.selectors.length; i++) {
    if (typeof node.selectors[i] !== 'string') selectorsChanged = true;
  }
  const selectors = selectorsChanged ? realizeList(node.selectors, fill) : null;
  if (selectorsChanged && selectors === null) {
    if (__DEV__) warnRealizeFailed('rule `' + listText(node.selectors) + '`');
    return undefined;
  }
  if (fill.root && selectors !== null && selectors.length === 0) {
    if (__DEV__) warnGlobalEmptySelector();
    return undefined;
  }
  const children = fillNodes(node.children, nestedFill(fill));
  if (selectors === null) {
    // Every selector was already a string, so the node is a `StaticRuleNode`
    // at runtime once its children fill as identity.
    if ((children as unknown) === node.children) return node as unknown as StaticRuleNode;
    return { kind: NodeKind.Rule, selectors: node.selectors as string[], children };
  }
  return { kind: NodeKind.Rule, selectors: anchorSelectors(selectors, fill), children };
}

function fillAtRule(
  node: Extract<Node, { kind: NodeKind.AtRule }>,
  fill: Fill
): StaticNode | StaticNode[] | undefined {
  let name: string;
  if (typeof node.name === 'string') {
    name = node.name;
  } else {
    const realized = realize(node.name, fill);
    if (realized === null || !isIdentifier(realized)) {
      if (__DEV__ && !realizeWarned) {
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
  const realized = realize(node.prelude, fill);
  if (realized === null || realizedSemicolon) {
    if (__DEV__) warnRealizeFailed('at-rule `@' + name + ' ' + fieldText(node.prelude) + '`');
    return undefined;
  }
  const prelude = withoutComments(realized);
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
 * Fill a @keyframes rule. `children` are its frames: the rules of a parsed
 * @keyframes, or of a block whose templated at-rule name realized to a
 * keyframes name.
 */
function fillKeyframes(
  name: string,
  preludeField: string | TemplateValue,
  children: ReadonlyArray<Node>,
  fill: Fill
): StaticKeyframesNode | undefined {
  let prelude = realize(preludeField, fill);
  if (prelude === null || realizedSemicolon) {
    if (__DEV__) warnRealizeFailed('@keyframes `' + fieldText(preludeField) + '`');
    return undefined;
  }
  if (typeof preludeField !== 'string') {
    prelude = trimRange(prelude, 0, prelude.length);
    prelude = withoutComments(prelude);
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
  const frames: StaticNode[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.kind === NodeKind.Interpolation) {
      appendFrames(spliceNodes(child.index, fill), frames);
    } else if (child.kind === NodeKind.Rule) {
      fillFrame(child, fill, frames);
    }
  }
  return { kind: NodeKind.Keyframes, name, prelude, children: frames };
}

/**
 * Fill one frame into `frames`, with only its declarations, after any
 * statements a stop Head splices. Stops are not nested under a parent.
 */
function fillFrame(frame: RuleNode, fill: Fill, frames: StaticNode[]): void {
  if (!dynamic(frame)) {
    frames.push(frame as unknown as StaticRuleNode);
    return;
  }
  const decls = frameDeclarations(frame.children, fill);
  let stops: string[] | null;
  if (frame.head !== undefined) {
    const head = readHead(frame.head, fill);
    if (head === undefined) return;
    appendFrames(head.statements, frames);
    if (head.dropped) return;
    if (head.remainder !== null && head.remainder.charCodeAt(0) === AT) {
      if (__DEV__) {
        warnOnce(
          'head-at-rule',
          `\`${head.remainder}\` cannot stand before a @keyframes frame, so the frame was dropped. A value before a frame block may only give its stops, like \`50%\`.`,
          head.remainder
        );
      }
      return;
    }
    stops = splitList(head.text);
  } else {
    stops = realizeList(frame.selectors, fill);
    if (stops === null) {
      if (__DEV__) warnRealizeFailed('@keyframes frame `' + listText(frame.selectors) + '`');
      return;
    }
  }
  if (stops.length === 0) {
    if (__DEV__) {
      warnOnce(
        'keyframes-empty-stops',
        'A @keyframes frame has no stops, since the value giving them gives none, so it was dropped. Give the frame a stop such as `50%`.'
      );
    }
    return;
  }
  frames.push({ kind: NodeKind.Rule, selectors: stops, children: decls });
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
  // The Head remainder field: the text the values give after their
  // statements, then the text the template writes after the Head.
  let remainder: string | null = null;
  let count = 0;
  for (let k = 0; k < head.slots.length; k++) {
    const index = head.slots[k];
    const frag = fill.fragments ? fill.fragments[index] : null;
    if (frag === UNRESOLVED) return droppedHead(statements);
    const hasFrag = frag !== null && frag !== undefined;
    // Read as text, a fragment's unresolved value would vanish from the
    // selector, so the rule drops; spliced as statements, it drops itself.
    const textUnresolved = hasFrag && holdsUnresolved(frag);
    const raw = hasFrag ? fragmentText(frag) : fill.filled[index];
    if (remainder !== null) {
      // Once a slot starts the selector, later slots join it as text.
      if (textUnresolved) return droppedHead(statements);
      remainder += head.gaps[k - 1];
      valueSpans[2 * count] = remainder.length;
      remainder += raw;
      valueSpans[2 * count + 1] = remainder.length;
      count++;
      continue;
    }
    const text = removeComments(raw, true);
    const cut = lastStatementEnd(text);
    const rest = trimRange(text, cut + 1, text.length);
    if (textUnresolved && rest !== '') return droppedHead(statements);
    if (cut !== -1) {
      const spliced =
        hasFrag && rest === ''
          ? fillSource(frag.source, frag.filled, frag.fragments, fill.root)
          : parseStringFragment(text.substring(0, cut + 1));
      for (let j = 0; j < spliced.length; j++) statements.push(spliced[j]);
    }
    if (rest !== '') {
      remainder = rest;
      valueSpans[0] = 0;
      valueSpans[1] = rest.length;
      count = 1;
    }
  }
  if (remainder === null) {
    const rest = realize(head.rest, fill);
    if (rest === null || realizedSemicolon) {
      if (__DEV__) warnRealizeFailed('rule `' + fieldText(head.rest) + '`');
      return droppedHead(statements);
    }
    const text = removeComments(trimRange(rest, 0, rest.length), false);
    if (typeof head.rest !== 'string' && joinsCall(text)) return droppedHead(statements);
    return { dropped: false, remainder: null, statements, text };
  }
  const prefix = remainder + head.gaps[head.gaps.length - 1];
  const rest = appendField(prefix, head.rest, fill, count);
  if (rest === null) return droppedHead(statements);
  const flags = readField(prefix + rest, valueSpans, fieldSpans);
  if (flags !== 0) {
    if (__DEV__) warnDropped('rule `' + prefix + fieldText(head.rest) + '`');
    return droppedHead(statements);
  }
  const text = removeComments(prefix + trimRange(rest, 0, rest.length), false);
  if (joinsCall(text)) return droppedHead(statements);
  return { dropped: false, remainder: removeComments(remainder, false), statements, text };
}

/** Value spans {@link appendField} recorded, the ones before it included. */
let fieldSpans = 0;

/**
 * `field` realized as it continues a field whose text so far is `prefix`
 * with `count` value spans, recording its values' spans after them (see
 * {@link fieldSpans}). `null` when a value cannot be resolved, which already
 * warned.
 */
function appendField(
  prefix: string,
  field: string | TemplateValue,
  fill: Fill,
  count: number
): string | null {
  fieldSpans = count;
  if (typeof field === 'string') return field;
  const { chunks, slots } = field;
  let out = chunks[0];
  for (let i = 0; i < slots.length; i++) {
    const idx = slots[i];
    if (idx >= fill.filled.length) return null;
    if (fill.fragments && fill.fragments[idx] === UNRESOLVED) return null;
    valueSpans[2 * fieldSpans] = prefix.length + out.length;
    out += fill.filled[idx];
    valueSpans[2 * fieldSpans + 1] = prefix.length + out.length;
    fieldSpans++;
    out += chunks[i + 1];
  }
  return out;
}

/** {@link removeComments}, trimming the text when a comment was removed. */
function withoutComments(text: string): string {
  const clean = removeComments(text, false);
  return clean === text ? text : trimRange(clean, 0, clean.length);
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
  if (remainder !== null && text.charCodeAt(0) === AT) {
    // Read from the whole text: a comment the value opens may close after it.
    let end = 1;
    while (end < text.length && isIdentCode(text.charCodeAt(end))) end++;
    const name = text.substring(1, end);
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
    const prelude = trimRange(text, end, text.length);
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
  const selectors = splitList(text);
  if (selectors.length === 0) {
    if (fill.root) {
      if (__DEV__) warnGlobalEmptySelector();
      return out.length === 0 ? undefined : out;
    }
    selectors.push('&');
  }
  out.push({
    kind: NodeKind.Rule,
    selectors: anchorSelectors(selectors, fill),
    children: fillNodes(node.children, nestedFill(fill)),
  });
  return out;
}

/** Dev warning for a block at the top level of a global style whose values give it no selector. */
function warnGlobalEmptySelector(): void {
  warnOnce(
    'global-empty-head',
    'A block at the top level of createGlobalStyle has no selector, since the value giving it one gives none, so it was dropped. Give the block a selector such as `body`.'
  );
}

const STATEMENT_END = stops(';}');

/** Index of the last `;` or `}` outside comments, strings, parentheses, and brackets; -1 for none. */
function lastStatementEnd(text: string): number {
  let last = -1;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const end = scan(text, i, len, STATEMENT_END, COMMENTS | BRACKETS, 0);
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
  while (i < len && isIdentCode(text.charCodeAt(i))) i++;
  if (i === 0) return false;
  while (i < len && isWS(text.charCodeAt(i))) i++;
  if (text.charCodeAt(i) !== COLON) return false;
  return i + 1 >= len || isWS(text.charCodeAt(i + 1));
}

/**
 * An identifier: ident code points only, not a lone hyphen, and not starting
 * with a digit or a hyphen and digit.
 */
function isIdentifier(text: string): boolean {
  const len = text.length;
  if (len === 0 || (len === 1 && text.charCodeAt(0) === HYPHEN)) return false;
  const lead = text.charCodeAt(0) === HYPHEN ? text.charCodeAt(1) : text.charCodeAt(0);
  if (lead >= DIGIT_0 && lead <= DIGIT_9) return false;
  for (let i = 0; i < len; i++) if (!isIdentCode(text.charCodeAt(i))) return false;
  return true;
}

/**
 * Append spliced statements to a frame list: a rule becomes a frame whose
 * selectors are its stops. Anything else does not belong in a frame list
 * and is dropped with a dev warning.
 */
function appendFrames(nodes: StaticRoot, frames: StaticNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind === NodeKind.Rule) {
      const decls: StaticDeclNode[] = [];
      keepDecls(node.children, decls);
      frames.push({ kind: NodeKind.Rule, selectors: node.selectors, children: decls });
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

/**
 * A frame's filled declarations. A splice keeps only the declarations it
 * holds, warning for the rest; anything else written in the frame is not a
 * declaration and is dropped, as it is when written.
 */
function frameDeclarations(children: ReadonlyArray<Node>, fill: Fill): StaticDeclNode[] {
  const decls: StaticDeclNode[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.kind === NodeKind.Interpolation) {
      keepDecls(spliceNodes(child.index, fill), decls);
    } else if (child.kind === NodeKind.Decl) {
      // A static declaration already has the `StaticDeclNode` shape at runtime.
      const filled = dynamic(child) ? fillDecl(child, fill) : (child as StaticDeclNode);
      if (filled === undefined) continue;
      if (Array.isArray(filled)) {
        for (let j = 0; j < filled.length; j++) decls.push(filled[j]);
      } else {
        decls.push(filled);
      }
    }
  }
  return decls;
}

/** Set by {@link realize}: a value held a `;` at the top level of its statement. */
let realizedSemicolon = false;
/**
 * Set by {@link realize} and {@link realizeList}: the failure already warned
 * (a value that could not be resolved, or an `&` joined to a call).
 */
let realizeWarned = false;

/**
 * `[start, end)` pairs of the text the values of the field being realized
 * wrote, for {@link readField}. Reused across fields; only the pairs a field
 * records are read.
 */
const valueSpans: number[] = [];

/**
 * Realize a {@link TemplateValue} or pass through a static string. The
 * realized field is read whole ({@link readField}) unless every value is
 * plain ({@link isPlainValue}) and the template text reads balanced on its
 * own. Returns `null` when the reading fails or a value could not be
 * resolved; sets {@link realizedSemicolon} and {@link realizeWarned}.
 */
function realize(field: string | TemplateValue, fill: Fill): string | null {
  realizedSemicolon = false;
  realizeWarned = false;
  if (typeof field === 'string') return field;
  const { chunks, slots } = field;
  const fragments = fill.fragments;
  let read = field[ALWAYS_READ] === true;
  let out = chunks[0];
  for (let i = 0; i < slots.length; i++) {
    const idx = slots[i];
    if (idx >= fill.filled.length) return null;
    if (fragments && fragments[idx] === UNRESOLVED) {
      realizeWarned = true;
      return null;
    }
    const value = fill.filled[idx];
    const after = chunks[i + 1];
    if (!read && !isPlainValue(value, chunks[i], after)) read = true;
    valueSpans[2 * i] = out.length;
    out += value;
    valueSpans[2 * i + 1] = out.length;
    out += after;
  }
  return read ? readRealized(out, slots.length) : out;
}

/** `text` when it passes {@link readField} with its first `count` value spans; sets {@link realizedSemicolon}. */
function readRealized(text: string, count: number): string | null {
  const flags = readField(text, valueSpans, count);
  if ((flags & FIELD_FAILED) !== 0) return null;
  realizedSemicolon = (flags & FIELD_SEMICOLON) !== 0;
  return text;
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

/**
 * {@link warnDropped} after {@link realize} failed, unless it failed on a
 * value that could not be resolved, whose resolution already warned.
 */
function warnRealizeFailed(construct: string): void {
  if (!realizeWarned) warnDropped(construct);
}

/** `text` holds an `&` joined to a call ({@link ampersandJoinsCall}); warns in dev. */
function joinsCall(text: string): boolean {
  if (text.indexOf('&') === -1 || !ampersandJoinsCall(text)) return false;
  if (__DEV__) {
    warnOnce(
      'ampersand-call',
      `The rule \`${text}\` was dropped: \`&\` written directly before a name and \`(\` would join the parent selector to that name. Put a space or another selector between \`&\` and the name.`,
      text
    );
  }
  return true;
}

/** Dev warning for a construct dropped because a value in it failed its check. */
function warnDropped(construct: string): void {
  warnOnce(
    'slot-value',
    `The ${construct} was dropped: an interpolated value in it holds \`{\` or \`}\` outside a string or \`url(\`, a \`;\` outside a declaration value, or a line break inside a string, ends in a backslash, or leaves a string, comment, parenthesis, bracket, or \`url(\` open. Interpolate plain values, and write rules and blocks in the template or a css\`\` mixin.`,
    construct
  );
}

/**
 * Per-string AST cache for block-level fragments returned as raw CSS text.
 * Bounded so streaming unique strings can't leak.
 *
 * The fragment string `s` is a runtime-resolved value (a standalone or head
 * slot's text), parsed without `templates`, so any slot-shaped bytes in it
 * stay opaque and the parser produces a fully-static AST, read by the same
 * rules as template text.
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
