import { MediaQueryEnv } from '../../responsive';
import * as $ from '../../../utils/charCodes';
import { warnOnce } from '../dev';
import { isSafeThemePath } from '../sanitize';
import { tokenize, tokenizeFunctionArgs } from '../tokenize';
import { Token, TokenKind } from '../tokens';
import { staticColorFunctionToHex } from './colorMath';
import { identToNumeric, NumericResult, resolveStaticMathFunction, unifyUnits } from './mathFns';

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
  /** Root font-size for `rem` resolution (defaults to 16). */
  rootFontSize: number;
  /**
   * Parent's resolved font-size in px. Anchors `em` resolution at
   * render time. Sourced from NativeStyleContext.cascade.fontSize.
   */
  fontSize: number;
  /**
   * Parent's resolved line-height in px. Anchors `lh` resolution.
   * Sourced from NativeStyleContext.cascade.lineHeight.
   */
  lineHeight: number;
  /**
   * Inherited writing direction. Anchors `text-align: start | end`.
   * Sourced from NativeStyleContext.cascade.direction.
   */
  direction: 'ltr' | 'rtl';
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
// engine can't backtrack on long digit runs;closes CodeQL polynomial
// redos finding from PR #5735.
// CSS Values 4 §6.1.2.2 viewport-percentage length units. Default `v*`
// maps to the large viewport size per spec; on RN small/large/dynamic
// all collapse to env.media (no URL-bar surface to differentiate). The
// inline / block forms (vi / vb) resolve to width / height in
// horizontal-tb (Yoga's only writing-mode).
const VP_UNIT_RE =
  /^(-?(?:\d+(?:\.\d+)?|\.\d+))(vw|vh|vi|vb|vmin|vmax|svw|svh|svi|svb|svmin|svmax|lvw|lvh|lvi|lvb|lvmin|lvmax|dvw|dvh|dvi|dvb|dvmin|dvmax)$/i;
const CQ_UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(cqw|cqh|cqmin|cqmax|cqi|cqb)$/i;
// CSS Values 4 §6.1.1 — font-relative lengths. `rem` and `rlh` anchor
// at the root; `em` and `lh` at the parent. RN has no DOM cascade —
// values come from {@link ResolveEnv.rootFontSize / fontSize /
// lineHeight}, populated by NativeStyleContext at render time. rn-web
// passes them through to the browser unchanged.
//
// `rem` / `rlh` must come BEFORE `em` / `lh` in the alternation so
// `12rem` matches as rem rather than `12r` + `em`. The regex anchors
// guarantee whole-token consumption regardless.
const REM_UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(rem|rlh|em|lh)$/i;
const FALLBACK_UNIT_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)([a-z%]+)$/i;
const LENGTH_LITERAL_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px)?$/;
const NUMERIC_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]*)$/i;

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

  // Direction-aware `text-align: start | end | match-parent` per
  // CSS Text 4 §7.1. The handler emits `\0scta:<keyword>`; the
  // resolver here maps it to `'left'` or `'right'` against the
  // cascade direction inherited from the parent. Checked BEFORE the
  // theme-sentinel dispatch so `findSentinelTerminator` doesn't
  // accidentally claim the value. The 4-character tag `scta`
  // differentiates from the theme sentinel `\0sc:` at the fourth
  // code point (`t` vs `:`).
  if (
    c0 === 0 &&
    value.charCodeAt(3) === 0x74 /* t */ &&
    value.charCodeAt(4) === 0x61 /* a */ &&
    value.startsWith('\0scta:')
  ) {
    const keyword = value.slice('\0scta:'.length);
    return env => {
      // `match-parent` resolves like `start` in horizontal-tb because
      // there's no orthogonal parent writing mode in Yoga.
      const startsWithLeft = env.direction === 'ltr';
      if (keyword === 'start' || keyword === 'match-parent') {
        return startsWithLeft ? 'left' : 'right';
      }
      if (keyword === 'end') {
        return startsWithLeft ? 'right' : 'left';
      }
      // Unrecognised marker shouldn't happen at runtime; defer to
      // `'auto'` so RN's natural-direction default kicks in.
      return 'auto';
    };
  }

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
    if (vp !== null) {
      // rn-web: passthrough so the browser distinguishes dvh/svh/lvh.
      if (__NATIVE_WEB__) return null;
      return viewportResolver(parseFloat(vp[1]), vp[2].toLowerCase());
    }
    const cq = CQ_UNIT_RE.exec(value);
    if (cq !== null) return containerResolver(parseFloat(cq[1]), cq[2].toLowerCase());
    const rem = REM_UNIT_RE.exec(value);
    if (rem !== null) {
      // rn-web: browser resolves font-relative units against the
      // document's root / cascade font-size; no resolver needed.
      if (__NATIVE_WEB__) return null;
      return fontRelativeResolver(parseFloat(rem[1]), rem[2].toLowerCase());
    }
    // Numeric-prefixed values fall through to templateResolver if they
    // contain a sentinel (e.g. `0 1px 2px \0sc:colors.shadow:#000`).
  }

  // Math functions (`calc`, `clamp`, `min`, `max`);when arms are entirely
  // static and same-unit, the static fold in transformDecl picks them up
  // before we get here. Two platform-divergent paths:
  //
  // • Web: static-mixed-unit expressions (e.g. `calc(33% - 5px)`) pass
  //   through to the browser's CSS engine, which resolves `%` against the
  //   real containing block at paint time;strictly more accurate than
  //   anything we could compute. Dynamic-arm calcs (sentinels, env(),
  //   viewport units) fully evaluate via `mathFnResolver` because the
  //   sentinels need substitution.
  // • Native: Yoga can't parse calc strings, so `mathFnResolver` always
  //   evaluates with `NATIVE_MATH_OPTS`, which resolves each `%` against
  //   the nearest container's width (`env.container.width`) or the
  //   viewport (`env.media.width`) as a fallback. To get pixel-exact
  //   resolution, set `container-type: inline-size` on the layout root;
  //   otherwise calc resolves against viewport (close for top-level
  //   layouts, slightly off for nested cards).
  if (c0 === 0x63 /* c */) {
    if (value.startsWith('calc(') || value.startsWith('clamp(')) {
      return resolveMathFn(value);
    }
    if (value.startsWith('color-mix(')) return colorFnResolver(value);
  }
  if (c0 === 0x6d /* m */) {
    if (value.startsWith('min(') || value.startsWith('max(')) {
      return resolveMathFn(value);
    }
  }

  // Color functions (`oklch`, `oklab`, `lch`, `lab`);same shape: static
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

  // Multi-token values containing an embedded `light-dark(...)` call
  // (e.g. `box-shadow: 0 4px 8px light-dark(rgba(0,0,0,.2), rgba(255,255,255,.1))`).
  // The top-level dispatchers above only fire when the call IS the whole
  // value; here we substitute each call in place so the assembled string
  // reaches the layout / paint engine with concrete colors.
  if (value.indexOf('light-dark(') !== -1) {
    const r = embeddedLightDarkResolver(value);
    if (r !== null) return r;
  }

  return null;
}

