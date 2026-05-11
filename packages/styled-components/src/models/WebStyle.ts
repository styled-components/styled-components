import { SC_VERSION } from '../constants';
import {
  buildHashCSS,
  buildInterpKey,
  evaluateForFastPath,
  FastPathFragment,
} from '../parser/compile';
import { getSource, Source, synthesizeSourceForRuleSet } from '../parser/source';
import StyleSheet from '../sheet';
import { Compiler, ExecutionContext, RuleSet } from '../types';
import generateName from '../utils/generateAlphabeticName';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../utils/createWarnTooManyClasses';
import { fifoSet } from '../utils/fifoMap';
import { hash, phash } from '../utils/hash';
import { joinStrings } from '../utils/joinStrings';
import { warnOnce } from '../utils/warnOnce';
import { flushKeyframes, type CompiledKeyframes } from './Keyframes';

const SEED = hash(SC_VERSION);

const EMPTY_RULES: string[] = [];
const EMPTY_KEYFRAMES: CompiledKeyframes[] = [];

/**
 * Per-cache upper bound. Free-form string interpolations would otherwise
 * leak for the component's lifetime. Shared with the
 * warn-too-many-classes threshold so the dev warning fires before
 * eviction starts.
 */
const MAX_DYNAMIC_NAME_CACHE = TOO_MANY_CLASSES_LIMIT;

/** Per-level output of `generate()`; one entry per link in the inheritance chain. */
type GeneratedLevel = {
  componentId: string;
  name: string;
  rules: string[];
  isNew: boolean;
};

export type GeneratedStyle = {
  /** Space-joined class name chain (base first, `this` last). */
  className: string;
  /** Inheritance chain output, base first, `this` last. */
  levels: GeneratedLevel[];
  /**
   * Compiled keyframes referenced via `${kf}` interpolation, including those
   * collected by base styles. Order is base-first → this-last so injection
   * preserves the v6 sheet-ordering invariant. Empty when no `${kf}` refs.
   */
  keyframes: CompiledKeyframes[];
};

/** CSS-side state for one styled component (parallel to the React-side `StyledComponent`). */
export default class WebStyle {
  baseHash: number;
  baseStyle: WebStyle | null | undefined;
  componentId: string;
  rules: RuleSet<any>;
  /** Interp-tuple → class name. Hit skips `buildHashCSS` entirely. */
  interpKeyCache: Map<string, string> | undefined;
  /** Joined-CSS → class name. Hit skips `phash + generateName`. */
  cssKeyCache: Map<string, string> | undefined;
  /** Lazy `getSource(rules)` cache; once read, future renders skip the WeakMap. */
  private resolvedSource: Source | null | undefined = undefined;
  /** Reused scratch buffer so warm renders don't allocate fresh `filled[]`. */
  private filledBuffer: string[] | undefined;
  /** Parallel fragment side-table; allocated lazily on first fragment-bearing render. */
  private fragmentsBuffer: (FastPathFragment | null)[] | undefined;
  /**
   * Pending keyframes collected during `evaluateForFastPath`. Reused across
   * renders; cleared at the top of `generate()`. Only allocated lazily when
   * the source actually carries `${kf}` interpolations.
   */
  private keyframesBuffer: CompiledKeyframes[] | undefined;

  constructor(rules: RuleSet<any>, componentId: string, baseStyle?: WebStyle | undefined) {
    this.rules = rules;
    this.componentId = componentId;
    this.baseHash = phash(SEED, componentId);
    this.baseStyle = baseStyle;
    StyleSheet.registerId(componentId);
  }

