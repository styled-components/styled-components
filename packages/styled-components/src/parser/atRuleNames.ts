/**
 * Shared by `emit-web.ts` (web at-rule emission) and `nativePlan.ts`
 * (native at-rule classification). Kept in its own module so neither
 * emitter pulls in the other.
 */
export function isKeyframesName(name: string): boolean {
  if (name === 'keyframes') return true;
  // vendor prefixes: -webkit-keyframes, -moz-keyframes, -o-keyframes
  return /^(?:-[a-z]+-)?keyframes$/i.test(name);
}
