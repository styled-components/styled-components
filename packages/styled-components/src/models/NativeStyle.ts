import type { CompiledKeyframes, KeyframesCompiler } from './Keyframes';
import type { StaticRoot } from '../parser/ast';
import { fillSource } from '../parser/compile';
import {
  buildInterpKey,
  evaluateForFastPath,
  FastPathFragment,
  hasAnyFragment,
} from '../parser/evaluate';
import { parse } from '../parser/parser';
import type { Source } from '../parser/source';
import { normalize } from '../utils/normalize';
import { getSource, synthesizeSourceForRuleSet } from '../parser/source';
import {
  ExecutionContext,
  INativeStyle,
  INativeStyleConstructor,
  RuleSet,
  StyleSheet,
} from '../types';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../utils/createWarnTooManyClasses';
import { fifoSet } from '../utils/fifoMap';
import {
  toNativeStyles,
  astToNativeStyles,
  hasCascadeKey,
  hasResponsiveOutput,
  NativeStyles,
  cssToStyleObject,
  resetNativeStyleCache,
  RN_UNSUPPORTED_VALUES,
} from './compileNative';

export { RN_UNSUPPORTED_VALUES, cssToStyleObject };
export type { NativeStyles };

/** Clear the cached CSS-to-style-object mappings. Useful in tests or long-running RN apps with highly dynamic styles. */
export const resetStyleCache = resetNativeStyleCache;

/**
 * Names and serializes `${kf}` slots on native: a keyframes value keeps its
 * authored name, and its compiled rule is the `@keyframes` block that
 * {@link fillNativeSource} adds for the style walker to collect.
 */
const NATIVE_KEYFRAMES_COMPILER: KeyframesCompiler = {
  hash: '',
  compile: (css, name, prefix) => [prefix + ' ' + name + '{' + css + '}'],
};

const keyframesRuleCache = new Map<string, StaticRoot>();

/**
 * Fill a source for the native style walker, adding the `@keyframes` block
 * of every keyframes value its slots referenced.
 */
function fillNativeSource(
  source: Source,
  filled: ReadonlyArray<string>,
  fragments: ReadonlyArray<FastPathFragment | null> | null,
  keyframes: ReadonlyArray<CompiledKeyframes>
): StaticRoot {
  const ast = fillSource(source, filled, fragments);
  if (keyframes.length === 0) return ast;
  const out = ast.slice();
  for (let i = 0; i < keyframes.length; i++) {
    const rule = keyframes[i].rules[0];
    let nodes = keyframesRuleCache.get(rule);
    if (nodes === undefined) {
      nodes = parse(normalize(rule));
      fifoSet(keyframesRuleCache, rule, nodes, TOO_MANY_CLASSES_LIMIT);
    }
    for (let j = 0; j < nodes.length; j++) out.push(nodes[j]);
  }
  return out;
}

/** Evaluate and fill a source for native with a given render context. */
export function evaluateNativeSource(source: Source, context: unknown): StaticRoot {
  const fragments: (FastPathFragment | null)[] = [];
  const keyframes: CompiledKeyframes[] = [];
  const filled = evaluateForFastPath(
    source,
    context,
    undefined,
    NATIVE_KEYFRAMES_COMPILER,
    fragments,
    keyframes
  );
  return fillNativeSource(source, filled, hasAnyFragment(fragments) ? fragments : null, keyframes);
}

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
    private keyframesBuffer: CompiledKeyframes[] | undefined;
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
      if (!__NATIVE_WEB__ && (ANCHOR_FN_RE.test(joined) || hasFn)) {
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
      if (this.staticCSS !== null) {
        const compiled = toNativeStyles(this.staticCSS, styleSheet);
        this.staticCompiled = compiled;
        // Static rendering is hookless, so cascade publishers and live outputs
        // must stay on the dynamic path. Custom property declarations and
        // var() references publish / consume cascade values, so they also
        // disqualify a component from the hookless static fast path.
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
          compiled.gridSpan === undefined &&
          !hasCascadeKey(compiled.base);
      }
    }

    compile(executionContext: ExecutionContext & Props): NativeStyles {
      if (this.staticCompiled !== null) {
        return this.staticCompiled;
      }

      if (this.resolvedSource === undefined) {
        this.resolvedSource = getSource(this.rules) ?? null;
      }
      const source = this.resolvedSource;
      if (source === null) return toNativeStyles('', styleSheet);
      // Pre-fill via push so V8 keeps these PACKED_ELEMENTS. `new
      // Array(n)` creates HOLEY_ELEMENTS even after every slot is
      // overwritten, which infects the IC for the per-slot reads in
      // `evaluateForFastPath` and the `hasAnyFragment` scan.
      // See feedback_v8_class_vs_struct_empirical / GroupedTag note
      // in AGENTS.md.
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
      if (this.keyframesBuffer === undefined) this.keyframesBuffer = [];
      else this.keyframesBuffer.length = 0;
      const filled = evaluateForFastPath(
        source,
        executionContext,
        this.filledBuffer,
        NATIVE_KEYFRAMES_COMPILER,
        this.fragmentsBuffer,
        this.keyframesBuffer
      );
      const fragments = hasAnyFragment(this.fragmentsBuffer) ? this.fragmentsBuffer : null;
      const interpKey = buildInterpKey(filled, fragments);
      const cached = this.interpKeyCache && this.interpKeyCache.get(interpKey);
      if (cached !== undefined) return cached;
      const compiled = astToNativeStyles(
        fillNativeSource(source, filled, fragments, this.keyframesBuffer),
        styleSheet
      );
      this.recordInterpKey(interpKey, compiled);
      return compiled;
    }

    private recordInterpKey(key: string, compiled: NativeStyles): void {
      if (!this.interpKeyCache) this.interpKeyCache = new Map();
      fifoSet(this.interpKeyCache, key, compiled, TOO_MANY_CLASSES_LIMIT);
    }
  };

  return NativeStyle;
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

/** Syntactic gate for env(safe-area-inset-*) (CSS Environment Variables §2.1). */
const SAFE_AREA_ENV_RE = /\benv\(\s*safe-area-inset-(?:top|right|bottom|left)\b/;
