import * as $ from '../utils/charCodes';
import { isWS } from '../utils/charCodes';
import { NodeKind, StaticAtRuleNode, StaticKeyframesNode, StaticNode, StaticRoot } from './ast';
import { splitTopLevelCommas, trimRange } from './parser';
import { ANY_DEPTH, BRACKETS, identifierEnd, isEscaped, isIdentCode, scan, stops } from './reader';

const COMBINATOR = stops('>+~');
const AMPERSAND = stops('&');

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
 * At-rules that are ignored at the template root (no emitted effect in this
 * pipeline). Dropping them keeps emitted CSS and class hashes stable.
 */
const DROPPED_AT_RULES = new Set(['charset']);

/**
 * Strip whitespace around selector combinators (`>`, `+`, `~`) outside
 * parens/brackets/strings. Substring-based writes (cheaper than per-char).
 *
 * `& > .foo + .bar`   → `&>.foo+.bar`
 * `:is(& + .x)`       → `:is(& + .x)`  (preserved inside :is parens)
 */
function stripCombinatorSpaces(sel: string): string {
  const len = sel.length;
  let hasCombinator = false;
  for (let i = 0; i < len; i++) {
    const c = sel.charCodeAt(i);
    if (c === $.GT || c === $.PLUS || c === $.TILDE) {
      hasCombinator = true;
      break;
    }
  }
  if (!hasCombinator) return sel;
  let out = '';
  let segStart = 0;
  let i = 0;
  while (i < len) {
    const stop = scan(sel, i, len, COMBINATOR, BRACKETS, 0);
    if (stop >= len) break;
    // Find left boundary of emitted segment (trim trailing whitespace, except
    // whitespace an escaping backslash precedes).
    let left = stop;
    while (left > segStart) {
      const p = sel.charCodeAt(left - 1);
      if (isWS(p) && !(sel.charCodeAt(left - 2) === $.BACKSLASH && isEscaped(sel, left - 1))) {
        left--;
      } else break;
    }
    out += sel.substring(segStart, left);
    out += sel[stop];
    // Skip whitespace after combinator.
    let j = stop + 1;
    while (j < len) {
      const n = sel.charCodeAt(j);
      if (isWS(n)) j++;
      else break;
    }
    segStart = j;
    i = j;
  }

  if (segStart === 0) return sel;
  if (segStart < len) out += sel.substring(segStart, len);
  return out;
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
  if (transform) {
    const t = transform(prop, value);
    if (t) {
      if (Array.isArray(t)) {
        let out = t[0].prop + ':' + t[0].value;
        for (let i = 1; i < t.length; i++) out += ';' + t[i].prop + ':' + t[i].value;
        return out;
      }
      return t.prop + ':' + t.value;
    }
  }
  return prop + ':' + value;
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
  // Auto-name: when the styled-component's top-level rule declares
  // `container-type` with a non-`normal` value but no explicit
  // `container-name`, derive the name from the component's stable id.
  // Lets `${Component}` interpolation in `@container <name>` queries
  // match without anyone writing a `container-name` declaration.
  // Two AST shapes to support: AST-direct emit hands us a flat root
  // of decls + nested rules; the compileString fallback pre-wraps the
  // user's CSS in `.name{…}` so the user's decls live inside a single
  // top-level Rule. Detect both and clone-augment in either case.
  const componentId = options && options.componentId;
  if (componentId) {
    const augmented = maybeAugmentWithAutoName(root, componentId);
    if (augmented !== root) return emitNodes(augmented, parentSelector, options);
  }
  return emitNodes(root, parentSelector, options);
}

function maybeAugmentWithAutoName(root: StaticRoot, componentId: string): StaticRoot {
  // compileString wrap: a single top-level Rule contains the user's decls.
  if (root.length === 1 && root[0].kind === NodeKind.Rule) {
    const rule = root[0];
    if (!shouldAutoNameContainer(rule.children)) return root;
    const newChildren = rule.children.slice();
    newChildren.push(makeContainerNameDecl(componentId));
    return [{ ...rule, children: newChildren }] as StaticRoot;
  }
  // AST-direct path: user decls live at the root.
  if (!shouldAutoNameContainer(root)) return root;
  const augmented = root.slice() as StaticRoot;
  augmented.push(makeContainerNameDecl(componentId));
  return augmented;
}

