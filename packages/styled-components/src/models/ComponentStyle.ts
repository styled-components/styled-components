import { SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import type { AnyComponent } from '../types';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import generateName from '../utils/generateAlphabeticName';
import getComponentName from '../utils/getComponentName';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../utils/createWarnTooManyClasses';
import { hash, phash } from '../utils/hash';
import isKeyframes from '../utils/isKeyframes';
import isPlainObject from '../utils/isPlainObject';
import isStatelessFunction from '../utils/isStatelessFunction';
import { joinStringArray, joinStrings } from '../utils/joinStrings';

const SEED = hash(SC_VERSION);

const EMPTY_RULES: string[] = [];

/**
 * Upper bound on dynamicNameCache entries per ComponentStyle instance.
 * Without this cap, components with free-form string interpolations
 * (e.g. `color: ${p => p.$color}` where $color is unbounded user input)
 * leak memory for the lifetime of the component definition. Aligned to
 * the warnTooManyClasses dev threshold so the warning and the eviction
 * share a single source of truth: by the time you start dropping cache
 * entries, the dev warning has already told you why.
 */
const MAX_DYNAMIC_NAME_CACHE = TOO_MANY_CLASSES_LIMIT;

/** Per-level output of `generate()` — one entry per link in the inheritance chain. */
type GeneratedLevel = {
  componentId: string;
  name: string;
  rules: string[];
  /** True when this level's class name is not yet known to the sheet. */
  isNew: boolean;
};

export type GeneratedStyle = {
  /** Space-joined class name chain (base first, `this` last). */
  className: string;
  /** Inheritance chain output, base first, `this` last. */
  levels: GeneratedLevel[];
};

/**
 * ComponentStyle is all the CSS-specific stuff, not the React-specific stuff.
 */
export default class ComponentStyle {
  baseHash: number;
  baseStyle: ComponentStyle | null | undefined;
  componentId: string;
  rules: RuleSet<any>;
  dynamicNameCache: Map<string, string> | undefined;

  constructor(rules: RuleSet<any>, componentId: string, baseStyle?: ComponentStyle | undefined) {
    this.rules = rules;
    this.componentId = componentId;
    this.baseHash = phash(SEED, componentId);
    this.baseStyle = baseStyle;

    // NOTE: This registers the componentId, which ensures a consistent order
    // for this component's styles compared to others
    StyleSheet.registerId(componentId);
  }

  /**
   * Produce per-level compiled CSS without writing to the sheet. Walks the
   * inheritance chain so callers get the full chain's output in one pass.
   * Keyframe registrations still flow through the sheet via `flatten()` —
   * that coupling is orthogonal to component-style injection.
   */
  generate(
    executionContext: ExecutionContext,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): GeneratedStyle {
    const baseGenerated = this.baseStyle
      ? this.baseStyle.generate(executionContext, styleSheet, stylis)
      : null;

    let css = '';
    for (let i = 0; i < this.rules.length; i++) {
      const partRule = this.rules[i];

      if (typeof partRule === 'string') {
        css += partRule;
      } else if (partRule) {
        // Fast path: inline function call for the common case (interpolation
        // returning a string). Avoids flatten's type dispatch and array alloc.
        if (isStatelessFunction(partRule)) {
          const fnResult = partRule(executionContext);
          if (typeof fnResult === 'string') {
            css += fnResult;
          } else if (fnResult !== undefined && fnResult !== null && fnResult !== false) {
            if (
              process.env.NODE_ENV !== 'production' &&
              typeof fnResult === 'object' &&
              !Array.isArray(fnResult) &&
              !isKeyframes(fnResult) &&
              !isPlainObject(fnResult)
            ) {
              console.error(
                `${getComponentName(
                  partRule as AnyComponent
                )} is not a styled component and cannot be referred to via component selector. See https://styled-components.com/docs/advanced#referring-to-other-components for more details.`
              );
            }

            css += joinStringArray(
              flatten(fnResult, executionContext, styleSheet, stylis) as string[]
            );
          }
        } else {
          css += joinStringArray(
            flatten(partRule, executionContext, styleSheet, stylis) as string[]
          );
        }
      }
    }

    if (!css) {
      // Always return a fresh levels array so siblings don't share a mutable
      // reference through the baseStyle chain.
      return {
        className: baseGenerated ? baseGenerated.className : '',
        levels: baseGenerated ? baseGenerated.levels.slice() : [],
      };
    }

    // Cache css->name to skip phash+generateName for repeat CSS strings.
    // The CSS string fully determines the class name for a given component,
    // so a Map lookup replaces O(cssLen) hashing on cache hit.
    if (!this.dynamicNameCache) this.dynamicNameCache = new Map();
    const cacheKey = stylis.hash ? stylis.hash + css : css;
    let name = this.dynamicNameCache.get(cacheKey);
    if (!name) {
      name = generateName(phash(phash(this.baseHash, stylis.hash), css) >>> 0);
      if (this.dynamicNameCache.size >= MAX_DYNAMIC_NAME_CACHE) {
        const oldest = this.dynamicNameCache.keys().next().value;
        if (oldest !== undefined) this.dynamicNameCache.delete(oldest);
      }
      this.dynamicNameCache.set(cacheKey, name);
    }

    const isNew = !styleSheet.hasNameForId(this.componentId, name);
    const rules = isNew ? stylis(css, '.' + name, undefined, this.componentId) : EMPTY_RULES;

    const levels = baseGenerated ? baseGenerated.levels.slice() : [];
    levels.push({ componentId: this.componentId, name, rules, isNew });

    return {
      className: joinStrings(baseGenerated ? baseGenerated.className : '', name),
      levels,
    };
  }

  /** Commit a `GeneratedStyle` to the sheet, returning the joined class name. */
  inject(styleSheet: StyleSheet, generated: GeneratedStyle): string {
    const levels = generated.levels;
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (level.isNew) {
        styleSheet.insertRules(level.componentId, level.name, level.rules);
      }
    }
    return generated.className;
  }

  generateAndInjectStyles(
    executionContext: ExecutionContext,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): string {
    return this.inject(styleSheet, this.generate(executionContext, styleSheet, stylis));
  }
}
