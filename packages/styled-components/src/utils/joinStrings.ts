/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(a: string | undefined, b: string): string {
  return a && b ? `${a} ${b}` : a || b;
}
