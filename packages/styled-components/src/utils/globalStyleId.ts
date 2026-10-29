import generateComponentId from './generateComponentId';
import isFunction from './isFunction';
import isKeyframes from './isKeyframes';
import isStyledComponent from './isStyledComponent';

/**
 * How many times this process has already issued an id for one serialization
 * that contains a function. The count is part of every such id, so it has to
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
 * two copies of the same selector share an id.
 *
 * `JSON.stringify` writes `null` for a function, and also for `Infinity`
 * and `NaN`. A function body always mixes in how many times this process
 * has already issued that serialization, including the first time, so its
 * id cannot equal the static rule that stringifies the same way.
 *
 * The count follows call order. The call created first is earlier in the
 * stylesheet, and the later call paints on top. The server and the client
 * agree when they run the calls in the same order. A different order swaps
 * the ids, and each side's rules land in the other side's group.
 */
export function globalStyleComponentId(rules: readonly unknown[]): string {
  const serialized = JSON.stringify(rules);
  if (!containsFunction(rules, new Set())) {
    return componentId(serialized);
  }

  const issued = issuedBySerialization.get(serialized) ?? 0;
  issuedBySerialization.set(serialized, issued + 1);
  // JSON text has no raw NUL, so this cannot equal another call's plain JSON.
  return componentId(`${serialized}\0${issued}`);
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
