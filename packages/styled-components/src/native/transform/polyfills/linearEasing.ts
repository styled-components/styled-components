import { Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';

export interface LinearEasingStop {
  t: number;
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
  // Grammar: `<number> && <percentage>{0,2}`; 3+ percents invalid.
  if (ts.length > 2) return null;
  if (ts.length === 0) return [{ t: NaN, v }];
  return ts.map(t => ({ t, v }));
}

function distributeStops(stops: LinearEasingStop[]): LinearEasingStop[] {
  const out = stops.slice();
  if (Number.isNaN(out[0].t)) out[0] = { t: 0, v: out[0].v };
  if (Number.isNaN(out[out.length - 1].t)) {
    out[out.length - 1] = { t: 1, v: out[out.length - 1].v };
  }
  // -Infinity so the first explicit input survives if negative
  // (extrapolation is allowed; running max bookkeeping otherwise).
  let lastExplicit = -Infinity;
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