/**
 * True when a token stream (the args of `calc()` / `clamp()` / `min/max()`,
 * or any nested math-fn args) contains at least one arm that needs runtime
 * evaluation: a createTheme sentinel, an `env()` / `light-dark()` call, or
 * a viewport / container unit. Used on web to decide between full
 * evaluation and raw passthrough; on native every math fn evaluates
 * regardless (Yoga can't parse calc strings), so this predicate isn't
 * consulted.
 */
function tokensNeedRuntimeResolution(tokens: Token[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Sentinel) return true;
    if (t.kind === TokenKind.Length && t.unit) {
      const u = t.unit;
      if (u !== 'px' && u !== '') {
        // Lengths matching VP/CQ unit regexes have dedicated runtime
        // resolvers; em/rem/in/pt etc. are bailed on by `buildOperand`
        // already, so flagging dynamic here means "there's something we
        // can resolve at render time". Static-mixed-unit calc with only
        // px and % returns false from this walk and passes through.
        if (VP_UNIT_RE.test(t.raw) || CQ_UNIT_RE.test(t.raw)) return true;
      }
    }
    if (t.kind === TokenKind.Function) {
      const name = t.name;
      if (name === 'env' || name === 'light-dark') return true;
      if (name === 'calc' || name === 'min' || name === 'max' || name === 'clamp') {
        if (tokensNeedRuntimeResolution(tokenizeFunctionArgs(t))) return true;
      }
    }
  }
  return false;
}

/**
 * RN dimensions can't carry ±∞ or NaN;they would silently collapse to
 * 0, which is the worst kind of bug to debug. Catch the spec-defined
 * Values 4 §10.7.2 keywords at math-fn entry, warn the developer, and
 * drop the declaration. The regex requires non-ident-char boundaries so
 * substrings like `infinityPlanet` or `infinity-mode` don't trigger.
 */
const UNSUPPORTED_MATH_KEYWORD_RE = /(?:^|[^a-z0-9_-])(-?infinity|nan)(?![a-z0-9_-])/i;

function bailOnUnsupportedKeyword(value: string): boolean {
  const m = UNSUPPORTED_MATH_KEYWORD_RE.exec(value);
  if (m === null) return false;
  if (__DEV__) {
    warnOnce(
      'native-math-keyword',
      `\`${m[1]}\` cannot be used as a React Native dimension. Use a finite value instead, such as a large px value or a viewport unit.`,
      m[1].toLowerCase()
    );
  }
  return true;
}

