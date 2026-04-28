import { Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';

/**
 * `linear()` easing; CSS animation timing function expressed as a
 * piecewise-linear curve. Captured here so the v7.1 animation adapter
 * can consume the resolved control points without re-parsing the CSS
 * value at render time.
 *
 * Stop forms accepted:
 *   <number>
 *   <number> <percent>
 *   <number> <percent> <percent>
 *
 * Multiple percents on a single value mean the same output value at
 * different progress times; flat steps in the interpolation.
 *
 * Stops without explicit input times are linearly distributed across
 * 0..1, with the first stop pinned to 0 and the last to 1 per the
 * CSS Easing Functions Level 2 spec.
 */

export interface LinearEasingStop {
  /** 0..1 progress. */
  t: number;
  /** Output value at that progress. */
  v: number;
}

export function parseLinearEasing(tok: Token): LinearEasingStop[] | null {
  if (tok.kind !== TokenKind.Function || tok.name !== 'linear') return null;
  const args = tokenizeFunctionArgs(tok);
  const stops: LinearEasingStop[] = [];
  let current: Token[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      const parsed = parseStop(current);
      if (parsed === null) return null;
      for (let j = 0; j < parsed.length; j++) stops.push(parsed[j]);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0) {
    const parsed = parseStop(current);
    if (parsed === null) return null;
    for (let j = 0; j < parsed.length; j++) stops.push(parsed[j]);
  }
  return stops.length > 0 ? distributeStops(stops) : null;
}

function parseStop(tokens: Token[]): LinearEasingStop[] | null {
  if (tokens.length === 0) return null;
  const first = tokens[0];
  if (first.kind !== TokenKind.Number) return null;
  const v = first.value!;
  const ts: number[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== TokenKind.Percent) return null;
    ts.push(t.value! / 100);
  }
  if (ts.length === 0) return [{ t: NaN, v }]; // distributeStops fills it in
  return ts.map(t => ({ t, v }));
}

/** Fill implicit input times: spread linearly over 0..1, monotonic. */
function distributeStops(stops: LinearEasingStop[]): LinearEasingStop[] {
  const out = stops.slice();
  if (Number.isNaN(out[0].t)) out[0] = { t: 0, v: out[0].v };
  if (Number.isNaN(out[out.length - 1].t)) {
    out[out.length - 1] = { t: 1, v: out[out.length - 1].v };
  }
  let lastExplicit = 0;
  for (let i = 0; i < out.length; i++) {
    if (!Number.isNaN(out[i].t) && out[i].t < lastExplicit) {
      out[i] = { t: lastExplicit, v: out[i].v };
    } else if (!Number.isNaN(out[i].t)) {
      lastExplicit = out[i].t;
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (Number.isNaN(out[i].t)) {
      let pi = i - 1;
      while (pi >= 0 && Number.isNaN(out[pi].t)) pi--;
      let ni = i + 1;
      while (ni < out.length && Number.isNaN(out[ni].t)) ni++;
      if (pi < 0 || ni >= out.length) continue;
      const steps = ni - pi;
      const span = out[ni].t - out[pi].t;
      const offset = i - pi;
      out[i] = { t: out[pi].t + (span * offset) / steps, v: out[i].v };
    }
  }
  return out;
}