function makeContainerNameDecl(componentId: string): StaticNode {
  return { kind: NodeKind.Decl, prop: 'container-name', value: componentId } as StaticNode;
}

function shouldAutoNameContainer(nodes: ReadonlyArray<StaticNode>): boolean {
  let hasType = false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind !== NodeKind.Decl) continue;
    if (typeof node.prop !== 'string' || typeof node.value !== 'string') continue;
    if (node.prop === 'container-name') return false;
    if (node.prop === 'container-type' && node.value !== 'normal') hasType = true;
  }
  return hasType;
}

function emitNodes(
  nodes: StaticNode[],
  currentSelector: string,
  options: EmitOptions | undefined
): string[] {
  const baseDecls: string[] = [];
  const other: string[] = [];

  const declTransform = options && options.decl;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    switch (node.kind) {
      case NodeKind.Decl:
        baseDecls.push(formatDecl(node.prop, node.value, declTransform));
        break;
      case NodeKind.Rule: {
        let resolved = resolveRuleSelectors(node.selectors, currentSelector);
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
        // A `@` with no name is a delimiter, not an at-rule; emitted, it
        // would join the next rule's prelude and invalidate it.
        if (node.name !== '' && !DROPPED_AT_RULES.has(node.name)) {
          const emitted = emitAtRule(node, currentSelector, options);
          if (emitted) other.push(emitted);
        }
        break;
      case NodeKind.Keyframes:
        other.push(emitKeyframes(node, options));
        break;
    }
  }

  const result: string[] = [];
  if (baseDecls.length > 0 && currentSelector) {
    let wrappingSelector =
      options && options.namespace
        ? prependNamespace(currentSelector, options.namespace)
        : currentSelector;
    const body = '{' + baseDecls.join(';') + ';}';
    if (options && options.rw) {
      const rewritten = options.rw(wrappingSelector);
      if (Array.isArray(rewritten)) {
        for (let i = 0; i < rewritten.length; i++) result.push(rewritten[i] + body);
      } else {
        result.push(rewritten + body);
      }
    } else {
      result.push(wrappingSelector + body);
    }
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
  let prelude = node.prelude;
  // `${Component}` interpolation pre-stringifies to a class selector
  // (`.sc-aBcDeF`) for normal selector contexts. In the `@container
  // <name>` slot a bare ident is required by the CSS parser; strip a
  // leading dot from the prelude so cross-component container queries
  // emit valid CSS the browser can match.
  if (node.name === 'container' && prelude.length > 0 && prelude.charCodeAt(0) === 0x2e) {
    prelude = prelude.substring(1);
  }
  const header = '@' + node.name + (prelude ? ' ' + prelude : '');
  if (node.children === null) {
    return header + ';';
  }

  if (DECL_BODY_AT_RULES.has(node.name)) {
    // Body is bare declarations; emit inline, no selector wrap.
    const declTransform = options && options.decl;
    const decls: string[] = [];
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind === NodeKind.Decl) {
        decls.push(formatDecl(child.prop, child.value, declTransform));
      }
    }
    if (decls.length === 0) return '';
    return header + '{' + decls.join(';') + ';}';
  }

  // Body contains rules and/or declarations; inherit the parent selector.
  const childStrings = emitNodes(node.children, currentSelector, options);
  if (childStrings.length === 0) return '';
  return header + '{' + childStrings.join('') + '}';
}

/**
 * Write @keyframes: each frame rule as its stops and declarations, not
 * nested under any parent. A frame without declarations, and anything that
 * is not a frame or a declaration in one, is omitted.
 */
