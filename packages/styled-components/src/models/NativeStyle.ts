import {
  buildInterpKey,
  evaluateForFastPath,
  FastPathFragment,
  fillAst,
  hasAnyFragment,
} from '../parser/compile';
import type { Source } from '../parser/source';
import { getSource, InterpolationKind, synthesizeSourceForRuleSet } from '../parser/source';
import {
  ExecutionContext,
  INativeStyle,
  INativeStyleConstructor,
  RuleSet,
  StyleSheet,
} from '../types';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../utils/createWarnTooManyClasses';
import { fifoSet } from '../utils/fifoMap';
import { substituteThemeText } from '../native/transform/polyfills/resolvers';
import {
  toNativeStyles,
  astToNativeStyles,
  hasResponsiveOutput,
  NativeStyles,
  resetNativeStyleCache,
  RN_UNSUPPORTED_VALUES,
} from './compileNative';

export { RN_UNSUPPORTED_VALUES };
export type { NativeStyles };

/** Clear the cached CSS-to-style-object mappings. Useful in tests or long-running RN apps with highly dynamic styles. */
export const resetStyleCache = resetNativeStyleCache;

export default function makeNativeStyleClass<Props extends object>(styleSheet: StyleSheet) {
  const NativeStyle: INativeStyleConstructor<Props> = class NativeStyle
    implements INativeStyle<Props>
  {
    rules: RuleSet<Props>;
    private staticCSS: string | null;
    private interpKeyCache: Map<string, NativeStyles> | undefined;
    private resolvedSource: Source | null | undefined = undefined;
    private filledBuffer: string[] | undefined;
    private fragmentsBuffer: (FastPathFragment | null)[] | undefined;
    private holdsThemeText = false;
    private themedKeyCache: Map<string, ThemedStyles> | undefined;
    private themedStyles: ThemedStyles | undefined;
    staticEligible = false;
    staticCompiled: NativeStyles | null = null;
    usesAnchorFunctions = false;
    usesSafeAreaInsets = false;
    usesSafeAreaInsetsStatically = false;

    constructor(rules: RuleSet<Props>) {
      this.rules = rules;
      synthesizeSourceForRuleSet(rules);
      this.staticCSS = isAllStaticStrings(rules) ? joinStringRules(rules) : null;
      const joined = joinStringRules(rules, '\n');
      const hasFn = hasFunctionInterpolation(rules);
      // Gates the anchor-registry subscription in the dynamic render
      // path; lifetime-constant so the hook branch is stable. Function
      // interpolations are opaque at construction time and may return an
      // anchor() value, so they conservatively enable the subscription;
      // otherwise such a component would never re-resolve when an anchor
      // rect moves.
      if (ANCHOR_FN_RE.test(joined) || hasFn) {
        this.usesAnchorFunctions = true;
      }
      // Gates the SafeAreaProvider subscription for env(safe-area-inset-*).
      // Same lifetime-constant rule as usesAnchorFunctions: opaque function
      // interpolations may emit env(), so they opt in conservatively.
      const hasStaticSafeAreaEnv = SAFE_AREA_ENV_RE.test(joined);
      this.usesSafeAreaInsets = hasStaticSafeAreaEnv || hasFn;
      // Certain usage: a static env(safe-area-inset-*) literal. Gates the dev
      // "no inset source" warning so a function interpolation that never emits
      // env() does not trigger a false "install the peer" nudge.
      this.usesSafeAreaInsetsStatically = hasStaticSafeAreaEnv;
      // A template of only text and createTheme values: no user code runs, so the theme object alone decides the output.
      this.holdsThemeText =
        this.staticCSS !== null &&
        this.staticCSS.indexOf('\0') !== -1 &&
        substituteThemeText(this.staticCSS, undefined, false) !== this.staticCSS;
      if (this.staticCSS !== null && !this.holdsThemeText) {
        // A string value is still a value: joined text would read it as authored CSS.
        const compiled = getSource(rules)?.interpolations.length
          ? this.compile({} as ExecutionContext & Props)
          : toNativeStyles(this.staticCSS, styleSheet);
        this.staticCompiled = compiled;
        // Static rendering is hookless, so live outputs must stay on the dynamic
        // path. Custom property declarations and var() references publish /
        // consume cascade values, so they also disqualify a component from the
        // hookless static fast path. A font-size, line-height or direction
        // declaration does not: the static path publishes its own.
        this.staticEligible =
          !hasResponsiveOutput(compiled) &&
          compiled.startingStyle === undefined &&
          compiled.animations === undefined &&
          compiled.transitions === undefined &&
          compiled.customProperties === undefined &&
          compiled.varDeferred === undefined &&
          compiled.important === undefined &&
          compiled.importantResolvers === undefined &&
          // The anchor rect publisher needs the dynamic path's hooks.
          compiled.anchorName === undefined &&
          // Sticky elements translate via a hook-built Animated node.
          compiled.sticky === undefined &&
          // Grid containers publish a measured cascade entry and grid
          // items read it; both require the dynamic path's hooks.
          compiled.gridInfo === undefined &&
          compiled.gridSpan === undefined;
      }
    }

    compile(executionContext: ExecutionContext & Props): NativeStyles {
      if (this.staticCompiled !== null) {
        return this.staticCompiled;
      }
      if (this.holdsThemeText) return this.compileThemed(executionContext);

      return this.compileSlots(executionContext);
    }

    private compileThemed(executionContext: ExecutionContext & Props): NativeStyles {
      const theme = executionContext.theme;
      const slots = this.themedStyles ?? (this.themedStyles = new ThemedStyles());
      const hit = slots.read(theme);
      if (hit !== null) return hit;

      const compiled = this.compileSlots(executionContext);
      slots.write(theme, compiled);
      return compiled;
    }

    private compileSlots(executionContext: ExecutionContext & Props): NativeStyles {
      if (this.resolvedSource === undefined) {
        this.resolvedSource = getSource(this.rules) ?? null;
      }
      const source = this.resolvedSource;
      if (source === null) return toNativeStyles('', styleSheet);

      // Pre-fill via push so V8 keeps these PACKED_ELEMENTS (docs/performance.md).
      if (this.filledBuffer === undefined) {
        const n = source.interpolations.length;
        const buf: string[] = [];
        for (let i = 0; i < n; i++) buf.push('');
        this.filledBuffer = buf;
      }
      if (this.fragmentsBuffer === undefined) {
        const n = source.interpolations.length;
        const buf: (FastPathFragment | null)[] = [];
        for (let i = 0; i < n; i++) buf.push(null);
        this.fragmentsBuffer = buf;
      }
      const filled = evaluateForFastPath(
        source,
        executionContext,
        this.filledBuffer,
        undefined,
        this.fragmentsBuffer
      );
      if (filled === null) return toNativeStyles('', styleSheet);

      const fragments = hasAnyFragment(this.fragmentsBuffer) ? this.fragmentsBuffer : null;
      const interpKey = buildInterpKey(filled, fragments);
      const cached = this.interpKeyCache && this.interpKeyCache.get(interpKey);
      if (cached !== undefined) return cached;

      return this.compileMissed(source, filled, fragments, interpKey, executionContext.theme);
    }

    /**
     * Only a render that missed `interpKeyCache` scans for theme placeholders, so a
     * template without them pays nothing per render. A text holding one is never
     * stored in `interpKeyCache` under its own key, since the theme changes what
     * it reads as; `themedKeyCache` holds it per theme object instead.
     */
    private compileMissed(
      source: Source,
      filled: string[],
      fragments: (FastPathFragment | null)[] | null,
      interpKey: string,
      theme: ExecutionContext['theme'] | undefined
    ): NativeStyles {
      const themed = this.themedKeyCache && this.themedKeyCache.get(interpKey);
      if (themed !== undefined) {
        const hit = themed.read(theme);
        if (hit !== null) return hit;
      } else if (!holdsPlaceholder(filled, fragments)) {
        const compiled = astToNativeStyles(fillAst(source.ast, filled, fragments), styleSheet);
        this.recordInterpKey(interpKey, compiled);
        return compiled;
      }

      substituteThemeSlots(filled, source.kinds, fragments, theme);
      const readKey = buildInterpKey(filled, fragments);
      const known = this.interpKeyCache && this.interpKeyCache.get(readKey);
      const compiled =
        known !== undefined
          ? known
          : astToNativeStyles(fillAst(source.ast, filled, fragments), styleSheet);
      // A placeholder left in place (an object value) reads differently under another theme.
      if (known === undefined && !holdsPlaceholder(filled, fragments)) {
        this.recordInterpKey(readKey, compiled);
      }

      const slots = themed ?? new ThemedStyles();
      slots.write(theme, compiled);
      if (themed === undefined) {
        if (!this.themedKeyCache) this.themedKeyCache = new Map();
        fifoSet(this.themedKeyCache, interpKey, slots, TOO_MANY_CLASSES_LIMIT);
      }
      return compiled;
    }

    private recordInterpKey(key: string, compiled: NativeStyles): void {
      if (!this.interpKeyCache) this.interpKeyCache = new Map();
      fifoSet(this.interpKeyCache, key, compiled, TOO_MANY_CLASSES_LIMIT);
    }
  };

  return NativeStyle;
}

