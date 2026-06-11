import { SPECIAL_CASE_PROPS } from '../models/compileNative';
import { transformDecl } from './transform';
import { runWithWarningsSuppressed } from './transform/dev';

/**
 * Runtime evaluator for `@supports` preludes (CSS Conditional 3 §6).
 *
 * On rn-web the browser is the authority: `CSS.supports()` receives the
 * raw prelude. On iOS / Android a declaration leaf answers "does this
 * engine produce output the platform renders": the declaration runs
 * through the transform pipeline (with dev warnings suppressed, since
 * probing for a gap is the author's intent) and counts as supported when
 * every emitted key lands on an RN style attribute, a component prop the
 * engine lifts, or an engine-implemented sentinel. Handlers validate
 * values to the depth of their own grammar; plain passthrough properties
 * accept any value, mirroring RN's tolerance for unknown enum values.
 *
 * Results are cached per prelude string: conditions are compile-time
 * constants and the matcher runs on the per-render bucket walk.
 */

/**
 * Style keys RN 0.85 understands, extracted from
 * `react-native/Libraries/Components/View/ReactNativeStyleAttributes`
 * (the runtime registry RN itself validates style props against).
 * Regenerate against that file when the RN floor moves.
 */
const RN_STYLE_ATTRIBUTES = new Set([
  'alignContent',
  'alignItems',
  'alignSelf',
  'aspectRatio',
  'backfaceVisibility',
  'backgroundColor',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'borderBottomColor',
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderBottomWidth',
  'borderColor',
  'borderCurve',
  'borderEndColor',
  'borderEndEndRadius',
  'borderEndStartRadius',
  'borderEndWidth',
  'borderLeftColor',
  'borderLeftWidth',
  'borderRadius',
  'borderRightColor',
  'borderRightWidth',
  'borderStartColor',
  'borderStartEndRadius',
  'borderStartStartRadius',
  'borderStartWidth',
  'borderStyle',
  'borderTopColor',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
  'borderTopWidth',
  'borderWidth',
  'bottom',
  'boxShadow',
  'boxSizing',
  'color',
  'columnGap',
  'cursor',
  'direction',
  'display',
  'elevation',
  'end',
  'experimental_backgroundImage',
  'experimental_backgroundPosition',
  'experimental_backgroundRepeat',
  'experimental_backgroundSize',
  'filter',
  'flex',
  'flexBasis',
  'flexDirection',
  'flexGrow',
  'flexShrink',
  'flexWrap',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'gap',
  'height',
  'includeFontPadding',
  'inset',
  'insetBlock',
  'insetBlockEnd',
  'insetBlockStart',
  'insetInline',
  'insetInlineEnd',
  'insetInlineStart',
  'isolation',
  'justifyContent',
  'left',
  'letterSpacing',
  'lineHeight',
  'margin',
  'marginBlock',
  'marginBlockEnd',
  'marginBlockStart',
  'marginBottom',
  'marginEnd',
  'marginHorizontal',
  'marginInline',
  'marginInlineEnd',
  'marginInlineStart',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginTop',
  'marginVertical',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'mixBlendMode',
  'objectFit',
  'opacity',
  'outlineColor',
  'outlineOffset',
  'outlineStyle',
  'outlineWidth',
  'overflow',
  'overlayColor',
  'padding',
  'paddingBlock',
  'paddingBlockEnd',
  'paddingBlockStart',
  'paddingBottom',
  'paddingEnd',
  'paddingHorizontal',
  'paddingInline',
  'paddingInlineEnd',
  'paddingInlineStart',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingTop',
  'paddingVertical',
  'pointerEvents',
  'position',
  'resizeMode',
  'right',
  'rowGap',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'start',
  'textAlign',
  'textAlignVertical',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'tintColor',
  'top',
  'transform',
  'transformOrigin',
  'userSelect',
  'verticalAlign',
  'width',
  'writingDirection',
  'zIndex',
]);

const cache = new Map<string, boolean>();

export function matchSupports(condition: string): boolean {
  let hit = cache.get(condition);
  if (hit !== undefined) return hit;
  let result: boolean;
  const cssApi = __NATIVE_WEB__
    ? (globalThis as { CSS?: { supports?: (c: string) => boolean } }).CSS
    : undefined;
  if (cssApi !== undefined && typeof cssApi.supports === 'function') {
    try {
      result = cssApi.supports(condition);
    } catch {
      result = false;
    }
  } else {
    result = evalCondition(condition) === true;
  }
  cache.set(condition, result);
  return result;
}

/** Test-only: the cache survives across styled components by design. */
export function resetSupportsCacheForTest(): void {
  cache.clear();
}

/** `null` means the prelude is grammatically invalid; per spec the whole
 *  rule is ignored, which the caller folds to "never matches". */
type Tri = boolean | null;

const NOT_THEN_SPACE_RE = /^not\s/i;
const PROP_NAME_RE = /^-?[A-Za-z][A-Za-z0-9-]*$/;
const IMPORTANT_TAIL_RE = /!\s*important\s*$/i;
const AND_OR_RE = /^(and|or)(?=\s)/i;