export function emitKeyframes(node: StaticKeyframesNode, options?: EmitOptions): string {
  const declTransform = options && options.decl;
  let frames = '';
  for (let i = 0; i < node.children.length; i++) {
    const frame = node.children[i];
    if (frame.kind !== NodeKind.Rule) continue;
    let decls = '';
    for (let j = 0; j < frame.children.length; j++) {
      const d = frame.children[j];
      if (d.kind === NodeKind.Decl) decls += formatDecl(d.prop, d.value, declTransform) + ';';
    }
    if (decls !== '') frames += frame.selectors.join(',') + '{' + decls + '}';
  }
  return '@' + node.name + (node.prelude ? ' ' + node.prelude : '') + '{' + frames + '}';
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
function resolveRuleSelectors(selectors: string[], parent: string): string {
  if (selectors.length === 0) return parent;
  const parents = parent ? splitTopLevelCommas(parent) : [parent];
  const resolved: string[] = [];
  for (let ci = 0; ci < selectors.length; ci++) {
    const child = selectors[ci];
    for (let pi = 0; pi < parents.length; pi++) {
      const p = trimRange(parents[pi], 0, parents[pi].length);
      resolved.push(resolveSingle(child, p));
    }
  }
  return resolved.join(',');
}

/**
 * Index of the first `&` at or after `from` that reads as the nesting
 * selector: outside strings and not after an escaping backslash. With
 * `topLevel`, also outside parentheses and brackets. `s.length` for none.
 */
export function nextAmpersand(s: string, from: number, topLevel: boolean): number {
  return scan(s, from, s.length, AMPERSAND, topLevel ? BRACKETS : BRACKETS | ANY_DEPTH, 0);
}

/**
 * Whether an `&` {@link nextAmpersand} reads in `s` is followed by
 * identifier text (escapes included, possibly none) that ends in `(`:
 * written, `&` joins the parent's last identifier to that text, making a
 * different function or `url(` token.
 */
export function ampersandJoinsCall(s: string): boolean {
  const len = s.length;
  let at = nextAmpersand(s, 0, false);
  while (at < len) {
    const j = identifierEnd(s, at + 1);
    if (s.charCodeAt(j) === $.OPEN_PAREN) return true;
    at = nextAmpersand(s, j, false);
  }
  return false;
}

function resolveSingle(selector: string, parent: string): string {
  let expanded: string;
  if (selector.indexOf('&') === -1) {
    expanded = parent ? parent + ' ' + selector : selector;
  } else {
    expanded = replaceAmpersands(selector, parent);
  }
  return stripCombinatorSpaces(expanded);
}

/** Replace each `&` {@link nextAmpersand} reads; with none, nest under the parent. */
function replaceAmpersands(selector: string, parent: string): string {
  let at = nextAmpersand(selector, 0, false);
  if (at === selector.length) return parent ? parent + ' ' + selector : selector;
  let out = '';
  let start = 0;
  while (at < selector.length) {
    out += selector.substring(start, at) + parent;
    start = at + 1;
    at = nextAmpersand(selector, start, false);
  }
  return out + selector.substring(start);
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
  if (!compiledSelector.includes(selfRefSelector)) return compiledSelector;
  if (
    !compiledSelector.startsWith(selfRefSelector) ||
    !compiledSelector.endsWith(selfRefSelector)
  ) {
    return compiledSelector;
  }
  // Remove all occurrences and check non-empty remainder
  const without = compiledSelector.split(selfRefSelector).join('');
  if (without.length === 0) return compiledSelector;

  const replacement = '.' + componentId;
  let out = '';
  let i = 0;
  const len = compiledSelector.length;
  const selLen = selfRefSelector.length;
  while (i < len) {
    const idx = compiledSelector.indexOf(selfRefSelector, i);
    if (idx === -1) {
      out += compiledSelector.substring(i);
      break;
    }
    const after = idx + selLen;
    const afterCh = after < len ? compiledSelector.charCodeAt(after) : 0;
    const isBoundary = after >= len || !isIdentCode(afterCh);
    out += compiledSelector.substring(i, idx);
    if (isBoundary) {
      out += replacement;
    } else {
      out += selfRefSelector;
    }
    i = after;
  }
  return out;
}
