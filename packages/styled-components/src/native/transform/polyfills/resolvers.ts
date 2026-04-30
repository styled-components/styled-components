import { MediaQueryEnv } from '../../responsive';
import * as $ from '../../../utils/charCodes';
import { isSafeThemePath } from '../sanitize';
import { tokenize, tokenizeFunctionArgs } from '../tokenize';
import { Token, TokenKind } from '../tokens';
import { staticColorFunctionToHex } from './colorMath';
import { NumericResult, resolveStaticMathFunction } from './mathFns';

/**
 * Environment passed to each {@link Resolver} at render time. Composes
 * everything needed to finish any deferred CSS evaluation.
 */
export interface ResolveEnv {
  media: MediaQueryEnv;
  /** Nearest named / unnamed container dimensions. */
  container: { width: number; height: number } | null;
  /** Current theme object (deep-merged from ThemeProvider stack on native). */
  theme: Record<string, any>;
  /** Safe-area insets from SafeAreaView / safe-area-context. */
  insets: { top: number; right: number; bottom: number; left: number };
  /** Root font-size for `rem` resolution (defaults to 16). Reserved for v7.1. */
  rootFontSize: number;
}

/**
 * A function that resolves a single style-prop value at render time
 * against the current {@link ResolveEnv}. Returns the resolved value
 * to write into the merged style object; number, string, or null
 * (drop the key).
 */
export type Resolver = (env: ResolveEnv) => number | string | null;

/**
 * Escape a string so it can ride a sentinel fallback unmolested by the
 * tokenizer's terminator scan (whitespace / comma / slash). Used by
 * `createTheme.native` when it builds `\0<prefix>:<path>:<fallback>`
 * sentinels for leaf values that may contain those chars (typical
 * example: `'rgba(0,0,0,0.4)'`). Inverse of {@link unescapeSentinelFallback}.
 *
 * Escape lead is `\x01` (Start of Heading), an ASCII control byte that
 * never appears in CSS source, followed by a single ASCII letter that
 * codes the original char. The lead itself is escaped as `\x01x` so the
 * scheme is round-trippable.
 */
export function escapeSentinelFallback(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x01) out += '\x01x';
    else if (c === 0x20) out += '\x01s';
    else if (c === 0x09) out += '\x01t';
    else if (c === 0x0a) out += '\x01n';
    else if (c === 0x0d) out += '\x01r';
    else if (c === 0x2c) out += '\x01c';
    else if (c === 0x2f) out += '\x01f';
    else out += s[i];
  }
  return out;
}

/**
 * Inverse of {@link escapeSentinelFallback}. Fast-path returns the
 * input unchanged when no escape lead is present (the common case;
 * atomic leaves like numbers / hex colors don't carry escapes).
 */
function unescapeSentinelFallback(s: string): string {
  if (s.indexOf('\x01') === -1) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c !== 0x01) {
      out += s[i];
      continue;
    }
    const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
    if (next === 0x73 /* s */) out += ' ';
    else if (next === 0x74 /* t */) out += '\t';
    else if (next === 0x6e /* n */) out += '\n';
    else if (next === 0x72 /* r */) out += '\r';
    else if (next === 0x63 /* c */) out += ',';
    else if (next === 0x66 /* f */) out += '/';
    else if (next === 0x78 /* x */) out += '\x01';
    else {
      // Unknown escape; preserve the lead byte so the bug surfaces
      // visibly rather than being silently rewritten.
      out += s[i];
      continue;
    }
    i++;
  }
  return out;
}

// Number form `-?(?:\d+(?:\.\d+)?|\.\d+)` matches `123`, `123.45`, `.45`,
// and the negatives. Unambiguous (no overlap between branches) so the
// engine can't backtrack on long digit runs — closes CodeQL polynomial
// redos finding from PR #5735.
const VP_UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(vw|vh|vmin|vmax|dvh|svh|lvh|dvw|svw|lvw)$/i;
const CQ_UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(cqw|cqh|cqmin|cqmax|cqi|cqb)$/i;

