import type { Dict } from '../../types';
import type { Token } from '../transform/tokens';
import { TokenKind } from '../transform/tokens';
import type { EasingDescriptor, AnimationDescriptor, TransitionDescriptor } from './types';
import { parseEasing } from './css-keywords';

const DIRECTION_KEYWORDS = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse']);
const FILL_MODE_KEYWORDS = new Set(['none', 'forwards', 'backwards', 'both']);
const PLAY_STATE_KEYWORDS = new Set(['running', 'paused']);
const TIMING_KEYWORDS = new Set([
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);
const TRANSITION_BEHAVIOR_KEYWORDS = new Set(['normal', 'allow-discrete']);

function isCommaToken(t: Token): boolean {
  return t.kind === TokenKind.Comma;
}

/** Split tokens at top-level commas. Skips function-arg interiors (already grouped). */
function splitTopLevelCommas(tokens: Token[]): Token[][] {
  const out: Token[][] = [];
  let cur: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (isCommaToken(t)) {
      if (cur.length > 0) {
        out.push(cur);
        cur = [];
      }
    } else {
      cur.push(t);
    }
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

function isTimeToken(t: Token): boolean {
  return t.kind === TokenKind.Time;
}

function isEasingToken(t: Token): boolean {
  if (t.kind === TokenKind.Function) {
    const name = t.name;
    return name === 'cubic-bezier' || name === 'steps' || name === 'linear';
  }
  if (t.kind === TokenKind.Ident) {
    return TIMING_KEYWORDS.has(t.name!);
  }
  return false;
}

function tokenToEasing(t: Token): EasingDescriptor | null {
  if (t.kind === TokenKind.Ident) return parseEasing(t.name!);
  if (t.kind === TokenKind.Function) return parseEasing(t.raw);
  return null;
}

function tokenToMs(t: Token): number | null {
  if (t.kind === TokenKind.Time) {
    const v = t.value!;
    return t.unit === 's' ? v * 1000 : v;
  }
  if (t.kind === TokenKind.Number) return t.value!;
  return null;
}

/**
 * Parse a single `<single-animation>` token sequence into a partial
 * AnimationDescriptor. Spec disambiguation (CSS Animations L1 §3.10):
 * - The first parseable `<time>` is duration; the second is delay.
 * - Keywords valid for non-name longhands take precedence over name.
 *
 * Returns the partial; missing fields fall back to spec defaults at
 * the L1 longhand-collection layer (the caller fills them in).
 */
function parseSingleAnimation(tokens: Token[]): Partial<AnimationDescriptor> | null {
  const out: Partial<AnimationDescriptor> = {};
  let timeIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (isTimeToken(t)) {
      const ms = tokenToMs(t)!;
      if (timeIndex === 0) {
        out.durationMs = ms;
        timeIndex = 1;
      } else if (timeIndex === 1) {
        out.delayMs = ms;
        timeIndex = 2;
      } else {
        return null; // more than two times = malformed
      }
      continue;
    }
    if (isEasingToken(t)) {
      const easing = tokenToEasing(t);
      if (easing === null) return null;
      out.timingFunction = easing;
      continue;
    }
    if (t.kind === TokenKind.Number) {
      // Iteration count.
      out.iterationCount = t.value!;
      continue;
    }
    if (t.kind === TokenKind.Function && t.name === 'calc') {
      // calc() in the animation shorthand only makes sense for the
      // iteration-count slot (per Values 4 §10.7.2 `infinity`). Other
      // numeric slots in the shorthand (`<time>`) carry units that
      // can't survive a calc → number reduction here without context.
      const iter = calcToIterationCount(t.args || '');
      if (iter === null) return null;
      out.iterationCount = iter;
      continue;
    }
    if (t.kind === TokenKind.Ident) {
      const name = t.name!;
      if (name === 'infinite' || name === 'infinity') {
        // CSS3 keyword + Values 4 §10.7.2 numeric constant. Both map to
        // JS Infinity for the iteration-count slot.
        out.iterationCount = Infinity;
        continue;
      }
      if (DIRECTION_KEYWORDS.has(name)) {
        out.direction = name as AnimationDescriptor['direction'];
        continue;
      }
      if (FILL_MODE_KEYWORDS.has(name)) {
        out.fillMode = name as AnimationDescriptor['fillMode'];
        continue;
      }
      if (PLAY_STATE_KEYWORDS.has(name)) {
        out.playState = name as AnimationDescriptor['playState'];
        continue;
      }
      // Otherwise it's the animation name (or `none`).
      if (out.name === undefined) {
        out.name = t.raw;
        continue;
      }
      return null; // duplicate name = malformed
    }
    return null; // unknown token shape
  }
  return out;
}

const DEFAULT_ANIMATION: AnimationDescriptor = {
  name: 'none',
  durationMs: 0,
  timingFunction: { kind: 'cubic-bezier', p: [0.25, 0.1, 0.25, 1] }, // CSS `ease`
  delayMs: 0,
  iterationCount: 1,
  direction: 'normal',
  fillMode: 'none',
  playState: 'running',
  composition: 'replace',
};

/**
 * `animation` shorthand handler. Parses one or more `<single-animation>`
 * comma-separated entries. Output keys:
 *   - `animationName`: string | string[]
 *   - `animationDuration`: number | number[]   (ms)
 *   - `animationTimingFunction`: EasingDescriptor | EasingDescriptor[]
 *   - `animationDelay`: number | number[]      (ms; can be negative)
 *   - `animationIterationCount`: number | number[]  (Infinity for `infinite`)
 *   - `animationDirection`: string | string[]
 *   - `animationFillMode`: string | string[]
 *   - `animationPlayState`: string | string[]
 *
 * Single-animation form emits primitives; multi-animation form emits
 * arrays. The render path branches on `Array.isArray()`.
 */
export function animationShorthand(tokens: Token[]): Dict<any> | null {
  return shorthand(tokens, parseSingleAnimation, ANIMATION_LONGHAND_MAPPING, DEFAULT_ANIMATION);
}

/**
 * Per-longhand mapping: `[outputKey, descriptorField]`. Drives the
 * generic `shorthand` materializer below; the descriptor's defaults
 * fill any missing fields.
 */
const ANIMATION_LONGHAND_MAPPING: ReadonlyArray<[string, keyof AnimationDescriptor]> = [
  ['animationName', 'name'],
  ['animationDuration', 'durationMs'],
  ['animationTimingFunction', 'timingFunction'],
  ['animationDelay', 'delayMs'],
  ['animationIterationCount', 'iterationCount'],
  ['animationDirection', 'direction'],
  ['animationFillMode', 'fillMode'],
  ['animationPlayState', 'playState'],
];

/**
 * Generic shorthand materializer: parses each comma group into a
 * partial descriptor, then fans the parsed values out into the longhand
 * keys. Single-group input emits scalar values; multi-group emits
 * arrays. Returns `null` on any unparseable group.
 */
function shorthand<T>(
  tokens: Token[],
  parseOne: (g: Token[]) => Partial<T> | null,
  mapping: ReadonlyArray<[string, keyof T]>,
  defaults: T
): Dict<any> | null {
  const groups = splitTopLevelCommas(tokens);
  if (groups.length === 0) return null;
  const parsed: Partial<T>[] = [];
  for (let i = 0; i < groups.length; i++) {
    const single = parseOne(groups[i]);
    if (single === null) return null;
    parsed.push(single);
  }
  const out: Dict<any> = {};
  const single = parsed.length === 1;
  for (let i = 0; i < mapping.length; i++) {
    const [key, field] = mapping[i];
    if (single) {
      out[key] = parsed[0][field] ?? defaults[field];
    } else {
      const arr = new Array(parsed.length);
      for (let j = 0; j < parsed.length; j++) arr[j] = parsed[j][field] ?? defaults[field];
      out[key] = arr;
    }
  }
  return out;
}

const DEFAULT_TRANSITION: TransitionDescriptor = {
  property: 'all',
  durationMs: 0,
  timingFunction: { kind: 'cubic-bezier', p: [0.25, 0.1, 0.25, 1] }, // CSS `ease`
  delayMs: 0,
  behavior: 'normal',
};

function parseSingleTransition(tokens: Token[]): Partial<TransitionDescriptor> | null {
  const out: Partial<TransitionDescriptor> = {};
  let timeIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (isTimeToken(t)) {
      const ms = tokenToMs(t)!;
      if (timeIndex === 0) {
        out.durationMs = ms;
        timeIndex = 1;
      } else if (timeIndex === 1) {
        out.delayMs = ms;
        timeIndex = 2;
      } else {
        return null;
      }
      continue;
    }
    if (isEasingToken(t)) {
      const easing = tokenToEasing(t);
      if (easing === null) return null;
      out.timingFunction = easing;
      continue;
    }
    if (t.kind === TokenKind.Ident) {
      const name = t.name!;
      if (TRANSITION_BEHAVIOR_KEYWORDS.has(name)) {
        out.behavior = name as TransitionDescriptor['behavior'];
        continue;
      }
      // First non-keyword ident is the property (`all`, `none`, or longhand).
      if (out.property === undefined) {
        out.property = t.raw;
        continue;
      }
      return null;
    }
    return null;
  }
  return out;
}

