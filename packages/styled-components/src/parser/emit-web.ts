import { SC_ATTR, SPLITTER } from '../constants';
import { alignContentFor } from '../utils/bridgeRewrites';
import * as $ from '../utils/charCodes';
import type { DeclTransform, SelectorTransform } from '../utils/compiler';
import { warnOnce } from '../utils/warnOnce';
import { NodeKind, StaticAtRuleNode, StaticNode, StaticRoot } from './ast';
import { isKeyframesName } from './atRuleNames';
import {
  isCustomProperty,
  NEEDS_FIELD_SCAN,
  PSEUDO_ELEMENT,
  scanQPB,
  splitTopLevelCommas,
  staysOneField,
  STOP_COLON,
  STOP_COMBINATOR,
  STOP_COMMA,
  STOP_LBRACE,
  STOP_RBRACE,
  STOP_RPAREN,
  STOP_SEMI,
  STOP_WS,
  stripCommaSpaces,
  trimRange,
} from './parser';

/**
 * Most selector text one emit composes. A `,` or `&` at each nesting level multiplies the
 * text under it, so a short value could otherwise build gigabytes.
 */
const MAX_COMPOSED_SIZE = 1 << 22;
let composedSize = 0;

/** ASCII lowercase letter codes used in declaration scanning. */
const LOWER_C = 99;
const LOWER_V = 118;

