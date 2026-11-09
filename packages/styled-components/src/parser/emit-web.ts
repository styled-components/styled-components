import { SC_ATTR, SPLITTER } from '../constants';
import * as $ from '../utils/charCodes';
import {
  NodeKind,
  StaticAtRuleNode,
  StaticKeyframeFrame,
  StaticKeyframesNode,
  StaticNode,
  StaticRoot,
} from './ast';
import { warnOnce } from '../utils/warnOnce';
import {
  NEEDS_FIELD_SCAN,
  scanQPB,
  splitTopLevelCommas,
  staysOneField,
  stripCommaSpaces,
  trimRange,
} from './parser';

/**
 * Most selector text one emit composes. A `,` or `&` at each nesting level multiplies the
 * text under it, so a short value could otherwise build gigabytes.
 */
const MAX_COMPOSED_SIZE = 1 << 22;
let composedSize = 0;

const GROUP_MARKER = SC_ATTR + '.g';

/** An HTML parser turns a CR after this into the line feed that ends the separator. */
const SEPARATOR = SPLITTER.trim();

/**
 * At-rule names whose bodies are direct declarations (no nested selector wrap).
 * Everything NOT in this set treats its body as nested rules that inherit the
 * parent selector.
 */
const DECL_BODY_AT_RULES = new Set([
  'font-face',
  'page',
  'property',
  'counter-style',
  'color-profile',
  'viewport',
  'font-feature-values',
  'font-palette-values',
  'position-try',
  'view-transition',
]);

/**
 * Strip whitespace around selector combinators (`>`, `+`, `~`) outside
 * parens/brackets/strings. Substring-based writes (cheaper than per-char).
 *
 * `& > .foo + .bar`   → `&>.foo+.bar`
 * `:is(& + .x)`       → `:is(& + .x)`  (preserved inside :is parens)
 */
function stripCombinatorSpaces(sel: string): string {
  // Measured: on short text this test beats the scan, and most selectors hold no combinator.
  if (!/[>+~]/.test(sel)) return sel;

  const len = sel.length;
  let out = '';
  let segStart = 0;
  while (segStart < len) {
    const stop = scanQPB(sel, segStart, len, $.GT, $.PLUS, $.TILDE, -1);
    if (stop >= len) break;

    let left = stop;
    while (left > segStart && $.isWS(sel.charCodeAt(left - 1))) left--;
    out += sel.substring(segStart, left) + sel[stop];

    segStart = stop + 1;
    while ($.isWS(sel.charCodeAt(segStart))) segStart++;
  }

  return out + sel.substring(segStart);
}

function formatDecl(
  prop: string,
  value: string,
  transform:
    | ((
        p: string,
        v: string
      ) => { prop: string; value: string } | { prop: string; value: string }[] | undefined | void)
    | undefined
): string {
  const t = transform && transform(prop, value);
  if (!t) return prop + ':' + value + ';';

  let out: string;
  if (Array.isArray(t)) {
    out = t[0].prop + ':' + t[0].value;
    for (let i = 1; i < t.length; i++) out += ';' + t[i].prop + ':' + t[i].value;
  } else {
    out = t.prop + ':' + t.value;
  }

  // A parsed declaration stays in its block; a plugin's rewrite has not been read.
  const end = out.length;
  if (scanQPB(out, 0, end, $.OPEN_BRACE, $.CLOSE_BRACE, -1, -1) === end) return out + ';';

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
   * Prepended to every emitted rule selector AFTER `&` resolution (namespace
   * from `StyleSheetManager`), or joined onto a root-anchored item (see
   * `prependNamespace`). Skipped for @keyframes.
   */
  namespace?: NamespaceForm | undefined;
  /**
   * Final-stage selector transform. Used by RSC's child-selector rewrite so
   * `:first-child` / `:nth-child()` exclude `<style data-styled>` tags. Runs
   * after namespace + self-reference resolution. Return a string to replace
   * the selector, or an array to emit one rule per selector. Short name
   * keeps bundle size down; object keys aren't mangled by minifiers.
   */
  rw?: ((selector: string) => string | string[]) | undefined;
  /**
   * Declaration transform. Invoked on every emitted `prop: value` pair,
   * including declarations inside @keyframes and decl-body at-rules
   * (@font-face, @property, etc). Return `{prop, value}` to rewrite, an
   * array to expand one authored declaration into several, or undefined
   * to pass through. Used by first-party plugins like RTL and prefix.
   */
  decl?:
    | ((
        prop: string,
        value: string
      ) => { prop: string; value: string } | { prop: string; value: string }[] | undefined | void)
    | undefined;
}

