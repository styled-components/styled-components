import { resolveStaticMathFunction } from '../transform/polyfills/mathFns';
import { tokenize } from '../transform/tokenize';
import type { Token } from '../transform/tokens';
import { TokenKind } from '../transform/tokens';
import type { RangeBoundary, RangeOffset, TimelineRangeName } from './types';

const TIMELINE_RANGE_NAMES: ReadonlySet<string> = new Set([
  'cover',
  'contain',
  'entry',
  'exit',
  'entry-crossing',
  'exit-crossing',
  'scroll',
]);

/** CSS Values 4 absolute-length ratios; RN dp == CSS px so no DPR multiply. */
const ABS_UNIT_TO_PX: Record<string, number> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  pt: 96 / 72,
  pc: 16,
};

function offsetFromToken(rangeName: TimelineRangeName | null, t: Token): RangeOffset | null {
  if (t.kind === TokenKind.Percent) {
    return { rangeName, value: t.value!, unit: '%', calcRaw: null };
  }
  if (t.kind === TokenKind.Length) {
    const ratio = ABS_UNIT_TO_PX[t.unit!];
    if (ratio === undefined) return null;
    return { rangeName, value: t.value! * ratio, unit: 'px', calcRaw: null };
  }
  if (t.kind === TokenKind.Number && t.value === 0) {
    return { rangeName, value: 0, unit: 'px', calcRaw: null };
  }
  if (t.kind === TokenKind.Function) {
    const folded = resolveStaticMathFunction(t);
    if (folded !== null) {
      if (folded.unit === '%') return { rangeName, value: folded.value, unit: '%', calcRaw: null };
      const ratio = ABS_UNIT_TO_PX[folded.unit];
      if (ratio !== undefined) {
        return { rangeName, value: folded.value * ratio, unit: 'px', calcRaw: null };
      }
      return null;
    }
    // Mixed-unit math (the spec's own examples use percent+length calc)
    // needs the timeline extent; carry the raw source for resolve time.
    if (t.name === 'calc' || t.name === 'min' || t.name === 'max' || t.name === 'clamp') {
      return { rangeName, value: 0, unit: '%', calcRaw: t.raw };
    }
  }
  return null;
}

function isOffsetToken(t: Token): boolean {
  return (
    t.kind === TokenKind.Percent ||
    t.kind === TokenKind.Length ||
    t.kind === TokenKind.Function ||
    (t.kind === TokenKind.Number && t.value === 0)
  );
}

/**
 * Parse one range boundary starting at `tokens[i]`:
 *   normal | <length-percentage> | <timeline-range-name> <length-percentage>?
 * A bare range name defaults its offset to 0% (range-start) or 100%
 * (range-end). Returns the boundary plus the next unconsumed index, or
 * `null` when the tokens don't form a boundary.
 */
export function parseRangeBoundary(
  tokens: Token[],
  i: number,
  isStart: boolean
): [RangeBoundary, number] | null {
  const t = tokens[i];
  if (t === undefined) return null;
  if (t.kind === TokenKind.Ident) {
    const name = t.name!;
    if (name === 'normal') return ['normal', i + 1];
    if (!TIMELINE_RANGE_NAMES.has(name)) return null;
    const rangeName = name as TimelineRangeName;
    const next = tokens[i + 1];
    if (next !== undefined && isOffsetToken(next)) {
      const offset = offsetFromToken(rangeName, next);
      if (offset === null) return null;
      return [offset, i + 2];
    }
    return [{ rangeName, value: isStart ? 0 : 100, unit: '%', calcRaw: null }, i + 1];
  }
  if (isOffsetToken(t)) {
    const offset = offsetFromToken(null, t);
    if (offset === null) return null;
    return [offset, i + 1];
  }
  return null;
}

export interface NamedRangeRect {
  startPx: number;
  endPx: number;
}

const PERCENT_IN_CALC_RE = /(-?\d*\.?\d+)%/g;

/**
 * Resolve an attachment-range boundary to a fraction of its timeline.
 *
 * `timelineExtentPx` is the timeline's total scroll distance; `null`
 * while unknown (pre-measurement), which defers any px-bearing boundary.
 * `namedRanges` carries the view-timeline segments when the timeline
 * defines them; boundaries naming a range the timeline lacks resolve to
 * `null` (the engine then treats the animation as inactive, matching the
 * spec's "keyframes attached to points on that named timeline range are
 * ignored" posture for missing ranges).
 */
export function resolveRangeBoundary(
  boundary: RangeBoundary,
  isStart: boolean,
  timelineExtentPx: number | null,
  namedRanges: Partial<Record<TimelineRangeName, NamedRangeRect>> | null
): number | null {
  if (boundary === 'normal') return isStart ? 0 : 1;

  let segStartPx = 0;
  let segLenPx: number | null = timelineExtentPx;
  if (boundary.rangeName !== null) {
    const rect = namedRanges === null ? undefined : namedRanges[boundary.rangeName];
    if (rect === undefined) return null;
    segStartPx = rect.startPx;
    segLenPx = rect.endPx - rect.startPx;
  }

  if (boundary.calcRaw !== null) {
    if (segLenPx === null || timelineExtentPx === null) return null;
    const seg = segLenPx;
    const substituted = boundary.calcRaw.replace(
      PERCENT_IN_CALC_RE,
      (_, n: string) => `${(parseFloat(n) / 100) * seg}px`
    );
    const tok = tokenize(substituted)[0];
    const folded = tok === undefined ? null : resolveStaticMathFunction(tok);
    if (folded === null || (folded.unit !== 'px' && folded.unit !== '')) return null;
    return (segStartPx + folded.value) / timelineExtentPx;
  }

  if (boundary.unit === '%') {
    if (boundary.rangeName === null) return boundary.value / 100;
    if (segLenPx === null || timelineExtentPx === null || timelineExtentPx === 0) return null;
    return (segStartPx + (boundary.value / 100) * segLenPx) / timelineExtentPx;
  }

  // px offset measured from the segment start.
  if (timelineExtentPx === null || timelineExtentPx === 0) return null;
  return (segStartPx + boundary.value) / timelineExtentPx;
}