const GROUP_MARKER = SC_ATTR + '.g';
const SCOPE_REF = ':where(:scope)';
const SCOPE_PSEUDO = /:scope(?![\w\\(-]|[^\x00-\x7f])/iy;

/** An HTML parser turns a CR after this into the line feed that ends the separator. */
const SEPARATOR = SPLITTER.trim();

function isWholeDecl(d: { prop: string; value: string }, s = d.prop + ':' + d.value): boolean {
  return (
    scanQPB(
      s,
      0,
      s.length,
      isCustomProperty(d.prop) ? STOP_SEMI | STOP_RBRACE : STOP_LBRACE | STOP_RBRACE
    ) === s.length
  );
}

function formatDecl(prop: string, value: string, transform: DeclTransform | undefined): string {
  const t = transform && transform(prop, value);
  if (!t) return prop + ':' + value + ';';

  const isArr = Array.isArray(t);
  const out = isArr ? t.map(d => d.prop + ':' + d.value).join(';') : t.prop + ':' + t.value;
  if (!out) return '';

  // A parsed declaration stays in its block; a plugin's rewrite has not been read.
  if (isArr ? t.every(d => isWholeDecl(d)) : isWholeDecl(t, out)) return out + ';';

  if (__DEV__) {
    const text = out.slice(0, 80);
    warnOnce(
      'plugin-declaration-not-whole',
      `A plugin rewrote "${prop}" to "${text}", which holds a brace or a comment, or leaves a string, paren, or bracket open, so the declaration was dropped. Have the plugin return a complete value.`,
      text
    );
  }
  return '';
}

export interface EmitOptions {
  /**
   * When provided alongside a `selfRefSelector`, selectors that contain
   * `selfRefSelector` in a self-reference position (e.g., `X + X`, `X > X`)
   * have that token rewritten to `.${componentId}` so the combinator refers
   * to the STATIC component class rather than the current render's hashed
   * class. Also the fallback for `ids`.
   */
  componentId?: string | undefined;
  /**
   * Space-joined ids of the extension chain, base first and `componentId` last. Names the
   * automatic `container-name` and `view-transition-class`; defaults to `componentId`.
   * @internal
   */
  ids?: string | undefined;
  /** @internal */
  selfRefSelector?: string | undefined;
  /**
   * Final-stage selector transform, run after self-reference resolution.
   * Return a string to replace the selector, or an array to emit one rule
   * per selector. Short name keeps bundle size down; object keys aren't
   * mangled by minifiers. A namespace is the first transform of the chain
   * (`createNamespaceTransform`).
   */
  rw?: SelectorTransform | undefined;
  /**
   * Declaration transform. Invoked on every emitted `prop: value` pair,
   * including declarations inside @keyframes and decl-body at-rules
   * (@font-face, @property, etc). Return `{prop, value}` to rewrite, an
   * array to expand one authored declaration into several, or undefined
   * to pass through. Used by first-party plugins like RTL and prefix.
   */
  decl?: DeclTransform | undefined;
}

/**
 * Emit minified CSS rule strings from a parser AST for web injection.
 * Shape is stable for a given AST so class-name hashes stay deterministic.
 *
 * @param root         Parsed AST from `parse()`.
 * @param parentSelector  Parent selector for root declarations and `&` expansion (`''` for global styles).
 */
export function emitWeb(root: StaticRoot, parentSelector: string, options?: EmitOptions): string[] {
  composedSize = 0;
  const ids = options && (options.ids || options.componentId);
  // Global styles and `compile()` strings have no parent selector, so a root declaration has no
  // element to land on.
  if (ids && parentSelector) {
    autoIds = ids;
    foundNames = 0;
    scanStack.length = 0;
    return emitNodes(root, parentSelector, options, WalkState.Root);
  }

  return emitNodes(root, parentSelector, options, WalkState.Off);
}

const enum AutoProp {
  ContainerName = 0,
  ContainerType = 1,
  ViewTransitionClass = 2,
  ViewTransitionName = 3,
  Container = 4,
}

/**
 * Properties participating in automatic naming or bare-name dot stripping.
 * Order is load-bearing: indices 0..3 map to `foundNames` bits `1 << idx`
 * (0: own `container-name`, 1: own `container-type` != `normal`,
 * 2: own `view-transition-class`, 3: element `view-transition-name` != `none`),
 * and even indices (0, 2, 4) are the properties whose values take bare names.
 */
const AUTO_PROPS = [
  'container-name',
  'container-type',
  'view-transition-class',
  'view-transition-name',
  'container',
];

/** At-rules whose body holds direct declarations (no nested selector wrap). */
const DECL_AT_RULES =
  /^(?:font-(?:face|(?:feature|palette)-values)|page|property|c(?:ounter-style|olor-profile)|viewport|position-try|view-transition)$/i;

/** True when `value` matches `keyword` (ASCII case-insensitive), ignoring a trailing `!important`. */
const isKeyword = (value: string, keyword: string): boolean =>
  value.toLowerCase().replace(/[ \t\n\r\f]*![ \t\n\r\f]*important$/, '') === keyword;

/**
 * Where a declaration sits relative to the component's own element:
 * - `Own`: the component's own declarations, and rules on `&` alone inside it;
 * - `Other`: the element in another state or condition (`&:hover`, `&[data-active]`, inside an
 *   at-rule), where only a `view-transition-name` still names the component's own element;
 * - `Off`: a descendant or another element, where nothing counts.
 */
const enum ScanState {
  Off,
  Other,
  Own,
}

/**
 * What `emitNodes` does with the declarations it walks: `Off` collects nothing, `On` collects, and
 * `Root` is the outermost call, which collects and also writes the names after its walk.
 */
const enum WalkState {
  Off,
  On,
  Root,
}

/** The ids to name by, and the flags of `AUTO_PROPS` found so far, for the emit in progress. */
let autoIds = '';
let foundNames = 0;

/** The selectors of each rule (`null` for an at-rule) the walk is inside, outermost first. */
const scanStack: Array<string[] | null> = [];

/**
 * The scan state of the declarations at the current point of the walk. A rule on the element
 * itself (`&` with only a compound after it, no top-level whitespace or combinator) stays in the
 * scan; one on `&` alone keeps `ScanState.Own`.
 */
function scanState(): ScanState {
  let state = ScanState.Own;
  for (let i = 0; i < scanStack.length; i++) {
    const selectors = scanStack[i];
    if (!selectors || !selectors.length) {
      state = ScanState.Other;
      continue;
    }
    for (let j = 0; j < selectors.length; j++) {
      const s = selectors[j];
      if (
        s.charCodeAt(0) !== $.AMPERSAND ||
        scanQPB(s, 1, s.length, STOP_WS | STOP_COMBINATOR) !== s.length
      ) {
        return ScanState.Off;
      }
      if (state === ScanState.Own && !/^&+$/.test(s)) state = ScanState.Other;
    }
  }
  return state;
}

/**
 * Whether a declaration at the current point of the walk lands on the component's own element:
 * `scanState()` finds it there, and no rule it sits in is a pseudo-element's.
 */
function onElement(): boolean {
  if (!scanState()) return false;

  for (let i = 0; i < scanStack.length; i++) {
    const selectors = scanStack[i];
    if (selectors && selectors.some(holdsPseudoElement)) return false;
  }
  return true;
}

/** Whether a top-level compound of the selector is a pseudo-element, in either colon spelling. */
function holdsPseudoElement(selector: string): boolean {
  const len = selector.length;
  for (
    let from = 0, stop;
    (stop = scanQPB(selector, from, len, STOP_COLON)) < len;
    from = stop + 1
  ) {
    PSEUDO_ELEMENT.lastIndex = stop;
    if (PSEUDO_ELEMENT.test(selector)) return true;
  }
  return false;
}

/**
 * A quoted string (group 1, kept whole) or a `.` starting a token: at the start, or after
 * whitespace, `,`, `(`, or `/` (group 2 is what precedes it). Each alternative is a single
 * non-nested scan, so the match is linear.
 */
const TOKEN_DOT = /("[^"]*"|'[^']*')|(^|[\s,(/])\./g;

/** Drops each token-leading `.` outside quoted strings, so `${Component}` text (`.sc-abc`) reads as a bare name. */
function stripTokenDots(value: string): string {
  return value.replace(TOKEN_DOT, (_match, quoted, lead) => quoted || lead);
}

/**
 * `head + block`, or '' when `head` would not read as one rule's selector or condition. Joining
 * and plugins write a head after its parts were read, so it is read again here; a block's
 * declarations were read as they were written. Server-rendered text splits on the separator and
 * reads a trimmed part starting with a group marker as bookkeeping, so neither may be rule text.
 * `unread` is the part of the block no nested call has looked at.
 */
function wholeRule(head: string, block: string, unread = block): string {
  if (
    (!NEEDS_FIELD_SCAN.test(head) || (staysOneField(head) && head.indexOf(SEPARATOR) === -1)) &&
    unread.indexOf(SEPARATOR) === -1 &&
    !head.trimStart().startsWith(GROUP_MARKER)
  ) {
    return head + block;
  }

  if (__DEV__) {
    const text = head.slice(0, 80);
    warnOnce(
      'rule-not-whole',
      `The rule "${text}" holds an unmatched brace, leaves a comment, string, paren, or bracket open, or holds text reserved for server rendering, so it was dropped. Check the interpolated values and plugins that write it.`,
      text
    );
  }
  return '';
}

/**
 * Emits a node list as rules. When `walk` is on (an `emitWeb` call with ids and a parent selector)
 * it also notes the declarations that name the component's own element, reading the rules and
 * at-rules they sit in (`scanStack`) only when a relevant declaration is found. A component that
 * sets none reads no selectors for it.
 */
function emitNodes(
  nodes: StaticNode[],
  currentSelector: string,
  options: EmitOptions | undefined,
  walk: WalkState,
  inScope = false
): string[] {
  let body = '';
  /** Bridge-added declarations; written before the authored ones so an authored declaration wins. */
  let companions = '';
  let other: string[] | null = null;

  const declTransform = options && options.decl;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    switch (node.kind) {
      case NodeKind.Decl: {
        // Post-fillAst invariant: `prop` and `value` are plain strings (realized by `fillNode`).
        const prop = node.prop;
        const lower = prop.charCodeAt(0) | $.UPPER_TO_LOWER;
        let value = node.value;
        // Every name in `AUTO_PROPS` is nine or more characters long and starts with `c` or `v`.
        if (prop.length >= 9 && (lower === LOWER_C || lower === LOWER_V)) {
          const idx = AUTO_PROPS.indexOf(prop.toLowerCase());
          if (idx !== -1) {
            if (
              walk &&
              idx < AutoProp.Container &&
              (idx !== AutoProp.ContainerType || !isKeyword(value, 'normal')) &&
              (idx !== AutoProp.ViewTransitionName || !isKeyword(value, 'none'))
            ) {
              const bit = 1 << idx;
              if (!(foundNames & bit)) {
                const state = scanState();
                if (state && (idx === AutoProp.ViewTransitionName || state === ScanState.Own)) {
                  foundNames |= bit;
                }
              }
            }
            if ((idx & 1) === 0) value = stripTokenDots(value);
          }
        }
        const authored = formatDecl(prop, value, declTransform);
        body += authored;

        if (__NATIVE_WEB__ && walk && authored && prop.length === 14 && lower === LOWER_V) {
          const alignContent = alignContentFor(prop, node.value);
          if (alignContent && onElement()) {
            companions += formatDecl('align-content', alignContent, declTransform);
          }
        }
        break;
      }
      case NodeKind.Rule: {
        let resolved = inScope
          ? resolveScopedSelectors(node.selectors, Boolean(options && options.rw))
          : resolveRuleSelectors(node.selectors, currentSelector);
        if (resolved === null) break;

        if (!inScope && options && options.selfRefSelector && options.componentId) {
          resolved = applySelfReferenceRewrite(
            resolved,
            options.selfRefSelector,
            options.componentId
          );
        }
        if (walk) scanStack.push(node.selectors);
        const childResults = emitNodes(node.children, resolved, options, walk && WalkState.On);
        if (walk) scanStack.pop();
        if (childResults.length) {
          if (other === null) other = childResults;
          else for (let k = 0; k < childResults.length; k++) other.push(childResults[k]);
        }
        break;
      }
      case NodeKind.AtRule:
        // `@charset` has no effect in this pipeline; dropping it keeps emitted CSS stable.
        if (node.name.length !== 7 || node.name.toLowerCase() !== 'charset') {
          const emitted = emitAtRule(node, currentSelector, options, walk && WalkState.On, inScope);
          if (emitted) (other || (other = [])).push(emitted);
        }
        break;
    }
  }

  // Both lists name every id of the extension chain, so an extension keeps matching its base's
  // rules. A `container-name` makes an `@container <name>` query match a container-type other than
  // `normal` on the element; a `view-transition-class` makes `::view-transition-group(*.<id>)`
  // match a `view-transition-name` other than `none` in any state or condition.
  if (walk === WalkState.Root && foundNames) {
    const names = stripTokenDots(autoIds);
    if (
      (foundNames & ((1 << AutoProp.ContainerName) | (1 << AutoProp.ContainerType))) ===
      1 << AutoProp.ContainerType
    ) {
      body += formatDecl(AUTO_PROPS[AutoProp.ContainerName], names, declTransform);
    }
    if (
      (foundNames & ((1 << AutoProp.ViewTransitionClass) | (1 << AutoProp.ViewTransitionName))) ===
      1 << AutoProp.ViewTransitionName
    ) {
      body += formatDecl(AUTO_PROPS[AutoProp.ViewTransitionClass], names, declTransform);
    }
  }

  if (companions) body = companions + body;

  const declSelector = currentSelector || (inScope ? SCOPE_REF : '');
  if (!(body && declSelector)) return other || [];

  const result: string[] = [];
  const block = '{' + body + '}';
  const rewritten = options && options.rw ? options.rw(declSelector) : declSelector;
  let written: number;
  if (typeof rewritten === 'string') {
    written = rewritten.length;
    const rule = wholeRule(rewritten, block);
    if (rule) result.push(rule);
  } else {
    written = 0;
    for (let i = 0; i < rewritten.length; i++) {
      const head = rewritten[i];
      written += head.length;
      const rule = wholeRule(head, block);
      if (rule) result.push(rule);
    }
  }
  // `declSelector` is already counted; what a plugin added is not.
  composedSize += Math.max(written - declSelector.length, 0);
  if (other !== null) for (let i = 0; i < other.length; i++) result.push(other[i]);
  return result;
}