/**
 * Inspect a style-object value. If it references a pattern that must be
 * resolved at render time, return a {@link Resolver}. Otherwise `null`.
 *
 * `compileNative.extractResolvers` calls this for each base-style
 * value at compile time and stores the returned Resolvers on the
 * compiled bucket; the StyledNativeComponent render path then runs
 * them against the current env via {@link applyResolvers}.
 */
export function buildResolver(value: unknown): Resolver | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0) return null;

  const c0 = value.charCodeAt(0);

  // createTheme sentinel; `\0<prefix>:<path>:<fallback>`. Full-value single
  // sentinel goes to themeResolver (preserves native return type). A
  // sentinel followed by more tokens (e.g. shorthand-like `\0sc:width:1px
  // solid \0sc:color:#000` if it ever lands undivided) falls through to
  // the post-dispatch templateResolver below.
  if (c0 === 0 && findSentinelTerminator(value, 0) === value.length) {
    return themeResolver(value);
  }

  // Viewport / container units start with a digit, `-`, `+`, or `.`. Skip
  // both regex tests for everything else (colors, idents, percent strings),
  // which dominate real-world base-dict contents.
  if ((c0 >= $.DIGIT_0 && c0 <= $.DIGIT_9) || c0 === $.HYPHEN || c0 === $.DOT || c0 === $.PLUS) {
    const vp = VP_UNIT_RE.exec(value);
    if (vp !== null) return viewportResolver(parseFloat(vp[1]), vp[2].toLowerCase());
    const cq = CQ_UNIT_RE.exec(value);
    if (cq !== null) return containerResolver(parseFloat(cq[1]), cq[2].toLowerCase());
    // Numeric-prefixed values fall through to templateResolver if they
    // contain a sentinel (e.g. `0 1px 2px \0sc:colors.shadow:#000`).
  }

  // Math functions (`calc`, `clamp`, `min`, `max`) — when arms are entirely
  // static, the static fold in transformDecl picks them up before we get
  // here. We catch the dynamic-arms case (sentinels, env(), viewport
  // units) and emit a runtime resolver.
  if (c0 === 0x63 /* c */) {
    if (value.startsWith('calc(') || value.startsWith('clamp(')) return mathFnResolver(value);
    if (value.startsWith('color-mix(')) return colorFnResolver(value);
  }
  if (c0 === 0x6d /* m */) {
    if (value.startsWith('min(') || value.startsWith('max(')) return mathFnResolver(value);
  }

  // Color functions (`oklch`, `oklab`, `lch`, `lab`) — same shape: static
  // fold in transformDecl handles fully-literal channels; dynamic arms
  // (sentinels) defer to colorFnResolver which substitutes + re-converts.
  if (c0 === 0x6f /* o */ && (value.startsWith('oklch(') || value.startsWith('oklab('))) {
    return colorFnResolver(value);
  }

  // Non-numeric prefix; `light-dark(` and `lch`/`lab` color fns share `l`.
  if (c0 === 0x6c /* l */) {
    if (value.startsWith('light-dark(')) return lightDarkResolver(value);
    if (value.startsWith('lch(') || value.startsWith('lab(')) return colorFnResolver(value);
  }
  if (c0 === 0x65 /* e */ && value.startsWith('env(')) return envResolver(value);

  // Multi-token values containing one or more clean sentinels: assemble
  // the resolved string at render time. Catches pass-through props with
  // theme tokens embedded mid-value (`box-shadow: 0 1px 2px ${t.colors.x}`,
  // `transform: translateY(${t.space.x}px)`, gradient stops, etc.). Bails
  // when a sentinel is glued to a non-boundary character, which is the
  // JS-concat-leak case that `warnIfSentinelLeak` flags downstream.
  if (value.indexOf('\0') !== -1) return templateResolver(value);

  return null;
}

