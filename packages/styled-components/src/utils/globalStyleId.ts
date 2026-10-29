import generateComponentId from './generateComponentId';
import isFunction from './isFunction';
import isKeyframes from './isKeyframes';
import isStyledComponent from './isStyledComponent';

/**
 * How many times this process has already issued an id for one serialization
 * that contains a function. The count is part of later ids, so it has to
 * live as long as the page: a repeat call must keep hashing to the same
 * string.
 */
const issuedBySerialization = new Map<string, number>();

/**
 * Id for one `createGlobalStyle` call.
 *
 * Rules with no function hash to the JSON of those rules, so the same static
 * text shares one stylesheet group no matter which module ran first. A
 * styled component or a keyframes value keeps its identity in that JSON, so
 * two copies of the same selector still share an id.
 *
 * `JSON.stringify` omits functions. Two calls whose remaining text matches
 * would share one group, and rendering one would drop the other's CSS. The
 * first time a serialization that contains a function is seen, the id is
 * the plain hash, the same id a single dynamic global already has, so a
 * server render and the client hydration of that global still agree. Each
 * later call mixes in how many times that serialization was already issued.
 */
export function globalStyleComponentId(rules: readonly unknown[]): string {
  const serialized = JSON.stringify(rules);
  if (!containsFunction(rules, new Set())) {
    return componentId(serialized);
  }

  const issued = issuedBySerialization.get(serialized) ?? 0;
  issuedBySerialization.set(serialized, issued + 1);
  // JSON text has no raw NUL, so a counted serialization cannot equal
  // another call's plain JSON.
  return componentId(issued === 0 ? serialized : `${serialized}\0${issued}`);
}

/** Clears the function-body counts. Tests call this between cases. */
export function resetGlobalStyleComponentIds(): void {
  issuedBySerialization.clear();
}

function componentId(serialized: string): string {
  return `sc-global-${generateComponentId(serialized)}`;
}

/**
 * True when `JSON.stringify` would drop a function and the remaining text
 * would no longer identify the call. Methods on a styled component or a
 * keyframes object do not count: those values serialize their own id.
 */
function containsFunction(value: unknown, seen: Set<object>): boolean {
  if (isStyledComponent(value) || isKeyframes(value)) {
    return false;
  }
  if (isFunction(value)) {
    return true;
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (containsFunction(value[i], seen)) {
        return true;
      }
    }
    return false;
  }

  for (const key of Object.keys(value)) {
    if (containsFunction(Reflect.get(value, key), seen)) {
      return true;
    }
  }
  return false;
}
