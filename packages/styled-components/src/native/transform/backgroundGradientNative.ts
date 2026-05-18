import { splitTopLevelCommas } from '../../parser/parser';
import { Dict } from '../../types';
import { getSystemColorPlatformColor } from './polyfills/systemColors';
import { cssColorRawToRnStyleValue } from './shorthandHelpers';

const LINEAR_GRADIENT_DIRECTION_REGEX =
  /^to\s+(?:top|bottom|left|right)(?:\s+(?:top|bottom|left|right))?$/i;
const LINEAR_GRADIENT_ANGLE_UNIT_REGEX = /^([+-]?\d*\.?\d+)(deg|grad|rad|turn)$/i;

function getAngleInDegrees(angle: string): number | null {
  const match = angle.match(LINEAR_GRADIENT_ANGLE_UNIT_REGEX);
  if (!match) return null;
  const numericValue = parseFloat(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'deg':
      return numericValue;
    case 'grad':
      return numericValue * 0.9;
    case 'rad':
      return (numericValue * 180) / Math.PI;
    case 'turn':
      return numericValue * 360;
    default:
      return null;
  }
}

function directionKeywordToDirectionField(direction: string): string | null {
  const normalized = direction.replace(/\s+/g, ' ').toLowerCase();
  switch (normalized) {
    case 'to top':
      return '0deg';
    case 'to right':
      return '90deg';
    case 'to bottom':
      return '180deg';
    case 'to left':
      return '270deg';
    case 'to top right':
    case 'to right top':
      return 'to top right';
    case 'to bottom right':
    case 'to right bottom':
      return 'to bottom right';
    case 'to top left':
    case 'to left top':
      return 'to top left';
    case 'to bottom left':
    case 'to left bottom':
      return 'to bottom left';
    default:
      return null;
  }
}

function getPositionFromCSSValue(position: string): number | string | null {
  if (position.endsWith('px')) return parseFloat(position);
  if (position.endsWith('%')) return position;
  return null;
}

/**
 * RN `parseColorStopsCSSString`, but fold system colors via
 * {@link cssColorRawToRnStyleValue}.
 */
function parseColorStopsSystemColors(
  stopParts: string[]
): { stops: Dict<any>[]; hadSystemColor: boolean } | null {
  const colorStopsString = stopParts.join(',');
  const stops = colorStopsString.split(/,(?![^(]*\))/);
  let hadSystemColor = false;
  const out: Dict<any>[] = [];
  let prevStop: RegExpMatchArray | null = null;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const trimmedStop = stop.trim().toLowerCase();
    const colorStopParts = trimmedStop.match(/\S+\([^)]*\)|\S+/g);
    if (colorStopParts === null) return null;

    const fold = (colorTok: string): unknown => {
      if (getSystemColorPlatformColor(colorTok) !== null) hadSystemColor = true;
      return cssColorRawToRnStyleValue(colorTok);
    };

    if (colorStopParts.length === 3) {
      const colorTok = colorStopParts[0];
      const position1 = getPositionFromCSSValue(colorStopParts[1]);
      const position2 = getPositionFromCSSValue(colorStopParts[2]);
      if (position1 === null || position2 === null) return null;
      out.push({
        color: fold(colorTok),
        positions: [String(position1), String(position2)],
      });
    } else if (colorStopParts.length === 2) {
      const colorTok = colorStopParts[0];
      const position = getPositionFromCSSValue(colorStopParts[1]);
      if (position === null) return null;
      out.push({
        color: fold(colorTok),
        positions: [String(position)],
      });
    } else if (colorStopParts.length === 1) {
      const position = getPositionFromCSSValue(colorStopParts[0]);
      if (position !== null) {
        if (
          (prevStop !== null &&
            prevStop.length === 1 &&
            getPositionFromCSSValue(prevStop[0]) !== null) ||
          i === stops.length - 1 ||
          i === 0
        ) {
          return null;
        }
        out.push({
          color: null,
          positions: [String(position)],
        });
      } else {
        out.push({ color: fold(colorStopParts[0]) });
      }
    } else {
      return null;
    }
    prevStop = colorStopParts;
  }

  return { stops: out, hadSystemColor };
}

/** Inner `( … )` slice for `linear-gradient(...)`. */
function linearGradientInner(trimmedLayer: string): string | null {
  const head = 'linear-gradient(';
  const lc = trimmedLayer.toLowerCase();
  if (!lc.startsWith(head)) return null;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < trimmedLayer.length; i++) {
    const ch = trimmedLayer[i];
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && start !== -1) {
        return trimmedLayer.slice(start, i);
      }
    }
  }
  return null;
}

function parseLinearGradientLayer(
  trimmedLayer: string
): { obj: Dict<any>; hadSystemColor: boolean } | null {
  const inner = linearGradientInner(trimmedLayer.trim());
  if (inner === null) return null;

  const parts = splitTopLevelCommas(inner.trim(), false).map(p => p.trim());
  if (parts.length === 0) return null;

  let direction: string | undefined;
  let rest = parts;
  const head = parts[0].trim().toLowerCase();

  if (LINEAR_GRADIENT_ANGLE_UNIT_REGEX.test(head)) {
    const angleDeg = getAngleInDegrees(parts[0].trim());
    if (angleDeg === null) return null;
    direction = `${angleDeg}deg`;
    rest = parts.slice(1);
  } else if (LINEAR_GRADIENT_DIRECTION_REGEX.test(head)) {
    const dk = directionKeywordToDirectionField(parts[0].trim());
    if (dk === null) return null;
    direction = dk;
    rest = parts.slice(1);
  }

  const parsedStops = parseColorStopsSystemColors(rest);
  if (parsedStops === null) return null;

  const obj: Dict<any> = {
    type: 'linear-gradient',
    colorStops: parsedStops.stops,
  };
  if (direction !== undefined) obj.direction = direction;

  return { obj, hadSystemColor: parsedStops.hadSystemColor };
}

/**
 * When `linear-gradient()` stops use CSS system color keywords, RN's string parser
 * rejects them (`processColor`). Emit structured gradient objects for the array path.
 * **Linear gradients only**; `radial-gradient()` passes through unchanged.
 */
export function maybeExpandBackgroundImageSystemColors(rawValue: string): string | Dict<any>[] {
  if (__NATIVE_WEB__) return rawValue;
  if (rawValue.indexOf('\0') !== -1) return rawValue;

  const normalized = rawValue.replace(/\n/g, ' ');
  if (normalized.toLowerCase().includes('radial-gradient')) return rawValue;

  const layers = splitTopLevelCommas(normalized, true).filter(Boolean);
  if (layers.length === 0) return rawValue;

  let anySystem = false;
  const out: Dict<any>[] = [];

  for (let i = 0; i < layers.length; i++) {
    const parsed = parseLinearGradientLayer(layers[i].trim());
    if (parsed === null) return rawValue;
    if (parsed.hadSystemColor) anySystem = true;
    out.push(parsed.obj);
  }

  return anySystem ? out : rawValue;
}