function viewportResolver(n: number, unit: string): Resolver {
  return env => {
    const { width: w, height: h } = env.media;
    switch (unit) {
      case 'vw':
      case 'dvw':
      case 'svw':
      case 'lvw':
        return (n * w) / 100;
      case 'vh':
      case 'dvh':
      case 'svh':
      case 'lvh':
        return (n * h) / 100;
      case 'vmin':
        return (n * Math.min(w, h)) / 100;
      case 'vmax':
        return (n * Math.max(w, h)) / 100;
      default:
        return n;
    }
  };
}

function containerResolver(n: number, unit: string): Resolver {
  return env => {
    const c = env.container;
    if (c === null) return n; // no ancestor container; fall back to raw number
    const w = c.width;
    const h = c.height;
    switch (unit) {
      case 'cqw':
      case 'cqi': // inline axis; horizontal in horizontal-tb (Yoga's only mode)
        return (n * w) / 100;
      case 'cqh':
      case 'cqb': // block axis; vertical in horizontal-tb (Yoga's only mode)
        return (n * h) / 100;
      case 'cqmin':
        return (n * Math.min(w, h)) / 100;
      case 'cqmax':
        return (n * Math.max(w, h)) / 100;
      default:
        return n;
    }
  };
}

function lightDarkResolver(value: string): Resolver | null {
  // `light-dark(<light>, <dark>)`; split on the top-level comma.
  const inner = value.slice('light-dark('.length, -1).trim();
  const commaIdx = topLevelCommaIdx(inner);
  if (commaIdx === -1) return null;
  const light = inner.slice(0, commaIdx).trim();
  const dark = inner.slice(commaIdx + 1).trim();
  // Each branch may contain a sentinel, env(), or other resolvable
  // expression. When buildResolver returns non-null we defer to it; when
  // null we treat the trimmed string as the literal value.
  const lightR = buildResolver(light);
  const darkR = buildResolver(dark);
  return env => {
    const isDark = env.media.colorScheme === 'dark';
    if (isDark) return darkR !== null ? darkR(env) : dark;
    return lightR !== null ? lightR(env) : light;
  };
}

/**
 * `env(<name>[, <fallback>])`. Currently recognises the safe-area-inset
 * family. Falls back to the literal fallback (if provided) or null for
 * everything else, which the caller interprets as "drop".
 */
function envResolver(value: string): Resolver | null {
  const inner = value.slice('env('.length, -1).trim();
  const commaIdx = topLevelCommaIdx(inner);
  const name = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
  const fallback = commaIdx === -1 ? null : inner.slice(commaIdx + 1).trim();

  // The fallback may itself be a sentinel, another env(), light-dark(),
  // viewport unit, or static literal. Build a resolver if it's dynamic;
  // otherwise pre-parse the static literal.
  const fallbackR = fallback === null ? null : buildResolver(fallback);
  const fallbackValue: number | string | null =
    fallbackR !== null ? null : fallback === null ? null : parseLengthLiteral(fallback);

  switch (name) {
    case 'safe-area-inset-top':
      return env => env.insets.top;
    case 'safe-area-inset-right':
      return env => env.insets.right;
    case 'safe-area-inset-bottom':
      return env => env.insets.bottom;
    case 'safe-area-inset-left':
      return env => env.insets.left;
    default:
      if (fallbackR !== null) return fallbackR;
      return () => fallbackValue;
  }
}