function resolveMathFn(value: string): Resolver | null {
  if (bailOnUnsupportedKeyword(value)) return null;
  // Spec §10.1: "Parentheses and nesting additional calc() functions are
  // equivalent". Our tokenizer doesn't emit Paren tokens; the cheapest
  // path to grouping support is to rewrite bare `(...)` as `calc(...)`
  // before tokenization so the existing nested-calc support handles them.
  // The web passthrough must keep the original string (the browser parses
  // grouping natively), so this rewrite only runs for the native path.
  if (__NATIVE_WEB__) {
    if (tokensNeedRuntimeResolution(tokenize(value))) return mathFnResolver(value);
    // Static-mixed: passthrough raw. `mathFnResolver(value, undefined)`
    // doubles as a parseability gate;null means malformed, in which
    // case we drop the decl rather than ship a broken passthrough.
    return mathFnResolver(value) === null ? null : () => value;
  }
  return mathFnResolver(expandBareParens(value), NATIVE_MATH_OPTS);
}

/**
 * Convert bare grouping parentheses inside a math expression to a nested
 * `calc(...)` call so the existing nested-calc dispatch picks them up.
 * Function-call parens (preceded by an ident-character) are left intact;
 * only bare grouping is rewritten. Recurses into function-call args so
 * `min(2 * (3 + 1), 5)` is rewritten to `min(2 * calc(3 + 1), 5)`.
 *
 * Strings ('...' / "...") are not expected inside math values; we skip
 * the quoted-string handling that a fully general CSS preprocessor would
 * need. If a string ever reaches here it falls through to a copy.
 */
function expandBareParens(value: string): string {
  let result = '';
  let i = 0;
  const len = value.length;
  while (i < len) {
    const c = value.charCodeAt(i);
    if (c !== $.OPEN_PAREN) {
      result += value[i];
      i++;
      continue;
    }
    // Look back through trailing whitespace in `result` for an
    // ident-end character (a-z A-Z 0-9 _ -). If present, this `(` opens
    // a function call; emit verbatim and recurse into the args. Else,
    // it's bare grouping;rewrite as calc(...).
    let j = result.length - 1;
    while (j >= 0) {
      const cc = result.charCodeAt(j);
      if (cc === 0x20 || cc === 0x09) j--;
      else break;
    }
    const prev = j >= 0 ? result.charCodeAt(j) : -1;
    const isFunctionCall =
      prev !== -1 &&
      ((prev >= 0x61 && prev <= 0x7a) || // a-z
        (prev >= 0x41 && prev <= 0x5a) || // A-Z
        (prev >= 0x30 && prev <= 0x39) || // 0-9
        prev === 0x2d ||
        prev === 0x5f); // - _
    const close = findMatchingClose(value, i);
    if (close === -1) {
      // Unmatched paren; bail by emitting the rest verbatim.
      result += value.substring(i);
      return result;
    }
    const inner = expandBareParens(value.substring(i + 1, close));
    if (isFunctionCall) {
      result += '(' + inner + ')';
    } else {
      result += 'calc(' + inner + ')';
    }
    i = close + 1;
  }
  return result;
}

function findMatchingClose(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === $.OPEN_PAREN) depth++;
    else if (c === $.CLOSE_PAREN) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const NATIVE_MATH_OPTS: BuildOpts = {
  resolvePercent: env => {
    const c = env.container;
    if (c !== null) {
      // Container exists but is pending its first measurement
      // (width === 0). Return null to drop the calc declaration for
      // one frame so the descendant auto-sizes rather than resolving
      // against the viewport — viewport-fallback over-sized
      // descendants and triggered un-recoverable flex-wrap overflow
      // on Android (Yoga didn't re-flow after the published width
      // arrived). After the first onLayout publishes, width is
      // positive and the calc resolves normally.
      return c.width > 0 ? c.width : null;
    }
    const w = env.media.width;
    return w > 0 ? w : null;
  },
};

/**
 * Resolve a viewport-percentage length. Per Values 4 §6.1.2.2, the four
 * variants (default v*, sv*, lv*, dv*) are independent on the web but
 * collapse to a single value on RN;no URL-bar surface, so dynamic =
 * small = large = layout viewport. Inline (`vi`) and block (`vb`)
 * resolve to width / height respectively in horizontal-tb writing-mode
 * (Yoga's only mode).
 */
