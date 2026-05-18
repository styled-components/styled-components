import { Dict } from '../../types';
import { getSystemColorPlatformColor } from './polyfills/systemColors';
import { cssColorRawToRnStyleValue, isSingleTokenColorArg } from './shorthandHelpers';

/** Mirrors RN `parseDropShadowString` arg splitting. */
const WHITESPACE_SPLIT_REGEX = /\s+(?![^(]*\))/;

/** Same function-scan regex as RN `processFilter` for string input. */
const FILTER_FN_REGEX = /([\w-]+)\(([^()]*|\([^()]*\)|[^()]*\([^()]*\)[^()]*)\)/g;

function camelizeFilterName(filterName: string): string {
  if (filterName === 'hue-rotate') return 'hueRotate';
  return filterName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Port of RN `processFilter` `_getFilterAmount` for supported scalar filters. */
function parseFilterScalarAmount(filterName: string, filterArgs: string): number | null {
  const trimmed = filterArgs.trim();
  const argsWithUnitsRegex = /([+-]?\d*(\.\d+)?)([a-zA-Z%]+)?/g;
  const match = argsWithUnitsRegex.exec(trimmed);
  if (!match || Number.isNaN(Number(match[1]))) return null;

  let filterArgAsNumber = Number(match[1]);
  const unit = match[3];

  switch (filterName) {
    case 'hueRotate':
      if (filterArgAsNumber === 0) return 0;
      if (unit !== 'deg' && unit !== 'rad') return null;
      return unit === 'rad' ? (180 * filterArgAsNumber) / Math.PI : filterArgAsNumber;
    case 'blur':
      if ((unit && unit !== 'px') || filterArgAsNumber < 0) return null;
      return filterArgAsNumber;
    case 'brightness':
    case 'contrast':
    case 'grayscale':
    case 'invert':
    case 'opacity':
    case 'saturate':
    case 'sepia':
      if ((unit && unit !== '%' && unit !== 'px') || filterArgAsNumber < 0) return null;
      if (unit === '%') filterArgAsNumber /= 100;
      return filterArgAsNumber;
    default:
      return null;
  }
}

/**
 * Same ordering as RN `parseDropShadowString`, but colors use
 * {@link isSingleTokenColorArg} so CSS system keywords parse as `<color>`.
 */
function parseDropShadowInner(inner: string): { layer: Dict<any>; hadSystemColor: boolean } | null {
  const dropShadow: Dict<any> = {};
  let offsetX: string | undefined;
  let offsetY: string | undefined;
  let keywordDetectedAfterLength = false;
  let lengthCount = 0;
  let hadSystemColor = false;

  const args = inner.trim().split(WHITESPACE_SPLIT_REGEX).filter(Boolean);

  for (const arg of args) {
    if (isSingleTokenColorArg(arg)) {
      if (dropShadow.color !== undefined) return null;
      if (offsetX !== undefined) keywordDetectedAfterLength = true;
      if (getSystemColorPlatformColor(arg) !== null) hadSystemColor = true;
      dropShadow.color = cssColorRawToRnStyleValue(arg);
      continue;
    }
    switch (lengthCount) {
      case 0:
        offsetX = arg;
        lengthCount++;
        break;
      case 1:
        if (keywordDetectedAfterLength) return null;
        offsetY = arg;
        lengthCount++;
        break;
      case 2:
        if (keywordDetectedAfterLength) return null;
        dropShadow.standardDeviation = arg;
        lengthCount++;
        break;
      default:
        return null;
    }
  }

  if (offsetX === undefined || offsetY === undefined) return null;

  dropShadow.offsetX = offsetX;
  dropShadow.offsetY = offsetY;
  return { layer: dropShadow, hadSystemColor };
}

/**
 * RN `parseDropShadowString` rejects CSS system color keywords (same
 * `processColor` probe as `box-shadow`). When any `drop-shadow()` layer needs
 * folding, rewrite the whole `filter` string to RN's array form so sibling
 * functions stay composited.
 */
export function maybeExpandFilterDropShadowSystemColors(rawValue: string): string | Dict<any>[] {
  if (rawValue.indexOf('\0') !== -1) return rawValue;

  const normalized = rawValue.replace(/\n/g, ' ');
  FILTER_FN_REGEX.lastIndex = 0;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = FILTER_FN_REGEX.exec(normalized)) !== null) {
    matches.push(m);
  }
  if (matches.length === 0) return rawValue;

  let anySystem = false;
  const out: Dict<any>[] = [];

  for (let i = 0; i < matches.length; i++) {
    const filterName = matches[i][1].toLowerCase();
    const inner = matches[i][2].trim();

    if (filterName === 'drop-shadow') {
      const parsed = parseDropShadowInner(inner);
      if (parsed === null) return rawValue;
      if (parsed.hadSystemColor) anySystem = true;
      out.push({ dropShadow: parsed.layer });
    } else {
      const camel = camelizeFilterName(filterName);
      const amount = parseFilterScalarAmount(camel, inner);
      if (amount === null) return rawValue;
      out.push({ [camel]: amount });
    }
  }

  return anySystem ? out : rawValue;
}
