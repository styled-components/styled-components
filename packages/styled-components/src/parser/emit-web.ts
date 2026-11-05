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
   * class.
   */
  componentId?: string | undefined;
  /** @internal */
  selfRefSelector?: string | undefined;
  /**
   * Prepended to every emitted rule selector AFTER `&` resolution (namespace
   * from `StyleSheetManager`). Skipped for @keyframes.
   */
  namespace?: string | undefined;
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
  const componentId = options && options.componentId;
  return emitNodes(
    componentId ? maybeAugmentWithAutoName(root, componentId) : root,
    parentSelector,
    options
  );
}

/**
 * When the component's own element gets a `container-type` with a non-`normal` value but no
 * `container-name`, the name comes from the component's stable id, so `${Component}` in an
 * `@container <name>` query matches without anyone writing a `container-name`.
 */
function maybeAugmentWithAutoName(root: StaticRoot, componentId: string): StaticRoot {
  return writesToOwnElement(root, 'container-type') && !writesToOwnElement(root, 'container-name')
    ? root.concat({
        kind: NodeKind.Decl,
        prop: 'container-name',
        value: componentId,
      })
    : root;
}

/** Root declarations and rules on `&` alone count; any other rule targets another element or state. */
function writesToOwnElement(nodes: StaticRoot, prop: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (
      node.kind === NodeKind.Decl
        ? node.prop === prop && (prop === 'container-name' || node.value !== 'normal')
        : node.kind === NodeKind.Rule &&
          writesToOwnElement(node.children, prop) &&
          /^&+$/.test(node.selectors.join(''))
    ) {
      return true;
    }
  }
  return false;
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

function emitNodes(
  nodes: StaticNode[],
  currentSelector: string,
  options: EmitOptions | undefined
): string[] {
  let body = '';
  const other: string[] = [];

  const declTransform = options && options.decl;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    switch (node.kind) {
      case NodeKind.Decl:
        // Post-fillAst invariant: `prop` and `value` are strings (any
        // TemplateValue was realized by `fillDecl`). The
        // `string | TemplateValue` AST type covers the parse-time form;
        // emit-web is only called on filled (or never-templated) ASTs.
        body += formatDecl(node.prop, node.value, declTransform);
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
        const childResults = emitNodes(node.children, resolved, options);
        for (let k = 0; k < childResults.length; k++) other.push(childResults[k]);
        break;
      }
      case NodeKind.AtRule:
        // `@charset` has no effect in this pipeline; dropping it keeps emitted CSS stable.
        if (node.name !== 'charset') {
          const emitted = emitAtRule(node, currentSelector, options);
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
      written += heads[i].length;
      const rule = wholeRule(heads[i], block);
      if (rule) result.push(rule);
    }
    // `currentSelector` is already counted; what a namespace or plugin added is not.
    composedSize += Math.max(written - currentSelector.length, 0);
  }
  for (let i = 0; i < other.length; i++) result.push(other[i]);
  return result;
}

/**
 * Prepend a namespace prefix to every top-level comma-separated selector,
 * e.g. `.a,.b` with namespace `.parent` → `.parent .a,.parent .b`. Commas
 * inside `:is()`, `[attr]`, strings are preserved.
 */
function prependNamespace(selector: string, namespace: string): string {
  const prefix = namespace + ' ';
  if (selector.indexOf(',') === -1) return prefix + selector;
  const parts = splitTopLevelCommas(selector);
  for (let i = 0; i < parts.length; i++) parts[i] = prefix + parts[i];
  return parts.join(',');
}

function emitAtRule(
  node: StaticAtRuleNode,
  currentSelector: string,
  options: EmitOptions | undefined
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

  const childStrings = emitNodes(node.children, currentSelector, options);
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

/** `prop:value;` per declaration child, joined; '' when there are none. */
function declBody(children: ReadonlyArray<StaticNode>, options: EmitOptions | undefined): string {
  const declTransform = options && options.decl;
  let body = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.kind === NodeKind.Decl) {
      body += formatDecl(child.prop, child.value, declTransform);
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
