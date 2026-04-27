import { AtRuleNode, KeyframeFrame, KeyframesNode, Node, NodeKind, Root, RuleNode } from './ast';
import { stripCommaSpaces } from './parser';

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
 * At-rules that stylis silently drops (no effect at the location they appear in
 * styled-components templates). We match the behavior for hash stability.
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
  if (sel.indexOf('>') === -1 && sel.indexOf('+') === -1 && sel.indexOf('~') === -1) return sel;
  const len = sel.length;
  let out = '';
  let segStart = 0;
  let paren = 0;
  let bracket = 0;
  let quote = 0;

  for (let i = 0; i < len; i++) {
    const c = sel.charCodeAt(i);
    if (quote !== 0) {
      if (c === 92 /* \ */) {
        i++;
        continue;
      }
      if (c === quote) quote = 0;
    } else if (c === 34 /* " */ || c === 39 /* ' */) {
      quote = c;
    } else if (c === 40 /* ( */) {
      paren++;
    } else if (c === 41 /* ) */) {
      if (paren > 0) paren--;
    } else if (c === 91 /* [ */) {
      bracket++;
    } else if (c === 93 /* ] */) {
      if (bracket > 0) bracket--;
    } else if (
      paren === 0 &&
      bracket === 0 &&
      (c === 62 /* > */ || c === 43 /* + */ || c === 126) /* ~ */
    ) {
      // Find left boundary of emitted segment (trim trailing whitespace).
      let left = i;
      while (left > segStart) {
        const p = sel.charCodeAt(left - 1);
        if (p === 32 || p === 9 || p === 10 || p === 13) left--;
        else break;
      }
      out += sel.substring(segStart, left);
      out += sel[i];
      // Skip whitespace after combinator.
      let j = i + 1;
      while (j < len) {
        const n = sel.charCodeAt(j);
        if (n === 32 || n === 9 || n === 10 || n === 13) j++;
        else break;
      }
      segStart = j;
      i = j - 1;
    }
  }

  if (segStart === 0) return sel;
  if (segStart < len) out += sel.substring(segStart, len);
  return out;
}

/**
 * Split a selector on TOP-LEVEL commas only — commas inside parens
 * (`:is(a,b)`, `[attr=...]` style brackets, quoted strings) stay put.
 *
 * Naive `s.split(',')` was the source of #4279: parent selectors like
 * `:is(.a, .b) .child` got split into `[':is(.a', ' .b) .child']`, then
 * cross-producted with child rules — producing nonsense like
 * `:is(.a:hover .grandchild, .b)` where the child got injected INTO the
 * `:is()` first arm. This helper restores the contract that
 * cross-product only fires on actually-separate selectors.
 */
function splitTopLevelCommas(s: string): string[] {
  if (s.indexOf(',') === -1) return [s];
  const len = s.length;
  const out: string[] = [];
  let segStart = 0;
  let paren = 0;
  let bracket = 0;
  let quote = 0;
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    if (quote !== 0) {
      if (c === 92 /* \ */) {
        i++;
        continue;
      }
      if (c === quote) quote = 0;
      continue;
    }
    if (c === 34 /* " */ || c === 39 /* ' */) {
      quote = c;
    } else if (c === 40 /* ( */) {
      paren++;
    } else if (c === 41 /* ) */) {
      if (paren > 0) paren--;
    } else if (c === 91 /* [ */) {
      bracket++;
    } else if (c === 93 /* ] */) {
      if (bracket > 0) bracket--;
    } else if (c === 44 /* , */ && paren === 0 && bracket === 0) {
      out.push(s.substring(segStart, i));
      segStart = i + 1;
    }
  }
  out.push(s.substring(segStart, len));
  return out;
}

/** Apply the decl plugin hook (if any) and format the pair as `prop:value`. */
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
   * class. Matches stylis' selfReferenceReplacementPlugin behavior.
   */
  componentId?: string | undefined;
  selfRefSelector?: string | undefined;
  /**
   * Prepended to every emitted rule selector AFTER `&` resolution. Matches
   * stylis' `recursivelySetNamespace` behavior for `StyleSheetManager namespace`.
   * Skipped for @keyframes.
   */
  namespace?: string | undefined;
  /**
   * Final-stage selector transform. Used by RSC's child-selector rewrite so
   * `:first-child` / `:nth-child()` exclude `<style data-styled>` tags. Runs
   * after namespace + self-reference resolution. Short name keeps bundle size
   * down — object keys aren't mangled by minifiers.
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
 * Emit CSS strings from a parser AST, targeting stylis output format
 * byte-for-byte so existing class-name hashes remain stable.
 *
 * @param root         Parsed AST from `parse()`.
 * @param parentSelector  Pre-composed parent selector (namespace + prefix + selector).
 */
export function emitWeb(root: Root, parentSelector: string, options?: EmitOptions): string[] {
  return emitNodes(root, parentSelector, options);
}

function emitNodes(
  nodes: Node[],
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
  node: AtRuleNode,
  currentSelector: string,
  options: EmitOptions | undefined
): string {
  const prelude = node.prelude ? stripCommaSpaces(node.prelude) : '';
  const header = '@' + node.name + (prelude ? ' ' + prelude : '');
  if (node.children === null) {
    return header + ';';
  }

  if (DECL_BODY_AT_RULES.has(node.name)) {
    // Body is bare declarations — emit inline, no selector wrap.
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

  // Body contains rules and/or declarations — inherit the parent selector.
  const childStrings = emitNodes(node.children, currentSelector, options);
  if (childStrings.length === 0) return '';
  return header + '{' + childStrings.join('') + '}';
}

function emitKeyframes(node: KeyframesNode, options: EmitOptions | undefined): string {
  const frames: string[] = [];
  for (let i = 0; i < node.frames.length; i++) {
    frames.push(emitFrame(node.frames[i], options));
  }
  const header = '@' + node.name + (node.prelude ? ' ' + node.prelude : '');
  return header + '{' + frames.join('') + '}';
}

function emitFrame(frame: KeyframeFrame, options: EmitOptions | undefined): string {
  const declTransform = options && options.decl;
  const stops = frame.stops.join(',');
  const decls: string[] = [];
  for (let i = 0; i < frame.children.length; i++) {
    const d = frame.children[i];
    decls.push(formatDecl(d.prop, d.value, declTransform));
  }
  return stops + '{' + decls.join(';') + (decls.length > 0 ? ';' : '') + '}';
}

/**
 * Resolve nested selectors against a parent selector.
 *
 * Stylis semantics:
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
 * Mirrors stylis' selfReferenceReplacementPlugin.
 *
 * Gate condition (per stylis): the COMPILED selector starts AND ends with
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
        (afterCh >= 48 && afterCh <= 57) || // 0-9
        (afterCh >= 65 && afterCh <= 90) || // A-Z
        (afterCh >= 97 && afterCh <= 122) || // a-z
        afterCh === 95 || // _
        afterCh === 45 // -
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