function emitAtRule(
  node: StaticAtRuleNode,
  currentSelector: string,
  options: EmitOptions | undefined,
  walk: WalkState.Off | WalkState.On,
  inScope = false
): string {
  // Post-fillAst invariant: prelude / name are strings.
  const lowerName = node.name.toLowerCase();
  let prelude = stripCommaSpaces(node.prelude);
  // `${Component}` interpolation pre-stringifies to a class selector
  // (`.sc-aBcDeF`) for normal selector contexts. In the `@container
  // <name>` slot a bare ident is required by the CSS parser; strip a
  // leading dot from the prelude so cross-component container queries
  // emit valid CSS the browser can match.
  const isScope = lowerName === 'scope';
  let rawStart = '';
  if (lowerName === AUTO_PROPS[AutoProp.Container] && prelude.charCodeAt(0) === $.DOT) {
    prelude = prelude.substring(1);
  } else if (isScope && prelude) {
    let startPart = '';
    let endPart = prelude;
    if (prelude.charCodeAt(0) === $.OPEN_PAREN) {
      const close = scanQPB(prelude, 1, prelude.length, STOP_RPAREN);
      if (close < prelude.length) {
        rawStart = trimRange(prelude, 1, close);
        endPart = prelude.substring(close + 1);
        if (rawStart) {
          const parent = trimRange(currentSelector);
          if (parent) {
            const ancestor =
              scanQPB(parent, 0, parent.length, STOP_COMMA) < parent.length
                ? ':is(' + parent + ')'
                : parent;
            const items = splitTopLevelCommas(rawStart, true);
            const selfRef = options && options.selfRefSelector;
            const compId = options && options.componentId;
            for (let i = 0; i < items.length && composedSize <= MAX_COMPOSED_SIZE; i++) {
              const item = resolveSingle(items[i], ancestor);
              items[i] =
                selfRef && compId ? applySelfReferenceRewrite(item, selfRef, compId) : item;
            }
            startPart = '(' + items.join(',') + ')';
          } else {
            startPart =
              '(' + ((inScope && replaceAmpersand(rawStart, SCOPE_REF)) || rawStart) + ')';
          }
        } else {
          startPart = '()';
        }
      }
    }
    const expandedEnd =
      composedSize <= MAX_COMPOSED_SIZE && endPart ? replaceAmpersand(endPart, SCOPE_REF) : null;
    if (composedSize > MAX_COMPOSED_SIZE) {
      if (__DEV__) warnTooLarge(currentSelector || SCOPE_REF);
      return '';
    }
    prelude = startPart + (expandedEnd ?? endPart);
  }
  const header = '@' + node.name + (prelude ? ' ' + prelude : '');
  if (node.children === null) {
    return wholeRule(header, ';');
  }

  if (isKeyframesName(lowerName)) {
    // Frames take no namespace, no selector rewrite, and no walk: each rule holding a declaration
    // emits as its stops and those declarations. Anything else has no meaning in a keyframes body.
    const declTransform = options && options.decl;
    let frames = '';
    for (let i = 0; i < node.children.length; i++) {
      const frame = node.children[i];
      if (frame.kind !== NodeKind.Rule) continue;

      let body = '';
      let hasDecl = false;
      for (let j = 0; j < frame.children.length; j++) {
        const decl = frame.children[j];
        if (decl.kind !== NodeKind.Decl) continue;
        hasDecl = true;
        body += formatDecl(decl.prop, decl.value, declTransform);
      }
      if (hasDecl) frames += frame.selectors.join(',') + '{' + body + '}';
    }
    return wholeRule(header, '{' + frames + '}');
  }

  if (DECL_AT_RULES.test(lowerName)) {
    const body = declBody(node.children, options);
    return body ? wholeRule(header, '{' + body + '}') : '';
  }

  // Body contains rules and/or declarations. Inside `@scope`, selectors and direct declarations
  // resolve relative to the scoping root rather than inheriting the outer selector.
  const bodySelector = isScope ? '' : currentSelector;
  const bodyScope = isScope || (inScope && !currentSelector);
  const bodyWalk = isScope ? (walk && rawStart === '&' ? WalkState.On : WalkState.Off) : walk;
  composedSize += bodySelector ? bodySelector.length : bodyScope ? SCOPE_REF.length : 0;
  if (composedSize > MAX_COMPOSED_SIZE) {
    if (__DEV__) warnTooLarge(bodySelector || SCOPE_REF);
    return '';
  }

  if (bodyWalk) scanStack.push(null);
  const childStrings = emitNodes(node.children, bodySelector, options, bodyWalk, bodyScope);
  if (bodyWalk) scanStack.pop();
  if (childStrings.length === 0) {
    return lowerName === 'layer' && prelude !== '' ? wholeRule(header, '{}', '') : '';
  }
  return wholeRule(header, '{' + childStrings.join('') + '}', '');
}

