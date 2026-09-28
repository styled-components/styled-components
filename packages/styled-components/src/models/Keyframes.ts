import { KEYFRAMES_ID_PREFIX } from '../constants';
import { evaluateForFastPath, FastPathFragment, hasAnyFragment } from '../parser/evaluate';
import { keyframesRule } from '../parser/parser';
import { parseFrameList, Source } from '../parser/source';
import { EMPTY_ARRAY } from '../utils/empties';
import StyleSheet from '../sheet';
import { groupForId } from '../sheet/GroupIDAllocator';
import { Compiler, Keyframes as KeyframesType } from '../types';
import styledError from '../utils/error';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { setToString } from '../utils/setToString';
import { mainCompiler } from './StyleSheetManager';

/**
 * Pure compile output for a keyframes interpolation. `id` is the
 * KEYFRAMES_ID_PREFIX-prefixed sheet group ID; `name` is the compiler-resolved
 * keyframes name (used as both the @keyframes identifier and the dedup key);
 * `rules` is the compiled CSS ready for `StyleSheet.insertRules`.
 */
export interface CompiledKeyframes {
  id: string;
  /** Keyframes values the frames name, each to be injected with this one. */
  keyframes?: CompiledKeyframes[] | undefined;
  name: string;
  rules: string[];
}

/** The part of a compiler that names and serializes keyframes. */
export type KeyframesCompiler = Pick<Compiler, 'emit' | 'hash'>;

/** The template a `keyframes` value reads its frames from. */
export interface KeyframesTemplate {
  interpolations: ReadonlyArray<unknown>;
  /** Whether `strings` is never mutated, so its parse is shared (a tagged template's strings). */
  shared: boolean;
  strings: ReadonlyArray<string>;
}

export default class Keyframes implements KeyframesType {
  readonly [KEYFRAMES_SYMBOL] = true as const;

  id: string;
  name: string;
  rules: string;

  /** Each compiler's {@link compile} result. */
  private readonly compiled = new WeakMap<KeyframesCompiler, CompiledKeyframes>();
  /** The frame list, parsed on the first {@link compile}. */
  private source: Source | null = null;
  private readonly template: KeyframesTemplate;

  /** `template` defaults to `rules` as a template of its own, holding no slot. */
  constructor(name: string, rules: string, template?: KeyframesTemplate) {
    this.name = name;
    this.id = KEYFRAMES_ID_PREFIX + name;
    this.rules = rules;
    this.template = template ?? { interpolations: EMPTY_ARRAY, shared: false, strings: [rules] };

    // Eagerly register the group so keyframes defined before components
    // get a lower group ID and appear before them in the stylesheet.
    // Uses groupForId directly (not StyleSheet.registerId) because
    // GroupIDAllocator is pure JS; safe for native builds.
    groupForId(this.id);

    setToString(this, () => {
      throw styledError(12, String(this.name));
    });
  }

  /**
   * Pure: produce the compiled CSS without touching any sheet. Callers carry
   * the result through their own generate→inject pipeline so the parser stays
   * side-effect-free. Memoized per compiler, so the result is shared and must
   * not be mutated.
   */
  compile(compiler: KeyframesCompiler = mainCompiler): CompiledKeyframes {
    let compiled = this.compiled.get(compiler);
    if (compiled === undefined) {
      compiled = this.compileWith(compiler);
      this.compiled.set(compiler, compiled);
    }
    return compiled;
  }

  /**
   * Fill the frame list and emit it as `@keyframes <name>`. There is no
   * render context: the template's functions were written as their source
   * text before it was read.
   */
  private compileWith(compiler: KeyframesCompiler): CompiledKeyframes {
    const name = this.getName(compiler);
    let source = this.source;
    if (source === null) {
      const template = this.template;
      source = parseFrameList(template.strings, template.interpolations, template.shared);
      this.source = source;
    }
    const n = source.interpolations.length;
    const rule: Source = { ...source, ast: [keyframesRule(name, source.ast, n > 0)] };
    if (n === 0) {
      return { id: this.id, name, rules: compiler.emit(rule, EMPTY_ARRAY, '', '', null) };
    }
    const fragments: (FastPathFragment | null)[] = [];
    const keyframes: CompiledKeyframes[] = [];
    const filled = evaluateForFastPath(
      source,
      undefined,
      undefined,
      compiler,
      fragments,
      keyframes
    );
    const rules = compiler.emit(rule, filled, '', '', hasAnyFragment(fragments) ? fragments : null);
    return keyframes.length > 0
      ? { id: this.id, keyframes, name, rules }
      : { id: this.id, name, rules };
  }

  getName(compiler: Pick<Compiler, 'hash'> = mainCompiler): string {
    return compiler.hash ? this.name + generateAlphabeticName(+compiler.hash >>> 0) : this.name;
  }
}

/**
 * Write a batch of compiled keyframes to the sheet. Idempotent via
 * `hasNameForId`. Shared by `WebStyle.inject` and `WebGlobalStyle.computeRules`
 * so both callers route through one bytecode path.
 */
export function flushKeyframes(styleSheet: StyleSheet, compiled: CompiledKeyframes[]): void {
  for (let i = 0; i < compiled.length; i++) {
    const kf = compiled[i];
    if (!styleSheet.hasNameForId(kf.id, kf.name)) {
      styleSheet.insertRules(kf.id, kf.name, kf.rules);
    }
  }
}