function themeResolver(value: string): Resolver | null {
  const firstColon = value.indexOf(':', 1);
  if (firstColon === -1) return null;
  const secondColon = value.indexOf(':', firstColon + 1);
  const path =
    secondColon === -1 ? value.slice(firstColon + 1) : value.slice(firstColon + 1, secondColon);
  const rawFallback = secondColon === -1 ? '' : value.slice(secondColon + 1);
  if (!isSafeThemePath(path)) return null;
  const segments = path.split('.');
  // Decode escape sequences once at construction. The resolver is the only
  // consumer of fallback at render time, so this never re-runs per render.
  const fallback = unescapeSentinelFallback(rawFallback);

  return env => {
    let v: any = env.theme;
    for (let i = 0; i < segments.length; i++) {
      if (
        v == null ||
        typeof v !== 'object' ||
        !Object.prototype.hasOwnProperty.call(v, segments[i])
      ) {
        v = undefined;
        break;
      }
      v = v[segments[i]];
    }
    if (v === undefined || v === null) return fallback;
    return v;
  };
}

/**
 * Find the end index of the sentinel atom that starts at `start`.
 * Mirrors the tokenizer's `findSentinelEnd`; sentinels terminate at
 * whitespace, comma, slash, or end-of-string.
 */
function findSentinelTerminator(value: string, start: number): number {
  for (let i = start + 1; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d || c === 0x2c || c === 0x2f) {
      return i;
    }
  }
  return value.length;
}

/**
 * Substitute sentinel atoms inside a multi-token CSS value at render time.
 * Used for pass-through props (`boxShadow`, `transform`, `filter`,
 * `backgroundImage`, …) where the value reaches RN as a CSS string and a
 * theme token sits in the middle of it.
 *
 * Each sentinel must sit at a CSS-token boundary — start of the value, or
 * preceded by whitespace, comma, paren, or slash. A sentinel preceded by a
 * non-boundary char is the JS concat-leak case (`'47\0sc:…'`) and we
 * deliberately bail to null so `warnIfSentinelLeak` can fire downstream.
 *
 * Paren depth is tracked so a sentinel inside `translateY(\0sc:x:Npx)` is
 * correctly bounded by the enclosing function's closing paren — the
 * tokenizer relies on function-aware paren-matching for the same reason,
 * but we don't run the full tokenizer here (raw-string scan is enough and
 * keeps the path allocation-free for the common case).
 */
/**
 * Extract the unit suffix from a sentinel fallback like `'55px'` so we
 * can re-attach it when the theme provides the unit-less numeric form.
 * Returns `''` for fallbacks that don't end in an alpha-or-percent unit
 * (numbers, hex colors, keywords, color functions).
 */
function fallbackUnit(fallback: string): string {
  const m = /^-?(?:\d+(?:\.\d+)?|\.\d+)([a-z%]+)$/i.exec(fallback);
  return m === null ? '' : m[1];
}

function templateResolver(value: string): Resolver | null {
  const segments: Array<{ start: number; end: number; resolver: Resolver; unit: string }> = [];
  let i = 0;
  let depth = 0;
  while (i < value.length) {
    const c = value.charCodeAt(i);
    if (c === 0x28 /* ( */) {
      depth++;
      i++;
      continue;
    }
    if (c === 0x29 /* ) */) {
      depth--;
      i++;
      continue;
    }
    if (c !== 0) {
      i++;
      continue;
    }
    if (i > 0) {
      const prev = value.charCodeAt(i - 1);
      const isBoundary =
        prev === 0x20 || // space
        prev === 0x09 || // tab
        prev === 0x0a || // \n
        prev === 0x0d || // \r
        prev === 0x2c || // ,
        prev === 0x28 || // (
        prev === 0x29 || // )
        prev === 0x2f; // /
      if (!isBoundary) return null;
    }
    // Scan for the sentinel terminator. Mirrors the tokenizer's
    // `findSentinelEnd` (whitespace, comma, slash, end-of-string) and adds
    // `)` when it would close the paren level we entered the sentinel at —
    // i.e. the function whose args carry this sentinel.
    const startDepth = depth;
    let end = i + 1;
    let scanDepth = depth;
    while (end < value.length) {
      const ec = value.charCodeAt(end);
      if (ec === 0x20 || ec === 0x09 || ec === 0x0a || ec === 0x0d || ec === 0x2c || ec === 0x2f) {
        break;
      }
      if (ec === 0x28) {
        scanDepth++;
      } else if (ec === 0x29) {
        if (scanDepth === startDepth) break;
        scanDepth--;
      }
      end++;
    }
    const segment = value.substring(i, end);
    const r = themeResolver(segment);
    if (r === null) return null;
    // Fallback often carries the original unit (e.g. `${t.x}px` is
    // serialized as `\0sc:x:55px`). When the theme provides the bare
    // numeric form we re-attach the unit so the assembled string still
    // means what the user wrote.
    const lastColon = segment.lastIndexOf(':');
    const fb = lastColon === -1 ? '' : segment.slice(lastColon + 1);
    segments.push({ start: i, end, resolver: r, unit: fallbackUnit(fb) });
    depth = scanDepth;
    i = end;
  }
  if (segments.length === 0) return null;
  return env => {
    let out = '';
    let pos = 0;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (pos < s.start) out += value.substring(pos, s.start);
      const v = s.resolver(env);
      if (v === null) return null;
      if (typeof v === 'number') {
        out += s.unit === '' ? String(v) : String(v) + s.unit;
      } else {
        out += String(v);
      }
      pos = s.end;
    }
    if (pos < value.length) out += value.substring(pos);
    return out;
  };
}

