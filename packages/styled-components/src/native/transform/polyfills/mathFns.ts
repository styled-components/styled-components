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
  // CSS Values 4 §10.3 stepped-value functions.
  if (name === 'round' || name === 'mod' || name === 'rem') {
    return resolveStepped(name, fn, permitNonFinite);
  }
  // CSS Values 4 §10.4 trigonometric functions.
  if (
    name === 'sin' ||
    name === 'cos' ||
    name === 'tan' ||
    name === 'asin' ||
    name === 'acos' ||
    name === 'atan' ||
    name === 'atan2'
  ) {
    return resolveTrig(name, fn, permitNonFinite);
  }
  // CSS Values 4 §10.5 exponential functions.
  if (name === 'pow' || name === 'sqrt' || name === 'hypot' || name === 'log' || name === 'exp') {
    return resolveExpLog(name, fn, permitNonFinite);
  }
  // CSS Values 4 §10.6 sign-related functions.
  if (name === 'abs' || name === 'sign') {
    return resolveAbsSign(name, fn, permitNonFinite);
  }
  return null;
}

/**
 * CSS Values 4 §10.3 — stepped-value functions.
 *
 *   round(<rounding-strategy>?, A, B?)
 *   mod(A, B)   → sign of B (math mod; result has divisor's sign)
 *   rem(A, B)   → sign of A (remainder, like JS `%`)
 *
 * `round()` strategy keywords (Values 4 §10.3.1): `nearest` (default),
 * `up`, `down`, `to-zero`. B defaults to 1 when omitted.
 */
const ROUND_STRATEGIES = new Set(['nearest', 'up', 'down', 'to-zero']);

function resolveStepped(name: string, fn: Token, permitNonFinite: boolean): NumericResult | null {
  const operands = readCommaOperandsWithLeadingKeyword(fn, permitNonFinite);
  if (operands === null) return null;
  const { keyword, args } = operands;

  if (name === 'round') {
    if (keyword === 'line-width') {
      if (__DEV__) {
        warnOnce(
          'native-math-round-line-width',
          '`round(line-width, ...)` needs the device pixel ratio, which is not available while converting static styles. Use an explicit step such as `round(nearest, 10px, 1px)`, or calculate the value in a function interpolation with `PixelRatio.get()`.',
          fn.raw
        );
      }
      return null;
    }
    const strategy = keyword ?? 'nearest';
    if (!ROUND_STRATEGIES.has(strategy)) return null;
    if (args.length < 1 || args.length > 2) return null;
    const a = args[0];
    // CSS Values 4 §10.3: "If the type of A matches <number>, then B may
    // be omitted." For <length> / <angle> / <percent> A, B must be present
    // and share A's type. A mismatch between A and B is also invalid.
    let b: NumericResult;
    if (args.length === 2) {
      b = args[1];
      const aNum = a.unit === '';
      const bNum = b.unit === '';
      if (aNum !== bNum) return null;
      if (!aNum && !bNum && a.unit !== b.unit) return null;
    } else {
      if (a.unit !== '') return null;
      b = { value: 1, unit: '' };
    }
    const unit = a.unit || b.unit;
    if (b.value === 0) {
      if (!permitNonFinite) return null;
      return { value: NaN, unit };
    }
    let q: number;
    if (strategy === 'up') q = Math.ceil(a.value / b.value);
    else if (strategy === 'down') q = Math.floor(a.value / b.value);
    else if (strategy === 'to-zero') q = Math.trunc(a.value / b.value);
    else q = Math.round(a.value / b.value);
    return { value: q * b.value, unit };
  }

  if (keyword !== null) return null;
  if (args.length !== 2) return null;
  const [a, b] = args;
  if (a.unit !== '' && b.unit !== '' && a.unit !== b.unit) return null;
  const unit = a.unit || b.unit;
  if (b.value === 0) {
    if (!permitNonFinite) return null;
    return { value: NaN, unit };
  }
  if (name === 'mod') {
    // Math mod: ((a % b) + b) % b — result carries b's sign.
    const m = ((a.value % b.value) + b.value) % b.value;
    return { value: m, unit };
  }
  // rem: JS `%` — result carries a's sign.
  return { value: a.value % b.value, unit };
}

/**
 * CSS Values 4 §10.4 — trigonometric functions.
 *
 *   sin / cos / tan: `<angle> | <number>` (numbers in radians)
 *   asin / acos / atan: returns <angle> in degrees
 *   atan2(y, x): returns <angle>; arms must agree on type
 */
