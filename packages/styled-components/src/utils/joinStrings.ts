/**
 * Convenience function for joining strings to form className chains
 */
export default function joinStrings(...args: Array<string | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