function topLevelCommaIdx(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === $.OPEN_PAREN) depth++;
    else if (c === $.CLOSE_PAREN) depth--;
    else if (c === $.COMMA && depth === 0) return i;
  }
  return -1;
}

function parseLengthLiteral(s: string): number | string | null {
  const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px)?$/.exec(s.trim());
  if (m !== null) return parseFloat(m[1]);
  return s; // percent / auto / whatever; caller will pass through
}

/**
 * Runtime resolver for `calc()` / `min()` / `max()` / `clamp()` when one
 * or more arms are dynamic — sentinels, env(), viewport / container units,
 * light-dark(), or nested math fns. The static fold in `mathFns.ts` is
 * tried first by `transformDecl`; we land here only when at least one
 * arm needs render-time evaluation.
 */
function mathFnResolver(value: string): Resolver | null {
  const tokens = tokenize(value);
  if (tokens.length !== 1 || tokens[0].kind !== TokenKind.Function) return null;
  const fn = tokens[0];
  const name = fn.name || '';
  if (name === 'calc') return calcResolverFromFn(fn);
  if (name === 'min' || name === 'max' || name === 'clamp') {
    return minMaxClampResolverFromFn(name, fn);
  }
  return null;
}

function calcResolverFromFn(fn: Token): Resolver | null {
  const args = tokenizeFunctionArgs(fn);
  const armEval = buildExpression(args);
  if (armEval === null) return null;
  return env => {
    const r = armEval(env);
    if (r === null) return null;
    return numericToCss(r);
  };
}

function minMaxClampResolverFromFn(name: string, fn: Token): Resolver | null {
  const args = tokenizeFunctionArgs(fn);
  const groups: Token[][] = [];
  let current: Token[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      groups.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0) groups.push(current);
  if (groups.length === 0) return null;
  if (name === 'clamp' && groups.length !== 3) return null;

  const armResolvers: Array<(env: ResolveEnv) => NumericResult | null> = [];
  for (let i = 0; i < groups.length; i++) {
    const e = buildExpression(groups[i]);
    if (e === null) return null;
    armResolvers.push(e);
  }

  return env => {
    const operands: NumericResult[] = [];
    for (let i = 0; i < armResolvers.length; i++) {
      const r = armResolvers[i](env);
      if (r === null) return null;
      operands.push(r);
    }
    const unit = unifyUnits(operands);
    if (unit === null) return null;

    let result: number;
    if (name === 'min') {
      result = operands[0].value;
      for (let i = 1; i < operands.length; i++) {
        if (operands[i].value < result) result = operands[i].value;
      }
    } else if (name === 'max') {
      result = operands[0].value;
      for (let i = 1; i < operands.length; i++) {
        if (operands[i].value > result) result = operands[i].value;
      }
    } else {
      const lo = operands[0].value;
      const val = operands[1].value;
      const hi = operands[2].value;
      result = val < lo ? lo : val > hi ? hi : val;
    }
    return numericToCss({ value: result, unit });
  };
}