function resolveTrig(name: string, fn: Token, permitNonFinite: boolean): NumericResult | null {
  const operands = readCommaOperands(fn, permitNonFinite);
  if (operands === null) return null;

  if (name === 'sin' || name === 'cos' || name === 'tan') {
    if (operands.length !== 1) return null;
    const t = operands[0];
    // Angles arrive as `deg` (normalised by toNumeric); numbers as ''.
    let radians: number;
    if (t.unit === 'deg') radians = (t.value * Math.PI) / 180;
    else if (t.unit === '') radians = t.value;
    else return null;
    const v =
      name === 'sin' ? Math.sin(radians) : name === 'cos' ? Math.cos(radians) : Math.tan(radians);
    if (!permitNonFinite && !Number.isFinite(v)) return null;
    return { value: v, unit: '' };
  }

  if (name === 'asin' || name === 'acos' || name === 'atan') {
    if (operands.length !== 1) return null;
    const t = operands[0];
    if (t.unit !== '') return null;
    let radians: number;
    if (name === 'asin') {
      if (t.value < -1 || t.value > 1) {
        if (!permitNonFinite) return null;
        return { value: NaN, unit: 'deg' };
      }
      radians = Math.asin(t.value);
    } else if (name === 'acos') {
      if (t.value < -1 || t.value > 1) {
        if (!permitNonFinite) return null;
        return { value: NaN, unit: 'deg' };
      }
      radians = Math.acos(t.value);
    } else {
      radians = Math.atan(t.value);
    }
    return { value: (radians * 180) / Math.PI, unit: 'deg' };
  }

  // atan2
  if (operands.length !== 2) return null;
  const [y, x] = operands;
  if (y.unit !== x.unit) return null;
  const radians = Math.atan2(y.value, x.value);
  return { value: (radians * 180) / Math.PI, unit: 'deg' };
}

/**
 * CSS Values 4 §10.5 — exponential functions.
 *
 *   pow(base, exp), sqrt(A), hypot(A1, A2, ...), log(A, base?), exp(A)
 */
function resolveExpLog(name: string, fn: Token, permitNonFinite: boolean): NumericResult | null {
  const operands = readCommaOperands(fn, permitNonFinite);
  if (operands === null) return null;

  if (name === 'pow') {
    if (operands.length !== 2) return null;
    const [base, expo] = operands;
    if (base.unit !== '' || expo.unit !== '') return null;
    const v = Math.pow(base.value, expo.value);
    if (!permitNonFinite && !Number.isFinite(v)) return null;
    return { value: v, unit: '' };
  }

  if (name === 'sqrt') {
    if (operands.length !== 1) return null;
    const [a] = operands;
    if (a.unit !== '') return null;
    if (a.value < 0) {
      if (!permitNonFinite) return null;
      return { value: NaN, unit: '' };
    }
    return { value: Math.sqrt(a.value), unit: '' };
  }

  if (name === 'hypot') {
    if (operands.length === 0) return null;
    const unit = operands[0].unit;
    let sumSquares = 0;
    for (let i = 0; i < operands.length; i++) {
      if (operands[i].unit !== unit) return null;
      sumSquares += operands[i].value * operands[i].value;
    }
    return { value: Math.sqrt(sumSquares), unit };
  }

  if (name === 'log') {
    if (operands.length < 1 || operands.length > 2) return null;
    const [a, b] = operands;
    if (a.unit !== '' || (b !== undefined && b.unit !== '')) return null;
    if (a.value <= 0) {
      if (!permitNonFinite) return null;
      return { value: NaN, unit: '' };
    }
    const v = b === undefined ? Math.log(a.value) : Math.log(a.value) / Math.log(b.value);
    if (!permitNonFinite && !Number.isFinite(v)) return null;
    return { value: v, unit: '' };
  }

  // exp
  if (operands.length !== 1) return null;
  const [a] = operands;
  if (a.unit !== '') return null;
  return { value: Math.exp(a.value), unit: '' };
}

/**
 * CSS Values 4 §10.6 — sign-related functions.
 *
 *   abs(A)  preserves unit
 *   sign(A) returns -1 / 0 / 1, unit-stripped per spec (still a number
 *           even when A had a length unit)
 */
function resolveAbsSign(name: string, fn: Token, permitNonFinite: boolean): NumericResult | null {
  const operands = readCommaOperands(fn, permitNonFinite);
  if (operands === null || operands.length !== 1) return null;
  const [a] = operands;
  if (name === 'abs') return { value: Math.abs(a.value), unit: a.unit };
  const s = a.value > 0 ? 1 : a.value < 0 ? -1 : 0;
  return { value: s, unit: '' };
}

/**
 * Split a function's arg stream by top-level commas. Each comma-arm is
 * evaluated as an expression. Returns null if any arm fails.
 */
function readCommaOperands(fn: Token, permitNonFinite: boolean): NumericResult[] | null {
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
  return operands;
}

/**
 * Like {@link readCommaOperands} but also peels an optional leading
 * ident keyword (used by `round(<strategy>, A, B)`). The keyword arrives
 * BEFORE the first comma.
 */
function readCommaOperandsWithLeadingKeyword(
  fn: Token,
  permitNonFinite: boolean
): { keyword: string | null; args: NumericResult[] } | null {
  const args = tokenizeFunctionArgs(fn);
  let keyword: string | null = null;
  let start = 0;
  // Leading Ident before the first comma → strategy keyword.
  if (args.length > 0 && args[0].kind === TokenKind.Ident) {
    const second = args[1];
    if (second !== undefined && second.kind === TokenKind.Comma) {
      keyword = args[0].name ?? null;
      start = 2;
    }
  }
  const operands: NumericResult[] = [];
  let current: Token[] = [];
  for (let i = start; i < args.length; i++) {
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
  return { keyword, args: operands };
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
  if (__DEV__) {
    warnOnce(
      'native-math-keyword',
      `\`${raw}\` cannot be used as a React Native dimension. Use a finite value instead, such as a large px value or a viewport unit.`,
      raw
    );
  }
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
