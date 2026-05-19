import { splitTopLevelCommas } from '../../parser/parser';
import { Dict } from '../../types';
import { getSystemColorPlatformColor } from './polyfills/systemColors';
import { cssColorRawToRnStyleValue, isSingleTokenColorArg } from './shorthandHelpers';

/** Mirrors RN `processBoxShadow` string splitting (parenthesis-aware). */
const WHITESPACE_SPLIT_REGEX = /\s+(?![^(]*\))/;

/**
 * Parse one shadow layer using the same ordering rules as RN's
 * `parseBoxShadowString`, but classify colors with {@link isSingleTokenColorArg} so CSS
 * Color 4 system keywords count as `<color>` even though `processColor`
 * rejects them.
 */
function parseBoxShadowLayer(
  trimmed: string
): { layer: Dict<any>; hadSystemColor: boolean } | null {
  const boxShadow: Dict<any> = {};
  let offsetX: string | undefined;
  let offsetY: string | undefined;
  let keywordDetectedAfterLength = false;
  let lengthCount = 0;
  let hadSystemColor = false;

  const args = trimmed.split(WHITESPACE_SPLIT_REGEX).filter(Boolean);

  for (const arg of args) {
    if (isSingleTokenColorArg(arg)) {
      if (boxShadow.color !== undefined) return null;
      if (offsetX !== undefined) keywordDetectedAfterLength = true;
      if (getSystemColorPlatformColor(arg) !== null) hadSystemColor = true;
      boxShadow.color = cssColorRawToRnStyleValue(arg);
      continue;
    }
    if (arg === 'inset') {
      if (boxShadow.inset !== undefined) return null;
      if (offsetX !== undefined) keywordDetectedAfterLength = true;
      boxShadow.inset = true;
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
        boxShadow.blurRadius = arg;
        lengthCount++;
        break;
      case 3:
        if (keywordDetectedAfterLength) return null;
        boxShadow.spreadDistance = arg;
        lengthCount++;
        break;
      default:
        return null;
    }
  }

  if (offsetX === undefined || offsetY === undefined) return null;

  boxShadow.offsetX = offsetX;
  boxShadow.offsetY = offsetY;
  return { layer: boxShadow, hadSystemColor };
}

/**
 * When a CSS system color keyword appears in `box-shadow`, RN's string parser
 * cannot detect the color token (`processColor` rejects the keyword). Expand
 * to the object-array form so `color` can be a `PlatformColor`. Dynamic
 * theme sentinels skip rewriting.
 */
export function maybeExpandBoxShadowSystemColors(rawValue: string): string | Dict<any>[] {
  if (rawValue.indexOf('\0') !== -1) return rawValue;

  const normalized = rawValue.replace(/\n/g, ' ');
  const layerStrings = splitTopLevelCommas(normalized, true);
  if (layerStrings.length === 0) return rawValue;

  let anySystem = false;
  const layers: Dict<any>[] = [];

  for (let i = 0; i < layerStrings.length; i++) {
    const parsed = parseBoxShadowLayer(layerStrings[i].trim());
    if (parsed === null) return rawValue;
    if (parsed.hadSystemColor) anySystem = true;
    layers.push(parsed.layer);
  }

  return anySystem ? layers : rawValue;
}