  /**
   * Produce per-level compiled CSS without writing to the sheet. Walks the
   * inheritance chain so callers get the full chain's output in one pass.
   */
  generate(
    executionContext: ExecutionContext,
    styleSheet: StyleSheet,
    compiler: Compiler
  ): GeneratedStyle {
    const baseGenerated = this.baseStyle
      ? this.baseStyle.generate(executionContext, styleSheet, compiler)
      : null;

    // Fast path: try the interp-tuple cache before any string work; fall
    // through to `buildHashCSS` + `generateName` on miss.
    if (this.resolvedSource === undefined) {
      let source = getSource(this.rules);
      if (source === undefined) {
        // Hand-built RuleSet (e.g. `css([...])` array literal): synthesize
        // the Source lazily on first render so construction stays cheap.
        if (synthesizeSourceForRuleSet(this.rules)) source = getSource(this.rules);
      }
      this.resolvedSource = source ?? null;
    }
    const source = this.resolvedSource;
    let css = '';
    let fastFilled: ReadonlyArray<string> | null = null;
    let name: string | undefined;
    let interpKey: string | undefined;

    let fastFragments: (FastPathFragment | null)[] | null = null;
    if (source !== null) {
      if (this.filledBuffer === undefined) {
        this.filledBuffer = new Array(source.interpolations.length);
      }
      if (this.fragmentsBuffer === undefined) {
        this.fragmentsBuffer = new Array(source.interpolations.length);
      }
      if (this.keyframesBuffer === undefined) {
        this.keyframesBuffer = [];
      } else {
        this.keyframesBuffer.length = 0;
      }
      const filled = evaluateForFastPath(
        source,
        executionContext,
        this.filledBuffer,
        compiler,
        this.fragmentsBuffer,
        this.keyframesBuffer
      );
      if (filled !== null) {
        fastFilled = filled;
        let hasFragments = false;
        for (let i = 0; i < this.fragmentsBuffer.length; i++) {
          if (this.fragmentsBuffer[i] !== null) {
            hasFragments = true;
            break;
          }
        }
        fastFragments = hasFragments ? this.fragmentsBuffer : null;
        interpKey = buildInterpKey(filled, fastFragments, compiler.hash);
        name = this.interpKeyCache && this.interpKeyCache.get(interpKey);
        if (name === undefined) {
          css = buildHashCSS(source.strings, filled, fastFragments);
        }
      }
    }

    if (name === undefined && fastFilled === null) {
      // Defensive: every constructor input path attaches a Source. A miss
      // here means a hand-built styles input bypassed `css()`; render no CSS.
      if (__DEV__) {
        warnOnce(
          'no-styles',
          'this component has no usable styles. Define styles with the css helper or a tagged template (e.g. styled.div`...`).',
          this.componentId
        );
      }
    }

    const localKf =
      this.keyframesBuffer && this.keyframesBuffer.length > 0 ? this.keyframesBuffer : null;
    const baseKf =
      baseGenerated && baseGenerated.keyframes.length > 0 ? baseGenerated.keyframes : null;
    let keyframes: CompiledKeyframes[];
    if (baseKf !== null) {
      keyframes = localKf !== null ? baseKf.concat(localKf) : baseKf.slice();
    } else if (localKf !== null) {
      keyframes = localKf.slice();
    } else {
      keyframes = EMPTY_KEYFRAMES;
    }

    if (name === undefined && !css) {
      // Fresh levels array so siblings don't share a mutable reference.
      return {
        className: baseGenerated ? baseGenerated.className : '',
        levels: baseGenerated ? baseGenerated.levels.slice() : [],
        keyframes,
      };
    }

    if (name === undefined) {
      // No-plugin path keys directly on `css` so V8's cached string hash
      // applies; with plugins prepend `compiler.hash` to disambiguate.
      if (!this.cssKeyCache) this.cssKeyCache = new Map();
      const cssKey = compiler.hash ? compiler.hash + css : css;
      name = this.cssKeyCache.get(cssKey);
      if (!name) {
        name = generateName(phash(phash(this.baseHash, compiler.hash), css) >>> 0);
        fifoSet(this.cssKeyCache, cssKey, name, MAX_DYNAMIC_NAME_CACHE);
      }
      if (interpKey !== undefined) {
        if (!this.interpKeyCache) this.interpKeyCache = new Map();
        fifoSet(this.interpKeyCache, interpKey, name, MAX_DYNAMIC_NAME_CACHE);
      }
    }

    const isNew = !styleSheet.hasNameForId(this.componentId, name);
    let rules: string[];
    if (!isNew) {
      rules = EMPTY_RULES;
    } else if (source !== null && fastFilled !== null) {
      const fast = compiler.emit(source, fastFilled, '.' + name, this.componentId, fastFragments);
      if (fast !== null) {
        rules = fast;
      } else {
        // AST-direct emit bailed (e.g. structural char in a substitution);
        // fall back to the string-input emit on the joined CSS.
        if (!css) css = buildHashCSS(source.strings, fastFilled, fastFragments);
        rules = compiler.compile(css, '.' + name, undefined, this.componentId);
      }
    } else {
      rules = compiler.compile(css, '.' + name, undefined, this.componentId);
    }

    const levels = baseGenerated ? baseGenerated.levels.slice() : [];
    levels.push({ componentId: this.componentId, name, rules, isNew });

    return {
      className: joinStrings(baseGenerated ? baseGenerated.className : '', name),
      levels,
      keyframes,
    };
  }

  inject(styleSheet: StyleSheet, generated: GeneratedStyle): string {
    // Keyframes first so they sort before the component CSS within their
    // (lower) group ID; group IDs were claimed at Keyframes construction time.
    flushKeyframes(styleSheet, generated.keyframes);
    const levels = generated.levels;
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (level.isNew) {
        styleSheet.insertRules(level.componentId, level.name, level.rules);
      }
    }
    return generated.className;
  }

  /** Compute the inheritance plan and write any new rules to the sheet in one call. */
  flush(executionContext: ExecutionContext, styleSheet: StyleSheet, compiler: Compiler): string {
    return this.inject(styleSheet, this.generate(executionContext, styleSheet, compiler));
  }
}