function viewportResolver(n: number, unit: string): Resolver {
  // Strip the variant prefix so the suffix decides the axis. `vmin`
  // / `vmax` keep the full ident (they have no axis suffix).
  const u =
    unit.length > 2 && (unit[0] === 's' || unit[0] === 'l' || unit[0] === 'd')
      ? unit.slice(1)
      : unit;
  return env => {
    const { width: w, height: h } = env.media;
    switch (u) {
      case 'vw':
      case 'vi': // inline axis = width in horizontal-tb
        return (n * w) / 100;
      case 'vh':
      case 'vb': // block axis = height in horizontal-tb
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

/**
 * Font-relative length resolver: `rem`, `rlh`, `em`, `lh`. Multiplies
 * the numeric value by the appropriate cascade slot on render. RN has
 * no DOM cascade, so values come from {@link ResolveEnv.rootFontSize}
 * (rem / rlh anchor at root) and {@link ResolveEnv.fontSize} /
 * {@link ResolveEnv.lineHeight} (em / lh anchor at parent), populated
 * by NativeStyleContext at the boundary.
 *
 * `rlh` resolution: spec ties it to the root's line-height; v7 today
 * tracks only one cascade.lineHeight (parent-anchored), so `rlh` and
 * `lh` resolve identically at the root and increasingly diverge inside
 * a tree that overrides line-height on descendants. Track in
 * `project_known_open_issues.md` if the divergence matters for a real
 * use case.
 */
function fontRelativeResolver(n: number, unit: string): Resolver {
  switch (unit) {
    case 'rem':
      return env => n * env.rootFontSize;
    case 'rlh':
      // See header note: today this matches lh once cascade.lineHeight
      // is propagated; spec-correct root-only behavior needs a
      // separate ResolveEnv.rootLineHeight slot.
      return env => n * env.lineHeight;
    case 'em':
      return env => n * env.fontSize;
    case 'lh':
      return env => n * env.lineHeight;
    default:
      return env => n;
  }
}

function containerResolver(n: number, unit: string): Resolver {
  return env => {
    // Spec (CSS Conditional 5 §7): "If no eligible query container is
    // available, then use the small viewport size for that axis." On RN
    // the layout viewport is the small viewport (no URL-bar surface to
    // produce dvh/svh divergence), so env.media is the spec-correct
    // fallback container size.
    //
    // Pending containers (width === 0 && height === 0, set by
    // `ContainerPublisher` before its first onLayout) defer to null so
    // the cq-bearing declaration drops for one frame, mirroring the
    // calc(%) defer behaviour in `NATIVE_MATH_OPTS`.
    const c = env.container;
    if (c !== null && c.width === 0 && c.height === 0) return null;
    const w = c !== null ? c.width : env.media.width;
    const h = c !== null ? c.height : env.media.height;
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

/**
 * Resolver for `light-dark()` per CSS Color Module Level 5 §7.
 * Spec grammar:
 *   light-dark() = <light-dark-color> | <light-dark-image>
 *   <light-dark-color> = light-dark(<color>, <color>)
 *   <light-dark-image> = light-dark( [ <image> | none ] , [ <image> | none ] )
 *
 * Both forms are accepted; mixing one image and one color is a
 * parse-time error per spec ("Attempting to use one image and one
 * color will result in a parse-time error.") and we return null so
 * the caller drops the declaration.
 *
 * Used color scheme determines the branch: "light or unknown" → first
 * arg, "dark" → second arg. We treat any non-`dark` value (including
 * undefined / null from a misconfigured Appearance API) as "unknown"
 * → first arg.
 *
 * Branches are parsed through {@link buildResolver} so they can
 * contain sentinels (theme tokens), env(), nested light-dark, or any
 * other render-time-resolvable expression. Argument-count and empty-
 * branch validation reject 0 / 1 / 3+ args and empty branches.
 */
function lightDarkResolver(value: string): Resolver | null {
  const inner = value.slice('light-dark('.length, -1).trim();
  const commaIdx = singleTopLevelCommaIdx(inner);
  if (commaIdx === -1) return null;
  const light = inner.slice(0, commaIdx).trim();
  const dark = inner.slice(commaIdx + 1).trim();
  if (light.length === 0 || dark.length === 0) return null;
  // Spec: mixing image + color forms is a parse-time error.
  if (isImageBranch(light) !== isImageBranch(dark)) return null;
  const lightR = buildResolver(light);
  const darkR = buildResolver(dark);
  if (__NATIVE_WEB__ && lightR === null && darkR === null) {
    // Pure-static on rn-web: return null so the literal `light-dark(...)`
    // value reaches the DOM verbatim. `transformDecl` wraps these in a CSS
    // custom-property indirection (rn-web's `normalizeColor` strips the
    // function form, but it accepts `var()`), letting the browser handle
    // `prefers-color-scheme` reactivity natively.
    return null;
  }
  // Dynamic branches (theme sentinels, env(), nested resolvers) evaluate
  // at render time; the OS color-scheme change re-renders via the
  // Appearance listener.
  return env => {
    const isDark = env.media.colorScheme === 'dark';
    if (isDark) return darkR !== null ? darkR(env) : dark;
    return lightR !== null ? lightR(env) : light;
  };
}

/**
 * Categorize a `light-dark()` branch as <image>-form. Per CSS Color
 * Module Level 5, the image form accepts `<image> | none` where
 * `<image>` is any value matching the CSS Image type: `url()`,
 * gradient functions (linear / radial / conic, plus repeating-*),
 * `image-set()`, `image()`, `cross-fade()`, `element()`, `paint()`.
 * Any other value (named color, hex, rgb, sentinel, calc, etc.) is
 * treated as the color form.
 *
 * Nested `light-dark()` calls are currently classified as color form
 * (the common case); a nested light-dark whose own branches are
 * images would slip past this check, but visually inconsistent
 * rendering in that edge case is preferable to false rejections.
 */
function isImageBranch(s: string): boolean {
  if (s === 'none') return true;
  return (
    s.startsWith('url(') ||
    s.startsWith('linear-gradient(') ||
    s.startsWith('radial-gradient(') ||
    s.startsWith('conic-gradient(') ||
    s.startsWith('repeating-linear-gradient(') ||
    s.startsWith('repeating-radial-gradient(') ||
    s.startsWith('repeating-conic-gradient(') ||
    s.startsWith('image-set(') ||
    s.startsWith('image(') ||
    s.startsWith('cross-fade(') ||
    s.startsWith('element(') ||
    s.startsWith('paint(')
  );
}

/**
 * Compound-value resolver for strings that EMBED one or more
 * `light-dark(...)` calls (e.g. `box-shadow: 0 4px 8px
 * light-dark(rgba(0,0,0,.2), rgba(255,255,255,.1))`). The top-level
 * dispatch in {@link buildResolver} only catches values that ARE a
 * single light-dark call; this scanner finds embedded calls (top-level
 * or nested inside other functions) and substitutes each in place at
 * render time so the assembled string reaches RN with concrete colors.
 *
 * Boundary detection: only treats `light-dark(` as a function call when
 * the preceding char is whitespace, comma, slash, paren, or
 * start-of-string;same boundary set used by the sentinel scanner so
 * `mylight-dark(...)` (an identifier ending in `light-dark`) doesn't
 * trigger. Returns null when no calls are found or any call's body is
 * malformed (caller drops the decl).
 */
function embeddedLightDarkResolver(value: string): Resolver | null {
  const calls: Array<{ start: number; end: number; resolver: Resolver }> = [];
  const NEEDLE = 'light-dark(';
  let cursor = 0;
  while (cursor < value.length) {
    const idx = value.indexOf(NEEDLE, cursor);
    if (idx === -1) break;
    if (idx > 0) {
      const prev = value.charCodeAt(idx - 1);
      const isBoundary =
        prev === 0x20 || // space
        prev === 0x09 || // tab
        prev === 0x0a || // \n
        prev === 0x0d || // \r
        prev === 0x2c || // ,
        prev === 0x28 || // (
        prev === 0x2f; //   /
      if (!isBoundary) {
        cursor = idx + 1;
        continue;
      }
    }
    // Find the matching close paren, respecting nested parens inside
    // the call's body (e.g. `light-dark(rgba(...), rgba(...))`).
    let depth = 0;
    let j = idx + NEEDLE.length;
    let endIdx = -1;
    while (j < value.length) {
      const c = value.charCodeAt(j);
      if (c === 0x28 /* ( */) {
        depth++;
      } else if (c === 0x29 /* ) */) {
        if (depth === 0) {
          endIdx = j;
          break;
        }
        depth--;
      }
      j++;
    }
    if (endIdx === -1) return null;
    const callStr = value.substring(idx, endIdx + 1);
    const r = lightDarkResolver(callStr);
    if (r === null) return null;
    calls.push({ start: idx, end: endIdx + 1, resolver: r });
    cursor = endIdx + 1;
  }
  if (calls.length === 0) return null;
  return env => {
    let out = '';
    let pos = 0;
    for (let i = 0; i < calls.length; i++) {
      const c = calls[i];
      if (pos < c.start) out += value.substring(pos, c.start);
      const v = c.resolver(env);
      if (v === null) return null;
      out += typeof v === 'number' ? String(v) : v;
      pos = c.end;
    }
    if (pos < value.length) out += value.substring(pos);
    return out;
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
  // Per Env 1 §3, a bare comma signals "fallback was passed as empty".
  // An empty fallback substitutes the empty value, which makes the
  // declaration invalid at computed-value time;drop it instead of
  // shipping an empty string to RN. `null` here marks "no fallback".
  let fallback = commaIdx === -1 ? null : inner.slice(commaIdx + 1).trim();
  if (fallback === '') fallback = null;

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

/**
 * Module-level sentinel marking the closure-local single-slot cache as
 * empty (no previous theme observed). Shared across every themeResolver
 * closure so we don't allocate a fresh marker per resolver.
 */
const NO_THEME_SEEN: object = {};

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

  // Single-slot identity cache. Theme is the only env field this resolver
  // reads, so caching `(theme identity → resolved value)` short-circuits the
  // dot-path walk on every render where the theme reference hasn't changed.
  // Within a typical app theme is allocated once per createTheme + persists
  // across renders, so the hit rate is dominated by re-renders.
  let lastTheme: any = NO_THEME_SEEN;
  let lastResult: any;

  return env => {
    if (env.theme === lastTheme) return lastResult;
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
    const out = v === undefined || v === null ? fallback : v;
    lastTheme = env.theme;
    lastResult = out;
    return out;
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
 * Each sentinel must sit at a CSS-token boundary;start of the value, or
 * preceded by whitespace, comma, paren, or slash. A sentinel preceded by a
 * non-boundary char is the JS concat-leak case (`'47\0sc:…'`) and we
 * deliberately bail to null so `warnIfSentinelLeak` can fire downstream.
 *
 * Paren depth is tracked so a sentinel inside `translateY(\0sc:x:Npx)` is
 * correctly bounded by the enclosing function's closing paren;the
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
  const m = FALLBACK_UNIT_RE.exec(fallback);
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
    // `)` when it would close the paren level we entered the sentinel at ;
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

/** Return the comma index iff exactly one top-level comma exists; -1 otherwise. */
function singleTopLevelCommaIdx(s: string): number {
  let depth = 0;
  let found = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === $.OPEN_PAREN) depth++;
    else if (c === $.CLOSE_PAREN) depth--;
    else if (c === $.COMMA && depth === 0) {
      if (found !== -1) return -1;
      found = i;
    }
  }
  return found;
}

function parseLengthLiteral(s: string): number | string | null {
  const m = LENGTH_LITERAL_RE.exec(s.trim());
  if (m !== null) return parseFloat(m[1]);
  return s; // percent / auto / whatever; caller will pass through
}

/**
 * Options threaded through math-fn evaluation. `resolvePercent` (when
 * provided) converts `<n>%` operands into px at render time using the
 * supplied base width;critical on native, where Yoga can't resolve
 * `calc(% - px)` itself. Web's static-mixed-unit path skips this and
 * passes the raw calc string through to the CSS engine.
 */
interface BuildOpts {
  resolvePercent?: (env: ResolveEnv) => number | null;
}

/**
 * Runtime resolver for `calc()` / `min()` / `max()` / `clamp()`. Used
 * for both dynamic-arm cases (sentinels, env(), viewport / container
 * units, light-dark(), nested math fns) and the native static-mixed
 * path (where `opts.resolvePercent` does the % → px conversion the
 * layout engine would normally do).
 */
function mathFnResolver(value: string, opts?: BuildOpts): Resolver | null {
  const tokens = tokenize(value);
  if (tokens.length !== 1 || tokens[0].kind !== TokenKind.Function) return null;
  const fn = tokens[0];
  const name = fn.name || '';
  if (name === 'calc') return calcResolverFromFn(fn, opts);
  if (name === 'min' || name === 'max' || name === 'clamp') {
    return minMaxClampResolverFromFn(name, fn, opts);
  }
  return null;
}

function calcResolverFromFn(fn: Token, opts?: BuildOpts): Resolver | null {
  const args = tokenizeFunctionArgs(fn);
  const armEval = buildExpression(args, opts);
  if (armEval === null) return null;
  return env => {
    const r = armEval(env);
    if (r === null) return null;
    return numericToCss(r);
  };
}

function minMaxClampResolverFromFn(name: string, fn: Token, opts?: BuildOpts): Resolver | null {
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

  // Spec §10.2: clamp's MIN and MAX arms accept the keyword `none`,
  // disabling that side of the clamp:
  //   clamp(none, VAL, MAX) === min(VAL, MAX)
  //   clamp(MIN, VAL, none) === max(MIN, VAL)
  //   clamp(none, VAL, none) === calc(VAL)
  // `none` is invalid in min() / max() arms, in clamp's VAL arm, or in
  // any sub-expression.
  const armResolvers: Array<((env: ResolveEnv) => NumericResult | null) | null> = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    // Spec §10.2: clamp's MIN (arm 0) and MAX (arm 2) accept `none`, which
    // disables that side. `none` is invalid in VAL (arm 1), min(), max(),
    // or any sub-expression.
    if (
      name === 'clamp' &&
      (i === 0 || i === 2) &&
      g.length === 1 &&
      g[0].kind === TokenKind.Ident &&
      g[0].name === 'none'
    ) {
      armResolvers.push(null);
      continue;
    }
    if (
      name === 'clamp' &&
      i === 1 &&
      g.length === 1 &&
      g[0].kind === TokenKind.Ident &&
      g[0].name === 'none'
    ) {
      return null;
    }
    const e = buildExpression(g, opts);
    if (e === null) return null;
    armResolvers.push(e);
  }

  return env => {
    const operands: Array<NumericResult | null> = [];
    const realOperands: NumericResult[] = [];
    for (let i = 0; i < armResolvers.length; i++) {
      const ar = armResolvers[i];
      if (ar === null) {
        operands.push(null);
        continue;
      }
      const r = ar(env);
      if (r === null) return null;
      operands.push(r);
      realOperands.push(r);
    }
    const unit = unifyUnits(realOperands);
    if (unit === null) return null;

    let result: number;
    if (name === 'min') {
      result = realOperands[0].value;
      for (let i = 1; i < realOperands.length; i++) {
        if (realOperands[i].value < result) result = realOperands[i].value;
      }
    } else if (name === 'max') {
      result = realOperands[0].value;
      for (let i = 1; i < realOperands.length; i++) {
        if (realOperands[i].value > result) result = realOperands[i].value;
      }
    } else {
      // Spec: clamp(MIN, VAL, MAX) === max(MIN, min(VAL, MAX)). MIN wins
      // when MIN > MAX (per CSS Values Level 4 §10.2). `none` arms drop
      // out of the comparison.
      const lo = operands[0];
      const val = operands[1]!;
      const hi = operands[2];
      let v = val.value;
      if (hi !== null && v > hi.value) v = hi.value;
      if (lo !== null && v < lo.value) v = lo.value;
      result = v;
    }
    return numericToCss({ value: result, unit });
  };
}

/**
 * Build an evaluator for an expression sequence: `<operand> (<op> <operand>)*`.
 * Returns a function that, given a {@link ResolveEnv}, produces a
 * {@link NumericResult} (value + unit). Bails on syntactically malformed
 * sequences or unsupported operand kinds. `opts` threads the caller's
 * percent-resolution policy through nested operands.
 */
function buildExpression(
  tokens: Token[],
  opts?: BuildOpts
): ((env: ResolveEnv) => NumericResult | null) | null {
  if (tokens.length === 0) return null;

  // Spec §10.9 type checking: `<number> + <length|percent>` is invalid
  // ("unitless 0 lengths aren't supported in math functions"). Catch
  // statically-typed mismatches at construction time. Sentinels and
  // nested function tokens can resolve to either kind, so they defer to
  // runtime where the produced NumericResult's unit fights it out.
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== TokenKind.Op) continue;
    if (t.op !== '+' && t.op !== '-') continue;
    const left = tokens[i - 1];
    const right = tokens[i + 1];
    if (left === undefined || right === undefined) continue;
    const ln = isStaticNumberKind(left);
    const rn = isStaticNumberKind(right);
    const ld = isStaticDimensionKind(left);
    const rd = isStaticDimensionKind(right);
    if ((ln && rd) || (ld && rn)) return null;
  }

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
    const e = buildOperand(t, opts);
    if (e === null) return null;
    operandEvals.push(e);
    expectOperand = false;
  }

  if (expectOperand || operandEvals.length !== ops.length + 1) return null;
  const rp = opts?.resolvePercent;
  if (operandEvals.length === 1) {
    // Single-operand expression: still apply percent → px conversion so
    // the inner-calc passthrough path stays consistent with multi-operand.
    if (rp === undefined) return operandEvals[0];
    const eval0 = operandEvals[0];
    return env => {
      const r = eval0(env);
      if (r === null || r.unit !== '%') return r;
      const base = rp(env);
      if (base === null) return null;
      return { value: (r.value / 100) * base, unit: 'px' };
    };
  }

  return env => {
    const items: Array<NumericResult | string> = [];
    for (let i = 0; i < operandEvals.length; i++) {
      let r = operandEvals[i](env);
      if (r === null) return null;
      if (rp !== undefined && r.unit === '%') {
        // Native path: any operand surfacing as `%` (literal Percent
        // token, sentinel resolving to '10%', nested calc returning a
        // percent string) converts to px against the container/viewport
        // base. Centralising the conversion here covers every operand
        // shape with one rule.
        const base = rp(env);
        if (base === null) return null;
        r = { value: (r.value / 100) * base, unit: 'px' };
      }
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
function buildOperand(
  t: Token,
  opts?: BuildOpts
): ((env: ResolveEnv) => NumericResult | null) | null {
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
    // Viewport / container unit;defer to buildResolver, which produces
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
  if (t.kind === TokenKind.Ident) {
    // Math-context numeric constants (Values 4 §10.7). `pi` / `e` are
    // <number>s. `infinity` / `-infinity` / `NaN` warn + drop.
    const num = identToNumeric(t.name!, t.raw);
    if (num === null) return null;
    return () => num;
  }
  if (t.kind === TokenKind.Function) {
    // Static fold first (cheap, common case for nested static math).
    const num = resolveStaticMathFunction(t);
    if (num !== null) return () => num;
    // Otherwise build a runtime resolver from the function's raw form.
    const inner = t.name || '';
    if (inner === 'calc') {
      const r = calcResolverFromFn(t, opts);
      if (r === null) return null;
      return env => valueToNumeric(r(env), '');
    }
    if (inner === 'min' || inner === 'max' || inner === 'clamp') {
      const r = minMaxClampResolverFromFn(inner, t, opts);
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

/**
 * True when a token statically resolves to a CSS <number>. Numeric
 * constants `pi` / `e` count; `infinity` / `-infinity` / `NaN` are
 * caught earlier and never reach this check. Sentinels and nested
 * function tokens defer to runtime.
 */
function isStaticNumberKind(t: Token): boolean {
  if (t.kind === TokenKind.Number) return true;
  if (t.kind === TokenKind.Ident) {
    const n = t.name;
    return n === 'pi' || n === 'e';
  }
  return false;
}

/**
 * True when a token statically resolves to a CSS <length> or
 * <percentage>. Sentinels and nested function tokens defer to runtime.
 */
function isStaticDimensionKind(t: Token): boolean {
  return t.kind === TokenKind.Length || t.kind === TokenKind.Percent;
}

function valueToNumeric(v: number | string | null, defaultUnit: string): NumericResult | null {
  if (v === null) return null;
  if (typeof v === 'number') return { value: v, unit: defaultUnit };
  // Parse a string like '55', '55px', '10%', '12.5em' into NumericResult.
  const m = NUMERIC_RE.exec(v.trim());
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
      // Runtime relaxation (deviating from Spec §10.9 strict typing): a
      // sentinel-derived operand often surfaces unitless because the
      // theme value doesn't carry a CSS unit. Tolerate `<unitless> +/-
      // <typed>` here so `calc(${t.space.xl} + 47px)` still works at
      // runtime; literal `calc(0 + 5px)` is rejected at construction
      // time in `buildExpression` before reaching here.
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
 * aren't supported here;the static converter doesn't know about them
 * either. Sentinels resolved to numbers / percents / hex colors cover
 * the practical theme-palette case.
 */
function colorFnResolver(value: string): Resolver | null {
  const tr = templateResolver(value);
  if (tr === null) return null;
  if (__NATIVE_WEB__) {
    // rn-web: passthrough preserves wide gamut; the browser handles oklch / oklab / lch / lab / color-mix natively.
    return env => {
      const assembled = tr(env);
      return typeof assembled === 'string' ? assembled : null;
    };
  }
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
 *
 * Hot path (no resolvers) is kept tiny so V8 inlines the call at the
 * many `applyResolvers(_, [], _)` use sites. The cached slow path
 * lives in {@link applyResolversWithCache} where a single-slot
 * identity cache on (resolvers, base, env) returns the previously
 * built output object when the inputs are reference-stable across
 * renders.
 */
export function applyResolvers(
  base: Record<string, any>,
  resolvers: Array<[string, Resolver]>,
  env: ResolveEnv
): Record<string, any> {
  if (resolvers.length === 0) return base;
  return applyResolversWithCache(base, resolvers, env);
}

const APPLY_CACHE: unique symbol = Symbol('sc-apply-cache');

interface ResolversWithCache extends Array<[string, Resolver]> {
  [APPLY_CACHE]?: { base: unknown; env: unknown; result: Record<string, any> };
}

function applyResolversWithCache(
  base: Record<string, any>,
  resolvers: Array<[string, Resolver]>,
  env: ResolveEnv
): Record<string, any> {
  const stashed = (resolvers as ResolversWithCache)[APPLY_CACHE];
  if (stashed !== undefined && stashed.base === base && stashed.env === env) {
    return stashed.result;
  }
  const out = { ...base };
  for (let i = 0; i < resolvers.length; i++) {
    const pair = resolvers[i];
    const key = pair[0];
    const v = pair[1](env);
    if (v === null) delete out[key];
    else out[key] = v;
  }
  (resolvers as ResolversWithCache)[APPLY_CACHE] = { base, env, result: out };
  return out;
}