/** The compiled styles of one template for the two theme objects it last read, so an app that switches between two themes (light and dark) keeps hitting. */
class ThemedStyles {
  private lastStyles: NativeStyles | null = null;
  private lastTheme: object | undefined = undefined;
  private prevStyles: NativeStyles | null = null;
  private prevTheme: object | undefined = undefined;

  read(theme: object | undefined): NativeStyles | null {
    if (this.lastStyles !== null && this.lastTheme === theme) return this.lastStyles;
    if (this.prevStyles === null || this.prevTheme !== theme) return null;

    const hit = this.prevStyles;
    this.write(theme, hit);
    return hit;
  }

  write(theme: object | undefined, styles: NativeStyles): void {
    this.prevStyles = this.lastStyles;
    this.prevTheme = this.lastTheme;
    this.lastStyles = styles;
    this.lastTheme = theme;
  }
}

/** True when any slot of a template, or of a fragment spliced into it, holds a NUL: the start of a createTheme placeholder. */
function holdsPlaceholder(
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null
): boolean {
  for (let i = 0; i < filled.length; i++) {
    if (filled[i].indexOf('\0') !== -1) return true;
  }
  if (fragments === null) return false;

  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    if (fragment && holdsPlaceholder(fragment.filled, fragment.fragments)) return true;
  }
  return false;
}