/**
 * Emit minified CSS rule strings from a parser AST for web injection.
 * Shape is stable for a given AST so class-name hashes stay deterministic.
 *
 * @param root         Parsed AST from `parse()`.
 * @param parentSelector  Pre-composed parent selector (namespace + prefix + selector).
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

/**
 * Whether the property's value is a bare name: `${Component}` stringifies as a class selector
 * (`.sc-abc`) and these take the name alone. `@container` preludes get the same treatment in
 * `emitAtRule`. The length test rejects nearly every property before a string compare runs.
 */
function takesBareName(prop: string): boolean {
  const length = prop.length;
  return length === 9
    ? prop === 'container'
    : length === 14
      ? prop === 'container-name'
      : length === 21 && prop === 'view-transition-class';
}

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

/** The ids to name by, and the flags of `ownNameBits` found so far, for the emit in progress. */
let autoIds = '';
let foundNames = 0;

/** The selectors of each rule (`null` for an at-rule) the walk is inside, outermost first. */
const scanStack: Array<string[] | null> = [];

/** The scan state of the declarations at the current point of the walk. */
function scanState(): ScanState {
  let state = ScanState.Own;
  for (let i = 0; i < scanStack.length && state; i++) {
    const selectors = scanStack[i];
    state = selectors ? scanOfRule(selectors, state) : ScanState.Other;
  }
  return state;
}

/** Records a declaration's flags, classifying it by where it sits only when it has any. */
function noteNames(prop: string, value: string): void {
  const bits = ownNameBits(prop, value, ScanState.Own);
  if (!bits || (foundNames & bits) === bits) return;

  const state = scanState();
  if (state) foundNames |= ownNameBits(prop, value, state);
}

/**
 * Flags for one declaration: 1 own `container-name`, 2 own `container-type` other than `normal`,
 * 4 own `view-transition-class`, 8 a `view-transition-name` other than `none` on the element.
 * Only a scan at `ScanState.Own` counts the own flags.
 */
function ownNameBits(prop: string, value: string, scan: ScanState): number {
  if (prop === 'view-transition-name') return value !== 'none' ? 8 : 0;
  if (scan < ScanState.Own) return 0;
  if (prop === 'container-name') return 1;
  if (prop === 'container-type') return value !== 'normal' ? 2 : 0;
  return prop === 'view-transition-class' ? 4 : 0;
}

/**
 * The scan state for a rule's children, from its parent's: a rule on one element (see
 * `isSameElement`) stays in the scan, and one on `&` alone keeps the own flags.
 */
function scanOfRule(selectors: string[], scan: ScanState): ScanState {
  if (!selectors.every(isSameElement)) return ScanState.Off;

  return scan >= ScanState.Own && /^&+$/.test(selectors.join('')) ? ScanState.Own : ScanState.Other;
}

/**
 * `&` with only a compound after it (`&:hover`, `&:is(.a, .b)`, `&[data-x="a b"]`): no top-level
 * whitespace or combinator to another element; text inside parens, brackets, and strings does not
 * count. A pseudo-element (`&::before`) counts too: the names it adds to the element stay inert,
 * since a pseudo-element's own name or container type never makes the element a participant.
 * The regex answers the common shapes; the token scans (measured at about 20% of an emit) run only
 * when it says no.
 */
