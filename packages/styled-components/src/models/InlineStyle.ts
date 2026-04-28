import {
  ExecutionContext,
  IInlineStyle,
  IInlineStyleConstructor,
  RuleSet,
  StyleSheet,
} from '../types';
import flatten from '../utils/flatten';
import isStatelessFunction from '../utils/isStatelessFunction';
import { joinStringArray } from '../utils/joinStrings';
import {
  compileNativeStyles,
  CompiledNativeStyles,
  cssToStyleObject,
  resetNativeStyleCache,
  RN_UNSUPPORTED_VALUES,
} from './nativeStyleCompiler';

export { RN_UNSUPPORTED_VALUES, cssToStyleObject };
export type { CompiledNativeStyles };

/** Clear the cached CSS-to-style-object mappings. Useful in tests or long-running RN apps with highly dynamic styles. */
export const resetStyleCache = resetNativeStyleCache;

function flattenRulesToCSS<Props extends object>(
  rules: RuleSet<Props>,
  executionContext: ExecutionContext & Props
): string {
  let flatCSS = '';
  for (let i = 0; i < rules.length; i++) {
    const partRule = rules[i];
    if (typeof partRule === 'string') {
      flatCSS += partRule;
    } else if (partRule) {
      if (isStatelessFunction(partRule)) {
        const fnResult = (partRule as (ctx: ExecutionContext & Props) => unknown)(executionContext);
        if (typeof fnResult === 'string') {
          flatCSS += fnResult;
        } else if (fnResult !== undefined && fnResult !== null && fnResult !== false) {
          flatCSS += joinStringArray(flatten(fnResult as any, executionContext) as string[]);
        }
      } else {
        flatCSS += joinStringArray(flatten(partRule as any, executionContext) as string[]);
      }
    }
  }
  return flatCSS;
}

type DynamicStringRulesResult = {
  css: string;
  outputs: string[];
  unchanged: boolean;
};

export default function makeInlineStyleClass<Props extends object>(styleSheet: StyleSheet) {
  const InlineStyle: IInlineStyleConstructor<Props> = class InlineStyle implements IInlineStyle<Props> {
    rules: RuleSet<Props>;
    /** Pre-joined static CSS, set when every rule is a string. */
    private staticCSS: string | null;
    /** Memoised compile output (used for both static and dynamic paths). */
    private cachedCompiled: CompiledNativeStyles | null = null;
    /** Last produced dynamic CSS; short-circuit when the next call matches. */
    private cachedCSS: string | null = null;
    /** Last string outputs from function interpolations on the fast dynamic path. */
    private cachedDynamicOutputs: string[] | null = null;
    /** Consecutive dynamic-output changes; repeated misses fall back to single-pass flattening. */
    private dynamicOutputMisses = 0;
    /** Set at construction; the factory reads it once to pick the fast vs full render impl. */
    fastEligible = false;
    /** Compiled output for static CSS (eagerly resolved at construction); null when rules have function interpolations. */
    staticCompiled: CompiledNativeStyles | null = null;

    constructor(rules: RuleSet<Props>) {
      this.rules = rules;
      this.staticCSS = isAllStaticStrings(rules) ? joinStringRules(rules) : null;
      if (this.staticCSS !== null) {
        const compiled = compileNativeStyles(this.staticCSS, styleSheet);
        this.staticCompiled = compiled;
        this.fastEligible =
          compiled.conditional.length === 0 &&
          compiled.resolvers === undefined &&
          compiled.startingStyle === undefined;
      } else if (!sourceContainsResponsiveFeatures(rules)) {
        // Source has function interpolations but no responsive markers (no `@media`/pseudo
        // states/viewport units/etc). By contract, function interpolations produce simple
        // decls only; so the compile output will have empty conditional/resolvers/
        // startingStyle, and the fast path is sound. Verified on first compile in dev.
        this.fastEligible = true;
      }
    }

    compile(executionContext: ExecutionContext & Props): CompiledNativeStyles {
      if (this.staticCompiled !== null) {
        return this.staticCompiled;
      }
      const fastDynamic =
        this.dynamicOutputMisses < 2
          ? tryFlattenDynamicStringRules(this.rules, executionContext, this.cachedDynamicOutputs)
          : null;
      let css: string;
      if (fastDynamic !== null) {
        if (fastDynamic.unchanged && this.cachedCompiled !== null) {
          this.dynamicOutputMisses = 0;
          return this.cachedCompiled;
        }
        if (this.cachedCompiled !== null) this.dynamicOutputMisses++;
        this.cachedDynamicOutputs = fastDynamic.outputs;
        css = fastDynamic.css;
      } else {
        if (this.dynamicOutputMisses < 2) this.cachedDynamicOutputs = null;
        css = flattenRulesToCSS(this.rules, executionContext);
      }
      if (css === this.cachedCSS && this.cachedCompiled !== null) {
        this.dynamicOutputMisses = 0;
        return this.cachedCompiled;
      }
      this.cachedCSS = css;
      return (this.cachedCompiled = compileNativeStyles(css, styleSheet));
    }
  };

  return InlineStyle;
}

