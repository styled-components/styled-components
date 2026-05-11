import { warnOnce } from '../dev';
import { opToken, Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';

/**
 * Compile-time resolution for `min()` / `max()` / `clamp()` / `calc()`
 * when every argument resolves to a static numeric.
 *
 * Resolves to a {@link NumericResult} that the decl-transform layer
 * emits as a bare number (for unitless props) or `"Npx"` string.
 * Returns `null` if any sub-expression contains viewport / container
 * units / var() / un-evaluable tokens; the caller then emits a
 * runtime resolver or passes through the original source.
 *
 * `permitNonFinite` (default `false`) controls handling of CSS math
 * keywords `infinity` / `-infinity` / `NaN` (Values 4 §10.7). RN can't
 * represent these in dimensions, so the dimension callers leave it
 * `false`: the resolver warns and returns null. The color polyfill
 * passes `true`: channels clamp to valid range, so propagating ±∞ / NaN
 * is fine (and matches browser behaviour for `rgb(calc(infinity) …)`).
 */
export interface NumericResult {
  value: number;
  /** Canonical unit; `'px'` / `'%'` / `''` for bare number. */
  unit: string;
}

export function resolveStaticMathFunction(
  fn: Token,
  permitNonFinite = false
): NumericResult | null {
  if (fn.kind !== TokenKind.Function) return null;
  const name = fn.name || '';
  if (name === 'calc') return resolveCalc(fn, permitNonFinite);
  if (name === 'min' || name === 'max' || name === 'clamp') {
    return resolveMinMaxClamp(name, fn, permitNonFinite);
  }
  return null;
}

function resolveMinMaxClamp(
  name: string,
  fn: Token,
  permitNonFinite: boolean
): NumericResult | null {
  const args = tokenizeFunctionArgs(fn);
  const operands: NumericResult[] = [];
  let current: Token[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      const r = evalSequence(current, permitNonFinite);
      if (r === null) return null;
      operands.push(r);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0) {
    const r = evalSequence(current, permitNonFinite);
    if (r === null) return null;
    operands.push(r);
  }
  if (operands.length === 0) return null;

  // All operands must share a compatible unit (all 'px' or all 'px'/'' mix)
  const unit = unifyUnits(operands);
  if (unit === null) return null;

  if (name === 'min') {
    let m = operands[0].value;
    for (let i = 1; i < operands.length; i++) {
      if (operands[i].value < m) m = operands[i].value;
    }
    return { value: m, unit };
  }
  if (name === 'max') {
    let m = operands[0].value;
    for (let i = 1; i < operands.length; i++) {
      if (operands[i].value > m) m = operands[i].value;
    }
    return { value: m, unit };
  }
  if (name === 'clamp') {
    if (operands.length !== 3) return null;
    const [lo, val, hi] = operands;
    // Spec: clamp(MIN, VAL, MAX) === max(MIN, min(VAL, MAX)). MIN wins
    // when MIN > MAX. (Naïve `val<lo ? lo : val>hi ? hi : val` returns
    // the wrong answer for clamp(100, 200, 50): hits the val>hi branch
    // and returns 50 instead of MIN-wins 100.)
    const clamped = Math.max(lo.value, Math.min(val.value, hi.value));
    return { value: clamped, unit };
  }
  return null;
}

const SLASH_AS_OP_TOKEN: Token = opToken('/');

function resolveCalc(fn: Token, permitNonFinite: boolean): NumericResult | null {
  const args = tokenizeFunctionArgs(fn);
  return evalSequence(args, permitNonFinite);
}

/**
 * Evaluate a flat sequence of tokens like `10px + 20px - 5%` under CSS
 * arithmetic rules. Handles `+`, `-`, `*`, `/`. Precedence: `*` / `/`
 * over `+` / `-`.
 */
function evalSequence(tokens: Token[], permitNonFinite: boolean): NumericResult | null {
  // Remap standalone Slash tokens (which the tokenizer emits as a
  // separator) to `/` ops inside math-function context. Outside math
  // fns the Slash keeps its original role (e.g. `rgb(r g b / a)`).
  // Expand nested math-fn tokens first.
  const resolved: Array<Token | NumericResult> = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Slash) {
      resolved.push(SLASH_AS_OP_TOKEN);
      continue;
    }
    if (t.kind === TokenKind.Function) {
      const r = resolveStaticMathFunction(t, permitNonFinite);
      if (r === null) return null;
      resolved.push(r);
    } else {
      resolved.push(t);
    }
  }

  // Pass 0: fold unary + / -. A `+` / `-` op is unary when it's the
  // first token or sits between two other ops. `-infinity` /
  // `-1.5 * 2` / `5 + -3` all reach evalSequence as `[Op, value, …]`
  // because the tokenizer emits a leading `-` as its own Op token.
  for (let i = 0; i < resolved.length; i++) {
    const t = resolved[i];
    if (!('kind' in t)) continue;
    if (t.kind !== TokenKind.Op) continue;
    if (t.op !== '+' && t.op !== '-') continue;
    const prev = i > 0 ? resolved[i - 1] : null;
    const isUnary = !prev || ('kind' in prev && prev.kind === TokenKind.Op);
    if (!isUnary) continue;
    const next = resolved[i + 1];
    if (!next) return null;
    const operand = toNumeric(next, permitNonFinite);
    if (operand === null) return null;
    const v = t.op === '-' ? -operand.value : operand.value;
    resolved.splice(i, 2, { value: v, unit: operand.unit });
    // Stay at the same position to catch chained unary (e.g. `--5`).
    i--;
  }

  // Pass 1: `*` and `/`
  for (let i = 1; i < resolved.length - 1; ) {
    const opTok = resolved[i] as Token;
    if ('kind' in opTok && opTok.kind === TokenKind.Op && (opTok.op === '*' || opTok.op === '/')) {
      const a = toNumeric(resolved[i - 1], permitNonFinite);
      const b = toNumeric(resolved[i + 1], permitNonFinite);
      if (a === null || b === null) return null;
      const unit = opTok.op === '*' ? a.unit || b.unit : a.unit;
      const v = opTok.op === '*' ? a.value * b.value : a.value / b.value;
      if (!permitNonFinite && !Number.isFinite(v)) return null;
      resolved.splice(i - 1, 3, { value: v, unit });
      // Stay at same position to catch chained operations
    } else {
      i++;
    }
  }
  // Pass 2: `+` and `-`
  for (let i = 1; i < resolved.length - 1; ) {
    const opTok = resolved[i] as Token;
    if ('kind' in opTok && opTok.kind === TokenKind.Op && (opTok.op === '+' || opTok.op === '-')) {
      const a = toNumeric(resolved[i - 1], permitNonFinite);
      const b = toNumeric(resolved[i + 1], permitNonFinite);
      if (a === null || b === null) return null;
      // Spec §10.9: <number> + <length> is invalid (the unitless `0` in
      // `calc(0 + 5px)` is a <number>, not a "unitless 0 length"). Reject
      // when exactly one operand carries a unit.
      if ((a.unit === '') !== (b.unit === '')) return null;
      if (a.unit && b.unit && a.unit !== b.unit) return null;
      const v = opTok.op === '+' ? a.value + b.value : a.value - b.value;
      resolved.splice(i - 1, 3, { value: v, unit: a.unit || b.unit });
    } else {
      i++;
    }
  }
  if (resolved.length !== 1) return null;
  return toNumeric(resolved[0], permitNonFinite);
}