/**
 * Build an evaluator for an expression sequence: `<operand> (<op> <operand>)*`.
 * Returns a function that, given a {@link ResolveEnv}, produces a
 * {@link NumericResult} (value + unit). Bails on syntactically malformed
 * sequences or unsupported operand kinds.
 */
function buildExpression(tokens: Token[]): ((env: ResolveEnv) => NumericResult | null) | null {
  if (tokens.length === 0) return null;

  const operandEvals: Array<(env: ResolveEnv) => NumericResult | null> = [];
  const ops: string[] = [];
  let expectOperand = true;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!expectOperand) {
      if (
        t.kind === TokenKind.Op &&
        (t.op === '+' || t.op === '-' || t.op === '*' || t.op === '/')
      ) {
        ops.push(t.op);
        expectOperand = true;
        continue;
      }
      if (t.kind === TokenKind.Slash) {
        ops.push('/');
        expectOperand = true;
        continue;
      }
      return null;
    }
    const e = buildOperand(t);
    if (e === null) return null;
    operandEvals.push(e);
    expectOperand = false;
  }

  if (expectOperand || operandEvals.length !== ops.length + 1) return null;
  if (operandEvals.length === 1) return operandEvals[0];

  return env => {
    const items: Array<NumericResult | string> = [];
    for (let i = 0; i < operandEvals.length; i++) {
      const r = operandEvals[i](env);
      if (r === null) return null;
      items.push(r);
      if (i < ops.length) items.push(ops[i]);
    }
    return reduceMath(items);
  };
}

/**
 * Resolve a single token in numeric-arithmetic context. Returns null if
 * the token cannot produce a {@link NumericResult} at render time.
 */
function buildOperand(t: Token): ((env: ResolveEnv) => NumericResult | null) | null {
  if (t.kind === TokenKind.Number) {
    const v = t.value!;
    return () => ({ value: v, unit: '' });
  }
  if (t.kind === TokenKind.Length) {
    const v = t.value!;
    const unit = t.unit!;
    if (unit === 'px' || unit === '') {
      return () => ({ value: v, unit });
    }
    // Viewport / container unit — defer to buildResolver, which produces
    // a number at render time. Inherit the original unit on the result so
    // outer arithmetic reports a coherent unit.
    const r = buildResolver(t.raw);
    if (r === null) return null;
    return env => valueToNumeric(r(env), 'px');
  }
  if (t.kind === TokenKind.Percent) {
    const v = t.value!;
    return () => ({ value: v, unit: '%' });
  }
  if (t.kind === TokenKind.Sentinel) {
    const r = buildResolver(t.raw);
    if (r === null) return null;
    return env => valueToNumeric(r(env), '');
  }
  if (t.kind === TokenKind.Function) {
    // Static fold first (cheap, common case for nested static math).
    const num = resolveStaticMathFunction(t);
    if (num !== null) return () => num;
    // Otherwise build a runtime resolver from the function's raw form.
    const inner = t.name || '';
    if (inner === 'calc') {
      const r = calcResolverFromFn(t);
      if (r === null) return null;
      return env => valueToNumeric(r(env), '');
    }
    if (inner === 'min' || inner === 'max' || inner === 'clamp') {
      const r = minMaxClampResolverFromFn(inner, t);
      if (r === null) return null;
      return env => valueToNumeric(r(env), '');
    }
    if (inner === 'env' || inner === 'light-dark') {
      const r = buildResolver(t.raw);
      if (r === null) return null;
      return env => valueToNumeric(r(env), '');
    }
  }
  return null;
}