/**
 * `prop:value;` per declaration child, joined; '' when there are none. An at-rule nested in a
 * declaration body is a declaration block itself (`@page` margin boxes, `@font-feature-values`
 * blocks), so it is kept with its own declarations; a keyframes block has frames, not declarations,
 * and has no place there.
 */
function declBody(children: ReadonlyArray<StaticNode>, options: EmitOptions | undefined): string {
  const declTransform = options && options.decl;
  let body = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.kind === NodeKind.Decl) {
      body += formatDecl(child.prop, child.value, declTransform);
    } else if (
      child.kind === NodeKind.AtRule &&
      child.children !== null &&
      !isKeyframesName(child.name)
    ) {
      const inner = declBody(child.children, options);
      if (inner) {
        body += wholeRule(
          '@' + child.name + (child.prelude ? ' ' + child.prelude : ''),
          '{' + inner + '}'
        );
      }
    }
  }
  return body;
}

/**
 * Resolve nested selectors against a parent selector.
 *
 * Template nesting semantics:
 *   - `&` and `& + &` etc.: replace `&` with the parent selector
 *   - bare selectors like `.foo` or `p`: prepend parent + space
 *   - comma-separated list: each selector resolved independently, joined with `,`
 *   - comma-separated PARENT: cross-product (each parent × each child)
 *     e.g., parent="div, span", child="h1 span" → "div h1 span, span h1 span"
 */