function toNumeric(
  t: Token | NumericResult | undefined,
  permitNonFinite: boolean
): NumericResult | null {
  if (!t) return null;
  if (!('kind' in t)) return t;
  if (t.kind === TokenKind.Number) return { value: t.value!, unit: '' };
  if (t.kind === TokenKind.Length) {
    if (t.unit === 'px' || t.unit === '') return { value: t.value!, unit: t.unit || '' };
    if (t.value === 0) return { value: 0, unit: '' };
    return null; // em/rem/vh/etc.; dynamic, caller defers
  }
  if (t.kind === TokenKind.Percent) return { value: t.value!, unit: '%' };
  if (t.kind === TokenKind.Angle) {
    // Normalise to degrees so `calc(20deg * 2)` resolves to a bare-number
    // degree value the lch/oklch hue channel can consume.
    const unit = t.unit || 'deg';
    let deg: number;
    if (unit === 'deg') deg = t.value!;
    else if (unit === 'rad') deg = (t.value! * 180) / Math.PI;
    else if (unit === 'grad') deg = t.value! * 0.9;
    else if (unit === 'turn') deg = t.value! * 360;
    else return null;
    return { value: deg, unit: 'deg' };
  }
  if (t.kind === TokenKind.Ident) return identToNumeric(t.name!, t.raw, permitNonFinite);
  return null;
}

/**
 * Resolve a CSS math-context identifier to a numeric value per Values 4
 * §10.7. `pi` / `e` are <number>s. `infinity` / `-infinity` / `NaN` are
 * valid in math contexts but RN dimensions can't represent them — for
 * dimension callers (default), we warnOnce and drop the declaration;
 * for color callers (`permitNonFinite = true`), we return the IEEE value
 * since channel clamping will handle ±∞ and `usedValue` collapses NaN.
 * Returns null for unrecognised idents.
 */
export function identToNumeric(
  nameLower: string,
  raw: string,
  permitNonFinite = false
): NumericResult | null {
  if (nameLower === 'pi') return { value: Math.PI, unit: '' };
  if (nameLower === 'e') return { value: Math.E, unit: '' };
  let nonFiniteValue: number | null = null;
  if (nameLower === 'infinity') nonFiniteValue = Infinity;
  else if (nameLower === '-infinity') nonFiniteValue = -Infinity;
  else if (nameLower === 'nan') nonFiniteValue = NaN;
  if (nonFiniteValue === null) return null;
  if (permitNonFinite) return { value: nonFiniteValue, unit: '' };
  warnOnce(
    'native-math-keyword',
    `\`${raw}\` is valid CSS but React Native cannot represent ±∞ or NaN in a dimension; the value would silently collapse to 0. Drop the keyword or pick a finite alternative (e.g. a large literal pixel value or a viewport unit).`,
    raw
  );
  return null;
}

export function unifyUnits(operands: NumericResult[]): string | null {
  let unit = '';
  for (let i = 0; i < operands.length; i++) {
    const u = operands[i].unit;
    if (u === '') continue;
    if (unit === '') unit = u;
    else if (unit !== u) return null;
  }
  return unit;
}

/**
 * Emit a NumericResult as a value the RN style layer accepts. Bare
 * numbers and px values become `number`; percentages become `"N%"`.
 */
export function numericResultToRn(r: NumericResult): number | string {
  if (r.unit === '' || r.unit === 'px') return r.value;
  if (r.unit === '%') return `${r.value}%`;
  return `${r.value}${r.unit}`;
}
