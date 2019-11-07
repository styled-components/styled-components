/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(a, b) {
  return a && b ? `${a} ${b}` : a || b;
}
