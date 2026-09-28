import { KEYFRAMES_ID_PREFIX } from '../constants';
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
  name: string;
  rules: string[];
}

/** The part of a compiler that names and serializes keyframes. */
export type KeyframesCompiler = Pick<Compiler, 'compile' | 'hash'>;

export default class Keyframes implements KeyframesType {
  readonly [KEYFRAMES_SYMBOL] = true as const;

  id: string;
  name: string;
  rules: string;

  /** First compiler seen by {@link compile} and its result; nearly every app uses one. */
  private compiledBy: KeyframesCompiler | null = null;
  private compiled: CompiledKeyframes | null = null;
  /** Results for any further compilers, allocated when a second one appears. */
  private compiledByOthers: WeakMap<KeyframesCompiler, CompiledKeyframes> | null = null;

  constructor(name: string, rules: string) {
    this.name = name;
    this.id = KEYFRAMES_ID_PREFIX + name;
    this.rules = rules;

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
    if (compiler === this.compiledBy && this.compiled !== null) return this.compiled;
    if (this.compiledBy === null) {
      const compiled = this.compileWith(compiler);
      this.compiledBy = compiler;
      this.compiled = compiled;
      return compiled;
    }
    if (this.compiledByOthers === null) this.compiledByOthers = new WeakMap();
    let compiled = this.compiledByOthers.get(compiler);
    if (compiled === undefined) {
      compiled = this.compileWith(compiler);
      this.compiledByOthers.set(compiler, compiled);
    }
    return compiled;
  }

  private compileWith(compiler: KeyframesCompiler): CompiledKeyframes {
    const name = this.getName(compiler);
    const rules = compiler.compile(this.rules, name, '@keyframes');
    return { id: this.id, name, rules };
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
