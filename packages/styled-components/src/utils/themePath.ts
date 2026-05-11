/**
 * Typed theme-token path utilities.
 *
 * Given a theme shape, `ThemePath<Theme>` produces a string-literal union
 * of every valid dot-separated token path (including intermediate
 * objects and array indices); `ThemeLeafPath<Theme>` narrows to only
 * paths terminating at a primitive value. `ThemeValue<Theme, P>` maps a
 * path back to its value type.
 *
 * Example:
 *
 *   interface Theme {
 *     color: { red: { 500: string; 600: string }; blue: { 500: string } };
 *     space: readonly number[];
 *   }
 *
 *   type Path = ThemeLeafPath<Theme>;
 *   //   ^? 'color.red.500' | 'color.red.600' | 'color.blue.500' | `space.${number}`
 *
 *   type Color = ThemeValue<Theme, 'color.red.500'>;
 *   //   ^? string
 *
 * Paths support keys with hyphens, underscores, or other non-identifier
 * characters (e.g. `'color.red-500'`) since the runtime walks via
 * bracket access. Numeric keys serialize as their decimal form.
 */

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Join<A extends string, B extends string | number> = A extends '' ? `${B}` : `${A}.${B}`;

/**
 * Recursion-depth counter so the path types stay within TypeScript's
 * instantiation budget for arbitrary theme shapes. Six levels covers
 * realistic design-system trees (`color.red.500`, `breakpoint.lg.min`,
 * etc.) without triggering TS2589.
 */
type Decr = [never, 0, 1, 2, 3, 4, 5];

/**
 * All valid paths into `T`, including intermediate objects/arrays. Each
 * step extends the prefix; primitive leaves stop the recursion.
 */
export type ThemePath<T, Prefix extends string = '', D extends number = 6> = D extends 0
  ? never
  : T extends Primitive
    ? never
    : T extends ReadonlyArray<infer U>
      ?
          | Join<Prefix, number>
          | (U extends Primitive ? never : ThemePath<U, Join<Prefix, number>, Decr[D]>)
      : T extends object
        ? {
            [K in Extract<keyof T, string | number>]:
              | Join<Prefix, K>
              | (T[K] extends Primitive ? never : ThemePath<T[K], Join<Prefix, K>, Decr[D]>);
          }[Extract<keyof T, string | number>]
        : never;

/**
 * Leaf-only variant: paths ending at a primitive value.
 */
export type ThemeLeafPath<T, Prefix extends string = '', D extends number = 6> = D extends 0
  ? Prefix
  : T extends Primitive
    ? Prefix
    : T extends ReadonlyArray<infer U>
      ? ThemeLeafPath<U, Join<Prefix, number>, Decr[D]>
      : T extends object
        ? {
            [K in Extract<keyof T, string | number>]: ThemeLeafPath<T[K], Join<Prefix, K>, Decr[D]>;
          }[Extract<keyof T, string | number>]
        : never;

/**
 * Resolve the value type at path `P` within `T`.
 */
export type ThemeValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? ThemeValue<T[Head], Rest>
    : T extends ReadonlyArray<infer U>
      ? Head extends `${number}`
        ? ThemeValue<U, Rest>
        : never
      : never
  : P extends keyof T
    ? T[P]
    : T extends ReadonlyArray<infer U>
      ? P extends `${number}`
        ? U
        : never
      : never;

/**
 * Walk a dot-separated path on a theme object and return the value at
 * that location, or `undefined` if any step is missing. Splits on `.`
 * and uses bracket access so keys with non-identifier characters
 * (`'red-500'`, `'2xl'`) work as long as they appear literally between
 * dots in the path.
 */
export function themeValue<T, P extends ThemePath<T>>(
  theme: T,
  path: P
): ThemeValue<T, P> | undefined;
export function themeValue(theme: unknown, path: string): unknown;
export function themeValue(theme: unknown, path: string): unknown {
  if (theme == null) return undefined;
  let cur: any = theme;
  let i = 0;
  let start = 0;
  // Inline split-on-dot walk so we don't allocate a parts array per call.
  while (i <= path.length) {
    if (i === path.length || path.charCodeAt(i) === 46 /* '.' */) {
      const segment = path.slice(start, i);
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[segment];
      start = i + 1;
    }
    i++;
  }
  return cur;
}