function resolveRuleSelectors(selectors: string[], parent: string): string | null {
  // The limit spans the whole emit, so a sibling after the one that passed it drops unread.
  if (composedSize > MAX_COMPOSED_SIZE) {
    if (__DEV__) warnTooLarge(parent);
    return null;
  }

  if (selectors.length === 0) {
    composedSize += parent.length;
    return parent;
  }

  // One selector under one parent is the common shape: nothing to cross or join.
  if (selectors.length === 1 && parent.indexOf(',') === -1) {
    const single = resolveSingle(selectors[0], parent);
    if (composedSize > MAX_COMPOSED_SIZE) {
      if (__DEV__) warnTooLarge(parent);
      return null;
    }
    return single;
  }

  const parents = parent ? splitTopLevelCommas(parent) : [parent];
  const resolved: string[] = [];
  for (let ci = 0; ci < selectors.length; ci++) {
    for (let pi = 0; pi < parents.length; pi++) {
      resolved.push(resolveSingle(selectors[ci], parents[pi]));
      if (composedSize > MAX_COMPOSED_SIZE) {
        if (__DEV__) warnTooLarge(parent);
        return null;
      }
    }
  }

  return resolved.join(',');
}

function warnTooLarge(parent: string): void {
  warnOnce(
    'selector-too-large',
    `A nested selector under "${parent.slice(0, 80)}" composes past the size limit, so the rule was dropped. Nest fewer selector lists or fewer \`&\` references.`
  );
}