/**
 * `transition` shorthand handler. Parses one or more
 * `<single-transition>` comma-separated entries.
 *
 * Output keys: `transitionProperty | transitionDuration |
 * transitionTimingFunction | transitionDelay | transitionBehavior`.
 */
export function transitionShorthand(tokens: Token[]): Dict<any> | null {
  return shorthand(tokens, parseSingleTransition, TRANSITION_LONGHAND_MAPPING, DEFAULT_TRANSITION);
}

const TRANSITION_LONGHAND_MAPPING: ReadonlyArray<[string, keyof TransitionDescriptor]> = [
  ['transitionProperty', 'property'],
  ['transitionDuration', 'durationMs'],
  ['transitionTimingFunction', 'timingFunction'],
  ['transitionDelay', 'delayMs'],
  ['transitionBehavior', 'behavior'],
];

// Longhand handlers;for users who write the longhand directly
// (e.g. `animation-name: pulse`). Each delegates to the generic
// `listLonghand` with a per-token validator/extractor.

export function animationNameLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationName', t =>
    t.kind === TokenKind.Ident || t.kind === TokenKind.String ? t.raw : null
  );
}

export function animationDurationLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationDuration', tokenToMs);
}

export function animationDelayLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationDelay', tokenToMs);
}

export function animationTimingFunctionLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationTimingFunction', tokenToEasing);
}

