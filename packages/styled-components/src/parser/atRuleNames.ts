/**
 * Shared by `parser.ts` (parse-time at-rule dispatch) and `nativePlan.ts`
 * (native at-rule classification). Kept in its own module rather than
 * exported from either: `parser.ts` already imports from `nativePlan.ts`,
 * so exporting this from `parser.ts` would create an import cycle.
 */
export function isKeyframesName(name: string): boolean {
  if (name === 'keyframes') return true;
  // vendor prefixes: -webkit-keyframes, -moz-keyframes, -o-keyframes
  return /^-[a-z]+-keyframes$/.test(name);
}
