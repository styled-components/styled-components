import {
  buildHashCSS,
  buildInterpKey,
  evaluateForFastPath,
  FastPathFragment,
  fillAst,
} from '../parser/compile';
import type { Source } from '../parser/source';
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

export default function makeNativeStyleClass<Props extends object>(styleSheet: StyleSheet) {
  const NativeStyle: INativeStyleConstructor<Props> = class NativeStyle implements INativeStyle<Props> {
    rules: RuleSet<Props>;
    private staticCSS: string | null;
    private cachedCompiled: NativeStyles | null = null;
    private cachedCSS: string | null = null;
    /** Interp-tuple → compiled cache. Hit skips `buildHashCSS` + `toNativeStyles`. */
    private interpKeyCache: Map<string, NativeStyles> | undefined;
    /** Lazy `getSource(rules)` cache. */
    private resolvedSource: Source | null | undefined = undefined;
    /** Reused scratch buffer for `evaluateForFastPath`. */
    private filledBuffer: string[] | undefined;
    /** Parallel fragment buffer; lazily allocated. */
    private fragmentsBuffer: (FastPathFragment | null)[] | undefined;
    /** Set at construction; true when the CSS can render via the zero-hook static impl. */
    staticEligible = false;
    staticCompiled: NativeStyles | null = null;

    constructor(rules: RuleSet<Props>) {
      this.rules = rules;
      synthesizeSourceForRuleSet(rules);
      this.staticCSS = isAllStaticStrings(rules) ? joinStringRules(rules) : null;
      if (this.staticCSS !== null) {
        const compiled = toNativeStyles(this.staticCSS, styleSheet);
        this.staticCompiled = compiled;
        // Static-impl eligibility: the static path doesn't publish a fresh
        // NativeStyleContext (no useState / no Provider for cascade), so any
        // declaration that descendants need to see during their own resolve
        // (font-size / line-height / direction) must route through the
        // dynamic impl. Otherwise a child `1em` resolves against the
        // inherited base rather than this component's override. Same
        // rationale for responsive / animated outputs.
        this.staticEligible =
          !hasResponsiveOutput(compiled) &&
          compiled.startingStyle === undefined &&
          compiled.animations === undefined &&
          compiled.transitions === undefined &&
          !publishesCascade(compiled.base);
      }
    }

    compile(executionContext: ExecutionContext & Props): NativeStyles {
      if (this.staticCompiled !== null) {
        return this.staticCompiled;
      }

      // Fast path: try the interp-tuple cache before any CSS or AST work.
      if (this.resolvedSource === undefined) {
        this.resolvedSource = getSource(this.rules) ?? null;
      }
      const source = this.resolvedSource;
      let interpKey: string | undefined;
      let filled: ReadonlyArray<string> | null = null;
      let fragments: (FastPathFragment | null)[] | null = null;
      if (source !== null) {
        if (this.filledBuffer === undefined) {
          this.filledBuffer = new Array(source.interpolations.length);
        }
        if (this.fragmentsBuffer === undefined) {
          this.fragmentsBuffer = new Array(source.interpolations.length);
        }
        filled = evaluateForFastPath(
          source,
          executionContext,
          this.filledBuffer,
          undefined,
          this.fragmentsBuffer
        );
        if (filled !== null) {
          let hasFragments = false;
          for (let i = 0; i < this.fragmentsBuffer.length; i++) {
            if (this.fragmentsBuffer[i] !== null) {
              hasFragments = true;
              break;
            }
          }
          fragments = hasFragments ? this.fragmentsBuffer : null;
          interpKey = buildInterpKey(filled, fragments);
          const cached = this.interpKeyCache && this.interpKeyCache.get(interpKey);
          if (cached !== undefined) return cached;
        }
      }

      // AST-direct: walk the construction-time AST without round-tripping
      // through string parse.
      if (source !== null && filled !== null) {
        const filledAst = fillAst(source.ast, filled, fragments);
        if (filledAst !== null) {
          const compiled = astToNativeStyles(filledAst, styleSheet);
          this.cachedCompiled = compiled;
          this.cachedCSS = null;
          if (interpKey !== undefined) this.recordInterpKey(interpKey, compiled);
          return compiled;
        }
      }

      // Fallback: rebuild the joined CSS and route through `toNativeStyles`.
      const css =
        filled !== null && source !== null ? buildHashCSS(source.strings, filled, fragments) : '';
      if (css === this.cachedCSS && this.cachedCompiled !== null) {
        if (interpKey !== undefined) this.recordInterpKey(interpKey, this.cachedCompiled);
        return this.cachedCompiled;
      }
      this.cachedCSS = css;
      const compiled = toNativeStyles(css, styleSheet);
      this.cachedCompiled = compiled;
      if (interpKey !== undefined) this.recordInterpKey(interpKey, compiled);
      return compiled;
    }

    private recordInterpKey(key: string, compiled: NativeStyles): void {
      if (!this.interpKeyCache) this.interpKeyCache = new Map();
      fifoSet(this.interpKeyCache, key, compiled, TOO_MANY_CLASSES_LIMIT);
    }
  };

  return NativeStyle;
}

/**
 * Cascade-significant property check: a component declaring `font-size`,
 * `line-height`, or `direction` in its base must publish a fresh
 * cascade so descendants resolving `1em`, `1lh`, or direction-aware
 * keywords see the override. Only useDynamicImpl publishes the
 * cascade; useStaticImpl is hookless.
 */
function publishesCascade(base: Record<string, unknown>): boolean {
  return (
    base.fontSize !== undefined || base.lineHeight !== undefined || base.direction !== undefined
  );
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

function joinStringRules(rules: ReadonlyArray<unknown>): string {
  let css = '';
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (typeof r === 'string') css += r;
    else if (Array.isArray(r)) css += joinStringRules(r);
  }
  return css;
}
