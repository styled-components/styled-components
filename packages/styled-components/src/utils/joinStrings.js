/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(a: ?String, b: ?String): ?String {
  return a && b ? `${a} ${b}` : a || b;
}
