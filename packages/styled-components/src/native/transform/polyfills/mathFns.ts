import { opToken, Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';

/**
 * Compile-time resolution for `min()` / `max()` / `clamp()` / `calc()`
 * when every argument resolves to a static numeric.
 *
 * Resolves to a {@link NumericResult} that the decl-transform layer
 * emits as a bare number (for unitless props) or `"Npx"` string.
 * Returns `null` if any sub-expression contains viewport / container
 * units / var() / un-evaluable tokens — the caller then emits a
 * runtime resolver or passes through the original source.
 */
export interface NumericResult {
  value: number;
  /** Canonical unit — `'px'` / `'%'` / `''` for bare number. */
  unit: string;
}

export function resolveStaticMathFunction(fn: Token): NumericResult | null {
  if (fn.kind !== TokenKind.Function) return null;
  const name = fn.name || '';
  if (name === 'calc') return resolveCalc(fn);
  if (name === 'min' || name === 'max' || name === 'clamp') {
    return resolveMinMaxClamp(name, fn);
  }
  return null;
}

function resolveMinMaxClamp(name: string, fn: Token): NumericResult | null {
  const args = tokenizeFunctionArgs(fn);
  const operands: NumericResult[] = [];
  let current: Token[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      const r = evalSequence(current);
      if (r === null) return null;
      operands.push(r);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0) {
    const r = evalSequence(current);
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
    const clamped = val.value < lo.value ? lo.value : val.value > hi.value ? hi.value : val.value;
    return { value: clamped, unit };
  }
  return null;
}

const SLASH_AS_OP_TOKEN: Token = opToken('/');

function resolveCalc(fn: Token): NumericResult | null {
  const args = tokenizeFunctionArgs(fn);
  return evalSequence(args);
}

/**
 * Evaluate a flat sequence of tokens like `10px + 20px - 5%` under CSS
 * arithmetic rules. Handles `+`, `-`, `*`, `/`. Precedence: `*` / `/`
 * over `+` / `-`.
 */
function evalSequence(tokens: Token[]): NumericResult | null {
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
      const r = resolveStaticMathFunction(t);
      if (r === null) return null;
      resolved.push(r);
    } else {
      resolved.push(t);
    }
  }

  // Pass 1: `*` and `/`
  for (let i = 1; i < resolved.length - 1; ) {
    const opTok = resolved[i] as Token;
    if ('kind' in opTok && opTok.kind === TokenKind.Op && (opTok.op === '*' || opTok.op === '/')) {
      const a = toNumeric(resolved[i - 1]);
      const b = toNumeric(resolved[i + 1]);
      if (a === null || b === null) return null;
      const unit = opTok.op === '*' ? a.unit || b.unit : a.unit;
      const v = opTok.op === '*' ? a.value * b.value : a.value / b.value;
      if (!Number.isFinite(v)) return null;
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
      const a = toNumeric(resolved[i - 1]);
      const b = toNumeric(resolved[i + 1]);
      if (a === null || b === null) return null;
      if (a.unit && b.unit && a.unit !== b.unit) return null;
      const v = opTok.op === '+' ? a.value + b.value : a.value - b.value;
      resolved.splice(i - 1, 3, { value: v, unit: a.unit || b.unit });
    } else {
      i++;
    }
  }
  if (resolved.length !== 1) return null;
  return toNumeric(resolved[0]);
}

function toNumeric(t: Token | NumericResult | undefined): NumericResult | null {
  if (!t) return null;
  if (!('kind' in t)) return t;
  if (t.kind === TokenKind.Number) return { value: t.value!, unit: '' };
  if (t.kind === TokenKind.Length) {
    if (t.unit === 'px' || t.unit === '') return { value: t.value!, unit: t.unit || '' };
    if (t.value === 0) return { value: 0, unit: '' };
    return null; // em/rem/vh/etc. — dynamic, caller defers
  }
  if (t.kind === TokenKind.Percent) return { value: t.value!, unit: '%' };
  return null;
}

function unifyUnits(operands: NumericResult[]): string | null {
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
