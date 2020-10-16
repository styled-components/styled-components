/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(a?: string, b?: string) {
  return a && b ? `${a} ${b}` : a || b;
}