function valueToNumeric(v: number | string | null, defaultUnit: string): NumericResult | null {
  if (v === null) return null;
  if (typeof v === 'number') return { value: v, unit: defaultUnit };
  // Parse a string like '55', '55px', '10%', '12.5em' into NumericResult.
  const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]*)$/i.exec(v.trim());
  if (m === null) return null;
  return { value: parseFloat(m[1]), unit: m[2] || defaultUnit };
}

function reduceMath(items: Array<NumericResult | string>): NumericResult | null {
  // Pass 1: `*` and `/`
  for (let i = 1; i < items.length - 1; ) {
    const op = items[i];
    if (op === '*' || op === '/') {
      const a = items[i - 1] as NumericResult;
      const b = items[i + 1] as NumericResult;
      const unit = op === '*' ? a.unit || b.unit : a.unit;
      const v = op === '*' ? a.value * b.value : a.value / b.value;
      if (!Number.isFinite(v)) return null;
      items.splice(i - 1, 3, { value: v, unit });
    } else {
      i++;
    }
  }
  // Pass 2: `+` and `-`
  for (let i = 1; i < items.length - 1; ) {
    const op = items[i];
    if (op === '+' || op === '-') {
      const a = items[i - 1] as NumericResult;
      const b = items[i + 1] as NumericResult;
      if (a.unit && b.unit && a.unit !== b.unit) return null;
      const v = op === '+' ? a.value + b.value : a.value - b.value;
      items.splice(i - 1, 3, { value: v, unit: a.unit || b.unit });
    } else {
      i++;
    }
  }
  if (items.length !== 1) return null;
  return items[0] as NumericResult;
}

function unifyUnits(operands: NumericResult[]): string | null {
  let unit = '';
  for (let i = 0; i < operands.length; i++) {
    const u = operands[i].unit;
    if (u === '') continue;
    if (unit === '') unit = u;
    else if (unit !== u) return null;
  }
  return unit;
}

function numericToCss(r: NumericResult): number | string {
  if (r.unit === '' || r.unit === 'px') return r.value;
  if (r.unit === '%') return `${r.value}%`;
  return `${r.value}${r.unit}`;
}

/**
 * Runtime resolver for `oklch()` / `oklab()` / `lch()` / `lab()` /
 * `color-mix()` when one or more channel arms are dynamic. The static
 * fold in `staticColorFunctionToHex` (colorMath.ts) bails the moment a
 * channel isn't a Number / Percent literal; we land here, substitute
 * sentinel arms via `templateResolver` at render time, then run the
 * assembled string back through the static converter to produce a hex.
 *
 * Limitation by design: this re-uses the static converter, so individual
 * channel arms must end up as Number / Percent / color literal after
 * substitution. Dynamic env() / calc() / nested fns inside a channel
 * aren't supported here — the static converter doesn't know about them
 * either. Sentinels resolved to numbers / percents / hex colors cover
 * the practical theme-palette case.
 */
function colorFnResolver(value: string): Resolver | null {
  const tr = templateResolver(value);
  if (tr === null) return null;
  return env => {
    const assembled = tr(env);
    if (typeof assembled !== 'string') return null;
    const tokens = tokenize(assembled);
    if (tokens.length !== 1 || tokens[0].kind !== TokenKind.Function) return null;
    return staticColorFunctionToHex(tokens[0]);
  };
}

/**
 * Apply resolvers onto a style object in-place at render time. Returns
 * a NEW object (preserves the cached `base` object's identity).
 */
export function applyResolvers(
  base: Record<string, any>,
  resolvers: Array<[string, Resolver]>,
  env: ResolveEnv
): Record<string, any> {
  if (resolvers.length === 0) return base;
  const out = { ...base };
  for (let i = 0; i < resolvers.length; i++) {
    const pair = resolvers[i];
    const key = pair[0];
    const v = pair[1](env);
    if (v === null) delete out[key];
    else out[key] = v;
  }
  return out;
}
