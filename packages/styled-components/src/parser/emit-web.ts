import * as $ from '../utils/charCodes';
import { isWS } from '../utils/charCodes';
import {
  NodeKind,
  StaticAtRuleNode,
  StaticKeyframeFrame,
  StaticKeyframesNode,
  StaticNode,
  StaticRoot,
  StaticRuleNode,
} from './ast';
import { scanQPB, splitTopLevelCommas, stripCommaSpaces } from './parser';

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
    const stop = scanQPB(sel, i, len, $.GT, $.PLUS, $.TILDE, -1);
    if (stop >= len) break;
    // Find left boundary of emitted segment (trim trailing whitespace).
    let left = stop;
    while (left > segStart) {
      const p = sel.charCodeAt(left - 1);
      if (isWS(p)) left--;
      else break;
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
    | ((p: string, v: string) => { prop: string; value: string } | undefined | void)
    | undefined
): string {
  if (transform) {
    const t = transform(prop, value);
    if (t) return t.prop + ':' + t.value;
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
   * after namespace + self-reference resolution. Short name keeps bundle size
   * down; object keys aren't mangled by minifiers.
   */
  rw?: ((selector: string) => string) | undefined;
  /**
   * Declaration transform. Invoked on every emitted `prop: value` pair,
   * including declarations inside @keyframes and decl-body at-rules
   * (@font-face, @property, etc). Used by first-party plugins like RTL to
   * swap logical property sides.
   */
  decl?:
    | ((prop: string, value: string) => { prop: string; value: string } | undefined | void)
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
        // Post-fillAst invariant: `prop` and `value` are strings (any
        // TemplateValue was realized by `realize` in `fillNode`). The
        // `string | TemplateValue` AST type covers the parse-time form;
        // emit-web is only called on filled (or never-templated) ASTs.
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
        if (!DROPPED_AT_RULES.has(node.name)) {
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
    if (options && options.rw) {
      wrappingSelector = options.rw(wrappingSelector);
    }
    result.push(wrappingSelector + '{' + baseDecls.join(';') + ';}');
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
  let prelude = node.prelude ? stripCommaSpaces(node.prelude) : '';
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
  return header + '{' + frames.join('') + '}';
}

function emitFrame(frame: StaticKeyframeFrame, options: EmitOptions | undefined): string {
  const declTransform = options && options.decl;
  const stops = frame.stops.join(',');
  const decls: string[] = [];
  for (let i = 0; i < frame.children.length; i++) {
    const d = frame.children[i];
    decls.push(formatDecl(d.prop, d.value, declTransform));
  }
  // emitKeyframes skips empty frames, so decls.length is always > 0 here.
  return stops + '{' + decls.join(';') + ';}';
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
      const p = parents[pi].trim();
      resolved.push(resolveSingle(child, p));
    }
  }
  return resolved.join(',');
}

function resolveSingle(selector: string, parent: string): string {
  let expanded: string;
  if (selector.indexOf('&') === -1) {
    expanded = parent ? parent + ' ' + selector : selector;
  } else {
    expanded = selector.split('&').join(parent);
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
    const isBoundary =
      after >= len ||
      !(
        (afterCh >= $.DIGIT_0 && afterCh <= $.DIGIT_9) ||
        (afterCh >= $.UPPER_A && afterCh <= $.UPPER_Z) ||
        (afterCh >= $.LOWER_A && afterCh <= $.LOWER_Z) ||
        afterCh === $.UNDERSCORE ||
        afterCh === $.HYPHEN
      );
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