function isSameElement(selector: string): boolean {
  const len = selector.length;
  return (
    /^&[^\s>+~]*$/.test(selector) ||
    (selector.charCodeAt(0) === $.AMPERSAND &&
      scanQPB(selector, 1, len, $.SPACE, $.GT, $.PLUS, $.TILDE) === len &&
      scanQPB(selector, 1, len, $.TAB, $.LF, $.CR, $.FF) === len)
  );
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
 * it also notes the declarations that name the component's own element (`noteNames`), reading the
 * rules and at-rules they sit in (`scanStack`) only when a relevant declaration is found. A
 * component that sets none reads no selectors for it.
 */
function emitNodes(
  nodes: StaticNode[],
  currentSelector: string,
  options: EmitOptions | undefined,
  walk: WalkState
): string[] {
  let body = '';
  const other: string[] = [];

  const declTransform = options && options.decl;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    switch (node.kind) {
      case NodeKind.Decl:
        if (walk) noteNames(node.prop, node.value);

        // Post-fillAst invariant: `prop` and `value` are strings (any
        // TemplateValue was realized by `fillDecl`). The
        // `string | TemplateValue` AST type covers the parse-time form;
        // emit-web is only called on filled (or never-templated) ASTs.
        body += formatDecl(
          node.prop,
          takesBareName(node.prop) ? stripTokenDots(node.value) : node.value,
          declTransform
        );
        break;
      case NodeKind.Rule: {
        let resolved = resolveRuleSelectors(node.selectors, currentSelector);
        if (resolved === null) break;

        if (options && options.selfRefSelector && options.componentId) {
          resolved = applySelfReferenceRewrite(
            resolved,
            options.selfRefSelector,
            options.componentId
          );
        }
        if (walk) scanStack.push(node.selectors);
        const childResults = emitNodes(node.children, resolved, options, walk && WalkState.On);
        if (walk) scanStack.pop();
        for (let k = 0; k < childResults.length; k++) other.push(childResults[k]);
        break;
      }
      case NodeKind.AtRule:
        // `@charset` has no effect in this pipeline; dropping it keeps emitted CSS stable.
        if (node.name !== 'charset') {
          const emitted = emitAtRule(node, currentSelector, options, walk && WalkState.On);
          if (emitted) other.push(emitted);
        }
        break;
      case NodeKind.Keyframes: {
        const emitted = emitKeyframes(node, options);
        if (emitted) other.push(emitted);
        break;
      }
    }
  }

  // Both lists name every id of the extension chain, so an extension keeps matching its base's
  // rules. A `container-name` makes an `@container <name>` query match a container-type other than
  // `normal` on the element; a `view-transition-class` makes `::view-transition-group(*.<id>)`
  // match a `view-transition-name` other than `none` in any state or condition.
  if (walk === WalkState.Root && foundNames) {
    const names = stripTokenDots(autoIds);
    if ((foundNames & 3) === 2) body += formatDecl('container-name', names, declTransform);
    if ((foundNames & 12) === 8) body += formatDecl('view-transition-class', names, declTransform);
  }

  const result: string[] = [];
  if (body && currentSelector) {
    const wrappingSelector =
      options && options.namespace
        ? prependNamespace(currentSelector, options.namespace)
        : currentSelector;
    const block = '{' + body + '}';
    const rewritten = options && options.rw ? options.rw(wrappingSelector) : wrappingSelector;
    const heads = Array.isArray(rewritten) ? rewritten : [rewritten];
    let written = 0;
    for (let i = 0; i < heads.length; i++) {
      const head = heads[i];
      written += head.length;
      const rule = wholeRule(head, block);
      if (rule) result.push(rule);
    }
    // `currentSelector` is already counted; what a namespace or plugin added is not.
    composedSize += Math.max(written - currentSelector.length, 0);
  }
  for (let i = 0; i < other.length; i++) result.push(other[i]);
  return result;
}

/** A namespace as `prependNamespace` writes it; a compiler derives it once, since it fixes its namespace. */
export interface NamespaceForm {
  /** The namespace joined onto a root name: '' when it cannot be joined onto a compound. */
  join: string;
  /** The namespace and a descendant combinator. */
  prefix: string;
}

/** The form of `namespace` for `EmitOptions.namespace`. */
export function namespaceForm(namespace: string): NamespaceForm {
  const trimmed = trimRange(namespace, 0, namespace.length);
  // Trimming removed the whitespace that ends a trailing hex escape.
  const written = TRAILING_HEX_ESCAPE.test(trimmed) ? trimmed + ' ' : trimmed;
  return { join: isOneCompound(trimmed) ? written : '', prefix: written + ' ' };
}

