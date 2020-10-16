/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(a: String | null | undefined, b: String | null | undefined): String | null | undefined {
  return a && b ? `${a} ${b}` : a || b;
}