/**
 * Recursively check whether every rule is a plain string (or a nested
 * array of plain strings, which is the shape css`` produces). Anything
 * else (function, keyframes, styled component, plain object) keeps us
 * on the dynamic path because it requires an execution context to flatten.
 *
 * The recursion bound is the depth of css`` nesting, which is shallow
 * in practice (rare to nest >2 levels).
 */
function isAllStaticStrings(rules: ReadonlyArray<unknown>): boolean {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (typeof r === 'string') continue;
    if (Array.isArray(r) && isAllStaticStrings(r)) continue;
    return false;
  }
  return true;
}

// Markers that disqualify a component from the fast render path.
// Viewport/container units require a leading digit so plain words like
// `view` / `vector` don't false-positive.
const RESPONSIVE_RE =
  /@(?:media|container|supports|scope|starting-style)\b|:(?:hover|focus|focus-visible|active|disabled)\b|\d(?:vw|vh|dvw|dvh|svw|svh|lvw|lvh|vmin|vmax|cqw|cqh|cqi|cqb|cqmin|cqmax)\b|light-dark\(|\benv\(|\0|&\[/i;

/**
 * Walk the rule literals and report whether any string segment contains a
 * marker that disqualifies the component from the fast render path. Function
 * interpolations are skipped; by contract they produce simple decls, not
 * @rules / pseudo states / responsive values. Violations of that contract
 * are surfaced via a dev-mode warning on first compile (see
 * `verifyFastContract`).
 */
function sourceContainsResponsiveFeatures(rules: ReadonlyArray<unknown>): boolean {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (typeof r === 'string') {
      if (RESPONSIVE_RE.test(r)) return true;
    } else if (Array.isArray(r)) {
      if (sourceContainsResponsiveFeatures(r)) return true;
    }
  }
  return false;
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

/**
 * Fast dynamic path for the common native template shape:
 *   ['color:', props => props.$color, ';']
 *
 * Function interpolations still run once per compile call, but when every
 * function returns the same string as last time we can return the cached
 * compiled object without rebuilding the full CSS string. More complex rule
 * outputs fall back to `flatten()`, preserving object/array/keyframe behavior.
 */
function tryFlattenDynamicStringRules<Props extends object>(
  rules: RuleSet<Props>,
  executionContext: ExecutionContext & Props,
  previousOutputs: string[] | null
): DynamicStringRulesResult | null {
  // `outputs` aliases `previousOutputs` while we're matching its prefix and
  // hasn't been forked. As soon as a function returns something different from
  // the previous render, materialize a fresh slice and continue building from
  // there. Avoids allocating any array when every output matches.
  let outputs: string[] = previousOutputs === null ? [] : previousOutputs;
  let forked = previousOutputs === null;
  let outputIndex = 0;

  for (let i = 0; i < rules.length; i++) {
    const partRule = rules[i];
    if (typeof partRule === 'string' || !partRule) continue;

    if (isStatelessFunction(partRule)) {
      const fnResult = (partRule as (ctx: ExecutionContext & Props) => unknown)(executionContext);
      let output: string;
      if (typeof fnResult === 'string') {
        output = fnResult;
      } else if (fnResult === undefined || fnResult === null || fnResult === false) {
        output = '';
      } else {
        return null;
      }
      if (!forked) {
        if (outputs[outputIndex] === output) {
          outputIndex++;
          continue;
        }
        outputs = outputs.slice(0, outputIndex);
        forked = true;
      }
      outputs.push(output);
      outputIndex++;
      continue;
    }

    if (Array.isArray(partRule) && isAllStaticStrings(partRule)) continue;
    return null;
  }

  if (!forked && outputIndex === outputs.length) {
    return { css: '', outputs, unchanged: true };
  }

  let css = '';
  outputIndex = 0;
  for (let i = 0; i < rules.length; i++) {
    const partRule = rules[i];
    if (typeof partRule === 'string') {
      css += partRule;
    } else if (isStatelessFunction(partRule)) {
      css += outputs[outputIndex++];
    } else if (Array.isArray(partRule)) {
      css += joinStringRules(partRule);
    }
  }
  return { css, outputs, unchanged: false };
}