/**
 * Replace every unescaped, unquoted `&` in `text` with `parent`, returning `null`
 * when `text` holds none (or `''` past the composed-size limit).
 */
function replaceAmpersand(text: string, parent: string): string | null {
  let expanded = '';
  let from = 0;
  let quote = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === $.BACKSLASH) i++;
    else if (quote) {
      if (c === quote) quote = 0;
    } else if (c === $.DOUBLE_QUOTE || c === $.SINGLE_QUOTE) quote = c;
    else if (c === $.AMPERSAND) {
      composedSize += parent.length;
      if (composedSize > MAX_COMPOSED_SIZE) return '';

      expanded += text.substring(from, i) + parent;
      from = i + 1;
    }
  }
  return from ? expanded + text.substring(from) : null;
}

/** Whether `s` holds an unescaped, unquoted `:scope` pseudo-class (not `::scope` or `:scoped`). */
function containsScopePseudo(s: string): boolean {
  let quote = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === $.BACKSLASH) i++;
    else if (quote) {
      if (c === quote) quote = 0;
    } else if (c === $.DOUBLE_QUOTE || c === $.SINGLE_QUOTE) quote = c;
    else if (c === $.COLON) {
      if (s.charCodeAt(i + 1) === $.COLON) i++;
      else {
        SCOPE_PSEUDO.lastIndex = i;
        if (SCOPE_PSEUDO.test(s)) return true;
      }
    }
  }
  return false;
}