/**
 * Whether the trimmed namespace is one compound without a pseudo-element. Text left open is not
 * judged: a head holding it is dropped whole, joined or not. Each scan stops at a top-level byte
 * only, and a colon's end restarts it with no state to carry, so every character is read once.
 */
function isOneCompound(trimmed: string): boolean {
  const first = trimmed.charCodeAt(0);
  if (first !== $.HASH && first !== $.DOT && first !== $.OPEN_BRACKET && first !== $.COLON) {
    return false;
  }

  const len = trimmed.length;
  for (
    let from = 0, stop;
    (stop = scanQPB(trimmed, from, len, $.COLON, $.SPACE, $.COMMA, $.GT)) < len;
    from = stop + 1
  ) {
    if (trimmed.charCodeAt(stop) !== $.COLON) return false;

    PSEUDO_ELEMENT.lastIndex = stop;
    if (PSEUDO_ELEMENT.test(trimmed)) return false;
  }

  return (
    scanQPB(trimmed, 0, len, $.TAB, $.LF, $.CR, $.FF) >= len &&
    scanQPB(trimmed, 0, len, $.PLUS, $.TILDE, -1, -1) >= len
  );
}

/** A pseudo-element at its colon: `::`, or one of the Level 1 and 2 names a browser still reads after one colon. */
const PSEUDO_ELEMENT = /:(?::|(?:before|after|first-line|first-letter)(?![\w-]))/iy;

/**
 * A document-level view-transition pseudo, with or without the universal selector. Else `html` or
 * `:root` as a whole name: no name character, escape or `|` (a namespace bar) after it.
 */
const ROOT_ITEM = /\*?::view-transition|(?:html|:root)(?![\w\\|-]|[^\0-\x7f])/iy;

/**
 * A hex escape (`\31`) closing the text, after an even run of backslashes so `\\31` is not one.
 * The escape takes one whitespace after its digits as its end, so text written right after it
 * would read as part of the code point, or lose its meaning (a space meant as a combinator).
 * Linear: inside a backslash run only the character before the run can start a match.
 */
const TRAILING_HEX_ESCAPE = /(?:^|[^\\])(?:\\\\)*\\[\da-f]{1,6}$/i;

/**
 * The item with the namespace written for the root it names, else the item behind the prefix.
 * `ROOT_ITEM.lastIndex` is 0 between calls: a miss resets it, and a hit's end is read, then cleared.
 */
function prefixItem(item: string, namespace: NamespaceForm): string {
  const { join } = namespace;
  const first = item.charCodeAt(0);
  const mayBeRoot =
    join !== '' &&
    ((first | $.UPPER_TO_LOWER) === $.LOWER_H || first === $.COLON || first === $.ASTERISK);
  if (!mayBeRoot || !ROOT_ITEM.test(item)) return namespace.prefix + item;

  const nameEnd = ROOT_ITEM.lastIndex;
  ROOT_ITEM.lastIndex = 0;
  if (first === $.ASTERISK || item.charCodeAt(1) === $.COLON) {
    return ':is(' + join + ',' + join + ' *)' + item.substring(first === $.ASTERISK ? 1 : 0);
  }

  return item.substring(0, nameEnd) + join + item.substring(nameEnd);
}

/**
 * Write the namespace in front of every top-level comma-separated selector, e.g. `.a,.b` under
 * `.parent` gives `.parent .a,.parent .b`. Commas inside `:is()`, `[attr]` and strings stay.
 * Each item is placed by `prefixItem`; the placement rules are in docs/namespace.md "Placement
 * model" and their rows in `emit-web.test.ts`.
 */
function prependNamespace(selector: string, namespace: NamespaceForm): string {
  if (selector.indexOf(',') === -1) return prefixItem(selector, namespace);

  const parts = splitTopLevelCommas(selector);
  for (let i = 0; i < parts.length; i++) parts[i] = prefixItem(parts[i], namespace);
  return parts.join(',');
}