// Positive `infinity` from CSS Values 4 §10.7.2 inside a calc() body
// maps to JS Infinity for the iteration-count slot. The boundary class
// `[^\w-]` excludes `-`, so `-infinity` doesn't match (and `NaN` of
// course doesn't either);both fall through to the null path.
const CALC_HAS_INFINITY_RE = /(?:^|[^\w-])infinity(?:[^\w-]|$)/i;

function calcToIterationCount(args: string): number | null {
  return CALC_HAS_INFINITY_RE.test(args) ? Infinity : null;
}

export function animationIterationCountLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationIterationCount', t => {
    if (t.kind === TokenKind.Number) return t.value!;
    if (t.kind === TokenKind.Ident) {
      // `infinite` is the CSS3 keyword form; `infinity` is the
      // CSS Values 4 §10.7.2 numeric constant. Both map to JS Infinity
      // so the downstream animation engine can drive an unbounded loop.
      if (t.name === 'infinite' || t.name === 'infinity') return Infinity;
    }
    if (t.kind === TokenKind.Function && t.name === 'calc') {
      return calcToIterationCount(t.args || '');
    }
    return null;
  });
}

export function animationDirectionLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationDirection', enumValidator(DIRECTION_KEYWORDS));
}

export function animationFillModeLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationFillMode', enumValidator(FILL_MODE_KEYWORDS));
}

export function animationPlayStateLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'animationPlayState', enumValidator(PLAY_STATE_KEYWORDS));
}

export function transitionPropertyLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'transitionProperty', t =>
    t.kind === TokenKind.Ident ? t.raw : null
  );
}

export function transitionDurationLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'transitionDuration', tokenToMs);
}

export function transitionDelayLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'transitionDelay', tokenToMs);
}

export function transitionTimingFunctionLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'transitionTimingFunction', tokenToEasing);
}

export function transitionBehaviorLonghand(tokens: Token[]): Dict<any> | null {
  return listLonghand(tokens, 'transitionBehavior', enumValidator(TRANSITION_BEHAVIOR_KEYWORDS));
}

/**
 * Generic comma-separated longhand parser. Splits at top-level commas,
 * runs `parseOne` on each group's single token, and emits `{[key]:
 * scalar | array}` (scalar when the list has one entry). Any group
 * that's not exactly one token, or whose token doesn't validate,
 * fails the whole declaration.
 */
function listLonghand<T>(
  tokens: Token[],
  key: string,
  parseOne: (t: Token) => T | null
): Dict<any> | null {
  const groups = splitTopLevelCommas(tokens);
  const out: T[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.length !== 1) return null;
    const v = parseOne(g[0]);
    if (v === null) return null;
    out.push(v);
  }
  if (out.length === 0) return null;
  return { [key]: out.length === 1 ? out[0] : out };
}

function enumValidator(valid: Set<string>): (t: Token) => string | null {
  return t => {
    if (t.kind !== TokenKind.Ident) return null;
    return valid.has(t.name!) ? t.name! : null;
  };
}

/**
 * Set of camelCase animation+transition longhand keys. Used by the
 * compileNative extraction pass to lift these off the base style object
 * into the dedicated `animation` / `transition` fields.
 */
export const ANIMATION_LONGHAND_KEYS = new Set([
  'animationName',
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
]);

export const TRANSITION_LONGHAND_KEYS = new Set([
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
  'transitionBehavior',
]);