/** Resolve direct child rule selectors inside `@scope`. */
function resolveScopedSelectors(selectors: string[], hasRw: boolean): string | null {
  if (selectors.length === 0) {
    composedSize += SCOPE_REF.length;
    if (composedSize > MAX_COMPOSED_SIZE) {
      if (__DEV__) warnTooLarge(SCOPE_REF);
      return null;
    }
    return SCOPE_REF;
  }
  let out = '';
  for (let i = 0; i < selectors.length; i++) {
    if (i > 0) out += ',';
    out += resolveScopedSingle(selectors[i], hasRw);
    if (composedSize > MAX_COMPOSED_SIZE) {
      if (__DEV__) warnTooLarge(SCOPE_REF);
      return null;
    }
  }
  return out;
}

function resolveScopedSingle(selector: string, hasRw: boolean): string {
  let expanded = replaceAmpersand(selector, SCOPE_REF);
  if (expanded === '') return '';
  composedSize += selector.length;
  const first = selector.charCodeAt(0);
  if (first === $.GT || first === $.PLUS || first === $.TILDE) {
    composedSize += SCOPE_REF.length;
    expanded = SCOPE_REF + (expanded ?? selector);
  } else if (expanded === null) {
    if (!hasRw || containsScopePseudo(selector)) {
      expanded = selector;
    } else {
      composedSize += SCOPE_REF.length + 1;
      expanded = SCOPE_REF + ' ' + selector;
    }
  }
  return stripCombinatorSpaces(expanded);
}

/** An escaped `&` or one in a string is text, so only the rest take the parent. */
function resolveSingle(selector: string, rawParent: string): string {
  const parent = trimRange(rawParent);
  let expanded = replaceAmpersand(selector, parent);
  if (expanded === '') return '';
  composedSize += selector.length;
  if (expanded === null) {
    composedSize += parent.length;
    expanded = parent ? parent + ' ' + selector : selector;
  }
  return stripCombinatorSpaces(expanded);
}

/** Strip CSS whitespace around selector combinators (`>`, `+`, `~`) outside parens/brackets/strings. */
function stripCombinatorSpaces(expanded: string): string {
  // Measured: on short text this test beats the scan, and most selectors hold no combinator.
  if (!/[>+~]/.test(expanded)) return expanded;

  const len = expanded.length;
  let out = '';
  let segStart = 0;
  while (segStart < len) {
    const stop = scanQPB(expanded, segStart, len, STOP_COMBINATOR);
    if (stop >= len) break;

    let left = stop;
    while (left > segStart && $.isSpace(expanded.charCodeAt(left - 1))) {
      if (left - 2 >= segStart && expanded.charCodeAt(left - 2) === $.BACKSLASH) {
        let bs = left - 2;
        while (bs > segStart && expanded.charCodeAt(bs - 1) === $.BACKSLASH) bs--;
        if (((left - 1 - bs) & 1) === 1) break;
      }
      left--;
    }
    out += expanded.substring(segStart, left) + expanded[stop];

    segStart = stop + 1;
    while ($.isSpace(expanded.charCodeAt(segStart))) segStart++;
  }
  return out + expanded.substring(segStart);
}

/**
 * Self-reference rewrite for combinator patterns like `X + X` on the static class.
 *
 * Gate condition: the COMPILED selector starts AND ends with
 * `selfRefSelector`, AND removing all occurrences of `selfRefSelector` leaves
 * non-empty content. Examples for `selfRefSelector=".a"`:
 *   `.a`              → FAIL (removing leaves "")
 *   `.a.a.a`          → FAIL (removing leaves "")
 *   `.a + .a`         → PASS  (removing leaves " + ")
 *   `.a ~ .a ~ .a`    → PASS
 *   `.a[disabled]`    → FAIL (doesn't end with `.a`)
 *   `body .a`         → FAIL (doesn't start with `.a`)
 *
 * When gated in, every `selfRefSelector\b` occurrence is rewritten to
 * `.${componentId}`.
 */
function applySelfReferenceRewrite(
  compiledSelector: string,
  selfRefSelector: string,
  componentId: string
): string {
  if (
    !compiledSelector.startsWith(selfRefSelector) ||
    !compiledSelector.endsWith(selfRefSelector)
  ) {
    return compiledSelector;
  }

  const parts = compiledSelector.split(selfRefSelector);
  if (!parts.join('')) return compiledSelector;

  const replacement = '.' + componentId;
  let out = '';
  for (let i = 1; i < parts.length; i++) {
    out += ($.isIdentChar(parts[i].charCodeAt(0)) ? selfRefSelector : replacement) + parts[i];
  }
  return out;
}