function emitAtRule(
  node: StaticAtRuleNode,
  currentSelector: string,
  options: EmitOptions | undefined,
  walk: WalkState.Off | WalkState.On
): string {
  // Post-fillAst invariant: prelude / name are strings.
  let prelude = stripCommaSpaces(node.prelude);
  // `${Component}` interpolation pre-stringifies to a class selector
  // (`.sc-aBcDeF`) for normal selector contexts. In the `@container
  // <name>` slot a bare ident is required by the CSS parser; strip a
  // leading dot from the prelude so cross-component container queries
  // emit valid CSS the browser can match.
  if (node.name === 'container' && prelude.charCodeAt(0) === $.DOT) {
    prelude = prelude.substring(1);
  }
  const header = '@' + node.name + (prelude ? ' ' + prelude : '');
  if (node.children === null) {
    return wholeRule(header, ';');
  }

  if (DECL_BODY_AT_RULES.has(node.name)) {
    // Body is bare declarations; emit inline, no selector wrap.
    const body = declBody(node.children, options);
    return body ? wholeRule(header, '{' + body + '}') : '';
  }

  // Body contains rules and/or declarations; inherit the parent selector.
  composedSize += currentSelector.length;
  if (composedSize > MAX_COMPOSED_SIZE) {
    if (__DEV__) warnTooLarge(currentSelector);
    return '';
  }

  if (walk) scanStack.push(null);
  const childStrings = emitNodes(node.children, currentSelector, options, walk);
  if (walk) scanStack.pop();
  if (childStrings.length === 0) return '';
  return wholeRule(header, '{' + childStrings.join('') + '}', '');
}

function emitKeyframes(node: StaticKeyframesNode, options: EmitOptions | undefined): string {
  const frames: string[] = [];
  for (let i = 0; i < node.frames.length; i++) {
    const frame = node.frames[i];
    // Empty frames (`from { }`) are omitted (no declarations to emit).
    if (frame.children.length === 0) continue;
    frames.push(emitFrame(frame, options));
  }
  // Post-fillAst invariant: name / prelude are strings.
  const header = '@' + node.name + (node.prelude ? ' ' + node.prelude : '');
  return wholeRule(header, '{' + frames.join('') + '}');
}

function emitFrame(frame: StaticKeyframeFrame, options: EmitOptions | undefined): string {
  // The body is empty when a plugin rewrite dropped every declaration of the frame.
  return frame.stops.join(',') + '{' + declBody(frame.children, options) + '}';
}

/**
 * `prop:value;` per declaration child, joined; '' when there are none. An at-rule nested in a
 * declaration body is a declaration block itself (`@page` margin boxes, `@font-feature-values`
 * blocks), so it is kept with its own declarations.
 */
function declBody(children: ReadonlyArray<StaticNode>, options: EmitOptions | undefined): string {
  const declTransform = options && options.decl;
  let body = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.kind === NodeKind.Decl) {
      body += formatDecl(child.prop, child.value, declTransform);
    } else if (child.kind === NodeKind.AtRule && child.children !== null) {
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

  const parents = parent ? splitTopLevelCommas(parent) : [parent];
  const resolved: string[] = [];
  for (let ci = 0; ci < selectors.length; ci++) {
    for (let pi = 0; pi < parents.length; pi++) {
      resolved.push(resolveSingle(selectors[ci], trimRange(parents[pi], 0, parents[pi].length)));
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

/** An escaped `&` or one in a string is text, so only the rest take the parent. */
function resolveSingle(selector: string, parent: string): string {
  let expanded = '';
  let from = 0;
  let quote = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector.charCodeAt(i);
    if (c === $.BACKSLASH) i++;
    else if (quote) {
      if (c === quote) quote = 0;
    } else if (c === $.DOUBLE_QUOTE || c === $.SINGLE_QUOTE) quote = c;
    else if (c === $.AMPERSAND) {
      composedSize += parent.length;
      if (composedSize > MAX_COMPOSED_SIZE) return '';

      expanded += selector.substring(from, i) + parent;
      from = i + 1;
    }
  }

  composedSize += selector.length;
  if (from) expanded += selector.substring(from);
  else {
    composedSize += parent.length;
    expanded = parent ? parent + ' ' + selector : selector;
  }
  return stripCombinatorSpaces(expanded);
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
  if (parts.join('') === '') return compiledSelector;

  const replacement = '.' + componentId;
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    out += ($.isIdentChar(parts[i].charCodeAt(0)) ? selfRefSelector : replacement) + parts[i];
  }
  return out;
}