/**
 * {@link substituteThemeText} over every filled slot of a template and of the
 * fragments spliced into it, in place. A slot is the placeholder's whole
 * boundary only when its text is a static value; any other slot's text may
 * have been joined around it. Lives here, not beside the text helper, because
 * that file ships in the reanimated bundle, which cannot read these field names.
 */
export function substituteThemeSlots(
  filled: string[],
  kinds: ReadonlyArray<InterpolationKind>,
  fragments: ReadonlyArray<FastPathFragment | null> | null,
  theme: ExecutionContext['theme'] | undefined
): void {
  for (let i = 0; i < filled.length; i++) {
    const text = filled[i];
    if (text.indexOf('\0') !== -1) {
      filled[i] = substituteThemeText(text, theme, kinds[i] !== InterpolationKind.Static);
    }
  }
  if (fragments === null) return;

  // A spliced fragment's slot holds no text of its own in `filled`.
  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    if (fragment) {
      substituteThemeSlots(fragment.filled, fragment.source.kinds, fragment.fragments, theme);
    }
  }
}

function isAllStaticStrings(rules: ReadonlyArray<unknown>): boolean {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (typeof r === 'string') continue;
    if (Array.isArray(r) && isAllStaticStrings(r)) continue;
    return false;
  }
  return true;
}

function hasFunctionInterpolation(rules: ReadonlyArray<unknown>): boolean {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (typeof r === 'function') return true;
    if (Array.isArray(r) && hasFunctionInterpolation(r)) return true;
  }
  return false;
}

function joinStringRules(rules: ReadonlyArray<unknown>, separator = ''): string {
  let css = '';
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (typeof r === 'string') css += separator === '' ? r : r + separator;
    else if (Array.isArray(r)) css += joinStringRules(r, separator);
  }
  return css;
}

// Syntactic gate for anchor() / anchor-size() usage (CSS Anchor
// Positioning). Declared here rather than imported from the anchor
// polyfill so NativeStyle, which the web path also loads, pulls in no
// polyfill module for a one-line regex.
const ANCHOR_FN_RE = /\banchor(?:-size)?\(/;

/** Syntactic gate for env(safe-area-inset-*). */
const SAFE_AREA_ENV_RE = /\benv\(\s*safe-area-inset-(?:top|right|bottom|left)\b/;