function evalCondition(input: string): Tri {
  const s = input.trim();
  if (s.length === 0) return null;

  // `not <supports-in-parens>`. The keyword needs trailing whitespace:
  // `not(...)` tokenizes as a function token, which is <general-enclosed>.
  if (NOT_THEN_SPACE_RE.test(s)) {
    const inner = evalInParens(s.slice(4).trim());
    return inner === null ? null : !inner;
  }

  // Split top-level `and` / `or` chains (keywords at paren depth 0 with
  // whitespace on both sides; quoted values only occur inside parens so
  // depth gating protects them).
  const terms: string[] = [];
  const ops: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x28 /* ( */) depth++;
    else if (c === 0x29 /* ) */) {
      depth--;
      if (depth < 0) return null;
    } else if (depth === 0 && (c === 0x61 || c === 0x41 || c === 0x6f || c === 0x4f)) {
      const prevCode = i > 0 ? s.charCodeAt(i - 1) : -1;
      const boundary = prevCode === 0x20 || prevCode === 0x09 || prevCode === 0x29;
      if (!boundary) continue;
      const m = AND_OR_RE.exec(s.slice(i));
      if (m !== null) {
        terms.push(s.slice(start, i));
        ops.push(m[1].toLowerCase());
        i += m[1].length;
        start = i + 1;
      }
    }
  }
  if (depth !== 0) return null;
  terms.push(s.slice(start));

  if (ops.length === 0) return evalInParens(s);

  // The grammar allows homogeneous chains only; mixing `and` with `or`
  // requires explicit parentheses and is otherwise invalid.
  const op = ops[0];
  for (let i = 1; i < ops.length; i++) {
    if (ops[i] !== op) return null;
  }
  let acc = op === 'and';
  for (let i = 0; i < terms.length; i++) {
    const r = evalInParens(terms[i].trim());
    if (r === null) return null;
    acc = op === 'and' ? acc && r : acc || r;
  }
  return acc;
}

function evalInParens(input: string): Tri {
  const s = input.trim();
  if (s.length === 0) return null;

  if (s.charCodeAt(0) === 0x28 /* ( */) {
    // The group must span the whole term.
    if (findMatchingClose(s, 0) !== s.length - 1) return null;
    const inner = s.slice(1, -1).trim();
    // Nested condition forms recurse; everything else is a declaration
    // or <general-enclosed>.
    if (NOT_THEN_SPACE_RE.test(inner) || inner.charCodeAt(0) === 0x28 || hasTopLevelAndOr(inner)) {
      return evalCondition(inner);
    }
    const colon = inner.indexOf(':');
    if (colon !== -1) {
      const prop = inner.slice(0, colon).trim();
      // Anything that is not a plain property name (e.g. a nested
      // function before the colon) is <general-enclosed>: false.
      if (!PROP_NAME_RE.test(prop)) return false;
      let value = inner.slice(colon + 1).trim();
      // "Declaration cannot include semicolon" (grammar-invalid).
      if (value.indexOf(';') !== -1) return null;
      // `!important` is part of <declaration> and does not affect
      // support; any other `!` token invalidates the declaration leaf.
      value = value.replace(IMPORTANT_TAIL_RE, '').trim();
      if (value.indexOf('!') !== -1) return false;
      if (value.length === 0) return false;
      return declarationSupported(prop, value);
    }
    // `( <ident> <any-value>? )` is <general-enclosed>: false.
    return false;
  }

  // `ident(...)` spanning the whole term (selector(), font-tech(),
  // future syntax) is <general-enclosed>: false.
  const open = s.indexOf('(');
  if (
    open > 0 &&
    PROP_NAME_RE.test(s.slice(0, open)) &&
    findMatchingClose(s, open) === s.length - 1
  ) {
    return false;
  }
  return null;
}

function hasTopLevelAndOr(s: string): boolean {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x28) depth++;
    else if (c === 0x29) depth--;
    else if (depth === 0 && (c === 0x61 || c === 0x41 || c === 0x6f || c === 0x4f)) {
      const prevCode = i > 0 ? s.charCodeAt(i - 1) : -1;
      const boundary = prevCode === 0x20 || prevCode === 0x09 || prevCode === 0x29;
      if (boundary && AND_OR_RE.test(s.slice(i))) return true;
    }
  }
  return false;
}

function findMatchingClose(s: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x28) depth++;
    else if (c === 0x29) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function declarationSupported(prop: string, value: string): boolean {
  const partial = runWithWarningsSuppressed(() => transformDecl(prop, value));
  let emitted = false;
  for (const key in partial) {
    emitted = true;
    if (
      !RN_STYLE_ATTRIBUTES.has(key) &&
      SPECIAL_CASE_PROPS[key] === undefined &&
      !key.startsWith('__sc') &&
      !key.startsWith('--')
    ) {
      return false;
    }
  }
  return emitted;
}
